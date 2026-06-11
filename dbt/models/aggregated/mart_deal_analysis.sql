{{ config(materialized='table') }}

WITH history AS (
    SELECT
        product_unified_id,
        product_name,
        product_category,
        product_image_url,
        source,
        price_date,
        daily_lowest_price_usd,
        -- Get the most recent date we have for this product/source
        MAX(price_date) OVER(PARTITION BY product_unified_id, source) AS max_date
    FROM {{ ref('int_price_history') }}
),

metrics AS (
    SELECT
        product_unified_id,
        product_name,
        product_category,
        MAX(product_image_url) AS product_image_url,
        source,
        
        -- Current price (price on the most recent date)
        MAX(CASE WHEN price_date = max_date THEN daily_lowest_price_usd END) AS current_price,
        
        -- Averages
        AVG(CASE WHEN price_date >= DATE_SUB(max_date, INTERVAL 30 DAY) THEN daily_lowest_price_usd END) AS avg_price_30d,
        
        -- Historical minimum
        MIN(daily_lowest_price_usd) AS all_time_low_price,
        
        -- Max price recently (to detect fake deals where price spiked before drop)
        MAX(CASE WHEN price_date >= DATE_SUB(max_date, INTERVAL 14 DAY) THEN daily_lowest_price_usd END) AS max_price_14d
        
    FROM history
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
    current_price,
    avg_price_30d,
    all_time_low_price,
    
    -- Deal Score Calculation (0.0 to 10.0)
    -- If current price is at or below the all-time low, score is 10.
    -- If current price is above 30 day avg, score is 0 to 5.
    CASE
        WHEN current_price IS NULL OR avg_price_30d IS NULL THEN 0.0
        WHEN current_price <= all_time_low_price THEN 10.0
        WHEN current_price < avg_price_30d THEN
            -- Score scales from 5.0 (at average) to 9.9 (near all time low)
            ROUND(5.0 + (5.0 * ((avg_price_30d - current_price) / NULLIF(avg_price_30d - all_time_low_price, 0))), 1)
        ELSE 
            -- Poor deal, scales down from 5.0
            ROUND(GREATEST(0.0, 5.0 - (5.0 * ((current_price - avg_price_30d) / avg_price_30d))), 1)
    END AS deal_score,
    
    -- Fake Deal Detection
    -- If the 14-day max was significantly higher (>15%) than the 30-day average, 
    -- and the current price just "dropped" back near the average, it's likely an artificial spike.
    CASE 
        WHEN max_price_14d > (avg_price_30d * 1.15) 
         AND current_price >= (avg_price_30d * 0.95) THEN TRUE
        ELSE FALSE
    END AS is_fake_deal

FROM metrics
WHERE current_price IS NOT NULL
