{{ config(materialized='table') }}

select
    date_trunc(scraped_at, WEEK) as scrape_week,
    product_category,
    count(distinct product_external_id) as unique_products,
    count(1) as total_observations,
    avg(converted_price_usd) as avg_price_usd,
    min(converted_price_usd) as min_price_usd,
    max(converted_price_usd) as max_price_usd,
    stddev(converted_price_usd) as price_volatility_usd
from {{ ref('int_price_history') }}
group by
    scrape_week,
    product_category
