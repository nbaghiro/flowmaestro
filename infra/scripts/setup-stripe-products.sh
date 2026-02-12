#!/bin/bash
# =============================================================================
# Stripe Products & Prices Setup Script
# =============================================================================
# Creates subscription plans and credit packs in Stripe.
# Can be run for sandbox (test) or live environments.
#
# Usage:
#   ./setup-stripe-products.sh           # Sandbox/test mode (default)
#   ./setup-stripe-products.sh --live    # Live/production mode
#
# Prerequisites:
#   - Stripe CLI installed: brew install stripe/stripe-cli/stripe
#   - Logged in: stripe login
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
LIVE_MODE=""
ENV_NAME="SANDBOX"
ENV_NAME_LOWER="sandbox"

if [[ "$1" == "--live" ]]; then
    LIVE_MODE="--live"
    ENV_NAME="LIVE"
    ENV_NAME_LOWER="live"
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  WARNING: LIVE MODE - REAL MONEY!${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    read -p "Are you sure you want to create products in LIVE mode? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        echo "Aborted."
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Stripe Products Setup - ${ENV_NAME}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo -e "${RED}Error: Stripe CLI is not installed.${NC}"
    echo "Install with: brew install stripe/stripe-cli/stripe"
    exit 1
fi

# Check if logged in
if ! stripe config --list &> /dev/null; then
    echo -e "${RED}Error: Not logged in to Stripe CLI.${NC}"
    echo "Run: stripe login"
    exit 1
fi

# Helper function to create or find a product
# Outputs only the product ID to stdout, all messages go to stderr
create_or_find_product() {
    local name="$1"
    local description="$2"

    echo -e "${YELLOW}Looking for existing product: ${name}...${NC}" >&2

    # Search for existing product by name
    local existing=$(stripe products list $LIVE_MODE --limit=100 -d "active=true" 2>/dev/null | \
        grep -A2 "\"name\": \"${name}\"" | grep '"id"' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')

    if [[ -n "$existing" ]]; then
        echo -e "${GREEN}Found existing product: ${existing}${NC}" >&2
        echo "$existing"
        return
    fi

    echo -e "${YELLOW}Creating product: ${name}...${NC}" >&2
    local product_id=$(stripe products create \
        --name="$name" \
        --description="$description" \
        $LIVE_MODE 2>/dev/null | grep '"id"' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')

    echo -e "${GREEN}Created product: ${product_id}${NC}" >&2
    echo "$product_id"
}

# Helper function to create a price
# Outputs only the price ID to stdout, all messages go to stderr
create_price() {
    local product_id="$1"
    local amount="$2"
    local currency="$3"
    local interval="$4"  # empty for one-time, "month" or "year" for recurring
    local nickname="$5"

    echo -e "${YELLOW}Creating price: ${nickname} (\$${amount}/100 ${currency})...${NC}" >&2

    local interval_flag=""
    if [[ -n "$interval" ]]; then
        interval_flag="--recurring.interval=$interval"
    fi

    local price_id=$(stripe prices create \
        --product="$product_id" \
        --unit-amount="$amount" \
        --currency="$currency" \
        --nickname="$nickname" \
        $interval_flag \
        $LIVE_MODE 2>/dev/null | grep '"id"' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')

    echo -e "${GREEN}Created price: ${price_id}${NC}" >&2
    echo "$price_id"
}

# =============================================================================
# SUBSCRIPTION PRODUCTS
# =============================================================================

echo ""
echo -e "${BLUE}--- Creating Subscription Products ---${NC}"
echo ""

# Pro Plan
PRO_PRODUCT=$(create_or_find_product "Pro Plan" "For individuals and small teams - 5,000 credits/month")
echo ""

# Team Plan
TEAM_PRODUCT=$(create_or_find_product "Team Plan" "For growing organizations - 25,000 credits/month")
echo ""

# =============================================================================
# SUBSCRIPTION PRICES
# =============================================================================

echo ""
echo -e "${BLUE}--- Creating Subscription Prices ---${NC}"
echo ""

# Pro Monthly - $29/month
PRO_MONTHLY=$(create_price "$PRO_PRODUCT" 2900 "usd" "month" "Pro Monthly")

# Pro Annual - $290/year (save ~17%)
PRO_ANNUAL=$(create_price "$PRO_PRODUCT" 29000 "usd" "year" "Pro Annual")

# Team Monthly - $99/month
TEAM_MONTHLY=$(create_price "$TEAM_PRODUCT" 9900 "usd" "month" "Team Monthly")

# Team Annual - $990/year (save ~17%)
TEAM_ANNUAL=$(create_price "$TEAM_PRODUCT" 99000 "usd" "year" "Team Annual")

echo ""

# =============================================================================
# CREDIT PACK PRODUCTS
# =============================================================================

echo ""
echo -e "${BLUE}--- Creating Credit Pack Products ---${NC}"
echo ""

STARTER_PRODUCT=$(create_or_find_product "Starter Credits" "1,000 bonus credits")
GROWTH_PRODUCT=$(create_or_find_product "Growth Credits" "5,000 bonus credits")
SCALE_PRODUCT=$(create_or_find_product "Scale Credits" "15,000 bonus credits")
ENTERPRISE_PRODUCT=$(create_or_find_product "Enterprise Credits" "50,000 bonus credits")

echo ""

# =============================================================================
# CREDIT PACK PRICES (One-time)
# =============================================================================

echo ""
echo -e "${BLUE}--- Creating Credit Pack Prices ---${NC}"
echo ""

# Starter - $10 for 1,000 credits ($0.01/credit)
CREDITS_STARTER=$(create_price "$STARTER_PRODUCT" 1000 "usd" "" "Starter 1000 Credits")

# Growth - $45 for 5,000 credits ($0.009/credit, 10% savings)
CREDITS_GROWTH=$(create_price "$GROWTH_PRODUCT" 4500 "usd" "" "Growth 5000 Credits")

# Scale - $120 for 15,000 credits ($0.008/credit, 20% savings)
CREDITS_SCALE=$(create_price "$SCALE_PRODUCT" 12000 "usd" "" "Scale 15000 Credits")

# Enterprise - $350 for 50,000 credits ($0.007/credit, 30% savings)
CREDITS_ENTERPRISE=$(create_price "$ENTERPRISE_PRODUCT" 35000 "usd" "" "Enterprise 50000 Credits")

echo ""

# =============================================================================
# OUTPUT SUMMARY
# =============================================================================

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete! (${ENV_NAME})${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Products:${NC}"
echo "  Pro Plan:           $PRO_PRODUCT"
echo "  Team Plan:          $TEAM_PRODUCT"
echo "  Starter Credits:    $STARTER_PRODUCT"
echo "  Growth Credits:     $GROWTH_PRODUCT"
echo "  Scale Credits:      $SCALE_PRODUCT"
echo "  Enterprise Credits: $ENTERPRISE_PRODUCT"
echo ""
echo -e "${BLUE}Prices (add these to your .env):${NC}"
echo ""
echo "# Stripe Price IDs (${ENV_NAME})"
echo "STRIPE_PRICE_PRO_MONTHLY=$PRO_MONTHLY"
echo "STRIPE_PRICE_PRO_ANNUAL=$PRO_ANNUAL"
echo "STRIPE_PRICE_TEAM_MONTHLY=$TEAM_MONTHLY"
echo "STRIPE_PRICE_TEAM_ANNUAL=$TEAM_ANNUAL"
echo "STRIPE_PRICE_CREDITS_STARTER=$CREDITS_STARTER"
echo "STRIPE_PRICE_CREDITS_GROWTH=$CREDITS_GROWTH"
echo "STRIPE_PRICE_CREDITS_SCALE=$CREDITS_SCALE"
echo "STRIPE_PRICE_CREDITS_ENTERPRISE=$CREDITS_ENTERPRISE"
echo ""

# Save to file
OUTPUT_FILE="stripe-prices-${ENV_NAME_LOWER}.env"
cat > "$OUTPUT_FILE" << EOF
# Stripe Price IDs (${ENV_NAME})
# Generated on $(date)

STRIPE_PRICE_PRO_MONTHLY=$PRO_MONTHLY
STRIPE_PRICE_PRO_ANNUAL=$PRO_ANNUAL
STRIPE_PRICE_TEAM_MONTHLY=$TEAM_MONTHLY
STRIPE_PRICE_TEAM_ANNUAL=$TEAM_ANNUAL
STRIPE_PRICE_CREDITS_STARTER=$CREDITS_STARTER
STRIPE_PRICE_CREDITS_GROWTH=$CREDITS_GROWTH
STRIPE_PRICE_CREDITS_SCALE=$CREDITS_SCALE
STRIPE_PRICE_CREDITS_ENTERPRISE=$CREDITS_ENTERPRISE
EOF

echo -e "${GREEN}Saved to: ${OUTPUT_FILE}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Copy the price IDs above to your backend/.env file"
echo "  2. For production, add these to GCP Secret Manager or K8s ConfigMap"
echo ""
