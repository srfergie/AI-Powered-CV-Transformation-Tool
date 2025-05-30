# Nationality and Languages Extraction Enhancement

## Overview
This document describes the comprehensive enhancements made to improve nationality and language extraction from diverse CV formats.

## Problem Statement
- Nationality and languages were not being properly extracted from many CVs
- Information might be scattered throughout the CV rather than in a dedicated section
- Many CVs don't have explicit "Personal Details" sections
- The AI extraction alone was insufficient when the section was missing or unclear

## Solution Implemented

### 1. Pattern-Based Extraction Functions
Created two new dedicated extraction functions in `services/cvProcessor.js`:

#### `extractNationalityFromCV(fullText, segments)`
- First searches in personal_details section if available
- Falls back to searching entire CV text
- Uses multiple regex patterns to find nationality:
  - `nationality: [Country]`
  - `citizenship: [Country]`
  - `passport: [Country]`
  - `I am a [Country] citizen/national`
  - And more variations
- Filters out false positives like "dual nationality" or "multiple citizenships"

#### `extractLanguagesFromCV(fullText, segments)`
- Searches entire CV for language information
- Detects various patterns:
  - `Languages: [list]`
  - `Language skills: [list]`
  - `Fluent in: [list]`
  - `Native speaker of: [language]`
  - And many more variations
- Extracts proficiency levels (Native, Fluent, Intermediate, Basic)
- Recognizes 35+ common language names
- Handles various formats (comma-separated, structured lists, etc.)

### 2. Enhanced Personal Details Dictionary
Expanded the `personal_details` section dictionary to include:
- More variations of nationality headers
- Additional language-related headers
- General information headers that might contain this data
- Total of 40+ header variations

### 3. Improved AI Extraction
- Enhanced the personal details prompt in `prompts/extractPrompts.js`
- Made it more explicit about what to search for
- Provided specific keywords and patterns to look for
- Enhanced context passing in `services/llmService.js`
- Now combines personal_details, profile, skills, and part of qualifications sections

### 4. Integrated Fallback Logic
Updated `processCv()` function to:
- First attempt AI extraction
- If AI returns default/unknown values, use pattern-based extraction
- Ensures we capture information even when AI fails or API is unavailable

## Technical Details

### Supported Nationality Patterns
```javascript
/nationality\s*[:=]?\s*([A-Za-z\s\-]+?)(?:\n|;|,|\||$)/gi
/citizen(?:ship)?\s*[:=]?\s*([A-Za-z\s\-]+?)(?:\n|;|,|\||$)/gi
/passport\s*[:=]?\s*([A-Za-z\s\-]+?)(?:\n|;|,|\||$)/gi
// And more...
```

### Supported Language Patterns
```javascript
/languages?\s*[:=]?\s*([^\n]+)(?:\n|$)/gi
/fluent\s+in\s*[:=]?\s*([^\n]+)(?:\n|$)/gi
/mother\s+tongue\s*[:=]?\s*([^\n]+)(?:\n|$)/gi
// And more...
```

### Language Proficiency Mapping
- **Native**: native, mother tongue, first language, L1
- **Fluent**: fluent, excellent, advanced, C2, C1, proficient
- **Intermediate**: intermediate, good, working knowledge, B2, B1, conversational
- **Basic**: basic, elementary, beginner, A2, A1, limited

## Handling Edge Cases

### When Information is Not Found
- Returns "Not specified" for nationality
- Returns `[{ language: 'Not specified', proficiency: 'Not specified' }]` for languages
- This is the correct behavior when information genuinely doesn't exist in the CV

### Common CV Formats Without Explicit Info
Many professional CVs (like Brooks Joanna's) don't include:
- Explicit nationality statements
- Language proficiency sections
- Personal details sections

In these cases, the system correctly identifies that the information is not available rather than making assumptions.

## Benefits
1. **Robustness**: Works even when AI extraction fails
2. **Flexibility**: Handles diverse CV formats and structures
3. **Accuracy**: Reduces false positives with validation
4. **Completeness**: Searches entire CV, not just specific sections
5. **Fallback**: Pattern-based extraction as safety net

## Future Enhancements
1. Add more language names (currently supports 35+)
2. Detect nationality from other clues (phone codes, addresses)
3. Support more proficiency frameworks (CEFR, ACTFL, etc.)
4. Machine learning to improve pattern recognition
5. Context-aware extraction (e.g., "native French speaker") 