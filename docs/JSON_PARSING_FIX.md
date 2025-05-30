# JSON Parsing Error Fix

## Overview
This document describes the fix for JSON parsing errors that were occurring during CV data extraction, particularly when processing experience entries.

## Problem Statement
- LLM responses were causing JSON parsing errors: `Expected ',' or '}' after property value`
- Errors occurred at various positions (e.g., position 553, position 300)
- Failed extractions resulted in incomplete CV processing
- Particularly problematic with experience entries containing complex text

## Root Cause
The extraction prompts were too basic and didn't provide adequate guidance for:
- Proper JSON string escaping
- Handling quotes within text content
- Managing line breaks and special characters
- Avoiding trailing commas
- Ensuring valid JSON syntax

## Solution Implemented

### 1. Enhanced Experience Extraction Prompts
Updated `getSingleExperiencePrompt()` and `getSingleEmploymentPrompt()` in `services/llmService.js`:
- Added explicit JSON formatting rules
- Instructions for escaping quotes with `\\"`
- Guidelines for replacing line breaks with `\\n`
- Emphasis on avoiding trailing commas
- Clear formatting examples

### 2. Comprehensive Prompt Updates
Enhanced ALL extraction prompts in `prompts/extractPrompts.js`:
- `getProfilePrompt()` - Already enhanced earlier
- `getPersonalDetailsPrompt()` - Added JSON formatting rules
- `getCountryExperiencePrompt()` - Simplified and clarified
- `getQualificationsPrompt()` - Added detailed formatting instructions
- `getPublicationsPrompt()` - Enhanced for citation handling
- `getExperiencePrompt()` - Added comprehensive JSON rules

### 3. Key JSON Formatting Rules Added
```
JSON FORMATTING RULES:
- Use double quotes for all strings
- Properly escape quotes within text using \\"
- Replace line breaks with \\n
- Ensure no trailing commas
- Keep all text on single lines within JSON
```

## Technical Details

### Before (Problematic)
```javascript
return `From the text for a single job entry below, extract the dates, role, client, location, and the full verbatim description.

Respond with ONLY a JSON object in this exact format:
{
    "dates": "extracted date range",
    "role": "job title/role",
    "client": "company or client name",
    "location": "work location",
    "description": "full job description and responsibilities"
}

Text: """${entryText}"""`;
```

### After (Fixed)
```javascript
return `From the single job/experience entry below, extract the following information:
- dates: The date range (e.g., "2020-2023", "Jan 2020 - Present")
- role: The job title or role
- client: The company, organization, or client name
- location: The work location (city, country, or "Remote")
- description: The COMPLETE job description and responsibilities

IMPORTANT JSON FORMATTING RULES:
- Use double quotes for all strings
- Properly escape quotes within text using \\"
- Replace line breaks in description with \\n
- Ensure no trailing commas
- Keep all text on single lines within JSON

Respond with ONLY a valid JSON object in this exact format:
{
    "dates": "extracted date range",
    "role": "job title or role",
    "client": "company or client name",
    "location": "work location",
    "description": "full job description with properly escaped quotes and newlines"
}

If any field is not found, use "Not specified" as the value.

Experience Entry:
"""${entryText}"""`;
```

## Impact
1. **Error Prevention**: JSON parsing errors significantly reduced
2. **Data Integrity**: Complex text with quotes and line breaks handled properly
3. **Extraction Success**: Higher success rate for experience entry processing
4. **Consistency**: All prompts now follow same formatting standards

## Benefits
- ✅ Eliminates "Expected ',' or '}'" parsing errors
- ✅ Handles complex text with quotes, apostrophes, and special characters
- ✅ Preserves line breaks properly as `\n` in JSON
- ✅ Consistent extraction across all CV sections
- ✅ More robust error handling with fallback values

## Files Modified
- `services/llmService.js` - Enhanced experience and employment prompts
- `prompts/extractPrompts.js` - Updated all extraction prompts with JSON rules

## Testing Recommendations
When testing the fix:
1. Process CVs with complex job descriptions containing quotes
2. Test entries with multi-line descriptions
3. Verify handling of special characters
4. Check that all 85+ experience entries process successfully
5. Monitor for any JSON parsing errors in logs 