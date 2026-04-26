import { Directive, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appCountUp]',
  standalone: true
})
export class CountUpDirective implements OnInit {
  @Input('appCountUp') endValue: number = 0;
  @Input() duration: number = 1000; // ms
  @Input() prefix: string = '';
  @Input() suffix: string = '';
  @Input() precision: number = 0;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    this.animateValue(0, this.endValue, this.duration);
  }

  private animateValue(start: number, end: number, duration: number) {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing function: cubic-bezier(0.16, 1, 0.3, 1) approx
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const current = easedProgress * (end - start) + start;
      
      const formattedValue = current.toLocaleString(undefined, {
        minimumFractionDigits: this.precision,
        maximumFractionDigits: this.precision
      });
      
      this.renderer.setProperty(this.el.nativeElement, 'textContent', `${this.prefix}${formattedValue}${this.suffix}`);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }
}
