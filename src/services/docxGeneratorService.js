const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TabStopPosition, TabStopType, BorderStyle, Table, TableRow, TableCell, WidthType, UnderlineType, PageBreak, Header, Footer, ImageRun } = require('docx');
const fs = require('fs');
const path = require('path');

/**
 * Generates a .docx document from CV data using the IOD PARC professional table template
 * @param {Object} cvData - The structured CV data
 * @param {string} fileName - Original file name for reference
 * @returns {Promise<Buffer>} - Buffer containing the .docx file
 */
async function generateResumeDocx(cvData, fileName) {
    try {
        const doc = new Document({
            styles: {
                paragraphStyles: [
                    {
                        id: "candidateName",
                        name: "Candidate Name",
                        basedOn: "Normal",
                        run: {
                            size: 32,
                            bold: true,
                            color: "000000",
                            font: "Arial",
                        },
                        paragraph: {
                            spacing: { after: 240, before: 0 },
                            alignment: AlignmentType.CENTER,
                        },
                    },
                    {
                        id: "jobTitle",
                        name: "Job Title",
                        basedOn: "Normal",
                        run: {
                            size: 16,
                            bold: false,
                            color: "000000",
                            font: "Arial",
                        },
                        paragraph: {
                            spacing: { after: 360, before: 0 },
                            alignment: AlignmentType.CENTER,
                        },
                    },
                    {
                        id: "sectionHeader",
                        name: "Section Header",
                        basedOn: "Normal",
                        run: {
                            size: 22, // 11pt
                            bold: true,
                            color: "000000",
                            font: "Arial",
                        },
                        paragraph: {
                            spacing: { after: 60, before: 0 },
                            alignment: AlignmentType.LEFT,
                        },
                    },
                    {
                        id: "mainHeader",
                        name: "Main Header",
                        basedOn: "Normal",
                        run: {
                            size: 32, // 16pt
                            bold: true,
                            color: "000000",
                            font: "Arial",
                        },
                        paragraph: {
                            spacing: { after: 120, before: 240 },
                            alignment: AlignmentType.LEFT,
                        },
                    },
                    {
                        id: "bodyText",
                        name: "Body Text",
                        basedOn: "Normal",
                        run: {
                            size: 22, // 11pt
                            color: "000000",
                            font: "Arial",
                        },
                        paragraph: {
                            spacing: { after: 60, line: 240 },
                            alignment: AlignmentType.JUSTIFIED,
                        },
                    },
                    {
                        id: "headerText",
                        name: "Header Text",
                        basedOn: "Normal",
                        run: {
                            size: 20, // 10pt
                            color: "666666",
                            font: "Arial",
                        },
                        paragraph: {
                            spacing: { after: 60 },
                            alignment: AlignmentType.LEFT,
                        },
                    },
                ],
            },
            sections: [
                {
                    properties: {
                        page: {
                            margin: {
                                top: 1440,    // 1 inch
                                right: 1440,  // 1 inch
                                bottom: 1440, // 1 inch
                                left: 1440,   // 1 inch
                            },
                        },
                    },
                    // No headers or footers - clean document
                    children: generateTableBasedTemplate(cvData),
                },
            ],
        });

        const buffer = await Packer.toBuffer(doc);
        return buffer;
    } catch (error) {
        console.error('Error generating DOCX:', error);
        throw new Error(`Failed to generate DOCX document: ${error.message}`);
    }
}

/**
 * Generates the document content using table-based structure like Richard Burge template
 * @param {Object} data - CV data
 * @returns {Array} - Array of document elements
 */
