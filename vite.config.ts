import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    prerender: {
      routes: ["/"],
      crawlLinks: true,
    },
  },
  nitro: {
    preset: "node-server",
    prerender: {
      routes: ["/"],
      crawlLinks: true,
    },
  },
});
