import { defineConfig as lovableDefineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";

export default async (viteEnv) => {
  const mode = viteEnv.mode || 'development';
  const env = loadEnv(mode, process.cwd(), '');
  process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
  process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

  const isLocal = !process.env.LOVABLE_SANDBOX && !process.env.DEV_SERVER__PROJECT_PATH;

  const localPlugins = isLocal ? [
    tanstackStart({
      server: { 
        preset: "vercel",
        entry: "src/server/server.ts" 
      },
    }),
    react()
  ] : [];

  const configObj = {
    cloudflare: false,
    tanstackStart: {
      server: { 
        preset: "vercel",
        entry: "src/server/server.ts" 
      },
    },
    plugins: [
      ...localPlugins,
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

  const lovableConfigFactory = lovableDefineConfig(configObj);
  return await lovableConfigFactory(viteEnv);
};
