#!/usr/bin/env python3
import sys
import os
import json
import uuid
from datetime import datetime
import time
from google.cloud import bigtable
from google.cloud.bigtable import row_filters
import psycopg2

def send_alert_to_postgres(record, prev_price, drop_percent):
    try:
        conn = psycopg2.connect(
            host="app_postgres",
            database=os.environ.get("APP_POSTGRES_DB", "app"),
            user=os.environ.get("APP_POSTGRES_USER", "app_user"),
            password=os.environ.get("APP_POSTGRES_PASSWORD", "app_pass")
        )
        cur = conn.cursor()
        
        product_name = record.get("product", {}).get("name", "Unknown")
        source = record.get("source", "Unknown")
        new_price = record.get("pricing", {}).get("converted_price_usd")
        product_id = record.get("raw_id", "Unknown")
        
        cur.execute(
            "INSERT INTO alert_events (product_id, product_name, source, old_price, new_price, drop_percent) VALUES (%s, %s, %s, %s, %s, %s)",
            (product_id, product_name, source, prev_price, new_price, round(drop_percent, 2))
        )
        conn.commit()
        cur.close()
        conn.close()
        print("DEBUG: Alert successfully inserted into Postgres.", file=sys.stderr)
    except Exception as e:
        print(f"ERROR: Failed to insert alert into Postgres: {e}", file=sys.stderr)

