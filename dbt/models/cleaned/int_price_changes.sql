{{ config(materialized='view') }}

with price_history as (
    select
        row_key,
        raw_id,
        source,
        scraped_at,
        product_unified_id,
        product_name,
        product_brand,
        product_category,
        product_image_url,
        converted_price_usd,
        lag(converted_price_usd) over (
            partition by product_unified_id, source
            order by scraped_at asc
        ) as prev_price_usd,
        lag(scraped_at) over (
            partition by product_unified_id, source
            order by scraped_at asc
        ) as prev_scraped_at
    from {{ ref('int_clean_prices') }}
)

select
    *,
    (converted_price_usd - prev_price_usd) as price_diff_usd,
    case
        when prev_price_usd > 0 then ((converted_price_usd - prev_price_usd) / prev_price_usd) * 100
        else 0
    end as price_change_percent,
    case
        when converted_price_usd < prev_price_usd then true
        else false
    end as is_price_drop,
    case
        when converted_price_usd > prev_price_usd then true
        else false
    end as is_price_spike
from price_history
