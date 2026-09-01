const {
  H1, H2, H3, P, PBold, bullet, caption, codeBlock, image, simpleTable, D
} = require("./build_report.js");
const { Paragraph, PageBreak, AlignmentType, TextRun } = require("docx");

// ================================================================
// 6. IMPLEMENTATION / SOURCE CODE
// ================================================================
const sec6 = [
  H1("6. Implementation / Source Code"),
  P("The solution is implemented as five sequential Python scripts (full listings are provided in the accompanying GitHub repository, see Section 6.4 / Deliverable 3). Key excerpts are reproduced below to demonstrate the implementation approach for each stage."),
  H2("6.1 Script 1 — Source Data Generation (01_generate_sources.py)"),
  P("Simulates the four operational systems, including deliberate data-quality defects, so the ETL stage has real cleaning work to do:"),
  codeBlock([
    "fraud_score = (0.35*odd_hour + 0.30*high_amount + 0.25*foreign_loc",
    "               + 0.10*risky_method + np.random.normal(0, 0.15, N))",
    "fraud_prob = 1 / (1 + np.exp(-(fraud_score - 0.55) * 8))",
    "txn['is_fraud'] = (np.random.rand(N) < fraud_prob).astype(int)",
    "",
    "# Inject realistic data-quality problems",
    "txn.loc[sample_idx, 'transaction_amount'] = np.nan          # missing values",
    "txn = pd.concat([txn, txn.sample(frac=0.01)])               # duplicates",
    "txn.loc[idx, 'payment_method'] = txn.loc[idx,'payment_method'].str.upper()  # inconsistent labels",
    "txn.loc[outlier_idx, 'transaction_amount'] *= np.random.uniform(50, 200)     # outliers",
  ]),
  H2("6.2 Script 2 — ETL & Preprocessing (02_etl_preprocessing.py)"),
  codeBlock([
    "# Cleaning: duplicates, inconsistent labels, missing values, sign errors",
    "txn_clean = txn.drop_duplicates(subset=[c for c in txn.columns if c!='transaction_id'])",
    "txn_clean['payment_method'] = txn_clean['payment_method'].str.strip().str.upper()",
    "txn_clean['transaction_amount'] = txn_clean['transaction_amount'].abs()",
    "for col in ['payment_method','location_city']:",
    "    txn_clean[col] = txn_clean[col].fillna(txn_clean[col].mode(dropna=True)[0])",
    "txn_clean['transaction_amount'] = txn_clean['transaction_amount'].fillna(median_amt)",
    "",
    "# Outlier treatment: IQR-based winsorization (cap, don't delete)",
    "upper_fence = q3 + 3*iqr",
    "txn_clean['transaction_amount'] = np.where(",
    "    txn_clean['transaction_amount'] > upper_fence, upper_fence, txn_clean['transaction_amount'])",
    "",
    "# Integration: star-schema join chain",
    "merged = (txn_clean.merge(accounts, on='account_id')",
    "                    .merge(customers, on='customer_id')",
    "                    .merge(branches, on='branch_id'))",
  ]),
  H2("6.3 Script 3 & 4 — OLAP Analysis and Classification"),
  P("OLAP operations use pandas groupby / pivot_table (Section 5.2 pseudocode); classification uses scikit-learn estimators exactly as shown in the Section 5.3 pseudocode, e.g.:"),
  codeBlock([
    "models = {",
    "    'Decision Tree': DecisionTreeClassifier(max_depth=6, min_samples_leaf=20,",
    "                                             class_weight='balanced', random_state=42),",
    "    'Naive Bayes':   GaussianNB(),",
    "    'SVM (RBF)':     SVC(kernel='rbf', C=2.0, class_weight='balanced', random_state=42),",
    "}",
    "for name, model in models.items():",
    "    model.fit(X_train, y_train)",
    "    y_pred = model.predict(X_test)",
    "    cm  = confusion_matrix(y_test, y_pred)",
    "    cv_scores = cross_val_score(model, X_train, y_train,",
    "                                 cv=StratifiedKFold(5, shuffle=True, random_state=42),",
    "                                 scoring='f1')",
  ]),
  H2("6.4 Equivalent KNIME / Weka Workflow"),
  P("For teams submitting via a low-code workflow tool instead of hand-written Python, the same pipeline maps directly onto KNIME / Weka nodes:"),
  simpleTable(
    ["Pipeline Stage", "Python Equivalent", "KNIME Node(s)", "Weka Equivalent"],
    [
      ["Extract", "pandas.read_csv", "CSV Reader / Database Reader", "Open File / Database Connector"],
      ["Clean & Integrate", "drop_duplicates, fillna, merge", "Duplicate Row Filter, Missing Value, Joiner", "RemoveDuplicates, ReplaceMissingValues filters"],
      ["Transform / Reduce", "cut, LabelEncoder, drop columns", "Binner, Category to Number, Column Filter", "Discretize, NominalToBinary, Remove filter"],
      ["OLAP roll-up/pivot", "groupby, pivot_table", "GroupBy, Pivoting node", "(exported to spreadsheet / SQL cube)"],
      ["Classification", "DecisionTreeClassifier / GaussianNB / SVC", "Decision Tree Learner, Naive Bayes Learner, SVM Learner", "J48, NaiveBayes, SMO"],
      ["Evaluation", "confusion_matrix, cross_val_score", "Scorer, X-Partitioner / X-Aggregator", "Cross-validation Fold + Classifier Evaluator"],
    ],
    [16, 24, 32, 28]
  ),
  P("This mapping allows the same experimental design (features, split strategy, evaluation metrics) to be reproduced in either tool for the KNIME/Weka Implementation & Documentation criterion."),
];

