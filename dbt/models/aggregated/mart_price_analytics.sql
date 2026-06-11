{{ config(materialized='table') }}

WITH latest_prices AS (
    SELECT
        product_unified_id,
        product_name,
        product_category,
        product_image_url,
        source,
        seller_name,
        converted_price_usd,
        in_stock,
        scraped_at,
        -- Get rank to find the absolute latest price per source
        ROW_NUMBER() OVER(
            PARTITION BY product_unified_id, source, seller_name 
            ORDER BY scraped_at DESC
        ) as rn
    FROM {{ ref('stg_raw_prices') }}
),

current_market AS (
    SELECT * FROM latest_prices WHERE rn = 1
)

SELECT
    product_unified_id,
    product_name,
    product_category,
    MAX(product_image_url) AS product_image_url,
    
    -- Analytics Metrics
    COUNT(DISTINCT source) AS platforms_present,
    COUNT(DISTINCT seller_name) AS seller_count,
    
    MIN(converted_price_usd) AS absolute_lowest_price_usd,
    AVG(converted_price_usd) AS market_average_price_usd,
    MAX(converted_price_usd) AS absolute_highest_price_usd,
    
    -- Volatility metric (max - min spread)
    MAX(converted_price_usd) - MIN(converted_price_usd) AS price_spread_usd,
    
    MAX(scraped_at) AS last_market_update
    
FROM current_market
GROUP BY 
    product_unified_id,
    product_name,
    product_category
