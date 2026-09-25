export interface AtmosphereShaderOptions {
  viewSamples: number;
  sunSamples: number;
}

export const ATMOSPHERE_VERTEX_SHADER = `
precision highp float;
varying vec3 vAtmosphereDirection;
void main() {
  vAtmosphereDirection = normalize(position);
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = clip.xyww;
}
`;

export function atmosphereFragmentShader(_options: AtmosphereShaderOptions): string {
  return `
precision highp float;
uniform sampler2D uSkyLut;
uniform vec3 uSunDirection;
uniform vec3 uSunDisplayColor;
uniform float uSunAngularRadiusRad;
uniform float uLutRadianceRange;
uniform float uExposure;
uniform float uEnabled;
uniform float uOutputLinear;
uniform float uLinearScale;
varying vec3 vAtmosphereDirection;

vec3 acesFilm(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

vec3 linearToSrgb(vec3 value) {
  vec3 lower = value * 12.92;
  vec3 higher = 1.055 * pow(max(value, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
  return mix(higher, lower, lessThanEqual(value, vec3(0.0031308)));
}

vec2 directionToUv(vec3 direction) {
  vec3 d = normalize(direction);
  float longitude = atan(d.x, d.z);
  float latitude = asin(clamp(d.y, -1.0, 1.0));
  return vec2(longitude / 6.28318530718 + 0.5, latitude / 3.14159265359 + 0.5);
}

void main() {
  vec3 viewDirection = normalize(vAtmosphereDirection);
  vec3 color = texture2D(uSkyLut, directionToUv(viewDirection)).rgb * uLutRadianceRange;
  if (uEnabled < 0.5) {
    color = mix(vec3(0.04, 0.08, 0.16), vec3(0.32, 0.48, 0.72), smoothstep(-0.1, 0.7, viewDirection.y));
  }
  float cosine = clamp(dot(viewDirection, normalize(uSunDirection)), -1.0, 1.0);
  float diskCosine = cos(max(0.0001, uSunAngularRadiusRad));
  float disk = smoothstep(diskCosine - 0.00012, diskCosine, cosine);
  color += uSunDisplayColor * disk;
  if (uOutputLinear > 0.5) {
    // HDR scene pipeline: scene-linear radiance, tone mapped once at composite.
    gl_FragColor = vec4(max(vec3(0.0), color) * uLinearScale, 1.0);
    return;
  }
  vec3 mapped = acesFilm(max(vec3(0.0), color) * uExposure);
  gl_FragColor = vec4(linearToSrgb(mapped), 1.0);
}
`;
}
