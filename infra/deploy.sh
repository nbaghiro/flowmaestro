#!/bin/bash

# FlowMaestro Deployment Script for Google Cloud Platform
# This script automates the complete deployment of FlowMaestro to a new GCP project
# Usage: ./infra/deploy.sh

set -e  # Exit on any error

# Determine repository root (works whether script is run from repo root or infra/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "$SCRIPT_DIR" == */infra ]]; then
    REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
else
    REPO_ROOT="$SCRIPT_DIR"
fi

PULUMI_DIR="$REPO_ROOT/infra/pulumi"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

confirm() {
    read -p "$1 (y/n): " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    local missing_tools=()

    if ! command -v gcloud &> /dev/null; then
        missing_tools+=("gcloud")
    fi

    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi

    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi

    if ! command -v pulumi &> /dev/null; then
        missing_tools+=("pulumi")
    fi

    if ! command -v node &> /dev/null; then
        missing_tools+=("node")
    fi

    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        echo ""
        echo "Please install the missing tools:"
        echo "  - gcloud: https://cloud.google.com/sdk/docs/install"
        echo "  - kubectl: https://kubernetes.io/docs/tasks/tools/"
        echo "  - docker: https://docs.docker.com/get-docker/"
        echo "  - pulumi: https://www.pulumi.com/docs/get-started/install/"
        echo "  - node/npm: https://nodejs.org/"
        exit 1
    fi

    print_success "All prerequisites are installed"
}

# Detect existing Pulumi stacks
detect_existing_stacks() {
    # Save current directory
    local original_dir=$(pwd)

    # Check if Pulumi directory exists
    if [ ! -d "$PULUMI_DIR" ]; then
        return 1
    fi

    cd "$PULUMI_DIR" || return 1

    # Get list of stacks
    EXISTING_STACKS=$(pulumi stack ls --json 2>/dev/null | python3 -c "
import sys, json
try:
    stacks = json.load(sys.stdin)
    for stack in stacks:
        print(stack['name'])
except:
    pass
" 2>/dev/null)

    # Return to original directory
    cd "$original_dir"

    if [ -n "$EXISTING_STACKS" ]; then
        return 0
    else
        return 1
    fi
}

# Load config from existing stack
load_stack_config() {
    local stack_name=$1
    local original_dir=$(pwd)

    cd "$PULUMI_DIR" || return 1

    # Select the stack
    pulumi stack select "$stack_name" &>/dev/null

    # Load configuration
    DOMAIN=$(pulumi config get domain 2>/dev/null || echo "")
    GCP_PROJECT=$(pulumi config get gcp:project 2>/dev/null || echo "")
    GCP_REGION=$(pulumi config get gcp:region 2>/dev/null || echo "us-central1")
    DB_PASSWORD=$(pulumi config get dbPassword --show-secrets 2>/dev/null || echo "")
    JWT_SECRET=$(pulumi config get jwtSecret --show-secrets 2>/dev/null || echo "")
    ENCRYPTION_KEY=$(pulumi config get encryptionKey --show-secrets 2>/dev/null || echo "")

    # Determine environment from stack name
    case "$stack_name" in
        *prod*)
            ENVIRONMENT="prod"
            ;;
        *staging*)
            ENVIRONMENT="staging"
            ;;
        *dev*)
            ENVIRONMENT="dev"
            ;;
        *)
            ENVIRONMENT="prod"
            ;;
    esac

    cd "$original_dir"
    return 0
}

