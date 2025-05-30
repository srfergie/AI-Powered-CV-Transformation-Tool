# Local Development Setup Guide

## AI-Powered Resume Transformation Tool

This guide will help you set up the application for local development and testing.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Docker Desktop** (for local SQL Server) - [Download here](https://www.docker.com/products/docker-desktop)
- **Git** - [Download here](https://git-scm.com/)
- **OpenRouter API Key** - [Get one here](https://openrouter.ai/)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/srfergie/AI-Powered-CV-Transformation-Tool.git
cd AI-Powered-CV-Transformation-Tool
```

### 2. Set Up Environment Variables

#### Backend Environment (.env)
```bash
# Copy the template and edit with your values
cp env.template .env
```

Edit the `.env` file with your configuration:
```env
# OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Database Configuration (for local development)
DB_SERVER=localhost
DB_PORT=1433
DB_DATABASE=ResumeDB
DB_USER=sa
DB_PASSWORD=YourLocalPassword123!
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true

# Server Configuration
PORT=3001
NODE_ENV=development
```

#### Frontend Environment
```bash
cd client
cp env.template .env
```

Edit `client/.env`:
```env
REACT_APP_API_BASE_URL=http://localhost:3001
REACT_APP_MAX_FILE_SIZE_MB=5
REACT_APP_SUPPORTED_FILE_TYPES=.pdf
```

### 3. Start the Database

Using Docker (Recommended):
```bash
# From the project root directory
docker-compose up -d sqlserver
```

This will:
- Start SQL Server 2022 in a container
- Expose it on port 1433
- Create persistent storage for your data

Wait for SQL Server to start (about 30-60 seconds), then initialize the database:

```bash
# Connect to SQL Server and run initialization script
docker exec -it resume-db /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "YourLocalPassword123!" -d master -i /docker-entrypoint-initdb.d/init.sql
```

### 4. Install Dependencies and Start the Application

#### Backend
```bash
# Install backend dependencies
npm install

# Start the backend server
npm run dev
```

The backend will start on http://localhost:3001

#### Frontend (in a new terminal)
```bash
cd client
npm install
npm start
```

The frontend will start on http://localhost:3000

### 5. Test the Application

1. Open your browser to http://localhost:3000
2. Upload a PDF resume or load a sample resume
3. Verify the AI processing works with your OpenRouter API key
4. Test the editing functionality

## Alternative Database Setup

### Using Local SQL Server Installation

If you prefer to use a local SQL Server installation instead of Docker:

1. Install SQL Server Express or Developer Edition
2. Create a database named `ResumeDB`
3. Run the initialization script from `database/init.sql`
4. Update your `.env` file with the correct connection details

### Using Azure SQL Database

For testing with Azure SQL Database:

1. Create an Azure SQL Database
2. Update your `.env` file:
```env
DB_SERVER=your-server.database.windows.net
DB_DATABASE=ResumeDB
DB_USER=your_username
DB_PASSWORD=your_password
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false
```

## Troubleshooting

### Common Issues

#### 1. "Cannot connect to database"
- Ensure SQL Server is running: `docker ps`
- Check connection string in `.env` file
- Verify firewall settings allow connection to port 1433

#### 2. "OpenRouter API key is missing"
- Verify `OPENROUTER_API_KEY` is set in your `.env` file
- Ensure the API key is valid and has credits

#### 3. "File upload fails"
- Check file size (must be under 5MB)
- Ensure file is a valid PDF
- Verify the uploads directory exists and is writable

#### 4. "CORS errors"
- Ensure both frontend (port 3000) and backend (port 3001) are running
- Check that CORS is properly configured in `src/index.js`

### Useful Commands

```bash
# Check if SQL Server is running
docker ps

# View SQL Server logs
docker logs resume-db

# Stop all services
docker-compose down

# Restart SQL Server
docker-compose restart sqlserver

# Access database admin interface (optional)
# Go to http://localhost:8080 after running:
docker-compose up -d adminer
```

### Database Management

#### Access Database via Adminer (Web Interface)
```bash
docker-compose up -d adminer
```
Then go to http://localhost:8080 and use:
- System: MS SQL
- Server: sqlserver
- Username: sa
- Password: YourLocalPassword123!
- Database: ResumeDB

#### Manual Database Operations
```bash
# Connect to SQL Server container
docker exec -it resume-db /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "YourLocalPassword123!"

# Run initialization script
docker exec -it resume-db /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "YourLocalPassword123!" -d ResumeDB -i /docker-entrypoint-initdb.d/init.sql

# Insert sample data
docker exec -it resume-db /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "YourLocalPassword123!" -d ResumeDB -i /docker-entrypoint-initdb.d/seed.sql
```

## Development Workflow

1. Make changes to your code
2. The backend server will automatically restart (using nodemon)
3. The frontend will automatically reload in the browser
4. Test your changes
5. Use sample resumes or upload test PDFs

## Next Steps

Once you have the application running locally:

1. Test the complete workflow (upload → process → edit → save)
2. Verify error handling scenarios
3. Check API endpoints using tools like Postman
4. Review the processed resume data structure
5. Test with different types of PDF resumes

For deployment to Azure, see `DEPLOYMENT.md`. 