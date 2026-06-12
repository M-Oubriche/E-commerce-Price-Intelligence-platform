{{ config(materialized='table') }}

WITH recent_drops AS (
    SELECT
        product_unified_id,
        product_name,
        product_category,
        product_image_url,
        source,
        DATE(scraped_at) AS latest_date,
        converted_price_usd AS latest_price,
        prev_price_usd AS previous_price,
        
        ABS(price_diff_usd) AS absolute_drop_usd,
        ABS(price_change_percent) AS drop_percentage,
        
        -- In case a product drops multiple times today, take the most recent drop
        DENSE_RANK() OVER(
            PARTITION BY product_unified_id, source 
            ORDER BY scraped_at DESC
        ) AS rn
    FROM {{ ref('int_price_changes') }}
    WHERE is_price_drop = true
      AND scraped_at >= TIMESTAMP(DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY))
)

SELECT
    product_unified_id,
    product_name,
    product_category,
    product_image_url,
    source,
    latest_date,
    latest_price,
    previous_price,
    absolute_drop_usd,
    ROUND(drop_percentage, 2) AS drop_percentage
FROM recent_drops
WHERE rn = 1
ORDER BY drop_percentage DESC
