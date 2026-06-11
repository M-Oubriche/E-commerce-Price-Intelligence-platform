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
    -- Order of preference for cross-platform matching:
    -- 1. Explicit model_number
    -- 2. Cleaned and Translated Product Name Hash (for matching BestBuy to French sites like PC21/Jumia)
    -- 3. The raw external_id (as a last resort so the row isn't dropped)
    COALESCE(
        CAST(product.model_number AS STRING), 
            REGEXP_REPLACE(
                REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                    LOWER(product.name),
                'ordinateur portable', 'laptop'),
                'souris', 'mouse'),
                'clavier', 'keyboard'),
                'ecran', 'monitor'),
                'casque', 'headset'),
                'reconditionne', 'refurbished'),
                'carte graphique', 'gpu'),
                'carte mere', 'motherboard')
            , r'[^a-z0-9]', ''),
        CAST(product.external_id AS STRING)
    ) AS product_unified_id,
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
WHERE COALESCE(
        CAST(product.model_number AS STRING), 
        product.name,
        CAST(product.external_id AS STRING)
      ) IS NOT NULL 
  AND pricing.converted_price_usd IS NOT NULL
  
  -- 🚨 OUTLIER & ACCESSORY FILTERING 🚨

  -- 1. Drop scraper bugs where price was not extracted
  AND pricing.converted_price_usd > 0

  -- 2. Keyword exclusions — only words that are unambiguously accessories as the MAIN product
  --    Removed: 'support', 'cable', 'sacoche', 'case' — too broad, appear in legit product names
  AND LOWER(product.name) NOT LIKE '%laptop stand%'
  AND LOWER(product.name) NOT LIKE '%notebook stand%'
  AND LOWER(product.name) NOT LIKE '%monitor stand%'
  AND LOWER(product.name) NOT LIKE '%laptop sleeve%'
  AND LOWER(product.name) NOT LIKE '%laptop cover%'
  AND LOWER(product.name) NOT LIKE '%phone case%'
  AND LOWER(product.name) NOT LIKE '%screen protector%'
  AND LOWER(product.name) NOT LIKE '%protective case%'
  AND LOWER(product.name) NOT LIKE '%housse%'
  AND LOWER(product.name) NOT LIKE '%chargeur%'
  AND LOWER(product.name) NOT LIKE '%sac à dos%'
  AND LOWER(product.name) NOT LIKE '%sac a dos%'
  AND LOWER(product.name) NOT LIKE '%cooling pad%'
  AND LOWER(product.name) NOT LIKE '%refroidisseur%'

  -- 3. Minimum sensible price thresholds per category
  AND NOT (LOWER(product.category) = 'laptop'      AND pricing.converted_price_usd < 100)
  AND NOT (LOWER(product.category) = 'desktop'     AND pricing.converted_price_usd < 100)
  AND NOT (LOWER(product.category) = 'gpu'         AND pricing.converted_price_usd < 50)
  AND NOT (LOWER(product.category) = 'monitor'     AND pricing.converted_price_usd < 50)
  AND NOT (LOWER(product.category) = 'mobile'      AND pricing.converted_price_usd < 50)
  AND NOT (LOWER(product.category) = 'motherboard' AND pricing.converted_price_usd < 30)
  AND NOT (LOWER(product.category) = 'cpu'         AND pricing.converted_price_usd < 30)
  AND NOT (LOWER(product.category) = 'case'        AND pricing.converted_price_usd < 20)
  AND NOT (LOWER(product.category) = 'psu'         AND pricing.converted_price_usd < 15)
  AND NOT (LOWER(product.category) = 'hdd'         AND pricing.converted_price_usd < 10)
  AND NOT (LOWER(product.category) = 'ssd'         AND pricing.converted_price_usd < 10)
  AND NOT (LOWER(product.category) = 'ram'         AND pricing.converted_price_usd < 10)
  AND NOT (LOWER(product.category) = 'keyboard'    AND pricing.converted_price_usd < 5)
  AND NOT (LOWER(product.category) = 'mouse'       AND pricing.converted_price_usd < 5)
  AND NOT (LOWER(product.category) = 'cooling'     AND pricing.converted_price_usd < 5)

  -- 4. Maximum sensible price thresholds per category (filters out massive scraper/currency outliers)
  AND NOT (LOWER(product.category) = 'laptop'      AND pricing.converted_price_usd > 10000)
  AND NOT (LOWER(product.category) = 'desktop'     AND pricing.converted_price_usd > 15000)
  AND NOT (LOWER(product.category) = 'gpu'         AND pricing.converted_price_usd > 6000)
  AND NOT (LOWER(product.category) = 'monitor'     AND pricing.converted_price_usd > 4000)
  AND NOT (LOWER(product.category) = 'mobile'      AND pricing.converted_price_usd > 3000)
  AND NOT (LOWER(product.category) = 'motherboard' AND pricing.converted_price_usd > 1500)
  AND NOT (LOWER(product.category) = 'cpu'         AND pricing.converted_price_usd > 2500)
  AND NOT (LOWER(product.category) = 'case'        AND pricing.converted_price_usd > 1500)
  AND NOT (LOWER(product.category) = 'psu'         AND pricing.converted_price_usd > 1000)
  AND NOT (LOWER(product.category) = 'hdd'         AND pricing.converted_price_usd > 2000)
  AND NOT (LOWER(product.category) = 'ssd'         AND pricing.converted_price_usd > 2000)
  AND NOT (LOWER(product.category) = 'ram'         AND pricing.converted_price_usd > 1500)
  AND NOT (LOWER(product.category) = 'keyboard'    AND pricing.converted_price_usd > 800)
  AND NOT (LOWER(product.category) = 'mouse'       AND pricing.converted_price_usd > 500)
  AND NOT (LOWER(product.category) = 'cooling'     AND pricing.converted_price_usd > 1000)
