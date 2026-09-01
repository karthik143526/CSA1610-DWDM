"""
03_olap_analysis.py
---------------------
Loads the analytic view (fact + dims already joined) and demonstrates the
five classic OLAP operations against the Transaction / Branch / Date /
Payment-method cube, then produces the analytical charts required by the
assignment (transaction volume, branch-wise, monthly trend, payment-method
pattern, customer behaviour).
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

sns.set_theme(style="whitegrid", palette="viridis")
DATA = "/home/claude/bank_dwdm/data/"
FIG  = "/home/claude/bank_dwdm/figures/"

av = pd.read_csv(DATA + "analytic_view.csv", parse_dates=["transaction_datetime"])

# ======================================================================
# 1) ROLL-UP : Transaction amount aggregated Day -> Month -> Quarter -> Year
# ======================================================================
rollup_month = av.groupby(["txn_year","txn_month","txn_month_name"], as_index=False).agg(
    total_amount=("transaction_amount","sum"),
    txn_count=("transaction_amount","count"))
rollup_month = rollup_month.sort_values(["txn_year","txn_month"])

rollup_quarter = av.groupby(["txn_year","txn_quarter"], as_index=False).agg(
    total_amount=("transaction_amount","sum"), txn_count=("transaction_amount","count"))

rollup_year = av.groupby("txn_year", as_index=False).agg(
    total_amount=("transaction_amount","sum"), txn_count=("transaction_amount","count"))

rollup_month.to_csv(DATA + "olap_rollup_monthly.csv", index=False)
rollup_quarter.to_csv(DATA + "olap_rollup_quarterly.csv", index=False)
rollup_year.to_csv(DATA + "olap_rollup_yearly.csv", index=False)

# ======================================================================
# 2) DRILL-DOWN : Quarter -> Month -> Day for a chosen quarter (Q1)
# ======================================================================
drilldown_q1 = av[av["txn_quarter"] == 1].groupby(
    ["txn_month_name","txn_day"], as_index=False).agg(
    total_amount=("transaction_amount","sum"), txn_count=("transaction_amount","count"))
drilldown_q1.to_csv(DATA + "olap_drilldown_q1_daily.csv", index=False)

# ======================================================================
# 3) SLICE : Fix one dimension -> "UPI transactions only" across branches
# ======================================================================
slice_upi = av[av["payment_method"] == "UPI"].groupby("branch_name", as_index=False).agg(
    total_amount=("transaction_amount","sum"), txn_count=("transaction_amount","count"))
slice_upi.to_csv(DATA + "olap_slice_upi_by_branch.csv", index=False)

# ======================================================================
# 4) DICE : Sub-cube -> (payment_method in [UPI, IMPS, NEFT]) AND
#           (region in [South, West]) AND (transaction_type = Debit)
# ======================================================================
dice = av[
    av["payment_method"].isin(["UPI","IMPS","NEFT"]) &
    av["region"].isin(["South","West"]) &
    (av["transaction_type"] == "Debit")
].groupby(["region","payment_method"], as_index=False).agg(
    total_amount=("transaction_amount","sum"), txn_count=("transaction_amount","count"))
dice.to_csv(DATA + "olap_dice_region_payment_debit.csv", index=False)

# ======================================================================
# 5) PIVOT : Branch (rows) x Payment method (cols) -> transaction count
# ======================================================================
pivot_branch_payment = pd.pivot_table(av, index="branch_name", columns="payment_method",
                                       values="transaction_amount", aggfunc="count", fill_value=0)
pivot_branch_payment.to_csv(DATA + "olap_pivot_branch_payment.csv")

pivot_customer_seg_month = pd.pivot_table(av, index="txn_month_name", columns="customer_segment",
                                           values="transaction_amount", aggfunc="sum", fill_value=0)
month_order = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
pivot_customer_seg_month = pivot_customer_seg_month.reindex(
    [m for m in month_order if m in pivot_customer_seg_month.index])
pivot_customer_seg_month.to_csv(DATA + "olap_pivot_segment_month.csv")

print("OLAP result tables written to /data (roll-up, drill-down, slice, dice, pivot).")

# ======================================================================
# ANALYTICAL CHARTS
# ======================================================================

# --- Chart 1: Monthly transaction volume trend (roll-up result) ---
rollup_month_sorted = rollup_month.copy()
rollup_month_sorted["month_label"] = rollup_month_sorted["txn_month_name"] + "-" + rollup_month_sorted["txn_year"].astype(str)
plt.figure(figsize=(9,4.5))
plt.plot(rollup_month_sorted["month_label"], rollup_month_sorted["txn_count"], marker="o", color="#2c5f8a")
plt.xticks(rotation=45, ha="right")
plt.title("Monthly Transaction Volume Trend (Roll-up: Day -> Month)")
plt.ylabel("Number of Transactions")
plt.xlabel("Month")
plt.tight_layout()
plt.savefig(FIG + "chart1_monthly_volume_trend.png", dpi=150)
plt.close()

# --- Chart 2: Branch-wise transaction totals ---
branch_totals = av.groupby("branch_name", as_index=False).agg(total_amount=("transaction_amount","sum"))
branch_totals = branch_totals.sort_values("total_amount", ascending=False)
plt.figure(figsize=(9,5))
sns.barplot(data=branch_totals, y="branch_name", x="total_amount", color="#3f7cac")
plt.title("Branch-wise Total Transaction Amount")
plt.xlabel("Total Transaction Amount (INR)")
plt.ylabel("Branch")
plt.tight_layout()
plt.savefig(FIG + "chart2_branch_wise_transactions.png", dpi=150)
plt.close()

# --- Chart 3: Payment-method pattern (share of transactions) ---
pm_counts = av["payment_method"].value_counts()
plt.figure(figsize=(6.5,6.5))
colors = sns.color_palette("viridis", len(pm_counts))
plt.pie(pm_counts.values, labels=pm_counts.index, autopct="%1.1f%%", startangle=120, colors=colors)
plt.title("Payment-Method Usage Pattern")
plt.tight_layout()
plt.savefig(FIG + "chart3_payment_method_pattern.png", dpi=150)
plt.close()

# --- Chart 4: Customer transaction behaviour by segment & age group ---
av["age_group"] = pd.cut(av["age"], bins=[17,25,35,45,55,75],
                          labels=["18-25","26-35","36-45","46-55","56-75"])
seg_age = av.groupby(["age_group","customer_segment"], observed=True, as_index=False).agg(
    avg_amount=("transaction_amount","mean"))
plt.figure(figsize=(9,5))
sns.barplot(data=seg_age, x="age_group", y="avg_amount", hue="customer_segment")
plt.title("Average Transaction Amount by Age Group and Customer Segment")
plt.xlabel("Age Group")
plt.ylabel("Average Transaction Amount (INR)")
plt.legend(title="Segment")
plt.tight_layout()
plt.savefig(FIG + "chart4_customer_behaviour.png", dpi=150)
plt.close()

# --- Chart 5: Fraud rate by payment method (ties analysis to fraud-detection goal) ---
fraud_by_pm = av.groupby("payment_method", as_index=False).agg(fraud_rate=("is_fraud","mean"))
fraud_by_pm = fraud_by_pm.sort_values("fraud_rate", ascending=False)
plt.figure(figsize=(8,4.5))
sns.barplot(data=fraud_by_pm, x="payment_method", y="fraud_rate", color="#c0392b")
plt.title("Fraud Rate by Payment Method")
plt.ylabel("Fraud Rate")
plt.xlabel("Payment Method")
plt.tight_layout()
plt.savefig(FIG + "chart5_fraud_rate_by_payment.png", dpi=150)
plt.close()

# --- Chart 6: Pivot heatmap Branch x Payment method ---
plt.figure(figsize=(9,6))
sns.heatmap(pivot_branch_payment, annot=True, fmt="d", cmap="YlGnBu", cbar_kws={"label":"Transaction Count"})
plt.title("Pivot Table: Branch x Payment Method (Transaction Count)")
plt.ylabel("Branch")
plt.xlabel("Payment Method")
plt.tight_layout()
plt.savefig(FIG + "chart6_pivot_branch_payment_heatmap.png", dpi=150)
plt.close()

print("Charts saved to /figures.")
