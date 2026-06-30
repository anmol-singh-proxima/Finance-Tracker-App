.PHONY: help install dev build push deploy-aws clean test lint

# Variables
ENVIRONMENT ?= development
AWS_ACCOUNT_ID ?= your_account_id
AWS_REGION ?= us-east-1
ECR_REGISTRY = $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com
SERVER_IMAGE = finance-tracker-server
LAMBDA_IMAGE = finance-tracker-graphql

help:
	@echo "Finance Tracker - Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install              - Install all dependencies"
	@echo "  make build-frontend       - Build React frontend"
	@echo ""
	@echo "Development:"
	@echo "  make dev                  - Start development with Docker Compose"
	@echo "  make dev-manual           - Start development services manually"
	@echo "  make stop-dev             - Stop development services"
	@echo ""
	@echo "Building:"
	@echo "  make build-server         - Build server Docker image"
	@echo "  make build-lambda         - Build Lambda Docker image"
	@echo "  make build-all            - Build all Docker images"
	@echo ""
	@echo "AWS Deployment:"
	@echo "  make push-images          - Push images to ECR"
	@echo "  make deploy-vpc           - Deploy VPC stack"
	@echo "  make deploy-sg            - Deploy Security Groups"
	@echo "  make deploy-iam           - Deploy IAM roles"
	@echo "  make deploy-ecs           - Deploy ECS service"
	@echo "  make deploy-lambda        - Deploy Lambda functions"
	@echo "  make deploy-all           - Deploy entire stack"
	@echo ""
	@echo "Utilities:"
	@echo "  make test                 - Run all tests"
	@echo "  make lint                 - Run linters"
	@echo "  make clean                - Clean build files"
	@echo "  make logs-frontend        - View frontend logs"
	@echo "  make logs-server          - View server logs"
	@echo ""

install:
	@echo "Installing dependencies..."
	cd frontend && npm install && cd ..
	cd server && npm install && cd ..
	cd lambdas/graphql-service && pip install -r requirements.txt && cd ../../

build-frontend:
	@echo "Building React frontend..."
	cd frontend && npm run build && cd ..

dev:
	@echo "Starting development environment with Docker Compose..."
	docker-compose up --build

dev-manual:
	@echo "Starting services manually..."
	@echo "Make sure to run each in separate terminal:"
	@echo "  Terminal 1: cd server && npm run dev"
	@echo "  Terminal 2: cd frontend && npm run dev"
	@echo "  Terminal 3: cd lambdas/graphql-service && python -m uvicorn handler:app --host 0.0.0.0 --port 4000"

stop-dev:
	@echo "Stopping development environment..."
	docker-compose down

build-server: build-frontend
	@echo "Building server Docker image..."
	docker build -t $(SERVER_IMAGE):latest -f server/Dockerfile .

build-lambda:
	@echo "Building Lambda Docker image..."
	docker build -t $(LAMBDA_IMAGE):latest -f lambdas/graphql-service/Dockerfile ./lambdas/graphql-service

build-all: build-server build-lambda
	@echo "All images built successfully"

push-images: build-all
	@echo "Logging in to ECR..."
	aws ecr get-login-password --region $(AWS_REGION) | \
		docker login --username AWS --password-stdin $(ECR_REGISTRY)
	@echo "Pushing server image..."
	docker tag $(SERVER_IMAGE):latest $(ECR_REGISTRY)/$(SERVER_IMAGE):latest
	docker push $(ECR_REGISTRY)/$(SERVER_IMAGE):latest
	@echo "Pushing Lambda image..."
	docker tag $(LAMBDA_IMAGE):latest $(ECR_REGISTRY)/$(LAMBDA_IMAGE):latest
	docker push $(ECR_REGISTRY)/$(LAMBDA_IMAGE):latest
	@echo "All images pushed to ECR"

deploy-vpc:
	@echo "Deploying VPC stack..."
	aws cloudformation create-stack \
		--stack-name finance-tracker-vpc-$(ENVIRONMENT) \
		--template-body file://infrastructure/vpc/vpc.yml \
		--parameters ParameterKey=Environment,ParameterValue=$(ENVIRONMENT) \
		--region $(AWS_REGION)

deploy-sg:
	@echo "Deploying Security Groups..."
	aws cloudformation create-stack \
		--stack-name finance-tracker-sg-$(ENVIRONMENT) \
		--template-body file://infrastructure/vpc/security-groups.yml \
		--parameters \
			ParameterKey=Environment,ParameterValue=$(ENVIRONMENT) \
			ParameterKey=VPCId,ParameterValue=vpc-xxxxx \
		--region $(AWS_REGION)

deploy-iam:
	@echo "Deploying IAM roles..."
	aws cloudformation create-stack \
		--stack-name finance-tracker-iam-$(ENVIRONMENT) \
		--template-body file://infrastructure/lambda/iam-role.yml \
		--parameters ParameterKey=Environment,ParameterValue=$(ENVIRONMENT) \
		--capabilities CAPABILITY_NAMED_IAM \
		--region $(AWS_REGION)

deploy-ecs:
	@echo "Deploying ECS service..."
	@echo "ECS deployment template needed: infrastructure/ecs/ecs-service.yml"

deploy-lambda:
	@echo "Deploying Lambda functions..."
	@echo "Lambda deployment script needed: deployment/deploy-lambda.sh"

deploy-all: deploy-vpc deploy-sg deploy-iam deploy-ecs deploy-lambda
	@echo "Full stack deployment initiated"

test:
	@echo "Running tests..."
	cd frontend && npm test -- --run && cd ..
	cd server && npm test && cd ..
	cd lambdas/graphql-service && pytest && cd ../../

lint:
	@echo "Running linters..."
	cd frontend && npm run lint && cd ..
	cd server && npm run lint && cd ..

clean:
	@echo "Cleaning build files..."
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	rm -rf server/node_modules
	rm -rf lambdas/graphql-service/__pycache__
	rm -rf lambdas/graphql-service/.pytest_cache
	docker system prune -f

logs-frontend:
	docker logs -f finance-tracker-app

logs-server:
	docker logs -f finance-tracker-app

logs-graphql:
	docker logs -f finance-tracker-graphql

logs-db:
	docker logs -f finance-tracker-db

shell-db:
	docker exec -it finance-tracker-db psql -U finance_user -d finance_tracker

shell-app:
	docker exec -it finance-tracker-app sh

.DEFAULT_GOAL := help
