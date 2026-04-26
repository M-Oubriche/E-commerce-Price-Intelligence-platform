import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="auth-root">
      <!-- Animated Premium Background -->
      <div class="bg-shapes">
         <div class="shape shape-1"></div>
         <div class="shape shape-2"></div>
         <div class="shape shape-3"></div>
      </div>

      <div class="auth-card shadow-2xl" [class.right-panel-active]="isSignup">
        
        <!-- Form Container -->
        <div class="form-container">
           <div class="form-view-wrapper">
             <router-outlet></router-outlet>
           </div>
        </div>

        <!-- Sliding Overlay -->
        <div class="overlay-container">
          <div class="overlay">
            
            <div class="overlay-panel overlay-left">
              <div class="logo fw-bold fs-xl mb-6">PulsePrice<span class="text-blue">.</span></div>
              <h1 class="fs-4xl fw-bold mb-4">Initialize Platform.</h1>
              <p class="mb-10 text-gray-200 premium-sub">Already have an active strategy? Return to your command center and continue monitoring the market.</p>
              <button class="btn-ghost" (click)="navigateTo('login')">Sign In Instead</button>
            </div>
            
            <div class="overlay-panel overlay-right">
              <div class="logo fw-bold fs-xl mb-6">PulsePrice<span class="text-blue">.</span></div>
              <h1 class="fs-4xl fw-bold mb-4">Join the Elite.</h1>
              <p class="mb-10 text-gray-200 premium-sub">Deploy your first target nodes and automate your price discovery. The market awaits.</p>
              <button class="btn-ghost" (click)="navigateTo('signup')">Create Workspace</button>
            </div>

          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    $c-charcoal: #0a0a0b; $c-blue: #2563eb; $c-white: #ffffff;
    
    .auth-root {
      position: relative; min-height: 100vh; width: 100vw;
      display: flex; align-items: center; justify-content: center;
      background: #f8fafc; overflow: hidden; font-family: 'Inter', sans-serif;
    }

    /* BREATHTAKING ANIMATED BACKGROUND */
    .bg-shapes { position: absolute; inset: 0; overflow: hidden; z-index: 0; background-color: #f8fafc; }
    .shape { position: absolute; filter: blur(90px); opacity: 0.6; border-radius: 50%; animation: float 20s infinite ease-in-out alternate; }
    .shape-1 { width: 600px; height: 600px; background: rgba(37, 99, 235, 0.25); top: -100px; left: -200px; }
    .shape-2 { width: 500px; height: 500px; background: rgba(139, 92, 246, 0.15); bottom: -150px; right: -100px; animation-delay: -5s; }
    .shape-3 { width: 400px; height: 400px; background: rgba(16, 185, 129, 0.1); top: 40%; left: 40%; animation-delay: -10s; }
    @keyframes float { 0% { transform: translate(0, 0) rotate(0deg) scale(1); } 100% { transform: translate(100px, 50px) rotate(45deg) scale(1.1); } }

    /* MAIN CARD (Sliding mechanics) */
    .auth-card {
      background-color: #ffffff; border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25), 0 0 40px rgba(37, 99, 235, 0.05);
      position: relative; overflow: hidden;
      width: 1000px; max-width: 95vw; min-height: 650px;
      z-index: 10;
    }
    
    .fw-bold { font-weight: 700; } .fs-xl { font-size: 1.5rem; } .fs-4xl { font-size: 2.25rem; letter-spacing: -1px; line-height: 1.1; }
    .mb-4 { margin-bottom: 1rem; } .mb-6 { margin-bottom: 1.5rem; } .mb-10 { margin-bottom: 2.5rem; }
    .text-blue { color: #60a5fa; } .text-gray-200 { color: #e5e7eb; }
    .premium-sub { line-height: 1.6; font-size: 1rem; max-width: 320px; margin-left: auto; margin-right: auto; }

    /* FORM CONTAINER */
    .form-container {
      position: absolute; top: 0; left: 0; height: 100%; width: 50%;
      transition: all 0.7s cubic-bezier(0.645, 0.045, 0.355, 1);
      z-index: 1; background: #ffffff;
    }
    .form-view-wrapper {
      padding: 3rem 4rem; height: 100%; overflow-y: auto;
      display: flex; flex-direction: column; justify-content: center;
      scrollbar-width: none;
    }
    .form-view-wrapper::-webkit-scrollbar { display: none; }

    /* OVERLAY CONTAINER */
    .overlay-container {
      position: absolute; top: 0; left: 50%; width: 50%; height: 100%;
      overflow: hidden; transition: transform 0.7s cubic-bezier(0.645, 0.045, 0.355, 1); z-index: 100;
    }
    .overlay {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #ffffff; position: relative; left: -100%; height: 100%; width: 200%;
      transform: translateX(0); transition: transform 0.7s cubic-bezier(0.645, 0.045, 0.355, 1);
    }
    .overlay::before {
      content: ''; position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E");
      z-index: 0; pointer-events: none;
    }
    .overlay::after {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.2) 0%, transparent 60%);
      z-index: 0; pointer-events: none;
    }

    .overlay-panel {
      position: absolute; display: flex; align-items: center; justify-content: center;
      flex-direction: column; padding: 0 40px; text-align: center; top: 0; height: 100%; width: 50%;
      transform: translateX(0); transition: transform 0.7s cubic-bezier(0.645, 0.045, 0.355, 1); z-index: 1;
    }

    .overlay-left { transform: translateX(-20%); opacity: 0; }
    .overlay-right { right: 0; transform: translateX(0); opacity: 1; }

    /* ANIMATION STATES FOR SIGNUP MODE */
    .auth-card.right-panel-active .form-container { transform: translateX(100%); }
    .auth-card.right-panel-active .overlay-container { transform: translateX(-100%); }
    .auth-card.right-panel-active .overlay { transform: translateX(50%); }
    .auth-card.right-panel-active .overlay-left { transform: translateX(0); opacity: 1; }
    .auth-card.right-panel-active .overlay-right { transform: translateX(20%); opacity: 0; }

    /* BUTTON Ghost */
    .btn-ghost {
      border-radius: 50px; border: 1px solid #ffffff; background-color: transparent; color: #ffffff;
      font-size: 0.875rem; font-weight: 600; padding: 12px 40px; letter-spacing: 0.05em; text-transform: uppercase;
      transition: all 0.2s ease-in; cursor: pointer; backdrop-filter: blur(4px);
    }
    .btn-ghost:hover { background-color: #ffffff; color: #0f172a; box-shadow: 0 0 20px rgba(255,255,255,0.2); }

    /* MOBILE GRACEFUL FALLBACK */
    @media (max-width: 900px) {
      .auth-card { min-height: 85vh; flex-direction: column; width: 100%; max-width: 480px; margin: 2rem; border-radius: 12px; }
      .overlay-container { display: none; }
      .form-container { width: 100%; position: relative; }
      .auth-card.right-panel-active .form-container { transform: translateX(0); }
      .form-view-wrapper { padding: 2rem; }
    }
  `]
})
export class AuthLayoutComponent implements OnInit, OnDestroy {
  isSignup = false;
  private sub!: Subscription;

  constructor(private router: Router) {}

  ngOnInit() {
    this.checkRoute(this.router.url);
    this.sub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.checkRoute(event.urlAfterRedirects);
      });
  }

  checkRoute(url: string) {
    this.isSignup = url.includes('signup');
  }

  navigateTo(path: string) {
    // The router navigation will automatically trigger the route change,
    // which our subscription catches, flipping isSignup, driving the CSS animation!
    this.router.navigate(['/auth', path]);
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }
}
