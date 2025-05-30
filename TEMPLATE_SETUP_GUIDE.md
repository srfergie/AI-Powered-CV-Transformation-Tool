# IOD PARC Template Setup Guide

## 🎯 **Template-Based CV Generation Setup**

This guide explains how to set up your IOD PARC template for perfect CV generation with placeholder replacement and logo integration.

## 📄 **Current Template Status**

✅ **Template File**: `TEMPLATE.docx` needs to be created with proper placeholders  
✅ **Template Service**: `templateDocxGeneratorService.js` is configured and updated  
✅ **Word Document Support**: Enhanced parser with buffer support for reliable processing  
✅ **Enhanced File Processing**: Both PDF and Word documents supported with improved error handling  
✅ **AI Extraction**: Updated OpenRouter prompts for IOD PARC-specific data extraction  

## 🎨 **Logo Integration Requirements**

To achieve pixel-perfect template matching, please provide:

### **Required Logo Files**:
1. **IOD PARC Logo** (High Resolution)
   - Format: PNG with transparent background (preferred)
   - Alternative: SVG, JPG, or high-res PNG
   - Resolution: At least 300 DPI for print quality
   - Suggested size: 200-400px width

### **Logo Integration Steps**:

1. **Create Logo Directory**:
   ```
   mkdir src/assets/images
   ```

2. **Add Logo Files**:
   ```
   src/assets/images/
   ├── iod-parc-logo.png      # Main logo
   ├── iod-parc-logo-dark.png # Dark version (if needed)
   └── iod-parc-logo.svg      # Vector version (if available)
   ```

3. **Logo Integration Options**:
   - **Option A**: Replace placeholder in template
   - **Option B**: Dynamic insertion via code
   - **Option C**: Template modification with fixed positioning

## 🔧 **Template Placeholder System**

### **Current Placeholder Structure**:

The template uses `{placeholderName}` format for data replacement:

```javascript
// Personal Information
{fullName}          // Candidate's full name
{title}             // Professional title/position
{email}             // Email address
{phone}             // Phone number
{location}          // Location/address
{linkedin}          // LinkedIn profile
{website}           // Personal website

// Content Sections
{summary}           // Professional summary
{#experience}...{/experience}  // Work experience loop
{#education}...{/education}    // Education loop
{#allSkills}...{/allSkills}    // Skills loop
{#projects}...{/projects}      // Projects loop

// Conditional Sections
{#hasExperience}...{/hasExperience}
{#hasEducation}...{/hasEducation}
{#hasSkills}...{/hasSkills}
```

### **Advanced Template Features**:

#### **1. Experience Section**:
```javascript
{#experience}
Position: {position}
Company: {company} ({duration})
Location: {location}
Responsibilities:
{#responsibilities}• {.}{/responsibilities}
Achievements:
{#achievements}• {.}{/achievements}
{/experience}
```

#### **2. Education Section**:
```javascript
{#education}
{degree}
{institution}, {location}
{graduationDate}
{#honors}Honors: {honors}{/honors}
{/education}
```

#### **3. Skills Section**:
```javascript
Technical Skills: {#technicalSkills}{.}, {/technicalSkills}
Programming: {#programmingLanguages}{.}, {/programmingLanguages}
Frameworks: {#frameworks}{.}, {/frameworks}
Tools: {#tools}{.}, {/tools}
```

## 📐 **Template Enhancement Instructions**

### **To Modify Your TEMPLATE.docx**:

1. **Open TEMPLATE.docx** in Microsoft Word

2. **Replace Static Content** with placeholders:
   ```
   [Name] → {fullName}
   [Title] → {title}
   [Email] → {email}
   [Phone] → {phone}
   [Address] → {location}
   ```

3. **Add Loop Sections** for dynamic content:
   ```
   Work Experience:
   {#experience}
   {position} at {company}
   {startDate} - {endDate} ({duration})
   {location}
   
   {#allBullets}
   • {.}
   {/allBullets}
   {/experience}
   ```

4. **Add Conditional Sections**:
   ```
   {#hasSkills}
   SKILLS
   {#allSkills}{.} • {/allSkills}
   {/hasSkills}
   ```

### **Logo Positioning Options**:

#### **Option 1: Header Logo Placeholder**
```
{logo}  [Your Name]
        [Your Title]
        [Contact Information]
```

#### **Option 2: Fixed Header with Dynamic Content**
```
[IOD PARC LOGO]  {fullName}
                 {title}
                 {email} | {phone} | {location}
```

#### **Option 3: Table-Based Layout**
```
┌─────────────┬──────────────────────┐
│ [LOGO]      │ {fullName}           │
│             │ {title}              │
│             │ {email} | {phone}    │
└─────────────┴──────────────────────┘
```

## 🚀 **Implementation Steps**

### **Step 1: Prepare Template**
1. Modify `TEMPLATE.docx` with placeholders
2. Save modified template
3. Test template with sample data

