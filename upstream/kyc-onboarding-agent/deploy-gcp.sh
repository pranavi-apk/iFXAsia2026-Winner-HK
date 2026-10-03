#!/bin/bash

# GCP Deployment Script for KYC Onboarding Demo
# Author: Zuber Taj
# Date: 2026-05-04

set -e  # Exit on error

# ============================================================================
# Configuration
# ============================================================================

echo "=========================================="
echo "GCP Deployment Configuration"
echo "=========================================="

# GCP Configuration
export GCLOUD_PATH="gcloud"
export GCP_PROJECT="your-gcp-project"
export GCP_REGION="us-central1"
export GCP_USER="you@example.com"

# Network Configuration
export VPC_NETWORK="your-vpc"
export VPC_SUBNET="your-subnet"
export VPC_CONNECTOR="vpc-connector-ailab"  # Will create if doesn't exist

# Storage Configuration
# Note: Using Cloud Storage bucket for persistent file storage
export STORAGE_BUCKET="kyc-onboarding-demo-data"

# Docker Image Configuration
export ARTIFACT_REGISTRY_LOCATION="us-central1"
export ARTIFACT_REGISTRY_REPO="your-artifact-repo"
export BACKEND_IMAGE="us-central1-docker.pkg.dev/your-gcp-project/your-artifact-repo/kyc-onboarding-demo-backend"
export FRONTEND_IMAGE="us-central1-docker.pkg.dev/your-gcp-project/your-artifact-repo/kyc-onboarding-demo-frontend"

# Cloud Run Configuration
export BACKEND_SERVICE_NAME="backend-kyc-onboarding-demo"
export FRONTEND_SERVICE_NAME="kyc-onboarding-demo"
export SERVICE_ACCOUNT="000000000000-compute@developer.gserviceaccount.com"

# Vertex AI Configuration
export VERTEX_AI_API_NAME="your-vertex-endpoint"

echo "✓ Configuration loaded"
echo ""

# ============================================================================
# Helper Functions
# ============================================================================

function check_prerequisites() {
    echo "Checking prerequisites..."

    # Check if gcloud is installed
    if [ ! -f "$GCLOUD_PATH" ]; then
        echo "❌ Error: gcloud not found at $GCLOUD_PATH"
        exit 1
    fi

    # Check if logged into gcloud
    if ! $GCLOUD_PATH auth list --filter=status:ACTIVE --format="value(account)" | grep -q "$GCP_USER"; then
        echo "⚠️  Warning: Not logged in as $GCP_USER"
        echo "Logging in..."
        $GCLOUD_PATH auth login --account=$GCP_USER
    fi

    # Set project
    $GCLOUD_PATH config set project $GCP_PROJECT

    # Enable required APIs
    echo "Enabling required GCP APIs..."
    $GCLOUD_PATH services enable cloudbuild.googleapis.com \
        run.googleapis.com \
        artifactregistry.googleapis.com \
        vpcaccess.googleapis.com \
        storage.googleapis.com \
        compute.googleapis.com \
        --quiet

    echo "✓ Prerequisites OK"
    echo ""
}

function setup_storage() {
    echo "=========================================="
    echo "Setting up Cloud Storage"
    echo "=========================================="

    # Check if bucket exists
    BUCKET_EXISTS=$($GCLOUD_PATH storage buckets list --format="value(name)" | grep -c "^${STORAGE_BUCKET}$" || true)

    if [ "$BUCKET_EXISTS" -eq "0" ]; then
        echo "Creating storage bucket: $STORAGE_BUCKET"
        $GCLOUD_PATH storage buckets create gs://${STORAGE_BUCKET} \
            --location=${GCP_REGION} \
            --uniform-bucket-level-access
        echo "✓ Storage bucket created"
    else
        echo "✓ Storage bucket already exists"
    fi
    echo ""
}

