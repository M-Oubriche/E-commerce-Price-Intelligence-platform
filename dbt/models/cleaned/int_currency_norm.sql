{{ config(materialized='view') }}

select
    row_key,
    raw_id,
    ingestion_type,
    source,
    source_url,
    scraped_at,
    product_external_id,
    product_name,
    product_brand,
    product_category,
    product_image_url,
    raw_price,
    raw_currency,
    coalesce(converted_price_usd, 
             case 
                when upper(raw_currency) = 'USD' then raw_price
                when conversion_rate is not null and conversion_rate > 0 then raw_price / conversion_rate
                else raw_price
             end) as converted_price_usd,
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
from {{ ref('stg_all_sources') }}
