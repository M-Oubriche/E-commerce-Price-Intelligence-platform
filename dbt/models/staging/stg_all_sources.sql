{{ config(materialized='view') }}

with unioned as (
    select * from {{ ref('stg_bestbuy') }}
    union all
    select * from {{ ref('stg_jumia') }}
    union all
    select * from {{ ref('stg_newegg') }}
    union all
    select * from {{ ref('stg_pc21') }}
    union all
    select * from {{ ref('stg_ultrapc') }}
    union all
    select * from {{ ref('stg_materielnet') }}
)

select * from unioned
