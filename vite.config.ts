import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import webExtension, { readJsonFile } from "vite-plugin-web-extension";

function generateManifest() {
	const manifest = readJsonFile("src/manifest.json");
	const pkg = readJsonFile("package.json");
	return {
		name: pkg.name,
		description: pkg.description,
		version: pkg.version,
		...manifest,
	};
}

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		webExtension({
			manifest: generateManifest,
			additionalInputs: [
				"src/main.html",
				"node_modules/pdfjs-dist/build/pdf.worker.min.js",
				"node_modules/@react-pdf-viewer/core/lib/styles/index.css",
				"node_modules/@react-pdf-viewer/default-layout/lib/styles/index.css",
				"node_modules/@react-pdf-viewer/highlight/lib/styles/index.css",
				"src/pages/Main/components/FlaschardPanel/components/RichTextArea/RichTextArea.css",
				"node_modules/katex/dist/katex.min.css",
			],
			webExtConfig: {
				startUrl: undefined,
				target: "chromium",
			},
		}),
	],
});
