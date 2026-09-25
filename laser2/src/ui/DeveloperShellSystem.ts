import type { AppContext, AppSystem } from '../core/System.js';
import type { ObjectCatalogSystem } from '../inspection/ObjectCatalogSystem.js';
import type { SelectionSystem } from '../inspection/SelectionSystem.js';
import type { CameraControllerSystem } from '../inspection/CameraControllerSystem.js';
import type { NotesSystem } from '../inspection/NotesSystem.js';
import type { MarkupSystem, MarkupTool } from '../inspection/MarkupSystem.js';
import type { ScreenshotSystem } from '../inspection/ScreenshotSystem.js';
import type { LightingState } from '../lighting/LightingState.js';
import type { MaterialRegistrySystem } from '../lighting/MaterialRegistrySystem.js';
import type { BenchmarkRunnerSystem } from '../benchmark/BenchmarkRunnerSystem.js';
import type { QualityProfile } from '../quality/QualityProfiles.js';

function button(label: string, title = label): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button'; element.textContent = label; element.title = title;
  return element;
}

export class DeveloperShellSystem implements AppSystem {
  readonly id = 'ui.developer-shell';
  readonly phase = 'ui' as const;
  enabled = true;
  private context: AppContext | null = null;
  private root: HTMLElement | null = null;
  private leftContent: HTMLElement | null = null;
  private rightContent: HTMLElement | null = null;
  private bottom: HTMLElement | null = null;
  private partPage = 0;
  private partQuery = '';
  private selectedGroup = 'all';
  private timer = 0;

  constructor(
    readonly catalog: ObjectCatalogSystem,
    readonly selection: SelectionSystem,
    readonly camera: CameraControllerSystem,
    readonly notes: NotesSystem,
    readonly markup: MarkupSystem,
    readonly screenshot: ScreenshotSystem,
    readonly lighting: LightingState,
    readonly materials: MaterialRegistrySystem,
    readonly benchmarks: BenchmarkRunnerSystem,
  ) {}

  init(context: AppContext): void {
    this.context = context;
    this.build();
    context.events.on('selection:change', () => this.renderLeft());
    context.events.on('mode:change', ({ mode }) => {
      // Sailing needs the whole viewport: fold both drawers away.
      if (mode === 'sailing') context.state.update({ leftOpen: false, rightOpen: false });
      this.renderAll();
    });
    context.quality.subscribe(() => this.renderRight());
    this.lighting.subscribe(() => this.renderRight());
    this.renderAll();
  }

  update(dtSeconds: number): void {
    this.timer += dtSeconds;
    if (this.timer >= 0.35) {
      this.timer = 0;
      this.renderBottom();
      if (this.context?.state.get().rightPanel === 'telemetry') this.renderRight();
    }
  }

  private build(): void {
    const root = document.createElement('div'); root.className = 'foundry-ui'; root.id = 'foundry-ui';
    root.innerHTML = `
      <header class="foundry-topbar">
        <div class="brand"><b>LASER 2</b><span>SAILING FOUNDRY V8</span></div>
        <div class="top-actions" data-role="top-actions"></div>
      </header>
      <aside class="rail rail-left" data-role="left-rail"></aside>
      <section class="drawer drawer-left"><header><b data-role="left-title">PARTS</b><button data-role="left-close">×</button></header><div class="drawer-content" data-role="left-content"></div></section>
      <aside class="rail rail-right" data-role="right-rail"></aside>
      <section class="drawer drawer-right"><header><b data-role="right-title">LIGHTING</b><button data-role="right-close">×</button></header><div class="drawer-content" data-role="right-content"></div></section>
      <footer class="foundry-bottom" data-role="bottom"></footer>
      <div class="foundry-toast" data-role="toast"></div>
    `;
    document.body.appendChild(root);
    this.root = root;
    this.leftContent = root.querySelector('[data-role="left-content"]');
    this.rightContent = root.querySelector('[data-role="right-content"]');
    this.bottom = root.querySelector('[data-role="bottom"]');
    this.buildRails();
    this.buildTopActions();
    root.querySelector<HTMLButtonElement>('[data-role="left-close"]')!.onclick = () => this.toggleDrawer('left', false);
    root.querySelector<HTMLButtonElement>('[data-role="right-close"]')!.onclick = () => this.toggleDrawer('right', false);
  }

