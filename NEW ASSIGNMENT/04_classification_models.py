"""
04_classification_models.py
-----------------------------
Builds the fraud-classification feature set from the star schema fact
table, trains Decision Tree / Naive Bayes / SVM, and evaluates each with
Confusion Matrix, Accuracy, Precision, Recall, F1-score and 5-fold
stratified Cross-Validation. Produces comparison chart + confusion-matrix
heatmaps.
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import json

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.svm import SVC
from sklearn.metrics import (confusion_matrix, accuracy_score, precision_score,
                              recall_score, f1_score, classification_report)

sns.set_theme(style="whitegrid")
DATA = "/home/claude/bank_dwdm/data/"
FIG  = "/home/claude/bank_dwdm/figures/"

np.random.seed(42)

av = pd.read_csv(DATA + "analytic_view.csv", parse_dates=["transaction_datetime"])

# ---------------------------------------------------------- FEATURE ENGINEERING
features = av[[
    "transaction_amount","amount_norm","txn_hour","is_weekend","is_foreign_location",
    "amount_outlier_flag","transaction_type","device_type","payment_method",
    "account_type","customer_segment","region"
]].copy()
target = av["is_fraud"]

cat_cols = ["transaction_type","device_type","payment_method","account_type","customer_segment","region"]
encoders = {}
for c in cat_cols:
    le = LabelEncoder()
    features[c] = le.fit_transform(features[c].astype(str))
    encoders[c] = dict(zip(le.classes_, le.transform(le.classes_).tolist()))

X_train, X_test, y_train, y_test = train_test_split(
    features, target, test_size=0.25, random_state=42, stratify=target)

# Scale numeric features (helps SVM and NB assumptions)
scaler = StandardScaler()
num_cols = ["transaction_amount","amount_norm","txn_hour"]
X_train_scaled = X_train.copy()
X_test_scaled = X_test.copy()
X_train_scaled[num_cols] = scaler.fit_transform(X_train[num_cols])
X_test_scaled[num_cols] = scaler.transform(X_test[num_cols])

print("Train size:", X_train.shape, " Test size:", X_test.shape)
print("Fraud rate - train: {:.3f}  test: {:.3f}".format(y_train.mean(), y_test.mean()))

# ---------------------------------------------------------- MODELS
models = {
    "Decision Tree": DecisionTreeClassifier(max_depth=6, min_samples_leaf=20,
                                             class_weight="balanced", random_state=42),
    "Naive Bayes":   GaussianNB(),
    "SVM (RBF)":     SVC(kernel="rbf", C=2.0, gamma="scale", class_weight="balanced",
                          probability=False, random_state=42),
}

results = {}
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

for name, model in models.items():
    Xtr = X_train_scaled if name != "Decision Tree" else X_train
    Xte = X_test_scaled if name != "Decision Tree" else X_test
    Xcv = X_train_scaled if name != "Decision Tree" else X_train

    model.fit(Xtr, y_train)
    y_pred = model.predict(Xte)

    cm = confusion_matrix(y_test, y_pred)
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    cv_scores = cross_val_score(model, Xcv, y_train, cv=skf, scoring="f1")

    tn, fp, fn, tp = cm.ravel()
    results[name] = {
        "confusion_matrix": cm.tolist(),
        "TP": int(tp), "TN": int(tn), "FP": int(fp), "FN": int(fn),
        "accuracy": round(acc, 4), "precision": round(prec, 4),
        "recall": round(rec, 4), "f1_score": round(f1, 4),
        "cv_f1_mean": round(cv_scores.mean(), 4), "cv_f1_std": round(cv_scores.std(), 4),
    }

    plt.figure(figsize=(4.2,3.6))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=["Legit(0)","Fraud(1)"], yticklabels=["Legit(0)","Fraud(1)"])
    plt.title(f"Confusion Matrix - {name}")
    plt.ylabel("Actual")
    plt.xlabel("Predicted")
    plt.tight_layout()
    fname = name.lower().replace(" ", "_").replace("(", "").replace(")", "")
    plt.savefig(FIG + f"cm_{fname}.png", dpi=150)
    plt.close()

    print(f"\n--- {name} ---")
    print(classification_report(y_test, y_pred, target_names=["Legit","Fraud"], zero_division=0))
    print("5-fold CV F1: {:.4f} (+/- {:.4f})".format(cv_scores.mean(), cv_scores.std()))

with open(DATA + "model_results.json", "w") as f:
    json.dump(results, f, indent=2)

comparison = pd.DataFrame(results).T[["accuracy","precision","recall","f1_score","cv_f1_mean"]]
comparison.to_csv(DATA + "model_comparison.csv")
print("\n=== MODEL COMPARISON ===")
print(comparison)

# ---------------------------------------------------------- COMPARISON CHART
comp_plot = comparison[["accuracy","precision","recall","f1_score"]].reset_index().rename(columns={"index":"model"})
comp_melt = comp_plot.melt(id_vars="model", var_name="metric", value_name="score")
plt.figure(figsize=(9,5))
sns.barplot(data=comp_melt, x="metric", y="score", hue="model")
plt.ylim(0,1)
plt.title("Model Comparison: Decision Tree vs Naive Bayes vs SVM")
plt.ylabel("Score")
plt.xlabel("Evaluation Metric")
plt.legend(title="Model", loc="lower right")
plt.tight_layout()
plt.savefig(FIG + "chart7_model_comparison.png", dpi=150)
plt.close()

# ---------------------------------------------------------- FEATURE IMPORTANCE (Decision Tree)
dt_model = models["Decision Tree"]
importances = pd.Series(dt_model.feature_importances_, index=X_train.columns).sort_values(ascending=False)
plt.figure(figsize=(8,5))
sns.barplot(x=importances.values, y=importances.index, color="#2c5f8a")
plt.title("Decision Tree - Feature Importance for Fraud Classification")
plt.xlabel("Importance")
plt.tight_layout()
plt.savefig(FIG + "chart8_feature_importance.png", dpi=150)
plt.close()

print("\nAll model artefacts and charts saved.")
