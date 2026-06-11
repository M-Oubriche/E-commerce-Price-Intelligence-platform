import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AuthService, User } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';
import { ToastService } from '../../core/services/toast.service';
import { SocialAuthService, GoogleLoginProvider, GoogleSigninButtonModule } from '@abacritt/angularx-social-login';

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
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, GoogleSigninButtonModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
  animations: [
    trigger('fadeSlideUp', [
      transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateY(-20px)', opacity: 0 }))
      ])
    ]),
    trigger('crossFade', [
      transition('* <=> *', [
        style({ opacity: 0 }),
        animate('300ms ease-in-out', style({ opacity: 1 }))
      ])
    ]),
    trigger('errorFade', [
      transition(':enter', [
        style({ transform: 'translateY(4px)', opacity: 0 }),
        animate('200ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ])
  ]
})
export class AuthComponent implements OnInit {
  mode: 'login' | 'signup' | 'forgot' | 'success' | 'verify' | 'signup-success' | 'google-role-select' = 'login';
  signupStep: 1 | 2 = 1;
  accountType: UserRole | null = null;
  UserRole = UserRole;
  pendingGoogleToken = '';
  
  verificationStatus: 'loading' | 'success' | 'error' = 'loading';
  verificationMessage: string = '';
  
  loginForm: FormGroup;
  signupForm: FormGroup;
  forgotForm: FormGroup;

  isSubmitting = false;
  isGoogleLoading = false;
  showPassword = false;
  showConfirmPassword = false;

  private authService = inject(AuthService);
  private socialAuthService = inject(SocialAuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);

  floatingIcons: FloatingIcon[] = [];
  private iconPaths = [
    'M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H7V4h10v16z',
    'M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z',
    'M12 1a9 9 0 0 0-9 9v7c0 1.66 1.34 3 3 3h3V11H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v9h3c1.66 0 3-1.34 3-3v-7a9 9 0 0 0-9-9z',
    'M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7l-2 3v1h8v-1l-2-3h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z'
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.signupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), this.containsNumberValidator]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      const returnUrl = this.route.snapshot.queryParams['returnUrl'];
      if (returnUrl) {
        this.router.navigateByUrl(decodeURIComponent(returnUrl));
      } else {
        const user = this.authService.currentUser;
        this.router.navigate([user?.role === UserRole.RESELLER ? '/reseller' : '/dashboard']);
      }
      return;
    }

    this.socialAuthService.authState.subscribe((user) => {
      const idToken = user?.idToken;
      if (idToken) {
        this.isGoogleLoading = true;
        this.authService.googleAuth(idToken).subscribe({
          next: (res) => {
            this.isGoogleLoading = false;
            if (res.is_new_user) {
              this.pendingGoogleToken = idToken;
              this.mode = 'google-role-select';
              this.toastService.show('Welcome! Please choose your account type.', 'info');
            } else if (res.user) {
              this.onLoginSuccess(res.user);
            }
          },
          error: () => this.isGoogleLoading = false
        });
      }
    });

    const path = this.router.url;
    if (path.includes('verify-email')) {
      this.mode = 'verify';
      const token = this.route.snapshot.queryParams['token'];
      if (token) {
        this.performEmailVerification(token);
      } else {
        this.verificationStatus = 'error';
        this.verificationMessage = 'Invalid verification link. No token found.';
      }
    } else {
      this.route.queryParams.subscribe(params => {
        if (params['mode'] === 'signup') {
          this.mode = 'signup';
          this.signupStep = 1;
          if (params['type'] === 'reseller') this.accountType = UserRole.RESELLER;
          else if (params['type'] === 'client') this.accountType = UserRole.CLIENT;
        } else {
          this.mode = 'login';
        }
      });
    }

    if (isPlatformBrowser(this.platformId)) {
      this.generateFloatingIcons();
    }
  }

  private performEmailVerification(token: string) {
    this.verificationStatus = 'loading';
    this.authService.verifyEmail(token).subscribe({
      next: (res) => {
        this.verificationStatus = 'success';
        this.verificationMessage = 'Your email has been verified successfully!';
        setTimeout(() => this.switchMode('login'), 3000);
      },
      error: (err) => {
        this.verificationStatus = 'error';
        this.verificationMessage = err.error?.detail || 'Verification failed. The token may be expired or invalid.';
      }
    });
  }

  get sf() { return this.signupForm.controls; }
  get lf() { return this.loginForm.controls; }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value ? null : { mismatch: true };
  }

  containsNumberValidator(control: AbstractControl): ValidationErrors | null {
    return /\d/.test(control.value) ? null : { noNumber: true };
  }

  getPasswordStrength(): number {
    const p = this.signupForm.get('password')?.value || '';
    let s = 0;
    if (p.length >= 8) s++;
    if (/\d/.test(p)) s++;
    if (/[a-zA-Z]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return Math.min(s, 4);
  }

  getStrengthLabel(): string {
    const s = this.getPasswordStrength();
    return s === 0 ? '' : s === 1 ? 'Weak' : s === 2 ? 'Fair' : s === 3 ? 'Good' : 'Strong';
  }

  getStrengthColor(index: number): string {
    const s = this.getPasswordStrength();
    if (index >= s) return 'rgba(255,255,255,0.1)';
    return s === 1 ? '#EF4444' : s === 2 ? '#F59E0B' : s === 3 ? '#3B82F6' : '#10B981';
  }

  switchMode(mode: 'login' | 'signup') {
    this.mode = mode;
    this.router.navigate([], { queryParams: { mode }, queryParamsHandling: 'merge' });
    this.signupStep = 1;
  }

  selectAccountType(type: UserRole) { this.accountType = type; }
  continueToStep2() { if (this.accountType) this.signupStep = 2; }
  togglePasswordVisibility(f: 'password' | 'confirm') {
    if (f === 'password') this.showPassword = !this.showPassword;
    else this.showConfirmPassword = !this.showConfirmPassword;
  }

  onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    this.authService.login(this.loginForm.value.email, this.loginForm.value.password).subscribe({
      next: (u) => this.onLoginSuccess(u),
      error: (err) => {
        this.isSubmitting = false;
        const message = err.error?.detail?.error?.message || err.error?.detail || err.message || 'Invalid email or password.';
        this.toastService.show(message, 'error');
      }
    });
  }

  onSignup() {
    if (this.signupForm.invalid || !this.accountType) {
      this.signupForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    this.authService.register(this.signupForm.value.name, this.signupForm.value.email, this.signupForm.value.password, this.accountType).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.mode = 'signup-success';
        this.toastService.show('Account created! Please check your email.', 'success');
      },
      error: (err) => {
        this.isSubmitting = false;
        const message = err.error?.detail?.error?.message || err.error?.detail || err.message || 'Something went wrong. Please try again.';
        this.toastService.show(message, 'error');
      }
    });
  }

  onGoogleRoleSelect() {
    if (!this.pendingGoogleToken || !this.accountType) return;
    this.isSubmitting = true;
    this.authService.confirmGoogleSignup(this.pendingGoogleToken, this.accountType).subscribe({
      next: (user) => {
        this.isSubmitting = false;
        this.onLoginSuccess(user);
      },
      error: () => this.isSubmitting = false
    });
  }

  private onLoginSuccess(user: User) {
    this.mode = 'success';
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    
    setTimeout(() => {
      this.toastService.show('Welcome! You can now set alerts and save products.', 'success');
      if (returnUrl) {
        this.router.navigateByUrl(decodeURIComponent(returnUrl));
      } else {
        // Redirect based on user type
        this.router.navigate([user.role === UserRole.RESELLER ?  '/reseller' : '/dashboard']);
      }
    }, 2000);
  }

  showForgotPassword() { this.mode = 'forgot'; }
  onForgot() {
    if (this.forgotForm.invalid) return;
    this.isSubmitting = true;
    setTimeout(() => { this.isSubmitting = false; this.mode = 'login'; }, 1500);
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
        opacity: 0.04 + Math.random() * 0.03,
        color: i % 2 === 0 ? '#3B82F6' : '#7C3AED'
      });
    }
  }
}