# Gather configuration
gather_config() {
    print_header "Configuration"

    # Try to detect existing stacks
    if detect_existing_stacks; then
        echo "Detected existing Pulumi stacks:"
        echo ""

        local i=1
        declare -a stack_array

        while IFS= read -r stack; do
            echo "  $i) $stack"
            stack_array[$i]=$stack
            ((i++))
        done <<< "$EXISTING_STACKS"

        echo "  $i) Create new deployment"
        echo ""

        read -p "Select stack (1-$i): " STACK_CHOICE

        if [ "$STACK_CHOICE" -ge 1 ] && [ "$STACK_CHOICE" -lt "$i" ]; then
            # Use existing stack
            SELECTED_STACK="${stack_array[$STACK_CHOICE]}"
            print_info "Using existing stack: $SELECTED_STACK"

            load_stack_config "$SELECTED_STACK"

            print_header "Loaded Configuration"
            echo "Stack:          $SELECTED_STACK"
            echo "Project ID:     $GCP_PROJECT"
            echo "Environment:    $ENVIRONMENT"
            echo "Domain:         $DOMAIN"
            echo "Region:         $GCP_REGION"
            echo ""

            if confirm "Use this configuration for redeployment?"; then
                # Secrets already loaded from stack
                REGISTRY="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT/flowmaestro"
                # Remember the selected stack name for Pulumi
                PULUMI_STACK="$SELECTED_STACK"
                return 0
            else
                print_info "Let's configure manually..."
            fi
        fi
    fi

    # Manual configuration (new deployment or user chose to configure manually)
    echo "Please provide the following configuration details:"
    echo ""

    # Auto-detect current gcloud project
    CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")

    if [ -n "$CURRENT_PROJECT" ]; then
        read -p "GCP Project ID [$CURRENT_PROJECT]: " GCP_PROJECT
        GCP_PROJECT=${GCP_PROJECT:-$CURRENT_PROJECT}
    else
        read -p "GCP Project ID: " GCP_PROJECT
        if [ -z "$GCP_PROJECT" ]; then
            print_error "Project ID cannot be empty"
            exit 1
        fi
    fi

    # Environment
    echo ""
    echo "Select environment:"
    echo "  1) Production"
    echo "  2) Staging"
    echo "  3) Development"
    read -p "Choice (1-3): " ENV_CHOICE

    case $ENV_CHOICE in
        1)
            ENVIRONMENT="prod"
            ;;
        2)
            ENVIRONMENT="staging"
            ;;
        3)
            ENVIRONMENT="dev"
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac

    # Domain
    echo ""
    read -p "Domain name (e.g., flowmaestro.ai): " DOMAIN
    if [ -z "$DOMAIN" ]; then
        print_error "Domain cannot be empty"
        exit 1
    fi

    # Region
    echo ""
    read -p "GCP Region [us-central1]: " GCP_REGION
    GCP_REGION=${GCP_REGION:-us-central1}

    # Generate secrets
    echo ""
    print_info "Generating secure random secrets..."
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    ENCRYPTION_KEY=$(openssl rand -hex 32)

    # Registry
    REGISTRY="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT/flowmaestro-images"

    # Summary
    echo ""
    print_header "Configuration Summary"
    echo "Project ID:     $GCP_PROJECT"
    echo "Environment:    $ENVIRONMENT"
    echo "Domain:         $DOMAIN"
    echo "Region:         $GCP_REGION"
    echo "DB Password:    [GENERATED]"
    echo "JWT Secret:     [GENERATED]"
    echo "Encryption Key: [GENERATED]"
    echo ""

    if ! confirm "Proceed with this configuration?"; then
        print_error "Deployment cancelled"
        exit 1
    fi
}

# Authenticate with GCP
authenticate_gcp() {
    print_header "GCP Authentication"

    print_info "Checking gcloud authentication..."

    # Check if already authenticated
    CURRENT_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | head -1)

    if [ -z "$CURRENT_ACCOUNT" ]; then
        print_warn "Not authenticated with gcloud"
        if confirm "Authenticate now?"; then
            gcloud auth login
        else
            print_error "Authentication required to continue"
            exit 1
        fi
    else
        print_success "Already authenticated as: $CURRENT_ACCOUNT"
    fi

    # Check current project
    CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)

    if [ "$CURRENT_PROJECT" != "$GCP_PROJECT" ]; then
        print_info "Switching project from '$CURRENT_PROJECT' to '$GCP_PROJECT'..."
        if gcloud config set project "$GCP_PROJECT" --quiet 2>/dev/null; then
            print_success "Project set to $GCP_PROJECT"
        else
            print_error "Failed to set project to '$GCP_PROJECT'"
            echo "Please run: gcloud config set project $GCP_PROJECT"
            exit 1
        fi
    else
        print_success "Already using project: $GCP_PROJECT"
    fi

    # Verify project access with a simple API call (Container API is needed anyway)
    print_info "Verifying project access..."
    if gcloud container clusters list --project="$GCP_PROJECT" --limit=1 &>/dev/null; then
        print_success "Project access verified"
    else
        print_warn "Could not verify project access (this might be okay)"
        print_info "If deployment fails, run: gcloud auth application-default login"
    fi
}

