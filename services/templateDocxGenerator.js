const docx = require('docx');
const {
    Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow,
    WidthType, VerticalAlign, AlignmentType, BorderStyle, Footer, PageNumber,
    TableOfContents, HeadingLevel
} = docx;

// Template-specific formatting constants (matching TEMPLATE.docx exactly)
const TEMPLATE_COLORS = {
    HEADER_BLUE: "2c5aa0",  // IOD PARC Blue for section headers
    TEXT_BLACK: "000000",   // Black for regular text
    NAME_BLACK: "000000"    // Black for name (not blue like current implementation)
};

const TEMPLATE_FONTS = {
    FAMILY: "Calibri",      // Standard font family
    SIZES: {
        NAME: 48,           // 24pt for name (larger than current)
        SECTION_HEADER: 22, // 11pt for section headers  
        CONTENT: 22,        // 11pt for content text
        FOOTER: 18          // 9pt for footer
    }
};

const TEMPLATE_SPACING = {
    NAME_AFTER: 400,        // Space after name
    PARAGRAPH_AFTER: 120,   // Space after paragraphs
    SECTION_AFTER: 200      // Space after sections
};

// Table column structure matching template exactly
const TEMPLATE_COLUMNS = {
    HEADER_WIDTH: 20,       // 20% for header column
    CONTENT_WIDTH: 80,      // 80% for content columns
    DATE_WIDTH: 15,         // 15% for date column in experience
    EXP_CONTENT_WIDTH: 85   // 85% for experience content
};

/**
 * Create a header cell with exact template formatting
 */
function createTemplateHeaderCell(text, options = {}) {
    return new TableCell({
        children: [new Paragraph({
            children: [new TextRun({
                text: text,
                font: TEMPLATE_FONTS.FAMILY,
                size: TEMPLATE_FONTS.SIZES.SECTION_HEADER,
                bold: true,
                color: TEMPLATE_COLORS.HEADER_BLUE,
            })],
            alignment: options.alignment || AlignmentType.LEFT,
            spacing: { after: options.spacing || 0 }
        })],
        verticalAlign: VerticalAlign.TOP,
        width: {
            size: options.width || TEMPLATE_COLUMNS.HEADER_WIDTH,
            type: WidthType.PERCENTAGE
        },
        columnSpan: options.columnSpan || 1,
        margins: {
            top: 100,
            bottom: 100,
            left: 150,
            right: 150
        },
        borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE }
        }
    });
}

/**
 * Create a content cell with exact template formatting
 */
function createTemplateContentCell(content, options = {}) {
    const paragraphs = Array.isArray(content) ? content : [content];

    return new TableCell({
        children: paragraphs.map(paragraph => {
            if (paragraph instanceof Paragraph) {
                return paragraph;
            }

            // Handle string content
            const text = typeof paragraph === 'string' ? paragraph : String(paragraph);
            return new Paragraph({
                children: [new TextRun({
                    text: text,
                    font: TEMPLATE_FONTS.FAMILY,
                    size: TEMPLATE_FONTS.SIZES.CONTENT,
                    color: TEMPLATE_COLORS.TEXT_BLACK,
                    bold: options.bold || false
                })],
                alignment: options.alignment || AlignmentType.JUSTIFIED,
                spacing: {
                    after: options.spacing || TEMPLATE_SPACING.PARAGRAPH_AFTER,
                    line: 280  // 1.2 line spacing
                }
            });
        }),
        verticalAlign: VerticalAlign.TOP,
        width: {
            size: options.width || TEMPLATE_COLUMNS.CONTENT_WIDTH,
            type: WidthType.PERCENTAGE
        },
        columnSpan: options.columnSpan || 1,
        margins: {
            top: 100,
            bottom: 100,
            left: 150,
            right: 150
        },
        borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE }
        }
    });
}

/**
 * Create name row exactly like template (empty cell + name spanning 3 columns)
 */
function createNameRow(name) {
    return new TableRow({
        children: [
            // Empty cell
            new TableCell({
                children: [new Paragraph({ text: "" })],
                width: { size: TEMPLATE_COLUMNS.HEADER_WIDTH, type: WidthType.PERCENTAGE },
                borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE }
                }
            }),
            // Name spanning 3 columns
            new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({
                        text: name || "CV Applicant",
                        font: TEMPLATE_FONTS.FAMILY,
                        size: TEMPLATE_FONTS.SIZES.NAME,
                        color: TEMPLATE_COLORS.NAME_BLACK,
                        bold: false  // Template shows name is not bold
                    })],
                    alignment: AlignmentType.LEFT,
                    spacing: { after: TEMPLATE_SPACING.NAME_AFTER }
                })],
                columnSpan: 3,
                width: { size: TEMPLATE_COLUMNS.CONTENT_WIDTH, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                margins: {
                    top: 100,
                    bottom: 100,
                    left: 150,
                    right: 150
                },
                borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE }
                }
            })
        ]
    });
}