function generateTableBasedTemplate(data) {
    const content = [];

    // DEBUG: Log the actual data structure we're receiving
    console.log('🔍 DOCX GENERATOR DEBUG:');
    console.log('• Top-level keys:', Object.keys(data));
    console.log('• workExperience exists:', !!data.workExperience);
    console.log('• workExperience length:', data.workExperience?.length || 0);
    console.log('• publications exists:', !!data.publications);
    console.log('• publications length:', data.publications?.length || 0);
    console.log('• education exists:', !!data.education);
    console.log('• education length:', data.education?.length || 0);

    // Simple and reliable data extraction
    const personalData = data.personalInfo || data.personalDetails || data || {};

    const candidateName = personalData.name ||
        data.name ||
        'Name not extracted';

    const candidateTitle = personalData.title ||
        data.title ||
        (data.workExperience?.[0]?.position) ||
        'Professional';

    console.log('• Extracted name:', candidateName);
    console.log('• Extracted title:', candidateTitle);

    // ===== NAME AND TITLE (Outside table, centered) =====
    content.push(
        new Paragraph({
            text: candidateName,
            style: "candidateName",
        })
    );

    content.push(
        new Paragraph({
            text: candidateTitle,
            style: "jobTitle",
        })
    );

    // ===== MAIN TABLE STRUCTURE =====
    const tableRows = [];

    // 1. PROFILE SECTION
    if (data.summary) {
        tableRows.push(
            new TableRow({
                children: [
                    new TableCell({
                        children: [
                            new Paragraph({
                                text: "Profile",
                                style: "sectionHeader",
                            }),
                        ],
                        width: { size: 20, type: WidthType.PERCENTAGE },
                        verticalAlign: "top",
                    }),
                    new TableCell({
                        children: [
                            new Paragraph({
                                text: data.summary,
                                style: "bodyText",
                            }),
                        ],
                        width: { size: 80, type: WidthType.PERCENTAGE },
                        verticalAlign: "top",
                    }),
                ],
            })
        );
    }

    // 2. NATIONALITY SECTION
    const nationality = personalData.nationality || "Not specified";
    tableRows.push(
        new TableRow({
            children: [
                new TableCell({
                    children: [
                        new Paragraph({
                            text: "Nationality",
                            style: "sectionHeader",
                        }),
                    ],
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    verticalAlign: "top",
                }),
                new TableCell({
                    children: [
                        new Paragraph({
                            text: nationality,
                            style: "bodyText",
                        }),
                    ],
                    width: { size: 80, type: WidthType.PERCENTAGE },
                    verticalAlign: "top",
                }),
            ],
        })
    );

    // 3. EDUCATION SECTION
    if (data.education && data.education.length > 0) {
        console.log('✅ Adding Education section:', data.education.length, 'items');

        tableRows.push(
            new TableRow({
                children: [
                    new TableCell({
                        children: [
                            new Paragraph({
                                text: "Education",
                                style: "sectionHeader",
                            }),
                        ],
                        width: { size: 20, type: WidthType.PERCENTAGE },
                        verticalAlign: "top",
                    }),
                    new TableCell({
                        children: data.education.map(edu => {
                            let educationText = '';
                            if (edu.degree) educationText += edu.degree;
                            if (edu.institution) educationText += `, ${edu.institution}`;
                            if (edu.graduationDate) educationText += ` (${edu.graduationDate})`;
                            if (edu.distinction) educationText += `, ${edu.distinction}`;

                            return new Paragraph({
                                text: educationText || 'Education details',
                                style: "bodyText",
                                spacing: { after: 120 },
                            });
                        }),
                        width: { size: 80, type: WidthType.PERCENTAGE },
                        verticalAlign: "top",
                    }),
                ],
            })
        );
    } else {
        console.log('❌ Skipping Education section - not found or empty');
    }

    // 4. WORK EXPERIENCE SECTION
    if (data.workExperience && data.workExperience.length > 0) {
        console.log('✅ Adding Work Experience section:', data.workExperience.length, 'items');

        tableRows.push(
            new TableRow({
                children: [
                    new TableCell({
                        children: [
                            new Paragraph({
                                text: "Experience",
                                style: "sectionHeader",
                            }),
                        ],
                        width: { size: 20, type: WidthType.PERCENTAGE },
                        verticalAlign: "top",
                    }),
                    new TableCell({
                        children: data.workExperience.flatMap(work => {
                            const workParagraphs = [];

                            // Job title and company
                            const jobHeader = `${work.position || 'Position'}${work.company ? ` - ${work.company}` : ''}`;
                            workParagraphs.push(
                                new Paragraph({
                                    text: jobHeader,
                                    style: "bodyText",
                                    spacing: { after: 60, before: 120 },
                                    run: { bold: true },
                                })
                            );

                            // Date range
                            const dateRange = `${work.startDate || ''} - ${work.endDate || 'present'}`;
                            workParagraphs.push(
                                new Paragraph({
                                    text: dateRange,
                                    style: "bodyText",
                                    spacing: { after: 60 },
                                })
                            );

                            // Description
                            if (work.description) {
                                workParagraphs.push(
                                    new Paragraph({
                                        text: work.description,
                                        style: "bodyText",
                                        spacing: { after: 120 },
                                    })
                                );
                            }

                            return workParagraphs;
                        }),
                        width: { size: 80, type: WidthType.PERCENTAGE },
                        verticalAlign: "top",
                    }),
                ],
            })
        );
    } else {
        console.log('❌ Skipping Work Experience section - not found or empty');
    }

    // 5. PUBLICATIONS SECTION
    if (data.publications && data.publications.length > 0) {
        console.log('✅ Adding Publications section:', data.publications.length, 'items');

        tableRows.push(
            new TableRow({
                children: [
                    new TableCell({
                        children: [
                            new Paragraph({
                                text: "Publications",
                                style: "sectionHeader",
                            }),
                        ],
                        width: { size: 20, type: WidthType.PERCENTAGE },
                        verticalAlign: "top",
                    }),
                    new TableCell({
                        children: data.publications.slice(0, 10).map(pub => { // Limit to first 10 publications
                            let publicationText = '';

                            if (pub.authors) {
                                const authors = Array.isArray(pub.authors) ? pub.authors.join(', ') : pub.authors;
                                publicationText += `${authors}. `;
                            }
                            if (pub.date || pub.year) {
                                publicationText += `(${pub.date || pub.year}). `;
                            }
                            if (pub.title) {
                                publicationText += `"${pub.title}". `;
                            }
                            if (pub.publication || pub.journal) {
                                publicationText += `${pub.publication || pub.journal}.`;
                            }

                            return new Paragraph({
                                text: publicationText || 'Publication details',
                                style: "bodyText",
                                spacing: { after: 120 },
                            });
                        }),
                        width: { size: 80, type: WidthType.PERCENTAGE },
                        verticalAlign: "top",
                    }),
                ],
            })
        );
    } else {
        console.log('❌ Skipping Publications section - not found or empty');
    }

    // Create the main table
    const table = new Table({
        rows: tableRows,
        width: {
            size: 100,
            type: WidthType.PERCENTAGE,
        },
        borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
        },
    });

    content.push(table);
    return content;
}