  private buildRails(): void {
    if (!this.root || !this.context) return;
    const left = this.root.querySelector<HTMLElement>('[data-role="left-rail"]')!;
    const right = this.root.querySelector<HTMLElement>('[data-role="right-rail"]')!;
    const leftPages = [['parts', '☷', 'Parts'], ['notes', '✎', 'Notes'], ['views', '◎', 'Views'], ['capture', '▣', 'Capture']];
    const rightPages = [['sun', '☀', 'Sun + Exposure'], ['atmosphere', '◌', 'Atmosphere'], ['lighting', '◐', 'Surface Lighting'], ['materials', '◩', 'Materials'], ['telemetry', '≋', 'Telemetry'], ['benchmark', '⏱', 'Benchmark'], ['architecture', '⌘', 'Architecture']];
    for (const [id, icon, title] of leftPages) {
      const b = button(icon!, title); b.dataset.page = id!; b.onclick = () => { this.context!.state.update({ leftPanel: id!, leftOpen: true }); this.renderAll(); }; left.appendChild(b);
    }
    for (const [id, icon, title] of rightPages) {
      const b = button(icon!, title); b.dataset.page = id!; b.onclick = () => { this.context!.state.update({ rightPanel: id!, rightOpen: true }); this.renderAll(); }; right.appendChild(b);
    }
  }

  private buildTopActions(): void {
    if (!this.root || !this.context) return;
    const host = this.root.querySelector<HTMLElement>('[data-role="top-actions"]')!;
    const inspect = button('INSPECT'); inspect.onclick = () => { this.context!.setDynamic(false); this.renderAll(); };
    const anchored = button('ANCHORED'); anchored.onclick = () => { this.context!.setDynamic(true); this.renderAll(); };
    const sail = button('SAIL', 'Free sailing on the native ocean (capsize, swim, recovery)'); sail.onclick = () => { this.context!.setMode('sailing'); this.renderAll(); };
    const step = button('STEP 30'); step.onclick = () => this.context!.stepSimulation(30);
    const tools: Array<[MarkupTool, string]> = [['none', '↖'], ['pen', '✎'], ['arrow', '→'], ['rect', '□'], ['erase', '⌫']];
    host.append(inspect, anchored, sail, step);
    for (const [tool, label] of tools) { const b = button(label, `Markup: ${tool}`); b.onclick = () => { this.markup.setTool(tool); this.renderTopActive(); }; host.appendChild(b); b.dataset.markup = tool; }
    const undo = button('UNDO'); undo.onclick = () => this.markup.undo();
    const shot = button('SCREENSHOT'); shot.onclick = async () => { await this.screenshot.capture(true); this.toast('Screenshot captured'); };
    const exportButton = button('EXPORT JSON'); exportButton.onclick = () => this.exportSnapshot();
    host.append(undo, shot, exportButton);
  }

  private renderAll(): void {
    if (!this.context || !this.root) return;
    const state = this.context.state.get();
    this.root.classList.toggle('left-closed', !state.leftOpen);
    this.root.classList.toggle('left-open-sailing', state.leftOpen && state.mode === 'sailing');
    this.root.classList.toggle('right-closed', !state.rightOpen);
    this.renderTopActive(); this.renderLeft(); this.renderRight(); this.renderBottom();
  }

  private renderTopActive(): void {
    if (!this.root || !this.context) return;
    for (const b of this.root.querySelectorAll<HTMLButtonElement>('[data-markup]')) b.classList.toggle('active', b.dataset.markup === this.markup.tool);
    for (const b of this.root.querySelectorAll<HTMLButtonElement>('.top-actions button')) {
      if (b.textContent === 'INSPECT') b.classList.toggle('active', this.context.state.get().mode === 'inspect');
      if (b.textContent === 'ANCHORED') b.classList.toggle('active', this.context.state.get().mode === 'anchored');
      if (b.textContent === 'SAIL') b.classList.toggle('active', this.context.state.get().mode === 'sailing');
    }
  }

  private renderLeft(): void {
    if (!this.context || !this.root || !this.leftContent) return;
    const page = this.context.state.get().leftPanel;
    this.root.querySelector<HTMLElement>('[data-role="left-title"]')!.textContent = page.toUpperCase();
    this.leftContent.replaceChildren();
    if (page === 'parts') this.renderParts();
    else if (page === 'notes') this.renderNotes();
    else if (page === 'views') this.renderViews();
    else this.renderCapture();
  }

