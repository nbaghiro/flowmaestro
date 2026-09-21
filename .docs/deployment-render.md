# Deploying FlowMaestro to Render

This runbook covers standing up FlowMaestro on Render with Pulumi, moving the data from the GCP
deployment, switching DNS, and rolling back. The Pulumi program in `infra/pulumi` has one module
per hosting platform; the stack config key `platform` selects `gcp` (the existing `production`
stack) or `render` (the `render-prod` stack). Both stacks can exist at the same time, which is what
makes the cutover reversible.

## What runs where

The Render project (`FlowMaestro`) and its `Production` environment are created in the Render
dashboard, not by Pulumi. Their ids are stack config (`render.projectId`, `render.environmentId`),
and Pulumi attaches every resource it creates to that environment. This keeps Pulumi from creating a
second project and lets the dashboard stay the place where the project itself is managed. The
environment holds these resources, all created by Pulumi:

- `flowmaestro-api`: web service from the backend image, `node backend/dist/backend/src/index.js`,
  health check `/health`, pre-deploy command `cd backend && npm run db:migrate:prod`.
- `flowmaestro-worker`: background worker from the same image running the Temporal worker.
- `flowmaestro-temporal`: private service running `temporalio/auto-setup` as a single process with
  Postgres persistence and four history shards. Not reachable from outside Render. With
  `render.temporalMode: cloud` this service is skipped and the api and worker connect to Temporal
  Cloud instead.
- `flowmaestro-postgres`: Render Postgres with the `flowmaestro` database. Temporal creates its two
  databases on the same instance at first start.
- `flowmaestro-keyvalue`: Render Key Value (Redis compatible). It holds pub/sub channels, rate
  limiter counters and caches only, so the free plan with no persistence is enough.
- Static sites for the frontend (`app`), marketing (`www`, apex, `blog`), documentation (`docs`),
  status (`status`) and the widget bundle (`static`), built by Render from the repository.
- Env groups: one per secret category (`core`, `oauth`, `llm`, `service`) plus `runtime` for
  non-secret settings, linked to the api and worker according to each secret's `deployments` list.

Files stay on the existing GCS buckets. The api and worker read them with a service account key
mounted as a secret file, so the GCP project, the buckets and the storage service account stay
alive after the move.

## Prerequisites

- A Render project with one environment, created in the workspace the Render CLI is logged into,
  and a Render API key for that workspace. `render workspace current` shows the workspace id
  (`tea-...`), `render projects list -o json` the project id (`prj-...`) and
  `render environments list -o json` the environment id (`evm-...`). The three ids are already in
  `Pulumi.render-prod.yaml`; only the API key is set by hand.
- The Render GitHub app installed on the `nbaghiro/flowmaestro` repository, which the static sites
  need in order to build from the repository.
- The backend image published to GHCR by the `publish-backend-image` workflow and the package set
  to public, so Render can pull it without a registry credential.
- `gcloud` access to `flowmaestro-prod` for the secrets export and the database export.
- Pulumi logged into the `nbaghiro` Pulumi Cloud account. The generated Render SDK is not
  committed; `pulumi install` regenerates it from the `packages` entry in `Pulumi.yaml`.

## Stand up the Render stack

```bash
cd infra/pulumi
pulumi install                       # generates sdks/render and runs npm install
pulumi stack init nbaghiro-org/render-prod   # once; the stack file is committed

pulumi config set --secret render:apiKey <render-api-key>
pulumi config set render:ownerId tea-xxxxxxxxxxxxxxxxxxxx

# Secret definitions: the same JSON array the GCP stack uses
pulumi config set secrets "$(pulumi config get secrets --stack nbaghiro-org/production)"

# Secret values: copied from GCP Secret Manager into Pulumi Cloud, encrypted
../scripts/export-secrets-to-pulumi.sh --stack nbaghiro-org/render-prod --dry-run
../scripts/export-secrets-to-pulumi.sh --stack nbaghiro-org/render-prod

# GCS service account key, mounted at /etc/secrets/gcs-service-account.json
pulumi config set --secret gcsServiceAccountJson "$(cat /path/to/key.json)"

# Image to deploy
pulumi config set --path render.imageTag $(git rev-parse --short HEAD)

pulumi preview
pulumi up
```

`export-secrets-to-pulumi.sh` writes each value with `pulumi config set --secret`, so the values
leave the machine only as ciphertext that Pulumi Cloud can decrypt for this stack. The plain
values never appear in the stack file or in the shell output. Three definitions are marked
required; the script exits non-zero if any of them has no version in Secret Manager.

Every other setting lives under the `render` object in `Pulumi.render-prod.yaml` and is documented
there: region, instance plans, Postgres and Key Value plans, the Temporal mode, the repository and
branch for the static sites, and the bucket names.