# Enable required GCP APIs
enable_apis() {
    print_header "Enabling GCP APIs"

    local apis=(
        "compute.googleapis.com"
        "container.googleapis.com"
        "sqladmin.googleapis.com"
        "redis.googleapis.com"
        "artifactregistry.googleapis.com"
        "servicenetworking.googleapis.com"
        "cloudresourcemanager.googleapis.com"
        "iam.googleapis.com"
        "monitoring.googleapis.com"
        "logging.googleapis.com"
    )

    print_info "Enabling ${#apis[@]} required APIs..."
    gcloud services enable "${apis[@]}" --project="$GCP_PROJECT"

    print_success "All APIs enabled"
}

# Configure Pulumi
configure_pulumi() {
    print_header "Configuring Pulumi"

    local original_dir=$(pwd)
    cd "$PULUMI_DIR" || exit 1

    # Use PULUMI_STACK if set (from existing stack selection), otherwise use ENVIRONMENT
    local stack_name="${PULUMI_STACK:-$ENVIRONMENT}"
    print_info "Using Pulumi stack: $stack_name"

    # Select the stack (it should already exist if PULUMI_STACK is set)
    if pulumi stack ls 2>/dev/null | grep -q "^${stack_name}[ *]"; then
        print_info "Selecting existing stack: $stack_name"
        pulumi stack select "$stack_name"
    else
        print_info "Creating new stack: $stack_name"
        pulumi stack init "$stack_name"
    fi

    # Only set configuration if this is NOT an existing stack redeployment
    if [ -z "$PULUMI_STACK" ]; then
        # Set configuration for new deployments
        print_info "Setting Pulumi configuration..."
        pulumi config set gcp:project "$GCP_PROJECT"
        pulumi config set gcp:region "$GCP_REGION"
        pulumi config set environment "$ENVIRONMENT"
        pulumi config set domain "$DOMAIN"
        pulumi config set --secret dbPassword "$DB_PASSWORD"
        pulumi config set --secret jwtSecret "$JWT_SECRET"
        pulumi config set --secret encryptionKey "$ENCRYPTION_KEY"
        print_success "Pulumi configured"
    else
        print_info "Using existing stack configuration (no changes)"
        print_success "Stack selected"
    fi

    cd "$original_dir"
}

# Deploy infrastructure with Pulumi
deploy_infrastructure() {
    print_header "Deploying Infrastructure with Pulumi"

    local original_dir=$(pwd)
    cd "$PULUMI_DIR" || exit 1

    print_info "Running Pulumi preview..."
    pulumi preview

    echo ""
    if ! confirm "Proceed with infrastructure deployment?"; then
        print_error "Deployment cancelled"
        exit 1
    fi

    print_info "Deploying infrastructure (this may take 10-15 minutes)..."
    pulumi up --yes

    print_success "Infrastructure deployed"

    cd "$original_dir"
}

# Get infrastructure outputs
get_infrastructure_outputs() {
    print_header "Retrieving Infrastructure Outputs"

    local original_dir=$(pwd)
    cd "$PULUMI_DIR" || exit 1

    LOAD_BALANCER_IP=$(pulumi stack output loadBalancerIp)

    print_info "Load Balancer IP: $LOAD_BALANCER_IP"

    cd "$original_dir"
}

# Configure DNS
configure_dns() {
    print_header "DNS Configuration"

    echo ""
    print_warn "Manual DNS configuration required!"
    echo ""
    echo "Please add the following DNS records to your domain:"
    echo ""
    echo "A Records:"
    echo "  Host: @             Value: $LOAD_BALANCER_IP"
    echo "  Host: www           Value: $LOAD_BALANCER_IP"
    echo "  Host: api           Value: $LOAD_BALANCER_IP"
    echo "  Host: app           Value: $LOAD_BALANCER_IP"
    echo ""

    read -p "Press Enter once DNS records are configured..."
}

