{{ config(materialized='view') }}

WITH raw_prices AS (
    SELECT * FROM {{ ref('int_clean_prices') }}
),

-- Deduplicate identical prices on the same day for the same product and seller
-- Grain: one row per (product_unified_id, source, seller, price_date)
daily_prices AS (
    SELECT
        product_unified_id,
        MAX(product_name) AS product_name,
        MAX(product_category) AS product_category,
        MAX(product_image_url) AS product_image_url,
        source,
        COALESCE(seller_name, 'Unknown') AS seller_name,
        -- Truncate timestamp to day for a clean daily history
        DATE(scraped_at) AS price_date,
        
        -- Get the lowest price seen that day for this specific seller/source
        MIN(converted_price_usd) AS daily_lowest_price_usd,
        AVG(converted_price_usd) AS daily_avg_price_usd,
        
        MAX(in_stock) AS was_in_stock
    FROM raw_prices
    GROUP BY 
        product_unified_id,
        source,
        COALESCE(seller_name, 'Unknown'),
        DATE(scraped_at)
)

SELECT
    -- Generate a unique key for the grain
    {{ dbt_utils.generate_surrogate_key(['product_unified_id', 'source', 'seller_name', 'price_date']) }} AS history_id,
    *
FROM daily_prices
ORDER BY price_date DESC
