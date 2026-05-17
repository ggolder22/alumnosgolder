# Electrotecnia — Instrucciones de configuración

## 1. Crear proyecto en Supabase (gratis)

1. Ir a https://supabase.com y crear una cuenta
2. Crear un nuevo proyecto (elegir región "South America")
3. Ir a **SQL Editor** y pegar el contenido de `supabase-setup.sql` → ejecutar

## 2. Obtener las claves de Supabase

1. En tu proyecto Supabase → **Settings → API**
2. Copiar:
   - **Project URL** → va en `SUPABASE_URL`
   - **anon public key** → va en `SUPABASE_ANON_KEY`

## 3. Configurar `config.js`

Abrir `config.js` y reemplazar:

```js
const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';   // ← tu URL
const SUPABASE_ANON_KEY = 'TU_ANON_KEY';                  // ← tu clave
const ADMIN_DNI = '99999999';   // ← tu DNI real como profesor
```

## 4. Subir la app (opciones gratuitas)

### Opción A — GitHub Pages (recomendado)
1. Crear repositorio en github.com
2. Subir todos los archivos .html, .js
3. Settings → Pages → Source: main branch
4. URL: `https://tu-usuario.github.io/tu-repo/`

### Opción B — Netlify
1. Arrastrar la carpeta a netlify.com/drop
2. Obtenés una URL inmediata

### Opción C — Local (para pruebas)
- Abrir `index.html` directo en el navegador
- ⚠️ El registro/login NO funciona sin Supabase configurado

## 5. Editar contenido de unidades

- Abrir `units-data.js`
- Cada unidad tiene: `id`, `title`, `topics` (lista), `tag`, `content` (HTML)
- El contenido HTML soporta: `<h4>`, `<p>`, `<ul>/<li>`, `<div class="formula">`, `<div class="nota">`

## 6. Panel de admin

- Iniciar sesión con el DNI configurado en `ADMIN_DNI`
- Ver tabla de alumnos, enviar notificaciones por email/WhatsApp/Telegram

## Estructura de archivos

```
alumnosapp/
├── index.html          ← página principal (1 archivo)
├── config.js           ← claves y configuración
├── units-data.js       ← contenido de las 6 unidades
├── app.js              ← lógica de la aplicación
└── supabase-setup.sql  ← SQL para crear las tablas
```
