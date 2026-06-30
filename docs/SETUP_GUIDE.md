# Setup Guide - Finance Tracker App

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software
- **Git** (2.30+): Version control
  - macOS: `brew install git`
  - Ubuntu: `sudo apt-get install git`
  - Windows: Download from [git-scm.com](https://git-scm.com)

- **Node.js** (18 LTS): JavaScript runtime
  - macOS: `brew install node@18`
  - Ubuntu: `sudo apt-get install nodejs npm`
  - Windows: Download from [nodejs.org](https://nodejs.org)

- **Python** (3.11+): For Lambda development
  - macOS: `brew install python@3.11`
  - Ubuntu: `sudo apt-get install python3.11 python3.11-venv`
  - Windows: Download from [python.org](https://www.python.org)

- **Docker** (24+): For containerization
  - macOS: Download [Docker Desktop](https://www.docker.com/products/docker-desktop)
  - Ubuntu: `sudo apt-get install docker.io docker-compose`
  - Windows: Download [Docker Desktop](https://www.docker.com/products/docker-desktop)

- **AWS CLI** (2.0+): For AWS operations
  ```bash
  curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
  unzip awscliv2.zip
  sudo ./aws/install
  ```

### Optional Tools
- **PostgreSQL** (15+): If running database locally without Docker
- **Make**: Build automation
  - macOS: Included with Xcode Command Line Tools
  - Ubuntu: `sudo apt-get install make`
  - Windows: Use provided Makefile manually

## Local Development Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/finance-tracker-app.git
cd finance-tracker-app
```

### Step 2: Install Dependencies

```bash
# Install all dependencies
make install

# Or manually:
cd frontend && npm install && cd ..
cd server && npm install && cd ..
cd lambdas/graphql-service && pip install -r requirements.txt && cd ../../
```

### Step 3: Configure Environment Variables

Create `.env` files in each module:

**server/.env**:
```bash
cp server/.env.example server/.env
```

Edit `server/.env`:
```
NODE_ENV=development
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
SESSION_SECRET=your-session-secret
DATABASE_URL=postgresql://finance_user:finance_password@localhost:5432/finance_tracker
GRAPHQL_LAMBDA_ENDPOINT=http://localhost:4000
ALLOWED_DOMAIN=http://localhost:3000
```

**frontend/.env**:
```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:
```
REACT_APP_API_BASE_URL=http://localhost:3000/api
```

**lambdas/graphql-service/.env**:
```bash
cp lambdas/graphql-service/.env.example lambdas/graphql-service/.env
```

Edit `lambdas/graphql-service/.env`:
```
NODE_ENV=development
DATABASE_URL=postgresql://finance_user:finance_password@postgres:5432/finance_tracker
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

### Step 4: Start Development Environment

#### Option A: Using Docker Compose (Recommended)

```bash
# Build and start all services
make dev

# Or manually:
docker-compose up --build
```

This will start:
- React App (frontend): http://localhost:3000
- Node.js Server (backend): http://localhost:3000/api
- GraphQL (Lambda): http://localhost:4000
- PostgreSQL Database: localhost:5432

#### Option B: Manual Setup

**Terminal 1 - Backend Server**:
```bash
cd server
npm run dev
# Server runs on http://localhost:3000
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
# Development server with HMR on http://localhost:5173
# Proxied to backend at http://localhost:3000/api
```

**Terminal 3 - GraphQL Lambda**:
```bash
cd lambdas/graphql-service
python -m uvicorn handler:app --host 0.0.0.0 --port 4000 --reload
# GraphQL server on http://localhost:4000
```

### Step 5: Verify Setup

1. **Access the Application**:
   - Frontend: http://localhost:3000
   - Health Check: http://localhost:3000/health

2. **Test API Endpoint**:
   ```bash
   curl -X GET http://localhost:3000/health
   ```

3. **Create a Test User**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "password": "test123"}'
   ```

## Docker Setup

### Using Docker Compose

```bash
# Start services
docker-compose up

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove volumes (clear database)
docker-compose down -v
```

### Managing Services

```bash
# Access application shell
docker exec -it finance-tracker-app sh

# Access database
docker exec -it finance-tracker-db psql -U finance_user -d finance_tracker

# View application logs
docker logs -f finance-tracker-app

# Rebuild specific service
docker-compose up --build app
```

## Database Setup

### PostgreSQL Initialization

If using Docker, the database is automatically initialized. If running locally:

```bash
# Create database
createdb -U postgres finance_tracker

# Create user
createuser -U postgres finance_user
ALTER USER finance_user PASSWORD 'finance_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE finance_tracker TO finance_user;
```

### Running Migrations

Migrations will be added later. For now, the schema is created automatically on first run.

## IDE Setup

### Visual Studio Code

1. Install extensions:
   - ES Lint
   - Prettier Code Formatter
   - Thunder Client (API testing)
   - Python
   - AWS Toolkit

2. Create `.vscode/settings.json`:
```json
{
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[python]": {
    "editor.defaultFormatter": "ms-python.python"
  }
}
```

### WebStorm / IntelliJ IDEA

1. Open the project folder
2. Configure Node.js interpreter: Settings > Languages & Frameworks > Node.js
3. Install Python plugin: Settings > Plugins > Python
4. Configure Python interpreter: Settings > Project > Python Interpreter

## Testing Setup

### Frontend Tests

```bash
cd frontend
npm test
```

### Backend Tests

```bash
cd server
npm test
```

### Lambda Tests

```bash
cd lambdas/graphql-service
pip install pytest
pytest
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process (macOS/Linux)
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Docker Issues

```bash
# Clean up Docker resources
docker system prune -a

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### Database Connection Failed

```bash
# Check if database is running
docker ps | grep postgres

# Check connection string in .env
# Default: postgresql://finance_user:finance_password@localhost:5432/finance_tracker

# Test connection directly
psql -U finance_user -d finance_tracker -h localhost -W
```

### Node Modules Issues

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# For frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
cd ..
```

### Python Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate (macOS/Linux)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r lambdas/graphql-service/requirements.txt
```

## Next Steps

1. **Read the Architecture**: See [ARCHITECTURE.md](../ARCHITECTURE.md)
2. **API Documentation**: See [API_ENDPOINTS.md](API_ENDPOINTS.md)
3. **Start Developing**: Begin creating features in the frontend
4. **Database Design**: Plan and implement data models
5. **AWS Deployment**: Setup AWS infrastructure for production

## Common Commands

```bash
# Development
make dev                 # Start development environment

# Building
make build-frontend     # Build React app
make build-all          # Build all Docker images

# Deployment
make push-images        # Push images to ECR
make deploy-aws         # Deploy to AWS

# Utilities
make test              # Run all tests
make clean             # Clean build files
make logs-server       # View server logs
```

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Commit with clear messages: `git commit -m "Add feature description"`
4. Push to GitHub: `git push origin feature/your-feature`
5. Create Pull Request

## Getting Help

- **Documentation**: Check `/docs` folder
- **Issues**: Search existing GitHub issues
- **Forum**: Check project discussions
- **Contact**: Email the development team

---

**Last Updated**: May 2026
**Version**: 1.0