/**
 * Create section header row spanning all 4 columns
 */
function createSectionHeaderRow(title) {
    return new TableRow({
        children: [
            new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({
                        text: title,
                        font: TEMPLATE_FONTS.FAMILY,
                        size: TEMPLATE_FONTS.SIZES.NAME, // Same size as name for major sections
                        color: TEMPLATE_COLORS.TEXT_BLACK,
                        bold: false
                    })]
                })],
                columnSpan: 4,
                width: { size: 100, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                margins: {
                    top: 200,
                    bottom: 100,
                    left: 150,
                    right: 150
                },
                borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE }
                }
            })
        ]
    });
}

/**
 * Create experience entry row (date + content spanning 3 columns)
 */
function createExperienceRow(dateText, content) {
    return new TableRow({
        children: [
            // Date cell
            new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({
                        text: dateText || "",
                        font: TEMPLATE_FONTS.FAMILY,
                        size: TEMPLATE_FONTS.SIZES.CONTENT,
                        color: TEMPLATE_COLORS.TEXT_BLACK
                    })]
                })],
                width: { size: TEMPLATE_COLUMNS.DATE_WIDTH, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                margins: {
                    top: 100,
                    bottom: 100,
                    left: 150,
                    right: 150
                },
                borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE }
                }
            }),
            // Content spanning 3 columns
            createTemplateContentCell(content, {
                columnSpan: 3,
                width: TEMPLATE_COLUMNS.EXP_CONTENT_WIDTH
            })
        ]
    });
}

/**
 * Generate DOCX with exact template formatting
 */
