// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode || 'development', process.cwd(), '');
  process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
  process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

  return {
    cloudflare: false,
    tanstackStart: {
      server: { 
        preset: "vercel",
        entry: "server/server" 
      },
    },
  plugins: [
    {
      name: 'api-exam-dev',
      enforce: 'pre',
      configureServer(server) {
        server.middlewares.use('/api/exam', async (req, res, next) => {
          try {
            // Read body to string for parsing
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
              try {
                req.body = body ? JSON.parse(body) : {};
              } catch {
                req.body = {};
              }
              // Mock res.status() and res.json() which Vercel provides but standard http doesn't
              res.status = (statusCode) => {
                res.statusCode = statusCode;
                return res;
              };
              res.json = (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              };
              const { default: handler } = await import('./api/exam.js');
              await handler(req, res);
            });
          } catch (err) {
            next(err);
          }
        });
      }
    }
  ],
  };
});
