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
    
    // Intercept requests to /api/exam for static/Node.js hosting environments (like Hostinger)
    if (url.pathname === '/api/exam') {
      try {
        if (request.method === 'OPTIONS') {
          return new Response(null, {
            status: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type'
            }
          });
        }

        const bodyText = await request.text();
        let body = {};
        try {
          body = bodyText ? JSON.parse(bodyText) : {};
        } catch {}

        const mockReq = {
          method: request.method,
          body: body,
          headers: Object.fromEntries(request.headers.entries())
        };

        let resStatus = 200;
        let resHeaders = {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        };
        let resBody = '';

        const mockRes = {
          status(code) {
            resStatus = code;
            return this;
          },
          json(data) {
            resBody = JSON.stringify(data);
            return this;
          },
          setHeader(name, value) {
            resHeaders[name] = value;
          },
          end(data) {
            if (data) resBody = data;
            return this;
          }
        };

        const { default: examHandler } = await import('./api/exam.js');
        await examHandler(mockReq, mockRes);

        return new Response(resBody, {
          status: resStatus,
          headers: resHeaders
        });
      } catch (err) {
        console.error("Error in server.js /api/exam handler:", err);
        return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Otherwise, hand over to the SSR app!
    return app.default.fetch(request, env, ctx);
  },
  port
});

