const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ImageRun, ShadingType, Header, Footer,
  PageNumber, TableOfContents, LevelFormat, PageBreak, VerticalAlign, convertInchesToTwip
} = require("docx");

const FIG = "/home/claude/bank_dwdm/figures/";

// ---------------------------------------------------------------- helpers
const NAVY = "1F3864";
const ACCENT = "2C5F8A";
const LIGHTBLUE = "DCE6F1";
const GREY = "595959";

function H1(text) {
  return new Paragraph({
    text, heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
  });
}
function H2(text) {
  return new Paragraph({
    text, heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140 },
  });
}
function H3(text) {
  return new Paragraph({
    text, heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
  });
}
function P(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 160, line: 276 },
    children: [new TextRun({ text, ...opts })],
  });
}
function PBold(label, rest) {
  return new Paragraph({
    spacing: { after: 160, line: 276 },
    children: [new TextRun({ text: label, bold: true }), new TextRun({ text: rest })],
  });
}
function bullet(text, level = 0) {
  return new Paragraph({
    text, bullet: { level }, spacing: { after: 90, line: 264 },
  });
}
function numbered(text, ref) {
  return new Paragraph({
    text, numbering: { reference: ref, level: 0 }, spacing: { after: 90, line: 264 },
  });
}
function caption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 260, before: 60 },
    children: [new TextRun({ text, italics: true, size: 20, color: GREY })],
  });
}
function codeBlock(lines) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: allBorders("D9D9D9"),
    rows: [new TableRow({
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: "F2F2F2" },
        margins: { top: 120, bottom: 120, left: 160, right: 160 },
        children: lines.map(l => new Paragraph({
          spacing: { after: 20 },
          children: [new TextRun({ text: l.length ? l : " ", font: "Consolas", size: 18 })],
        })),
      })],
    })],
  });
}
function allBorders(color) {
  const b = { style: BorderStyle.SINGLE, size: 2, color };
  return { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b };
}
function imgDims(w, h, targetW) {
  return { width: targetW, height: Math.round(targetW * h / w) };
}
function image(file, w, h, targetW, centered = true) {
  const data = fs.readFileSync(FIG + file);
  const dims = imgDims(w, h, targetW);
  return new Paragraph({
    alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { before: 120, after: 60 },
    children: [new ImageRun({ data, transformation: dims, type: "png" })],
  });
}
function headerCell(text, widthPct) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: ACCENT },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 20 })],
    })],
  });
}
function bodyCell(text, widthPct, opts = {}) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: opts.shade ? { type: ShadingType.CLEAR, fill: opts.shade } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
    children: [new Paragraph({
      children: [new TextRun({ text, size: 20, bold: !!opts.bold })],
    })],
  });
}
function simpleTable(headers, rows, widths) {
  const w = widths || headers.map(() => Math.floor(100 / headers.length));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: allBorders("BFBFBF"),
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => headerCell(h, w[i])) }),
      ...rows.map((r, ridx) => new TableRow({
        children: r.map((c, i) => bodyCell(String(c), w[i], { shade: ridx % 2 ? "F7F9FC" : undefined })),
      })),
    ],
  });
}

// ---------------------------------------------------------------- image dims lookup
const D = {
  arch: [1476, 359], star: [1360, 1051],
  c1: [1350, 675], c2: [1350, 750], c3: [975, 975], c4: [1350, 750],
  c5: [1200, 675], c6: [1350, 900], c7: [1350, 750], c8: [1200, 750],
  cmdt: [630, 540], cmnb: [630, 540], cmsvm: [630, 540],
};

// ================================================================
// COVER PAGE
// ================================================================
const cover = [
  new Paragraph({ spacing: { before: 600 }, children: [] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: "CSA1610 – DATA WAREHOUSING AND DATA MINING", bold: true, size: 26, color: ACCENT })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 500 },
    children: [new TextRun({ text: "Course Assignment Report", size: 22, color: GREY })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200, before: 800 },
    children: [new TextRun({
      text: "Design and Development of an Integrated Data Warehouse and Data Mining System for Banking Transaction Analysis and Fraud Classification",
      bold: true, size: 32,
    })],
  }),
  new Paragraph({ spacing: { before: 1000 }, children: [] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text: "Submitted by", size: 22, bold: true })],
  }),
];

