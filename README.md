# Finance Tracker App

A modern financial management application built with React, Node.js, and AWS serverless architecture.

## Overview

Finance Tracker helps users track their expenses and investments with a comprehensive web application featuring:

- **Expense Tracking**: Log and categorize daily expenses
- **Investment Management**: Track investments and returns
- **Dashboard Analytics**: Financial overview and metrics
- **User Authentication**: Secure login and session management

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Python 3.11+ (for Lambda development)
- AWS CLI configured (for cloud deployment)
- Git

### 1. Clone and Install

```bash
# Clone the repository
git clone <repo-url>
cd finance-tracker-app

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install server dependencies
cd server
npm install
cd ..

# Install Lambda dependencies
cd lambdas/graphql-service
pip install -r requirements.txt
cd ../../
```

### 2. Local Development with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Services will be available at:
# - Frontend/API: http://localhost:3000
# - GraphQL: http://localhost:4000
# - Database: localhost:5432
```

### 3. Manual Local Development

Create `.env` files in `server/` and `frontend/` from `.env.example`:

```bash
# Terminal 1: Start Backend
cd server
npm run dev

# Terminal 2: Start Frontend (in a new terminal)
cd frontend
npm run dev

# Terminal 3: Start GraphQL Lambda (in a new terminal)
cd lambdas/graphql-service
python -m uvicorn handler:app --host 0.0.0.0 --port 4000
```

## Project Structure

```
finance-tracker-app/
├── frontend/                 # React application
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── server/                   # Node.js server
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── lambdas/                  # AWS Lambda functions
│   └── graphql-service/
│       ├── handler.py
│       ├── schema.py
│       └── requirements.txt
├── infrastructure/           # AWS CloudFormation templates
│   ├── vpc/
│   ├── ecs/
│   ├── lambda/
│   └── rds/
├── deployment/              # Deployment scripts and configs
├── tests/                   # Test files
├── docs/                    # Documentation
└── docker-compose.yml       # Local development
```

## Architecture

### High-Level Components

1. **Frontend**: React app served by Node.js server
2. **Backend API**: Node.js Express server with REST endpoints
3. **GraphQL Layer**: Python Lambda with GraphQL implementation
4. **Database**: PostgreSQL RDS instance
5. **Infrastructure**: AWS VPC with ECS, Lambda, and API Gateway

### Communication Flow

```
User Browser
    ↓
API Gateway (public)
    ↓
ALB (public subnet)
    ↓
ECS Service (private subnet) - Node.js + React
    ├── Serves React UI
    ├── REST API Endpoints
    └── Invokes Lambda (private)
        ↓
Lambda (private subnet) - Python GraphQL
    └── Database Operations
```

## Configuration

### Environment Variables

Each component has an `.env.example` file. Copy and configure:

**Server** (`server/.env`):
```
NODE_ENV=development
PORT=3000
JWT_SECRET=your_secret_key
DATABASE_URL=postgresql://user:pass@localhost:5432/finance_tracker
GRAPHQL_LAMBDA_ENDPOINT=http://localhost:4000
ALLOWED_DOMAIN=http://localhost:3000
```

**Frontend** (`frontend/.env`):
```
REACT_APP_API_BASE_URL=http://localhost:3000/api
```

**Lambda** (`lambdas/graphql-service/.env`):
```
DATABASE_URL=postgresql://user:pass@postgres:5432/finance_tracker
JWT_SECRET=your_secret_key
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/logout` - Logout user

### Expenses
- `GET /api/expenses` - List all expenses
- `GET /api/expenses/:id` - Get expense details
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Investments
- `GET /api/investments` - List all investments
- `GET /api/investments/:id` - Get investment details
- `POST /api/investments` - Create investment
- `PUT /api/investments/:id` - Update investment
- `DELETE /api/investments/:id` - Delete investment

### Dashboard
- `GET /api/dashboard/summary` - Get dashboard summary
- `GET /api/dashboard/chart-data` - Get chart data

### GraphQL
- `POST /api/graphql/query` - Execute GraphQL query
- `POST /api/graphql/mutation` - Execute GraphQL mutation

## Deployment

### AWS Deployment Steps

1. **Setup VPC**:
```bash
aws cloudformation create-stack \
  --stack-name finance-tracker-vpc-prod \
  --template-body file://infrastructure/vpc/vpc.yml \
  --parameters ParameterKey=Environment,ParameterValue=production
