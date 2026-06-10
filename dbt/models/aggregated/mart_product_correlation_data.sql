{{ config(materialized='table') }}

WITH latest_prices AS (
    SELECT
        product_unified_id,
        product_category,
        converted_price_usd,
        avg_rating,
        review_count,
        -- Take average across all sources to get a single product view
        ROW_NUMBER() OVER(
            PARTITION BY product_unified_id 
            ORDER BY scraped_at DESC
        ) as rn
    FROM {{ ref('stg_raw_prices') }}
    WHERE avg_rating IS NOT NULL
)

SELECT
    product_unified_id,
    product_category,
    converted_price_usd AS price,
    avg_rating AS rating,
    review_count AS reviews
FROM latest_prices
WHERE rn = 1
