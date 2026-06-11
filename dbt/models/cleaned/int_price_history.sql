{{ config(
    materialized='incremental',
    unique_key='row_key'
) }}

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
from {{ ref('int_currency_norm') }}

{% if is_incremental() %}
  -- this filter will only be applied on an incremental run
  where scraped_at > (select max(scraped_at) from {{ this }})
{% endif %}
