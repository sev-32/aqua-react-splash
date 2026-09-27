export interface AtmosphereShaderOptions {
    viewSamples: number;
    sunSamples: number;
}
export declare const ATMOSPHERE_VERTEX_SHADER = "\nprecision highp float;\nvarying vec3 vAtmosphereDirection;\nvoid main() {\n  vAtmosphereDirection = normalize(position);\n  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n  gl_Position = clip.xyww;\n}\n";
export declare function atmosphereFragmentShader(_options: AtmosphereShaderOptions): string;
//# sourceMappingURL=AtmosphereShader.d.ts.map