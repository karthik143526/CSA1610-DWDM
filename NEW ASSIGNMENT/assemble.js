const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Header, Footer,
  PageNumber, LevelFormat, convertInchesToTwip,
} = require("docx");

const p1 = require("./build_report.js");
const p2 = require("./build_report_part2.js");
const p3 = require("./build_report_part3.js");

const GREY = "595959";

const header = new Header({
  children: [new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({
      text: "CSA1610 – Data Warehousing and Data Mining | Banking Fraud Classification Assignment",
      size: 16, color: GREY, italics: true,
    })],
  })],
});

const footer = new Footer({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: "Page ", size: 18, color: GREY }),
      new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GREY }),
      new TextRun({ text: " of ", size: 18, color: GREY }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: GREY }),
    ],
  })],
});

const allBody = [
  ...p1.cover, p1.coverTable, ...p1.coverFooter,
  ...p1.toc,
  ...p1.sec1,
  ...p1.sec2,
  ...p1.sec3,
  ...p1.sec4,
  ...p1.sec5,
  ...p2.sec6,
  ...p2.sec7,
  ...p2.sec8,
  ...p3.sec9,
  ...p3.sec10,
  ...p3.sec11,
  ...p3.sec12,
];

const doc = new Document({
  creator: "CSA1610 Assignment Group",
  title: "Design and Development of an Integrated Data Warehouse and Data Mining System for Banking Transaction Analysis and Fraud Classification",
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22 } },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, color: "1F3864", font: "Calibri" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, color: "2C5F8A", font: "Calibri" },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 23, bold: true, italics: true, color: "2C5F8A", font: "Calibri" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 },
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 }, // A4
        margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 },
      },
    },
    headers: { default: header },
    footers: { default: footer },
    children: allBody,
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("/mnt/user-data/outputs/CSA1610_Banking_DWDM_Fraud_Classification_Assignment.docx", buffer);
  console.log("Document written successfully.");
});
