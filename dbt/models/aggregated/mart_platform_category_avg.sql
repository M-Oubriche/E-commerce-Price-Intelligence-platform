{{ config(materialized='table') }}

WITH latest_prices AS (
    SELECT
        product_unified_id,
        product_category,
        source,
        converted_price_usd,
        ROW_NUMBER() OVER(
            PARTITION BY product_unified_id, source 
            ORDER BY scraped_at DESC
        ) as rn
    FROM {{ ref('stg_raw_prices') }}
),

current_market AS (
    SELECT * FROM latest_prices WHERE rn = 1
)

SELECT
    product_category,
    source AS platform,
    COUNT(DISTINCT product_unified_id) AS items_on_platform,
    ROUND(AVG(converted_price_usd), 2) AS avg_price_usd
    
FROM current_market
GROUP BY 
    product_category, 
    source