  private renderParts(): void {
    if (!this.leftContent) return;
    const controls = document.createElement('div'); controls.className = 'compact-controls';
    const search = document.createElement('input'); search.placeholder = 'Search parts'; search.value = this.partQuery;
    search.oninput = () => { this.partQuery = search.value.toLowerCase(); this.partPage = 0; this.renderLeft(); };
    const group = document.createElement('select');
    const groups = ['all', ...new Set(this.catalog.items.map((item) => item.group))];
    for (const id of groups) { const option = document.createElement('option'); option.value = id; option.textContent = id; option.selected = id === this.selectedGroup; group.appendChild(option); }
    group.onchange = () => { this.selectedGroup = group.value; this.partPage = 0; this.renderLeft(); };
    controls.append(search, group); this.leftContent.appendChild(controls);
    const filtered = this.catalog.items.filter((item) => (this.selectedGroup === 'all' || item.group === this.selectedGroup) && (!this.partQuery || `${item.name} ${item.id}`.toLowerCase().includes(this.partQuery)));
    const pageSize = 10, pages = Math.max(1, Math.ceil(filtered.length / pageSize)); this.partPage = Math.min(this.partPage, pages - 1);
    const list = document.createElement('div'); list.className = 'part-list';
    for (const item of filtered.slice(this.partPage * pageSize, (this.partPage + 1) * pageSize)) {
      const row = button(''); row.className = 'part-row'; row.classList.toggle('selected', item.id === this.selection.current?.id);
      row.innerHTML = `<span><b>${item.name}</b><small>${item.group} · ${item.triangleCount.toLocaleString()} tris</small></span><i>›</i>`;
      row.onclick = () => this.selection.select(item.id, true); list.appendChild(row);
    }
    this.leftContent.appendChild(list);
    const pager = document.createElement('div'); pager.className = 'pager';
    const prev = button('‹'); prev.disabled = this.partPage === 0; prev.onclick = () => { this.partPage--; this.renderLeft(); };
    const next = button('›'); next.disabled = this.partPage >= pages - 1; next.onclick = () => { this.partPage++; this.renderLeft(); };
    const label = document.createElement('span'); label.textContent = `${this.partPage + 1} / ${pages} · ${filtered.length}`; pager.append(prev, label, next); this.leftContent.appendChild(pager);
  }

  private renderNotes(): void {
    if (!this.leftContent) return;
    const selected = this.selection.current;
    if (!selected) { this.leftContent.innerHTML = '<div class="empty">Select a part first.</div>'; return; }
    const note = this.notes.get(selected.id);
    const title = document.createElement('div'); title.className = 'card'; title.innerHTML = `<h3>${selected.name}</h3><small>${selected.id}</small>`;
    const status = document.createElement('select');
    for (const id of ['unreviewed', 'correct', 'incorrect', 'question'] as const) { const o = document.createElement('option'); o.value = id; o.textContent = id; o.selected = note.status === id; status.appendChild(o); }
    const area = document.createElement('textarea'); area.value = note.text; area.placeholder = 'Explain what is right, wrong, or uncertain…'; area.rows = 10;
    const tags = document.createElement('input'); tags.value = note.tags.join(', '); tags.placeholder = 'tags, comma, separated';
    const save = button('SAVE NOTE'); save.onclick = () => { this.notes.set(selected.id, { status: status.value as any, text: area.value, tags: tags.value.split(',').map((v) => v.trim()).filter(Boolean) }); this.toast('Note saved'); };
    this.leftContent.append(title, status, area, tags, save);
  }

  private renderViews(): void {
    if (!this.leftContent) return;
    const grid = document.createElement('div'); grid.className = 'button-grid';
    for (const view of ['port', 'starboard', 'bow', 'stern', 'top', 'rig'] as const) { const b = button(view.toUpperCase()); b.onclick = () => this.camera.setView(view); grid.appendChild(b); }
    const focus = button('FOCUS SELECTED'); focus.onclick = () => { if (this.selection.current) this.camera.focus(this.selection.current); };
    const isolate = button('ISOLATE SELECTED'); let isolated = false; isolate.onclick = () => { isolated = !isolated; this.selection.isolate(isolated); isolate.classList.toggle('active', isolated); };
    this.leftContent.append(grid, focus, isolate);
  }

  private renderCapture(): void {
    if (!this.leftContent) return;
    const shot = button('CAPTURE PNG'); shot.onclick = async () => { await this.screenshot.capture(true); this.toast('PNG captured'); };
    const clear = button('CLEAR MARKUP'); clear.onclick = () => this.markup.clear();
    const exportButton = button('EXPORT REVIEW + TELEMETRY'); exportButton.onclick = () => this.exportSnapshot();
    this.leftContent.append(shot, clear, exportButton);
  }

