import {mkdirSync,writeFileSync,readFileSync,cpSync} from 'node:fs';
import {makeGeometry,settleGeometry,svgMarkup,auditGeometry,assemblies,P} from '../geometry.mjs';
import {ISO_CSS} from '../vendor/anatomy/kit/iso-kit.mjs';
const root=new URL('../',import.meta.url);
const {R}=makeGeometry({interactiveControls:false});
settleGeometry(R);
const drawingStyles=readFileSync(new URL('web/src/styles/model.css',root),'utf8');
mkdirSync(new URL('web/src/generated/',root),{recursive:true});
writeFileSync(new URL('web/src/generated/device.json',root),JSON.stringify({svg:svgMarkup(R),assemblies,P,count:R.items.length}));
writeFileSync(new URL('web/src/generated/artwork.css',root),ISO_CSS+'\n'+drawingStyles+'\n.device-svg{width:100%;height:auto;display:block}.screen-type{fill:#91bfa2;font-family:ui-monospace,monospace}.circuits{color:#b4bf8b;opacity:.53}\n');
console.log(`Generated anatomy: ${R.items.length} solids, ${assemblies.length} assemblies.`);
auditGeometry(R);

mkdirSync(new URL('web/public/assets/',root),{recursive:true});
cpSync(new URL('assets/',root),new URL('web/public/assets/',root),{recursive:true});
