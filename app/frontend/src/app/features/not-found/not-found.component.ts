import { Component, OnInit, inject, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

interface FloatingIcon {
  path: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  color: string;
}

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="not-found-wrapper">
      <div class="floating-icons-layer">
        <svg *ngFor="let icon of floatingIcons" 
             class="floating-icon" 
             [style.left.%]="icon.x" 
             [style.top.%]="icon.y"
             [style.width.px]="icon.size" 
             [style.height.px]="icon.size"
             [style.animation-duration]="icon.duration + 's'"
             [style.animation-delay]="-icon.delay + 's'"
             [style.opacity]="icon.opacity"
             [style.color]="icon.color"
             viewBox="0 0 24 24" 
             fill="currentColor">
          <path [attr.d]="icon.path"></path>
        </svg>
      </div>

      <div class="content">
        <h1 class="code">404</h1>
        <h2>Page not found.</h2>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <div class="actions">
          <button class="btn-primary" routerLink="/">Go home</button>
          <button class="btn-outline" routerLink="/search">Search products</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      background-color: #0A0F1E;
      color: #FFF;
      overflow: hidden;
    }
    .not-found-wrapper {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      position: relative;
    }
    .content {
      position: relative;
      z-index: 10;
    }
    .code {
      font-size: clamp(6rem, 15vw, 12rem);
      font-weight: 900;
      line-height: 1;
      margin: 0;
      background: linear-gradient(135deg, #3B82F6, #7C3AED);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    h2 { font-size: 2.5rem; font-weight: 800; margin: 1rem 0; }
    p { color: rgba(255,255,255,0.6); font-size: 1.25rem; margin-bottom: 3rem; }
    .actions { display: flex; gap: 1.5rem; justify-content: center; }
    .btn-primary {
      background: linear-gradient(135deg, #3B82F6, #7C3AED);
      color: white; border: none; padding: 1rem 2rem; border-radius: 0.5rem;
      font-weight: 600; cursor: pointer; transition: 0.2s;
      &:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3); }
    }
    .btn-outline {
      background: transparent; border: 1px solid rgba(255,255,255,0.1);
      color: white; padding: 1rem 2rem; border-radius: 0.5rem;
      font-weight: 600; cursor: pointer; transition: 0.2s;
      &:hover { border-color: #3B82F6; }
    }
    .floating-icons-layer {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 1;
    }
    .floating-icon { position: absolute; animation: floatUp linear infinite; }
    @keyframes floatUp {
      0% { transform: translateY(110vh) translateX(0) rotate(0deg); }
      100% { transform: translateY(-20vh) translateX(20px) rotate(15deg); }
    }
  `]
})
export class NotFoundComponent implements OnInit {
  floatingIcons: FloatingIcon[] = [];
  private iconPaths = [
    'M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H7V4h10v16z',
    'M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z',
    'M12 1a9 9 0 0 0-9 9v7c0 1.66 1.34 3 3 3h3V11H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v9h3c1.66 0 3-1.34 3-3v-7a9 9 0 0 0-9-9z',
    'M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7l-2 3v1h8v-1l-2-3h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z'
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.generateFloatingIcons();
    }
  }

  private generateFloatingIcons() {
    for (let i = 0; i < 10; i++) {
      this.floatingIcons.push({
        path: this.iconPaths[i % this.iconPaths.length],
        x: (i * 10) + (Math.random() * 5),
        y: Math.random() * 100,
        size: 30 + Math.random() * 40,
        duration: 15 + Math.random() * 15,
        delay: Math.random() * 20,
        opacity: 0.05,
        color: i % 2 === 0 ? '#3B82F6' : '#7C3AED'
      });
    }
  }
}
