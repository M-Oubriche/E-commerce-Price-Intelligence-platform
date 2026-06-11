{{ config(materialized='view') }}

select
    row_key,
    raw_id,
    ingestion_type,
    source,
    source_url,
    scraped_at,
    product_external_id,
    product_model_number,
    product_name,
    product_brand,
    product_category,
    product_image_url,
    raw_price,
    raw_currency,
    converted_price_usd,
    original_price_usd,
    discount_percent,
    conversion_rate,
    in_stock,
    quantity,
    seller_name,
    seller_rating,
    avg_rating,
    review_count,
    specs_json
from {{ source('price_intelligence', 'raw_ecommerce_prices') }}
where lower(source) in ('pc21', 'pc21.ma')
