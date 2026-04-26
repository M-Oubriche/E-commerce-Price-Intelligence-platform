import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ToastComponent } from './shared/components/toast/toast.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  template: `
    <router-outlet></router-outlet>
    <app-toast></app-toast>
  `,
})
export class AppComponent implements OnInit {
  constructor(
    private router: Router,
    private themeService: ThemeService // inject here — constructor call applies theme immediately
  ) {}

  ngOnInit() {
    // Force scroll to top on every fresh page load
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

    // Clear any hash from URL without triggering navigation
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    // Scroll to top on every route navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    });
  }
}
