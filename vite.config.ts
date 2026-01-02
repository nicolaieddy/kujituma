import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    // Avoid stale UI in the dev preview by disabling the PWA/service worker in development.
    mode !== 'development' &&
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'lovable-uploads/*.png', 'kilimanjaro-background.jpg'],
        manifest: {
          name: 'Kujituma - Weekly Progress Sharing',
          short_name: 'Kujituma',
          description: 'Share your weekly progress, connect with your community, and stay accountable to your goals',
          theme_color: '#1a6b4a',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          // VitePWA/Workbox defaults to 2 MiB precache limit; our Profile chunk exceeds that.
          // Increase the limit so production builds/publishing don't fail.
          maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
          // Skip waiting and claim clients immediately for faster updates
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // Cache Supabase API GET responses with StaleWhileRevalidate for instant loading
              urlPattern: ({ request, url }) => 
                url.href.includes('.supabase.co/rest/v1/') && request.method === 'GET',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'supabase-api-cache',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
                },
                cacheableResponse: {
                  statuses: [0, 200]
                },
                plugins: [
                  {
                    // Add cache timestamp header
                    cacheWillUpdate: async ({ response }) => {
                      if (response && response.status === 200) {
                        const headers = new Headers(response.headers);
                        headers.set('x-sw-cache-timestamp', Date.now().toString());
                        return new Response(response.body, {
                          status: response.status,
                          statusText: response.statusText,
                          headers
                        });
                      }
                      return response;
                    }
                  }
                ]
              }
            },
            {
              // NetworkFirst for mutations/auth endpoints
              urlPattern: ({ url }) => 
                url.href.includes('.supabase.co/auth/') ||
                url.href.includes('.supabase.co/rest/v1/rpc/'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-auth-cache',
                networkTimeoutSeconds: 5,
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // Cache Supabase storage/images with CacheFirst
              urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'supabase-storage-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // Cache avatar images aggressively
              urlPattern: /\/avatars\/|googleusercontent\.com|avatars\.githubusercontent\.com/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'avatar-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
