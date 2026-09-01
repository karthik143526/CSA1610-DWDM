"""
01_generate_sources.py
-----------------------
Simulates the OPERATIONAL SOURCE SYSTEMS of a bank:
    - Core Banking System   -> customers.csv, accounts.csv
    - Branch Management Sys -> branches.csv
    - Payment Gateway       -> payment_methods.csv
    - Transaction Processing System -> transactions_raw.csv (DELIBERATELY DIRTY)

The transactions file is generated with realistic data-quality problems
(missing values, duplicates, inconsistent categorical labels, outliers,
irrelevant/leaky columns) so that the preprocessing stage (CO2) has real
work to do.

Random seed is fixed for reproducibility.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta

np.random.seed(42)

N_CUSTOMERS   = 800
N_ACCOUNTS    = 1000
N_BRANCHES    = 12
N_TRANSACTIONS = 20000

# ----------------------------------------------------------------------
# 1. DIM SOURCE: CUSTOMERS  (Core Banking System)
# ----------------------------------------------------------------------
first_names = ["Aditi","Rahul","Priya","Karthik","Sneha","Arjun","Divya","Vikram",
               "Meera","Suresh","Anita","Rohan","Kavya","Manoj","Lakshmi","Sanjay",
               "Neha","Arun","Pooja","Deepak"]
last_names = ["Sharma","Iyer","Nair","Reddy","Gupta","Menon","Rao","Patel",
              "Krishnan","Verma","Pillai","Das","Bose","Kapoor","Chatterjee"]

customer_ids = [f"CUST{i:05d}" for i in range(1, N_CUSTOMERS + 1)]
customers = pd.DataFrame({
    "customer_id": customer_ids,
    "customer_name": [f"{np.random.choice(first_names)} {np.random.choice(last_names)}" for _ in customer_ids],
    "age": np.random.randint(18, 75, N_CUSTOMERS),
    "gender": np.random.choice(["M", "F", "Other"], N_CUSTOMERS, p=[0.48, 0.48, 0.04]),
    "city": np.random.choice(
        ["Chennai","Mumbai","Delhi","Bengaluru","Hyderabad","Kolkata","Pune","Ahmedabad"],
        N_CUSTOMERS),
    "customer_segment": np.random.choice(["Retail", "Premium", "Corporate"], N_CUSTOMERS, p=[0.7, 0.2, 0.1]),
    "join_date": [datetime(2015,1,1) + timedelta(days=int(x)) for x in np.random.randint(0, 3800, N_CUSTOMERS)]
})
# inject a few missing cities / genders (real-world messiness)
customers.loc[customers.sample(frac=0.02, random_state=1).index, "city"] = np.nan
customers.to_csv("/home/claude/bank_dwdm/data/src_customers.csv", index=False)

# ----------------------------------------------------------------------
# 2. DIM SOURCE: BRANCHES (Branch Management System)
# ----------------------------------------------------------------------
branch_cities = ["Chennai","Mumbai","Delhi","Bengaluru","Hyderabad","Kolkata",
                  "Pune","Ahmedabad","Coimbatore","Jaipur","Lucknow","Nagpur"]
branches = pd.DataFrame({
    "branch_id": [f"BR{i:03d}" for i in range(1, N_BRANCHES + 1)],
    "branch_name": [f"{c} Main Branch" for c in branch_cities],
    "city": branch_cities,
    "region": np.random.choice(["North", "South", "East", "West"], N_BRANCHES),
    "ifsc_code": [f"BANK0{i:06d}" for i in range(1, N_BRANCHES + 1)]
})
branches.to_csv("/home/claude/bank_dwdm/data/src_branches.csv", index=False)

# ----------------------------------------------------------------------
# 3. DIM SOURCE: ACCOUNTS (Core Banking System)
# ----------------------------------------------------------------------
accounts = pd.DataFrame({
    "account_id": [f"ACC{i:06d}" for i in range(1, N_ACCOUNTS + 1)],
    "customer_id": np.random.choice(customer_ids, N_ACCOUNTS),
    "account_type": np.random.choice(["Savings", "Current", "Salary", "NRI"], N_ACCOUNTS, p=[0.55,0.25,0.15,0.05]),
    "branch_id": np.random.choice(branches["branch_id"], N_ACCOUNTS),
    "account_open_date": [datetime(2016,1,1) + timedelta(days=int(x)) for x in np.random.randint(0, 3500, N_ACCOUNTS)],
    "account_status": np.random.choice(["Active", "Dormant", "Closed"], N_ACCOUNTS, p=[0.85, 0.10, 0.05])
})
accounts.to_csv("/home/claude/bank_dwdm/data/src_accounts.csv", index=False)

# ----------------------------------------------------------------------
# 4. DIM SOURCE: PAYMENT METHODS (Payment Gateway)
# ----------------------------------------------------------------------
payment_methods = pd.DataFrame({
    "payment_method_id": [f"PM{i:02d}" for i in range(1, 7)],
    "payment_method": ["NEFT", "IMPS", "UPI", "RTGS", "Debit Card", "Net Banking"],
    "channel_type": ["Bank Transfer", "Bank Transfer", "Mobile", "Bank Transfer", "Card", "Online"]
})
payment_methods.to_csv("/home/claude/bank_dwdm/data/src_payment_methods.csv", index=False)

# ----------------------------------------------------------------------
# 5. FACT SOURCE: TRANSACTIONS (Transaction Processing System) -- DIRTY
# ----------------------------------------------------------------------
start_date = datetime(2024, 1, 1)
txn_dates = [start_date + timedelta(days=int(x), seconds=int(np.random.randint(0, 86400)))
             for x in np.random.randint(0, 365, N_TRANSACTIONS)]

# Base legitimate transaction amount distribution (log-normal, realistic)
base_amount = np.random.lognormal(mean=8.2, sigma=1.0, size=N_TRANSACTIONS)

txn = pd.DataFrame({
    "transaction_id": [f"TXN{i:07d}" for i in range(1, N_TRANSACTIONS + 1)],
    "account_id": np.random.choice(accounts["account_id"], N_TRANSACTIONS),
    "branch_id": np.random.choice(branches["branch_id"], N_TRANSACTIONS),
    "payment_method": np.random.choice(payment_methods["payment_method"], N_TRANSACTIONS,
                                        p=[0.20,0.20,0.30,0.05,0.15,0.10]),
    "transaction_datetime": txn_dates,
    "transaction_amount": base_amount.round(2),
    "transaction_type": np.random.choice(["Debit", "Credit"], N_TRANSACTIONS, p=[0.6, 0.4]),
    "location_city": np.random.choice(
        ["Chennai","Mumbai","Delhi","Bengaluru","Hyderabad","Kolkata","Pune","Ahmedabad",
         "Unknown_Foreign_Loc"], N_TRANSACTIONS, p=[0.16,0.16,0.14,0.14,0.12,0.1,0.09,0.07,0.02]),
    "device_type": np.random.choice(["Mobile App","Web","ATM","POS","Branch Counter"], N_TRANSACTIONS),
    "irrelevant_flag_1": np.random.choice(["X","Y","Z"], N_TRANSACTIONS),   # noise column
    "irrelevant_note": ["" for _ in range(N_TRANSACTIONS)],                 # empty/irrelevant column
})

# ---- Engineer a FRAUD LABEL with realistic (not perfectly separable) signal ----
# Fraud probability increases with: high amount, odd hour, foreign/unknown location,
# certain payment methods (UPI/IMPS are common fraud vectors), and random noise.
hour = pd.to_datetime(txn["transaction_datetime"]).dt.hour
odd_hour = ((hour >= 0) & (hour <= 4)).astype(int)
high_amount = (txn["transaction_amount"] > txn["transaction_amount"].quantile(0.95)).astype(int)
foreign_loc = (txn["location_city"] == "Unknown_Foreign_Loc").astype(int)
risky_method = txn["payment_method"].isin(["UPI", "IMPS"]).astype(int)

fraud_score = (0.35*odd_hour + 0.30*high_amount + 0.25*foreign_loc + 0.10*risky_method
               + np.random.normal(0, 0.15, N_TRANSACTIONS))
fraud_prob = 1 / (1 + np.exp(-(fraud_score - 0.55) * 8))   # logistic squashing
txn["is_fraud"] = (np.random.rand(N_TRANSACTIONS) < fraud_prob).astype(int)

print("Fraud rate in raw data:", txn["is_fraud"].mean().round(4))

# ---- Inject realistic DATA QUALITY PROBLEMS ----
rng = np.random.RandomState(7)

# a) Missing values (amount, payment_method, location_city)
for col, frac in [("transaction_amount", 0.015), ("payment_method", 0.02), ("location_city", 0.01)]:
    idx = txn.sample(frac=frac, random_state=rng.randint(0, 9999)).index
    txn.loc[idx, col] = np.nan

# b) Duplicate rows (exact duplicate transaction records - common ETL error)
dupes = txn.sample(frac=0.01, random_state=11)
txn = pd.concat([txn, dupes], ignore_index=True)

# c) Inconsistent categorical labels (same value, different casing/spelling)
inconsistent_idx = txn.sample(frac=0.03, random_state=13).index
txn.loc[inconsistent_idx, "payment_method"] = txn.loc[inconsistent_idx, "payment_method"].str.upper()
inconsistent_idx2 = txn.sample(frac=0.02, random_state=17).index
txn.loc[inconsistent_idx2, "transaction_type"] = txn.loc[inconsistent_idx2, "transaction_type"].str.lower()

# d) Outliers (a few absurd transaction amounts due to data-entry errors)
outlier_idx = txn.sample(frac=0.003, random_state=19).index
txn.loc[outlier_idx, "transaction_amount"] = txn.loc[outlier_idx, "transaction_amount"] * np.random.uniform(50, 200)

# e) Negative amount errors (system glitch)
neg_idx = txn.sample(frac=0.002, random_state=23).index
txn.loc[neg_idx, "transaction_amount"] = -abs(txn.loc[neg_idx, "transaction_amount"])

txn = txn.sample(frac=1, random_state=99).reset_index(drop=True)  # shuffle
txn.to_csv("/home/claude/bank_dwdm/data/src_transactions_raw.csv", index=False)

print("\nSource system files generated in bank_dwdm/data/:")
print(" - src_customers.csv        :", customers.shape)
print(" - src_branches.csv         :", branches.shape)
print(" - src_accounts.csv         :", accounts.shape)
print(" - src_payment_methods.csv  :", payment_methods.shape)
print(" - src_transactions_raw.csv :", txn.shape, " (includes injected dirty data)")
