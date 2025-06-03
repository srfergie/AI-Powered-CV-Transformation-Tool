const docx = require('docx');
const {
    Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow,
    WidthType, VerticalAlign, AlignmentType, BorderStyle, Header, Footer, PageNumber
} = docx;

const FONT_FAMILY = "Calibri";

function createHeaderCell(text, rowSpan = 1) {
    return new TableCell({
        children: [new Paragraph({
            children: [new TextRun({
                text: text,
                font: FONT_FAMILY,
                size: 22,
                bold: true,
                color: "000000",
            })],
        })],
        verticalAlign: VerticalAlign.TOP,
        rowSpan: rowSpan,
        borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE }
        },
    });
}

function createContentCell(paragraphs) {
    return new TableCell({
        children: paragraphs,
        verticalAlign: VerticalAlign.TOP,
        borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE }
        },
    });
}

function createNameRow(name) {
    return new TableRow({
        children: [
            // Empty cell
            new TableCell({
                children: [new Paragraph({ text: "" })],
                width: { size: 15, type: WidthType.PERCENTAGE },
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
                        font: FONT_FAMILY,
                        size: 48,
                        color: "000000",
                        bold: false
                    })],
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 400 }
                })],
                columnSpan: 3,
                width: { size: 85, type: WidthType.PERCENTAGE },
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

function createExperienceParagraphs(exp) {
    const descriptionParagraphs = (exp.description || "").split('\n')
        .filter(line => line.trim() !== "")
        .map(line => {
            const trimmedLine = line.trim();
            const isBullet = ['•', '-', '–', '*', '(i)', '(ii)', '(iii)', '(iv)'].some(char => trimmedLine.startsWith(char));
            const textContent = isBullet ? trimmedLine.substring(1).trim() : trimmedLine;

            return new Paragraph({
                children: [new TextRun({ text: textContent, font: FONT_FAMILY, size: 32, color: "000000" })],
                alignment: AlignmentType.JUSTIFIED,
                bullet: isBullet ? { level: 0 } : undefined,
                spacing: { after: 80 }
            });
        });

    return [
        new Paragraph({
            children: [
                new TextRun({ text: `${exp.dates}, `, font: FONT_FAMILY, size: 32, bold: true, color: "000000" }),
                new TextRun({ text: `${exp.role} | `, font: FONT_FAMILY, size: 32, bold: true, color: "000000" }),
                new TextRun({ text: `${exp.client} | `, font: FONT_FAMILY, size: 32, bold: true, italics: true, color: "000000" }),
                new TextRun({ text: exp.location, font: FONT_FAMILY, size: 32, color: "000000" }),
            ],
            spacing: { after: 120 }
        }),
        ...descriptionParagraphs,
        new Paragraph({ text: "", spacing: { after: 240 } })
    ];
}

