import { defineConfig } from "vite";

export default defineConfig({
  oxc: {
    jsx: {
      runtime: "classic",
      pragma: "createElement",
      pragmaFrag: "Fragment",
    },
  },
});
