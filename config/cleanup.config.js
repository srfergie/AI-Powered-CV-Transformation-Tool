/**
 * Configuration for automatic cleanup of generated CV files
 */

module.exports = {
    // How often to run automatic cleanup (in milliseconds)
    // Default: 1 hour (60 * 60 * 1000)
    cleanupInterval: 60 * 60 * 1000, // 1 hour

    // Maximum age of files before deletion (in days)
    // Default: 7 days
    maxAgeDays: 7,

    // Maximum number of files to keep (regardless of age)
    // Default: 50 files
    maxFiles: 50,

    // Whether to run cleanup on server startup
    // Default: true
    cleanupOnStartup: true,

    // Whether to enable periodic cleanup
    // Default: true
    enablePeriodicCleanup: true,

    // Whether to delete files immediately after download
    // Default: false (keeps files for potential re-download)
    deleteAfterDownload: false,

    // Delay before deleting file after download (in milliseconds)
    // Only applies if deleteAfterDownload is true
    deleteDelay: 5000, // 5 seconds

    // Log cleanup operations
    // Default: true
    enableLogging: true
}; 