/**
 * Creates the IOD PARC header with contact information and logo
 * @param {Object} cvData - CV data
 * @param {boolean} includeLogog - Whether to include logo (first page only)
 * @returns {Header} - Header object
 */
function createIODPARCHeader(cvData, includeLogo = false) {
    const headerElements = [];

    // Add logo on first page only
    if (includeLogo) {
        try {
            const logoPath = path.join(__dirname, '../../Logo.png');
            if (fs.existsSync(logoPath)) {
                const logoImage = fs.readFileSync(logoPath);
                headerElements.push(
                    new Paragraph({
                        children: [
                            new ImageRun({
                                data: logoImage,
                                transformation: {
                                    width: 100,
                                    height: 50,
                                },
                            }),
                        ],
                        alignment: AlignmentType.RIGHT,
                        spacing: { after: 240 },
                    })
                );
            }
        } catch (error) {
            console.log('Logo not found, continuing without logo');
        }
    }

    // IOD PARC Contact Information
    headerElements.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: "Omega Court",
                    size: 20,
                    color: "666666",
                    font: "Arial",
                }),
                new TextRun({
                    text: "\tTelephone // +44 (0) 114 267 3620",
                    size: 20,
                    color: "666666",
                    font: "Arial",
                }),
            ],
            spacing: { after: 60 },
        })
    );

    headerElements.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: "362 Cemetery Road",
                    size: 20,
                    color: "666666",
                    font: "Arial",
                }),
                new TextRun({
                    text: "\tFacsimile // +44 (0) 114 267 3629",
                    size: 20,
                    color: "666666",
                    font: "Arial",
                }),
            ],
            spacing: { after: 60 },
        })
    );

    headerElements.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: "Sheffield",
                    size: 20,
                    color: "666666",
                    font: "Arial",
                }),
                new TextRun({
                    text: "\tWebsite // www.iodparc.com",
                    size: 20,
                    color: "666666",
                    font: "Arial",
                }),
            ],
            spacing: { after: 60 },
        })
    );

    headerElements.push(
        new Paragraph({
            text: "S11 8FT",
            style: "headerText",
            spacing: { after: 120 },
        })
    );

    return new Header({
        children: headerElements,
    });
}

/**
 * Creates a simple footer with just page numbers
 * @returns {Footer} - Footer object
 */
function createSimpleFooter() {
    return new Footer({
        children: [
            new Paragraph({
                children: [
                    new TextRun({
                        text: "Page ",
                        size: 20,
                        color: "666666",
                        font: "Arial",
                    }),
                    new TextRun({
                        children: ["PAGE_NUMBER"],
                        size: 20,
                        color: "666666",
                        font: "Arial",
                    }),
                    new TextRun({
                        text: " of ",
                        size: 20,
                        color: "666666",
                        font: "Arial",
                    }),
                    new TextRun({
                        children: ["TOTAL_PAGES"],
                        size: 20,
                        color: "666666",
                        font: "Arial",
                    }),
                ],
                alignment: AlignmentType.CENTER,
            }),
        ],
    });
}

module.exports = {
    generateResumeDocx,
}; 