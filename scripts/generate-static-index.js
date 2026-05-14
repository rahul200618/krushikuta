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
