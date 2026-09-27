export class VinylController {
    settings;
    id = 'materials.vinyl';
    phase = 'postPhysics';
    enabled = true;
    optics = null;
    last = Number.NaN;
    constructor(settings) {
        this.settings = settings;
    }
    init(context) {
        this.optics = context.legacy.sailOpticsV17;
        this.apply(context);
        this.settings.subscribe(() => {
            this.apply(context);
            context.requestRender('vinyl setting changed');
        });
    }
    apply(_context) {
        const value = this.settings.get().vinylTransmission;
        if (value === this.last)
            return;
        this.last = value;
        if (this.optics?.setParam)
            this.optics.setParam('vinylTransmission', value);
        else if (this.optics?.params)
            this.optics.params.vinylTransmission = value;
    }
    telemetry() {
        return { vinylMeshes: this.optics?.vinylMeshes?.length ?? 0, transmission: this.last };
    }
}
//# sourceMappingURL=VinylController.js.map