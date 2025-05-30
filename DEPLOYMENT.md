# Azure Deployment Guide

## AI-Powered Resume Transformation Tool

This guide covers deploying the application to Azure using Azure Static Web Apps for the frontend and Azure Functions or Azure App Service for the backend.

## Prerequisites

- Azure Subscription with appropriate permissions
- Azure CLI installed and configured
- GitHub account (for deployment pipeline)
- OpenRouter API key
- Completed local development setup

## Architecture Overview

```
Frontend (React) → Azure Static Web Apps
Backend (Node.js) → Azure App Service or Azure Functions
Database → Azure SQL Database
File Storage → Azure Blob Storage (optional)
```

## Deployment Options

### Option 1: Azure App Service (Recommended)
- Easier to deploy and manage
- Built-in scaling and monitoring
- Direct Node.js support

### Option 2: Azure Functions
- Serverless architecture
- Pay-per-execution pricing
- Requires code modifications for Functions runtime

## Step 1: Create Azure Resources

### 1.1 Create Resource Group

```bash
# Set variables
RESOURCE_GROUP="rg-resume-tool"
LOCATION="East US"
APP_NAME="resume-transformation-tool"

# Create resource group
az group create --name $RESOURCE_GROUP --location "$LOCATION"
```

### 1.2 Create Azure SQL Database

```bash
# Create SQL Server
az sql server create \
  --name "${APP_NAME}-sql-server" \
  --resource-group $RESOURCE_GROUP \
  --location "$LOCATION" \
  --admin-user sqladmin \
  --admin-password "YourSecurePassword123!"

# Create database
az sql db create \
  --resource-group $RESOURCE_GROUP \
  --server "${APP_NAME}-sql-server" \
  --name ResumeDB \
  --service-objective Basic

# Configure firewall (allow Azure services)
az sql server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --server "${APP_NAME}-sql-server" \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 1.3 Initialize Database Schema

1. Connect to your Azure SQL Database using Azure Data Studio or SQL Server Management Studio
2. Run the scripts from `database/init.sql`
3. Optionally run `database/seed.sql` for sample data

## Step 2: Deploy Backend (Azure App Service)

### 2.1 Create App Service Plan

```bash
az appservice plan create \
  --name "${APP_NAME}-plan" \
  --resource-group $RESOURCE_GROUP \
  --location "$LOCATION" \
  --sku B1 \
  --is-linux
```

### 2.2 Create Web App

```bash
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan "${APP_NAME}-plan" \
  --name "${APP_NAME}-api" \
  --runtime "NODE|18-lts" \
  --deployment-local-git
```

### 2.3 Configure Application Settings

```bash
# Get SQL connection string
SQL_CONNECTION=$(az sql db show-connection-string \
  --server "${APP_NAME}-sql-server" \
  --name ResumeDB \
  --client ado.net \
  --output tsv)

# Update connection string with actual credentials
SQL_CONNECTION_UPDATED=$(echo $SQL_CONNECTION | sed 's/<username>/sqladmin/g' | sed 's/<password>/YourSecurePassword123!/g')

# Set application settings
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-api" \
  --settings \
    OPENROUTER_API_KEY="your_openrouter_api_key_here" \
    DB_SERVER="${APP_NAME}-sql-server.database.windows.net" \
    DB_PORT="1433" \
    DB_DATABASE="ResumeDB" \
    DB_USER="sqladmin" \
    DB_PASSWORD="YourSecurePassword123!" \
    DB_ENCRYPT="true" \
    DB_TRUST_SERVER_CERTIFICATE="false" \
    NODE_ENV="production" \
    PORT="8080" \
    WEBSITE_NODE_DEFAULT_VERSION="18.17.0"
```

### 2.4 Deploy Backend Code

#### Option A: Deploy from Local Git

```bash
# Add Azure remote
git remote add azure https://$USERNAME@${APP_NAME}-api.scm.azurewebsites.net/${APP_NAME}-api.git

# Deploy
git push azure main
```

#### Option B: Deploy via GitHub Actions

1. Fork the repository to your GitHub account
2. In Azure Portal, go to your App Service
3. Select "Deployment Center"
4. Choose "GitHub" as source
5. Authorize and select your repository
6. Configure the build pipeline

Sample GitHub Actions workflow (`.github/workflows/azure-backend.yml`):

```yaml
name: Deploy Backend to Azure App Service

on:
  push:
    branches: [ main ]
    paths: 
      - 'src/**'
      - 'package.json'
      - 'package-lock.json'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Deploy to Azure App Service
      uses: azure/webapps-deploy@v2
      with:
        app-name: 'resume-transformation-tool-api'
        publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
        package: .
```

## Step 3: Deploy Frontend (Azure Static Web Apps)

### 3.1 Create Static Web App

```bash
az staticwebapp create \
  --name "${APP_NAME}-frontend" \
  --resource-group $RESOURCE_GROUP \
  --location "$LOCATION" \
  --source "https://github.com/YOUR_USERNAME/AI-Powered-CV-Transformation-Tool" \
  --branch "main" \
  --app-location "/client" \
  --build-location "/client/build" \
  --output-location "build"
