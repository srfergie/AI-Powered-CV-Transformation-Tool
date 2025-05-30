const { exec } = require('child_process');
const path = require('path');

// Configuration
const COMMIT_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds
const BACKUP_BRANCH = 'auto-backup';
const MAIN_BRANCH = 'main';

// Helper function to execute shell commands
function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing command: ${error}`);
                reject(error);
                return;
            }
            resolve(stdout.trim());
        });
    });
}

// Function to check if there are changes to commit
async function hasChanges() {
    try {
        const status = await executeCommand('git status --porcelain');
        return status.length > 0;
    } catch (error) {
        console.error('Error checking git status:', error);
        return false;
    }
}

// Function to perform the auto-commit
async function performAutoCommit() {
    try {
        // Check if there are changes
        const changes = await hasChanges();
        if (!changes) {
            console.log('No changes to commit');
            return;
        }

        // Get current timestamp for commit message
        const timestamp = new Date().toISOString();

        // Add all changes
        await executeCommand('git add .');

        // Create commit with timestamp
        const commitMessage = `Auto-commit: Changes at ${timestamp}`;
        await executeCommand(`git commit -m "${commitMessage}"`);

        console.log(`Created commit: ${commitMessage}`);

        // Try to push to remote if configured
        try {
            await executeCommand(`git push origin ${MAIN_BRANCH}`);
            console.log('Successfully pushed to remote');
        } catch (error) {
            console.error('Failed to push to remote:', error);
        }

    } catch (error) {
        console.error('Error in auto-commit process:', error);
    }
}

// Function to ensure we're on the right branch
async function ensureCorrectBranch() {
    try {
        // Get current branch
        const currentBranch = await executeCommand('git rev-parse --abbrev-ref HEAD');

        if (currentBranch !== MAIN_BRANCH) {
            console.log(`Switching to ${MAIN_BRANCH} branch...`);
            await executeCommand(`git checkout ${MAIN_BRANCH}`);
        }
    } catch (error) {
        console.error('Error ensuring correct branch:', error);
    }
}

// Main function to start the auto-commit process
async function startAutoCommit() {
    console.log('Starting auto-commit process...');
    console.log(`Commit interval: ${COMMIT_INTERVAL / 1000 / 60} minutes`);

    // Initial commit
    await ensureCorrectBranch();
    await performAutoCommit();

    // Set up interval for periodic commits
    setInterval(async () => {
        await ensureCorrectBranch();
        await performAutoCommit();
    }, COMMIT_INTERVAL);
}

// Start the process
startAutoCommit().catch(error => {
    console.error('Error starting auto-commit process:', error);
}); 