resource "google_service_account" "price_intelligence_sa" {
  account_id   = "price-intelligence-sa"
  display_name = "price-intelligence-sa"
  description  = "Service account for dbt and pipeline services"
}