```

### 3.2 Configure Frontend Environment

Create a configuration file at `client/staticwebapp.config.json`:

```json
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"]
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/images/*.{png,jpg,gif,ico}", "/css/*"]
  },
  "mimeTypes": {
    ".json": "application/json"
  }
}
```

### 3.3 Set Environment Variables

In Azure Portal:
1. Go to your Static Web App
2. Navigate to "Configuration"
3. Add application settings:
   - `REACT_APP_API_BASE_URL`: `https://${APP_NAME}-api.azurewebsites.net`
   - `REACT_APP_MAX_FILE_SIZE_MB`: `5`
   - `REACT_APP_SUPPORTED_FILE_TYPES`: `.pdf`

## Step 4: Configure CORS

Update your backend CORS configuration for production:

```javascript
// In src/index.js
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [`https://${process.env.STATIC_WEB_APP_URL}`, `https://${APP_NAME}-frontend.azurestaticapps.net`]
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

## Step 5: Set Up Custom Domain (Optional)

### 5.1 Configure Custom Domain for Backend

```bash
# Add custom domain to App Service
az webapp config hostname add \
  --webapp-name "${APP_NAME}-api" \
  --resource-group $RESOURCE_GROUP \
  --hostname "api.yourdomain.com"

# Configure SSL certificate
az webapp config ssl upload \
  --certificate-file path/to/certificate.pfx \
  --certificate-password "certificate_password" \
  --name "${APP_NAME}-api" \
  --resource-group $RESOURCE_GROUP
```

### 5.2 Configure Custom Domain for Frontend

1. In Azure Portal, go to your Static Web App
2. Navigate to "Custom domains"
3. Add your domain and follow DNS configuration instructions

## Step 6: Monitoring and Logging

### 6.1 Enable Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --app "${APP_NAME}-insights" \
  --location "$LOCATION" \
  --resource-group $RESOURCE_GROUP

# Link to App Service
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app "${APP_NAME}-insights" \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey \
  --output tsv)

az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-api" \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY="$INSTRUMENTATION_KEY"
```

### 6.2 Configure Log Streaming

```bash
# Enable logging
az webapp log config \
  --name "${APP_NAME}-api" \
  --resource-group $RESOURCE_GROUP \
  --application-logging filesystem \
  --level information

# Stream logs
az webapp log tail \
  --name "${APP_NAME}-api" \
  --resource-group $RESOURCE_GROUP
```

## Step 7: Security Considerations

### 7.1 Environment Variables Security

- Store sensitive values in Azure Key Vault
- Use Managed Identity for authentication
- Never commit API keys to version control

### 7.2 Network Security

```bash
# Restrict App Service access to Static Web App only
az webapp config access-restriction add \
  --resource-group $RESOURCE_GROUP \
  --name "${APP_NAME}-api" \
  --rule-name "StaticWebAppOnly" \
  --action Allow \
  --priority 100 \
  --service-tag AzureCloud
```

## Step 8: Backup and Disaster Recovery

### 8.1 Database Backup

```bash
# Enable automated backups for SQL Database
az sql db ltr-policy set \
  --resource-group $RESOURCE_GROUP \
  --server "${APP_NAME}-sql-server" \
  --database ResumeDB \
  --weekly-retention P1W \
  --monthly-retention P1M \
  --yearly-retention P1Y
```

### 8.2 Application Backup

```bash
# Create backup configuration for App Service
az webapp config backup create \
  --resource-group $RESOURCE_GROUP \
  --webapp-name "${APP_NAME}-api" \
  --backup-name "daily-backup" \
  --storage-account-url "YOUR_STORAGE_ACCOUNT_URL"
```

## Step 9: Testing Deployment

1. **Health Check**: Visit `https://${APP_NAME}-api.azurewebsites.net/health`
2. **Frontend**: Visit your Static Web App URL
3. **End-to-End**: Upload a test PDF and verify processing
4. **Database**: Check that resumes are stored correctly

## Step 10: Post-Deployment Tasks

### 10.1 Set Up CI/CD Pipelines

Create GitHub Actions workflows for automated deployment:

1. Backend deployment when `/src` changes
2. Frontend deployment when `/client` changes
3. Database migrations when `/database` changes

### 10.2 Configure Monitoring Alerts

```bash
# Create alert for high error rate
az monitor metrics alert create \
  --name "High Error Rate" \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/${APP_NAME}-api" \
  --condition "avg requests/failed > 10" \
  --description "Alert when error rate is high"
```

### 10.3 Performance Optimization

- Enable Application Insights performance monitoring
- Configure CDN for static assets
- Set up auto-scaling rules
- Optimize database queries

## Troubleshooting

### Common Deployment Issues

1. **Database Connection Failures**
   - Check firewall rules
   - Verify connection string format
   - Ensure SQL Server allows Azure services

2. **CORS Errors**
   - Update CORS configuration with production URLs
   - Check Static Web App configuration

3. **File Upload Issues**
   - Verify App Service plan supports required file sizes
   - Check temporary storage limits

4. **API Key Errors**
   - Ensure OpenRouter API key is correctly set
   - Check Application Insights for detailed error logs

## Cost Optimization

- Use Basic tier for non-production environments
- Configure auto-scaling to scale down during low usage
- Use Azure Cost Management to monitor spending
- Consider Azure Functions for sporadic usage patterns

## Security Best Practices

- Use Azure Key Vault for secrets management
- Enable Azure Active Directory authentication
- Implement proper RBAC (Role-Based Access Control)
- Regular security updates and vulnerability scanning
- Use HTTPS everywhere
- Implement proper input validation and sanitization

This deployment guide provides a production-ready setup for the AI-Powered Resume Transformation Tool on Azure. 