# 💸 Gastos Web

Interfaz en **Angular** para la [Gastos API](https://github.com/AaronSalvador/gastos-api). Permite crear una cuenta, iniciar sesión y administrar tus gastos personales.

## Características

- Registro e inicio de sesión (el token JWT se guarda en el navegador)
- Rutas protegidas con **guards** y token enviado automáticamente con un **interceptor**
- Alta, edición y eliminación de gastos con **formularios reactivos** y validaciones
- Lista paginada con filtro por categoría
- Resumen del total y barras por categoría
- Diseño adaptable a móvil y modo oscuro automático

## Tecnologías

Angular 19 (componentes standalone y signals) · TypeScript · RxJS · CSS

## Cómo ejecutarlo

Necesitas Node.js 20 o superior y la API corriendo en `http://localhost:8080`
(ver el repositorio `gastos-api`: `docker compose up --build`).

```bash
git clone https://github.com/AaronSalvador/gastos-web.git
cd gastos-web
npm install
npm start
```

Abre **http://localhost:4200**. En desarrollo, las llamadas a `/api` se redirigen a la API mediante `proxy.conf.json`.

## Estructura

```
src/app
├── core/        Servicios, modelos, interceptor y guards
└── pages/
    ├── login/       Inicio de sesión y registro
    └── dashboard/   Resumen, formulario y lista de gastos
```

## Despliegue

Para publicar el frontend, cambia las URLs de `/api/...` por la dirección de tu API desplegada
y agrega el dominio del frontend en la variable `CORS_ORIGINS` de la API.

## Autor

**Aarón Salvador Laura García** · [GitHub](https://github.com/AaronSalvador) · [Portafolio](https://aaronsalvador.github.io)
