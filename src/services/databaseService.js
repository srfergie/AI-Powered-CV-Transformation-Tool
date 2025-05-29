const sql = require('mssql');

/*
SQL DDL for creating the Resumes table:

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Resumes]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Resumes](
        [id] [int] IDENTITY(1,1) NOT NULL,
        [fileName] [varchar](255) NOT NULL,
        [extractedData] [nvarchar](max) NULL,
        [status] [varchar](50) NOT NULL DEFAULT 'processed',
        [createdAt] [datetime] NOT NULL DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] [datetime] NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY CLUSTERED 
    (
        [id] ASC
    )WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
    ) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
END
GO

-- Optional: Trigger to update 'updatedAt' timestamp on row update
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE object_id = OBJECT_ID(N'[dbo].[trg_Resumes_UpdateUpdatedAt]'))
BEGIN
    EXECUTE ('
    CREATE TRIGGER [dbo].[trg_Resumes_UpdateUpdatedAt]
    ON [dbo].[Resumes]
    AFTER UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;
        IF ((SELECT TRIGGER_NESTLEVEL()) > 1) RETURN; -- Prevent nested trigger execution

        UPDATE r
        SET updatedAt = CURRENT_TIMESTAMP
        FROM dbo.Resumes r
        INNER JOIN inserted i ON r.id = i.id;
    END
    ')
END
GO

*/

// Database Configuration
const requiredEnvVars = ['DB_USER', 'DB_PASSWORD', 'DB_SERVER', 'DB_DATABASE'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable for database connection: ${envVar}`);
  }
}

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT !== 'false', // defaults to true
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true', // defaults to false
    enableArithAbort: true, // Recommended for Azure SQL
  },
};

// Connection Pool Management
let poolPromise = null;

async function getConnectionPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(dbConfig)
      .connect()
      .then(pool => {
        console.log('Connected to MSSQL Database.');
        pool.on('error', err => {
          console.error('SQL Pool Error:', err);
          // Optionally try to re-establish the pool or handle critical error
          poolPromise = null; // Reset poolPromise so it can be re-established
        });
        return pool;
      })
      .catch(err => {
        console.error('Database Connection Failed:', err);
        poolPromise = null; // Reset on failure to allow retries
        throw err; // Re-throw to be caught by the caller
      });
  }
  return poolPromise;
}

/**
 * Stores a new resume record in the database.
 * @param {string} fileName - The name of the uploaded file.
 * @param {string} extractedDataJsonString - The stringified JSON data from OpenRouter.
 * @param {string} status - The initial status of the resume (e.g., 'processed').
 * @returns {Promise<number>} - The ID of the newly inserted resume.
 */
async function storeResume(fileName, extractedDataJsonString, status = 'processed') {
  try {
    const pool = await getConnectionPool();
    const result = await pool.request()
      .input('fileName', sql.VarChar(255), fileName)
      .input('extractedData', sql.NVarChar(sql.MAX), extractedDataJsonString)
      .input('status', sql.VarChar(50), status)
      .query(`
        INSERT INTO Resumes (fileName, extractedData, status)
        VALUES (@fileName, @extractedData, @status);
        SELECT SCOPE_IDENTITY() AS id;
      `);
    if (result.recordset && result.recordset.length > 0) {
      return result.recordset[0].id;
    }
    throw new Error('Failed to retrieve ID after insert.');
  } catch (err) {
    console.error('Error storing resume:', err);
    throw new Error(`Database error storing resume: ${err.message}`);
  }
}

/**
 * Updates an existing resume record in the database.
 * @param {number} id - The ID of the resume to update.
 * @param {string} extractedDataJsonString - The updated stringified JSON data.
 * @param {string} status - The new status of the resume.
 * @returns {Promise<object>} - The updated record or a success indicator.
 */
async function updateResume(id, extractedDataJsonString, status) {
  try {
    const pool = await getConnectionPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('extractedData', sql.NVarChar(sql.MAX), extractedDataJsonString)
      .input('status', sql.VarChar(50), status)
      .query(`
        UPDATE Resumes
        SET extractedData = @extractedData, status = @status, updatedAt = CURRENT_TIMESTAMP
        WHERE id = @id;
        SELECT * FROM Resumes WHERE id = @id;
      `); // Also updating updatedAt manually here as trigger might not be set by user

    if (result.recordset && result.recordset.length > 0) {
      const updatedRecord = result.recordset[0];
      if (updatedRecord.extractedData) {
        try {
          updatedRecord.extractedData = JSON.parse(updatedRecord.extractedData);
        } catch (parseError) {
          console.error(`Failed to parse extractedData for resume ID ${id}:`, parseError);
          // Return raw string if parsing fails, or handle as an error
          // For now, returning with raw string and logging error.
        }
      }
      return updatedRecord;
    }
    throw new Error(`Resume with ID ${id} not found or update failed.`);
  } catch (err) {
    console.error(`Error updating resume with ID ${id}:`, err);
    throw new Error(`Database error updating resume: ${err.message}`);
  }
}

/**
 * Retrieves a resume record by its ID.
 * @param {number} id - The ID of the resume to retrieve.
 * @returns {Promise<object|null>} - The resume record with parsed extractedData, or null if not found.
 */
async function getResumeById(id) {
  try {
    const pool = await getConnectionPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Resumes WHERE id = @id');

    if (result.recordset && result.recordset.length > 0) {
      const record = result.recordset[0];
      if (record.extractedData) {
        try {
          record.extractedData = JSON.parse(record.extractedData);
        } catch (parseError) {
          console.error(`Failed to parse extractedData for resume ID ${id} during retrieval:`, parseError);
          // Depending on requirements, you might throw an error here or return the record with raw string.
          // For now, returning record with raw string and logging.
        }
      }
      return record;
    }
    return null; // Not found
  } catch (err) {
    console.error(`Error retrieving resume with ID ${id}:`, err);
    throw new Error(`Database error retrieving resume: ${err.message}`);
  }
}

// Function to gracefully close the connection pool on application shutdown
async function closePool() {
  try {
    if (poolPromise) {
      const pool = await poolPromise;
      await pool.close();
      poolPromise = null;
      console.log('Database connection pool closed.');
    }
  } catch (err) {
    console.error('Error closing database connection pool:', err);
  }
}


module.exports = {
  getConnectionPool, // Exporting for potential direct use or testing
  storeResume,
  updateResume,
  getResumeById,
  closePool, // To be called on application shutdown
  dbConfig // Exporting config for visibility/testing if needed
};

// Example of how to use closePool on application shutdown (e.g., in src/index.js)
/*
process.on('SIGINT', async () => {
  console.log('Application shutting down...');
  await require('./services/databaseService').closePool();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  console.log('Application shutting down...');
  await require('./services/databaseService').closePool();
  process.exit(0);
});
*/
