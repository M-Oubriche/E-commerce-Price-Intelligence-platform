{{ config(materialized='table') }}

WITH latest_two_days AS (
    SELECT
        product_unified_id,
        product_name,
        product_category,
        product_image_url,
        source,
        price_date,
        daily_lowest_price_usd,
        -- Rank rows by date descending to get Today (rn=1) and Yesterday (rn=2)
        DENSE_RANK() OVER(
            PARTITION BY product_unified_id, source 
            ORDER BY price_date DESC
        ) AS rn
    FROM {{ ref('int_price_history') }}
),

pivot_days AS (
    SELECT
        product_unified_id,
        product_name,
        product_category,
        MAX(product_image_url) AS product_image_url,
        source,
        MAX(CASE WHEN rn = 1 THEN price_date END) AS latest_date,
        MAX(CASE WHEN rn = 1 THEN daily_lowest_price_usd END) AS latest_price,
        MAX(CASE WHEN rn = 2 THEN daily_lowest_price_usd END) AS previous_price
    FROM latest_two_days
    WHERE rn IN (1, 2)
    GROUP BY
        product_unified_id,
        product_name,
        product_category,
        source
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
    
    -- Calculate absolute and percentage drop
    previous_price - latest_price AS absolute_drop_usd,
    ROUND(((previous_price - latest_price) / previous_price) * 100, 2) AS drop_percentage
    
FROM pivot_days
-- Only include products that actually dropped in price
WHERE latest_price < previous_price 
  -- Ensure the latest price is actually recent (e.g., within the last 3 days)
  AND latest_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)
ORDER BY drop_percentage DESC
