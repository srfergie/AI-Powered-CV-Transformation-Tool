-- AI-Powered CV Transformation Tool - Database Initialization Script
-- Compatible with both SQL Server and Azure SQL Database

-- Create database (only needed for local SQL Server, skip for Azure SQL)
-- Uncomment for local development:
-- CREATE DATABASE ResumeDB;
-- GO
-- USE ResumeDB;
-- GO

-- Create Resumes table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Resumes]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Resumes] (
        [id] [int] IDENTITY(1,1) NOT NULL,
        [fileName] [nvarchar](255) NOT NULL,
        [extractedData] [nvarchar](max) NULL,
        [status] [nvarchar](50) NOT NULL DEFAULT 'processed',
        [createdAt] [datetime2](7) NOT NULL DEFAULT GETUTCDATE(),
        [updatedAt] [datetime2](7) NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_Resumes] PRIMARY KEY CLUSTERED ([id] ASC)
    ) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY];
    
    PRINT 'Resumes table created successfully.';
END
ELSE
BEGIN
    PRINT 'Resumes table already exists.';
END
GO

-- Create index on status for better query performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[Resumes]') AND name = N'IX_Resumes_Status')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Resumes_Status] ON [dbo].[Resumes] ([status] ASC);
    PRINT 'Index on status column created successfully.';
END
ELSE
BEGIN
    PRINT 'Index on status column already exists.';
END
GO

-- Create index on createdAt for better date-based queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[Resumes]') AND name = N'IX_Resumes_CreatedAt')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Resumes_CreatedAt] ON [dbo].[Resumes] ([createdAt] DESC);
    PRINT 'Index on createdAt column created successfully.';
END
ELSE
BEGIN
    PRINT 'Index on createdAt column already exists.';
END
GO

-- Create trigger to automatically update 'updatedAt' timestamp
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE object_id = OBJECT_ID(N'[dbo].[trg_Resumes_UpdateUpdatedAt]'))
BEGIN
    EXEC('
    CREATE TRIGGER [dbo].[trg_Resumes_UpdateUpdatedAt]
    ON [dbo].[Resumes]
    AFTER UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;
        
        -- Prevent recursive trigger calls
        IF (SELECT TRIGGER_NESTLEVEL()) > 1 
            RETURN;
        
        -- Update the updatedAt timestamp for modified rows
        UPDATE r
        SET updatedAt = GETUTCDATE()
        FROM [dbo].[Resumes] r
        INNER JOIN inserted i ON r.id = i.id
        WHERE r.updatedAt = i.updatedAt; -- Only update if updatedAt hasn''t been manually set
    END
    ');
    PRINT 'UpdatedAt trigger created successfully.';
END
ELSE
BEGIN
    PRINT 'UpdatedAt trigger already exists.';
END
GO

-- Create a view for easier data access (optional but useful)
IF NOT EXISTS (SELECT * FROM sys.views WHERE object_id = OBJECT_ID(N'[dbo].[vw_ResumesSummary]'))
BEGIN
    EXEC('
    CREATE VIEW [dbo].[vw_ResumesSummary]
    AS
    SELECT 
        id,
        fileName,
        status,
        createdAt,
        updatedAt,
        CASE 
            WHEN extractedData IS NULL THEN 0
            ELSE 1
        END AS hasExtractedData,
        LEN(extractedData) AS dataSize
    FROM [dbo].[Resumes]
    ');
    PRINT 'ResumesSummary view created successfully.';
END
ELSE
BEGIN
    PRINT 'ResumesSummary view already exists.';
END
GO

-- Display table information
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Resumes'
ORDER BY ORDINAL_POSITION;

PRINT 'Database initialization completed successfully!';
PRINT 'You can now start the application.';
GO 