// ================================================================
// 7. TEST CASES AND EXPECTED / ACTUAL RESULTS
// ================================================================
const sec7 = [
  H1("7. Test Cases and Expected / Actual Results"),
  P("The following test cases validate the correctness of the ETL, warehouse-loading and modelling stages against the raw source data described in Section 3.3."),
  simpleTable(
    ["ID", "Test Case", "Expected Result", "Actual Result", "Status"],
    [
      ["TC-01", "Duplicate transaction rows are removed during cleaning", "187 duplicate rows detected and removed", "187 rows removed (20,200 → 20,013)", "Pass"],
      ["TC-02", "Missing values are fully imputed before loading", "0 missing values remain in fact table numeric/categorical columns", "0 missing values in fact_transactions (21,113 raw missing cells resolved)", "Pass"],
      ["TC-03", "Negative transaction amounts are corrected", "All 39 negative-amount records converted to positive", "39/39 corrected via abs()", "Pass"],
      ["TC-04", "Extreme outliers are capped, not silently dropped", "Amounts above Q3+3×IQR capped at the fence value", "691 outlier values capped; row count unchanged", "Pass"],
      ["TC-05", "Star-schema referential integrity", "Every fact row resolves to a valid date_key, customer_key, account_key, branch_key, payment_key", "0 unmatched foreign keys after join-key normalization fix", "Pass"],
      ["TC-06", "Roll-up totals reconcile across granularities", "SUM(monthly totals) = SUM(quarterly totals) = yearly total", "₹111,821,909.02 at all three levels (Section 9.5)", "Pass"],
      ["TC-07", "Pivot table row/column totals match cube total", "Sum of Branch × Payment-Method pivot cells = total transaction count", "20,013 = 20,013", "Pass"],
      ["TC-08", "Confusion matrix quadrants sum to test-set size", "TP+TN+FP+FN = 5,004 for every model", "Decision Tree, Naïve Bayes and SVM each sum to 5,004", "Pass"],
      ["TC-09", "Stratified split preserves class ratio", "Fraud rate in train ≈ fraud rate in test", "Train 10.3% vs Test 10.3%", "Pass"],
      ["TC-10", "Cross-validation runs without leakage", "5-fold CV computed only on the training partition", "CV F1 computed on X_train/y_train only (Section 9.6)", "Pass"],
    ],
    [8, 26, 26, 28, 12]
  ),
];

