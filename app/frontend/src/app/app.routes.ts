import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LandingPageComponent } from './features/landing/landing-page.component';
import { SearchResultsComponent } from './features/search/search-results.component';
import { ProductDetailComponent } from './features/product/product-detail.component';
import { DealFeedComponent } from './features/deals/deal-feed.component';
import { AuthComponent } from './features/auth/auth.component';
import { 
  AboutComponent, 
  ContactComponent, 
  PrivacyComponent, 
  TermsComponent, 
  CookiesComponent 
} from './features/placeholders/placeholders.component';
import { ShopperDashboardComponent } from './features/shopper-dashboard/shopper-dashboard.component';
import { DashboardHomeComponent } from './features/shopper-dashboard/pages/home/dashboard-home.component';
import { TrackedProductsComponent } from './features/shopper-dashboard/pages/tracked/tracked-products.component';
import { AlertsComponent } from './features/shopper-dashboard/pages/alerts/alerts.component';
import { DashboardSettingsComponent } from './features/shopper-dashboard/pages/settings/dashboard-settings.component';
import { EntrepreneurDashboardComponent } from './features/entrepreneur-dashboard/entrepreneur-dashboard.component';
import { BusinessOverviewComponent } from './features/entrepreneur-dashboard/home/business-overview.component';
import { CatalogTrackerComponent } from './features/entrepreneur-dashboard/catalog/catalog-tracker.component';
import { BusinessCompetitorScannerComponent } from './features/entrepreneur-dashboard/competitors/business-competitor-scanner.component';
import { BusinessProductDetailComponent } from './features/entrepreneur-dashboard/catalog/business-product-detail.component';
import { BusinessAlertsComponent } from './features/entrepreneur-dashboard/alerts/business-alerts.component';
import { BusinessAnalyticsComponent } from './features/entrepreneur-dashboard/analytics/business-analytics.component';
import { BusinessSettingsComponent } from './features/entrepreneur-dashboard/settings/business-settings.component';
import { NotFoundComponent } from './features/not-found/not-found.component';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'search', component: SearchResultsComponent },
  { path: 'product/:id', component: ProductDetailComponent },
  { path: 'deals', component: DealFeedComponent },
  { path: 'auth', component: AuthComponent },
  { path: 'about', component: AboutComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'privacy', component: PrivacyComponent },
  { path: 'terms', component: TermsComponent },
  { path: 'cookies', component: CookiesComponent },
  {
    path: 'dashboard',
    component: ShopperDashboardComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: DashboardHomeComponent, data: { animation: 'Home' } },
      { path: 'tracked', component: TrackedProductsComponent, data: { animation: 'Tracked' } },
      { path: 'alerts', component: AlertsComponent, data: { animation: 'Alerts' } },
      { path: 'settings', component: DashboardSettingsComponent, data: { animation: 'Settings' } },
      { path: '**', redirectTo: '' }
    ]
  },
  {
    path: 'business',
    component: EntrepreneurDashboardComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: BusinessOverviewComponent },
      { path: 'catalog', component: CatalogTrackerComponent },
      { path: 'catalog/:id', component: BusinessProductDetailComponent },
      { path: 'competitors', component: BusinessCompetitorScannerComponent },
      { path: 'alerts', component: BusinessAlertsComponent },
      { path: 'analytics', component: BusinessAnalyticsComponent },
      { path: 'settings', component: BusinessSettingsComponent },
      { path: '**', redirectTo: '' }
    ]
  },
  { path: '**', component: NotFoundComponent }
];
