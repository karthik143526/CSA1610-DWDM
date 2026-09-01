const { H1, H2, H3, P, PBold, bullet, caption, simpleTable } = require("./build_report.js");
const { Paragraph, PageBreak } = require("docx");

// ================================================================
// 9. ANALYSIS AND DISCUSSION
// ================================================================
const sec9 = [
  H1("9. Analysis and Discussion"),

  H2("9.1 Transaction Volume and Monthly Trends"),
  P("Across the analyzed year, the warehouse recorded 20,013 clean transactions totalling ₹111,821,909.02, averaging roughly 1,650–1,760 transactions per month (Figure 8.1). Volume is fairly stable through the year (no single month deviates by more than ~10% from the mean), with March the highest month (1,758 transactions) and February the lowest (1,606). This stability suggests transaction volume is not strongly seasonal in the simulated data, which is realistic for routine retail banking activity as opposed to, say, festive-season retail spending."),

  H2("9.2 Branch-wise Transactions"),
  P("Branch-wise totals (Figure 8.2) are fairly evenly distributed across the 12 branches, as expected since accounts were assigned to branches uniformly at random in the source simulation; in a real deployment this chart would be the first place analysts look for branches that are unusually over- or under-trafficked relative to their customer base, which can itself be a fraud or operational-risk signal (e.g., a branch with disproportionately high UPI volume relative to its account count)."),

  H2("9.3 Payment-Method Patterns"),
  P("UPI is the dominant payment channel (about 30% of transactions), followed by NEFT and IMPS (Figure 8.3). Cross-referencing this with the fraud-rate-by-payment-method chart (Figure 8.5) is important: UPI and IMPS were engineered to carry a higher baseline fraud rate, consistent with real-world observations that fast, hard-to-reverse peer-to-peer payment rails (UPI/IMPS) are more attractive to fraudsters than slower, more heavily audited channels like RTGS or branch-counter transactions. This is a genuine analytical finding, not just a data artefact — it mirrors published fraud typologies in India's digital payments ecosystem."),

  H2("9.4 Customer Transaction Behaviour"),
  P("Average transaction amount rises with age up to the 46–55 bracket and is consistently higher for the Premium and Corporate segments than for Retail customers (Figure 8.4), which matches the intuitive expectation that higher-net-worth and business customers transact in larger amounts. This kind of segment-level baseline is also useful for fraud detection: a large transaction that is normal for a Corporate account might be anomalous for a young Retail customer, motivating customer-segment-aware thresholds rather than a single global amount cutoff."),

  H2("9.5 OLAP Operations — Results and Interpretation"),
  bullet("Roll-up (Day → Month → Quarter → Year): Monthly sums roll up consistently into quarterly and yearly totals — Q1 ₹28,217,927.10, Q2 ₹27,942,573.41, Q3 ₹27,395,912.49, Q4 ₹28,265,496.02, summing to the yearly total of ₹111,821,909.02, confirming additive-measure correctness of the fact table (Test Case TC-06)."),
  bullet("Drill-down (Q1 → daily): Drilling into Q1 by day exposes daily fluctuation invisible at the monthly grain, letting an analyst pinpoint, for example, a spike on a specific date that a monthly view would average away."),
  bullet("Slice (payment_method = 'UPI'): Slicing the cube to UPI-only transactions and viewing by branch shows Chennai Main Branch with the highest UPI volume (₹32.3 lakh) among branches, useful for branch-level UPI risk monitoring."),
  bullet("Dice (payment_method ∈ {UPI,IMPS,NEFT} AND region ∈ {South,West} AND type = Debit): The resulting sub-cube shows South-region UPI debits (₹54.9 lakh, 976 transactions) far exceed West-region UPI debits (₹36.9 lakh, 667 transactions), letting risk teams focus dice-level attention on the highest-exposure region/channel combination rather than monitoring the whole cube uniformly."),
  bullet("Pivot (Branch × Payment Method): The pivot heatmap (Figure 8.6) gives a single-glance cross-tabulation that is the natural starting point for a fraud-operations dashboard — cells that are unusually dark (high count) for a normally low-traffic combination are candidates for manual review."),

  H2("9.6 Classification Model Evaluation and Comparison"),
  P("All three models were trained on the same 75/25 stratified split (15,009 train / 5,004 test transactions, 10.3% fraud rate in both partitions) and evaluated with identical metrics, so the comparison is apples-to-apples."),
  bullet("Naïve Bayes achieved the highest overall Accuracy (0.874) but the lowest Recall (0.269) — it correctly leaves most legitimate transactions alone but misses roughly 73% of actual fraud cases (378 of 517 false negatives), which is dangerous for a fraud-detection use case."),
  bullet("SVM (RBF) achieved the highest Recall (0.780, catching 403 of 517 fraud cases) but at the cost of the most False Positives (1,203), meaning nearly a quarter of all legitimate transactions in the test set would be wrongly flagged."),
  bullet("Decision Tree offered the best balance: Recall 0.731 (378 of 517 frauds caught) with fewer False Positives (955) than SVM, the highest F1-score (0.409) among the three, and the most stable cross-validation performance (0.4137 ± 0.0050), the smallest variance across folds."),
  bullet("Feature-importance analysis on the Decision Tree (Figure 8.11) shows transaction amount, the normalized amount, is_foreign_location and hour-of-day as the strongest predictors — consistent with how the fraud label was constructed and with real fraud-analytics literature that flags high-value, odd-hour, and geographically anomalous transactions."),
  PBold("Recommended model: ", "Decision Tree is recommended for deployment. It has the best F1-score, the lowest cross-validation variance (most stable / reproducible), the fastest inference and training time of the three, and — importantly for a regulated banking context — a Decision Tree is directly interpretable: each flagged transaction can be traced to the specific rule path that triggered it, which auditors and compliance teams require. Naïve Bayes is not recommended as a stand-alone detector due to its low recall; SVM could be considered as a complementary high-recall alert layer if a human-review team has capacity to triage its higher false-positive volume."),

  H2("9.7 Consequences of False Positives and False Negatives in Fraud Detection"),
  H3("False Positives (legitimate transactions flagged as fraud)"),
  bullet("Direct customer friction: blocked or delayed payments damage trust and can drive customers to competitor banks."),
  bullet("Operational cost: every flagged transaction typically requires manual review by a fraud-operations analyst, so a high false-positive rate (as seen with SVM, 1,203 of 4,487 legitimate transactions) scales investigation workload and cost."),
  bullet("Regulatory/customer-service load: repeated false blocks generate complaints and, in aggregate, reputational risk."),
  H3("False Negatives (fraudulent transactions missed)"),
  bullet("Direct financial loss to the bank or customer, and potential regulatory liability under RBI customer-liability rules for unauthorized transactions."),
  bullet("Missed fraud can indicate an active, ongoing attack (e.g., compromised credentials) that continues to cause losses until detected by another control."),
  bullet("Naïve Bayes' 378 false negatives in the test set represent the highest undetected-fraud exposure among the three models, reinforcing why Accuracy alone is a misleading metric on an imbalanced fraud dataset — a naïve 'always legitimate' classifier would already score ~90% accuracy while catching zero fraud."),
  P("In a real fraud-detection deployment, the operational cost of a False Negative (unrecovered financial loss) generally exceeds the cost of a False Positive (analyst review time / minor customer friction), which is why Recall and F1-score — not raw Accuracy — should drive model selection and the classification threshold should typically be tuned to favour Recall, subject to a review-capacity constraint on the resulting False Positive volume."),

  H2("9.8 Privacy, Security, Fairness and Ethical Considerations"),
  bullet("Data privacy: customer PII (name, age, city) should be masked, tokenized or encrypted at rest and in transit; only pseudonymized surrogate keys should flow into the analytics/ML layer, consistent with India's Digital Personal Data Protection (DPDP) Act, 2023, and international frameworks like GDPR for cross-border data."),
  bullet("Access control & security: the warehouse should enforce role-based access control so that OLAP/BI users see aggregated data while only authorized fraud-investigation staff can see row-level, customer-identifiable transaction details; all ETL and model-serving pipelines should run over encrypted connections with audit logging."),
  bullet("Fairness: because features like customer_segment, region and age_group are used, the model should be periodically audited for disparate false-positive rates across demographic or regional groups so that, for example, customers in one region or segment are not systematically over-flagged relative to their actual fraud base rate."),
  bullet("Explainability & due process: flagged customers are entitled to a clear reason for a block/hold under most banking-conduct regulations; the interpretability of a Decision Tree (Section 9.6) directly supports this obligation better than a black-box SVM kernel."),
  bullet("Ethical use of predictions: fraud scores should support, not replace, human judgement for account-level actions (freezing funds, closing accounts) given the real cost of a false accusation; a human-in-the-loop review step is recommended before any customer-facing action is taken."),

  H2("9.9 Scalability and Computational Feasibility"),
  bullet("Current scale: ~20,000 transactions processed end-to-end (ETL + OLAP + 3 classifiers + cross-validation) in well under a minute on a single laptop-class CPU — computationally trivial at this volume."),
  bullet("Production scale: a real bank processes millions of transactions per day. The ETL layer should move from single-machine pandas to a distributed engine (Apache Spark) or a cloud data-warehouse (Snowflake, BigQuery, Redshift) for the Extract/Transform/Load stages, and the star schema should be partitioned by date for efficient roll-up/drill-down queries."),
  bullet("Model serving: Decision Tree inference is O(tree depth) per transaction and trivially fast enough for real-time, in-line scoring at transaction-authorization time; SVM with an RBF kernel is comparatively expensive to score at high throughput and would need approximation (e.g., a linear SVM or a distilled tree) to scale to real-time volumes."),
  bullet("Incremental processing: production ETL should be incremental (only new/changed records since the last load) rather than full-refresh, and the classification model should be retrained on a rolling schedule (e.g., weekly) with drift monitoring, since fraud patterns evolve faster than legitimate spending patterns."),
  bullet("Class imbalance at scale: the 10.3% fraud rate used here is already imbalanced; real-world fraud rates are often under 1%, so production models typically need resampling (SMOTE), anomaly-detection techniques, or cost-sensitive learning in addition to the class-weighting used in this assignment."),
];

