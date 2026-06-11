resource "google_bigtable_instance" "instance" {
  name    = var.instance_name
  project = var.project_id
  deletion_protection = false

  cluster {
    cluster_id   = "${var.instance_name}-cluster"
    zone         = var.zone
    num_nodes    = 1
    storage_type = "HDD"
  }
}

resource "google_bigtable_table" "ecommerce_prices" {
  name          = "ecommerce_prices"
  instance_name = google_bigtable_instance.instance.name
  project       = var.project_id

  column_family {
    family = "price_cf"
  }
  column_family {
    family = "metadata_cf"
  }
  column_family {
    family = "availability_cf"
  }
  column_family {
    family = "seller_cf"
  }
  column_family {
    family = "ratings_cf"
  }
  column_family {
    family = "specs_cf"
  }
  column_family {
    family = "ingestion_cf"
  }
}

resource "google_bigtable_gc_policy" "max_versions" {
  for_each = toset([
    "price_cf",
    "metadata_cf",
    "availability_cf",
    "seller_cf",
    "ratings_cf",
    "specs_cf",
    "ingestion_cf"
  ])

  project       = var.project_id
  instance_name = google_bigtable_instance.instance.name
  table         = google_bigtable_table.ecommerce_prices.name
  column_family = each.key

  max_version {
    number = 10
  }
}
