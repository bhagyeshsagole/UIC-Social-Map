import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {campusEventsPlugin} from './scripts/campus-events.mjs';
export default defineConfig({ plugins: [react(), campusEventsPlugin()], server: { fs: { allow: ['../..'] } } });
