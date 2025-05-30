const docx = require('docx');
const {
    Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow,
    WidthType, VerticalAlign, AlignmentType, BorderStyle, Footer, PageNumber,
    TableOfContents, HeadingLevel
} = docx;

// Template-specific formatting constants (matching TEMPLATE.docx exactly)
const TEMPLATE_COLORS = {
    TEXT_BLACK: "000000",   // Black for all text (headers and content)
};

const TEMPLATE_FONTS = {
    FAMILY: "Calibri",      // Standard font family
    SIZES: {
        NAME: 48,           // 24pt for name
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
                bold: true,  // Headers are bold in template
                color: TEMPLATE_COLORS.TEXT_BLACK,
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
    if (!content || content === "") {
        // Return empty cell for blank content
        return new TableCell({
            children: [new Paragraph({ text: "" })],
            verticalAlign: VerticalAlign.TOP,
            width: {
                size: options.width || TEMPLATE_COLUMNS.CONTENT_WIDTH,
                type: WidthType.PERCENTAGE
            },
            columnSpan: options.columnSpan || 1,
            borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE }
            }
        });
    }

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
                        text: name || "",
                        font: TEMPLATE_FONTS.FAMILY,
                        size: TEMPLATE_FONTS.SIZES.NAME,
                        color: TEMPLATE_COLORS.TEXT_BLACK,
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
                    })],
                    spacing: { before: 200, after: 100 }
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
 * Create experience entry row with proper formatting
 */
