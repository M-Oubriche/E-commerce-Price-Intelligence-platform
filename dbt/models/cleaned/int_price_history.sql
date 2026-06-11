{{ config(materialized='view') }}

WITH raw_prices AS (
    SELECT * FROM {{ ref('stg_raw_prices') }}
),

-- Deduplicate identical prices on the same day for the same product and seller
daily_prices AS (
    SELECT
        product_unified_id,
        product_name,
        product_category,
        product_image_url,
        source,
        seller_name,
        -- Truncate timestamp to day for a clean daily history
        DATE(scraped_at) AS price_date,
        
        -- Get the lowest price seen that day for this specific seller/source
        MIN(converted_price_usd) AS daily_lowest_price_usd,
        AVG(converted_price_usd) AS daily_avg_price_usd,
        
        MAX(in_stock) AS was_in_stock
    FROM raw_prices
    GROUP BY 
        product_unified_id,
        product_name,
        product_category,
        product_image_url,
        source,
        seller_name,
        DATE(scraped_at)
)

SELECT
    -- Generate a unique key for the grain
    {{ dbt_utils.generate_surrogate_key(['product_unified_id', 'source', 'seller_name', 'price_date']) }} AS history_id,
    *
FROM daily_prices
ORDER BY price_date DESC
