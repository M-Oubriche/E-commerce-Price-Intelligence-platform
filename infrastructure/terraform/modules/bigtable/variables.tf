variable "project_id" {
  type        = string
  description = "The GCP Project ID"
}

variable "instance_name" {
  type        = string
  description = "The name of the Bigtable instance"
  default     = "price-intelligence-db"
}

variable "zone" {
  type        = string
  description = "The GCP zone for the Bigtable cluster"
  default     = "us-east1-b"
}
