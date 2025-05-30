# Output Folder Management

## Overview

The CV transformation system generates DOCX files that are stored in the `/output/` directory. Without proper management, this folder can grow indefinitely and consume significant disk space. This document explains the automated cleanup system implemented to prevent this issue.

## ⚠️ **The Problem**

- Every CV transformation creates a new `.docx` file with unique timestamp ID
- Files are stored permanently in `/output/` directory  
- No automatic cleanup = **unlimited disk space consumption**
- 19 files currently = ~200KB (small now, but grows over time)

## ✅ **The Solution: Multi-Layer Cleanup System**

### **1. Automatic Periodic Cleanup**
- ✅ **Runs every hour** by default
- ✅ **Configurable interval** (see config file)
- ✅ **Removes files older than 7 days**
- ✅ **Keeps maximum 50 most recent files**
- ✅ **Runs on server startup**

### **2. Manual Admin Cleanup**
- ✅ **Endpoint**: `POST /api/admin/cleanup`
- ✅ **Trigger cleanup on demand**
- ✅ **Perfect for maintenance**

### **3. Monitoring & Status**
- ✅ **Endpoint**: `GET /api/admin/output-status`
- ✅ **Shows file count, total size, oldest/newest files**
- ✅ **Monitor folder health**

### **4. Optional: Immediate Cleanup After Download**
- ⚠️ **Disabled by default** (allows re-download)
- ✅ **Configurable** via `deleteAfterDownload: true`
- ✅ **5-second delay** to ensure download completes

## 🔧 **Configuration**

All cleanup behavior is controlled by `/config/cleanup.config.js`:

```javascript
module.exports = {
    cleanupInterval: 60 * 60 * 1000,  // 1 hour
    maxAgeDays: 7,                    // 7 days
    maxFiles: 50,                     // 50 files max
    cleanupOnStartup: true,           // Clean on startup
    enablePeriodicCleanup: true,      // Auto cleanup
    deleteAfterDownload: false,       // Keep files after download
    deleteDelay: 5000,               // 5 sec delay if enabled
    enableLogging: true              // Log operations
};
```

### **Customization Examples:**

**More Aggressive Cleanup:**
```javascript
maxAgeDays: 1,        // 1 day instead of 7
maxFiles: 10,         // 10 files instead of 50
deleteAfterDownload: true  // Delete immediately after download
```

**Conservative (Production):**
```javascript
maxAgeDays: 30,       // 30 days
maxFiles: 200,        // 200 files
cleanupInterval: 6 * 60 * 60 * 1000  // Every 6 hours
```

**Development (Frequent Cleanup):**
```javascript
maxAgeDays: 0.5,      // 12 hours
maxFiles: 5,          // 5 files only
cleanupInterval: 5 * 60 * 1000       // Every 5 minutes
```

## 📊 **Monitoring Commands**

### **Check Current Status:**
```bash
curl http://localhost:5000/api/admin/output-status
```
**Response:**
```json
{
  "fileCount": 19,
  "totalSizeMB": "0.20",
  "oldestFile": {"name": "CV_1748607179369.docx", "created": "2025-01-31T..."},
  "newestFile": {"name": "CV_1748617543465.docx", "created": "2025-01-31T..."}
}
```

### **Manual Cleanup:**
```bash
curl -X POST http://localhost:5000/api/admin/cleanup
```

### **Command Line Cleanup:**
```bash
node scripts/cleanup-output.js
```

## 🗂️ **File Naming Convention**

Generated files follow the pattern: `CV_{timestamp}.docx`
- `CV_1748617543465.docx` = Generated at timestamp 1748617543465
- Timestamp = `Date.now()` when file was created
- Allows chronological sorting and unique identification

## 📈 **Space Usage Estimation**

**Current Pattern:**
- Average file size: **9-18KB per CV**
- 19 files = **200KB total**

**Growth Projections:**
- 100 CVs/day × 15KB avg = **1.5MB/day**
- Monthly = **45MB**
- Yearly = **540MB**

**With 7-day cleanup:**
- Maximum = **10.5MB** (7 days × 1.5MB)
- Very manageable disk usage

## ⚡ **Performance Impact**

- **Minimal**: Cleanup runs in background
- **File operations**: Simple delete operations
- **Memory usage**: Temporary file listing only
- **No impact** on CV processing performance

## 🚨 **Emergency Procedures**

### **If Disk Space Critical:**
```bash
# Immediate aggressive cleanup (manual)
cd /path/to/app
node -e "
const fs = require('fs');
const path = require('path');
const outputDir = './output';
const files = fs.readdirSync(outputDir).filter(f => f.startsWith('CV_'));
files.forEach(f => fs.unlinkSync(path.join(outputDir, f)));
console.log(\`Deleted \${files.length} files\`);
"
```

### **Disable All Cleanup (Emergency):**
Edit `config/cleanup.config.js`:
```javascript
enablePeriodicCleanup: false,
cleanupOnStartup: false,
deleteAfterDownload: false
```

## 📝 **Logs & Troubleshooting**

**Successful Cleanup Log:**
```
🧹 Running periodic output directory cleanup...
📊 Found 25 CV files in output directory
🗑️ Deleted old file: CV_1748500000000.docx (8 days old)
✅ Cleanup complete:
   📁 Files deleted: 3
   💾 Space freed: 0.05 MB
   📄 Files remaining: 22
```

**Common Issues:**
- File permission errors → Check file/folder permissions
- Config errors → Validate `cleanup.config.js` syntax
- Network issues → Check if server is running

## 🎯 **Recommendations**

### **For Development:**
- Keep default settings (7 days, 50 files)
- Enable logging for visibility
- Monitor with admin endpoints

### **For Production:**
- Increase retention (14-30 days)
- Higher file limits (100-200 files)  
- Consider backup before deletion
- Set up monitoring alerts

### **For High-Volume Sites:**
- Enable `deleteAfterDownload: true`
- Shorter retention (1-3 days)
- More frequent cleanup (30 minutes)
- Database tracking of downloads

## ✨ **Future Enhancements**

Potential improvements:
- Database integration for download tracking
- Cloud storage integration (AWS S3, etc.)
- Compression of old files before deletion
- Email notifications for cleanup operations
- Web dashboard for monitoring
- Backup creation before deletion 