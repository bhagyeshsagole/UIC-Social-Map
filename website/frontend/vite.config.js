import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {existsSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {campusEventsPlugin} from './scripts/campus-events.mjs';
import {DIRECTORY_START} from './src/content.js';
// added_sites.md also logs the whole nearby directory for editors; ship only the hand-edited places above the log.
const curatedSites = () => ({name: 'curated-sites', enforce: 'pre', load(id) {if (/added_sites\.md\?raw$/.test(id)) return `export default ${JSON.stringify(readFileSync(id.replace(/\?raw$/, ''), 'utf8').split(DIRECTORY_START)[0])};`;}});
// `npm run dev:phone` serves over HTTPS with a local self-signed certificate (gitignored in .certs/)
// so phone browsers allow native sharing. Plain `npm run dev` stays HTTP.
const cert = new URL('./.certs/dev-cert.pem', import.meta.url), key = new URL('./.certs/dev-key.pem', import.meta.url);
const https = process.env.DEV_HTTPS === '1' && existsSync(cert) && existsSync(key) ? {cert: readFileSync(cert), key: readFileSync(key)} : undefined;
// Two pages: the map (index.html, served at /uic) and kampuscape.com/support.
const input = {main: fileURLToPath(new URL('./index.html', import.meta.url)), support: fileURLToPath(new URL('./support.html', import.meta.url))};
export default defineConfig({ plugins: [curatedSites(), react(), campusEventsPlugin()], build: { rollupOptions: { input } }, server: { https, fs: { allow: ['../..'] } } });
