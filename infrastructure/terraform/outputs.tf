output "bigquery_dataset_id" {
  description = "The ID of the BigQuery Dataset"
  value       = module.bigquery.dataset_id
}

output "app_service_account_email" {
  description = "The email of the application service account"
  value       = module.iam.app_service_account_email
}