# Build and push Docker images
build_and_push_images() {
    print_header "Building and Pushing Docker Images"

    local original_dir=$(pwd)
    cd "$REPO_ROOT" || exit 1

    # Configure Docker authentication
    print_info "Configuring Docker authentication for Artifact Registry..."
    gcloud auth configure-docker "$GCP_REGION-docker.pkg.dev" --quiet

    # Install dependencies
    print_info "Installing dependencies..."
    npm ci

    # Get Google Analytics Measurement ID from Pulumi config
    cd "$PULUMI_DIR" || exit 1
    local ga_measurement_id=$(pulumi config get gaMeasurementId 2>/dev/null || echo "")
    cd "$REPO_ROOT" || exit 1

    local images=("backend" "frontend" "marketing")

    for image in "${images[@]}"; do
        print_info "Building $image image for linux/amd64..."

        if [ "$image" = "frontend" ]; then
            docker build \
                --platform linux/amd64 \
                -f "infra/docker/$image/Dockerfile" \
                --build-arg VITE_API_URL="https://api.$DOMAIN" \
                --build-arg VITE_WS_URL="https://api.$DOMAIN" \
                --build-arg VITE_UNSPLASH_ACCESS_KEY="${VITE_UNSPLASH_ACCESS_KEY:-}" \
                -t "$REGISTRY/$image:latest" \
                -t "$REGISTRY/$image:$ENVIRONMENT" \
                .
        elif [ "$image" = "marketing" ]; then
            docker build \
                --platform linux/amd64 \
                -f "infra/docker/$image/Dockerfile" \
                --build-arg VITE_GA_MEASUREMENT_ID="$ga_measurement_id" \
                -t "$REGISTRY/$image:latest" \
                -t "$REGISTRY/$image:$ENVIRONMENT" \
                .
        else
            docker build \
                --platform linux/amd64 \
                -f "infra/docker/$image/Dockerfile" \
                -t "$REGISTRY/$image:latest" \
                -t "$REGISTRY/$image:$ENVIRONMENT" \
                .
        fi

        print_info "Pushing $image image..."
        docker push "$REGISTRY/$image:latest"
        docker push "$REGISTRY/$image:$ENVIRONMENT"

        print_success "$image image built and pushed"
    done

    cd "$original_dir"
}

# Configure kubectl
configure_kubectl() {
    print_header "Configuring kubectl"

    print_info "Getting GKE cluster credentials..."
    gcloud container clusters get-credentials \
        "flowmaestro-$ENVIRONMENT-cluster" \
        --region="$GCP_REGION" \
        --project="$GCP_PROJECT"

    print_success "kubectl configured"
}

# Update Kubernetes manifests
update_k8s_manifests() {
    print_header "Updating Kubernetes Manifests"

    local overlay_dir="$REPO_ROOT/infra/k8s/overlays/$ENVIRONMENT"

    # Create overlay directory if it doesn't exist
    mkdir -p "$overlay_dir"

    # Update kustomization.yaml
    print_info "Updating kustomization.yaml..."
    cat > "$overlay_dir/kustomization.yaml" <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: flowmaestro

resources:
  - ../../base

images:
  - name: backend-image
    newName: $REGISTRY/backend
    newTag: latest
  - name: frontend-image
    newName: $REGISTRY/frontend
    newTag: latest
  - name: marketing-image
    newName: $REGISTRY/marketing
    newTag: latest

patches:
  - path: configmap-patch.yaml
EOF

    # Update configmap patch
    print_info "Updating ConfigMap patch..."
    cat > "$overlay_dir/configmap-patch.yaml" <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: flowmaestro-config
  namespace: flowmaestro
data:
  APP_URL: "https://app.$DOMAIN"
  MARKETING_URL: "https://$DOMAIN"
  NODE_ENV: "$ENVIRONMENT"
EOF

    print_success "Manifests updated"
}