function enable_cloud_build() {
    echo "=========================================="
    echo "Configuring Cloud Build"
    echo "=========================================="

    # Grant Cloud Build permissions to deploy to Cloud Run
    PROJECT_NUMBER=$($GCLOUD_PATH projects describe $GCP_PROJECT --format="value(projectNumber)")

    echo "Granting Cloud Build service account permissions..."
    $GCLOUD_PATH projects add-iam-policy-binding $GCP_PROJECT \
        --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
        --role="roles/run.admin" \
        --quiet || true

    $GCLOUD_PATH projects add-iam-policy-binding $GCP_PROJECT \
        --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
        --role="roles/iam.serviceAccountUser" \
        --quiet || true

    echo "✓ Cloud Build configured"
    echo ""
}

function build_and_push_images() {
    echo "=========================================="
    echo "Building Images with Cloud Build"
    echo "=========================================="

    # Build Backend Image
    echo "Building backend image with Cloud Build..."
    cd backend
    $GCLOUD_PATH builds submit \
        --config=cloudbuild.yaml \
        --region=${GCP_REGION} \
        --quiet
    echo "✓ Backend image built and pushed"
    cd ..

    # Build Frontend Image
    echo "Building frontend image with Cloud Build..."
    cd frontend
    $GCLOUD_PATH builds submit \
        --config=cloudbuild.yaml \
        --region=${GCP_REGION} \
        --quiet
    echo "✓ Frontend image built and pushed"
    cd ..

    echo ""
}

function create_vpc_connector() {
    echo "=========================================="
    echo "Checking VPC Connector"
    echo "=========================================="

    # Check if VPC connector exists
    CONNECTOR_EXISTS=$($GCLOUD_PATH compute networks vpc-access connectors list \
        --region=$GCP_REGION \
        --format="value(name)" | grep -c "^${VPC_CONNECTOR}$" || true)

    if [ "$CONNECTOR_EXISTS" -eq "0" ]; then
        echo "Creating VPC connector: $VPC_CONNECTOR"
        $GCLOUD_PATH compute networks vpc-access connectors create $VPC_CONNECTOR \
            --region=$GCP_REGION \
            --network=$VPC_NETWORK \
            --range=10.8.0.0/28 \
            --min-instances=2 \
            --max-instances=10
        echo "✓ VPC connector created"
    else
        echo "✓ VPC connector already exists"
    fi
    echo ""
}

function deploy_backend() {
    echo "=========================================="
    echo "Deploying Backend to Cloud Run"
    echo "=========================================="

    $GCLOUD_PATH run deploy $BACKEND_SERVICE_NAME \
        --image=${BACKEND_IMAGE}:latest \
        --region=$GCP_REGION \
        --platform=managed \
        --allow-unauthenticated \
        --service-account=$SERVICE_ACCOUNT \
        --vpc-connector=$VPC_CONNECTOR \
        --vpc-egress=all-traffic \
        --set-env-vars="ENVIRONMENT=production" \
        --set-env-vars="DEBUG=False" \
        --set-env-vars="GOOGLE_CLOUD_PROJECT=${GCP_PROJECT}" \
        --set-env-vars="GOOGLE_CLOUD_REGION=${GCP_REGION}" \
        --set-env-vars="VERTEX_AI_API_NAME=${VERTEX_AI_API_NAME}" \
        --set-env-vars="CORS_ORIGINS=https://${FRONTEND_SERVICE_NAME}.run.app" \
        --set-env-vars="STORAGE_BUCKET=${STORAGE_BUCKET}" \
        --memory=2Gi \
        --cpu=2 \
        --timeout=300 \
        --concurrency=80 \
        --min-instances=0 \
        --max-instances=10 \
        --tag=zuber-taj

    # Get the backend URL
    export BACKEND_URL=$($GCLOUD_PATH run services describe $BACKEND_SERVICE_NAME \
        --region=$GCP_REGION \
        --format="value(status.url)")

    # Grant storage permissions to service account
    echo "Granting storage permissions..."
    $GCLOUD_PATH storage buckets add-iam-policy-binding gs://${STORAGE_BUCKET} \
        --member="serviceAccount:${SERVICE_ACCOUNT}" \
        --role="roles/storage.objectAdmin" \
        --quiet || true

    echo "✓ Backend deployed at: $BACKEND_URL"
    echo ""
}

