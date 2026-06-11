{{ config(materialized='table') }}

WITH category_daily_averages AS (
    SELECT
        product_category,
        price_date,
        AVG(daily_lowest_price_usd) AS avg_category_price
    FROM {{ ref('int_price_history') }}
    GROUP BY product_category, price_date
),

weekly_aggregates AS (
    SELECT
        product_category,
        -- Current week: Last 7 days
        AVG(CASE 
            WHEN price_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) 
            THEN avg_category_price 
        END) AS current_week_avg,
        
        -- Previous week: Days 8 to 14 ago
        AVG(CASE 
            WHEN price_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY) 
             AND price_date < DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) 
            THEN avg_category_price 
        END) AS previous_week_avg
        
    FROM category_daily_averages
    GROUP BY product_category
)

SELECT
    product_category,
    ROUND(current_week_avg, 2) AS current_week_avg_price,
    ROUND(previous_week_avg, 2) AS previous_week_avg_price,
    
    -- Calculate Week over Week percentage change
    CASE 
        WHEN previous_week_avg IS NULL OR previous_week_avg = 0 THEN 0.0
        ELSE ROUND(((current_week_avg - previous_week_avg) / previous_week_avg) * 100, 2)
    END AS wow_change_percentage,
    
    -- Generate actionable text for the UI
    CASE
        WHEN current_week_avg < (previous_week_avg * 0.95) THEN 'Prices for ' || product_category || ' have dropped significantly this week. Great time to buy!'
        WHEN current_week_avg > (previous_week_avg * 1.05) THEN 'Prices for ' || product_category || ' are rising. You might want to wait for a dip.'
        ELSE 'The market for ' || product_category || ' is stable this week.'
    END AS smart_insight_text

FROM weekly_aggregates
WHERE current_week_avg IS NOT NULL 
  AND previous_week_avg IS NOT NULL
