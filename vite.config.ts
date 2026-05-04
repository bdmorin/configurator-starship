import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isDemo = env.VITE_DEMO_MODE === "1";
  return {
    plugins: [react()],
    base: isDemo ? "/configurator-starship/" : "/",
    define: {
      "import.meta.env.VITE_DEMO_MODE": JSON.stringify(isDemo ? "1" : ""),
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
      proxy: isDemo
        ? undefined
        : {
            "/api": {
              target: "http://127.0.0.1:4873",
              changeOrigin: false,
            },
          },
    },
    build: {
      outDir: "dist",
      sourcemap: true,
    },
  };
});
