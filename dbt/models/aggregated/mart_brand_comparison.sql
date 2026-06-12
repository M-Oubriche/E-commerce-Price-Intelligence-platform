{{ config(materialized='table') }}

select
    product_category,
    product_brand,
    count(distinct product_unified_id) as total_products,
    avg(converted_price_usd) as avg_price_usd,
    avg(avg_rating) as avg_rating,
    sum(review_count) as total_reviews
from {{ ref('int_clean_prices') }}
group by
    product_category,
    product_brand
