import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  server: { port: 5173, strictPort: true },
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react({ compiler: true }),
    tailwindcss(),
  ],
});
