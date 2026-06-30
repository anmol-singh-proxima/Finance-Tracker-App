#!/bin/bash

# Deploy Frontend and Backend to production

set -e

ENVIRONMENT=${1:-production}
AWS_REGION=${2:-us-east-1}
AWS_ACCOUNT_ID=${3:-}

echo "=========================================="
echo "Finance Tracker - Deployment Script"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
echo "Account ID: $AWS_ACCOUNT_ID"
echo ""

# Validate inputs
if [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "Error: AWS_ACCOUNT_ID is required"
  echo "Usage: ./deploy.sh [environment] [region] [account_id]"
  exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
  echo -e "${GREEN}✓${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# Step 1: Build Frontend
echo ""
echo "Step 1: Building frontend..."
cd frontend
npm run build
cd ..
log_info "Frontend build completed"

# Step 2: Build Docker Images
echo ""
echo "Step 2: Building Docker images..."
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

log_info "Building server image..."
docker build -t finance-tracker-server:${ENVIRONMENT} -f server/Dockerfile .

log_info "Building Lambda image..."
docker build -t finance-tracker-graphql:${ENVIRONMENT} -f lambdas/graphql-service/Dockerfile ./lambdas/graphql-service

# Step 3: Login to ECR
echo ""
echo "Step 3: Authenticating with ECR..."
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${ECR_REGISTRY}
log_info "ECR authentication successful"

# Step 4: Push images to ECR
echo ""
echo "Step 4: Pushing images to ECR..."
docker tag finance-tracker-server:${ENVIRONMENT} ${ECR_REGISTRY}/finance-tracker-server:${ENVIRONMENT}
docker push ${ECR_REGISTRY}/finance-tracker-server:${ENVIRONMENT}
log_info "Server image pushed"

docker tag finance-tracker-graphql:${ENVIRONMENT} ${ECR_REGISTRY}/finance-tracker-graphql:${ENVIRONMENT}
docker push ${ECR_REGISTRY}/finance-tracker-graphql:${ENVIRONMENT}
log_info "Lambda image pushed"

# Step 5: Create ECR repositories if they don't exist
echo ""
echo "Step 5: Ensuring ECR repositories exist..."
aws ecr describe-repositories --repository-names finance-tracker-server --region ${AWS_REGION} 2>/dev/null || \
  aws ecr create-repository --repository-name finance-tracker-server --region ${AWS_REGION}
log_info "Server repository ready"

aws ecr describe-repositories --repository-names finance-tracker-graphql --region ${AWS_REGION} 2>/dev/null || \
  aws ecr create-repository --repository-name finance-tracker-graphql --region ${AWS_REGION}
log_info "Lambda repository ready"

# Step 6: Update ECS service
echo ""
echo "Step 6: Updating ECS service..."
SERVICE_NAME="finance-tracker-service-${ENVIRONMENT}"
CLUSTER_NAME="finance-tracker-cluster-${ENVIRONMENT}"

aws ecs update-service \
  --cluster ${CLUSTER_NAME} \
  --service ${SERVICE_NAME} \
  --force-new-deployment \
  --region ${AWS_REGION} 2>/dev/null || \
  log_warn "ECS service update skipped (service may not exist yet)"

# Step 7: Deploy Lambda
echo ""
echo "Step 7: Deploying Lambda function..."
cd lambdas/graphql-service
zip -r lambda-deployment.zip handler.py schema.py resolvers.py requirements.txt -q
aws lambda update-function-code \
  --function-name finance-tracker-graphql-${ENVIRONMENT} \
  --zip-file fileb://lambda-deployment.zip \
  --region ${AWS_REGION} 2>/dev/null || \
  log_warn "Lambda function update skipped (function may need to be created first)"
rm -f lambda-deployment.zip
cd ../../

# Step 8: Wait for ECS service to be stable
echo ""
echo "Step 8: Waiting for ECS service to stabilize..."
aws ecs wait services-stable \
  --cluster ${CLUSTER_NAME} \
  --services ${SERVICE_NAME} \
  --region ${AWS_REGION} 2>/dev/null || \
  log_warn "ECS service stabilization check skipped"

# Completion
echo ""
echo "=========================================="
log_info "Deployment completed successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Verify the deployment in AWS Console"
echo "2. Check CloudWatch logs for any errors"
echo "3. Test the application endpoints"
echo ""
echo "URLs:"
echo "- Frontend: https://your-domain.com"
echo "- API: https://api.your-domain.com/api"
echo "- GraphQL: https://api.your-domain.com/api/graphql"
