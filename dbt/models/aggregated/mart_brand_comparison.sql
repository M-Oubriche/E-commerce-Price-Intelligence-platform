{{ config(materialized='table') }}

select
    product_category,
    product_brand,
    count(distinct product_external_id) as total_products,
    avg(converted_price_usd) as avg_price_usd,
    avg(avg_rating) as avg_rating,
    sum(review_count) as total_reviews
from {{ ref('int_price_history') }}
group by
    product_category,
    product_brand
