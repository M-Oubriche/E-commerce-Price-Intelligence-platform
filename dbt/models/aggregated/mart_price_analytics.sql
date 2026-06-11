{{ config(materialized='table') }}

select
    product_external_id,
    product_name,
    product_brand,
    product_category,
    source,
    count(1) as total_scrapes,
    avg(converted_price_usd) as avg_price_usd,
    min(converted_price_usd) as min_price_usd,
    max(converted_price_usd) as max_price_usd,
    stddev(converted_price_usd) as price_volatility_usd,
    max(scraped_at) as last_scraped_at
from {{ ref('int_price_history') }}
group by
    product_external_id,
    product_name,
    product_brand,
    product_category,
    source
