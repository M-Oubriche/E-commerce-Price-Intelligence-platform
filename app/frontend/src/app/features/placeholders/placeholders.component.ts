import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PublicNavbarComponent } from '../../shared/components/public-navbar/public-navbar.component';

@Component({
  selector: 'app-placeholder-page',
  standalone: true,
  imports: [CommonModule, PublicNavbarComponent, RouterLink],
  template: `
    <app-public-navbar></app-public-navbar>
    <div class="placeholder-wrapper">
      <div class="content">
        <div class="logo">
          <span class="pulse">Pulse</span><span class="price">Price</span>
        </div>
        <h1>{{ title }}</h1>
        <p>This page is coming soon. We're working on it.</p>
        <button class="btn-primary" routerLink="/">Back to home</button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background-color: #0A0F1E;
      color: #FFF;
      padding-top: 80px;
    }
    .placeholder-wrapper {
      height: calc(100vh - 80px);
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .logo {
      font-size: 2rem; font-weight: 800; margin-bottom: 2rem;
      .pulse { color: #3B82F6; }
      .price { color: #FFF; }
    }
    h1 { font-size: 3rem; font-weight: 800; margin-bottom: 1rem; }
    p { color: rgba(255,255,255,0.6); font-size: 1.25rem; margin-bottom: 2rem; }
    .btn-primary {
      background: linear-gradient(135deg, #3B82F6, #7C3AED);
      color: white; border: none; padding: 1rem 2rem; border-radius: 0.5rem;
      font-weight: 600; cursor: pointer;
    }
  `]
})
export class PlaceholderComponent {
  title = 'Page';
}

@Component({ standalone: true, imports: [PlaceholderComponent], template: '<app-placeholder-page title="About Us"></app-placeholder-page>' })
export class AboutComponent {}

@Component({ standalone: true, imports: [PlaceholderComponent], template: '<app-placeholder-page title="Careers"></app-placeholder-page>' })
export class CareersComponent {}

@Component({ standalone: true, imports: [PlaceholderComponent], template: '<app-placeholder-page title="Contact"></app-placeholder-page>' })
export class ContactComponent {}

@Component({ standalone: true, imports: [PlaceholderComponent], template: '<app-placeholder-page title="Privacy Policy"></app-placeholder-page>' })
export class PrivacyComponent {}

@Component({ standalone: true, imports: [PlaceholderComponent], template: '<app-placeholder-page title="Terms of Service"></app-placeholder-page>' })
export class TermsComponent {}

@Component({ standalone: true, imports: [PlaceholderComponent], template: '<app-placeholder-page title="Cookie Policy"></app-placeholder-page>' })
export class CookiesComponent {}