// ================================================================
// 8. EXECUTION SCREENSHOTS / OUTPUT
// ================================================================
const sec8 = [
  H1("8. Execution Screenshots / Output"),
  P("All charts below are generated directly from the pipeline's output tables (Section 9 references the exact figures shown here)."),
  H2("8.1 Data-Quality Report (before → after ETL)"),
  simpleTable(
    ["Metric", "Value"],
    [
      ["Raw transaction rows extracted", "20,200"],
      ["Duplicate rows removed", "187"],
      ["Raw missing cells resolved (incl. dropped irrelevant column)", "21,113"],
      ["Negative-amount records corrected", "39"],
      ["Outlier values capped (IQR method)", "691"],
      ["Irrelevant attributes removed", "irrelevant_flag_1, irrelevant_note"],
      ["Clean rows loaded into FACT_TRANSACTIONS", "20,013"],
    ],
    [65, 35]
  ),
  H2("8.2 Analytical Charts"),
  image("chart1_monthly_volume_trend.png", ...D.c1, 560),
  caption("Figure 8.1 — Monthly transaction volume trend (Roll-up: Day → Month)."),
  image("chart2_branch_wise_transactions.png", ...D.c2, 540),
  caption("Figure 8.2 — Branch-wise total transaction amount."),
  image("chart3_payment_method_pattern.png", ...D.c3, 380),
  caption("Figure 8.3 — Payment-method usage pattern across all transactions."),
  new Paragraph({ children: [new PageBreak()] }),
  image("chart4_customer_behaviour.png", ...D.c4, 540),
  caption("Figure 8.4 — Average transaction amount by age group and customer segment."),
  image("chart5_fraud_rate_by_payment.png", ...D.c5, 500),
  caption("Figure 8.5 — Fraud rate by payment method."),
  image("chart6_pivot_branch_payment_heatmap.png", ...D.c6, 560),
  caption("Figure 8.6 — Pivot table (OLAP): Branch × Payment Method transaction counts, rendered as a heatmap."),
  new Paragraph({ children: [new PageBreak()] }),
  H2("8.3 Classification Model Output"),
  image("cm_decision_tree.png", ...D.cmdt, 260),
  caption("Figure 8.7 — Confusion Matrix: Decision Tree."),
  image("cm_naive_bayes.png", ...D.cmnb, 260),
  caption("Figure 8.8 — Confusion Matrix: Naïve Bayes."),
  image("cm_svm_rbf.png", ...D.cmsvm, 260),
  caption("Figure 8.9 — Confusion Matrix: SVM (RBF kernel)."),
  simpleTable(
    ["Model", "Accuracy", "Precision", "Recall", "F1-score", "5-fold CV F1"],
    [
      ["Decision Tree", "0.7814", "0.2836", "0.7311", "0.4086", "0.4137 ± 0.0050"],
      ["Naïve Bayes", "0.8737", "0.3537", "0.2689", "0.3055", "0.2524 ± 0.0118"],
      ["SVM (RBF)", "0.7368", "0.2509", "0.7795", "0.3797", "0.3778 ± 0.0046"],
    ],
    [22, 15, 15, 15, 15, 18]
  ),
  caption("Table 8.1 — Model evaluation summary on the held-out 25% test set (5,004 transactions; 517 actual fraud cases)."),
  image("chart7_model_comparison.png", ...D.c7, 540),
  caption("Figure 8.10 — Side-by-side comparison of Accuracy, Precision, Recall and F1-score across the three models."),
  image("chart8_feature_importance.png", ...D.c8, 500),
  caption("Figure 8.11 — Decision Tree feature importances for fraud classification."),
];

module.exports = { sec6, sec7, sec8 };
