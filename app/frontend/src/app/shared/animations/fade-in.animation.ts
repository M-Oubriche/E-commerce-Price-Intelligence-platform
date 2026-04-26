import { animate, style, transition, trigger, query, stagger } from '@angular/animations';

export const fadeInEntry = trigger('fadeInEntry', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(12px)' }),
    animate(
      '400ms cubic-bezier(0.16, 1, 0.3, 1)',
      style({ opacity: 1, transform: 'translateY(0)' })
    ),
  ]),
]);

export const staggerFadeIn = trigger('staggerFadeIn', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(12px)' }),
      stagger('60ms', [
        animate(
          '400ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ], { optional: true }),
  ]),
]);
