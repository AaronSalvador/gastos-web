import { HttpErrorResponse } from '@angular/common/http';

/** Convierte un error HTTP en un mensaje legible para el usuario. */
export function errorMessage(e: HttpErrorResponse): string {
  if (e.status === 0) {
    return 'No se pudo conectar con el servidor. ¿Está la API encendida?';
  }
  const body = e.error;
  if (body?.details) {
    return Object.values(body.details as Record<string, string>).join('. ');
  }
  if (body?.error) {
    return body.error;
  }
  return 'Ocurrió un error inesperado.';
}