  private renderRight(): void {
    if (!this.context || !this.root || !this.rightContent) return;
    const page = this.context.state.get().rightPanel;
    this.root.querySelector<HTMLElement>('[data-role="right-title"]')!.textContent = page.toUpperCase();
    this.rightContent.replaceChildren();
    if (page === 'sun') this.renderSun();
    else if (page === 'atmosphere') this.renderAtmosphere();
    else if (page === 'lighting') this.renderLighting();
    else if (page === 'materials') this.renderMaterials();
    else if (page === 'telemetry') this.renderTelemetry();
    else if (page === 'benchmark') this.renderBenchmark();
    else this.renderArchitecture();
  }

  private renderQualityCard(): void {
    if (!this.rightContent || !this.context) return;
    const qualityCard = document.createElement('div'); qualityCard.className = 'card'; qualityCard.innerHTML = '<h3>QUALITY CONTRACT</h3>';
    const quality = document.createElement('select');
    for (const profile of this.context.quality.list()) { const o = document.createElement('option'); o.value = profile.id; o.textContent = profile.label; o.selected = profile.id === this.context.quality.current.id; quality.appendChild(o); }
    quality.onchange = () => { this.context!.quality.set(quality.value as QualityProfile['id']); this.context!.events.emit('quality:change', { id: quality.value }); this.context!.requestRender('quality changed'); };
    qualityCard.appendChild(quality); this.rightContent.appendChild(qualityCard);
  }

  private renderSun(): void {
    if (!this.rightContent || !this.context) return;
    this.renderQualityCard();
    const card = document.createElement('div'); card.className = 'card'; card.innerHTML = '<h3>SOLAR AUTHORITY</h3>';
    card.appendChild(this.rangeControl('sunElevationDeg', 'Elevation', -8, 90, 0.5));
    card.appendChild(this.rangeControl('sunAzimuthDeg', 'Azimuth', 0, 360, 1));
    card.appendChild(this.rangeControl('sunIlluminanceLux', 'Illuminance lux', 0, 130000, 1000));
    card.appendChild(this.rangeControl('sunIntensity', 'Renderer calibration', 0, 6, 0.05));
    card.appendChild(this.rangeControl('sunAngularRadiusDeg', 'Angular radius °', 0.1, 0.5, 0.001));
    this.rightContent.appendChild(card);
    const camera = document.createElement('div'); camera.className = 'card'; camera.innerHTML = '<h3>CAMERA RESPONSE</h3>';
    camera.appendChild(this.checkboxControl('autoExposureEnabled', 'Auto exposure'));
    camera.appendChild(this.rangeControl('exposureEv', 'Exposure compensation EV', -5, 5, 0.1));
    camera.appendChild(this.rangeControl('autoExposureReferenceLux', 'Auto reference lux', 1000, 100000, 1000));
    camera.appendChild(this.rangeControl('autoExposureStrength', 'Auto adaptation strength', 0, 1, 0.01));
    camera.appendChild(this.rangeControl('whiteBalanceKelvin', 'White balance K', 2500, 12000, 50));
    camera.appendChild(this.rangeControl('toneMappingShoulder', 'Highlight headroom', 0.5, 2.5, 0.01));
    this.rightContent.appendChild(camera);
  }

