"""
02_etl_preprocessing.py
------------------------
EXTRACT  : read the four source-system files
TRANSFORM: data cleaning, integration, transformation, reduction, discretization
LOAD     : write the Star Schema (1 fact table + 5 dimension tables) to /data
Also writes a before/after data-quality report used in the report's
"Data Preprocessing" section.
"""

import numpy as np
import pandas as pd

DATA = "/home/claude/bank_dwdm/data/"

# ---------------------------------------------------------------- EXTRACT
customers = pd.read_csv(DATA + "src_customers.csv", parse_dates=["join_date"])
branches  = pd.read_csv(DATA + "src_branches.csv")
accounts  = pd.read_csv(DATA + "src_accounts.csv", parse_dates=["account_open_date"])
paymeths  = pd.read_csv(DATA + "src_payment_methods.csv")
txn       = pd.read_csv(DATA + "src_transactions_raw.csv", parse_dates=["transaction_datetime"])

quality_report = {}
quality_report["raw_row_count"] = len(txn)
quality_report["raw_duplicate_rows"] = int(txn.duplicated(subset=[c for c in txn.columns if c != "transaction_id"]).sum())
quality_report["raw_missing_cells"] = int(txn.isna().sum().sum())
quality_report["raw_negative_amounts"] = int((txn["transaction_amount"] < 0).sum())

# ---------------------------------------------------------------- TRANSFORM
# 1) DATA CLEANING -------------------------------------------------------
# 1a. Drop exact duplicate transaction records (keep first occurrence)
txn_clean = txn.drop_duplicates(subset=[c for c in txn.columns if c != "transaction_id"], keep="first").copy()

# 1b. Standardise inconsistent categorical labels (case, whitespace)
txn_clean["payment_method"] = txn_clean["payment_method"].astype(str).str.strip().str.upper()
txn_clean["payment_method"] = txn_clean["payment_method"].replace(
    {"NAN": np.nan})
txn_clean["transaction_type"] = txn_clean["transaction_type"].astype(str).str.strip().str.title()

# 1c. Fix sign errors — a negative "Debit" amount is a data-entry glitch, use absolute value
txn_clean["transaction_amount"] = txn_clean["transaction_amount"].abs()

# 1d. Handle missing values
#     - payment_method / location_city: categorical -> impute with mode (most frequent channel/city)
#     - transaction_amount: numeric -> impute with median (robust to skew/outliers)
for col in ["payment_method", "location_city"]:
    mode_val = txn_clean[col].mode(dropna=True)[0]
    txn_clean[col] = txn_clean[col].fillna(mode_val)

median_amt = txn_clean["transaction_amount"].median()
txn_clean["transaction_amount"] = txn_clean["transaction_amount"].fillna(median_amt)

# 1e. Remove irrelevant / non-informative attributes (CO2: data reduction - attribute selection)
txn_clean = txn_clean.drop(columns=["irrelevant_flag_1", "irrelevant_note"])

# 2) OUTLIER TREATMENT (IQR capping on transaction_amount) --------------
q1, q3 = txn_clean["transaction_amount"].quantile([0.25, 0.75])
iqr = q3 - q1
upper_fence = q3 + 3 * iqr     # wide fence (3xIQR) so genuine high-value txns are kept, only extreme
outliers_detected = int((txn_clean["transaction_amount"] > upper_fence).sum())
txn_clean["amount_outlier_flag"] = (txn_clean["transaction_amount"] > upper_fence).astype(int)
# Winsorize (cap) rather than delete, to preserve the fraud signal correlated with large amounts
txn_clean["transaction_amount"] = np.where(
    txn_clean["transaction_amount"] > upper_fence, upper_fence, txn_clean["transaction_amount"])

# 3) DATA INTEGRATION -----------------------------------------------------
# Merge transaction facts with account -> customer -> branch -> payment method dimensions
merged = (txn_clean
          .merge(accounts[["account_id","customer_id","account_type","branch_id","account_status"]],
                 on="account_id", how="left", suffixes=("", "_acct"))
          .merge(customers[["customer_id","age","gender","city","customer_segment"]],
                 on="customer_id", how="left")
          .merge(branches[["branch_id","branch_name","region"]], on="branch_id", how="left",
                 suffixes=("", "_branch")))

# resolve duplicate branch_id columns produced by the two branch references (txn.branch_id vs accounts.branch_id)
merged = merged.rename(columns={"branch_id": "txn_branch_id"})

# 4) DATA TRANSFORMATION ---------------------------------------------------
# 4a. Derive Date dimension attributes
merged["txn_date"] = merged["transaction_datetime"].dt.date
merged["txn_year"] = merged["transaction_datetime"].dt.year
merged["txn_quarter"] = merged["transaction_datetime"].dt.quarter
merged["txn_month"] = merged["transaction_datetime"].dt.month
merged["txn_month_name"] = merged["transaction_datetime"].dt.strftime("%b")
merged["txn_day"] = merged["transaction_datetime"].dt.day
merged["txn_weekday"] = merged["transaction_datetime"].dt.day_name()
merged["txn_hour"] = merged["transaction_datetime"].dt.hour

