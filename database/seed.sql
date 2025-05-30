-- AI-Powered CV Transformation Tool - Database Seed Script
-- Inserts sample data for testing purposes

USE ResumeDB; -- Remove this line for Azure SQL Database
GO

-- Clear existing test data (optional - uncomment if you want to reset)
-- DELETE FROM [dbo].[Resumes] WHERE fileName LIKE 'sample_%';

-- Insert sample resume data for testing
INSERT INTO [dbo].[Resumes] (fileName, extractedData, status)
VALUES 
(
    'sample_john_doe_resume.pdf',
    '{
        "personalDetails": {
            "name": "John Doe",
            "email": "john.doe@email.com",
            "phone": "(555) 123-4567",
            "linkedin": "linkedin.com/in/johndoe",
            "github": "github.com/johndoe"
        },
        "summary": "Experienced software engineer with 5+ years in full-stack development, specializing in React, Node.js, and cloud technologies.",
        "education": [
            {
                "institution": "University of Technology",
                "degree": "Bachelor of Science",
                "major": "Computer Science",
                "graduationDate": "2019-05-15",
                "gpa": "3.8"
            }
        ],
        "workExperience": [
            {
                "company": "Tech Solutions Inc.",
                "position": "Senior Software Engineer",
                "startDate": "2021-06-01",
                "endDate": "Present",
                "location": "San Francisco, CA",
                "responsibilities": [
                    "Led development of microservices architecture serving 1M+ users",
                    "Mentored junior developers and conducted code reviews",
                    "Implemented CI/CD pipelines reducing deployment time by 60%"
                ]
            },
            {
                "company": "StartupCo",
                "position": "Software Engineer",
                "startDate": "2019-07-01",
                "endDate": "2021-05-31",
                "location": "Austin, TX",
                "responsibilities": [
                    "Developed responsive web applications using React and TypeScript",
                    "Built RESTful APIs with Node.js and Express",
                    "Collaborated with cross-functional teams in Agile environment"
                ]
            }
        ],
        "projects": [
            {
                "name": "E-commerce Platform",
                "description": "Full-stack e-commerce solution with payment integration",
                "technologies": ["React", "Node.js", "PostgreSQL", "Stripe API"],
                "link": "https://github.com/johndoe/ecommerce-platform"
            }
        ],
        "skills": {
            "technical": ["JavaScript", "TypeScript", "React", "Node.js", "Python", "PostgreSQL", "MongoDB", "AWS", "Docker"],
            "soft": ["Leadership", "Communication", "Problem-solving", "Team collaboration"],
            "languages": ["English (Native)", "Spanish (Conversational)"]
        },
        "certifications": [
            {
                "name": "AWS Certified Developer",
                "issuingOrganization": "Amazon Web Services",
                "dateObtained": "2022-03-15"
            }
        ]
    }',
    'processed'
),
(
    'sample_jane_smith_resume.pdf',
    '{
        "personalDetails": {
            "name": "Jane Smith",
            "email": "jane.smith@email.com",
            "phone": "(555) 987-6543",
            "linkedin": "linkedin.com/in/janesmith",
            "github": "github.com/janesmith"
        },
        "summary": "Data scientist with expertise in machine learning and analytics, passionate about turning data into actionable insights.",
        "education": [
            {
                "institution": "Data Science Institute",
                "degree": "Master of Science",
                "major": "Data Science",
                "graduationDate": "2020-12-15",
                "gpa": "3.9"
            }
        ],
        "workExperience": [
            {
                "company": "Analytics Corp",
                "position": "Senior Data Scientist",
                "startDate": "2021-01-15",
                "endDate": "Present",
                "location": "New York, NY",
                "responsibilities": [
                    "Developed machine learning models improving prediction accuracy by 25%",
                    "Created data visualization dashboards for executive decision making",
                    "Led data science team of 4 analysts"
                ]
            }
        ],
        "projects": [
            {
                "name": "Customer Churn Prediction",
                "description": "ML model to predict customer churn with 95% accuracy",
                "technologies": ["Python", "Scikit-learn", "Pandas", "Tableau"],
                "link": "https://github.com/janesmith/churn-prediction"
            }
        ],
        "skills": {
            "technical": ["Python", "R", "SQL", "TensorFlow", "Scikit-learn", "Tableau", "Power BI"],
            "soft": ["Analytical thinking", "Communication", "Project management"],
            "languages": ["English (Native)", "French (Fluent)"]
        },
        "certifications": [
            {
                "name": "Certified Data Scientist",
                "issuingOrganization": "Data Science Council",
                "dateObtained": "2021-08-20"
            }
        ]
    }',
    'processed'
),
(
    'sample_processing_resume.pdf',
    '{}',
    'processing'
);

-- Display inserted data
SELECT 
    id,
    fileName,
    status,
    createdAt,
    CASE 
        WHEN LEN(extractedData) > 100 THEN LEFT(extractedData, 100) + '...'
        ELSE extractedData
    END AS extractedDataPreview
FROM [dbo].[Resumes]
WHERE fileName LIKE 'sample_%'
ORDER BY createdAt DESC;

PRINT 'Sample data inserted successfully!';
PRINT 'You can use these resumes for testing the application.';
GO 