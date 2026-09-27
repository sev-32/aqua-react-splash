/** Global renderer/camera response authority. */
export class CameraResponseSystem {
    settings;
    coupling;
    id = 'lighting.camera-response';
    phase = 'preRender';
    enabled = true;
    context = null;
    lastRevision = -1;
    updates = 0;
    lastCpuMs = 0;
    originalToneMapping = null;
    originalExposure = 1;
    originalOutputColorSpace = null;
    constructor(settings, coupling) {
        this.settings = settings;
        this.coupling = coupling;
    }
    init(context) {
        this.context = context;
        const renderer = context.legacy.renderer;
        this.originalToneMapping = renderer.toneMapping;
        this.originalExposure = renderer.toneMappingExposure ?? 1;
        this.originalOutputColorSpace = renderer.outputColorSpace ?? renderer.outputEncoding ?? null;
        this.apply(context, true);
        this.settings.subscribe(() => {
            this.apply(context, true);
            context.requestRender('camera response changed');
        });
    }
    update(_dtSeconds, context) {
        this.apply(context, false);
    }
    apply(context, force) {
        const budget = this.coupling.current;
        if (!force && budget.revision === this.lastRevision)
            return;
        const started = performance.now();
        const renderer = context.legacy.renderer;
        this.lastRevision = budget.revision;
        // THREE.ACESFilmicToneMapping in r160. Keeping this single renderer-level
        // transform prevents material-specific tone-map divergence.
        renderer.toneMapping = 4;
        renderer.toneMappingExposure = budget.rendererExposure;
        if ('outputColorSpace' in renderer)
            renderer.outputColorSpace = 'srgb';
        else if ('outputEncoding' in renderer)
            renderer.outputEncoding = 3001;
        this.lastCpuMs = performance.now() - started;
        this.updates++;
    }
    telemetry() {
        const settings = this.settings.get();
        return {
            updates: this.updates,
            cpuMs: this.lastCpuMs,
            rendererToneMapping: this.context?.legacy.renderer?.toneMapping ?? null,
            rendererExposure: this.context?.legacy.renderer?.toneMappingExposure ?? null,
            outputColorSpace: this.context?.legacy.renderer?.outputColorSpace ?? this.context?.legacy.renderer?.outputEncoding ?? null,
            whiteBalanceKelvin: settings.whiteBalanceKelvin,
            whiteBalanceRgb: this.coupling.current.whiteBalanceRgb,
            highlightHeadroom: settings.toneMappingShoulder,
            authority: 'global ACES-filmic renderer response with one atmosphere-coupled exposure and chromatic-adaptation state',
            truthBoundary: 'white balance is applied consistently to sun, sky LUT, SH diffuse and ground bounce; a measured camera spectral sensitivity curve remains future work',
        };
    }
    dispose() {
        if (!this.context)
            return;
        const renderer = this.context.legacy.renderer;
        renderer.toneMapping = this.originalToneMapping;
        renderer.toneMappingExposure = this.originalExposure;
        if ('outputColorSpace' in renderer)
            renderer.outputColorSpace = this.originalOutputColorSpace;
    }
}
//# sourceMappingURL=CameraResponseSystem.js.map