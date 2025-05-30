#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🚀 AI Resume Transformation Tool - Quick Start');
console.log('=============================================\n');

// Check for environment files
const rootEnvPath = path.join(__dirname, '.env');
const clientEnvPath = path.join(__dirname, 'client', '.env');

// Create root .env if it doesn't exist
if (!fs.existsSync(rootEnvPath)) {
    console.log('📄 Creating .env file for backend...');
    const envContent = `# OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_API_URL=https://openrouter.ai/api/v1/chat/completions

# Database Configuration (Local SQL Server)
DB_SERVER=localhost
DB_PORT=1433
DB_DATABASE=ResumeDB
DB_USER=sa
DB_PASSWORD=YourPassword123!
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true

# Server Configuration
PORT=5000
NODE_ENV=development`;

    fs.writeFileSync(rootEnvPath, envContent);
    console.log('✅ Created .env file');
}

// Create client .env if it doesn't exist
if (!fs.existsSync(clientEnvPath)) {
    console.log('📄 Creating client/.env file for frontend...');
    const clientEnvContent = 'REACT_APP_API_URL=http://localhost:5000';

    fs.writeFileSync(clientEnvPath, clientEnvContent);
    console.log('✅ Created client/.env file');
}

console.log('\n📋 Setup Instructions:');
console.log('1. Install SQL Server Express or use Docker');
console.log('2. Update the DB_PASSWORD in .env file');
console.log('3. Get an OpenRouter API key from https://openrouter.ai/');
console.log('4. Update OPENROUTER_API_KEY in .env file');
console.log('5. Create the database using the SQL script below:\n');

console.log('SQL Script to run in SQL Server:');
console.log('================================');
console.log(`CREATE DATABASE ResumeDB;
GO

USE ResumeDB;
GO

CREATE TABLE Resumes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    fileName NVARCHAR(255) NOT NULL,
    extractedData NVARCHAR(MAX),
    status NVARCHAR(50) DEFAULT 'processing',
    createdAt DATETIME2 DEFAULT GETUTCDATE(),
    updatedAt DATETIME2 DEFAULT GETUTCDATE()
);
GO

CREATE INDEX IX_Resumes_Status ON Resumes(status);
CREATE INDEX IX_Resumes_CreatedAt ON Resumes(createdAt);
CREATE INDEX IX_Resumes_FileName ON Resumes(fileName);
GO

-- Insert sample data
INSERT INTO Resumes (fileName, extractedData, status) VALUES 
('John_Doe_Resume.pdf', '{"personalDetails":{"name":"John Doe","email":"john.doe@email.com","phone":"(555) 123-4567"},"summary":"Experienced software engineer with 5+ years of experience","workExperience":[{"position":"Senior Software Engineer","company":"Tech Corp","startDate":"2020","endDate":"Present","responsibilities":["Led development of web applications","Mentored junior developers"]}],"education":[{"degree":"Bachelor of Science","major":"Computer Science","institution":"University of Technology","graduationDate":"2018"}],"skills":{"technical":["JavaScript","React","Node.js","SQL"],"soft":["Leadership","Communication"]}}', 'processed'),
('Jane_Smith_Resume.pdf', '{"personalDetails":{"name":"Jane Smith","email":"jane.smith@email.com","phone":"(555) 987-6543"},"summary":"Data scientist with expertise in machine learning","workExperience":[{"position":"Data Scientist","company":"Analytics Inc","startDate":"2019","endDate":"Present","responsibilities":["Built predictive models","Analyzed large datasets"]}],"education":[{"degree":"Master of Science","major":"Data Science","institution":"State University","graduationDate":"2019"}],"skills":{"technical":["Python","R","SQL","Machine Learning"],"soft":["Problem Solving","Research"]}}', 'processed');
GO`);

console.log('\n🔧 To start the application:');
console.log('1. Backend: npm run dev');
console.log('2. Frontend (new terminal): cd client && npm start');
console.log('3. Open http://localhost:3000 in your browser\n');

console.log('📝 Environment files created successfully!');
console.log('✏️  Please edit the .env files with your actual configuration.');

// Ask if user wants to start the backend
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('\n🚀 Start the backend server now? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log('\n🔄 Starting backend server...');
        const backend = spawn('npm', ['run', 'dev'], {
            stdio: 'inherit',
            shell: true
        });

        console.log('\n💡 To start the frontend, open a new terminal and run:');
        console.log('   cd client && npm start');
    } else {
        console.log('\n📖 Manual start instructions:');
        console.log('   Backend: npm run dev');
        console.log('   Frontend: cd client && npm start');
    }

    rl.close();
}); 