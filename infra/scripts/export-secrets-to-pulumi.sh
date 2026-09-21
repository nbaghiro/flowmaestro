#!/usr/bin/env bash
#
# Copy application secret values from GCP Secret Manager into a Pulumi stack's
# config, encrypted, under flowmaestro-infrastructure:secretValues.<ENV_VAR>.
#
# The list of secrets comes from the Pulumi `secrets` definitions (the same JSON
# array the GCP stack uses). For every definition the script reads the latest
# version of the GCP secret `flowmaestro-app-<name>` and writes it to the target
# stack with `pulumi config set --secret`. Values are never printed.
#
# Usage:
#   infra/scripts/export-secrets-to-pulumi.sh --stack nbaghiro-org/render-prod [--dry-run]
#     [--source-stack nbaghiro-org/production] [--project flowmaestro-prod]
#
# Requirements: gcloud authenticated with access to the GCP project, pulumi
# logged in to the backend that holds the target stack.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PULUMI_DIR="$(cd "$SCRIPT_DIR/../pulumi" && pwd)"

TARGET_STACK=""
SOURCE_STACK="nbaghiro-org/production"
GCP_PROJECT="flowmaestro-prod"
DRY_RUN="false"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --stack) TARGET_STACK="$2"; shift 2 ;;
        --source-stack) SOURCE_STACK="$2"; shift 2 ;;
        --project) GCP_PROJECT="$2"; shift 2 ;;
        --dry-run) DRY_RUN="true"; shift ;;
        -h|--help) sed -n '2,18p' "$0"; exit 0 ;;
        *) echo "Unknown argument: $1" >&2; exit 2 ;;
    esac
done

if [[ -z "$TARGET_STACK" ]]; then
    echo "Missing --stack <org/stack>" >&2
    exit 2
fi

command -v gcloud >/dev/null || { echo "gcloud is required" >&2; exit 2; }
command -v pulumi >/dev/null || { echo "pulumi is required" >&2; exit 2; }
command -v python3 >/dev/null || { echo "python3 is required" >&2; exit 2; }

# Read the definitions from the source stack config (works without a successful
# `pulumi up`, unlike `pulumi stack output`).
DEFINITIONS_JSON="$(cd "$PULUMI_DIR" && pulumi config get secrets --stack "$SOURCE_STACK" 2>/dev/null || true)"
if [[ -z "$DEFINITIONS_JSON" ]]; then
    echo "No secret definitions found in stack $SOURCE_STACK (config key: secrets)" >&2
    exit 1
fi

# Emit "name<TAB>envVar<TAB>required" per definition
PAIRS="$(printf '%s' "$DEFINITIONS_JSON" | python3 -c '
import json, sys
for d in json.load(sys.stdin):
    print("\t".join([d["name"], d["envVar"], "required" if d.get("required") else "optional"]))
')"

TOTAL=0
WRITTEN=0
SKIPPED=0
FAILED_REQUIRED=()

while IFS=$'\t' read -r NAME ENV_VAR REQUIRED; do
    [[ -z "$NAME" ]] && continue
    TOTAL=$((TOTAL + 1))
    GCP_NAME="flowmaestro-app-${NAME}"

    if [[ "$DRY_RUN" == "true" ]]; then
        echo "would write secretValues.${ENV_VAR} from ${GCP_NAME} (${REQUIRED})"
        continue
    fi

    # Read the latest enabled version; skip cleanly when none exists.
    if ! VALUE="$(gcloud secrets versions access latest --secret "$GCP_NAME" --project "$GCP_PROJECT" 2>/dev/null)"; then
        SKIPPED=$((SKIPPED + 1))
        echo "skip  ${ENV_VAR}: no version in ${GCP_NAME}"
        if [[ "$REQUIRED" == "required" ]]; then
            FAILED_REQUIRED+=("$ENV_VAR")
        fi
        continue
    fi

    if [[ -z "$VALUE" ]]; then
        SKIPPED=$((SKIPPED + 1))
        echo "skip  ${ENV_VAR}: empty value"
        continue
    fi

    # `--` keeps values that start with a dash from being parsed as flags.
    (cd "$PULUMI_DIR" && pulumi config set --stack "$TARGET_STACK" --secret --path "secretValues.${ENV_VAR}" -- "$VALUE")
    WRITTEN=$((WRITTEN + 1))
    echo "wrote secretValues.${ENV_VAR}"
    unset VALUE
done <<< "$PAIRS"

if [[ "$DRY_RUN" == "true" ]]; then
    echo "dry run: ${TOTAL} definitions"
    exit 0
fi

echo "done: ${WRITTEN} written, ${SKIPPED} skipped, ${TOTAL} definitions"
if [[ ${#FAILED_REQUIRED[@]} -gt 0 ]]; then
    echo "required secrets with no value: ${FAILED_REQUIRED[*]}" >&2
    exit 1
fi
