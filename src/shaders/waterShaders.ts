/**
 * WebGL Water — modernized shader port of Evan Wallace's classic.
 * Source: https://github.com/evanw/webgl-water (MIT, 2011)
 *
 * Coordinate system:
 *   - Pool spans X,Z ∈ [-1, 1], floor at Y = -1, water surface at Y = 0.
 *   - Plane geometry (used by water surface + caustics) lives on XY in three.js;
 *     the vertex shader swizzles `position.xzy` to map it onto the XZ plane
 *     exactly as the original `gl_Vertex.xzy`.
 *   - The pool cube uses a custom open-top BoxGeometry with Y remapped via
 *     ((1 - y) * 7/12 - 1) so that walls span Y ∈ [-1, -5/12] and the
 *     visible waterline (modeled by the 2/12 threshold) is preserved.
 *
 * Texture format: RGBA float
 *   r = surface height, g = vertical velocity, b = normal.x, a = normal.z
 */

// ─── SIMULATION PASSES ────────────────────────────────────────────────────────

export const simulationVertexShader = /* glsl */ `
  varying vec2 vCoord;
  void main() {
    vCoord = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const dropFragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D tSim;
  uniform vec2 center;     // in [-1, 1]
  uniform float radius;
  uniform float strength;
  varying vec2 vCoord;

  const float PI = 3.141592653589793;

  void main() {
    vec4 info = texture2D(tSim, vCoord);
    float drop = max(0.0, 1.0 - length(center * 0.5 + 0.5 - vCoord) / radius);
    drop = 0.5 - cos(drop * PI) * 0.5;
    info.r += drop * strength;
    gl_FragColor = info;
  }
`;

export const updateFragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D tSim;
  uniform vec2 delta;
  varying vec2 vCoord;

  void main() {
    vec4 info = texture2D(tSim, vCoord);

    vec2 dx = vec2(delta.x, 0.0);
    vec2 dy = vec2(0.0, delta.y);

    float average = (
      texture2D(tSim, vCoord - dx).r +
      texture2D(tSim, vCoord - dy).r +
      texture2D(tSim, vCoord + dx).r +
      texture2D(tSim, vCoord + dy).r
    ) * 0.25;

    info.g += (average - info.r) * 2.0;
    info.g *= 0.995;
    info.r += info.g;

    gl_FragColor = info;
  }
`;

export const normalFragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D tSim;
  uniform vec2 delta;
  varying vec2 vCoord;

  void main() {
    vec4 info = texture2D(tSim, vCoord);
    vec3 dx = vec3(delta.x, texture2D(tSim, vec2(vCoord.x + delta.x, vCoord.y)).r - info.r, 0.0);
    vec3 dy = vec3(0.0, texture2D(tSim, vec2(vCoord.x, vCoord.y + delta.y)).r - info.r, delta.y);
    info.ba = normalize(cross(dy, dx)).xz;
    gl_FragColor = info;
  }
`;

export const sphereDisplacementFragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D tSim;
  uniform vec3 oldCenter;
  uniform vec3 newCenter;
  uniform float radius;
  varying vec2 vCoord;

  float volumeInSphere(vec3 center) {
    vec3 toCenter = vec3(vCoord.x * 2.0 - 1.0, 0.0, vCoord.y * 2.0 - 1.0) - center;
    float t = length(toCenter) / radius;
    float dy = exp(-pow(t * 1.5, 6.0));
    float ymin = min(0.0, center.y - dy);
    float ymax = min(max(0.0, center.y + dy), ymin + 2.0 * dy);
    return (ymax - ymin) * 0.1;
  }

  void main() {
    vec4 info = texture2D(tSim, vCoord);
    info.r += volumeInSphere(oldCenter);
    info.r -= volumeInSphere(newCenter);
    gl_FragColor = info;
  }
