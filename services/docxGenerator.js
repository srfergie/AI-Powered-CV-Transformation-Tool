const docx = require('docx');
const {
    Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow,
    WidthType, VerticalAlign, AlignmentType, BorderStyle
} = docx;

const IOD_PARC_BLUE = "2c5aa0";
const FONT_FAMILY = "Calibri";

function createHeaderCell(text, rowSpan = 1) {
    return new TableCell({
        children: [new Paragraph({
            children: [new TextRun({ text, font: FONT_FAMILY, size: 22, bold: true, color: IOD_PARC_BLUE })],
        })],
        verticalAlign: VerticalAlign.TOP,
        rowSpan,
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

function createExperienceParagraphs(exp) {
    const descriptionParagraphs = (exp.description || "").split('\n')
        .filter(line => line.trim() !== "")
        .map(line => new Paragraph({
            children: [new TextRun({ text: line, font: FONT_FAMILY, size: 22 })],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 80 },
        }));

    return [
        new Paragraph({
            children: [
                new TextRun({ text: `${exp.dates}, `, font: FONT_FAMILY, size: 22, bold: true }),
                new TextRun({ text: `${exp.role} | `, font: FONT_FAMILY, size: 22, bold: true }),
                new TextRun({ text: `${exp.client} | `, font: FONT_FAMILY, size: 22, bold: true, italics: true }),
                new TextRun({ text: exp.location, font: FONT_FAMILY, size: 22 }),
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

    const allRows = [];

    // --- Profile Section ---
    if (data.profile) {
        allRows.push(new TableRow({
            children: [
                createHeaderCell("Profile"),
                createContentCell([new Paragraph({
                    children: [new TextRun({ text: data.profile, font: FONT_FAMILY, size: 22 })],
                    alignment: AlignmentType.JUSTIFIED
                })])
            ]
        }));
    }

    // --- Nationality & Languages ---
    const languageString = (data.languages || []).map(l => `${l.language} (${l.proficiency})`).join(', ');
    allRows.push(new TableRow({
        children: [
            createHeaderCell("Nationality & Languages"),
            createContentCell([
                new Paragraph({
                    children: [new TextRun({ text: data.nationality || 'Not specified', font: FONT_FAMILY, size: 22 })]
                }),
                new Paragraph({
                    children: [new TextRun({ text: languageString || 'Not specified', font: FONT_FAMILY, size: 22 })]
                })
            ])
        ]
    }));

    // --- Qualifications ---
    const qualContent = (data.qualifications || []).map(q =>
        new Paragraph({
            children: [new TextRun({
                text: `${q.year}, ${q.degree}, ${q.institution}\n${q.details || ''}`,
                font: FONT_FAMILY,
                size: 22
            })],
            spacing: { after: 120 }
        })
    );

    if (qualContent.length === 0) {
        qualContent.push(new Paragraph({
            children: [new TextRun({ text: 'No qualifications found', font: FONT_FAMILY, size: 22 })]
        }));
    }

    allRows.push(new TableRow({
        children: [
            createHeaderCell("Qualifications"),
            createContentCell(qualContent)
        ]
    }));

    // --- Country work experience ---
    allRows.push(new TableRow({
        children: [
            createHeaderCell("Country work experience"),
            createContentCell([
                new Paragraph({
                    children: [new TextRun({
                        text: (data.countryWorkExperience || []).join(', ') || 'Not specified',
                        font: FONT_FAMILY,
                        size: 22
                    })]
                })
            ])
        ]
    }));

    // --- Experience Section with rowSpan ---
    const experienceEntries = data.experience || [];
    if (experienceEntries.length > 0) {
        // First experience entry with header
        allRows.push(new TableRow({
            children: [
                createHeaderCell("Experience", experienceEntries.length),
                createContentCell(createExperienceParagraphs(experienceEntries[0])),
            ],
        }));

        // Subsequent experience entries (no header)
        for (let i = 1; i < experienceEntries.length; i++) {
            allRows.push(new TableRow({
                children: [createContentCell(createExperienceParagraphs(experienceEntries[i]))]
            }));
        }
    } else {
        // No experience found
        allRows.push(new TableRow({
            children: [
                createHeaderCell("Experience"),
                createContentCell([
                    new Paragraph({
                        children: [new TextRun({ text: 'No experience entries found', font: FONT_FAMILY, size: 22 })]
                    })
                ])
            ],
        }));
    }

    // --- Publications ---
    const pubContent = (data.publications || []).map(p =>
        new Paragraph({
            children: [new TextRun({ text: p.citation || 'Citation not available', font: FONT_FAMILY, size: 22 })],
            spacing: { after: 120 }
        })
    );

    if (pubContent.length === 0) {
        pubContent.push(new Paragraph({
            children: [new TextRun({ text: 'No publications found', font: FONT_FAMILY, size: 22 })]
        }));
    }

    allRows.push(new TableRow({
        children: [
            createHeaderCell("Publications"),
            createContentCell(pubContent)
        ]
    }));

    console.log(`Generated ${allRows.length} table rows`);

    const doc = new Document({
        creator: "BD Assistant",
        styles: {
            paragraphStyles: [{
                id: "Normal",
                name: "Normal",
                run: { font: FONT_FAMILY, size: 22, color: "000000" },
                paragraph: {
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { after: 80 }
                },
            }],
        },
        sections: [{
            children: [
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnWidths: [2500, 7500], // 25% for headers, 75% for content
                    rows: allRows,
                    borders: {
                        top: { style: BorderStyle.NONE },
                        bottom: { style: BorderStyle.NONE },
                        left: { style: BorderStyle.NONE },
                        right: { style: BorderStyle.NONE },
                        insideHorizontal: { style: BorderStyle.NONE },
                        insideVertical: { style: BorderStyle.NONE }
                    },
                }),
            ],
        }],
    });

    console.log('DOCX document structure created, generating buffer...');
    const buffer = await Packer.toBuffer(doc);
    console.log(`DOCX buffer generated: ${buffer.length} bytes`);

    return buffer;
}

module.exports = { generateIodParcDocx }; 