### **Step 2: Add Logo**
1. Provide IOD PARC logo files
2. Choose integration method
3. Update template accordingly

### **Step 3: Test & Refine**
1. Upload test CV
2. Generate using template
3. Compare with desired output
4. Refine placeholders as needed

## 🔍 **Testing the Template System**

### **Current Status**:
- ✅ Template service is implemented
- ✅ Word document parsing is active
- ✅ Enhanced file type support
- ✅ Template-based generation with fallback

### **Test Process**:
1. Upload a CV (PDF or Word)
2. System will attempt template-based generation first
3. If template fails, falls back to standard generation
4. Download includes generation method in headers

### **Debugging Information**:
- Server logs show template loading success/failure
- Download headers include `X-Generation-Method`
- Progress tracking shows template processing stages

## 📋 **Next Steps**

1. **Provide IOD PARC Logo**: Upload high-resolution logo files
2. **Template Modification**: Optionally modify TEMPLATE.docx with placeholders
3. **Testing**: Test with actual CV files
4. **Refinement**: Adjust formatting based on results

## 🔧 **Advanced Configuration**

### **Logo Integration Code Example**:
```javascript
// In templateDocxGeneratorService.js
const logoPath = path.join(__dirname, '../assets/images/iod-parc-logo.png');
const logoImage = fs.readFileSync(logoPath);

// Add to template data
templateData.logo = {
  data: logoImage,
  width: 100,
  height: 50
};
```

### **Custom Template Functions**:
```javascript
// Helper functions available in template
formatDate(date)       // Format dates consistently
formatPhone(phone)     // Format phone numbers
formatList(items)      // Join arrays with commas
formatSkills(skills)   // Join skills with bullets
hasItems(arr)         // Check if array has items
```

## 🎯 **Expected Results**

With proper template setup and logo integration:

1. **Perfect Formatting**: Exact IOD PARC template layout
2. **Logo Integration**: Professional header with company branding
3. **Dynamic Content**: AI-extracted data properly formatted
4. **Consistent Styling**: Corporate-standard appearance
5. **ATS Compatibility**: Clean, readable structure

## 📞 **Need Help?**

If you need assistance with:
- Template modification
- Logo integration
- Placeholder setup
- Testing and refinement

Please provide:
1. IOD PARC logo files
2. Specific formatting requirements
3. Sample CV files for testing
4. Any template modifications needed

## 🚀 **IMMEDIATE SETUP REQUIRED**

### **Step 1: Create Your TEMPLATE.docx File**

1. **Open Microsoft Word**
2. **Copy the content from `TEMPLATE_with_placeholders.html`**:
   ```
   {fullName}
   {title}

   Profile
   {summary}

   Nationality	{nationality}	Languages	{#languages}{.}
   {/languages}

   Qualifications	
   {#education}{degree}, {institution}, {graduationDate}
   {/education}

   Country work experience	{countryExperience}

   Experience:
   {#experience}
   {startDate} - {endDate}	{position}, {company} - {description}
   {/experience}

   Employment:
   {#employment}
   {startDate} - {endDate}	{position}, {company}
   {/employment}

   Publications:
   {#publications}
   {authors}. {date}. '{title}'. {publication}
   {/publications}
   ```

3. **Paste into Word and format as desired**:
   - Apply IOD PARC fonts and styling
   - Set proper spacing and margins
   - Add any visual elements (borders, backgrounds, etc.)
   - **KEEP THE PLACEHOLDERS EXACTLY AS SHOWN** (including the curly braces)

4. **Save as `TEMPLATE.docx`** in the root directory of your project

### **Step 2: Test the Template**

1. **Upload a CV** (PDF or Word document)
2. **Check the server logs** for template processing messages
3. **Download the result** and verify formatting

### **Step 3: Add Headers & Footers (Optional)**

For professional IOD PARC templates with headers and footers:

1. **See**: `TEMPLATE_HEADER_FOOTER_GUIDE.md` for complete instructions
2. **Add header placeholders** like `{headerData.fullName}`, `{headerData.email}`
3. **Add footer placeholders** like `{footerData.generatedDate}`, `{footerData.companyName}`
4. **Test the complete template** with header/footer data population

## 🔧 **Recent Fixes Applied**

### ✅ **Word Document Parser Fixed**
- **Problem**: "Could not find file in options" error
- **Solution**: Updated to use file buffer instead of file path
- **Files Updated**: `src/services/wordParserService.js`

### ✅ **Enhanced AI Extraction**
- **Improvement**: Better data extraction for IOD PARC format
- **New Fields**: nationality, countryExperience, enhanced publications
- **Files Updated**: `src/services/openRouterService.js`

### ✅ **Template Data Mapping**
- **Enhancement**: Updated data preparation for IOD PARC structure
- **New Mappings**: nationality, languages, country experience formatting
- **Files Updated**: `src/services/templateDocxGeneratorService.js` 