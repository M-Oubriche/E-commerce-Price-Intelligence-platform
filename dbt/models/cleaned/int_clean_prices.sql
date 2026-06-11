{{ config(materialized='view') }}

WITH raw_data AS (
    SELECT * FROM {{ ref('int_currency_norm') }}
)

SELECT
    row_key,
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
        CAST(product_model_number AS STRING), 
            REGEXP_REPLACE(
                REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                    LOWER(product_name),
                'ordinateur portable', 'laptop'),
                'souris', 'mouse'),
                'clavier', 'keyboard'),
                'ecran', 'monitor'),
                'casque', 'headset'),
                'reconditionne', 'refurbished'),
                'carte graphique', 'gpu'),
                'carte mere', 'motherboard')
            , r'[^a-z0-9]', ''),
        CAST(product_external_id AS STRING)
    ) AS product_unified_id,
    CAST(product_model_number AS STRING) AS product_model_number,
    CAST(product_external_id AS STRING) AS product_unified_id_fallback,
    product_name,
    product_brand,
    product_category,
    product_image_url,
    
    -- Extracting Pricing details
    raw_price,
    raw_currency,
    converted_price_usd,
    original_price_usd,
    discount_percent,
    
    -- Extracting Availability details
    in_stock,
    quantity,
    
    -- Extracting Seller details
    seller_name,
    
    -- Ratings
    avg_rating,
    review_count

FROM raw_data
-- Filter out completely invalid records
WHERE COALESCE(
        CAST(product_external_id AS STRING), 
        product_name
      ) IS NOT NULL 
  AND converted_price_usd IS NOT NULL
  
  -- 🚨 OUTLIER & ACCESSORY FILTERING 🚨

  -- 1. Drop scraper bugs where price was not extracted
  AND converted_price_usd > 0

  -- 2. Keyword exclusions — only words that are unambiguously accessories as the MAIN product
  AND LOWER(product_name) NOT LIKE '%laptop stand%'
  AND LOWER(product_name) NOT LIKE '%notebook stand%'
  AND LOWER(product_name) NOT LIKE '%monitor stand%'
  AND LOWER(product_name) NOT LIKE '%laptop sleeve%'
  AND LOWER(product_name) NOT LIKE '%laptop cover%'
  AND LOWER(product_name) NOT LIKE '%phone case%'
  AND LOWER(product_name) NOT LIKE '%screen protector%'
  AND LOWER(product_name) NOT LIKE '%protective case%'
  AND LOWER(product_name) NOT LIKE '%housse%'
  AND LOWER(product_name) NOT LIKE '%chargeur%'
  AND LOWER(product_name) NOT LIKE '%sac à dos%'
  AND LOWER(product_name) NOT LIKE '%sac a dos%'
  AND LOWER(product_name) NOT LIKE '%cooling pad%'
  AND LOWER(product_name) NOT LIKE '%refroidisseur%'

  -- 3. Minimum sensible price thresholds per category
  AND NOT (LOWER(product_category) = 'laptop'      AND converted_price_usd < 100)
  AND NOT (LOWER(product_category) = 'desktop'     AND converted_price_usd < 100)
  AND NOT (LOWER(product_category) = 'gpu'         AND converted_price_usd < 50)
  AND NOT (LOWER(product_category) = 'monitor'     AND converted_price_usd < 50)
  AND NOT (LOWER(product_category) = 'mobile'      AND converted_price_usd < 50)
  AND NOT (LOWER(product_category) = 'motherboard' AND converted_price_usd < 30)
  AND NOT (LOWER(product_category) = 'cpu'         AND converted_price_usd < 30)
  AND NOT (LOWER(product_category) = 'case'        AND converted_price_usd < 20)
  AND NOT (LOWER(product_category) = 'psu'         AND converted_price_usd < 15)
  AND NOT (LOWER(product_category) = 'hdd'         AND converted_price_usd < 10)
  AND NOT (LOWER(product_category) = 'ssd'         AND converted_price_usd < 10)
  AND NOT (LOWER(product_category) = 'ram'         AND converted_price_usd < 10)
  AND NOT (LOWER(product_category) = 'keyboard'    AND converted_price_usd < 5)
  AND NOT (LOWER(product_category) = 'mouse'       AND converted_price_usd < 5)
  AND NOT (LOWER(product_category) = 'cooling'     AND converted_price_usd < 5)

  -- 4. Maximum sensible price thresholds per category
  AND NOT (LOWER(product_category) = 'laptop'      AND converted_price_usd > 10000)
  AND NOT (LOWER(product_category) = 'desktop'     AND converted_price_usd > 15000)
  AND NOT (LOWER(product_category) = 'gpu'         AND converted_price_usd > 6000)
  AND NOT (LOWER(product_category) = 'monitor'     AND converted_price_usd > 4000)
  AND NOT (LOWER(product_category) = 'mobile'      AND converted_price_usd > 3000)
  AND NOT (LOWER(product_category) = 'motherboard' AND converted_price_usd > 1500)
  AND NOT (LOWER(product_category) = 'cpu'         AND converted_price_usd > 2500)
  AND NOT (LOWER(product_category) = 'case'        AND converted_price_usd > 1500)
  AND NOT (LOWER(product_category) = 'psu'         AND converted_price_usd > 1000)
  AND NOT (LOWER(product_category) = 'hdd'         AND converted_price_usd > 2000)
  AND NOT (LOWER(product_category) = 'ssd'         AND converted_price_usd > 2000)
  AND NOT (LOWER(product_category) = 'ram'         AND converted_price_usd > 1500)
  AND NOT (LOWER(product_category) = 'keyboard'    AND converted_price_usd > 800)
  AND NOT (LOWER(product_category) = 'mouse'       AND converted_price_usd > 500)
  AND NOT (LOWER(product_category) = 'cooling'     AND converted_price_usd > 1000)
