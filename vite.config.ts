import { defineConfig } from "vite";

export default defineConfig({
  oxc: {
    jsx: {
      runtime: "classic",
      pragma: "MiniReact.createElement",
      pragmaFrag: "MiniReact.Fragment",
    },
  },
});
