import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {fileURLToPath,URL} from 'node:url';
export default defineConfig({plugins:[react(),tailwindcss()],resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}},build:{outDir:'../dist',emptyOutDir:true,rollupOptions:{input:{main:fileURLToPath(new URL('./index.html',import.meta.url)),flora:fileURLToPath(new URL('./flora/index.html',import.meta.url)),...Object.fromEntries(['orbit','belljar','chorus','lumen','pocket','verdant','ember','console','frost','cobalt','k8nf4x','p5gplx','p5gmx','gap35'].map(slug=>[slug,fileURLToPath(new URL(`./${slug}/index.html`,import.meta.url))]))}}},server:{host:'127.0.0.1',port:49381,strictPort:true}});
