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

                    // Check and add extracted_text column for chat functionality
                    db.all("PRAGMA table_info(Resumes)", (err, columns) => {
                        if (err) {
                            console.error('Error checking table structure:', err);
                        } else {
                            const hasExtractedText = columns.some(col => col.name === 'extractedText');
                            if (!hasExtractedText) {
                                db.run('ALTER TABLE Resumes ADD COLUMN extractedText TEXT', (err) => {
                                    if (err) {
                                        console.error('Error adding extractedText column:', err);
                                    } else {
                                        console.log('✅ Added extractedText column for chat functionality');
                                    }
                                });
                            } else {
                                console.log('ℹ️ extractedText column already exists');
                            }
                        }
                    });

                    // Create indexes
                    db.run('CREATE INDEX IF NOT EXISTS idx_status ON Resumes(status)');
                    db.run('CREATE INDEX IF NOT EXISTS idx_created ON Resumes(createdAt)');
                    db.run('CREATE INDEX IF NOT EXISTS idx_filename ON Resumes(fileName)');

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
 * @param {string} extractedText - Original extracted text for chat functionality
 * @returns {Promise<number>} - Resume ID
 */
async function storeResumeData(fileName, extractedData, status = 'processed', extractedText = null) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const sql = `
      INSERT INTO Resumes (fileName, extractedData, status, extractedText, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

        const extractedDataJson = JSON.stringify(extractedData);

        db.run(sql, [fileName, extractedDataJson, status, extractedText], function (err) {
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
 * Get all resumes with pagination and filtering
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Number of items per page
 * @param {string} status - Filter by status (optional)
 * @param {string} search - Search in filename (optional)
 * @returns {Promise<Object>} - Paginated results
 */
async function getAllResumes(page = 1, limit = 10, status = null, search = null) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        let whereClause = '';
        let params = [];
        let conditions = [];

        if (status) {
            conditions.push('status = ?');
            params.push(status);
        }

        if (search) {
            conditions.push('fileName LIKE ?');
            params.push(`%${search}%`);
        }

        if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }

        // Get total count
        const countSQL = `SELECT COUNT(*) as total FROM Resumes ${whereClause}`;

        db.get(countSQL, params, (err, countResult) => {
            if (err) {
                reject(err);
                return;
            }

            const total = countResult.total;
            const totalPages = Math.ceil(total / limit);
            const offset = (page - 1) * limit;

            // Get paginated data
            const dataSQL = `
        SELECT id, fileName, status, createdAt, updatedAt
        FROM Resumes 
        ${whereClause}
        ORDER BY createdAt DESC
        LIMIT ? OFFSET ?
      `;

            db.all(dataSQL, [...params, limit, offset], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        data: rows,
                        pagination: {
                            currentPage: page,
                            totalPages,
                            totalItems: total,
                            hasNextPage: page < totalPages,
                            hasPreviousPage: page > 1,
                            itemsPerPage: limit
                        }
                    });
                }
            });
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
                // Parse the extractedData JSON
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
 * @param {string} newStatus - New status (optional)
 * @returns {Promise<Object>} - Updated resume
 */
async function updateResumeData(resumeId, editedData, newStatus = null) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        let sql = 'UPDATE Resumes SET extractedData = ?, updatedAt = CURRENT_TIMESTAMP';
        let params = [JSON.stringify(editedData)];

        if (newStatus) {
            sql += ', status = ?';
            params.push(newStatus);
        }

        sql += ' WHERE id = ?';
        params.push(resumeId);

        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
            } else if (this.changes === 0) {
                resolve(null); // No rows updated
            } else {
                // Return the updated resume
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

/**
 * Close database connection
 */
async function closeDatabase() {
    return new Promise((resolve) => {
        if (db) {
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed');
                }
                resolve();
            });
        } else {
            resolve();
        }
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
    deleteResume,
    closeDatabase
}; 