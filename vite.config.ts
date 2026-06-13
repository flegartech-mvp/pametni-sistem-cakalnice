import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: [
        "**/.tmp/**",
        "**/Programiranje1_ODDAJA/**",
        "**/ZBP1_ODDAJA/**",
        "**/screenshots/.interactive-smoke-profile/**",
        "**/screenshots/.qa-chrome-profile/**",
      ],
    },
  },
});