`;

// ─── SHARED HELPERS FOR RENDER PASSES ────────────────────────────────────────

const helpers = /* glsl */ `
  const float IOR_AIR = 1.0;
  const float IOR_WATER = 1.333;
  const vec3 abovewaterColor = vec3(0.25, 1.0, 1.25);
  const vec3 underwaterColor = vec3(0.4, 0.9, 1.0);
  const float poolHeight = 1.0;

  uniform vec3 light;
  uniform vec3 sphereCenter;
  uniform float sphereRadius;
  uniform sampler2D tiles;
  uniform sampler2D causticTex;
  uniform sampler2D water;

  vec2 intersectCube(vec3 origin, vec3 ray, vec3 cubeMin, vec3 cubeMax) {
    vec3 tMin = (cubeMin - origin) / ray;
    vec3 tMax = (cubeMax - origin) / ray;
    vec3 t1 = min(tMin, tMax);
    vec3 t2 = max(tMin, tMax);
    float tNear = max(max(t1.x, t1.y), t1.z);
    float tFar  = min(min(t2.x, t2.y), t2.z);
    return vec2(tNear, tFar);
  }

  float intersectSphere(vec3 origin, vec3 ray, vec3 sc, float sr) {
    vec3 toSphere = origin - sc;
    float a = dot(ray, ray);
    float b = 2.0 * dot(toSphere, ray);
    float c = dot(toSphere, toSphere) - sr * sr;
    float disc = b*b - 4.0*a*c;
    if (disc > 0.0) {
      float t = (-b - sqrt(disc)) / (2.0 * a);
      if (t > 0.0) return t;
    }
    return 1.0e6;
  }

  vec3 getSphereColor(vec3 point) {
    vec3 color = vec3(0.5);

    // Ambient occlusion against walls + floor
    color *= 1.0 - 0.9 / pow((1.0 + sphereRadius - abs(point.x)) / sphereRadius, 3.0);
    color *= 1.0 - 0.9 / pow((1.0 + sphereRadius - abs(point.z)) / sphereRadius, 3.0);
    color *= 1.0 - 0.9 / pow((point.y + 1.0 + sphereRadius) / sphereRadius, 3.0);

    vec3 sphereNormal = (point - sphereCenter) / sphereRadius;
    vec3 refractedLight = refract(-light, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);
    float diffuse = max(0.0, dot(-refractedLight, sphereNormal)) * 0.5;
    vec4 info = texture2D(water, point.xz * 0.5 + 0.5);
    if (point.y < info.r) {
      vec4 caustic = texture2D(causticTex, 0.75 * (point.xz - point.y * refractedLight.xz / refractedLight.y) * 0.5 + 0.5);
      diffuse *= caustic.r * 4.0;
    }
    color += diffuse;
    return color;
  }

  vec3 getWallColor(vec3 point) {
    float scale = 0.5;

    vec3 wallColor;
    vec3 normal;
    if (abs(point.x) > 0.999) {
      wallColor = texture2D(tiles, point.yz * 0.5 + vec2(1.0, 0.5)).rgb;
      normal = vec3(-point.x, 0.0, 0.0);
    } else if (abs(point.z) > 0.999) {
      wallColor = texture2D(tiles, point.yx * 0.5 + vec2(1.0, 0.5)).rgb;
      normal = vec3(0.0, 0.0, -point.z);
    } else {
      wallColor = texture2D(tiles, point.xz * 0.5 + 0.5).rgb;
      normal = vec3(0.0, 1.0, 0.0);
    }

    scale /= length(point);                                                       // pool AO
    scale *= 1.0 - 0.9 / pow(length(point - sphereCenter) / sphereRadius, 4.0);   // sphere AO

    vec3 refractedLight = -refract(-light, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);
    float diffuse = max(0.0, dot(refractedLight, normal));
    vec4 info = texture2D(water, point.xz * 0.5 + 0.5);

    if (point.y < info.r) {
      vec4 caustic = texture2D(causticTex, 0.75 * (point.xz - point.y * refractedLight.xz / refractedLight.y) * 0.5 + 0.5);
      scale += diffuse * caustic.r * 2.0 * caustic.g;
    } else {
      vec2 t = intersectCube(point, refractedLight, vec3(-1.0, -poolHeight, -1.0), vec3(1.0, 2.0, 1.0));
      diffuse *= 1.0 / (1.0 + exp(-200.0 / (1.0 + 10.0 * (t.y - t.x)) * (point.y + refractedLight.y * t.y - 2.0 / 12.0)));
      scale += diffuse * 0.5;
    }

    return wallColor * scale;
  }
