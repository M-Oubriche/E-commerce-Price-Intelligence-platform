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

def ingest_to_bigtable(json_str):
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
    project_id  = os.environ.get("BIGTABLE_PROJECT_ID")
    instance_id = os.environ.get("BIGTABLE_INSTANCE_ID")
    if not project_id or not instance_id:
        print(
            "ERROR: BIGTABLE_PROJECT_ID and BIGTABLE_INSTANCE_ID must be set. "
            "Check your .env file and docker-compose.yml.",
            file=sys.stderr
        )
        sys.exit(1)
    table_id = "ecommerce_prices"
    
    # When BIGTABLE_EMULATOR_HOST is NOT set (production), the client connects
    # to real Google Cloud Bigtable using GOOGLE_APPLICATION_CREDENTIALS.
    client = bigtable.Client(project=project_id, admin=True)
    instance = client.instance(instance_id)
    table = instance.table(table_id)
    
    # Auto-create table
    try:
        if not table.exists():
            print(f"Table {table_id} missing. Creating now...", file=sys.stderr)
            table.create()
            time.sleep(1)
            families = ["price_cf", "metadata_cf", "ingestion_cf", "availability_cf", "seller_cf", "ratings_cf", "specs_cf"]
            for cf_id in families:
                cf = table.column_family(cf_id)
                cf.create()
            print(f"Table {table_id} created successfully.", file=sys.stderr)
    except Exception as e:
        print(f"Warning during table check/creation: {e}", file=sys.stderr)

    # Postgres connection for alerts
    pg_conn = None
    try:
        # Use DB name from .env which is pulseprice_db
        pg_conn = psycopg2.connect(
            host="app_postgres",
            database=os.environ.get("APP_POSTGRES_DB", "pulseprice_db"),
            user=os.environ.get("APP_POSTGRES_USER", "pulseprice_user"),
            password=os.environ.get("APP_POSTGRES_PASSWORD", "password")
        )
    except Exception as e:
        print(f"ERROR: Failed to connect to Postgres: {e}", file=sys.stderr)

    mutations = []
    
    for record in records:
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

        row_prefix = f"{category}#{brand}#{product_id}#{source}#".encode('utf-8')
        previous_price = None
        try:
            partial_rows = table.read_rows(filter_=row_filters.RowKeyRegexFilter(row_prefix + b".*"))
            last_row = None
            for r in partial_rows:
                last_row = r
                
            if last_row:
                cells = last_row.cells.get("price_cf", {}).get(b"converted_price_usd", [])
                if cells:
                    previous_price = float(cells[0].value.decode('utf-8'))
        except Exception as e:
            print(f"WARNING: Previous price lookup failed: {e}", file=sys.stderr)

        current_price = record.get("pricing", {}).get("converted_price_usd")
        price_drop_percent = 0.0
        is_drop = False

        if previous_price and current_price:
            if current_price < previous_price:
                price_drop_percent = ((previous_price - current_price) / previous_price) * 100
                if price_drop_percent >= 5.0:
                    is_drop = True
                    print(f"!!! PRICE DROP DETECTED: {price_drop_percent:.2f}% !!!", file=sys.stderr)
                    if pg_conn:
                        try:
                            cur = pg_conn.cursor()
                            prod_name = record.get("product", {}).get("name", "Unknown")
                            cur.execute(
                                "INSERT INTO alert_events (product_id, product_name, source, old_price, new_price, drop_percent) VALUES (%s, %s, %s, %s, %s, %s)",
                                (product_id, prod_name, source, previous_price, current_price, round(price_drop_percent, 2))
                            )
                            pg_conn.commit()
                            cur.close()
                        except Exception as e:
                            print(f"ERROR: Failed to insert alert: {e}", file=sys.stderr)
                            pg_conn.rollback()

        row_key = f"{category}#{brand}#{product_id}#{source}#{ts_str}".encode('utf-8')
        row = table.direct_row(row_key)
        
        row.set_cell("ingestion_cf", b"raw_id", record.get("raw_id", str(uuid.uuid4())).encode('utf-8'))
        row.set_cell("ingestion_cf", b"ingestion_type", record.get("ingestion_type", "streaming").encode('utf-8')) # FIX: Bug1
        row.set_cell("ingestion_cf", b"scraped_at", scraped_at.encode('utf-8'))
        row.set_cell("ingestion_cf", b"is_price_drop", str(is_drop).encode('utf-8'))
        row.set_cell("ingestion_cf", b"price_drop_percent", f"{price_drop_percent:.2f}".encode('utf-8'))
        if previous_price:
            row.set_cell("ingestion_cf", b"prev_price_threshold", str(previous_price).encode('utf-8'))
        
        prod = record.get("product", {})
        row.set_cell("metadata_cf", b"name", prod.get("name", "").encode('utf-8'))
        row.set_cell("metadata_cf", b"brand", prod.get("brand", "").encode('utf-8'))
        row.set_cell("metadata_cf", b"category", prod.get("category", "").encode('utf-8'))
        row.set_cell("metadata_cf", b"source", source.encode('utf-8'))
        row.set_cell("metadata_cf", b"source_url", record.get("source_url", "").encode('utf-8'))
        row.set_cell("metadata_cf", b"external_id", prod.get("external_id", "Unknown").encode('utf-8')) # FIX: Bug 1
        
        if prod.get("model_number"):
            row.set_cell("metadata_cf", b"model_number", prod.get("model_number").encode('utf-8'))
        if prod.get("description") is not None:
            row.set_cell("metadata_cf", b"description", prod.get("description").encode('utf-8')) # FIX: Bug 3
        if prod.get("image_url"):
            row.set_cell("metadata_cf", b"image_url", prod.get("image_url").encode('utf-8'))
            
        pricing = record.get("pricing", {})
        for p_field in ["raw_price", "converted_price_usd", "original_price_usd", "discount_percent", "conversion_rate_used"]: # FIX: Bug 2
            if pricing.get(p_field) is not None:
                row.set_cell("price_cf", p_field.encode('utf-8'), str(pricing.get(p_field)).encode('utf-8')) # FIX: Bug 2
        
        if pricing.get("raw_currency"):
            row.set_cell("price_cf", b"raw_currency", pricing.get("raw_currency").encode('utf-8'))

        avail = record.get("availability", {})
        row.set_cell("availability_cf", b"in_stock", str(avail.get("in_stock", False)).encode('utf-8'))
        if avail.get("quantity") is not None:
             row.set_cell("availability_cf", b"quantity", str(avail.get("quantity")).encode('utf-8'))
        if avail.get("shipping_available") is not None:
            row.set_cell("availability_cf", b"shipping_available", str(avail.get("shipping_available")).encode('utf-8')) # FIX: Bug 4
        
        seller = record.get("seller", {})
        if seller.get("seller_name"):
            row.set_cell("seller_cf", b"seller_name", seller.get("seller_name").encode('utf-8'))
        if seller.get("seller_type"):
            row.set_cell("seller_cf", b"seller_type", seller.get("seller_type").encode('utf-8')) # FIX: Bug 5
        if seller.get("seller_rating") is not None:
            row.set_cell("seller_cf", b"seller_rating", str(seller.get("seller_rating")).encode('utf-8'))
        if seller.get("seller_location"):
            row.set_cell("seller_cf", b"seller_location", seller.get("seller_location").encode('utf-8')) # FIX: Bug 5
            
        ratings = record.get("ratings")
        if ratings and ratings.get("avg_rating") is not None:
            row.set_cell("ratings_cf", b"avg_rating", str(ratings.get("avg_rating")).encode('utf-8'))
        if ratings and ratings.get("review_count") is not None:
            row.set_cell("ratings_cf", b"review_count", str(ratings.get("review_count")).encode('utf-8'))
            
        specs = record.get("specs")
        if specs:
            valid_categories = {
                "GPU", "CPU", "RAM", "SSD", "HDD", "Monitor", "Keyboard", 
                "Mouse", "PSU", "Case", "Cooling", "Motherboard", "Laptop", 
                "Desktop", "Mobile", "Peripheral", "Other"
            }
            if isinstance(specs, dict) and all(k in valid_categories and (v is None or isinstance(v, dict)) for k, v in specs.items()): # FIX: Bug2
                row.set_cell("specs_cf", b"json_blob", json.dumps(specs).encode('utf-8')) # FIX: Bug2
            else: # FIX: Bug2
                print("WARNING: Flat or malformed specs structure detected. Skipping specs ingestion.", file=sys.stderr) # FIX: Bug2

        mutations.append(row)
        
        if len(mutations) >= 1000:
            table.mutate_rows(mutations)
            mutations = []

    if mutations:
        table.mutate_rows(mutations)
        
    if pg_conn:
        pg_conn.close()

    print(json.dumps({"status": "success", "processed_records": len(records)}))

if __name__ == "__main__":
    input_data = sys.stdin.read()
    if input_data:
        ingest_to_bigtable(input_data)
