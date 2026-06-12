# Call the BigQuery Module
module "bigquery" {
  source = "./modules/bigquery"
}

# Call the IAM Module
module "iam" {
  source     = "./modules/iam"
  project_id = var.project_id
}

# Call the Bigtable Module
module "bigtable" {
  source        = "./modules/bigtable"
  project_id    = var.project_id
  instance_name = "price-intelligence"
 
}
