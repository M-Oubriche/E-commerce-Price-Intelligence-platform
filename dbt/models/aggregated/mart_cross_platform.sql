{{ config(materialized='table') }}

with latest_prices as (
    -- Get the most recent price for each product from each source
    select
        product_external_id,
        product_name,
        product_brand,
        product_category,
        source,
        converted_price_usd,
        scraped_at,
        row_number() over (
            partition by product_external_id, source
            order by scraped_at desc
        ) as rn
    from {{ ref('int_price_history') }}
),

filtered_latest as (
    select *
    from latest_prices
    where rn = 1
),

stats as (
    select
        product_external_id,
        avg(converted_price_usd) as avg_cross_platform_price,
        min(converted_price_usd) as min_cross_platform_price,
        max(converted_price_usd) as max_cross_platform_price
    from filtered_latest
    group by product_external_id
)

select
    l.product_external_id,
    l.product_name,
    l.product_brand,
    l.product_category,
    l.source,
    l.converted_price_usd,
    s.avg_cross_platform_price,
    s.min_cross_platform_price,
    s.max_cross_platform_price,
    (l.converted_price_usd - s.min_cross_platform_price) as price_above_minimum,
    l.scraped_at as last_scraped_at
from filtered_latest l
join stats s on l.product_external_id = s.product_external_id