## Migrations

Render runs the api's pre-deploy command before each deploy of the api service and blocks the
deploy if it fails. The command runs `node-pg-migrate` against `DATABASE_URL`, which Pulumi sets
from the Postgres internal connection string. The first deploy therefore creates the schema on the
new database; later deploys apply new migrations. The worker has no pre-deploy command.

## Move the data

Render Postgres does not reach Cloud SQL's private IP, so the export goes through GCS. Run these
steps once as a rehearsal and again at cutover.

```bash
# 1. Export from Cloud SQL to a bucket (custom format keeps extensions and indexes)
gcloud sql export sql flowmaestro-db gs://flowmaestro-artifacts-flowmaestro-prod/migration/flowmaestro.dump \
    --database=flowmaestro --project=flowmaestro-prod
gcloud storage cp gs://flowmaestro-artifacts-flowmaestro-prod/migration/flowmaestro.dump .

# 2. Prepare the Render database over its external connection string
EXTERNAL="$(cd infra/pulumi && pulumi stack output --show-secrets outputs | python3 -c 'import json,sys; print(json.load(sys.stdin)["postgresExternalConnectionString"])')"
psql "$EXTERNAL" -c 'CREATE EXTENSION IF NOT EXISTS vector;' \
    -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' \
    -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto;'

# 3. Restore
pg_restore --no-owner --no-acl --dbname "$EXTERNAL" flowmaestro.dump

# 4. Check
psql "$EXTERNAL" -c 'SELECT count(*) FROM flowmaestro."flowmaestro.pgmigrations";' \
    -c "SELECT indexname FROM pg_indexes WHERE indexdef LIKE '%hnsw%';"
```

If the Cloud SQL export produces plain SQL instead of a custom-format dump, load it with `psql`
instead of `pg_restore`. After the restore, redeploy the api once so the pre-deploy command confirms
that no migration is pending.

Temporal starts fresh on Render. In-flight and paused executions on GCP are lost at cutover, and
the `trigger-<id>` schedules do not exist on the new server until they are recreated from the
database. Recreate them with the schedule recreation script from the execution engine plan (it
calls `SchedulerService.initializeScheduledTriggers()`), and mark executions that were `running`
or `paused` on GCP as failed with a note.

Redis holds nothing durable, so nothing moves.

## Verify before switching DNS

Every service has a `onrender.com` URL in `pulumi stack output outputs`. Check, in this order:

1. `GET /health` on the api URL returns 200 and the api log shows the Temporal client ready.
2. The worker log shows the workflow bundle loaded and the poller registered on
   `flowmaestro-orchestrator`.
3. `render psql` or the external URL shows the restored tables.
4. Log in on the frontend static site URL with `VITE_API_URL` pointing at the api URL.
5. Run a workflow with an input and an output node and watch the SSE stream complete.
6. Start an agent chat and see streamed tokens.
7. Query a knowledge base (GCS access and pgvector).
8. Trigger a scheduled workflow by hand and see it run.
9. Send a Stripe test webhook to the api URL.
10. Load the widget from the `static` site URL.

## DNS

DNS for `flowmaestro.ai` is hosted on Google-managed nameservers through the Squarespace
registrar and is edited by hand in the Squarespace DNS panel. `pulumi stack output outputs` lists
`dnsRecords` with the exact hostnames and targets. Two days before cutover, lower the TTL of the
eight records to 300 seconds. At cutover, change each record to the Render target, then set
`render.customDomainsEnabled: true` and run `pulumi up` so Render issues certificates.

Keeping the hostnames means no OAuth redirect URI and no webhook endpoint changes.

## Rollback

For the first days after cutover, rollback is a DNS change back to the GCP load balancer address
(`pulumi stack output outputs --stack nbaghiro-org/production` shows `staticIpAddress`) and scaling
the GKE api and worker deployments back up. Data written on Render after cutover is not on Cloud SQL,
so agree the rollback window in advance and keep it short.

## Decommission GCP

After the rollback window, stop the GKE deployments, then remove Memorystore, the cluster, the load
balancer and NAT, and finally Cloud SQL after a last export kept in GCS. Keep the project, the GCS
buckets, the storage service account and the Google OAuth client. The GCP cost audit has the
detailed order.

## Switching back and forth later

Both platform stacks read the same application model (`src/app/model.ts`) and the same secret
definitions. Moving from one platform to the other is: bring the target stack up, move the
database, recreate the Temporal schedules, switch DNS. A Cloudflare-hosted DNS zone managed by a
third Pulumi stack would turn the last step into a config change; that is not built yet.
