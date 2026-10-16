import { Component, NgZone, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/errors';

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  styleUrl: './login.component.css',
  template: `
    <div class="auth-page">

      <!-- Decoración de fondo -->
      <div class="decor" aria-hidden="true">
        <span class="shape s1"></span>
        <span class="shape s2"></span>
        <span class="shape s3"></span>
        <span class="shape s4"></span>
        <svg class="trend" viewBox="0 0 320 270" fill="none" stroke="currentColor"
             stroke-width="26" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 256 L98 172 L138 208 L258 80"/>
          <path d="M182 80 H258 V156"/>
        </svg>
      </div>

      <!-- Estela interactiva que sigue al mouse -->
      <div class="interactive-bg" aria-hidden="true">
        @for (point of trail; track $index) {
          <div class="watercolor-trail-blob"
               [style.transform]="'translate(' + point.x + 'px, ' + point.y + 'px)'"
               [style.opacity]="point.alpha * (1 - $index / trail.length)">
          </div>
        }
      </div>

      <main class="auth">

        <!-- Panel de bienvenida (izquierda) -->
        <section class="brand-panel">
          <img class="brand-logo" src="assets/logo-light.svg" alt="Expense">
          <h1>Bienvenido/a</h1>
          <p>Inicia sesión para ver tus gastos<br>y mantener el control de tu dinero.</p>
        </section>

        <!-- Tarjeta del formulario (derecha) -->
        <div class="card-wrap">
          <section class="auth-card">

            <img class="auth-logo" src="assets/logo-dark.svg" alt="Expense Logo">

            <h2 class="auth-title">{{ mode() === 'login' ? 'Inicia sesión' : 'Crea tu cuenta' }}</h2>
            <p class="auth-sub">{{ mode() === 'login' ? 'Para continuar, accede a tu cuenta' : 'Completa tus datos para empezar' }}</p>

            <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
              @if (mode() === 'register') {
                <div class="field-group">
                  <label for="fullName">Nombre completo</label>
                  <div class="input-wrap">
                    <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c1.4-4.2 13.6-4.2 15 0"/></svg>
                    <input id="fullName" formControlName="fullName" autocomplete="name" placeholder="Tu nombre y apellido">
                  </div>
                  @if (invalid('fullName')) { <small class="field-error">Escribe tu nombre.</small> }
                </div>
              }

              <div class="field-group">
                <label for="email">Correo</label>
                <div class="input-wrap">
                  <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7.5 8.5 6 8.5-6"/></svg>
                  <input id="email" type="email" formControlName="email" autocomplete="email" placeholder="usuario&#64;ejemplo.com">
                </div>
                @if (invalid('email')) { <small class="field-error">Escribe un correo válido.</small> }
              </div>

              <div class="field-group">
                <label for="password">Contraseña</label>
                <div class="input-wrap">
                  <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9.5" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
                  <input id="password" type="password" formControlName="password"
                         [attr.autocomplete]="mode() === 'login' ? 'current-password' : 'new-password'"
                         placeholder="Mínimo 8 caracteres">
                </div>
                @if (invalid('password')) { <small class="field-error">Mínimo 8 caracteres.</small> }
              </div>

              @if (error()) { <p class="alert" role="alert">{{ error() }}</p> }

              <button class="btn primary" type="submit" [disabled]="loading()">
                <span>{{ loading() ? 'Un momento…' : (mode() === 'login' ? 'Entrar' : 'Crear cuenta') }}</span>
                <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </button>
            </form>

            <div class="auth-footer">
              <button class="link" type="button" (click)="toggle()">
                {{ mode() === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión' }}
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  `,
})
export class LoginComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  mode = signal<'login' | 'register'>('login');
  loading = signal(false);
  error = signal('');

  // Variables para la estela de acuarela
  private targetX = 0;
  private targetY = 0;
  private currentX = 0;
  private currentY = 0;
  private animationFrameId: number | null = null;

  trail: TrailPoint[] = [];
  private maxTrailLength = 12;

  ngOnInit() {
    window.addEventListener('mousemove', this.onMouseMove);
    for (let i = 0; i < this.maxTrailLength; i++) {
      this.trail.push({ x: 0, y: 0, alpha: 0 });
    }
    this.ngZone.runOutsideAngular(this.animateTrail);
  }

  ngOnDestroy() {
    window.removeEventListener('mousemove', this.onMouseMove);
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private onMouseMove = (e: MouseEvent) => {
    this.targetX = e.clientX - window.innerWidth / 2;
    this.targetY = e.clientY - window.innerHeight / 2;
  };

  private animateTrail = () => {
    this.currentX += (this.targetX - this.currentX) * 0.15;
    this.currentY += (this.targetY - this.currentY) * 0.15;

    this.trail.pop();
    this.trail.unshift({
      x: this.currentX,
      y: this.currentY,
      alpha: 0.35
    });

    this.animationFrameId = requestAnimationFrame(this.animateTrail);
  };

  form = this.fb.nonNullable.group({
    fullName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  invalid(name: 'fullName' | 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  toggle(): void {
    this.mode.update(m => (m === 'login' ? 'register' : 'login'));
    this.error.set('');
    const name = this.form.controls.fullName;
    if (this.mode() === 'register') {
      name.setValidators(Validators.required);
    } else {
      name.clearValidators();
    }
    name.updateValueAndValidity();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { fullName, email, password } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set('');

    const request$ = this.mode() === 'login'
      ? this.auth.login(email, password)
      : this.auth.register(fullName, email, password);

    request$.subscribe({
      next: () => this.router.navigate(['/']),
      error: e => {
        this.loading.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }
}