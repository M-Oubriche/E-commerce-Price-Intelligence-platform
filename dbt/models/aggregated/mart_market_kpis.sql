{{ config(materialized='table') }}

WITH daily_market_avg AS (
    SELECT 
        price_date,
        AVG(daily_lowest_price_usd) as daily_avg_price
    FROM {{ ref('int_price_history') }}
    WHERE price_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY price_date
),

global_catalog AS (
    SELECT COUNT(DISTINCT product_unified_id) AS total_market_items
    FROM {{ ref('int_clean_prices') }}
)

SELECT
    -- PRICE VOLATILITY: 
    -- Calculates how much the market jumps using Coefficient of Variation (StdDev / Mean) over 30 days
    ROUND(
        (STDDEV(daily_avg_price) / NULLIF(AVG(daily_avg_price), 0)) * 100
    , 2) AS price_volatility_pct,
    
    -- Used by the backend to calculate Your Market Visibility 
    -- (The backend divides your in-stock PostgreSQL items by this number)
    MAX(g.total_market_items) AS total_market_items

FROM daily_market_avg
CROSS JOIN global_catalog g
