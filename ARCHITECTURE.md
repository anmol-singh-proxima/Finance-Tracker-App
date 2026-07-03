# Finance Tracker App - Architecture & Implementation Guide

**Author:** Senior Principal Engineer  
**Date:** May 2026  
**Version:** 1.0  

> ⚠️ **SUPERSEDED — historical reference only.** This document describes the **original**
> architecture (public API Gateway → ALB → ECS Node+React → GraphQL Lambda). It is **no
> longer the target design**. The current target architecture is
> **[UPDATED-ARCHITECTURE.md](UPDATED-ARCHITECTURE.md)** (serverless-first: CloudFront + S3
> + API Gateway + Cognito + FastAPI Lambda + RDS).
>
> It is retained only because the **code currently in this repo still implements the design
> described here**, until the migration in [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md)
> §7 is complete. For requirements and the requirement→architecture→code mapping, start at
> [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md). Do not build new work against this file.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Design](#architecture-design)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Frontend Integration](#frontend-integration)
6. [Backend Microservices](#backend-microservices)
7. [AWS Infrastructure](#aws-infrastructure)
8. [Security Model](#security-model)
9. [Deployment Strategy](#deployment-strategy)
10. [Implementation Steps](#implementation-steps)

---

## 1. Overview

The Finance Tracker App is a modern financial management application that helps users track expenses and investments. It follows a microservices architecture with clear separation of concerns:

- **Frontend:** React application served through a Node.js server
- **Backend:** Serverless microservices using AWS Lambda
- **API Layer:** Node.js API server + API Gateway
- **Infrastructure:** AWS VPC with ECS and Lambda services

### Key Principles

- **Single Application Model:** Both React and Node.js server are deployed as one unit
- **Separation of Concerns:** UI rendering in React, business logic in Node.js
- **Microservices:** Independent Lambda functions for different operations
- **Security:** Domain-restricted CORS, VPC-isolated services, security groups
- **Scalability:** Serverless Lambda for independent scaling

---

## 2. Architecture Design

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
│                    (User's Browser)                         │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  API Gateway   │
                    │  (Public)      │
                    └────────┬───────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
         ┌─────────────────┐      ┌──────────────────┐
         │   VPC           │      │  Lambda (Python) │
         │                 │      │  GraphQL Layer   │
         │ ┌─────────────┐ │      │  (Private)       │
         │ │ ECS         │ │──────│                  │
         │ │ Cluster     │ │      │  Microservices   │
         │ │(Node.js+React)│      │                  │
         │ │ Frontend App│ │      └──────────────────┘
         │ │ Service     │ │
         │ └─────────────┘ │
         │                 │
         └─────────────────┘
            VPC
```

### Component Description

**1. API Gateway (Public)**
- Entry point for all client requests
- Routes requests based on endpoints
- Acts as reverse proxy to ECS service

**2. ECS Cluster (Private - in VPC)**
- Runs Node.js + React application
- Serves React frontend files
- Provides API endpoints
- Manages user authentication and sessions
- Connects with Lambda services

**3. Lambda Functions (Private - in VPC)**
- Python-based microservices
- GraphQL implementation
- Business logic execution
- Database operations
- Triggered by ECS service
- Private communication via VPC endpoints

**4. VPC (Virtual Private Cloud)**
- Network isolation for all services
- Security groups for traffic control
- Only ECS can communicate with Lambda
- All traffic is encrypted

---

## 3. Technology Stack

### Frontend
- **Framework:** React 18+
- **Build Tool:** Webpack/Vite
- **Styling:** CSS Modules / Tailwind CSS
- **State Management:** Redux / Context API
- **HTTP Client:** Axios

### Node.js Server
- **Runtime:** Node.js 18+ LTS
- **Framework:** Express.js
- **Authentication:** JWT, Session management
- **CORS:** Domain-restricted
- **Port:** 3000 (configurable)

### Python Lambda
- **Runtime:** Python 3.11+
- **Framework:** AWS Lambda
- **GraphQL:** Graphene or Strawberry
- **Database:** Database connectors (SQL/NoSQL)

### AWS Services
- **API Gateway:** HTTP routing and throttling
- **ECS:** Container orchestration for Node.js + React
- **Lambda:** Serverless compute for microservices
- **VPC:** Network isolation
- **Security Groups:** Firewall rules
- **RDS/DynamoDB:** Data persistence
- **CloudWatch:** Logging and monitoring

---

## 4. Project Structure

```
finance-tracker-app/
│
├── ARCHITECTURE.md (this file)
├── README.md
├── docker-compose.yml (for local development)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   ├── ExpenseTracker/
│   │   │   ├── InvestmentTracker/
│   │   │   ├── Auth/
│   │   │   └── Common/
│   │   ├── pages/
│   │   ├── services/
│   │   │   └── api.js (API calls to Node.js server)
│   │   ├── redux/
│   │   │   ├── store.js
│   │   │   ├── slices/
│   │   │   │   ├── authSlice.js
│   │   │   │   ├── expenseSlice.js
│   │   │   │   └── investmentSlice.js
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── index.jsx
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
│
├── server/
│   ├── src/
│   │   ├── app.js (main Express app)
│   │   ├── server.js (entry point)
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   └── environment.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── expenses.js
│   │   │   ├── investments.js
│   │   │   └── graphql.js (GraphQL proxy)
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── userController.js
│   │   │   └── lambdaController.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── cors.js
│   │   │   ├── errorHandler.js
│   │   │   └── requestLogger.js
│   │   ├── services/
│   │   │   ├── lambdaService.js (invoke Lambda functions)
│   │   │   ├── sessionService.js
│   │   │   └── authService.js
│   │   ├── utils/
│   │   │   ├── validators.js
│   │   │   ├── jwt.js
│   │   │   └── logger.js
│   │   └── constants/
│   │       └── errorMessages.js
│   ├── package.json
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example
│   └── .eslintrc.json
│
├── lambdas/
│   ├── graphql-service/
│   │   ├── handler.py
│   │   ├── requirements.txt
│   │   ├── schema.py
│   │   ├── resolvers.py
│   │   ├── models.py
│   │   ├── db_connection.py
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   └── (future services)
│       ├── expense-processor/
│       ├── investment-analyzer/
│       └── report-generator/
│
├── infrastructure/
│   ├── vpc/
│   │   ├── vpc.yml (CloudFormation)
│   │   ├── security-groups.yml
│   │   └── vpc-endpoints.yml
│   ├── ecs/
│   │   ├── task-definition.json
│   │   ├── service.yml
│   │   └── cluster.yml
│   ├── lambda/
│   │   ├── iam-role.yml
│   │   ├── lambda-config.yml
│   │   └── vpc-config.yml
│   ├── api-gateway/
│   │   ├── api-definition.yml
│   │   └── integration.yml
│   └── rds/
│       ├── database.yml
│       └── backup-policy.yml
│
├── deployment/
│   ├── dev/
│   │   ├── docker-compose.yml
│   │   └── env.dev
│   ├── staging/
│   │   ├── docker-compose.yml
│   │   ├── kubernetes-manifest.yml
│   │   └── env.staging
│   ├── production/
│   │   ├── docker-compose.yml
│   │   ├── kubernetes-manifest.yml
│   │   ├── env.production
│   │   └── backup-strategy.md
│   ├── build.sh
│   ├── deploy.sh
│   ├── rollback.sh
│   └── Makefile
│
├── tests/
│   ├── frontend/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── server/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── api/
│   └── lambda/
│       ├── unit/
│       └── integration/
│
├── docs/
│   ├── API_ENDPOINTS.md
│   ├── SETUP_GUIDE.md
│   ├── DATABASE_SCHEMA.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── MONITORING.md
│   └── TROUBLESHOOTING.md
│
└── .github/
    └── workflows/
        ├── ci-cd-frontend.yml
        ├── ci-cd-server.yml
        ├── ci-cd-lambda.yml
        └── deploy.yml
```

---

## 5. Frontend Integration

### 5.1 React App with Node.js Server (Single Unit)

The React application and Node.js server run as one application:

**Node.js Server responsibilities:**
- Serve the bundled React application
- Handle all `/api/*` routes
- Manage user authentication and sessions
- Forward GraphQL requests to Lambda
- Enforce CORS for same domain only

**React App responsibilities:**
- UI components and rendering
- State management
- API calls via `/api/*` endpoints
- User interaction handling

### 5.2 Directory Structure

```
frontend/                      # React source code
  └── src/
      ├── components/         # Reusable React components
      ├── pages/             # Page components
      ├── services/
      │   └── api.js         # Axios instance for API calls
      ├── redux/             # State management
      └── App.jsx

server/                        # Node.js server
  └── src/
      ├── app.js             # Express app setup
      ├── server.js          # Server entry point
      ├── routes/            # API routes
      ├── middleware/        # Express middleware
      │   └── cors.js        # CORS configuration
      └── public/            # Build output
          └── (React build files get here)
```

### 5.3 Build and Deployment Flow

```
React Build Phase:
frontend/src → npm run build → frontend/dist/

Node.js Integration:
Copy distribution → server/public/

Dockerfile builds:
- Copies React build to server/public/
- Installs Node.js dependencies
- Starts Node.js server (serves React + API)
```

### 5.4 CORS Configuration

```javascript
// Only domain allowed to access API
const corsOptions = {
  origin: process.env.ALLOWED_DOMAIN,  // e.g., 'https://finance-tracker.com'
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

---

## 6. Backend Microservices

### 6.1 Lambda Architecture

Each Lambda function is independent and handles specific business logic:

**Initial Lambda - GraphQL Service (Python)**
```
Purpose: Process GraphQL queries and mutations
Framework: Graphene/Strawberry
Handler: REST API endpoint
Input: GraphQL query/mutation
Output: JSON response
```

**Future Lambda Functions**
- **Expense Processor:** Create, update, delete expenses
- **Investment Analyzer:** Analyze investment performance
- **Report Generator:** Generate financial reports
- **Notification Service:** Send alerts and notifications

### 6.2 GraphQL Schema (Python Example)

```python
# lambdas/graphql-service/schema.py

import graphene
from models import Expense, Investment

class ExpenseType(graphene.ObjectType):
    id = graphene.String()
    user_id = graphene.String()
    category = graphene.String()
    amount = graphene.Float()
    date = graphene.Date()
    description = graphene.String()

class InvestmentType(graphene.ObjectType):
    id = graphene.String()
    user_id = graphene.String()
    name = graphene.String()
    amount = graphene.Float()
    return_percentage = graphene.Float()

class Query(graphene.ObjectType):
    expenses = graphene.List(ExpenseType, user_id=graphene.String(required=True))
    investments = graphene.List(InvestmentType, user_id=graphene.String(required=True))

class Mutation(graphene.ObjectType):
    create_expense = CreateExpenseMutation.Field()
    create_investment = CreateInvestmentMutation.Field()

schema = graphene.Schema(query=Query, mutation=Mutation)
```

### 6.3 Lambda Handler

```python
# lambdas/graphql-service/handler.py

import json
from schema import schema
from db_connection import connect_db

def lambda_handler(event, context):
    """
    AWS Lambda handler for GraphQL requests
    """
    try:
        # Parse incoming GraphQL query
        query = event.get('body')
        variables = event.get('variables', {})
        
        # Execute GraphQL query
        result = schema.execute(query, variable_values=variables)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'data': result.data,
                'errors': result.errors
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
```

---

## 7. AWS Infrastructure

### 7.1 VPC Setup

```yaml
# infrastructure/vpc/vpc.yml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'VPC for Finance Tracker App'

Resources:
  FinanceTrackerVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: finance-tracker-vpc

  # Public Subnet for ALB/API Gateway
  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref FinanceTrackerVPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [0, !GetAZs '']
      MapPublicIpOnLaunch: true

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref FinanceTrackerVPC
      CidrBlock: 10.0.2.0/24
      AvailabilityZone: !Select [1, !GetAZs '']
      MapPublicIpOnLaunch: true

  # Private Subnets for ECS and Lambda
  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref FinanceTrackerVPC
      CidrBlock: 10.0.11.0/24
      AvailabilityZone: !Select [0, !GetAZs '']

  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref FinanceTrackerVPC
      CidrBlock: 10.0.12.0/24
      AvailabilityZone: !Select [1, !GetAZs '']
```

### 7.2 Security Groups

```yaml
# infrastructure/vpc/security-groups.yml

ECSSecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: Security group for ECS Frontend Service
    VpcId: !Ref FinanceTrackerVPC
    SecurityGroupIngress:
      - IpProtocol: tcp
        FromPort: 3000
        ToPort: 3000
        CidrIp: 0.0.0.0/0  # From ALB
    SecurityGroupEgress:
      - IpProtocol: -1
        CidrIp: 0.0.0.0/0

LambdaSecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: Security group for Lambda functions
    VpcId: !Ref FinanceTrackerVPC
    SecurityGroupIngress:
      - IpProtocol: tcp
        FromPort: 443
        ToPort: 443
        SourceSecurityGroupId: !Ref ECSSecurityGroup  # Only from ECS

DatabaseSecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: Security group for RDS Database
    VpcId: !Ref FinanceTrackerVPC
    SecurityGroupIngress:
      - IpProtocol: tcp
        FromPort: 5432
        ToPort: 5432
        SourceSecurityGroupId: !Ref ECSSecurityGroup
      - IpProtocol: tcp
        FromPort: 5432
        ToPort: 5432
        SourceSecurityGroupId: !Ref LambdaSecurityGroup
```

### 7.3 Communication Flow

```
User Browser
    ↓
    ↓ HTTPS (any origin allowed at API Gateway level)
    ↓
API Gateway (Public)
    ↓
    ↓ Routes to ALB
    ↓
Application Load Balancer (Public Subnet)
    ↓
    ↓ Routes to port 3000
    ↓
ECS Service (Private Subnet)
└── Node.js + React App
    ├── Serves React UI
    ├── Enforces CORS (same domain only)
    └── Invokes Lambda
        ↓
        ↓ (Same VPC, Private)
        ↓
Lambda (Private Subnet)
└── Python GraphQL Service
    └── Database Access
```

---

## 8. Security Model

### 8.1 Layers of Security

**Layer 1: API Gateway**
- Rate limiting
- Request validation
- WAF (Web Application Firewall)

**Layer 2: CORS (Node.js Server)**
- Only domain: `process.env.ALLOWED_DOMAIN`
- Credentials allowed
- Specific HTTP methods

**Layer 3: VPC Security Groups**
- ECS can only accept traffic from ALB (port 3000)
- Lambda can only accept traffic from ECS (port 443)
- Database only accepts from ECS and Lambda (port 5432)

**Layer 4: IAM Roles**
- ECS task role: Can invoke specific lambda functions
- Lambda execution role: Can access database and CloudWatch

**Layer 5: Authentication**
- JWT tokens for user sessions
- Refresh tokens for security
- Session management in Node.js

### 8.2 VPC Endpoint Configuration

For Lambda to access AWS services:
```yaml
# infrastructure/vpc/vpc-endpoints.yml
S3VPCEndpoint:
  Type: AWS::EC2::VPCEndpoint
  Properties:
    VpcId: !Ref FinanceTrackerVPC
    ServiceName: !Sub 'com.amazonaws.${AWS::Region}.s3'
    RouteTableIds:
      - !Ref PrivateRouteTable

DynamoDBVPCEndpoint:
  Type: AWS::EC2::VPCEndpoint
  Properties:
    VpcId: !Ref FinanceTrackerVPC
    ServiceName: !Sub 'com.amazonaws.${AWS::Region}.dynamodb'
    RouteTableIds:
      - !Ref PrivateRouteTable
```

---

## 9. Deployment Strategy

### 9.1 CI/CD Pipeline

```
GitHub Push
    ↓
    ├── Trigger: ci-cd-frontend.yml
    │   ├── Build React app
    │   ├── Run tests
    │   └── Build Docker image
    │
    ├── Trigger: ci-cd-server.yml
    │   ├── Install dependencies
    │   ├── Run tests
    │   ├── Build Docker image (with React build)
    │   └── Push to ECR
    │
    └── Trigger: ci-cd-lambda.yml
        ├── Install dependencies
        ├── Run tests
        ├── Package Lambda
        └── Deploy to AWS Lambda
```

### 9.2 Frontend & Backend Deployment Separation

**Frontend Deployment:**
1. Build React: `npm run build` in `frontend/`
2. Create Docker image with React build
3. Push to ECR

**Backend (Node.js) Deployment:**
1. Copy React build to `server/public/`
2. Build Node.js Docker image
3. Push to ECR
4. Deploy to ECS

**Lambda Deployment:**
1. Install Python dependencies
2. Package Lambda code with dependencies
3. Deploy to AWS Lambda
4. Update Lambda VPC configuration

### 9.3 Deployment Files

**For Frontend:**
- `deployment/dev/docker-compose.yml` - Local development
- `.github/workflows/ci-cd-frontend.yml` - CI/CD pipeline

**For Backend (Node.js):**
- `server/Dockerfile` - Production Docker image
- `.github/workflows/ci-cd-server.yml` - CI/CD pipeline
- `deployment/production/docker-compose.yml` - Production deployment

**For Lambda:**
- `lambdas/graphql-service/Dockerfile` - Docker image
- `.github/workflows/ci-cd-lambda.yml` - CI/CD pipeline
- `deployment/lambda-deploy.sh` - Deployment script

---

## 10. Implementation Steps

### Phase 1: Setup (Week 1)

#### Step 1.1: Initialize Project Structure
```bash
mkdir finance-tracker-app
cd finance-tracker-app
git init
```

#### Step 1.2: Create Frontend (React)
```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install axios redux react-redux react-router-dom
npm run build
```

#### Step 1.3: Create Backend (Node.js)
```bash
cd ../
mkdir server
cd server
npm init -y
npm install express cors dotenv axios aws-sdk bcryptjs jsonwebtoken
```

#### Step 1.4: Create Lambda Service (Python)
```bash
cd ../
mkdir -p lambdas/graphql-service
cd lambdas/graphql-service
pip install graphene strawberry boto3
```

### Phase 2: Development (Week 2-3)

#### Step 2.1: React Component Structure
- Create pages: Dashboard, Expenses, Investments, Auth
- Create services: API communication
- Setup Redux for state management

#### Step 2.2: Node.js Server Implementation
- Setup Express app
- Create authentication middleware
- Create API routes
- Implement Lambda invocation service
- Setup CORS middleware

#### Step 2.3: Python Lambda Development
- Define GraphQL schema
- Create resolvers for queries and mutations
- Implement database connection
- Setup error handling

### Phase 3: Integration (Week 3-4)

#### Step 3.1: Frontend-Backend Integration
- Create API service in React
- Test API endpoints
- Implement authentication flow

#### Step 3.2: Backend-Lambda Integration
- Setup Lambda invocation from Node.js
- Create Lambda handler
- Test GraphQL queries from Node.js

#### Step 3.3: Testing
- Unit tests for React components
- Integration tests for API endpoints
- Tests for Lambda functions

### Phase 4: AWS Infrastructure (Week 4-5)

#### Step 4.1: VPC Setup
- Create VPC with public/private subnets
- Setup NAT Gateway
- Create route tables

#### Step 4.2: Security Groups
- ECS security group
- Lambda security group
- Database security group

#### Step 4.3: ECS Setup
- Create ECS cluster
- Create task definition
- Create service

#### Step 4.4: Lambda Deployment
- Create IAM roles
- Deploy Lambda functions
- Create Lambda permissions

#### Step 4.5: API Gateway
- Create API Gateway resource
- Setup integration with ALB/ECS
- Enable CORS

### Phase 5: Deployment (Week 5-6)

#### Step 5.1: Docker Setup
- Create Dockerfile for Node.js
- Create Dockerfile for Lambda
- Build and test locally

#### Step 5.2: ECR Setup
- Create ECR repositories
- Push images to ECR

#### Step 5.3: CI/CD Pipeline
- Setup GitHub Actions workflows
- Configure deployment scripts
- Test deployment process

#### Step 5.4: Monitoring & Logging
- Setup CloudWatch logs
- Configure alarms
- Setup monitoring dashboards

---

## File Creation Priority

1. ✅ Project directory structure
2. ✅ Frontend React app with Vite
3. ✅ Node.js server with Express
4. ✅ Python Lambda with GraphQL
5. ✅ Docker configurations
6. ✅ AWS infrastructure as code
7. ✅ CI/CD workflows
8. ✅ Documentation files
9. ✅ Test setup
10. ✅ Deployment scripts

---

## Development Commands

### Frontend Development
```bash
cd frontend
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm test             # Run tests
```

### Backend Development
```bash
cd server
npm install          # Install dependencies
npm run dev          # Start development server
npm start            # Start production server
npm test             # Run tests
```

### Lambda Development
```bash
cd lambdas/graphql-service
pip install -r requirements.txt
sam local start-api   # Local Lambda testing
pytest                # Run tests
```

### Docker Development
```bash
# Build and run with docker-compose
docker-compose up     # Start all services
docker-compose down   # Stop all services
```

---

## Key Concepts Summary

| Concept | Explanation |
|---------|------------|
| **Single App Model** | React and Node.js deployed together as one Docker image |
| **CORS Protection** | Only requests from configured domain allowed to API |
| **VPC Isolation** | All services in private VPC for security |
| **Security Groups** | ECS only from ALB, Lambda only from ECS |
| **Microservices** | Each Lambda handles specific business logic independently |
| **GraphQL** | Unified API query language for data fetching |
| **Serverless** | Lambda auto-scales, pay only for execution time |
| **Infrastructure as Code** | CloudFormation/SAM for reproducible AWS setup |

---

## Next Steps

1. ✅ Create project structure
2. ✅ Initialize React app
3. ✅ Setup Node.js server
4. ✅ Create Python Lambda
5. ✅ Implement authentication
6. ✅ Setup database schema
7. ✅ Create API endpoints
8. ✅ Deploy to AWS

---

## Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [GraphQL Documentation](https://graphql.org/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [AWS VPC Documentation](https://docs.aws.amazon.com/vpc/)
- [Docker Documentation](https://docs.docker.com/)

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | May 2026 | Senior Principal Engineer | Initial architecture and implementation guide |

---

**End of Document**
