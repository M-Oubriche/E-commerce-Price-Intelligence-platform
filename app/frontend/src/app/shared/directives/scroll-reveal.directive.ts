import { Directive, ElementRef, Input, OnInit, Renderer2, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appScrollReveal]',
  standalone: true
})
export class ScrollRevealDirective implements OnInit {
  @Input() delay: number = 0;
  @Input() distance: string = '60px';
  @Input() duration: number = 1200;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    const element = this.el.nativeElement;

    this.renderer.setStyle(element, 'opacity', '0');
    this.renderer.setStyle(element, 'transform', `translateY(${this.distance})`);
    this.renderer.setStyle(element, 'transition', `opacity ${this.duration}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${this.duration}ms cubic-bezier(0.16, 1, 0.3, 1)`);
    this.renderer.setStyle(element, 'transition-delay', `${this.delay}ms`);

    // Defer observer setup by 100ms so it never fires during
    // initial render when browser may be restoring scroll position
    setTimeout(() => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.renderer.setStyle(element, 'opacity', '1');
            this.renderer.setStyle(element, 'transform', 'translateY(0)');
            observer.unobserve(element);
          }
        });
      }, {
        threshold: 0.05,
        rootMargin: '0px 0px -20px 0px'
      });

      observer.observe(element);
    }, 100);
  }
}