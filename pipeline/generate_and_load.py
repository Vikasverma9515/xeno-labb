"""
Xeno Analytics Lab — synthetic data generator + loader.

Builds a realistic-shaped D2C retail dataset: customers with tiered purchase
behavior (so RFM segmentation actually has structure to find), orders, and a
large campaign_events table (millions of rows) that is deliberately the
performance bottleneck used by the Query Lab page.

Usage:
    DATABASE_URL=postgres://xeno:xeno_local_dev@localhost:5433/xeno_lab python generate_and_load.py
"""

import os
import io
import random
from datetime import timedelta

import numpy as np
import pandas as pd
import psycopg2
from faker import Faker

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgres://xeno:xeno_local_dev@localhost:5433/xeno_lab"
)

NUM_CUSTOMERS = int(os.environ.get("SEED_CUSTOMERS", 20_000))
NUM_PRODUCTS = int(os.environ.get("SEED_PRODUCTS", 300))
AVG_EVENTS_PER_CUSTOMER = int(os.environ.get("SEED_AVG_EVENTS", 150))

NOW = pd.Timestamp("2026-09-01")
LOOKBACK_DAYS = 3 * 365

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
fake = Faker()
Faker.seed(SEED)

CATEGORIES = ["Apparel", "Footwear", "Beauty", "Accessories", "Home", "Wellness"]
PERSONAS = ["Trend Seeker", "Value Shopper", "Loyalist", "Occasional Browser", "Gift Shopper"]
CHANNELS = ["whatsapp", "sms", "email", "digital"]
CHANNEL_WEIGHTS = [0.34, 0.24, 0.24, 0.18]

# tier -> (probability, order_count_range, recency_skew_days_for_last_order)
TIERS = {
    "champion":   dict(p=0.15, orders=(12, 30), recency_max=25),
    "loyal":      dict(p=0.25, orders=(5, 12),  recency_max=75),
    "occasional": dict(p=0.30, orders=(2, 4),   recency_max=200),
    "one_time":   dict(p=0.20, orders=(1, 1),   recency_max=LOOKBACK_DAYS),
    "never":      dict(p=0.10, orders=(0, 0),   recency_max=None),
}

# channel -> (open_prob, click_given_open_prob, convert_given_click_prob)
CHANNEL_FUNNEL = {
    "whatsapp": (0.62, 0.45, 0.30),
    "sms":      (0.40, 0.30, 0.18),
    "email":    (0.28, 0.20, 0.10),
    "digital":  (0.15, 0.35, 0.06),
}
TIER_ENGAGEMENT_MULT = {
    "champion": 1.4, "loyal": 1.2, "occasional": 1.0, "one_time": 0.8, "never": 0.6,
}


def log(msg):
    print(f"[seed] {msg}", flush=True)


def run_sql_file(cur, path):
    with open(path, "r") as f:
        cur.execute(f.read())


def copy_df(conn, df: pd.DataFrame, table: str, columns: list[str]):
    buf = io.StringIO()
    df.to_csv(buf, index=False, header=False, columns=columns)
    buf.seek(0)
    with conn.cursor() as cur:
        cur.copy_expert(
            f"COPY {table} ({', '.join(columns)}) FROM STDIN WITH (FORMAT csv, NULL '')", buf
        )
    conn.commit()


def gen_customers():
    log(f"generating {NUM_CUSTOMERS:,} customers...")
    tiers = list(TIERS.keys())
    probs = [TIERS[t]["p"] for t in tiers]
    tier_choice = np.random.choice(tiers, size=NUM_CUSTOMERS, p=probs)

    signup_offsets = np.random.randint(0, LOOKBACK_DAYS, size=NUM_CUSTOMERS)
    signup_dates = [NOW - timedelta(days=int(d)) for d in signup_offsets]

    rows = []
    for i in range(NUM_CUSTOMERS):
        first, last = fake.first_name(), fake.last_name()
        rows.append({
            "first_name": first,
            "last_name": last,
            "email": f"{first.lower()}.{last.lower()}{i}@example.com",
            "city": fake.city(),
            "state": fake.state(),
            "persona": random.choice(PERSONAS),
            "signup_date": signup_dates[i].date().isoformat(),
            "_tier": tier_choice[i],
        })
    return pd.DataFrame(rows)


def gen_products():
    log(f"generating {NUM_PRODUCTS:,} products...")
    rows = []
    for _ in range(NUM_PRODUCTS):
        rows.append({
            "name": fake.catch_phrase(),
            "category": random.choice(CATEGORIES),
            "price": round(random.uniform(299, 4999), 2),
        })
    return pd.DataFrame(rows)