  private renderAtmosphere(): void {
    if (!this.rightContent || !this.context) return;
    const enableCard = document.createElement('div'); enableCard.className = 'card'; enableCard.innerHTML = '<h3>ATMOSPHERE AUTHORITY</h3>';
    enableCard.appendChild(this.checkboxControl('atmosphereEnabled', 'Enabled'));
    enableCard.appendChild(this.rangeControl('skyIntensity', 'Sky radiance', 0, 2.5, 0.01));
    enableCard.appendChild(this.rangeControl('rayleighDensity', 'Molecular density', 0.2, 2, 0.01));
    enableCard.appendChild(this.rangeControl('aerosolDensity', 'Aerosol density', 0, 1.2, 0.01));
    enableCard.appendChild(this.rangeControl('mieAnisotropy', 'Mie anisotropy', 0.2, 0.95, 0.01));
    enableCard.appendChild(this.rangeControl('ozoneDensity', 'Ozone column', 0, 2, 0.01));
    enableCard.appendChild(this.rangeControl('multipleScatteringFactor', 'Higher-order scattering', 0, 1.5, 0.01));
    enableCard.appendChild(this.checkboxControl('spectralSolarEnabled', 'Spectral solar source'));
    this.rightContent.appendChild(enableCard);
    const lower = document.createElement('div'); lower.className = 'card'; lower.innerHTML = '<h3>LOW ATMOSPHERE + GROUND</h3>';
    lower.appendChild(this.rangeControl('turbidity', 'Turbidity scale', 1, 12, 0.1));
    lower.appendChild(this.rangeControl('groundAlbedo', 'Ground/water albedo', 0, 0.6, 0.01));
    lower.appendChild(this.rangeControl('groundBounce', 'Bounce strength', 0, 1, 0.01));
    lower.appendChild(this.rangeControl('diffuseEnvironmentIntensity', 'Diffuse coupling', 0, 2, 0.01));
    lower.appendChild(this.rangeControl('specularEnvironmentIntensity', 'Reflection coupling', 0, 2, 0.01));
    lower.appendChild(this.rangeControl('cameraAltitudeM', 'Observer altitude m', 2, 5000, 1));
    lower.appendChild(this.checkboxControl('aerialPerspectiveEnabled', 'Aerial perspective'));
    lower.appendChild(this.rangeControl('aerialPerspectiveStrength', 'Aerial strength', 0, 2, 0.01));
    lower.appendChild(this.rangeControl('aerialPerspectiveMaxDistanceM', 'Aerial 98% distance m', 50, 10000, 10));
    this.rightContent.appendChild(lower);
    const profile = this.context.quality.current;
    const receipt = document.createElement('div'); receipt.className = 'card';
    const atmosphereTelemetry: any = window.LASER2_FOUNDRY?.systems?.atmosphere?.telemetry?.() ?? {};
    receipt.innerHTML = `<h3>ACTIVE SAMPLING</h3><div class="kv"><span>Sky LUT</span><b>${profile.atmosphereLutWidth}×${profile.atmosphereLutHeight}</b><span>View samples</span><b>${profile.atmosphereViewSamples}</b><span>Sun samples</span><b>${profile.atmosphereSunSamples}</b><span>Scattering orders</span><b>${profile.atmosphereScatteringOrders}</b><span>Diffuse samples</span><b>${profile.atmosphereShSamples}</b><span>Worker</span><b>${atmosphereTelemetry.worker?.active ? 'ACTIVE' : 'FALLBACK'}</b><span>Worker CPU</span><b>${Number(atmosphereTelemetry.lutWorkerCpuMs?.last ?? 0).toFixed(2)} ms</b><span>Main apply</span><b>${Number(atmosphereTelemetry.lutMainThreadApplyMs?.last ?? 0).toFixed(3)} ms</b></div>`;
    this.rightContent.appendChild(receipt);
  }

  private renderLighting(): void {
    if (!this.rightContent || !this.context) return;
    const groups: Array<[string, Array<[keyof ReturnType<LightingState['get']>, string, number, number, number]>]> = [
      ['Sail Thin Sheet', [['sailTransmission', 'Transmission', 0, 0.7, 0.01], ['sailAbsorption', 'Absorption', 0, 2, 0.01], ['sailShadowSoftnessMm', 'Shadow softness mm', 0, 150, 1], ['vinylTransmission', 'Vinyl transmission', 0, 1, 0.01]]],
      ['Surfaces', [['aluminumRoughness', 'Aluminum roughness', 0.05, 0.9, 0.01], ['hullGelcoatRoughness', 'Gelcoat roughness', 0.05, 0.8, 0.01]]],
    ];
    for (const [title, controls] of groups) {
      const card = document.createElement('div'); card.className = 'card'; card.innerHTML = `<h3>${title}</h3>`;
      for (const [key, label, min, max, step] of controls) card.appendChild(this.rangeControl(key, label, min, max, step));
      this.rightContent.appendChild(card);
    }
    const probes = document.createElement('div'); probes.className = 'card'; probes.innerHTML = '<h3>LOCAL ENVIRONMENT BOUNCE</h3>';
    probes.appendChild(this.checkboxControl('localProbesEnabled', 'Enable local probes'));
    probes.appendChild(this.rangeControl('localDiffuseBounceStrength', 'Diffuse bounce', 0, 2, 0.01));
    probes.appendChild(this.rangeControl('localSpecularProbeStrength', 'Specular response', 0, 2, 0.01));
    this.rightContent.appendChild(probes);
  }

  private checkboxControl(key: keyof ReturnType<LightingState['get']>, label: string): HTMLElement {
    const row = document.createElement('label'); row.className = 'range-row';
    const name = document.createElement('span'); name.textContent = label;
    const input = document.createElement('input'); input.type = 'checkbox'; input.checked = Boolean(this.lighting.get()[key]);
    const value = document.createElement('output'); value.textContent = input.checked ? 'ON' : 'OFF';
    input.onchange = () => { this.lighting.update({ [key]: input.checked } as any); value.textContent = input.checked ? 'ON' : 'OFF'; };
    row.append(name, input, value); return row;
  }

