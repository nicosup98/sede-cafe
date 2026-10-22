# ☕ Sede Café — Asignación Equitativa de Turnos de Café

Aplicación web desarrollada con **Nuxt 4 (4.6.2)**, **TailwindCSS v4**, **daisyUI v5**, **dayjs**, **vue-boring-avatars** y **SQLite / Turso (`@libsql/client`)** para asignar de forma equitativa el turno semanal de hacer café (Lunes a Viernes).

## ✨ Características Principales

- **Asignación Semanal Equitativa (Lunes a Viernes)**:
  - Generación bajo demanda por el Administrador para la **Semana Actual** o **Próxima Semana**.
  - El algoritmo asigna 1 persona por día hábil equilibrando la **Carga Efectiva** de turnos y evitando días consecutivos.
- **Turnos Extraordinarios (Fines de Semana / Casos Especiales)**:
  - Permite asignar manualmente turnos de café fuera de días hábiles (Sábados, Domingos o eventos especiales).
  - Estos turnos suman a la carga real del integrante y el sistema los compensa equitativamente en las siguientes semanas.
- **El Admin también hace café**:
  - Por defecto, tanto los usuarios con rol `admin` como `user` están incluidos en la rotación semanal de café (y pueden pausarse temporalmente si están de vacaciones).
- **Cobertura e Intercambio de Turnos con Compensación Automática**:
  - Un cambio de turno solo se aplica si **ambas partes están de acuerdo** (el compañero acepta la solicitud) o si **lo ejecuta/aprueba un Administrador**.
  - Cuando un compañero cubre el turno de otro, suma `+1` turno real y la persona cubierta queda con `-1`, por lo que el sistema **compensa automáticamente el conteo en las siguientes semanas**.
- **Módulo de Usuarios y Permisos Simple (`Usuario` y `Admin`)**:
  - Inicio de sesión rápido con `usuario` + `PIN/contraseña simple` (sin necesidad de correo).
  - Cuando se crea un nuevo integrante, el sistema iguala su base de equidad al mínimo actual del equipo para no sobrecargarlo con turnos atrasados.
- **Compatible con SQLite Local y Vercel (Turso)**:
  - En desarrollo local utiliza automáticamente el archivo SQLite `./data/sede-cafe.db` incluido junto al proyecto.
  - En producción (Vercel), basta con definir `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` en las variables de entorno.

## 🚀 Uso en Desarrollo Local

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Iniciar servidor de desarrollo:
   ```bash
   npm run dev
   ```
3. Credenciales iniciales creadas automáticamente:
   - **Admin**: usuario `admin` / PIN `1234`
   - **Usuarios de ejemplo**: `carlos`, `maria`, `jose`, `ana` / PIN `1234`

## ☁️ Despliegue en Vercel con Turso (SQLite)

1. Crea una base de datos gratuita en [Turso](https://turso.tech/) o desde el Marketplace de Vercel.
2. Configura las variables de entorno en tu proyecto de Vercel:
   - `TURSO_DATABASE_URL` = `libsql://tu-db.turso.io`
   - `TURSO_AUTH_TOKEN` = `tu-token`
   - `SESSION_SECRET` = `una-clave-secreta-larga`
