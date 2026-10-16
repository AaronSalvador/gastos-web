import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: '**', redirectTo: '' },
];
