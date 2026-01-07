#!/bin/bash
set -e

# Deploy @flowmaestro/widget to npm
#
# Prerequisites:
# 1. npm account with access to @flowmaestro organization
# 2. Run 'npm login' to authenticate
#
# Usage:
#   ./scripts/deploy-widget.sh           # Publish current version
#   ./scripts/deploy-widget.sh --dry-run # Test without publishing

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PACKAGE_DIR"

# Parse arguments
DRY_RUN=""
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN="--dry-run"
    echo "🧪 Running in dry-run mode (no actual publish)"
fi

echo "📦 Deploying @flowmaestro/widget"
echo "================================"

# Check npm authentication
echo ""
echo "🔍 Checking npm authentication..."
if ! npm whoami 2>/dev/null; then
    echo "❌ Not logged in to npm. Please run 'npm login' first."
    exit 1
fi
NPM_USER=$(npm whoami)
echo "✅ Logged in as: $NPM_USER"

# Check if we have access to @flowmaestro org
echo ""
echo "🔍 Checking @flowmaestro organization access..."
if ! npm access list packages @flowmaestro 2>/dev/null | grep -q "@flowmaestro"; then
    echo "⚠️  Warning: Could not verify @flowmaestro org access."
    echo "   First-time publish will create the package."
fi

# Clean previous build
echo ""
echo "🧹 Cleaning previous build..."
rm -rf dist
echo "✅ Cleaned dist/"

# Install dependencies
echo ""
echo "📥 Installing dependencies..."
npm install
echo "✅ Dependencies installed"

# Run type check
echo ""
echo "✅ Running type check..."
npm run typecheck
echo "✅ Type check passed"

# Build package
echo ""
echo "🔨 Building package..."
npm run build
echo "✅ Build complete"

# Show what will be published
echo ""
echo "📋 Package contents:"
npm pack --dry-run 2>&1 | grep -E "^(npm notice [0-9]|Tarball)" || true

# Get version
VERSION=$(node -p "require('./package.json').version")
echo ""
echo "📌 Version: $VERSION"

# Publish
echo ""
if [[ -n "$DRY_RUN" ]]; then
    echo "🧪 Dry run - would publish @flowmaestro/widget@$VERSION"
    npm publish --access public --dry-run
else
    echo "📦 Publishing @flowmaestro/widget@$VERSION..."
    npm publish --access public
    echo ""
    echo "🎉 Successfully published @flowmaestro/widget@$VERSION!"
    echo ""
    echo "Install with:"
    echo "  npm install @flowmaestro/widget"
    echo ""
    echo "View at:"
    echo "  https://www.npmjs.com/package/@flowmaestro/widget"
fi