`;

// ─── WATER SURFACE ───────────────────────────────────────────────────────────

const waterVertexShader = /* glsl */ `
  uniform sampler2D water;
  varying vec3 vPosition;
  void main() {
    vec4 info = texture2D(water, position.xy * 0.5 + 0.5);
    vPosition = position.xzy;       // map XY plane onto XZ plane
    vPosition.y += info.r;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);
  }
`;

const surfaceRayBody = /* glsl */ `
  uniform vec3 eye;
  uniform samplerCube sky;
  varying vec3 vPosition;

  vec3 getSurfaceRayColor(vec3 origin, vec3 ray, vec3 waterColor) {
    vec3 color;
    float q = intersectSphere(origin, ray, sphereCenter, sphereRadius);
    if (q < 1.0e6) {
      color = getSphereColor(origin + ray * q);
    } else if (ray.y < 0.0) {
      vec2 t = intersectCube(origin, ray, vec3(-1.0, -poolHeight, -1.0), vec3(1.0, 2.0, 1.0));
      color = getWallColor(origin + ray * t.y);
    } else {
      vec2 t = intersectCube(origin, ray, vec3(-1.0, -poolHeight, -1.0), vec3(1.0, 2.0, 1.0));
      vec3 hit = origin + ray * t.y;
      if (hit.y < 2.0 / 12.0) {
        color = getWallColor(hit);
      } else {
        color = textureCube(sky, ray).rgb;
        color += vec3(pow(max(0.0, dot(light, ray)), 5000.0)) * vec3(10.0, 8.0, 6.0);
      }
    }
    if (ray.y < 0.0) color *= waterColor;
    return color;
  }
`;

export const waterAboveFragmentShader = /* glsl */ `
  precision highp float;
  ${helpers}
  ${surfaceRayBody}

  void main() {
    vec2 coord = vPosition.xz * 0.5 + 0.5;
    vec4 info = texture2D(water, coord);

    // Make water look more "peaked"
    for (int i = 0; i < 5; i++) {
      coord += info.ba * 0.005;
      info = texture2D(water, coord);
    }

    vec3 normal = vec3(info.b, sqrt(1.0 - dot(info.ba, info.ba)), info.a);
    vec3 incomingRay = normalize(vPosition - eye);

    vec3 reflectedRay = reflect(incomingRay, normal);
    vec3 refractedRay = refract(incomingRay, normal, IOR_AIR / IOR_WATER);
    float fresnel = mix(0.25, 1.0, pow(1.0 - dot(normal, -incomingRay), 3.0));

    vec3 reflectedColor = getSurfaceRayColor(vPosition, reflectedRay, abovewaterColor);
    vec3 refractedColor = getSurfaceRayColor(vPosition, refractedRay, abovewaterColor);

    gl_FragColor = vec4(mix(refractedColor, reflectedColor, fresnel), 1.0);
  }
`;

export const waterBelowFragmentShader = /* glsl */ `
  precision highp float;
  ${helpers}
  ${surfaceRayBody}

  void main() {
    vec2 coord = vPosition.xz * 0.5 + 0.5;
    vec4 info = texture2D(water, coord);

    for (int i = 0; i < 5; i++) {
      coord += info.ba * 0.005;
      info = texture2D(water, coord);
    }

    vec3 normal = vec3(info.b, sqrt(1.0 - dot(info.ba, info.ba)), info.a);
    vec3 incomingRay = normalize(vPosition - eye);

    normal = -normal;
    vec3 reflectedRay = reflect(incomingRay, normal);
    vec3 refractedRay = refract(incomingRay, normal, IOR_WATER / IOR_AIR);
    float fresnel = mix(0.5, 1.0, pow(1.0 - dot(normal, -incomingRay), 3.0));

    vec3 reflectedColor = getSurfaceRayColor(vPosition, reflectedRay, underwaterColor);
    vec3 refractedColor = getSurfaceRayColor(vPosition, refractedRay, vec3(1.0)) * vec3(0.8, 1.0, 1.1);

    gl_FragColor = vec4(mix(reflectedColor, refractedColor, (1.0 - fresnel) * length(refractedRay)), 1.0);
  }
`;

export { waterVertexShader };

// ─── POOL CUBE ───────────────────────────────────────────────────────────────

export const cubeVertexShader = /* glsl */ `
  varying vec3 vPosition;
  uniform float poolHeightU;
  void main() {
    vPosition = position;
    vPosition.y = ((1.0 - position.y) * (7.0 / 12.0) - 1.0) * poolHeightU;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);
  }
