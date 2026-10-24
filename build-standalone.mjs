import { readFileSync, writeFileSync } from 'node:fs';
import { makeGeometry, settleGeometry, svgMarkup, auditGeometry, assemblies, P } from './geometry.mjs';
import { ISO_CSS } from './vendor/anatomy/kit/iso-kit.mjs';

console.log('Building XNOS anatomy…');
const {R}=makeGeometry();
settleGeometry(R);
const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
const live=readFileSync(new URL('./live.mjs',import.meta.url),'utf8');
const model=readFileSync(new URL('./model.mjs',import.meta.url),'utf8').replaceAll('export ','');
const icon=(name)=>({sun:'☼',layers:'◇',reset:'↺',sound:'♫',arrow:'↗',power:'⏻'}[name]);
const body=`
<a class="skip-link" href="#main">Skip to content</a>
<div class="app-shell">
<aside class="navigation" aria-label="Project navigation">
<a class="wordmark" href="./">Absurd Devices Anatomies</a>
<nav aria-label="Sections"><a href="#model" aria-current="page">The device</a><a href="#observation">Observation</a><a href="#components" id="components-link">Components</a><button id="reference-open">References <span aria-hidden="true">↗</span></button></nav>

</aside>
<main id="main" tabindex="-1">
<header class="page-header" id="model"><div class="breadcrumb">XNOS–01</div><div class="title-row"><div><h1>Flora interface</h1><p>Botanical field instrument</p></div><button id="theme" class="icon-button" title="Switch theme" aria-label="Switch to dark theme">${icon('sun')}</button></div></header>
<section class="workspace" aria-label="Interactive device anatomy">
<div class="figure-card iso-plate" id="stage" data-render="wireframe" tabindex="0" role="group" aria-label="Device anatomy. Focus this model for shortcuts. W toggles wireframe; E toggles exploded view; S scans; P toggles power; R resets. Number keys 1 to 6 select components.">
<span class="sr-only" id="view-label">Assembled</span>
${svgMarkup(R)}
<div class="figure-bottom"><span>120 mm cube</span><span data-readout id="pose-readout">${R.items.length} parts</span></div>
</div>
<div class="controls-row"><div class="view-toolbar" role="group" aria-label="Assembly view"><button class="selected" id="assembled" aria-pressed="true">Assembled</button><button id="exploded" aria-pressed="false">Exploded</button></div><div class="view-toolbar appearance-toolbar" role="group" aria-label="Drawing style"><button class="selected" id="wireframe" aria-pressed="true" title="Wireframe (W)">Wireframe</button><button id="rendered" aria-pressed="false">Rendered</button></div><button id="reset" class="icon-button" aria-label="Reset device" title="Reset (R)">↺</button></div>
<div class="separation-strip"><label for="separation">Separation</label><input type="range" id="separation" min="0" max="100" value="0" aria-label="Assembly separation" aria-valuetext="Fully assembled"><output id="separation-value" for="separation">0%</output></div>
<details class="keyboard-help"><summary>Keyboard controls</summary><p>Focus the model to use these shortcuts.</p><dl><dt>W / E</dt><dd>Wireframe / explode</dd><dt>S / P / R</dt><dd>Scan / power / reset</dd><dt>1–6</dt><dd>Select a component</dd><dt>← / →</dt><dd>Adjust separation</dd><dt>Home / End</dt><dd>Assemble / fully explode</dd><dt>Space</dt><dd>Toggle exploded view</dd><dt>Escape</dt><dd>Clear selection and assemble</dd></dl></details>
</section>
<section class="observation" id="observation" aria-label="Simulated specimen readings">
<div class="section-heading"><div><h2>Observation <span class="specimen-id">X–42</span></h2><span class="link-status" id="link-status"><i></i> Connected</span></div><div class="scan-actions"><button id="scan" class="primary-button"><span id="scan-label">Run scan</span><span id="scan-arrow" aria-hidden="true">↗</span></button><button id="power" class="icon-button power-button" aria-label="Toggle device power" aria-pressed="true" title="Power (P)">⏻</button></div></div>
<div class="telemetry"><div class="metric"><span>Vitality</span><strong><span id="metric-vitality">91</span><small>%</small></strong><div class="meter"><i id="vitality-meter" style="width:91%"></i></div></div><div class="metric"><span>Toxicity</span><strong><span id="metric-toxicity">36</span><small>/100</small></strong><div class="meter"><i id="toxicity-meter" style="width:36%"></i></div></div><div class="metric"><span>Growth</span><strong><span id="metric-growth">0.61</span><small>mm/h</small></strong></div><div class="metric"><span>Absorption</span><strong><span id="metric-absorption">61</span><small>%</small></strong><span class="metric-note" id="power-readout">3.3 W · Active</span></div></div>
<div class="scan-progress" aria-hidden="true"><span id="progress-bar"></span></div><div class="scan-foot"><span id="scan-status" role="status" aria-live="polite">Ready</span><button id="sound" aria-label="Enable scan sounds" aria-pressed="false" title="Enable scan sounds">Sound <span>off</span></button></div>
<details class="settings"><summary>Field intensity <span><output id="intensity-value" for="intensity">58</output>%</span></summary><div class="intensity-control"><label for="intensity">Intensity</label><input id="intensity" type="range" min="0" max="100" value="58" aria-label="Field intensity"></div></details>
</section>
<details class="components-section" id="components"><summary><span>Components <span class="index-count">06</span></span><span class="disclosure-icon" aria-hidden="true">+</span></summary><div class="inspector"><div class="component-list">${assemblies.map((a,i)=>`<button class="component" data-select="${a.id}" aria-pressed="false"><span class="component-num">0${i+1}</span><span>${a.name}</span><span class="component-plus" aria-hidden="true">↗</span></button>`).join('')}</div><div class="component-detail" id="component-detail"><div class="detail-meta"><span id="detail-category">System overview</span><span id="detail-number">XN–01</span></div><h3 id="detail-title">Inside the cube</h3><p id="detail-description">Select a part to see its role and materials.</p><div class="material-line"><span id="detail-material">120 × 120 × 120 mm cube</span></div></div></div></details>
<footer><span>Fictional internals · Simulated readings</span><a href="https://github.com/wheresryan22/anatomy" target="_blank" rel="noreferrer">Built with Anatomy <span aria-hidden="true">↗</span></a></footer>
</main><div id="announcement" class="sr-only" role="status" aria-live="polite"></div>
</div>
<dialog id="reference-dialog"><div class="dialog-header"><span>XNOS references</span><button id="reference-close" class="icon-button" aria-label="Close references">×</button></div><h2>Design references</h2><p>Screen and speaker based on your images. Redesigned as a 120 mm cube with flush faces and an internal antenna. Internals and readings are simulated.</p><div class="reference-images"><figure><img src="assets/device-reference.png" alt="Original olive green device concept with bronze speaker and botanical screen"><figcaption>01 / Original concept</figcaption></figure><figure><img src="assets/device-schematic.png" alt="Original annotated device schematic"><figcaption>02 / Dimensional study</figcaption></figure></div><p class="reference-credit">UI and wireframe inspired by <a href="https://x.com/wheresryan22/status/2109731806115201167" target="_blank" rel="noreferrer">Ryan’s Anatomy gallery video</a>.</p></dialog>
<noscript><p class="noscript">Enable JavaScript to explore the components and specimen scan.</p></noscript>`;
for(const theme of ['light','dark']) {
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="${theme==='light'?'#fafaf9':'#191a19'}"><meta name="description" content="An interactive anatomical study of the XNOS Flora Interface Unit. Explore six assemblies and run a simulated botanical scan."><title>Absurd Devices Anatomies — XNOS Flora Interface Unit</title><style>${ISO_CSS}\n${css}</style></head><body class="iso" data-theme="${theme}">${body}<script type="module">const DATA=${JSON.stringify({assemblies,P,count:R.items.length})};\n${model}\n${live}</script></body></html>`;
 writeFileSync(theme==='light'?'index.html':'index-dark.html',html);
}
writeFileSync('device.svg',svgMarkup(R).replace('class="iso-svg device-svg"','class="iso iso-svg device-svg" data-theme="light"').replace('<defs>','<style>'+ISO_CSS+css+'</style><defs>'));
writeFileSync('device-wireframe.svg',svgMarkup(R).replace('class="iso-svg device-svg"','class="iso iso-svg device-svg" data-theme="light" data-render="wireframe"').replace('<defs>','<style>'+ISO_CSS+css+'</style><defs>'));
console.log(`Built index.html and index-dark.html · ${R.items.length} solid parts`);
auditGeometry(R);