  private rangeControl(key: keyof ReturnType<LightingState['get']>, label: string, min: number, max: number, step: number): HTMLElement {
    const row = document.createElement('label'); row.className = 'range-row';
    const name = document.createElement('span'); name.textContent = label;
    const input = document.createElement('input'); input.type = 'range'; input.min = String(min); input.max = String(max); input.step = String(step); input.value = String(this.lighting.get()[key]);
    const value = document.createElement('output'); value.textContent = Number(input.value).toFixed(step < 0.1 ? 2 : 1);
    input.oninput = () => { const n = Number(input.value); this.lighting.update({ [key]: n } as any); value.textContent = n.toFixed(step < 0.1 ? 2 : 1); };
    row.append(name, input, value); return row;
  }

  private renderMaterials(): void {
    if (!this.rightContent) return;
    const groups = new Map<string, number>();
    for (const record of this.materials.records) groups.set(record.category, (groups.get(record.category) ?? 0) + 1);
    const card = document.createElement('div'); card.className = 'card'; card.innerHTML = '<h3>MATERIAL INVENTORY</h3>';
    const table = document.createElement('div'); table.className = 'kv';
    for (const [category, count] of [...groups].sort()) table.innerHTML += `<span>${category}</span><b>${count}</b>`;
    card.appendChild(table); this.rightContent.appendChild(card);
    const records = document.createElement('div'); records.className = 'material-list';
    for (const record of this.materials.records.slice(0, 12)) records.innerHTML += `<div><b>${record.name}</b><small>${record.category} · ${record.type}<br>R ${record.roughness ?? '—'} · M ${record.metalness ?? '—'} · T ${record.transmission ?? '—'}</small></div>`;
    this.rightContent.appendChild(records);
  }

