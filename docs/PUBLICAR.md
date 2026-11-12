# Publicar Equilibrio online

La app es estática: `npm run build` genera `dist/` con todo lo necesario (rutas relativas, así que funciona en cualquier
carpeta o subruta). Hay dos formas de tenerla online.

## A. Enlace rápido (sin instalar nada)
`npm run build:prototipo` genera un único `dist/index.html`. Sirve para mostrarla o probarla: se abre desde cualquier
enlace, pero no es instalable ni funciona sin conexión (no tiene service worker). Los datos quedan en el navegador de
quien la abre.

## B. Sitio permanente e instalable (recomendado): GitHub Pages
Se publica solo con cada `git push`. No necesita secretos ni tarjeta.

1. Crea en GitHub un repositorio **público** llamado `equilibrio-pwa` (GitHub Pages gratis exige repositorio público).
2. En la carpeta del proyecto:
   ```
   git init -b main
   git add .
   git commit -m "Equilibrio v0.6.1"
   git remote add origin https://github.com/<tu-usuario>/equilibrio-pwa.git
   git push -u origin main
   ```
3. En el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Mira la pestaña **Actions**: el flujo «Publicar» compila, corre el chequeo de tipos y los tests, y publica.
   La dirección queda en `https://<tu-usuario>.github.io/equilibrio-pwa/`.
5. Abre esa dirección en el celular y usa «Instalar» / «Agregar a pantalla de inicio».

Para actualizar: sube los cambios con `git push` a `main`.

## C. Alternativa: Cloudflare Pages
Si prefieres Cloudflare (permite repositorio privado): **Workers & Pages → Create → Pages → Connect to Git**, elige el
repositorio y configura:
- Build command: `npm run build`
- Build output directory: `dist`
- Variable de entorno: `NODE_VERSION` = `22`

## Notas
- Si el flujo falla por la versión de alguna acción (`actions/checkout`, etc.), baja el número de versión en
  `.github/workflows/publicar.yml`; el resto no cambia.
- Los datos (progreso, histórico, desafíos) se guardan en el navegador de cada persona (IndexedDB): no hay servidor ni
  cuentas. Si se borran los datos del sitio, se pierden.
- Si cambias el nombre del repositorio, la dirección cambia; la app no depende de ella.