// ================================================================
// 10. CONCLUSION (+ Reflection)
// ================================================================
const sec10 = [
  H1("10. Conclusion"),
  P("This project designed and implemented an end-to-end Data Warehouse and Data Mining solution for banking transaction analysis and fraud classification. Data from four simulated operational systems was extracted, cleaned of duplicates, missing values, inconsistent labels and outliers, and integrated into a Star Schema comprising one fact table and five dimension tables. Roll-up, Drill-down, Slice, Dice and Pivot OLAP operations were demonstrated on the resulting cube, surfacing concrete insights about transaction volume, branch activity, payment-method risk and customer behaviour. Three classification algorithms — Decision Tree, Naïve Bayes and SVM — were trained and rigorously evaluated using Confusion Matrix, Accuracy, Precision, Recall, F1-score and 5-fold cross-validation. The Decision Tree model was selected as the best overall choice for fraud classification given its balance of Recall and Precision, its stability across cross-validation folds, and its interpretability, which matters for regulatory compliance in a banking context. The assignment also examined the practical consequences of False Positives and False Negatives, and the privacy, fairness, ethical and scalability considerations that a real deployment would have to address."),
  H2("10.1 Design-Decision Justification"),
  bullet("Star (not Snowflake) schema — chosen to keep join paths short for OLAP performance, appropriate at this data volume and query pattern."),
  bullet("Winsorizing (capping) outliers instead of deleting them — preserves the fraud-relevant signal that large transaction amounts carry, rather than discarding potentially important fraud cases."),
  bullet("class_weight='balanced' on Decision Tree/SVM — compensates for the 10.3% fraud class imbalance without discarding legitimate-transaction data via undersampling."),
  bullet("F1-score and Recall prioritized over raw Accuracy for model selection — appropriate for an imbalanced, cost-asymmetric fraud-detection problem (Section 9.7)."),
  H2("10.2 Relevance to Sustainable Development Goals"),
  bullet("SDG 8 (Decent Work and Economic Growth): reliable fraud detection protects customers' and the bank's financial assets, supporting trust in the formal financial system that underpins economic activity."),
  bullet("SDG 9 (Industry, Innovation and Infrastructure): the project demonstrates how data-warehouse and data-mining infrastructure can modernize legacy banking IT systems into an integrated, analytics-ready platform."),
  bullet("SDG 12 (Responsible Consumption and Production): the emphasis on data minimization, privacy-preserving design and auditable, explainable predictions reflects responsible use of customer data as a resource."),
  H2("10.3 Challenges Faced and Learning Outcomes"),
  bullet("Reconciling multiple source-system join keys (e.g., branch_id appearing on both the transaction and account records) required care to avoid silently duplicating or losing rows during integration — resolved by explicitly renaming and validating foreign keys after each merge (Test Case TC-05)."),
  bullet("Designing a fraud label that was predictive but not perfectly separable was necessary to obtain realistic (imperfect) classifier metrics instead of trivial 100% scores, better reflecting what students would encounter with real fraud data."),
  bullet("The exercise reinforced why Accuracy is a misleading metric under class imbalance and why the business cost-asymmetry of False Negatives vs False Positives (Section 9.7), not a single aggregate number, should drive both metric choice and classification-threshold selection in a fraud-detection system."),
];