function deploy_frontend() {
    echo "=========================================="
    echo "Deploying Frontend to Cloud Run"
    echo "=========================================="

    $GCLOUD_PATH run deploy $FRONTEND_SERVICE_NAME \
        --image=${FRONTEND_IMAGE}:latest \
        --region=$GCP_REGION \
        --platform=managed \
        --allow-unauthenticated \
        --service-account=$SERVICE_ACCOUNT \
        --set-env-vars="VITE_API_BASE_URL=${BACKEND_URL}" \
        --memory=512Mi \
        --cpu=1 \
        --timeout=60 \
        --concurrency=100 \
        --min-instances=0 \
        --max-instances=5

    # Get the frontend URL
    export FRONTEND_URL=$($GCLOUD_PATH run services describe $FRONTEND_SERVICE_NAME \
        --region=$GCP_REGION \
        --format="value(status.url)")

    echo "✓ Frontend deployed at: $FRONTEND_URL"
    echo ""
}

function display_summary() {
    echo "=========================================="
    echo "Deployment Summary"
    echo "=========================================="
    echo ""
    echo "✓ Backend Service: $BACKEND_URL"
    echo "✓ Frontend Service: $FRONTEND_URL"
    echo ""
    echo "Cloud Storage:"
    echo "  - Bucket: gs://$STORAGE_BUCKET"
    echo ""
    echo "Docker Images:"
    echo "  - Backend: $BACKEND_IMAGE:latest"
    echo "  - Frontend: $FRONTEND_IMAGE:latest"
    echo ""
    echo "Network:"
    echo "  - VPC: $VPC_NETWORK"
    echo "  - Subnet: $VPC_SUBNET"
    echo "  - VPC Connector: $VPC_CONNECTOR"
    echo ""
    echo "=========================================="
    echo "Deployment Complete! 🎉"
    echo "=========================================="
}

# ============================================================================
# Main Deployment Flow
# ============================================================================

function main() {
    echo ""
    echo "=========================================="
    echo "KYC Onboarding Demo - GCP Deployment"
    echo "=========================================="
    echo ""

    # Step 1: Check prerequisites
    check_prerequisites

    # Step 2: Setup storage
    setup_storage

    # Step 3: Enable Cloud Build
    enable_cloud_build

    # Step 4: Build and push images
    build_and_push_images

    # Step 5: Create VPC connector
    create_vpc_connector

    # Step 6: Deploy backend
    deploy_backend

    # Step 7: Deploy frontend
    deploy_frontend

    # Step 8: Display summary
    display_summary
}

# ============================================================================
# Script Execution
# ============================================================================

# Parse command line arguments
case "${1:-all}" in
    "prereq")
        check_prerequisites
        ;;
    "storage")
        check_prerequisites
        setup_storage
        ;;
    "build")
        check_prerequisites
        configure_docker
        build_and_push_images
        ;;
    "backend")
        check_prerequisites
        deploy_backend
        ;;
    "frontend")
        check_prerequisites
        deploy_frontend
        ;;
    "all")
        main
        ;;
    *)
        echo "Usage: $0 {all|prereq|storage|build|backend|frontend}"
        echo ""
        echo "Commands:"
        echo "  all       - Run full deployment (default)"
        echo "  prereq    - Check prerequisites only"
        echo "  storage   - Setup storage bucket only"
        echo "  build     - Build and push images only"
        echo "  backend   - Deploy backend only"
        echo "  frontend  - Deploy frontend only"
        exit 1
        ;;
esac
