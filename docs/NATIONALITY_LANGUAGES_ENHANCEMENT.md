# Nationality and Languages Extraction Enhancement

## Overview
This document describes the comprehensive enhancements made to improve nationality and language extraction from diverse CV formats.

## Problem Statement
- Nationality and languages were not being properly extracted from many CVs
- Information might be scattered throughout the CV rather than in a dedicated section
- Many CVs don't have explicit "Personal Details" sections
- The AI extraction alone was insufficient when the section was missing or unclear
- **UPDATE**: Initial implementation was too permissive and extracted random words as languages

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

#### `extractLanguagesFromCV(fullText, segments)` - **ENHANCED**
- **STRICT VALIDATION**: Only accepts words from predefined list of 70+ language names
- **PRECISE PATTERNS**: Uses targeted regex patterns for language sections only
- **FALSE POSITIVE PREVENTION**: Filters out non-language words automatically
- Searches entire CV for language information
- Detects various patterns:
  - `Languages: [list]`
  - `Language skills: [list]`
  - `Fluent in: [list]`
  - `Native speaker of: [language]`
  - And many more variations
- Extracts proficiency levels (Native, Fluent, Intermediate, Basic)
- Recognizes 70+ language names including African, European, Asian languages
- Handles various formats (comma-separated, structured lists, etc.)

### 2. Enhanced Validation System
- **Language Whitelist**: Only words in the predefined language list are accepted
- **Context Filtering**: Excludes common non-language words like "and", "or", "including"
- **Structured Parsing**: Handles "English (Fluent)" format correctly
- **Case-Insensitive Matching**: Works regardless of capitalization

### 3. Enhanced Personal Details Dictionary
Expanded the `personal_details` section dictionary to include:
- More variations of nationality headers
- Additional language-related headers
- General information headers that might contain this data
- Total of 40+ header variations

### 4. Improved AI Extraction
- Enhanced the personal details prompt in `prompts/extractPrompts.js`
- Made it more explicit about what to search for
- Provided specific keywords and patterns to look for
- Enhanced context passing in `services/llmService.js`
- Now combines personal_details, profile, skills, and part of qualifications sections

### 5. Integrated Fallback Logic
Updated `processCv()` function to:
- First attempt AI extraction
- If AI returns default/unknown values, use pattern-based extraction
- Ensures we capture information even when AI fails or API is unavailable

## Technical Details

### Supported Language Names (70+)
**European**: English, French, Spanish, German, Italian, Portuguese, Russian, Polish, Dutch, Swedish, Norwegian, Danish, Finnish, Greek, Czech, Slovak, Hungarian, Romanian, Bulgarian, Croatian, Serbian, Bosnian, Slovenian, Albanian, Lithuanian, Latvian, Estonian, Ukrainian, Belarusian, Macedonian

**Asian**: Chinese, Mandarin, Cantonese, Japanese, Korean, Hindi, Bengali, Urdu, Turkish, Thai, Vietnamese, Indonesian, Malay, Tagalog

**African**: Swahili, Yoruba, Zulu, Amharic, Hausa, Luganda, Luo, Kikuyu, Kinyarwanda, Kirundi, Somali, Oromo, Tigrinya, Wolof, Fulani, Igbo, Akan, Ewe, Fon, Bambara

**Middle Eastern**: Arabic, Hebrew, Farsi, Persian, Pashto, Dari, Kurdish, Azerbaijani, Georgian, Armenian

**Central Asian**: Kazakh, Uzbek, Kyrgyz, Tajik, Turkmen, Mongolian

### Improved Language Patterns
```javascript
// Only look for explicit language sections
/(?:languages?|linguistic\s+skills?|language\s+skills?)\s*[:=]\s*([^\n.;]+)/gi
/(?:fluent\s+in|proficient\s+in|speaks?)\s*[:=]?\s*([^\n.;]+)/gi
/(?:native\s+language|mother\s+tongue)\s*[:=]\s*([^\n.;]+)/gi
// Structured format: "English (Fluent)"
/([A-Za-z]+)\s*\(([^)]+)\)/g
```

### Language Proficiency Mapping
- **Native**: native, mother tongue, first language, L1, maternal
- **Fluent**: fluent, excellent, advanced, C2, C1, proficient, expert  
- **Intermediate**: intermediate, good, working knowledge, B2, B1, conversational, competent
- **Basic**: basic, elementary, beginner, A2, A1, limited, beginner level

## Handling Edge Cases

### False Positive Prevention
The enhanced system now correctly filters out:
- Country names (Kenya, Malawi, etc.)
- Month names (January, February, etc.)  
- Common words (International, Management, etc.)
- Person names (Ernst, Elizabeth, etc.)
- Action words (managing, monitoring, etc.)

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

## Before vs After Fix

### Before (Problematic Output):
```
English (Fluent), Luo (Native), Swahili (Basic), Luganda (Basic), Kenya (Not specified), Malawi (Not specified), South (Not specified), International (Not specified), Ernst (Not specified), September (Not specified), managing (Not specified)...
```

### After (Clean Output):
```
English (Fluent), Luo (Native), Swahili (Basic), Luganda (Basic)
```

## Benefits
1. **Accuracy**: Eliminates false positives and random word extraction
2. **Robustness**: Works even when AI extraction fails
3. **Flexibility**: Handles diverse CV formats and structures
4. **Precision**: Only extracts actual language names from validated list
5. **Completeness**: Searches entire CV, not just specific sections
6. **Fallback**: Pattern-based extraction as safety net

## Future Enhancements
1. Add more language names (currently supports 70+)
2. Detect nationality from other clues (phone codes, addresses)
3. Support more proficiency frameworks (CEFR, ACTFL, etc.)
4. Machine learning to improve pattern recognition
5. Context-aware extraction (e.g., "native French speaker") 