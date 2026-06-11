output "instance_name" {
  value       = google_bigtable_instance.instance.name
  description = "The name of the Bigtable instance"
}
