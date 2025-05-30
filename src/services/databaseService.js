const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const DB_PATH = path.join(__dirname, '../../database/resumes.db');

let db = null;

/**
 * Initialize SQLite database and create tables
 */
async function initDatabase() {
  return new Promise((resolve, reject) => {
    // Ensure database directory exists
    const fs = require('fs');
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }

      console.log('Connected to SQLite database:', DB_PATH);

      // Create table if it doesn't exist
      const createTableSQL = `
                CREATE TABLE IF NOT EXISTS Resumes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fileName TEXT NOT NULL,
                    extractedData TEXT,
                    status TEXT DEFAULT 'processing',
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

      db.run(createTableSQL, (err) => {
        if (err) {
          console.error('Error creating table:', err);
          reject(err);
        } else {
          console.log('Resumes table ready');
          resolve();
        }
      });
    });
  });
}

/**
 * Store resume data in the database
 * @param {string} fileName - Original filename
 * @param {Object} extractedData - Processed resume data
 * @param {string} status - Processing status
 * @returns {Promise<number>} - Resume ID
 */
async function storeResumeData(fileName, extractedData, status = 'processed') {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const sql = `
            INSERT INTO Resumes (fileName, extractedData, status, createdAt, updatedAt)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;

    const extractedDataJson = JSON.stringify(extractedData);

    db.run(sql, [fileName, extractedDataJson, status], function (err) {
      if (err) {
        console.error('Error storing resume data:', err);
        reject(err);
      } else {
        console.log(`Resume stored with ID: ${this.lastID}`);
        resolve(this.lastID);
      }
    });
  });
}

/**
 * Get all resumes
 * @returns {Promise<Array>} - Array of resumes
 */
async function getAllResumes() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const sql = 'SELECT * FROM Resumes ORDER BY createdAt DESC';

    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * Get resume by ID
 * @param {number} resumeId - Resume ID
 * @returns {Promise<Object>} - Resume data
 */
async function getResumeById(resumeId) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const sql = 'SELECT * FROM Resumes WHERE id = ?';

    db.get(sql, [resumeId], (err, row) => {
      if (err) {
        reject(err);
      } else if (!row) {
        resolve(null);
      } else {
        try {
          row.extractedData = JSON.parse(row.extractedData);
        } catch (parseErr) {
          console.error('Error parsing extractedData:', parseErr);
        }
        resolve(row);
      }
    });
  });
}

/**
 * Update resume data
 * @param {number} resumeId - Resume ID
 * @param {Object} editedData - Updated resume data
 * @param {string} newStatus - New status
 * @returns {Promise<Object>} - Updated resume data
 */
async function updateResumeData(resumeId, editedData, newStatus = null) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const updates = [];
    const params = [];

    if (editedData) {
      updates.push('extractedData = ?');
      params.push(JSON.stringify(editedData));
    }

    if (newStatus) {
      updates.push('status = ?');
      params.push(newStatus);
    }

    updates.push('updatedAt = CURRENT_TIMESTAMP');
    params.push(resumeId);

    const sql = `
            UPDATE Resumes 
            SET ${updates.join(', ')}
            WHERE id = ?
        `;

    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        getResumeById(resumeId).then(resolve).catch(reject);
      }
    });
  });
}

/**
 * Delete resume by ID
 * @param {number} resumeId - Resume ID
 * @returns {Promise<boolean>} - Success status
 */
async function deleteResume(resumeId) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const sql = 'DELETE FROM Resumes WHERE id = ?';

    db.run(sql, [resumeId], function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.changes > 0);
      }
    });
  });
}

// Initialize database on module load
initDatabase().catch(console.error);

module.exports = {
  initDatabase,
  storeResumeData,
  getAllResumes,
  getResumeById,
  updateResumeData,
  deleteResume
};