  private renderTelemetry(): void {
    if (!this.rightContent || !this.context) return;
    const snapshot: any = this.context.telemetry.snapshot();
    const atmosphere: any = window.LASER2_FOUNDRY?.systems?.atmosphere?.telemetry?.() ?? {};
    const sun: any = window.LASER2_FOUNDRY?.systems?.sun?.telemetry?.() ?? {};
    const environment: any = window.LASER2_FOUNDRY?.systems?.environment?.telemetry?.() ?? {};
    const coupling: any = window.LASER2_FOUNDRY?.systems?.coupling?.telemetry?.() ?? {};
    const shProbe: any = window.LASER2_FOUNDRY?.systems?.shProbe?.telemetry?.() ?? {};
    const cameraResponse: any = window.LASER2_FOUNDRY?.systems?.cameraResponse?.telemetry?.() ?? {};
    const aerial: any = window.LASER2_FOUNDRY?.systems?.aerialPerspective?.telemetry?.() ?? {};
    const localProbes: any = window.LASER2_FOUNDRY?.systems?.localProbes?.telemetry?.() ?? {};
    const hullBatches: any = window.LASER2_FOUNDRY?.systems?.hullBatches?.telemetry?.() ?? {};
    const cards = [
      ['RADIOMETRIC COUPLING', { 'Direct normal': `${Number(coupling.directNormalLux ?? 0).toFixed(0)} lux`, 'Direct horizontal': `${Number(coupling.directHorizontalLux ?? 0).toFixed(0)} lux`, 'Diffuse sky': `${Number(coupling.skyIrradianceLux ?? 0).toFixed(0)} lux`, 'Ground bounce': `${Number(coupling.groundBounceLux ?? 0).toFixed(0)} lux`, 'Spectral bands': coupling.spectralSolarEnabled ? coupling.spectralSamples ?? '—' : 'OFF', 'Solar CCT': `${Number(coupling.spectralColorTemperatureApproxK ?? 0).toFixed(0)} K`, 'Exposure': Number(coupling.rendererExposure ?? 1).toFixed(3), 'Budget CPU': `${Number(coupling.cpuMs ?? 0).toFixed(3)} ms` }],
      ['ATMOSPHERE TRANSPORT', { 'Backend': atmosphere.backend ?? '—', 'Storage': atmosphere.textureStorage ?? '—', 'HDR': String(atmosphere.hdrEnvironment ?? false), 'LUT': atmosphere.quality ? `${atmosphere.quality.lutWidth}×${atmosphere.quality.lutHeight}` : '—', 'Ozone': Number(atmosphere.settings?.ozoneDensity ?? this.lighting.get().ozoneDensity).toFixed(2), 'Higher order': Number(atmosphere.settings?.multipleScatteringFactor ?? this.lighting.get().multipleScatteringFactor).toFixed(2), 'Worker CPU': `${Number(atmosphere.lutWorkerCpuMs?.last ?? atmosphere.lutCpuMs?.last ?? 0).toFixed(2)} ms`, 'Main apply': `${Number(atmosphere.lutMainThreadApplyMs?.last ?? 0).toFixed(3)} ms`, 'Orders': atmosphere.quality?.scatteringOrders ?? '—', 'Worker active': String(atmosphere.worker?.active ?? false), 'Sun intensity': Number(sun.rendererIntensity ?? 0).toFixed(3) }],
      ['ENVIRONMENT PROBES', { 'SH active': String(shProbe.active ?? shProbe.created ?? false), 'SH coefficients': shProbe.coefficientVectors ?? shProbe.coefficients ?? '—', 'SH samples': shProbe.samples ?? '—', 'SH CPU': `${Number(shProbe.cpuMs?.last ?? shProbe.lastCpuMs ?? 0).toFixed(3)} ms`, 'PBR materials': environment.pbrMaterials ?? '—', 'PMREM bound': String(environment.environmentTextureBound ?? false), 'Specular gain': Number(environment.specularEnvironmentIntensity ?? 0).toFixed(3) }],
      ['LOCAL PROBES', { 'Active': String(localProbes.enabled ?? false), 'Probe count': localProbes.probeCount ?? '—', 'Patched materials': localProbes.patchedMaterials ?? '—', 'Shader compiles': localProbes.shaderCompiles ?? '—', 'Mean CPU': `${Number(localProbes.cpuMs?.mean ?? 0).toFixed(3)} ms` }],
      ['STATIC HULL BATCHES', { 'Source meshes': hullBatches.sourceMeshes ?? '—', 'Batch meshes': hullBatches.batchMeshes ?? '—', 'Draw-call reduction': hullBatches.drawCallReduction ?? '—', 'Topology parity': String(hullBatches.topologyParity ?? false), 'Build': `${Number(hullBatches.buildMs ?? 0).toFixed(2)} ms` }],
      ['CAMERA + AERIAL', { 'Tone mapping': cameraResponse.toneMappingName ?? cameraResponse.toneMapping ?? '—', 'Output': cameraResponse.outputColorSpace ?? '—', 'Renderer exposure': Number(cameraResponse.rendererExposure ?? coupling.rendererExposure ?? 1).toFixed(3), 'White balance': `${Number(coupling.whiteBalanceRgb?.r ?? 1).toFixed(3)} / ${Number(coupling.whiteBalanceRgb?.g ?? 1).toFixed(3)} / ${Number(coupling.whiteBalanceRgb?.b ?? 1).toFixed(3)}`, 'Aerial enabled': String(aerial.enabled ?? false), 'Patched materials': aerial.patchedMaterials ?? '—', 'Shader compiles': aerial.shaderCompiles ?? '—' }],
      ['FRAME GRAPH', { 'Mode': snapshot.currentMode, 'CPU last': `${snapshot.frameCpuMs.last.toFixed(2)} ms`, 'CPU p95': `${snapshot.frameCpuMs.p95.toFixed(2)} ms`, 'Frame': snapshot.frame }],
      ['DYNAMIC CADENCE', { 'Actual FPS': snapshot.dynamicCadence.actualFps ? snapshot.dynamicCadence.actualFps.toFixed(1) : '—', 'Interval p95': `${snapshot.dynamicCadence.intervalMs.p95.toFixed(2)} ms`, 'Static render p95': `${snapshot.staticRenderCpuMs.p95.toFixed(2)} ms`, 'Last reason': snapshot.lastRenderReason }],
      ['RENDERER', { Calls: snapshot.renderer?.calls ?? '—', Triangles: snapshot.renderer?.triangles ?? '—', Programs: snapshot.renderer?.programs ?? '—', Textures: snapshot.renderer?.textures ?? '—' }],
      ['WEBGL', { Version: snapshot.webgl?.version ?? '—', Renderer: snapshot.webgl?.renderer ?? '—', 'Context lost': String(snapshot.webgl?.contextLost ?? '—'), 'Retained GL errors': snapshot.webgl?.errorEvents?.length ?? 0 }],
      ['TELEMETRY COST', { Samples: snapshot.telemetrySampling.samples, 'Last': `${snapshot.telemetrySampling.lastMs.toFixed(3)} ms`, 'Mean': `${snapshot.telemetrySampling.meanMs.toFixed(3)} ms`, 'Max': `${snapshot.telemetrySampling.maxMs.toFixed(3)} ms` }],
      ['GPU TIMER', { Supported: String(snapshot.gpuTimer?.supported), Reason: snapshot.gpuTimer?.reason ?? 'active', Pending: snapshot.gpuTimer?.pending ?? 0 }],
    ];
    for (const [title, values] of cards as any) { const card = document.createElement('div'); card.className = 'card'; card.innerHTML = `<h3>${title}</h3><div class="kv">${Object.entries(values).map(([k, v]) => `<span>${k}</span><b>${String(v)}</b>`).join('')}</div>`; this.rightContent.appendChild(card); }
  }

