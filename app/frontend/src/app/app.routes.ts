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
import { ClientDashboardComponent } from './features/client-dashboard/shopper-dashboard.component';
import { DashboardHomeComponent } from './features/client-dashboard/pages/home/dashboard-home.component';
import { TrackedProductsComponent } from './features/client-dashboard/pages/tracked/tracked-products.component';
import { AlertsComponent } from './features/client-dashboard/pages/alerts/alerts.component';
import { DashboardSettingsComponent } from './features/client-dashboard/pages/settings/dashboard-settings.component';
import { ResellerDashboardComponent } from './features/reseller-dashboard/entrepreneur-dashboard.component';
import { ResellerOverviewComponent } from './features/reseller-dashboard/home/business-overview.component';
import { CatalogTrackerComponent } from './features/reseller-dashboard/catalog/catalog-tracker.component';
import { ResellerCompetitorScannerComponent } from './features/reseller-dashboard/competitors/business-competitor-scanner.component';
import { ResellerProductDetailComponent } from './features/reseller-dashboard/catalog/business-product-detail.component';
import { ResellerAlertsComponent } from './features/reseller-dashboard/alerts/business-alerts.component';
import { ResellerAnalyticsComponent } from './features/reseller-dashboard/analytics/business-analytics.component';
import { ResellerSettingsComponent } from './features/reseller-dashboard/settings/business-settings.component';
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
    component: ClientDashboardComponent,
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
    path: 'reseller',
    component: ResellerDashboardComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: ResellerOverviewComponent },
      { path: 'catalog', component: CatalogTrackerComponent },
      { path: 'catalog/:id', component: ResellerProductDetailComponent },
      { path: 'competitors', component: ResellerCompetitorScannerComponent },
      { path: 'alerts', component: ResellerAlertsComponent },
      { path: 'analytics', component: ResellerAnalyticsComponent },
      { path: 'settings', component: ResellerSettingsComponent },
      { path: '**', redirectTo: '' }
    ]
  },
  { path: '**', component: NotFoundComponent }
];
