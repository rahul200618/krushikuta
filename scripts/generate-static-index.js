const fs = require('fs');
const path = require('path');

const clientDir = path.resolve(__dirname, '..', 'dist', 'client');
if (!fs.existsSync(clientDir)) {
  console.error('dist/client not found. Run `npm run build` first.');
  process.exit(1);
}

const assetsDir = path.join(clientDir, 'assets');
const files = fs.readdirSync(assetsDir);

const find = (prefix, ext) => files.find((f) => f.startsWith(prefix) && f.endsWith(ext));
const mainJs = find('index-', '.js') || find('index-', '.mjs');
const mainCss = find('styles-', '.css');

if (!mainJs) {
  console.error('Could not find client entry JS in dist/client/assets (index-*.js)');
  process.exit(1);
}

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Krishikuta</title>
    ${mainCss ? `<link rel="stylesheet" href="./assets/${mainCss}" />` : ''}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./assets/${mainJs}"></script>
  </body>
</html>`;

fs.writeFileSync(path.join(clientDir, 'index.html'), html, 'utf8');
console.log('Generated dist/client/index.html');

// Create a Hostinger-friendly .htaccess to ensure assets are served with correct MIME types
const htaccess = `# Hostinger / Apache rewrite rules - serve existing files, fallback to index.html
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  # If the request is for an existing file or directory, serve it directly
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  # Otherwise rewrite to index.html (SPA fallback)
  RewriteRule ^ index.html [L]
</IfModule>

# Recommended caching for static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/* "access plus 1 year"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>
`;

fs.writeFileSync(path.join(clientDir, '.htaccess'), htaccess, 'utf8');
console.log('Wrote dist/client/.htaccess');
