const docx = require('docx');
const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableCell,
    TableRow,
    WidthType,
    VerticalAlign,
    AlignmentType,
    BorderStyle
} = docx;

// Define the standard IOD PARC branding and fonts
const IOD_PARC_BLUE = "2c5aa0";
const FONT_FAMILY = "Calibri";

/**
 * Creates the left-hand header cell (e.g., "Profile").
 * @param {string} text The header text.
 * @param {number} rowSpan The number of rows for this cell to span.
 * @returns {TableCell} A formatted table cell.
 */
function createHeaderCell(text, rowSpan = 1) {
    return new TableCell({
        children: [new Paragraph({
            children: [new TextRun({
                text: text,
                font: FONT_FAMILY,
                size: 22, // 11pt
                bold: true,
                color: IOD_PARC_BLUE,
            })],
        })],
        verticalAlign: VerticalAlign.TOP,
        rowSpan: rowSpan,
        borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "auto" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
            left: { style: BorderStyle.NONE, size: 0, color: "auto" },
            right: { style: BorderStyle.NONE, size: 0, color: "auto" },
        },
    });
}

/**
 * Creates the right-hand content cell.
 * @param {Paragraph[]} paragraphs An array of Paragraph objects.
 * @returns {TableCell} A formatted table cell.
 */
function createContentCell(paragraphs) {
    return new TableCell({
        children: paragraphs,
        verticalAlign: VerticalAlign.TOP,
        borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "auto" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
            left: { style: BorderStyle.NONE, size: 0, color: "auto" },
            right: { style: BorderStyle.NONE, size: 0, color: "auto" },
        },
    });
}

/**
 * Creates an array of paragraphs for a single experience entry, handling bullets.
 * @param {object} exp A single experience object from the processed JSON.
 * @returns {Paragraph[]} An array of formatted Paragraph objects.
 */
function createExperienceParagraphs(exp) {
    const descriptionParagraphs = (exp.description || "").split('\n').filter(line => line.trim() !== "").map(line => {
        const trimmedLine = line.trim();
        const isBullet = ['•', '-', '–', '*', '(i)', '(ii)', '(iii)', '(iv)'].some(char => trimmedLine.startsWith(char));
        const textContent = isBullet ? trimmedLine.substring(1).trim() : trimmedLine;

        return new Paragraph({
            children: [new TextRun({ text: textContent, font: FONT_FAMILY, size: 22 })],
            alignment: AlignmentType.JUSTIFIED,
            bullet: isBullet ? { level: 0 } : undefined,
            spacing: { after: 80 }
        });
    });

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
        new Paragraph({ text: "", spacing: { after: 240 } }) // Add space between entries
    ];
}

/**
 * The main function to generate the complete DOCX document.
 * @param {object} data The final, structured JSON data of the CV.
 * @returns {Promise<Buffer>} A buffer representing the DOCX file.
 */
async function generateIodParcDocx(data) {
    const allRows = [];

    // --- Profile ---
    allRows.push(new TableRow({ children: [createHeaderCell("Profile"), createContentCell([new Paragraph({ text: data.profile, alignment: AlignmentType.JUSTIFIED })])] }));

    // --- Nationality & Languages (FIXED) ---
    // This fixes the "[object Object]" bug by correctly formatting the language data.
    const languageString = (data.languages || []).map(l => `${l.language} (${l.proficiency})`).join(', ');
    allRows.push(new TableRow({ children: [createHeaderCell("Nationality & Languages"), createContentCell([new Paragraph(data.nationality), new Paragraph(languageString)])] }));

    // --- Qualifications ---
    const qualContent = (data.qualifications || []).map(q => new Paragraph(`${q.year}, ${q.degree}, ${q.institution}\n${q.details}`));
    allRows.push(new TableRow({ children: [createHeaderCell("Qualifications"), createContentCell(qualContent)] }));

    // --- Country Work Experience ---
    allRows.push(new TableRow({ children: [createHeaderCell("Country work experience"), createContentCell([new Paragraph((data.countryWorkExperience || []).join(', '))])] }));

    // --- Experience Section (Corrected rowSpan logic) ---
    const experienceEntries = data.experience || [];
    if (experienceEntries.length > 0) {
        // The first row gets the header cell with a rowSpan covering all experience entries.
        const firstExpRow = new TableRow({
            children: [
                createHeaderCell("Experience:", experienceEntries.length),
                createContentCell(createExperienceParagraphs(experienceEntries[0])),
            ],
        });
        allRows.push(firstExpRow);

        // Subsequent rows for experience ONLY get the content cell.
        for (let i = 1; i < experienceEntries.length; i++) {
            const subsequentExpRow = new TableRow({
                children: [createContentCell(createExperienceParagraphs(experienceEntries[i]))],
            });
            allRows.push(subsequentExpRow);
        }
    }

    // --- Publications ---
    const pubContent = (data.publications || []).map(p => new Paragraph(p.citation));
    allRows.push(new TableRow({ children: [createHeaderCell("Publications"), createContentCell(pubContent)] }));

    // --- Document Assembly ---
    const doc = new Document({
        creator: "BD Assistant",
        title: "IOD PARC Formatted CV",
        sections: [{
            headers: {
                default: new docx.Header({
                    children: [new Paragraph({ text: "Richard Burge", style: "Heading1", alignment: AlignmentType.CENTER })],
                }),
            },
            footers: {
                default: new docx.Footer({
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [new TextRun({ children: [docx.PageNumber.CURRENT, " | ", docx.PageNumber.TOTAL_PAGES], font: FONT_FAMILY, size: 18 })],
                        }),
                    ],
                }),
            },
            properties: { page: { margin: { top: 1000, right: 720, bottom: 720, left: 720 } } },
            children: [
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnWidths: [2500, 7500],
                    rows: allRows, // Use the dynamically created rows
                    borders: { // Make all table borders invisible for a clean layout
                        top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                        bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
                        left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                        right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
                        insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    },
                }),
            ],
        }],
        styles: { // Define styles for consistency
            paragraphStyles: [{
                id: "Normal",
                name: "Normal",
                run: { font: FONT_FAMILY, size: 22, color: "000000" },
                paragraph: { alignment: AlignmentType.JUSTIFIED, spacing: { after: 80 } },
            }],
            characterStyles: [],
            headingStyles: [{
                id: "Heading1",
                name: "Header",
                run: { font: FONT_FAMILY, size: 48, bold: true, color: IOD_PARC_BLUE, },
                paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 240 } },
            }],
        },
    });

    return Packer.toBuffer(doc);
}

module.exports = { generateIodParcDocx }; 