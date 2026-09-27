// Loader for the exported LUCID female-skin-v4.2 crew asset
// (tools/build_lucid_crew_asset.py): canonical mesh, Skin78 influences,
// Semantic51 skeleton and DOF table, declared hand layer, body profile.
let pending = null;
export function loadLucidAsset(base = 'assets/lucid/lucid_female_v4_2') {
    if (pending)
        return pending;
    pending = (async () => {
        const [headerRes, binRes] = await Promise.all([fetch(`${base}.json`), fetch(`${base}.bin`)]);
        if (!headerRes.ok || !binRes.ok)
            throw new Error(`LUCID crew asset unavailable (${headerRes.status}/${binRes.status})`);
        const header = (await headerRes.json());
        const buffer = await binRes.arrayBuffer();
        const section = (name) => {
            const s = header.sections.find((x) => x.name === name);
            if (!s)
                throw new Error(`LUCID asset section missing: ${name}`);
            return s;
        };
        const f32 = (name) => { const s = section(name); return new Float32Array(buffer, s.offset, s.bytes / 4); };
        const u8 = (name) => { const s = section(name); return new Uint8Array(buffer, s.offset, s.bytes); };
        const u16 = (name) => { const s = section(name); return new Uint16Array(buffer, s.offset, s.bytes / 2); };
        return {
            header,
            position: f32('position'),
            normal: f32('normal'),
            skinIndex: u8('skinIndex'),
            skinWeight: f32('skinWeight'),
            region: u8('region'),
            index: u16('index'),
            jointIndex: new Map(header.joints.map((n, i) => [n, i])),
        };
    })();
    pending.catch(() => { pending = null; });
    return pending;
}
//# sourceMappingURL=LucidAsset.js.map