`;

export const cubeFragmentShader = /* glsl */ `
  precision highp float;
  ${helpers}
  varying vec3 vPosition;

  void main() {
    gl_FragColor = vec4(getWallColor(vPosition), 1.0);
    vec4 info = texture2D(water, vPosition.xz * 0.5 + 0.5);
    if (vPosition.y < info.r) {
      gl_FragColor.rgb *= underwaterColor * 1.2;
    }
  }
`;

// ─── SPHERE ──────────────────────────────────────────────────────────────────

export const sphereVertexShader = /* glsl */ `
  uniform vec3 sphereCenterU;
  uniform float sphereRadiusU;
  varying vec3 vPosition;
  void main() {
    vPosition = sphereCenterU + position * sphereRadiusU;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);
  }
`;

export const sphereRenderFragmentShader = /* glsl */ `
  precision highp float;
  ${helpers}
  varying vec3 vPosition;

  void main() {
    gl_FragColor = vec4(getSphereColor(vPosition), 1.0);
    vec4 info = texture2D(water, vPosition.xz * 0.5 + 0.5);
    if (vPosition.y < info.r) {
      gl_FragColor.rgb *= underwaterColor * 1.2;
    }
  }
`;

// ─── CAUSTICS ────────────────────────────────────────────────────────────────

export const causticsVertexShader = /* glsl */ `
  ${helpers}
  varying vec3 oldPos;
  varying vec3 newPos;
  varying vec3 ray;

  vec3 project(vec3 origin, vec3 r, vec3 refractedLight) {
    vec2 tcube = intersectCube(origin, r, vec3(-1.0, -poolHeight, -1.0), vec3(1.0, 2.0, 1.0));
    origin += r * tcube.y;
    float tplane = (-origin.y - 1.0) / refractedLight.y;
    return origin + refractedLight * tplane;
  }

  void main() {
    vec4 info = texture2D(water, position.xy * 0.5 + 0.5);
    info.ba *= 0.5;
    vec3 normal = vec3(info.b, sqrt(1.0 - dot(info.ba, info.ba)), info.a);

    vec3 refractedLight = refract(-light, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);
    ray = refract(-light, normal, IOR_AIR / IOR_WATER);

    vec3 v = position.xzy;
    oldPos = project(v, refractedLight, refractedLight);
    newPos = project(v + vec3(0.0, info.r, 0.0), ray, refractedLight);

    gl_Position = vec4(0.75 * (newPos.xz + refractedLight.xz / refractedLight.y), 0.0, 1.0);
  }
`;

export const causticsFragmentShader = /* glsl */ `
  precision highp float;
  ${helpers}
  varying vec3 oldPos;
  varying vec3 newPos;
  varying vec3 ray;

  void main() {
    float oldArea = length(dFdx(oldPos)) * length(dFdy(oldPos));
    float newArea = length(dFdx(newPos)) * length(dFdy(newPos));
    gl_FragColor = vec4(oldArea / newArea * 0.2, 1.0, 0.0, 0.0);

    vec3 refractedLight = refract(-light, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);

    // Sphere blob shadow
    vec3 dir = (sphereCenter - newPos) / sphereRadius;
    vec3 area = cross(dir, refractedLight);
    float shadow = dot(area, area);
    float dist = dot(dir, -refractedLight);
    shadow = 1.0 + (shadow - 1.0) / (0.05 + dist * 0.025);
    shadow = clamp(1.0 / (1.0 + exp(-shadow)), 0.0, 1.0);
    shadow = mix(1.0, shadow, clamp(dist * 2.0, 0.0, 1.0));
    gl_FragColor.g = shadow;

    // Pool rim shadow
    vec2 t = intersectCube(newPos, -refractedLight, vec3(-1.0, -poolHeight, -1.0), vec3(1.0, 2.0, 1.0));
    gl_FragColor.r *= 1.0 / (1.0 + exp(-200.0 / (1.0 + 10.0 * (t.y - t.x)) * (newPos.y - refractedLight.y * t.y - 2.0 / 12.0)));
  }
`;

// ─── PROCEDURAL HDR SKY (for cubemap pre-bake) ───────────────────────────────

export const skyVertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;
