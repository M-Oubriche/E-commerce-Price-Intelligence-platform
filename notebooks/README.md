# Data Analytics Workspace (Jupyter Notebooks)

This directory contains interactive Jupyter Notebooks used for Exploratory Data Analysis (EDA), statistical testing, and machine learning prototyping.

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