async function generateTemplateMatchingDocx(data) {
    try {
        const documentChildren = [];
        const allRows = [];

        // Extract name from data
        const applicantName = data.personalDetails?.name ||
            data.name ||
            data.personalInfo?.name ||
            "CV Applicant";

        // 1. Name row (matches template exactly)
        allRows.push(createNameRow(applicantName));

        // 2. Profile section
        if (data.profile) {
            allRows.push(new TableRow({
                children: [
                    createTemplateHeaderCell("Profile"),
                    createTemplateContentCell(data.profile, { columnSpan: 3 })
                ]
            }));
        }

        // 3. Nationality & Languages (split into two cells like template)
        const nationality = data.nationality ||
            data.personalDetails?.nationality ||
            "Not specified";

        const languageString = (data.languages || [])
            .map(l => typeof l === 'string' ? l : `${l.language} (${l.proficiency})`)
            .join(', ') || 'Not specified';

        allRows.push(new TableRow({
            children: [
                createTemplateHeaderCell("Nationality"),
                createTemplateContentCell(nationality, { width: 30 }),
                createTemplateContentCell("Languages", { width: 15, bold: true }),
                createTemplateContentCell(languageString, { width: 35 })
            ]
        }));

        // 4. Qualifications
        if (data.qualifications && data.qualifications.length > 0) {
            const qualContent = data.qualifications.map(q => {
                const year = q.year || q.graduationDate || '';
                const degree = q.degree || q.qualification || '';
                const institution = q.institution || q.university || '';
                const details = q.details || q.description || '';

                let qualText = '';
                if (degree) qualText += `${degree}`;
                if (details) qualText += ` (${details})`;
                if (year) qualText += `, ${year}`;
                if (institution) qualText += `, ${institution}`;

                return qualText;
            }).filter(q => q.trim()).join('\n\n');

            if (qualContent) {
                allRows.push(new TableRow({
                    children: [
                        createTemplateHeaderCell("Qualifications"),
                        createTemplateContentCell(qualContent, { columnSpan: 3 })
                    ]
                }));
            }
        }

        // 5. Country work experience
        const countryExp = (data.countryWorkExperience || data.countryExperience || [])
            .join(', ') || 'Not specified';

        allRows.push(new TableRow({
            children: [
                createTemplateHeaderCell("Country work experience"),
                createTemplateContentCell(countryExp, { columnSpan: 3 })
            ]
        }));

        // 6. Experience section
        if (data.experience && data.experience.length > 0) {
            // Section header
            allRows.push(createSectionHeaderRow("Experience:"));

            // Experience entries
            data.experience.forEach(exp => {
                const dateRange = exp.startDate && exp.endDate
                    ? `${exp.startDate} - ${exp.endDate}`
                    : exp.date || "";

                // Format experience content like template
                let expContent = '';
                if (exp.position || exp.title) {
                    expContent += `${exp.position || exp.title}`;
                }
                if (exp.client || exp.company) {
                    expContent += `\n${exp.role || 'Consultant'} | Client: ${exp.client || exp.company}`;
                }
                if (exp.location) {
                    expContent += ` | Location: ${exp.location}`;
                }
                if (exp.description) {
                    expContent += `\n\n${exp.description}`;
                }

                allRows.push(createExperienceRow(dateRange, expContent));
            });
        }

        // 7. Employment section
        if (data.employment && data.employment.length > 0) {
            allRows.push(createSectionHeaderRow("Employment:"));

            data.employment.forEach(emp => {
                const dateRange = emp.startDate && emp.endDate
                    ? `${emp.startDate} - ${emp.endDate}`
                    : emp.date || "";

                let empContent = '';
                if (emp.position || emp.title) {
                    empContent += `${emp.position || emp.title}`;
                }
                if (emp.company || emp.employer) {
                    empContent += `\n${emp.company || emp.employer}`;
                }

                allRows.push(createExperienceRow(dateRange, empContent));
            });
        }

        // 8. Publications section  
        if (data.publications && data.publications.length > 0) {
            allRows.push(createSectionHeaderRow("Publications:"));

            const pubContent = data.publications.map(pub => {
                let pubText = '';
                if (pub.authors) pubText += pub.authors;
                if (pub.year || pub.date) pubText += ` (${pub.year || pub.date})`;
                if (pub.title) pubText += `. '${pub.title}'`;
                if (pub.journal || pub.publication) pubText += `. ${pub.journal || pub.publication}`;
                if (pub.url) pubText += ` ${pub.url}`;
                return pubText;
            }).filter(p => p.trim()).join('\n\n');

            allRows.push(new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({
                            children: [new TextRun({
                                text: pubContent,
                                font: TEMPLATE_FONTS.FAMILY,
                                size: TEMPLATE_FONTS.SIZES.CONTENT,
                                color: TEMPLATE_COLORS.TEXT_BLACK
                            })]
                        })],
                        columnSpan: 4,
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.TOP,
                        margins: {
                            top: 100,
                            bottom: 100,
                            left: 150,
                            right: 150
                        },
                        borders: {
                            top: { style: BorderStyle.NONE },
                            bottom: { style: BorderStyle.NONE },
                            left: { style: BorderStyle.NONE },
                            right: { style: BorderStyle.NONE }
                        }
                    })
                ]
            }));
        }

        // Create the main table with exact template structure
        documentChildren.push(
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                columnWidths: [1500, 2500, 1500, 2500], // 4-column layout like template
                rows: allRows,
                borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                    insideHorizontal: { style: BorderStyle.NONE },
                    insideVertical: { style: BorderStyle.NONE }
                }
            })
        );

        // Create document with template-matching styles
        const doc = new Document({
            creator: "IOD PARC CV Generator",
            title: `CV - ${applicantName}`,
            styles: {
                paragraphStyles: [{
                    id: "Normal",
                    name: "Normal",
                    run: {
                        font: TEMPLATE_FONTS.FAMILY,
                        size: TEMPLATE_FONTS.SIZES.CONTENT,
                        color: TEMPLATE_COLORS.TEXT_BLACK
                    },
                    paragraph: {
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { after: TEMPLATE_SPACING.PARAGRAPH_AFTER, line: 280 }
                    }
                }]
            },
            sections: [{
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                children: [
                                    new TextRun({
                                        text: "Page ",
                                        font: TEMPLATE_FONTS.FAMILY,
                                        size: TEMPLATE_FONTS.SIZES.FOOTER,
                                        color: TEMPLATE_COLORS.TEXT_BLACK
                                    }),
                                    PageNumber.CURRENT,
                                    new TextRun({
                                        text: " of ",
                                        font: TEMPLATE_FONTS.FAMILY,
                                        size: TEMPLATE_FONTS.SIZES.FOOTER,
                                        color: TEMPLATE_COLORS.TEXT_BLACK
                                    }),
                                    PageNumber.TOTAL_PAGES
                                ],
                            }),
                        ],
                    }),
                },
                properties: {
                    page: {
                        margin: {
                            top: 720,   // 0.5 inch
                            right: 720,
                            bottom: 720,
                            left: 720
                        }
                    }
                },
                children: documentChildren,
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        return buffer;

    } catch (error) {
        console.error('Error generating template-matching DOCX:', error);
        throw error;
    }
}

module.exports = {
    generateTemplateMatchingDocx,
    TEMPLATE_COLORS,
    TEMPLATE_FONTS,
    TEMPLATE_SPACING,
    TEMPLATE_COLUMNS
}; 