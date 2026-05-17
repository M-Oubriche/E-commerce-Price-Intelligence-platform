terraform {
  backend "gcs" {
    bucket = "price-intelligence-terraform-state"
    prefix = "terraform/state"
  }
}
