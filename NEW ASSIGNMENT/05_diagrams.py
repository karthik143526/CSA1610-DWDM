import graphviz

FIG = "/home/claude/bank_dwdm/figures/"

# ============================================================
# 1) SYSTEM / ETL ARCHITECTURE DIAGRAM
# ============================================================
arch = graphviz.Digraph("architecture", format="png")
arch.attr(rankdir="LR", bgcolor="white", fontname="Helvetica", splines="ortho")
arch.attr("node", fontname="Helvetica", fontsize="11")

with arch.subgraph(name="cluster_src") as c:
    c.attr(label="Operational Source Systems", style="rounded,filled", fillcolor="#eaf2f8", color="#2c5f8a")
    c.node("core", "Core Banking\nSystem\n(Customers, Accounts)", shape="box", style="filled", fillcolor="white")
    c.node("branch", "Branch Mgmt\nSystem", shape="box", style="filled", fillcolor="white")
    c.node("pay", "Payment\nGateway", shape="box", style="filled", fillcolor="white")
    c.node("txn", "Transaction\nProcessing System", shape="box", style="filled", fillcolor="white")

with arch.subgraph(name="cluster_etl") as c:
    c.attr(label="ETL Layer", style="rounded,filled", fillcolor="#fdf2e3", color="#b9770e")
    c.node("extract", "Extract", shape="box", style="filled", fillcolor="white")
    c.node("clean", "Transform:\nCleaning, Integration,\nTransformation, Reduction", shape="box", style="filled", fillcolor="white")
    c.node("load", "Load", shape="box", style="filled", fillcolor="white")

with arch.subgraph(name="cluster_dw") as c:
    c.attr(label="Data Warehouse", style="rounded,filled", fillcolor="#eafaf1", color="#1e8449")
    c.node("dw", "Star Schema\nFact_Transactions +\n5 Dimension Tables", shape="cylinder", style="filled", fillcolor="white")

with arch.subgraph(name="cluster_analytics") as c:
    c.attr(label="Analytics Layer", style="rounded,filled", fillcolor="#f4ecf7", color="#6c3483")
    c.node("olap", "OLAP Engine\n(Roll-up, Drill-down,\nSlice, Dice, Pivot)", shape="box", style="filled", fillcolor="white")
    c.node("mining", "Data Mining\n(Decision Tree, Naive\nBayes, SVM)", shape="box", style="filled", fillcolor="white")

with arch.subgraph(name="cluster_out") as c:
    c.attr(label="Consumption", style="rounded,filled", fillcolor="#fdedec", color="#943126")
    c.node("dash", "Dashboards /\nReports", shape="box", style="filled", fillcolor="white")
    c.node("fraud", "Fraud Alerts /\nClassification Output", shape="box", style="filled", fillcolor="white")

arch.edge("core", "extract"); arch.edge("branch", "extract")
arch.edge("pay", "extract"); arch.edge("txn", "extract")
arch.edge("extract", "clean"); arch.edge("clean", "load"); arch.edge("load", "dw")
arch.edge("dw", "olap"); arch.edge("dw", "mining")
arch.edge("olap", "dash"); arch.edge("mining", "fraud")

arch.render(FIG + "diagram1_architecture", format="png", cleanup=True)

# ============================================================
# 2) STAR SCHEMA ER DIAGRAM
# ============================================================
star = graphviz.Digraph("star_schema", format="png")
star.attr(bgcolor="white", fontname="Helvetica", nodesep="0.6", ranksep="0.8")
star.attr("node", shape="none", fontname="Helvetica")

def table_html(title, cols, color):
    rows = "".join(f'<TR><TD ALIGN="LEFT">{c}</TD></TR>' for c in cols)
    return f'''<
<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="6">
<TR><TD BGCOLOR="{color}"><FONT COLOR="white"><B>{title}</B></FONT></TD></TR>
{rows}
</TABLE>>'''

star.node("FACT", table_html("FACT_TRANSACTIONS", [
    "transaction_bk (PK)", "date_key (FK)", "customer_key (FK)", "account_key (FK)",
    "branch_key (FK)", "payment_key (FK)", "transaction_amount", "amount_norm",
    "amount_band", "hour_band", "transaction_type", "device_type",
    "is_foreign_location", "amount_outlier_flag", "is_fraud"
], "#2c5f8a"))

star.node("DIM_DATE", table_html("DIM_DATE", [
    "date_key (PK)", "txn_date", "txn_year", "txn_quarter", "txn_month",
    "txn_month_name", "txn_day", "txn_weekday", "is_weekend"
], "#1e8449"))

star.node("DIM_CUST", table_html("DIM_CUSTOMER", [
    "customer_key (PK)", "customer_bk", "customer_name", "age", "gender",
    "city", "customer_segment", "join_date"
], "#1e8449"))

star.node("DIM_ACC", table_html("DIM_ACCOUNT", [
    "account_key (PK)", "account_bk", "customer_id", "account_type",
    "branch_id", "account_open_date", "account_status"
], "#1e8449"))

star.node("DIM_BR", table_html("DIM_BRANCH", [
    "branch_key (PK)", "branch_bk", "branch_name", "city", "region", "ifsc_code"
], "#1e8449"))

star.node("DIM_PAY", table_html("DIM_PAYMENT_METHOD", [
    "payment_key (PK)", "payment_bk", "payment_method", "channel_type"
], "#1e8449"))

for d in ["DIM_DATE", "DIM_CUST", "DIM_ACC", "DIM_BR", "DIM_PAY"]:
    star.edge(d, "FACT", arrowhead="none", color="#7f8c8d")

star.render(FIG + "diagram2_star_schema", format="png", cleanup=True)

print("Diagrams generated: diagram1_architecture.png, diagram2_star_schema.png")
