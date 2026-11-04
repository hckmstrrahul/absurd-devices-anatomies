import {writeFileSync} from 'node:fs';
import {makeGeometry,assemblies,CUBE_SIDE,ENVELOPE} from '../geometry.mjs';
const {R}=makeGeometry({interactiveControls:false});
writeFileSync(new URL('../web/src/generated/flora-geometry.json',import.meta.url),JSON.stringify({side:CUBE_SIDE,envelope:ENVELOPE,assemblies,parts:R.items.map(({name,piece,move,shapes,svg})=>({name,piece,move,material:svg.match(/material-([a-z]+)/)[1],shape:shapes[0]}))}));
