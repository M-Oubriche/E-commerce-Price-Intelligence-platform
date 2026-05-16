resource "google_bigquery_dataset" "main" {
  dataset_id    = "price_intelligence"
  location      = "US"

  lifecycle {
    ignore_changes = [
      access
    ]
  }
}