def gen_orders(customers: pd.DataFrame, product_prices: np.ndarray):
    log("generating orders (tiered recency/frequency per customer)...")
    rows = []
    last_order_id_by_customer = {}
    running_id = 0

    for _, c in customers.iterrows():
        tier = TIERS[c["_tier"]]
        lo, hi = tier["orders"]
        n_orders = random.randint(lo, hi)
        if n_orders == 0:
            continue

        signup = pd.Timestamp(c["signup_date"])
        recency_max = tier["recency_max"]
        last_order_days_ago = random.randint(0, min(recency_max, (NOW - signup).days or 1))
        last_order_date = NOW - timedelta(days=last_order_days_ago)
        if last_order_date < signup:
            last_order_date = signup

        order_dates = [last_order_date]
        for _ in range(n_orders - 1):
            span = max((last_order_date - signup).days, 1)
            d = signup + timedelta(days=random.randint(0, span))
            order_dates.append(d)

        for d in order_dates:
            price = float(np.random.choice(product_prices))
            qty = random.randint(1, 3)
            running_id += 1
            rows.append({
                "customer_id": c["customer_id"],
                "product_id": random.randint(1, NUM_PRODUCTS),
                "order_date": (d + timedelta(hours=random.randint(8, 21))).isoformat(),
                "quantity": qty,
                "unit_price": price,
                "revenue": round(price * qty, 2),
            })
        last_order_id_by_customer[c["customer_id"]] = running_id

    return pd.DataFrame(rows), last_order_id_by_customer


def gen_campaign_events(customers: pd.DataFrame, last_order_id_by_customer: dict):
    n = NUM_CUSTOMERS * AVG_EVENTS_PER_CUSTOMER
    log(f"generating ~{n:,} campaign events (vectorized)...")

    tier_mult = customers["_tier"].map(TIER_ENGAGEMENT_MULT).to_numpy()
    weights = tier_mult / tier_mult.sum()
    customer_idx = np.random.choice(len(customers), size=n, p=weights)
    customer_ids = customers["customer_id"].to_numpy()[customer_idx]

    signup_days = (NOW - pd.to_datetime(customers["signup_date"])).dt.days.to_numpy()
    lower_bound_days = signup_days[customer_idx]
    offset_days = (np.random.random(n) * lower_bound_days).astype(int)
    sent_at = [NOW - timedelta(days=int(d), hours=int(random.random() * 24)) for d in offset_days]

    channels = np.random.choice(CHANNELS, size=n, p=CHANNEL_WEIGHTS)

    opened = np.zeros(n, dtype=bool)
    clicked = np.zeros(n, dtype=bool)
    converted = np.zeros(n, dtype=bool)
    engagement_mult = tier_mult[customer_idx]

    for ch in CHANNELS:
        mask = channels == ch
        open_p, click_p, conv_p = CHANNEL_FUNNEL[ch]
        opened[mask] = np.random.random(mask.sum()) < np.clip(open_p * engagement_mult[mask], 0, 0.95)
        clicked_mask = mask & opened
        clicked[clicked_mask] = np.random.random(clicked_mask.sum()) < click_p
        converted_mask = mask & clicked
        converted[converted_mask] = np.random.random(converted_mask.sum()) < conv_p

    has_order = np.array([cid in last_order_id_by_customer for cid in customer_ids])
    converted = converted & has_order

    opened_at = [s + timedelta(hours=random.uniform(0.1, 20)) if o else None for s, o in zip(sent_at, opened)]
    clicked_at = [
        oa + timedelta(minutes=random.uniform(1, 120)) if c and oa else None
        for oa, c in zip(opened_at, clicked)
    ]
    converted_order_id = [
        last_order_id_by_customer.get(cid) if conv else None
        for cid, conv in zip(customer_ids, converted)
    ]

    df = pd.DataFrame({
        "customer_id": customer_ids,
        "channel": channels,
        "sent_at": [s.isoformat() for s in sent_at],
        "opened_at": [o.isoformat() if o else None for o in opened_at],
        "clicked_at": [c.isoformat() if c else None for c in clicked_at],
    })
    df["converted_order_id"] = pd.array(converted_order_id, dtype="Int64")
    return df


def main():
    log(f"connecting to {DATABASE_URL.split('@')[-1]}")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False

    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    with conn.cursor() as cur:
        log("applying schema (001) + analytics views (002)...")
        run_sql_file(cur, os.path.join(base, "db", "001_schema.sql"))
        run_sql_file(cur, os.path.join(base, "db", "002_analytics_views.sql"))
    conn.commit()

    customers = gen_customers()
    copy_df(conn, customers, "dim_customer",
            ["first_name", "last_name", "email", "city", "state", "persona", "signup_date"])
    with conn.cursor() as cur:
        cur.execute("select customer_id from dim_customer order by customer_id")
        customers["customer_id"] = [r[0] for r in cur.fetchall()]
    log(f"loaded {len(customers):,} customers")

    products = gen_products()
    copy_df(conn, products, "dim_product", ["name", "category", "price"])
    product_prices = products["price"].to_numpy()
    log(f"loaded {len(products):,} products")

    orders_df, last_order_id_by_customer = gen_orders(customers, product_prices)
    copy_df(conn, orders_df, "fact_orders",
            ["customer_id", "product_id", "order_date", "quantity", "unit_price", "revenue"])
    log(f"loaded {len(orders_df):,} orders")

    events_df = gen_campaign_events(customers, last_order_id_by_customer)
    copy_df(conn, events_df, "fact_campaign_events",
            ["customer_id", "channel", "sent_at", "opened_at", "clicked_at", "converted_order_id"])
    log(f"loaded {len(events_df):,} campaign events")

    with conn.cursor() as cur:
        cur.execute("analyze")
    conn.commit()
    conn.close()
    log("done.")


if __name__ == "__main__":
    main()
