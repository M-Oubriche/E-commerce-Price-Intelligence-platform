# Call the BigQuery Module
module "bigquery" {
  source = "./modules/bigquery"
}

# Call the IAM Module
module "iam" {
  source     = "./modules/iam"
  project_id = var.project_id
}
