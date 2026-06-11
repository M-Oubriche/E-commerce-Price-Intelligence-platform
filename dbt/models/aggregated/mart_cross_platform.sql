{{ config(materialized='table') }}

WITH latest_prices AS (
    SELECT
        product_unified_id,
        product_name,
        product_category,
        source,
        converted_price_usd,
        -- Using ROW_NUMBER to get the absolute latest scrape per product/source
        ROW_NUMBER() OVER(
            PARTITION BY product_unified_id, source 
            ORDER BY scraped_at DESC
        ) as rn
    FROM {{ ref('int_clean_prices') }}
),

current_source_prices AS (
    SELECT * FROM latest_prices WHERE rn = 1
),

-- Here you define YOUR store. Let's assume your store is tracked as 'mystore'
my_pricing AS (
    SELECT 
        product_unified_id, 
        converted_price_usd AS my_price 
    FROM current_source_prices 
    WHERE source = 'mystore' -- Update this with your actual source identifier
),

market_pricing AS (
    SELECT
        product_unified_id,
        MIN(converted_price_usd) AS lowest_competitor_price
    FROM current_source_prices
    WHERE source != 'mystore'
    GROUP BY product_unified_id
)

SELECT
    c.product_unified_id,
    c.product_name,
    c.product_category,
    
    -- Cross-platform data
    m.my_price,
    cp.lowest_competitor_price,
    
    -- Margin calculation (Your Price - Lowest Comp) / Your Price
    -- This assumes you map "margin health" to how far you are from the lowest competitor
    CASE 
        WHEN m.my_price IS NULL OR cp.lowest_competitor_price IS NULL THEN NULL
        ELSE ROUND(((m.my_price - cp.lowest_competitor_price) / m.my_price) * 100, 2)
    END AS competitive_margin_pct,
    
    -- Status assignment based on the UI rules
    CASE
        WHEN m.my_price IS NULL OR cp.lowest_competitor_price IS NULL THEN NULL
        WHEN m.my_price <= cp.lowest_competitor_price THEN 'Excellent'
        WHEN m.my_price <= (cp.lowest_competitor_price * 1.05) THEN 'Warning'
        ELSE 'Critical'
    END AS margin_health_status

FROM current_source_prices c
LEFT JOIN my_pricing m ON c.product_unified_id = m.product_unified_id
LEFT JOIN market_pricing cp ON c.product_unified_id = cp.product_unified_id
WHERE c.rn = 1
GROUP BY 
    c.product_unified_id, 
    c.product_name, 
    c.product_category,
    m.my_price,
    cp.lowest_competitor_price