// ================================================================
// 11. INDIVIDUAL CONTRIBUTION OF GROUP MEMBERS
// ================================================================
const sec11 = [
  H1("11. Individual Contribution of Group Members"),
  P("[Template — to be completed by the submitting group with actual names, register numbers and percentage contributions before submission.]", { italics: true }),
  simpleTable(
    ["Name", "Register No.", "Contribution", "% Contribution"],
    [
      ["[Student Name 1]", "[Reg. No.]", "ETL design & implementation, Star Schema design, data-quality report", "[e.g., 34%]"],
      ["[Student Name 2]", "[Reg. No.]", "OLAP operations, analytical charts, report compilation", "[e.g., 33%]"],
      ["[Student Name 3]", "[Reg. No.]", "Classification models, evaluation & cross-validation, GitHub repository setup", "[e.g., 33%]"],
    ],
    [26, 16, 40, 18]
  ),
];

// ================================================================
// 12. REFERENCES
// ================================================================
const sec12 = [
  H1("12. References"),
  bullet("Han, J., Kamber, M., & Pei, J. Data Mining: Concepts and Techniques (3rd ed.). Morgan Kaufmann."),
  bullet("Kimball, R., & Ross, M. The Data Warehouse Toolkit: The Definitive Guide to Dimensional Modeling (3rd ed.). Wiley."),
  bullet("Han, J., & Kamber, M. Data Warehousing and OLAP fundamentals — roll-up, drill-down, slice, dice and pivot operations on the data cube."),
  bullet("Pedregosa, F., et al. (2011). Scikit-learn: Machine Learning in Python. Journal of Machine Learning Research, 12, 2825–2830."),
  bullet("McKinney, W. (2010). Data Structures for Statistical Computing in Python (pandas). Proceedings of the 9th Python in Science Conference."),
  bullet("Reserve Bank of India — Master Direction on Digital Payment Security Controls, and RBI guidelines on customer liability in unauthorized electronic banking transactions."),
  bullet("Government of India, Digital Personal Data Protection Act, 2023 (DPDP Act) — data-privacy obligations relevant to customer-data handling in Section 9.8."),
  bullet("KNIME AG — KNIME Analytics Platform documentation (node reference for GroupBy, Pivoting, Decision Tree Learner, Naive Bayes Learner, SVM Learner)."),
  bullet("Witten, I. H., Frank, E., Hall, M. A., & Pal, C. J. Data Mining: Practical Machine Learning Tools and Techniques (Weka) (4th ed.). Morgan Kaufmann."),
  bullet("United Nations — Sustainable Development Goals 8, 9 and 12 (sdgs.un.org), referenced in Section 10.2."),
];

module.exports = { sec9, sec10, sec11, sec12 };
