import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {existsSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {campusEventsPlugin} from './scripts/campus-events.mjs';
// `npm run dev:phone` serves over HTTPS with a local self-signed certificate (gitignored in .certs/)
// so phone browsers allow native sharing. Plain `npm run dev` stays HTTP.
const cert = new URL('./.certs/dev-cert.pem', import.meta.url), key = new URL('./.certs/dev-key.pem', import.meta.url);
const https = process.env.DEV_HTTPS === '1' && existsSync(cert) && existsSync(key) ? {cert: readFileSync(cert), key: readFileSync(key)} : undefined;
// Two pages: the map (index.html, served at /uic) and kampuscape.com/support.
const input = {main: fileURLToPath(new URL('./index.html', import.meta.url)), support: fileURLToPath(new URL('./support.html', import.meta.url))};
export default defineConfig({ plugins: [react(), campusEventsPlugin()], build: { rollupOptions: { input } }, server: { https, fs: { allow: ['../..'] } } });