function createExperienceRow(dateText, content) {
    // Parse content to separate title, role/client/location, and description
    const lines = content.split('\n');
    const children = [];

    lines.forEach((line, index) => {
        if (index === 0 && line.trim()) {
            // First line (title) is bold
            children.push(new Paragraph({
                children: [new TextRun({
                    text: line,
                    font: TEMPLATE_FONTS.FAMILY,
                    size: TEMPLATE_FONTS.SIZES.CONTENT,
                    color: TEMPLATE_COLORS.TEXT_BLACK,
                    bold: true
                })],
                spacing: { after: 60 }
            }));
        } else if (index === 1 && line.includes('|')) {
            // Role/Client/Location line is bold
            children.push(new Paragraph({
                children: [new TextRun({
                    text: line,
                    font: TEMPLATE_FONTS.FAMILY,
                    size: TEMPLATE_FONTS.SIZES.CONTENT,
                    color: TEMPLATE_COLORS.TEXT_BLACK,
                    bold: true
                })],
                spacing: { after: 120 }
            }));
        } else if (line.trim()) {
            // Regular description text
            children.push(new Paragraph({
                children: [new TextRun({
                    text: line,
                    font: TEMPLATE_FONTS.FAMILY,
                    size: TEMPLATE_FONTS.SIZES.CONTENT,
                    color: TEMPLATE_COLORS.TEXT_BLACK,
                    bold: false
                })],
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 120 }
            }));
        }
    });

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
            new TableCell({
                children: children,
                columnSpan: 3,
                width: { size: TEMPLATE_COLUMNS.EXP_CONTENT_WIDTH, type: WidthType.PERCENTAGE },
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
            "";

        // 1. Name row (matches template exactly)
        allRows.push(createNameRow(applicantName));

        // 2. Profile section - only add if content exists
        if (data.profile && data.profile.trim()) {
            allRows.push(new TableRow({
                children: [
                    createTemplateHeaderCell("Profile"),
                    createTemplateContentCell(data.profile, { columnSpan: 3 })
                ]
            }));
        }

        // 3. Nationality & Languages - always show structure
        const nationality = data.nationality || data.personalDetails?.nationality || "";
        const languageString = (data.languages || [])
            .map(l => typeof l === 'string' ? l : `${l.language} (${l.proficiency})`)
            .join(', ');

        allRows.push(new TableRow({
            children: [
                createTemplateHeaderCell("Nationality"),
                createTemplateContentCell(nationality, { width: 30 }),
                createTemplateContentCell("Languages", { width: 15, bold: false }), // Not bold in template
                createTemplateContentCell(languageString, { width: 35 })
            ]
        }));

        // 4. Qualifications - only add if content exists
        if (data.qualifications && data.qualifications.length > 0) {
            const qualParagraphs = [];

            data.qualifications.forEach(q => {
                if (q.degree || q.qualification) {
                    const degree = q.degree || q.qualification || '';
                    const details = q.details || q.description || '';
                    const year = q.year || q.graduationDate || '';
                    const institution = q.institution || q.university || '';

                    // First line with degree is bold
                    let firstLine = degree;
                    if (details) firstLine += ` (${details})`;
                    if (year) firstLine += `, ${year}`;
                    if (institution) firstLine += `, ${institution}`;

                    qualParagraphs.push(new Paragraph({
                        children: [new TextRun({
                            text: firstLine,
                            font: TEMPLATE_FONTS.FAMILY,
                            size: TEMPLATE_FONTS.SIZES.CONTENT,
                            color: TEMPLATE_COLORS.TEXT_BLACK,
                            bold: true  // Degree names are bold in template
                        })],
                        spacing: { after: 120 }
                    }));
                }
            });

            if (qualParagraphs.length > 0) {
                allRows.push(new TableRow({
                    children: [
                        createTemplateHeaderCell("Qualifications"),
                        new TableCell({
                            children: qualParagraphs,
                            columnSpan: 3,
                            verticalAlign: VerticalAlign.TOP,
                            width: { size: 80, type: WidthType.PERCENTAGE },
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
        }

        // 5. Country work experience - always show structure
        const countryExp = (data.countryWorkExperience || data.countryExperience || []).join(', ');

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
                const dateRange = exp.dates ||
                    (exp.startDate && exp.endDate ? `${exp.startDate} - ${exp.endDate}` : '') ||
                    exp.date || "";

                // Format experience content like template
                let expContent = '';

                // Title line
                if (exp.position || exp.title || exp.role) {
                    expContent += exp.position || exp.title || exp.role;
                }

                // Role/Client/Location line
                const roleClientLocation = [];
                if (exp.role && !expContent.includes(exp.role)) {
                    roleClientLocation.push(`Role: ${exp.role}`);
                }
                if (exp.client || exp.company || exp.organization) {
                    roleClientLocation.push(`Client: ${exp.client || exp.company || exp.organization}`);
                }
                if (exp.location) {
                    roleClientLocation.push(`Location: ${exp.location}`);
                }

                if (roleClientLocation.length > 0) {
                    expContent += '\n' + roleClientLocation.join(' | ');
                }

                // Description
                if (exp.description || exp.details || exp.responsibilities) {
                    expContent += '\n' + (exp.description || exp.details || exp.responsibilities);
                }

                if (expContent.trim()) {
                    allRows.push(createExperienceRow(dateRange, expContent));
                }
            });
        }

        // 7. Employment section
        if (data.employment && data.employment.length > 0) {
            allRows.push(createSectionHeaderRow("Employment:"));

            data.employment.forEach(emp => {
                const dateRange = emp.dates ||
                    (emp.startDate && emp.endDate ? `${emp.startDate} - ${emp.endDate}` : '') ||
                    emp.date || "";

                let empContent = '';

                // Position line (bold)
                if (emp.position || emp.title) {
                    empContent += emp.position || emp.title;
                }

                // Company line
                if (emp.company || emp.employer || emp.organization) {
                    empContent += '\n' + (emp.company || emp.employer || emp.organization);
                }

                // Location if available
                if (emp.location) {
                    empContent += ', ' + emp.location;
                }

                if (empContent.trim()) {
                    allRows.push(createExperienceRow(dateRange, empContent));
                }
            });
        }

        // 8. Publications section  
        if (data.publications && data.publications.length > 0) {
            allRows.push(createSectionHeaderRow("Publications:"));

            const pubParagraphs = data.publications.map(pub => {
                let pubText = '';

                // Try to use citation if available
                if (pub.citation) {
                    pubText = pub.citation;
                } else {
                    // Build citation from components
                    if (pub.authors) pubText += pub.authors;
                    if (pub.year || pub.date) {
                        const year = pub.year || pub.date;
                        pubText += pubText ? ` (${year})` : `(${year})`;
                    }
                    if (pub.title) {
                        pubText += pubText ? `. '${pub.title}'` : `'${pub.title}'`;
                    }
                    if (pub.journal || pub.publication || pub.venue) {
                        const venue = pub.journal || pub.publication || pub.venue;
                        pubText += pubText ? `. ${venue}` : venue;
                    }
                    if (pub.url) {
                        pubText += pubText ? ` ${pub.url}` : pub.url;
                    }
                }

                // Only create paragraph if there's actual content
                if (pubText && pubText.trim()) {
                    return new Paragraph({
                        children: [new TextRun({
                            text: pubText,
                            font: TEMPLATE_FONTS.FAMILY,
                            size: TEMPLATE_FONTS.SIZES.CONTENT,
                            color: TEMPLATE_COLORS.TEXT_BLACK
                        })],
                        spacing: { after: 120 }
                    });
                }
                return null;
            }).filter(p => p !== null); // Filter out null values

            if (pubParagraphs.length > 0) {
                allRows.push(new TableRow({
                    children: [
                        new TableCell({
                            children: pubParagraphs,
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
                children: documentChildren
            }]
        });

        // Generate buffer
        const buffer = await Packer.toBuffer(doc);
        console.log('✅ Template-matching DOCX generated successfully');
        return buffer;

    } catch (error) {
        console.error('❌ Error generating template DOCX:', error);
        throw error;
    }
}

module.exports = { generateTemplateMatchingDocx }; 