# 4b. Discretization: bucket amount and hour into categorical bands (used as classifier features)
merged["amount_band"] = pd.cut(merged["transaction_amount"],
                                bins=[-0.01, 1000, 5000, 20000, 100000, np.inf],
                                labels=["<=1K","1K-5K","5K-20K","20K-100K",">100K"])
merged["hour_band"] = pd.cut(merged["txn_hour"], bins=[-1,4,8,12,16,20,24],
                              labels=["Late Night(0-4)","Early Morning(5-8)","Morning(9-12)",
                                      "Afternoon(13-16)","Evening(17-20)","Night(21-24)"])
merged["is_weekend"] = merged["txn_weekday"].isin(["Saturday","Sunday"]).astype(int)
merged["is_foreign_location"] = (merged["location_city"] == "Unknown_Foreign_Loc").astype(int)

# 4c. Normalisation (min-max) of amount for the numeric ML feature set
merged["amount_norm"] = (merged["transaction_amount"] - merged["transaction_amount"].min()) / \
                         (merged["transaction_amount"].max() - merged["transaction_amount"].min())

# ---------------------------------------------------------------- LOAD (STAR SCHEMA)
# DIM_DATE
dim_date = (merged[["txn_date","txn_year","txn_quarter","txn_month","txn_month_name","txn_day",
                     "txn_weekday","is_weekend"]]
            .drop_duplicates().reset_index(drop=True))
dim_date.insert(0, "date_key", dim_date.index + 1)

# DIM_CUSTOMER
dim_customer = customers.rename(columns={"customer_id":"customer_bk"}).reset_index(drop=True)
dim_customer.insert(0, "customer_key", dim_customer.index + 1)

# DIM_ACCOUNT
dim_account = accounts.rename(columns={"account_id":"account_bk"}).reset_index(drop=True)
dim_account.insert(0, "account_key", dim_account.index + 1)

# DIM_BRANCH
dim_branch = branches.rename(columns={"branch_id":"branch_bk"}).reset_index(drop=True)
dim_branch.insert(0, "branch_key", dim_branch.index + 1)

# DIM_PAYMENT_METHOD
dim_payment = paymeths.rename(columns={"payment_method_id":"payment_bk"}).reset_index(drop=True)
dim_payment.insert(0, "payment_key", dim_payment.index + 1)

# FACT_TRANSACTIONS  (grain: one row per transaction)
fact = merged.merge(dim_date, on=["txn_date","txn_year","txn_quarter","txn_month","txn_month_name",
                                   "txn_day","txn_weekday","is_weekend"], how="left")
fact = fact.merge(dim_customer[["customer_key","customer_bk"]], left_on="customer_id", right_on="customer_bk", how="left")
fact = fact.merge(dim_account[["account_key","account_bk"]], left_on="account_id", right_on="account_bk", how="left")
fact = fact.merge(dim_branch[["branch_key","branch_bk"]], left_on="txn_branch_id", right_on="branch_bk", how="left")
dim_payment["_pm_upper"] = dim_payment["payment_method"].str.upper()
fact = fact.merge(dim_payment[["payment_key","payment_bk","_pm_upper"]],
                   left_on="payment_method", right_on="_pm_upper", how="left")

fact_transactions = fact[[
    "transaction_id","date_key","customer_key","account_key","branch_key","payment_key",
    "transaction_amount","amount_norm","amount_band","hour_band","txn_hour",
    "transaction_type","device_type","is_foreign_location","amount_outlier_flag","is_fraud"
]].rename(columns={"transaction_id":"transaction_bk"})

# Save star schema
dim_date.to_csv(DATA + "dim_date.csv", index=False)
dim_customer.to_csv(DATA + "dim_customer.csv", index=False)
dim_account.to_csv(DATA + "dim_account.csv", index=False)
dim_branch.to_csv(DATA + "dim_branch.csv", index=False)
dim_payment.drop(columns=["_pm_upper"]).to_csv(DATA + "dim_payment.csv", index=False)
fact_transactions.to_csv(DATA + "fact_transactions.csv", index=False)

# Also save the fully denormalised analytic view (for OLAP + ML stages)
analytic_view = fact.copy()
analytic_view.to_csv(DATA + "analytic_view.csv", index=False)

# ---------------------------------------------------------------- QUALITY REPORT
quality_report["clean_row_count"] = len(fact_transactions)
quality_report["rows_removed_as_duplicates"] = quality_report["raw_row_count"] - len(txn_clean)
quality_report["missing_values_imputed"] = quality_report["raw_missing_cells"]
quality_report["outliers_capped"] = outliers_detected
quality_report["negative_amounts_corrected"] = quality_report["raw_negative_amounts"]
quality_report["attributes_removed"] = "irrelevant_flag_1, irrelevant_note (2 columns)"

qr = pd.Series(quality_report)
qr.to_csv(DATA + "data_quality_report.csv", header=["value"])

print("=== STAR SCHEMA BUILT ===")
print("fact_transactions:", fact_transactions.shape)
print("dim_date:", dim_date.shape, "| dim_customer:", dim_customer.shape,
      "| dim_account:", dim_account.shape, "| dim_branch:", dim_branch.shape,
      "| dim_payment:", dim_payment.shape)
print("\n=== DATA QUALITY REPORT ===")
print(qr)
print("\nMissing values remaining in fact table:", fact_transactions.isna().sum().sum())
