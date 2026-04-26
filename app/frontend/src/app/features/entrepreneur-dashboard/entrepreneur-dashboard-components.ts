import { Component } from '@angular/core';

@Component({
  selector: 'app-business-overview',
  standalone: true,
  template: `<h2>Business Overview</h2><p>Overview of your business performance.</p>`
})
export class BusinessOverviewComponent {}

@Component({
  selector: 'app-catalog-tracker',
  standalone: true,
  template: `<h2>Catalog Tracker</h2><p>Track your product catalog.</p>`
})
export class CatalogTrackerComponent {}

@Component({
  selector: 'app-competitor-scanner',
  standalone: true,
  template: `<h2>Competitor Scanner</h2><p>Scan your competitors' prices.</p>`
})
export class CompetitorScannerComponent {}

@Component({
  selector: 'app-business-alerts',
  standalone: true,
  template: `<h2>Margin Alerts</h2><p>Manage your profit margin alerts.</p>`
})
export class BusinessAlertsComponent {}

@Component({
  selector: 'app-business-analytics',
  standalone: true,
  template: `<h2>Analytics</h2><p>Deep dive into your business data.</p>`
})
export class BusinessAnalyticsComponent {}

@Component({
  selector: 'app-business-settings',
  standalone: true,
  template: `<h2>Business Settings</h2><p>Manage your business account settings.</p>`
})
export class BusinessSettingsComponent {}
