import pandas as pd
import pingouin as pg
import statsmodels.api as sm
from google.cloud import bigquery
import logging
import json
from datetime import datetime

# Adjust import path based on the project structure
from core.bigquery import get_bq_client
from core.config import settings

logger = logging.getLogger(__name__)

def run_advanced_statistics():
    """
    Pulls data from BigQuery mart tables, runs advanced statistical calculations 
    (T-Test, OLS Regression, Pearson Correlation), and writes the results 
    back to BigQuery into a table named 'mart_statistical_results'.
    """
    logger.info("Starting Advanced Statistics Pipeline...")
    client = get_bq_client()
    project_id = settings.BIGQUERY_PROJECT_ID
    dataset_id = settings.BIGQUERY_DATASET

    results_payload = {
        "timestamp": datetime.utcnow().isoformat(),
        "ttest_results": [],
        "correlation_matrix": [],
        "regression_stats": {},
        "reliability_insights": []
    }

    try:
        # 1. T-Test calculations: Compare platform prices against market avg
        logger.info("Running T-Tests with Pingouin...")
        query_raw_prices = f"""
            SELECT source AS platform, product_category, current_price 
            FROM `{project_id}.{dataset_id}.mart_deal_analysis`
            WHERE current_price IS NOT NULL
        """
        df_raw = client.query(query_raw_prices).to_dataframe()
        
        if not df_raw.empty:
            categories = df_raw['product_category'].unique()
            for cat in categories:
                cat_df = df_raw[df_raw['product_category'] == cat]
                market_prices = cat_df['current_price'].values
                market_avg = market_prices.mean() if len(market_prices) > 0 else 0
                
                platforms = cat_df['platform'].unique()
                for platform in platforms:
                    plat_prices = cat_df[cat_df['platform'] == platform]['current_price'].values
                    plat_avg = plat_prices.mean() if len(plat_prices) > 0 else 0
                    
                    gap = plat_avg - market_avg
                    
                    # Real Welch's T-Test using pingouin if we have enough data points
                    if len(plat_prices) > 2 and len(market_prices) > 2:
                        try:
                            ttest_res = pg.ttest(plat_prices, market_prices)
                            p_val = float(ttest_res['p-val'].iloc[0])
                        except Exception:
                            p_val = 0.5
                    else:
                        p_val = 0.5
                        
                    results_payload["ttest_results"].append({
                        "category": cat,
                        "platform": platform,
                        "my_price": round(plat_avg, 2),
                        "market_avg": round(market_avg, 2),
                        "gap": round(gap, 2),
                        "p_value": round(p_val, 3),
                        "significant": p_val < 0.05
                    })

        # 2. Scatter Regression & Correlation Matrix
        logger.info("Running OLS Regression and Correlation Matrix...")
        query_corr = f"""
            SELECT price, rating, reviews 
            FROM `{project_id}.{dataset_id}.mart_product_correlation_data`
            WHERE price IS NOT NULL AND rating IS NOT NULL
        """
        df_corr = client.query(query_corr).to_dataframe()

        if not df_corr.empty:
            # Drop NaNs
            df_corr = df_corr.dropna(subset=['price', 'rating', 'reviews'])

            # --- IQR Outlier Removal on price ---
            Q1 = df_corr['price'].quantile(0.25)
            Q3 = df_corr['price'].quantile(0.75)
            IQR = Q3 - Q1
            lower_fence = Q1 - 1.5 * IQR
            upper_fence = Q3 + 1.5 * IQR
            df_clean = df_corr[
                (df_corr['price'] >= lower_fence) & (df_corr['price'] <= upper_fence) & (df_corr['rating'] > 0)
            ].copy()
            logger.info(f"Regression: kept {len(df_clean)}/{len(df_corr)} rows after IQR outlier removal (price range: {lower_fence:.0f}–{upper_fence:.0f})")

            # Correlation Matrix on cleaned data
            corr_matrix = df_clean[['price', 'rating', 'reviews']].corr(method='pearson').round(2)
            results_payload["correlation_matrix"] = corr_matrix.values.tolist()

            # OLS Regression on cleaned data: X = Rating, Y = Price
            import numpy as np
            X = df_clean['rating']
            Y = df_clean['price']
            X_sm = sm.add_constant(X)
            model = sm.OLS(Y, X_sm).fit()

            # Pre-compute regression line + 95% confidence band across the rating range
            rating_steps = [round(1.0 + i * 0.25, 2) for i in range(17)]  # 1.0 … 5.0 in steps of 0.25
            X_pred = sm.add_constant(np.array(rating_steps))
            predictions = model.get_prediction(X_pred)
            pred_df = predictions.summary_frame(alpha=0.05)

            regression_line_pts    = [{"x": r, "y": round(float(pred_df['mean'].iloc[i]), 2)}        for i, r in enumerate(rating_steps)]
            band_lower_pts         = [{"x": r, "y": round(float(pred_df['mean_ci_lower'].iloc[i]), 2)} for i, r in enumerate(rating_steps)]
            band_upper_pts         = [{"x": r, "y": round(float(pred_df['mean_ci_upper'].iloc[i]), 2)} for i, r in enumerate(rating_steps)]

            # Cleaned scatter points for the frontend to plot (same data the model saw)
            scatter_pts = [
                {"x": round(float(row['rating']), 2), "y": round(float(row['price']), 2)}
                for _, row in df_clean.iterrows()
            ]

            results_payload["regression_stats"] = {
                "r_squared": round(model.rsquared, 3),
                "intercept": round(float(model.params['const']), 2),
                "slope": round(float(model.params['rating']), 2),
                "regression_line": regression_line_pts,
                "band_lower": band_lower_pts,
                "band_upper": band_upper_pts,
                "scatter_points": scatter_pts
            }

            # 2.5 Generate Dynamic Reliability Insights based on Statistical Variance
            total_products = len(df_corr)
            if model.rsquared > 0.5:
                results_payload["reliability_insights"].append({
                    "type": "win",
                    "title": "Market Stability Index",
                    "message": f"Regression models show a high confidence (R²={round(model.rsquared,2)}). Current price fluctuations are within 95% confidence intervals, indicating statistically significant stability.",
                    "timeAgo": "LATEST"
                })
            else:
                results_payload["reliability_insights"].append({
                    "type": "watch",
                    "title": "Market Volatility Detected",
                    "message": f"Regression models show low confidence (R²={round(model.rsquared,2)}). Market prices are highly volatile relative to product ratings right now.",
                    "timeAgo": "LATEST"
                })

            # Check sample sizes for T-Tests to generate warning insights
            if not df_raw.empty:
                small_samples = [p for p in df_raw['platform'].unique() if len(df_raw[df_raw['platform'] == p]) < 10]
                if small_samples:
                    results_payload["reliability_insights"].append({
                        "type": "risk",
                        "title": "Sample Size Variance",
                        "message": f"The current SKU overlap on platforms like {', '.join(small_samples[:2])} is below the significance threshold (n<10). Trend data may be speculative this period.",
                        "timeAgo": "LATEST"
                    })

        # 3. Save Results back to BigQuery
        logger.info("Saving results to BigQuery mart_statistical_results...")
        
        # We'll store it as a single JSON row for the dashboard to parse easily
        df_results = pd.DataFrame([{
            "calculated_at": datetime.utcnow(),
            "results_json": json.dumps(results_payload)
        }])
        
        table_id = f"{project_id}.{dataset_id}.mart_statistical_results"
        
        job_config = bigquery.LoadJobConfig(
            write_disposition="WRITE_TRUNCATE", # Replace old results
        )
        
        job = client.load_table_from_dataframe(df_results, table_id, job_config=job_config)
        job.result() # Wait for job to complete
        
        logger.info(f"Successfully updated {table_id} with new statistical calculations.")
        return results_payload

    except Exception as e:
        logger.error(f"Advanced Statistics Pipeline Failed: {str(e)}")
        raise

if __name__ == "__main__":
    run_advanced_statistics()
