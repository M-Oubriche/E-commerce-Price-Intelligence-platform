{{ config(materialized='table') }}

WITH latest_prices AS (
    SELECT
        product_unified_id,
        source,
        converted_price_usd,
        avg_rating,
        in_stock,
        ROW_NUMBER() OVER(
            PARTITION BY product_unified_id, source 
            ORDER BY scraped_at DESC
        ) as rn
    FROM {{ ref('int_clean_prices') }}
),

current_market AS (
    SELECT * FROM latest_prices WHERE rn = 1
),

global_metrics AS (
    -- Get the total unique products across all platforms to calculate Market Share
    SELECT COUNT(DISTINCT product_unified_id) AS total_market_products
    FROM current_market
),

platform_metrics AS (
    SELECT
        source AS platform,
        COUNT(DISTINCT product_unified_id) AS catalog_size,
        AVG(converted_price_usd) AS avg_price,
        AVG(avg_rating) AS platform_avg_rating,
        -- Calculate what percentage of their catalog is actually in stock
        (SUM(CASE WHEN in_stock THEN 1 ELSE 0 END) * 100.0) / COUNT(product_unified_id) AS in_stock_pct
    FROM current_market
    GROUP BY source
)

SELECT
    p.platform,
    p.catalog_size,
    ROUND(p.avg_price, 2) AS avg_price,
    
    -- MARKET SHARE: Platform catalog size / Total market size
    ROUND((p.catalog_size * 100.0) / NULLIF(g.total_market_products, 0), 2) AS market_share_pct,
    
    ROUND(p.in_stock_pct, 2) AS visibility_score,
    
    -- COMPETITIVENESS SCORE (1-1000 Power Rank)
    -- Based on the spec: Mix of Ratings, Stock Availability, and Market Share
    -- Max 300 points for Rating (e.g., 4.5/5 * 300 = 270)
    -- Max 300 points for Stock Availability (e.g., 90% in stock = 270)
    -- Max 400 points for Market Share penetration
    ROUND(
        COALESCE((p.platform_avg_rating / 5.0) * 300, 150) + 
        (p.in_stock_pct / 100.0 * 300) +
        ((p.catalog_size * 1.0 / NULLIF(g.total_market_products, 0)) * 400)
    , 0) AS competitiveness_score

FROM platform_metrics p
CROSS JOIN global_metrics g