const coverTable = new Table({
  width: { size: 70, type: WidthType.PERCENTAGE },
  alignment: AlignmentType.CENTER,
  borders: allBorders("BFBFBF"),
  rows: [
    new TableRow({ tableHeader: true, children: [headerCell("Name", 40), headerCell("Register Number", 30), headerCell("Role", 30)] }),
    new TableRow({ children: [bodyCell("[Student Name 1]", 40), bodyCell("[Reg. No.]", 30), bodyCell("Team Lead", 30)] }),
    new TableRow({ children: [bodyCell("[Student Name 2]", 40), bodyCell("[Reg. No.]", 30), bodyCell("Member", 30)] }),
    new TableRow({ children: [bodyCell("[Student Name 3]", 40), bodyCell("[Reg. No.]", 30), bodyCell("Member", 30)] }),
  ],
});

const coverFooter = [
  new Paragraph({ spacing: { before: 500 }, children: [] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 900 },
    children: [new TextRun({ text: "Course Outcomes Addressed: CO1, CO2, CO3", size: 20, color: GREY })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [new TextRun({ text: "SDG Mapping: SDG 8 – Decent Work & Economic Growth | SDG 9 – Industry, Innovation & Infrastructure | SDG 12 – Responsible Consumption & Production", size: 20, color: GREY })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400 },
    children: [new TextRun({ text: "September 2026", size: 20, color: GREY })],
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

// ================================================================
// TABLE OF CONTENTS
// ================================================================
const toc = [
  H1("Table of Contents"),
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
  new Paragraph({ children: [new PageBreak()] }),
];

// ================================================================
// 1. PROBLEM STATEMENT
// ================================================================
const sec1 = [
  H1("1. Problem Statement"),
  P("A commercial bank currently maintains customer, account, transaction, branch, payment and date information across multiple, disconnected operational systems: a Core Banking System (customers and accounts), a Branch Management System, a Payment Gateway, and a Transaction Processing System. Because these systems were built independently, the data they hold is inconsistent in format, contains duplicate and missing records, and cannot easily be queried together for analytical or regulatory purposes."),
  P("The bank needs (a) a consolidated Data Warehouse that integrates these sources into a single, query-friendly analytical model, and (b) a predictive data-mining component that can flag potentially fraudulent transactions in near real time. Fraud in banking transactions causes direct financial loss, regulatory exposure and reputational damage, so the ability to detect suspicious transactions quickly and accurately — while keeping false alarms manageable — is a core business requirement."),
  P("This project designs, implements, analyzes and evaluates an end-to-end Data Warehousing and Data Mining solution that extracts data from the four source systems, cleans and integrates it into a Star Schema, supports OLAP-style multidimensional analysis, and classifies transactions as Fraudulent or Legitimate using three different classification algorithms, which are then compared and evaluated for real-world deployment."),
];

// ================================================================
// 2. OBJECTIVE
// ================================================================
const sec2 = [
  H1("2. Objective"),
  P("The specific objectives of this assignment are to:"),
  bullet("Extract and integrate transaction data from multiple heterogeneous operational sources into a single analytical model."),
  bullet("Design a Star Schema suited to banking analytics, with a central fact table capturing transaction measures and conformed dimension tables for date, customer, account, branch and payment method."),
  bullet("Apply data preprocessing techniques — cleaning, integration, transformation, reduction and discretization — to handle missing values, duplicates, inconsistent records, outliers and irrelevant attributes."),
  bullet("Perform Roll-up, Drill-down, Slice, Dice and Pivot OLAP operations on the resulting data cube."),
  bullet("Analyze transaction volume, branch-wise transactions, monthly trends, payment-method patterns and customer transaction behaviour."),
  bullet("Develop classification models using Decision Tree, Naïve Bayes and SVM to classify transactions as Fraudulent or Legitimate."),
  bullet("Evaluate the models using Confusion Matrix, Accuracy, Precision, Recall, F1-score and Cross-validation."),
  bullet("Analyze the business consequences of False Positive and False Negative predictions in fraud detection."),
  bullet("Compare the three models and justify the most suitable one for deployment."),
  bullet("Evaluate privacy, security, fairness, scalability and ethical considerations of the overall solution."),
];

// ================================================================
// 3. REQUIREMENTS AND ENVIRONMENT USED
// ================================================================
const sec3 = [
  H1("3. Requirements and Environment Used"),
  H2("3.1 Software / Tools"),
  simpleTable(
    ["Component", "Tool / Library Used", "Purpose"],
    [
      ["Language", "Python 3.12", "ETL scripting, OLAP aggregation, machine learning"],
      ["Data handling", "pandas, numpy", "Data cleaning, integration, transformation, reduction"],
      ["Visualization", "matplotlib, seaborn", "Analytical charts and confusion-matrix heatmaps"],
      ["Machine Learning", "scikit-learn (sklearn)", "Decision Tree, Naïve Bayes, SVM, evaluation metrics, cross-validation"],
      ["Diagramming", "Graphviz", "Architecture and star-schema ER diagrams"],
      ["Alternative GUI tools", "KNIME Analytics Platform / Weka", "Equivalent no-code / low-code workflow for ETL, OLAP-style pivoting and classification (mapping given in Section 6.4)"],
      ["Version control", "Git / GitHub", "Source-code hosting for the deliverable submission"],
      ["Report generation", "Microsoft Word (.docx)", "Final assignment report"],
    ],
    [22, 34, 44]
  ),
  H2("3.2 Hardware / Runtime Environment"),
  bullet("Standard laptop/desktop: quad-core CPU, 8 GB RAM, 10 GB free disk space (sufficient for the dataset size used)."),
  bullet("No GPU is required — Decision Tree, Naïve Bayes and SVM on ~20,000 records train in well under a minute each on CPU."),
  H2("3.3 Dataset Used"),
  P("Because real customer banking data is confidential and cannot be used in a coursework setting, a realistic synthetic dataset was generated to simulate the four operational source systems described in the problem statement. The generator (Section 6.1) uses fixed random seeds for reproducibility and deliberately injects the data-quality problems (missing values, duplicates, inconsistent labels, outliers, sign errors) that a real integration project would encounter, so that the preprocessing stage has genuine work to do."),
  simpleTable(
    ["Source File", "Simulates", "Rows", "Key Columns"],
    [
      ["src_customers.csv", "Core Banking System — customers", "800", "customer_id, age, gender, city, segment"],
      ["src_accounts.csv", "Core Banking System — accounts", "1,000", "account_id, customer_id, account_type, branch_id"],
      ["src_branches.csv", "Branch Management System", "12", "branch_id, branch_name, region"],
      ["src_payment_methods.csv", "Payment Gateway", "6", "payment_method_id, payment_method, channel_type"],
      ["src_transactions_raw.csv", "Transaction Processing System (raw/dirty)", "20,200", "transaction_id, account_id, amount, datetime, location, device, is_fraud"],
    ],
    [30, 34, 12, 24]
  ),
  P("The transaction file spans one full calendar year (2024) across 12 branches, 6 payment methods and 5 device/channel types, with an engineered (but noisy, non-trivially separable) fraud label so that the classifiers face a realistic, imbalanced detection problem rather than an artificially clean one.", { italics: true }),
];

// ================================================================
// 4. DESIGN / PROPOSED SOLUTION
// ================================================================
const sec4 = [
  H1("4. Design / Proposed Solution"),
  H2("4.1 System Architecture"),
  P("The solution follows a classical four-layer Data Warehouse architecture: source systems, an ETL layer, the warehouse itself, and an analytics layer that feeds both OLAP reporting and data-mining consumers."),
  image("diagram1_architecture.png", ...D.arch, 580),
  caption("Figure 4.1 — End-to-end system architecture: source systems → ETL → Data Warehouse → OLAP / Data Mining → Consumption."),
  H2("4.2 Data Warehouse Schema Design — Star Schema"),
  P("A Star Schema (CO1) was chosen over a fully normalized Snowflake Schema because banking analytics workloads are dominated by aggregate queries (totals by branch, by month, by payment method) where query performance and simplicity for BI tools matter more than storage normalization. The single central fact table, FACT_TRANSACTIONS, is surrounded by five denormalized dimension tables sharing conformed keys."),
  image("diagram2_star_schema.png", ...D.star, 460),
  caption("Figure 4.2 — Star schema: FACT_TRANSACTIONS at the grain of one row per transaction, surrounded by DIM_DATE, DIM_CUSTOMER, DIM_ACCOUNT, DIM_BRANCH and DIM_PAYMENT_METHOD."),
  H3("Fact table grain and measures"),
  P("Grain: one row per individual banking transaction. Additive measures: transaction_amount, amount_norm (normalized amount), is_fraud (0/1, sums to fraud count), amount_outlier_flag. Degenerate/descriptive attributes carried on the fact for convenience: amount_band, hour_band, transaction_type, device_type, is_foreign_location."),
  H3("Note on Snowflaking"),
  P("DIM_ACCOUNT could be further normalized by splitting out a separate DIM_CUSTOMER_TYPE or by snowflaking DIM_BRANCH into DIM_REGION; this was intentionally avoided to keep join paths short for the OLAP engine and BI tools, in line with Kimball dimensional-modelling best practice for star schemas used in day-to-day reporting."),
  H2("4.3 ETL Strategy"),
  simpleTable(
    ["Stage", "Key Steps"],
    [
      ["Extract", "Read the four raw source files (customers, accounts, branches, payment methods, transactions) exactly as produced by the operational systems."],
      ["Transform — Cleaning", "Remove exact duplicate transaction rows; standardize inconsistent categorical labels (case/whitespace); correct sign errors (negative amounts); impute missing values (median for numeric, mode for categorical)."],
      ["Transform — Integration", "Join transactions with accounts → customers → branches → payment methods via foreign keys to build one denormalized analytic view."],
      ["Transform — Transformation", "Derive date-part attributes (year/quarter/month/weekday/hour); min-max normalize transaction amount."],
      ["Transform — Reduction & Discretization", "Drop irrelevant/non-informative attributes (irrelevant_flag_1, irrelevant_note); bucket amount and hour into bands (amount_band, hour_band) for interpretable classification features."],
      ["Load", "Populate the star schema: 1 fact table (FACT_TRANSACTIONS) + 5 dimension tables (DIM_DATE, DIM_CUSTOMER, DIM_ACCOUNT, DIM_BRANCH, DIM_PAYMENT_METHOD), each with a surrogate key."],
    ],
    [22, 78]
  ),
];

// ================================================================
// 5. ALGORITHM / PSEUDOCODE
// ================================================================
const sec5 = [
  H1("5. Algorithm / Pseudocode"),
  H2("5.1 ETL and Preprocessing"),
  codeBlock([
    "BEGIN ETL",
    "  READ src_customers, src_accounts, src_branches, src_payment_methods, src_transactions_raw",
    "  txn_clean <- DROP_DUPLICATES(src_transactions_raw)",
    "  txn_clean.payment_method <- STANDARDIZE_CASE(txn_clean.payment_method)",
    "  txn_clean.amount <- ABS(txn_clean.amount)                 // fix sign errors",
    "  FOR col IN [payment_method, location_city]:",
    "      txn_clean[col] <- FILL_MISSING(txn_clean[col], MODE(col))",
    "  txn_clean.amount <- FILL_MISSING(txn_clean.amount, MEDIAN(amount))",
    "  DROP COLUMNS [irrelevant_flag_1, irrelevant_note]",
    "  upper_fence <- Q3(amount) + 3 * IQR(amount)",
    "  txn_clean.amount <- CAP(txn_clean.amount, upper_fence)     // winsorize outliers",
    "  merged <- JOIN(txn_clean, accounts, customers, branches, payment_methods)",
    "  merged <- DERIVE_DATE_PARTS(merged.datetime)",
    "  merged.amount_band <- DISCRETIZE(merged.amount)",
    "  merged.hour_band   <- DISCRETIZE(merged.hour)",
    "  BUILD dim_date, dim_customer, dim_account, dim_branch, dim_payment FROM merged",
    "  BUILD fact_transactions FROM merged JOIN dimension surrogate keys",
    "  WRITE star-schema tables to warehouse",
    "END ETL",
  ]),
  H2("5.2 OLAP Cube Operations"),
  codeBlock([
    "// Roll-up: Day -> Month -> Quarter -> Year",
    "rollup_month   <- GROUP BY (year, month)   AGGREGATE SUM(amount), COUNT(*)",
    "rollup_quarter <- GROUP BY (year, quarter) AGGREGATE SUM(amount), COUNT(*)",
    "",
    "// Drill-down: Quarter -> Month -> Day  (example: Q1)",
    "drilldown_q1 <- FILTER(quarter = 1) GROUP BY (month, day) AGGREGATE SUM(amount), COUNT(*)",
    "",
    "// Slice: fix one dimension member (payment_method = 'UPI')",
    "slice_upi <- FILTER(payment_method = 'UPI') GROUP BY (branch) AGGREGATE SUM(amount), COUNT(*)",
    "",
    "// Dice: sub-cube on multiple dimensions",
    "dice <- FILTER(payment_method IN {UPI,IMPS,NEFT} AND region IN {South,West}",
    "               AND transaction_type = 'Debit')",
    "        GROUP BY (region, payment_method) AGGREGATE SUM(amount), COUNT(*)",
    "",
    "// Pivot: Branch (rows) x Payment Method (columns)",
    "pivot <- PIVOT_TABLE(index = branch, columns = payment_method,",
    "                      values = amount, aggfunc = COUNT)",
  ]),
  H2("5.3 Classification Pipeline"),
  codeBlock([
    "BEGIN CLASSIFICATION",
    "  X <- SELECT [amount, amount_norm, hour, is_weekend, is_foreign_loc, outlier_flag,",
    "               txn_type, device_type, payment_method, account_type, segment, region]",
    "  y <- is_fraud",
    "  ENCODE categorical columns of X with LabelEncoder",
    "  (X_train, X_test, y_train, y_test) <- STRATIFIED_SPLIT(X, y, test_size = 0.25)",
    "  SCALE numeric columns with StandardScaler (fit on train, apply to test)",
    "",
    "  FOR model IN [DecisionTree(class_weight=balanced),",
    "                GaussianNaiveBayes(),",
    "                SVM_RBF(C=2.0, class_weight=balanced)]:",
    "      model.FIT(X_train, y_train)",
    "      y_pred <- model.PREDICT(X_test)",
    "      cm <- CONFUSION_MATRIX(y_test, y_pred)",
    "      accuracy, precision, recall, f1 <- SCORE(y_test, y_pred)",
    "      cv_f1 <- 5-FOLD STRATIFIED CROSS-VALIDATION F1 SCORE(model, X_train, y_train)",
    "      RECORD(model, cm, accuracy, precision, recall, f1, cv_f1)",
    "",
    "  COMPARE all models on accuracy, precision, recall, F1, CV-F1",
    "  SELECT best model considering fraud-detection business priorities",
    "END CLASSIFICATION",
  ]),
];

fs.writeFileSync("/home/claude/bank_dwdm/scripts/_sec1_5.json", JSON.stringify({ ok: true }));
module.exports = { cover, coverTable, coverFooter, toc, sec1, sec2, sec3, sec4, sec5,
  H1, H2, H3, P, PBold, bullet, numbered, caption, codeBlock, image, simpleTable,
  headerCell, bodyCell, D, allBorders };
