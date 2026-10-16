import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** Agrega el token a cada petición y cierra la sesión si el token ya no sirve. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  const isAuthCall = req.url.includes('/api/auth/');

  const request = token && !isAuthCall
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isAuthCall) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};
