# 📄 IOD PARC Template Header & Footer Setup Guide

## ✅ **Header/Footer Support Status**

Your CV transformation tool now has **full header and footer support**! The template system can populate both header and footer sections in your Word template with dynamic data from uploaded CVs.

## 🔧 **Available Header Placeholders**

Use these placeholders in your Word template's **Header section**:

### 📋 **Personal Information Placeholders**
- `{headerData.fullName}` - Person's full name
- `{headerData.title}` - Professional title/position
- `{headerData.email}` - Email address
- `{headerData.phone}` - Phone number
- `{headerData.location}` - City, Country location
- `{headerData.website}` - Personal website URL
- `{headerData.linkedin}` - LinkedIn profile URL

### 💡 **Header Example Layout**
```
{headerData.fullName} | {headerData.title}
📧 {headerData.email} | 📞 {headerData.phone} | 📍 {headerData.location}
🌐 {headerData.website} | 💼 {headerData.linkedin}
```

## 🔧 **Available Footer Placeholders**

Use these placeholders in your Word template's **Footer section**:

### 📋 **Footer Information Placeholders**
- `{footerData.generatedDate}` - Date when CV was generated
- `{footerData.pageNumber}` - Current page number (`{PAGE}`)
- `{footerData.totalPages}` - Total number of pages (`{NUMPAGES}`)
- `{footerData.companyName}` - "IOD PARC"
- `{footerData.confidentiality}` - "Confidential"

### 💡 **Footer Example Layout**
```
{footerData.companyName} | {footerData.confidentiality}
Generated: {footerData.generatedDate} | Page {footerData.pageNumber} of {footerData.totalPages}
```

## 🚀 **How to Set Up Headers & Footers in Word**

### **Step 1: Open Your TEMPLATE.docx**
1. Open Microsoft Word
2. Open your `TEMPLATE.docx` file

### **Step 2: Access Header & Footer**
1. Go to **Insert** tab in the ribbon
2. Click **Header** or **Footer**
3. Choose a header/footer style (or create custom)

### **Step 3: Add Header Content**
1. Click in the Header area
2. Type or paste your desired layout using the placeholders above
3. Example header content:
   ```
   {headerData.fullName}
   {headerData.title}
   
   Email: {headerData.email} | Phone: {headerData.phone}
   Location: {headerData.location}
   ```

### **Step 4: Add Footer Content**
1. Click in the Footer area
2. Add your footer layout:
   ```
   IOD PARC - Confidential
   Generated: {footerData.generatedDate} | Page {footerData.pageNumber} of {footerData.totalPages}
   ```

### **Step 5: Style Your Header/Footer**
- Apply fonts, colors, and formatting as needed
- Ensure it matches your IOD PARC branding
- **Keep the placeholders exactly as shown** (including curly braces)

### **Step 6: Save Template**
1. Save your `TEMPLATE.docx` file
2. Test with a CV upload to verify header/footer population

## 🎨 **IOD PARC Header/Footer Design Suggestions**

### **Professional Header Layout**
```
{headerData.fullName}
{headerData.title}

Contact: {headerData.email} | {headerData.phone} | {headerData.location}
LinkedIn: {headerData.linkedin} | Website: {headerData.website}
```

### **Corporate Footer Layout**
```
IOD PARC Employee-Owned Trust | Confidential Document
Generated: {footerData.generatedDate} | Page {footerData.pageNumber} of {footerData.totalPages}
```

### **Minimal Footer Layout**
```
{footerData.companyName} | Page {footerData.pageNumber}
```

## ✅ **Testing Your Header/Footer Setup**

1. **Save your TEMPLATE.docx** with header/footer placeholders
2. **Upload a CV** through the web interface
3. **Download the generated CV**
4. **Check that**:
   - Header shows the person's name, title, and contact info
   - Footer shows IOD PARC, date, and page numbers
   - All placeholders were replaced with actual data

## 🔧 **Troubleshooting**

### **Placeholders Not Replacing**
- ✅ Ensure placeholders are **exactly as shown** (case-sensitive)
- ✅ Include the curly braces `{}`
- ✅ Use `headerData.` or `footerData.` prefix

### **Header/Footer Not Appearing**
- ✅ Check that Word header/footer areas contain placeholders
- ✅ Verify the template file is saved as `TEMPLATE.docx`
- ✅ Test with a fresh CV upload

### **Formatting Issues**
- ✅ Apply styling in Word before saving template
- ✅ Ensure header/footer have appropriate margins
- ✅ Check that placeholders don't break across lines unexpectedly

## 📋 **Quick Reference**

| Purpose | Placeholder | Example Output |
|---------|-------------|----------------|
| Name in header | `{headerData.fullName}` | "John Smith" |
| Title in header | `{headerData.title}` | "Senior Consultant" |
| Email in header | `{headerData.email}` | "john@iodparc.com" |
| Generation date | `{footerData.generatedDate}` | "29/05/2025" |
| Page number | `{footerData.pageNumber}` | "1" |
| Company name | `{footerData.companyName}` | "IOD PARC" |

---

✅ **Your template system now has complete header and footer support!** The placeholders will be automatically populated with data from uploaded CVs. 