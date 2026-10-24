import './scripts/build-model.mjs';
import {execFileSync} from 'node:child_process';
import {cpSync,copyFileSync} from 'node:fs';
execFileSync(process.platform==='win32'?'npm.cmd':'npm',['--prefix','web','run','build'],{stdio:'inherit',cwd:import.meta.dirname});
cpSync(new URL('./assets/',import.meta.url),new URL('./dist/assets/',import.meta.url),{recursive:true});
copyFileSync(new URL('./dist/index.html',import.meta.url),new URL('./dist/index-dark.html',import.meta.url));
console.log('Untitled UI app built in dist/. Run npm start for the local preview.');
