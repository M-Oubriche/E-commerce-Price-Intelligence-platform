{{ config(materialized='view') }}

WITH raw_data AS (
    SELECT * FROM {{ source('ecommerce', 'raw_pricing_data') }}
)

SELECT
    raw_id,
    ingestion_type,
    source,
    source_url,
    -- Cast to proper timestamp
    CAST(scraped_at AS TIMESTAMP) AS scraped_at,
    
    -- Extracting Product details
    COALESCE(CAST(product.model_number AS STRING), CAST(product.external_id AS STRING)) AS product_unified_id,
    CAST(product.model_number AS STRING) AS product_model_number,
    CAST(product.external_id AS STRING) AS product_unified_id_fallback,
    product.name AS product_name,
    product.brand AS product_brand,
    product.category AS product_category,
    product.image_url AS product_image_url,
    
    -- Extracting Pricing details
    pricing.raw_price AS raw_price,
    pricing.raw_currency AS raw_currency,
    pricing.converted_price_usd AS converted_price_usd,
    pricing.original_price_usd AS original_price_usd,
    pricing.discount_percent AS discount_percent,
    
    -- Extracting Availability details
    availability.in_stock AS in_stock,
    availability.quantity AS quantity,
    
    -- Extracting Seller details
    seller.seller_name AS seller_name,
    seller.seller_type AS seller_type,
    
    -- Ratings
    ratings.avg_rating AS avg_rating,
    ratings.review_count AS review_count

FROM raw_data
-- Filter out completely invalid records
WHERE COALESCE(CAST(product.model_number AS STRING), CAST(product.external_id AS STRING)) IS NOT NULL 
  AND pricing.converted_price_usd IS NOT NULL
