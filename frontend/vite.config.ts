import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	server: {
		proxy: {
			"/api": "http://127.0.0.1:8000",
		},
	},
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: "./src/test/setup.ts",
		server: {
			deps: {
				inline: ["@panzoom/panzoom"],
			},
		},
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			include: ["src/**/*.{ts,tsx}"],
			exclude: ["src/test/**", "**/*.d.ts"],
		},
		testTimeout: 20000,
	},
});
