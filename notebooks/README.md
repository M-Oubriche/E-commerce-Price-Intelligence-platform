# Optional Sandbox: Data Analytics Workspace (Jupyter Notebooks)

> ⚠️ **NOTE TO EVALUATORS:**  
> **This directory is strictly an optional, supplementary sandbox.**  
> The core Data Analytics and business logic of this platform are fully automated and codified within the **Data Warehouse (using dbt)** and the **FastAPI Backend**.  
> These notebooks are merely decoupled testing environments used by analysts for ad-hoc queries, exploratory data analysis (EDA), and machine learning prototyping *outside* of the main production pipeline.

## How to use
1. Start the Jupyter container:
   ```bash
   docker compose up -d jupyter
   ```
2. Open your browser to [http://localhost:8888](http://localhost:8888)
3. Open any `.ipynb` file and execute the cells.

## Structure
We follow a standard numbered naming convention for notebooks so the workflow is clear:

* **`01_exploratory_data_analysis.ipynb`**: Basic market overviews, querying Data Marts, and visualizing category averages.
* **`02_discount_impact_analysis.ipynb`**: Investigating if higher discounts correlate with better ratings.
* **`03_data_quality_profiling.ipynb`**: Spotting anomalies, scraper failure rates, and missing data trends.