# Verify External Secrets Operator
verify_eso() {
    print_header "Verifying External Secrets Operator"

    # Create namespace
    print_info "Creating flowmaestro namespace..."
    kubectl create namespace flowmaestro --dry-run=client -o yaml | kubectl apply -f -

    # Check if ESO is installed
    print_info "Checking if External Secrets Operator is installed..."
    if ! kubectl get namespace external-secrets-system &>/dev/null; then
        print_error "External Secrets Operator namespace not found"
        echo ""
        echo "ESO should have been installed by Pulumi. Please check:"
        echo "  1. cd infra/pulumi && pulumi up"
        echo "  2. Verify ESO installation: kubectl get pods -n external-secrets-system"
        exit 1
    fi

    # Wait for ESO to be ready
    print_info "Waiting for ESO pods to be ready..."
    kubectl wait --for=condition=ready pod \
        -l app.kubernetes.io/name=external-secrets \
        -n external-secrets-system \
        --timeout=2m || {
        print_warn "ESO pods not ready yet. This may cause ExternalSecret sync issues."
        echo "Check status with: kubectl get pods -n external-secrets-system"
    }

    # Check ClusterSecretStore
    print_info "Checking ClusterSecretStore configuration..."
    if kubectl get clustersecretstore gcp-secret-manager &>/dev/null; then
        print_success "ClusterSecretStore 'gcp-secret-manager' found"
    else
        print_warn "ClusterSecretStore not found yet - it will be created when K8s manifests are applied"
    fi

    # Check that secrets exist in GCP Secret Manager
    print_info "Verifying secrets in GCP Secret Manager..."

    local missing_secrets=()
    local required_secrets=(
        "flowmaestro-jwt-secret"
        "flowmaestro-encryption-key"
        "flowmaestro-db-config"
        "flowmaestro-redis-config"
        "flowmaestro-temporal-db-config"
    )

    for secret in "${required_secrets[@]}"; do
        if ! gcloud secrets describe "$secret" --project="$GCP_PROJECT" &>/dev/null; then
            missing_secrets+=("$secret")
        fi
    done

    if [ ${#missing_secrets[@]} -ne 0 ]; then
        print_error "Missing required secrets in GCP Secret Manager:"
        for secret in "${missing_secrets[@]}"; do
            echo "  - $secret"
        done
        echo ""
        echo "Please run the setup script first:"
        echo "  ./infra/scripts/setup-secrets-gcp.sh"
        exit 1
    fi

    print_success "All required secrets found in GCP Secret Manager"

    print_info "ESO will automatically sync secrets from GCP Secret Manager to K8s Secrets"
    print_info "This happens within 5 minutes after ExternalSecret resources are created"
}

# Run database migrations
run_migrations() {
    print_header "Running Database Migrations"

    if confirm "Run database migrations now?"; then
        local original_dir=$(pwd)

        # Get database connection details from Pulumi
        cd "$PULUMI_DIR" || exit 1
        DB_HOST=$(pulumi stack output dbHost)
        DB_NAME=$(pulumi stack output dbName)
        DB_USER=$(pulumi stack output dbUser)
        cd "$original_dir"

        # Fetch DB password from GCP Secret Manager
        print_info "Fetching database password from GCP Secret Manager..."
        DB_CONFIG=$(gcloud secrets versions access latest \
            --secret="flowmaestro-db-config" \
            --project="$GCP_PROJECT" 2>/dev/null)

        if [ -z "$DB_CONFIG" ]; then
            print_error "Failed to fetch database config from Secret Manager"
            print_warn "Make sure secrets were created with: ./infra/scripts/setup-secrets-gcp.sh"
            return 1
        fi

        DB_PASSWORD=$(echo "$DB_CONFIG" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('db_password', ''))")

        if [ -z "$DB_PASSWORD" ]; then
            print_error "Database password not found in secret"
            return 1
        fi

        print_info "Building backend..."
        npm run build --workspace=backend

        print_info "Running migrations..."
        cd "$REPO_ROOT/backend" || exit 1
        DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME" npm run db:migrate
        cd "$original_dir"

        print_success "Migrations completed"
    else
        print_warn "Skipping migrations - remember to run them manually!"
    fi
}

# Deploy to Kubernetes
deploy_to_k8s() {
    print_header "Deploying to Kubernetes"

    print_info "Applying Kubernetes manifests..."
    kubectl apply -k "$REPO_ROOT/infra/k8s/overlays/$ENVIRONMENT"

    print_success "Manifests applied"
}

# Wait for pods to be ready
wait_for_pods() {
    print_header "Waiting for Pods to be Ready"

    print_info "Waiting for all pods to be running (this may take a few minutes)..."

    local max_attempts=60
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        local not_ready=$(kubectl get pods -n flowmaestro --no-headers 2>/dev/null | grep -v "Running\|Completed" | wc -l)

        if [ "$not_ready" -eq 0 ]; then
            print_success "All pods are ready!"
            kubectl get pods -n flowmaestro
            return 0
        fi

        attempt=$((attempt + 1))
        echo -n "."
        sleep 5
    done

    echo ""
    print_warn "Some pods are not ready yet. Current status:"
    kubectl get pods -n flowmaestro
    echo ""
    print_info "You can monitor pod status with: kubectl get pods -n flowmaestro --watch"
}

# Check SSL certificate status
check_ssl_certificate() {
    print_header "Checking SSL Certificate Status"

    print_info "Checking ManagedCertificate status..."
    kubectl describe managedcertificate flowmaestro-cert -n flowmaestro

    echo ""
    print_warn "SSL certificate provisioning can take 15-60 minutes"
    print_info "Monitor with: kubectl describe managedcertificate flowmaestro-cert -n flowmaestro"
}

# Final instructions
final_instructions() {
    print_header "Deployment Complete!"

    echo ""
    print_success "FlowMaestro has been deployed to GCP!"
    echo ""
    echo "Configuration:"
    echo "  Environment:        $ENVIRONMENT"
    echo "  Domain:             $DOMAIN"
    echo "  Load Balancer IP:   $LOAD_BALANCER_IP"
    echo ""
    echo "Access URLs (once SSL is provisioned):"
    echo "  App:                https://app.$DOMAIN"
    echo "  API:                https://api.$DOMAIN"
    echo "  Marketing Site:     https://$DOMAIN"
    echo "  Marketing Site:     https://www.$DOMAIN"
    echo ""
    echo "Useful commands:"
    echo "  Check pods:         kubectl get pods -n flowmaestro"
    echo "  View logs:          kubectl logs -n flowmaestro -l app=flowmaestro --tail=100 -f"
    echo "  Check ingress:      kubectl get ingress -n flowmaestro"
    echo "  Check SSL cert:     kubectl describe managedcertificate flowmaestro-cert -n flowmaestro"
    echo "  Check ESO sync:     kubectl get externalsecrets -n flowmaestro"
    echo "  Check secrets:      kubectl get secrets -n flowmaestro"
    echo ""
    echo "Secrets Management:"
    echo "  Update secrets:     ./infra/scripts/setup-secrets-gcp.sh"
    echo "  Local dev sync:     ./infra/scripts/sync-secrets-local.sh"
    echo "  ESO syncs automatically every 5 minutes from GCP Secret Manager"
    echo "  After updating secrets in GCP, restart pods to pick up changes"
    echo ""
    print_warn "Remember:"
    echo "  - SSL certificate provisioning can take 15-60 minutes"
    echo "  - Ensure DNS records are properly configured"
    echo "  - Monitor pod logs for any startup issues"
    echo "  - Secrets are managed via External Secrets Operator (ESO)"
    echo ""
}

# Main execution flow
main() {
    print_header "FlowMaestro GCP Deployment Script"

    check_prerequisites
    gather_config
    authenticate_gcp
    enable_apis
    configure_pulumi
    deploy_infrastructure
    get_infrastructure_outputs
    configure_dns
    build_and_push_images
    configure_kubectl
    update_k8s_manifests
    verify_eso
    run_migrations
    deploy_to_k8s
    wait_for_pods
    check_ssl_certificate
    final_instructions

    print_success "Deployment script completed!"
}

# Run main function
main
