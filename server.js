import { serve } from '@hono/node-server';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Import the built app
import app from './dist/server/server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read static assets
import { serveStatic } from '@hono/node-server/serve-static';

const port = process.env.PORT || 3000;
console.log(`Starting server on port ${port}...`);

serve({
  fetch: async (request, env, ctx) => {
    const url = new URL(request.url);
    const filePath = path.join(__dirname, 'dist/client', url.pathname);
    
    // Serve static files from dist/client if they exist
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      // Quick minimalist static file server for Hostinger node
      const file = fs.readFileSync(filePath);
      let contentType = 'text/plain';
      if (filePath.endsWith('.js')) contentType = 'text/javascript';
      else if (filePath.endsWith('.css')) contentType = 'text/css';
      else if (filePath.endsWith('.png')) contentType = 'image/png';
      else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) contentType = 'image/jpeg';
      else if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';
      
      return new Response(file, { headers: { 'Content-Type': contentType } });
    }
    
    // Otherwise, hand over to the SSR app!
    return app.default.fetch(request, env, ctx);
  },
  port
});

