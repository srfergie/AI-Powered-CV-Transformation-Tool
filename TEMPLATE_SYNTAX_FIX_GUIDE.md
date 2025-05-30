# 🔧 TEMPLATE.docx Syntax Fix Guide

## 🚨 Critical Issues Identified

Based on the error analysis, your `TEMPLATE.docx` file contains syntax errors that prevent docx-templates from processing it correctly. Here's how to fix them:

## ❌ Common Syntax Errors Found

### 1. **Private Field Errors** (#languages, #education, etc.)
**Error**: `SyntaxError: Private field '#languages' must be declared in an enclosing class`

**❌ Current (Incorrect) Syntax:**
```
{#languages}
{#education}
{#experience}
{#employment}
{#publications}
```

**✅ Correct Syntax:**
```
{languages}           // For simple string values
{#education}...{/education}    // For arrays only when education is an array
```

### 2. **Invalid Regular Expression Errors** (/languages, /education, etc.)
**Error**: `SyntaxError: Invalid regular expression: missing /`

This happens when opening tags fail, causing closing tags to be misinterpreted.

### 3. **ReferenceError: Variable Not Defined**
**Error**: `degree is not defined`, `institution is not defined`, etc.

**❌ Current (Incorrect) Usage:**
```
{degree}              // Outside of education loop
{institution}         // Outside of education loop
{graduationDate}      // Outside of education loop
```

**✅ Correct Usage:**
```
{#education}
{degree}
{institution}
{graduationDate}
{/education}
```

## ✅ CORRECT Template Syntax Reference

### **Personal Information (Simple Placeholders)**
```
{fullName}
{title}
{email}
{phone}
{location}
{linkedin}
{website}
{summary}
{nationality}
{languages}           // String value, NOT a loop
{countryExperience}   // String value, NOT a loop
```

### **Education Section (Array Loop)**
```
{#hasEducation}
QUALIFICATIONS
{#education}
{degree}, {institution}, {graduationDate}
{thesis}
{/education}
{/hasEducation}
```

### **Experience Section (Array Loop)**
```
{#hasExperience}
EXPERIENCE
{#experience}
{startDate} - {endDate}
{position} at {company}
{location}
{description}

{#allBullets}
• {.}
{/allBullets}
{/experience}
{/hasExperience}
```

### **Employment Section (Career Summary)**
```
{#hasExperience}
EMPLOYMENT
{#employment}
{startDate} - {endDate}
{position}, {company}
{/employment}
{/hasExperience}
```

### **Publications Section (Array Loop)**
```
{#hasPublications}
PUBLICATIONS
{#publications}
{authors} ({date}). '{title}'. {publication}.
{/publications}
{/hasPublications}
```

### **Skills Section (Array Loops)**
```
{#hasSkills}
TECHNICAL SKILLS
{#technicalSkills}{.}, {/technicalSkills}

PROGRAMMING LANGUAGES
{#programmingLanguages}{.}, {/programmingLanguages}

FRAMEWORKS
{#frameworks}{.}, {/frameworks}
{/hasSkills}
```

### **Header Placeholders**
```
{headerData.fullName}
{headerData.title}
{headerData.email} | {headerData.phone}
{headerData.location}
```

### **Footer Placeholders**
```
{footerData.companyName} | {footerData.confidentiality}
Generated: {footerData.generatedDate} | Page {footerData.pageNumber} of {footerData.totalPages}
```

## 🔧 How to Fix Your Template

### **Step 1: Open TEMPLATE.docx**
1. Open Microsoft Word
2. Open your `TEMPLATE.docx` file

### **Step 2: Find and Replace Problematic Syntax**

#### **Replace Loop Syntax:**
- **Find**: `{#languages}` → **Replace**: `{languages}`
- **Find**: `{/languages}` → **Delete** (remove this entirely)

#### **Fix Variable References:**
- **Find**: `{degree}` (outside education loop) → **Replace**: Move inside `{#education}...{/education}`
- **Find**: `{institution}` (outside education loop) → **Replace**: Move inside `{#education}...{/education}`
- **Find**: `{position}` (outside experience loop) → **Replace**: Move inside `{#experience}...{/experience}`

### **Step 3: Wrap Array Sections in Conditional Blocks**
```
{#hasEducation}
Your education content with loops
{/hasEducation}

{#hasExperience}
Your experience content with loops
{/hasExperience}
```

### **Step 4: Save and Test**
1. Save the template
2. Upload a test CV
3. Check server logs for remaining errors

## 📋 Complete Working Template Example

```
{fullName}
{title}

PROFILE
{summary}

NATIONALITY
{nationality}     LANGUAGES     {languages}

{#hasEducation}
QUALIFICATIONS
{#education}
{degree}, {institution}, {graduationDate}
{/education}
{/hasEducation}

COUNTRY WORK EXPERIENCE
{countryExperience}

{#hasExperience}
EXPERIENCE
{#experience}
{startDate} - {endDate}
{position} | {company} | {location}
{description}

{#allBullets}
• {.}
{/allBullets}
{/experience}
{/hasExperience}

{#hasPublications}
PUBLICATIONS
{#publications}
{authors} ({date}). '{title}'. {publication}.
{/publications}
{/hasPublications}
```

## 🐛 Debugging Tips

### **Check Server Logs**
After fixing, upload a CV and check the server console for:
- `🔧 TEMPLATE SYNTAX ERROR` messages
- `📝 MISSING VARIABLE` notifications
- `📊 TEMPLATE DATA STRUCTURE` dumps

### **Common Issues to Avoid**
1. **Don't use loops for strings**: `{languages}` not `{#languages}`
2. **Always close loops**: `{#education}` must have `{/education}`
3. **Use conditionals for optional sections**: `{#hasEducation}...{/hasEducation}`
4. **Match variable names exactly**: Case-sensitive

### **Test with Simple Template First**
Start with a minimal template containing only:
```
{fullName}
{title}
{summary}
{nationality}
{languages}
```

Then gradually add loops for education, experience, etc.

## 🎯 Next Steps

1. **Fix your current TEMPLATE.docx** using this guide
2. **Test with a sample CV upload**
3. **Check server logs** for any remaining errors
4. **Gradually add more complex sections** once basic placeholders work

Your template system is correctly implemented - the issue is purely with the Word template file syntax! 