  private renderBenchmark(): void {
    if (!this.rightContent) return;
    const card = document.createElement('div'); card.className = 'card'; card.innerHTML = '<h3>ISOLATED SCENARIOS</h3><p>Each scenario measures one authority and records a telemetry snapshot.</p>';
    for (const id of ['render-static', 'atmosphere-sweep', 'lighting-sweep', 'rig-step', 'fixed-step-cadence', 'cpu-reference'] as const) {
      const b = button(id.toUpperCase()); b.disabled = this.benchmarks.running; b.onclick = async () => { b.disabled = true; const result = await this.benchmarks.run(id); this.toast(`${id}: ${result.elapsedMs.toFixed(1)} ms`); this.renderRight(); }; card.appendChild(b);
    }
    this.rightContent.appendChild(card);
    const data: any = this.benchmarks.telemetry();
    for (const result of [...data.results].reverse().slice(0, 5)) { const row = document.createElement('div'); row.className = 'card'; row.innerHTML = `<h3>${result.id}</h3><div class="kv"><span>Total</span><b>${result.elapsedMs.toFixed(2)} ms</b><span>Iterations</span><b>${result.iterations}</b><span>Per iteration</span><b>${result.perIterationMs.toFixed(4)} ms</b></div>`; this.rightContent.appendChild(row); }
  }

  private renderArchitecture(): void {
    if (!this.rightContent || !this.context) return;
    const systems = (window.LASER2_FOUNDRY?.kernel?.frameGraph?.list?.() ?? []) as AppSystem[];
    const card = document.createElement('div'); card.className = 'card'; card.innerHTML = '<h3>RUNTIME AUTHORITY</h3><p>The compatibility runtime is isolated under <code>vendor/legacy</code>. V7 moves atmosphere LUT generation into a cancellable worker, adds six atmosphere-fed local lighting probes, and batches the native static hull by material while preserving V6 spectral solar, HDR environment, SH diffuse lighting, ACES response, aerial perspective, fixed-step timing, and exclusive render authority.</p>';
    this.rightContent.appendChild(card);
    for (const system of systems) { const row = document.createElement('div'); row.className = 'system-row'; row.innerHTML = `<span><b>${system.id}</b><small>${system.phase}</small></span><i class="${system.enabled ? 'ok' : ''}">${system.enabled ? 'ON' : 'OFF'}</i>`; this.rightContent.appendChild(row); }
  }

  private renderBottom(): void {
    if (!this.bottom || !this.context) return;
    const t: any = this.context.telemetry.snapshot(); const state = this.context.state.get();
    const cadence = t.dynamicCadence?.actualFps ?? 0;
    this.bottom.innerHTML = `<b>${state.mode.toUpperCase()}</b><span>WATER <b>${state.waterEnabled ? 'ON' : 'OFF'}</b></span><span>QUALITY <b>${this.context.quality.current.label}</b></span><span>CPU <b>${t.frameCpuMs.last.toFixed(2)} ms</b></span><span>FRAME MODE <b>${state.dynamic ? `${cadence.toFixed(1)} FPS` : 'STATIC / ON DEMAND'}</b></span><span>CALLS <b>${t.renderer?.calls ?? '—'}</b></span><span>TRIS <b>${Number(t.renderer?.triangles ?? 0).toLocaleString()}</b></span><span>GPU TIMER <b>${t.gpuTimer?.supported ? 'ON' : 'N/A'}</b></span><span class="grow">${this.selection.current?.name ?? 'No part selected'}</span>`;
  }

  private toggleDrawer(side: 'left' | 'right', open: boolean): void {
    if (!this.context) return;
    this.context.state.update(side === 'left' ? { leftOpen: open } : { rightOpen: open }); this.renderAll();
  }

  private exportSnapshot(): void {
    if (!this.context) return;
    const payload = { exportedAt: new Date().toISOString(), foundry: window.LASER2_FOUNDRY?.kernel?.snapshot?.({ deep: true }), notes: this.notes.export() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `LASER2_FOUNDRY_REVIEW_${Date.now()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private toast(message: string): void {
    const toast = this.root?.querySelector<HTMLElement>('[data-role="toast"]'); if (!toast) return;
    toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1800);
  }
}
