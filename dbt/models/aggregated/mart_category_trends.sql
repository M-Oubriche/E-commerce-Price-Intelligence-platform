{{ config(materialized='table') }}

WITH latest_prices AS (
    SELECT
        product_unified_id,
        product_category,
        source,
        converted_price_usd,
        avg_rating,
        review_count,
        ROW_NUMBER() OVER(
            PARTITION BY product_unified_id, source 
            ORDER BY scraped_at DESC
        ) as rn
    FROM {{ ref('int_clean_prices') }}
),

current_market AS (
    SELECT * FROM latest_prices WHERE rn = 1
)

SELECT
    product_category,
    
    -- Descriptive Stats
    COUNT(DISTINCT product_unified_id) AS product_count,
    ROUND(AVG(converted_price_usd), 2) AS mean_price,
    ROUND(APPROX_QUANTILES(converted_price_usd, 100)[OFFSET(50)], 2) AS median_price,
    ROUND(STDDEV(converted_price_usd), 2) AS std_dev_price,
    MIN(converted_price_usd) AS min_price,
    MAX(converted_price_usd) AS max_price,
    
    -- Correlation inputs (pre-aggregated averages for the category)
    ROUND(AVG(avg_rating), 2) AS category_avg_rating,
    ROUND(AVG(review_count), 2) AS category_avg_reviews

FROM current_market
GROUP BY product_category