def ingest_to_bigtable(json_str):
    # Initialize Bigtable Client
    project_id = os.environ.get("BIGTABLE_PROJECT_ID", "ecommerce-platform-dev")
    instance_id = os.environ.get("BIGTABLE_INSTANCE_ID", "price-intelligence-db")
    table_id = "ecommerce_prices"
    
    # We assume 'BIGTABLE_EMULATOR_HOST' is set by NiFi/Docker environment
    client = bigtable.Client(project=project_id, admin=True)
    instance = client.instance(instance_id)
    table = instance.table(table_id)
    
    # --- SELF-HEALING: Auto-create table if missing (common in emulator) ---
    try:
        if not table.exists():
            print(f"Table {table_id} missing. Creating now...", file=sys.stderr)
            table.create()
            # Wait a moment for creation to propagate
            time.sleep(1)
            # Create all required column families
            families = ["price_cf", "metadata_cf", "ingestion_cf", "availability_cf", "seller_cf", "ratings_cf", "specs_cf"]
            for cf_id in families:
                cf = table.column_family(cf_id)
                cf.create()
            print(f"Table {table_id} and families {families} created successfully.", file=sys.stderr)
    except Exception as e:
        print(f"Warning during table check/creation: {e}", file=sys.stderr)

    try:
        record = json.loads(json_str)
    except json.JSONDecodeError:
        print("Invalid JSON received.", file=sys.stderr)
        sys.exit(1)

    # Row Key Prefix Components
    category = record.get('product', {}).get('category', 'Unknown').upper()
    brand = record.get('product', {}).get('brand', 'Unknown').replace(" ", "_")
    product_id = record.get('product', {}).get('external_id', 'Unknown')
    source = record.get('source', 'Unknown')
    
    scraped_at = record.get('scraped_at', datetime.utcnow().isoformat())
    try:
        dt = datetime.fromisoformat(scraped_at.replace('Z', '+00:00'))
        ts_str = dt.strftime("%Y%m%d%H%M%S")
    except ValueError:
        ts_str = "00000000000000"

    # 1. SMART LOOKUP: Find the previous price for this specific product
    # Row Prefix: {category}#{brand}#{product_id}#{source}#
    row_prefix = f"{category}#{brand}#{product_id}#{source}#".encode('utf-8')
    
    previous_price = None
    try:
        # Scan Bigtable for the most recent entry for this product
        partial_rows = table.read_rows(filter_=row_filters.RowKeyRegexFilter(row_prefix + b".*"))
        
        # In a real environment with millions of rows, we'd use a more specialized RowKey design 
        # or a separate 'latest_prices' table, but for this emulator scale, scanning the prefix works well.
        last_row = None
        for r in partial_rows:
            last_row = r
            
        if last_row:
            # Extract price from the price_cf:converted_price_usd column
            cells = last_row.cells.get("price_cf", {}).get(b"converted_price_usd", [])
            if cells:
                previous_price = float(cells[0].value.decode('utf-8'))
                print(f"DEBUG: Found previous price for product: {previous_price}", file=sys.stderr)
    except Exception as e:
        print(f"WARNING: Previous price lookup failed: {e}", file=sys.stderr)

    # 2. COMPARISON LOGIC
    current_price = record.get("pricing", {}).get("converted_price_usd")
    price_drop_percent = 0.0
    is_drop = False

    if previous_price and current_price:
        if current_price < previous_price:
            price_drop_percent = ((previous_price - current_price) / previous_price) * 100
            if price_drop_percent >= 5.0: # Detect drops greater than 5%
                is_drop = True
                print(f"!!! PRICE DROP DETECTED: {price_drop_percent:.2f}% !!!", file=sys.stderr)
                send_alert_to_postgres(record, previous_price, price_drop_percent)

    # 3. CONSTRUCT NEW ROW
    row_key = f"{category}#{brand}#{product_id}#{source}#{ts_str}".encode('utf-8')
    row = table.direct_row(row_key)
    
    # Ingestion CF
    row.set_cell("ingestion_cf", b"raw_id", record.get("raw_id", str(uuid.uuid4())).encode('utf-8'))
    row.set_cell("ingestion_cf", b"ingestion_type", b"real_time")
    row.set_cell("ingestion_cf", b"scraped_at", scraped_at.encode('utf-8'))
    
    # NEW: Store the drop intelligence
    row.set_cell("ingestion_cf", b"is_price_drop", str(is_drop).encode('utf-8'))
    row.set_cell("ingestion_cf", b"price_drop_percent", f"{price_drop_percent:.2f}".encode('utf-8'))
    if previous_price:
        row.set_cell("ingestion_cf", b"prev_price_threshold", str(previous_price).encode('utf-8'))
    
    # Metadata CF (as before)
    prod = record.get("product", {})
    row.set_cell("metadata_cf", b"name", prod.get("name", "").encode('utf-8'))
    row.set_cell("metadata_cf", b"brand", prod.get("brand", "").encode('utf-8'))
    row.set_cell("metadata_cf", b"category", prod.get("category", "").encode('utf-8'))
    row.set_cell("metadata_cf", b"source", source.encode('utf-8'))
    row.set_cell("metadata_cf", b"source_url", record.get("source_url", "").encode('utf-8'))
    
    model_number = prod.get("model_number")
    if model_number:
        row.set_cell("metadata_cf", b"model_number", model_number.encode('utf-8'))
    
    image_url = prod.get("image_url")
    if image_url:
        row.set_cell("metadata_cf", b"image_url", image_url.encode('utf-8'))
        
    # Price CF (as before)
    pricing = record.get("pricing", {})
    for p_field in ["raw_price", "converted_price_usd", "original_price_usd", "discount_percent", "conversion_rate"]:
        if pricing.get(p_field) is not None:
            row.set_cell("price_cf", p_field.encode('utf-8'), str(pricing.get(p_field)).encode('utf-8'))
    
    raw_currency = pricing.get("raw_currency")
    if raw_currency:
        row.set_cell("price_cf", b"raw_currency", raw_currency.encode('utf-8'))

    # Availability CF
    avail = record.get("availability", {})
    row.set_cell("availability_cf", b"in_stock", str(avail.get("in_stock", False)).encode('utf-8'))
    if avail.get("quantity") is not None:
         row.set_cell("availability_cf", b"quantity", str(avail.get("quantity")).encode('utf-8'))
    
    # Seller, Ratings, Specs... (same as before)
    seller = record.get("seller", {})
    if seller.get("seller_name"):
        row.set_cell("seller_cf", b"seller_name", seller.get("seller_name").encode('utf-8'))
    if seller.get("seller_rating") is not None:
        row.set_cell("seller_cf", b"seller_rating", str(seller.get("seller_rating")).encode('utf-8'))
        
    ratings = record.get("ratings")
    if ratings and ratings.get("avg_rating") is not None:
        row.set_cell("ratings_cf", b"avg_rating", str(ratings.get("avg_rating")).encode('utf-8'))
    if ratings and ratings.get("review_count") is not None:
        row.set_cell("ratings_cf", b"review_count", str(ratings.get("review_count")).encode('utf-8'))
        
    specs = record.get("specs")
    if specs:
        row.set_cell("specs_cf", b"json_blob", json.dumps(specs).encode('utf-8'))

    # Write
    row.commit()
    print(json.dumps({
        "status": "success", 
        "row_key": row_key.decode('utf-8'),
        "is_price_drop": is_drop,
        "drop_percent": price_drop_percent
    }))

if __name__ == "__main__":
    # NiFi ExecuteStreamCommand passes flow file contents via stdin
    input_data = sys.stdin.read()
    if input_data:
        ingest_to_bigtable(input_data)