async function generateIodParcDocx(data) {
    console.log('Generating IOD PARC formatted DOCX...');
    console.log('Data preview:', {
        hasProfile: !!data.profile,
        experienceCount: data.experience?.length || 0,
        publicationsCount: data.publications?.length || 0,
        qualificationsCount: data.qualifications?.length || 0
    });

    const documentChildren = [];
    const allRows = [];

    // Add CV Applicant Name as first table row
    const applicantName = data.personalDetails?.name || data.name || "CV Applicant";
    allRows.push(createNameRow(applicantName));

    // --- Profile Section ---
    if (data.profile) {
        const profileParas = (data.profile || "").split('\n').filter(p => p.trim() !== "").map(p => new Paragraph({
            children: [new TextRun({ text: p, font: FONT_FAMILY, size: 32, color: "000000" })],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 120 }
        }));
        allRows.push(new TableRow({
            children: [
                createHeaderCell("Profile"),
                new TableCell({
                    children: profileParas,
                    columnSpan: 3,
                    verticalAlign: VerticalAlign.TOP,
                    borders: {
                        top: { style: BorderStyle.NONE },
                        bottom: { style: BorderStyle.NONE },
                        left: { style: BorderStyle.NONE },
                        right: { style: BorderStyle.NONE }
                    },
                })
            ]
        }));
    }

    // --- Nationality & Languages (4-column layout) ---
    const languageString = (data.languages || []).map(l => `${l.language} (${l.proficiency})`).join(', ');
    allRows.push(new TableRow({
        children: [
            createHeaderCell("Nationality"),
            new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({ text: data.nationality || 'Not specified', font: FONT_FAMILY, size: 32, color: "000000" })]
                })],
                width: { size: 25, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE }
                },
            }),
            new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({ text: "Languages", font: FONT_FAMILY, size: 22, bold: true, color: "000000" })]
                })],
                width: { size: 15, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE }
                },
            }),
            new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({ text: languageString || 'Not specified', font: FONT_FAMILY, size: 32, color: "000000" })]
                })],
                width: { size: 45, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE }
                },
            })
        ]
    }));

    // --- Qualifications ---
    const qualContent = (data.qualifications || []).map(q =>
        new Paragraph({
            children: [
                new TextRun({ text: `${q.year}, ${q.degree}, ${q.institution}`, font: FONT_FAMILY, size: 32, bold: true, color: "000000" }),
                new TextRun({ text: `\n${q.details || ''}`, font: FONT_FAMILY, size: 32, italics: true, color: "000000" }),
            ],
            spacing: { after: 120 }
        })
    );

    if (qualContent.length === 0) {
        qualContent.push(new Paragraph({
            children: [new TextRun({ text: 'No qualifications found', font: FONT_FAMILY, size: 32, color: "000000" })]
        }));
    }

    allRows.push(new TableRow({
        children: [
            createHeaderCell("Qualifications"),
            new TableCell({
                children: qualContent,
                columnSpan: 3,
                verticalAlign: VerticalAlign.TOP,
                borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE }
                },
            })
        ]
    }));

    // --- Country work experience ---
    const countryExpPara = new Paragraph({
        children: [new TextRun({ text: (data.countryWorkExperience || []).join(', ') || 'Not specified', font: FONT_FAMILY, size: 32, color: "000000" })],
        spacing: { after: 120 }
    });
    allRows.push(new TableRow({
        children: [
            createHeaderCell("Country work experience"),
            new TableCell({
                children: [countryExpPara],
                columnSpan: 3,
                verticalAlign: VerticalAlign.TOP,
                borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE }
                },
            })
        ]
    }));

    // --- Experience Section with rowSpan ---
    const experienceEntries = data.experience || [];
    if (experienceEntries.length > 0) {
        console.log(`Processing ${experienceEntries.length} experience entries with rowspan`);

        // The first row gets the header cell with a rowSpan covering all experience entries.
        const firstExpRow = new TableRow({
            children: [
                createHeaderCell("Experience", experienceEntries.length),
                new TableCell({
                    children: createExperienceParagraphs(experienceEntries[0]),
                    columnSpan: 3,
                    verticalAlign: VerticalAlign.TOP,
                    borders: {
                        top: { style: BorderStyle.NONE },
                        bottom: { style: BorderStyle.NONE },
                        left: { style: BorderStyle.NONE },
                        right: { style: BorderStyle.NONE }
                    },
                })
            ],
        });
        allRows.push(firstExpRow);

        // Subsequent rows for experience ONLY get the content cell.
        for (let i = 1; i < experienceEntries.length; i++) {
            const subsequentExpRow = new TableRow({
                children: [new TableCell({
                    children: createExperienceParagraphs(experienceEntries[i]),
                    columnSpan: 3,
                    verticalAlign: VerticalAlign.TOP,
                    borders: {
                        top: { style: BorderStyle.NONE },
                        bottom: { style: BorderStyle.NONE },
                        left: { style: BorderStyle.NONE },
                        right: { style: BorderStyle.NONE }
                    },
                })],
            });
            allRows.push(subsequentExpRow);
        }
    } else {
        // No experience found
        allRows.push(new TableRow({
            children: [
                createHeaderCell("Experience"),
                new TableCell({
                    children: [
                        new Paragraph({
                            children: [new TextRun({ text: 'No experience entries found', font: FONT_FAMILY, size: 32, color: "000000" })]
                        })
                    ],
                    columnSpan: 3,
                    verticalAlign: VerticalAlign.TOP,
                    borders: {
                        top: { style: BorderStyle.NONE },
                        bottom: { style: BorderStyle.NONE },
                        left: { style: BorderStyle.NONE },
                        right: { style: BorderStyle.NONE }
                    },
                })
            ],
        }));
    }

    // --- Publications ---
    const pubContent = (data.publications || []).map(p =>
        new Paragraph({
            children: [new TextRun({ text: p.citation || 'Citation not available', font: FONT_FAMILY, size: 32, color: "000000" })],
            spacing: { after: 120 }
        })
    );

    if (pubContent.length === 0) {
        pubContent.push(new Paragraph({
            children: [new TextRun({ text: 'No publications found', font: FONT_FAMILY, size: 32, color: "000000" })]
        }));
    }

    allRows.push(new TableRow({
        children: [
            createHeaderCell("Publications"),
            new TableCell({
                children: pubContent,
                columnSpan: 3,
                verticalAlign: VerticalAlign.TOP,
                borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE }
                },
            })
        ]
    }));

    console.log(`Generated ${allRows.length} table rows`);

    // Add the main content table to document children
    documentChildren.push(
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [1500, 2500, 1500, 2500], // 4-column layout
            rows: allRows,
            borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE }
            },
        })
    );

    const doc = new Document({
        creator: "BD Assistant",
        styles: {
            paragraphStyles: [{
                id: "Normal",
                name: "Normal",
                run: { font: FONT_FAMILY, size: 32, color: "000000" },
                paragraph: {
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { after: 80 }
                },
            }],
        },
        sections: [{
            // Remove the header - no name in header anymore
            footers: {
                default: new Footer({
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [new TextRun({
                                text: "Page ",
                                font: FONT_FAMILY,
                                size: 18
                            }), PageNumber.CURRENT, new TextRun({
                                text: " of ",
                                font: FONT_FAMILY,
                                size: 18
                            }), PageNumber.TOTAL_PAGES],
                        }),
                    ],
                }),
            },
            properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
            children: documentChildren,
        }],
    });

    console.log('DOCX document structure created, generating buffer...');
    const buffer = await Packer.toBuffer(doc);
    console.log(`DOCX buffer generated: ${buffer.length} bytes`);

    return buffer;
}

module.exports = { generateIodParcDocx }; 