```

2. **Setup Security Groups**:
```bash
aws cloudformation create-stack \
  --stack-name finance-tracker-sg-prod \
  --template-body file://infrastructure/vpc/security-groups.yml \
  --parameters ParameterKey=Environment,ParameterValue=production \
    ParameterKey=VPCId,ParameterValue=vpc-xxxxx
```

3. **Setup IAM Roles**:
```bash
aws cloudformation create-stack \
  --stack-name finance-tracker-iam-prod \
  --template-body file://infrastructure/lambda/iam-role.yml \
  --parameters ParameterKey=Environment,ParameterValue=production \
  --capabilities CAPABILITY_NAMED_IAM
```

4. **Build and Push Docker Images**:
```bash
# Build server image
docker build -t finance-tracker-server:latest -f server/Dockerfile .
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin xxxxx.dkr.ecr.us-east-1.amazonaws.com
docker tag finance-tracker-server:latest xxxxx.dkr.ecr.us-east-1.amazonaws.com/finance-tracker-server:latest
docker push xxxxx.dkr.ecr.us-east-1.amazonaws.com/finance-tracker-server:latest

# Build Lambda image
docker build -t finance-tracker-graphql:latest -f lambdas/graphql-service/Dockerfile ./lambdas/graphql-service
docker tag finance-tracker-graphql:latest xxxxx.dkr.ecr.us-east-1.amazonaws.com/finance-tracker-graphql:latest
docker push xxxxx.dkr.ecr.us-east-1.amazonaws.com/finance-tracker-graphql:latest
```

5. **Deploy Lambda**:
```bash
# Zip the Lambda code
cd lambdas/graphql-service
zip -r lambda-deployment.zip handler.py schema.py resolvers.py .

# Update function
aws lambda update-function-code \
  --function-name finance-tracker-graphql \
  --zip-file fileb://lambda-deployment.zip
```

## Security

### Network Security
- Services in private subnets (no direct internet access)
- ALB in public subnet routes traffic to ECS
- Security groups allow specific traffic only
- NAT Gateway for private subnet outbound traffic

### Application Security
- JWT-based authentication
- CORS restricted to specific domain
- Environment variables for secrets
- HTTPS for all communications

### Data Security
- Database in private subnet
- Connection strings and secrets in AWS Secrets Manager
- Encrypted at rest and in transit

## Testing

```bash
# Frontend tests
cd frontend
npm test

# Server tests
cd server
npm test

# Lambda tests
cd lambdas/graphql-service
pytest
```

## Monitoring

Monitor your application with:
- CloudWatch Logs for application logs
- CloudWatch Metrics for performance
- X-Ray for distributed tracing (optional)
- CloudAlarms for alerting

## Troubleshooting

### Common Issues

**Port Already in Use**:
```bash
# Find and kill process on port 3000
lsof -i :3000
kill -9 <PID>
```

**Database Connection Failed**:
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check connection string in .env
psql -U finance_user -d finance_tracker -h localhost
```

**Lambda Invocation Failed**:
```bash
# Check Lambda logs
aws logs tail /aws/lambda/finance-tracker-graphql --follow

# Check Lambda permissions
aws lambda get-policy --function-name finance-tracker-graphql
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the documentation in `/docs`
2. Review existing GitHub issues
3. Create a new issue with details

## Next Steps

1. Setup database schema
2. Implement additional Lambda functions
3. Add comprehensive testing
4. Configure CI/CD pipeline
5. Deploy to production

---

**Documentation**: See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture information.

**Last Updated**: May 2026
