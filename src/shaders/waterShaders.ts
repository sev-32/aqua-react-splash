/**
 * WebGL Water Shaders - React Three.js Port
 * Original: Evan Wallace (http://madebyevan.com/webgl-water/)
 * 
 * EXACT PORT of the original shaders
 */

// Vertex shader for simulation passes (drop, update, normal)
export const simulationVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Drop shader - adds ripples to the water surface
export const dropFragmentShader = `
  precision highp float;
  
  uniform sampler2D uTexture;
  uniform vec2 uCenter;
  uniform float uRadius;
  uniform float uStrength;
  varying vec2 vUv;
  
  const float PI = 3.141592653589793;
  
  void main() {
    vec4 info = texture2D(uTexture, vUv);
    
    // Calculate distance from drop center
    float drop = max(0.0, 1.0 - length(uCenter - vUv) / uRadius);
    drop = 0.5 - cos(drop * PI) * 0.5;
    info.r += drop * uStrength;
    
    gl_FragColor = info;
  }
`;

// Update shader - wave propagation simulation
export const updateFragmentShader = `
  precision highp float;
  
  uniform sampler2D uTexture;
  uniform vec2 uDelta;
  varying vec2 vUv;
  
  void main() {
    vec4 info = texture2D(uTexture, vUv);
    
    // Calculate average neighbor height
    vec2 dx = vec2(uDelta.x, 0.0);
    vec2 dy = vec2(0.0, uDelta.y);
    
    float average = (
      texture2D(uTexture, vUv - dx).r +
      texture2D(uTexture, vUv - dy).r +
      texture2D(uTexture, vUv + dx).r +
      texture2D(uTexture, vUv + dy).r
    ) * 0.25;
    
    // Change velocity to move toward average
    info.g += (average - info.r) * 2.0;
    
    // Attenuate velocity so waves don't last forever
    info.g *= 0.995;
    
    // Move vertex along velocity
    info.r += info.g;
    
    gl_FragColor = info;
  }
`;

// Normal shader - calculates surface normals
export const normalFragmentShader = `
  precision highp float;
  
  uniform sampler2D uTexture;
  uniform vec2 uDelta;
  varying vec2 vUv;
  
  void main() {
    vec4 info = texture2D(uTexture, vUv);
    
    // Calculate normal from height differences
    vec3 dx = vec3(uDelta.x, texture2D(uTexture, vec2(vUv.x + uDelta.x, vUv.y)).r - info.r, 0.0);
    vec3 dy = vec3(0.0, texture2D(uTexture, vec2(vUv.x, vUv.y + uDelta.y)).r - info.r, uDelta.y);
    
    info.ba = normalize(cross(dy, dx)).xz;
    
    gl_FragColor = info;
  }
`;

// Sphere displacement shader (simulation)
export const sphereDisplacementFragmentShader = `
  precision highp float;
  
  uniform sampler2D uTexture;
  uniform vec3 uOldCenter;
  uniform vec3 uNewCenter;
  uniform float uRadius;
  varying vec2 vUv;
  
  float volumeInSphere(vec3 center) {
    vec3 toCenter = vec3(vUv.x * 2.0 - 1.0, 0.0, vUv.y * 2.0 - 1.0) - center;
    float t = length(toCenter) / uRadius;
    float dy = exp(-pow(t * 1.5, 6.0));
    float ymin = min(0.0, center.y - dy);
    float ymax = min(max(0.0, center.y + dy), ymin + 2.0 * dy);
    return (ymax - ymin) * 0.1;
  }
  
  void main() {
    vec4 info = texture2D(uTexture, vUv);
    
    // Add old volume, subtract new volume
    info.r += volumeInSphere(uOldCenter);
    info.r -= volumeInSphere(uNewCenter);
    
    gl_FragColor = info;
  }
`;

// Helper functions for rendering shaders - EXACT from original
export const helperFunctions = `
  const float IOR_AIR = 1.0;
  const float IOR_WATER = 1.333;
  const vec3 abovewaterColor = vec3(0.25, 1.0, 1.25);
  const vec3 underwaterColor = vec3(0.4, 0.9, 1.0);
  const float poolHeight = 1.0;
  
  vec2 intersectCube(vec3 origin, vec3 ray, vec3 cubeMin, vec3 cubeMax) {
    vec3 tMin = (cubeMin - origin) / ray;
    vec3 tMax = (cubeMax - origin) / ray;
    vec3 t1 = min(tMin, tMax);
    vec3 t2 = max(tMin, tMax);
    float tNear = max(max(t1.x, t1.y), t1.z);
    float tFar = min(min(t2.x, t2.y), t2.z);
    return vec2(tNear, tFar);
  }
  
  float intersectSphere(vec3 origin, vec3 ray, vec3 sphereCenter, float sphereRadius) {
    vec3 toSphere = origin - sphereCenter;
    float a = dot(ray, ray);
    float b = 2.0 * dot(toSphere, ray);
    float c = dot(toSphere, toSphere) - sphereRadius * sphereRadius;
    float discriminant = b*b - 4.0*a*c;
    if (discriminant > 0.0) {
      float t = (-b - sqrt(discriminant)) / (2.0 * a);
      if (t > 0.0) return t;
    }
    return 1.0e6;
  }
`;

// Water surface vertex shader - EXACT from original with gl_Vertex.xzy swizzle
export const waterVertexShader = `
  uniform sampler2D uWater;
  varying vec3 vPosition;
  
  void main() {
    vec4 info = texture2D(uWater, uv);
    // CRITICAL: Original uses gl_Vertex.xzy - swaps Y and Z!
    vPosition = vec3(position.x, position.z, position.y);
    vPosition.y += info.r;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);
  }
`;

// Water surface fragment shader for ABOVE water view
export const waterAboveFragmentShader = `
  precision highp float;
  
  ${helperFunctions}
  
  uniform sampler2D uWater;
  uniform sampler2D uTiles;
  uniform sampler2D uCaustics;
  uniform samplerCube uSky;
  uniform vec3 uEye;
  uniform vec3 uLight;
  uniform vec3 uSphereCenter;
  uniform float uSphereRadius;
  
  varying vec3 vPosition;
  
  vec3 getSphereColor(vec3 point) {
    vec3 color = vec3(0.5);
    
    color *= 1.0 - 0.9 / pow((1.0 + uSphereRadius - abs(point.x)) / uSphereRadius, 3.0);
    color *= 1.0 - 0.9 / pow((1.0 + uSphereRadius - abs(point.z)) / uSphereRadius, 3.0);
    color *= 1.0 - 0.9 / pow((point.y + 1.0 + uSphereRadius) / uSphereRadius, 3.0);
    
    vec3 sphereNormal = (point - uSphereCenter) / uSphereRadius;
    vec3 refractedLight = refract(-uLight, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);
    float diffuse = max(0.0, dot(-refractedLight, sphereNormal)) * 0.5;
    
    vec4 info = texture2D(uWater, point.xz * 0.5 + 0.5);
    if (point.y < info.r) {
      vec4 caustic = texture2D(uCaustics, 0.75 * (point.xz - point.y * refractedLight.xz / refractedLight.y) * 0.5 + 0.5);
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
      wallColor = texture2D(uTiles, point.yz * 0.5 + vec2(1.0, 0.5)).rgb;
      normal = vec3(-point.x, 0.0, 0.0);
    } else if (abs(point.z) > 0.999) {
      wallColor = texture2D(uTiles, point.yx * 0.5 + vec2(1.0, 0.5)).rgb;
      normal = vec3(0.0, 0.0, -point.z);
    } else {
      wallColor = texture2D(uTiles, point.xz * 0.5 + 0.5).rgb;
      normal = vec3(0.0, 1.0, 0.0);
    }
    
    scale /= length(point);
    scale *= 1.0 - 0.9 / pow(length(point - uSphereCenter) / uSphereRadius, 4.0);
    
    vec3 refractedLight = -refract(-uLight, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);
    float diffuse = max(0.0, dot(refractedLight, normal));
    vec4 info = texture2D(uWater, point.xz * 0.5 + 0.5);
    
    if (point.y < info.r) {
      vec4 caustic = texture2D(uCaustics, 0.75 * (point.xz - point.y * refractedLight.xz / refractedLight.y) * 0.5 + 0.5);
      scale += diffuse * caustic.r * 2.0 * caustic.g;
    } else {
      vec2 t = intersectCube(point, refractedLight, vec3(-1.0, -poolHeight, -1.0), vec3(1.0, 2.0, 1.0));
      diffuse *= 1.0 / (1.0 + exp(-200.0 / (1.0 + 10.0 * (t.y - t.x)) * (point.y + refractedLight.y * t.y - 2.0 / 12.0)));
      scale += diffuse * 0.5;
    }
    
    return wallColor * scale;
  }
  
  vec3 getSurfaceRayColor(vec3 origin, vec3 ray, vec3 waterColor) {
    vec3 color;
    float q = intersectSphere(origin, ray, uSphereCenter, uSphereRadius);
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
        color = textureCube(uSky, ray).rgb;
        color += vec3(pow(max(0.0, dot(uLight, ray)), 5000.0)) * vec3(10.0, 8.0, 6.0);
      }
    }
    if (ray.y < 0.0) color *= waterColor;
    return color;
  }
  
  void main() {
    vec2 coord = vPosition.xz * 0.5 + 0.5;
    vec4 info = texture2D(uWater, coord);
    
    // Make water look more "peaked"
    for (int i = 0; i < 5; i++) {
      coord += info.ba * 0.005;
      info = texture2D(uWater, coord);
    }
    
    vec3 normal = vec3(info.b, sqrt(1.0 - dot(info.ba, info.ba)), info.a);
    vec3 incomingRay = normalize(vPosition - uEye);
    
    // ABOVE WATER VIEW
    vec3 reflectedRay = reflect(incomingRay, normal);
    vec3 refractedRay = refract(incomingRay, normal, IOR_AIR / IOR_WATER);
    float fresnel = mix(0.25, 1.0, pow(1.0 - dot(normal, -incomingRay), 3.0));
    
    vec3 reflectedColor = getSurfaceRayColor(vPosition, reflectedRay, abovewaterColor);
    vec3 refractedColor = getSurfaceRayColor(vPosition, refractedRay, abovewaterColor);
    
    gl_FragColor = vec4(mix(refractedColor, reflectedColor, fresnel), 1.0);
  }
`;

// Water surface fragment shader for UNDERWATER view
export const waterBelowFragmentShader = `
  precision highp float;
  
  ${helperFunctions}
  
  uniform sampler2D uWater;
  uniform sampler2D uTiles;
  uniform sampler2D uCaustics;
  uniform samplerCube uSky;
  uniform vec3 uEye;
  uniform vec3 uLight;
  uniform vec3 uSphereCenter;
  uniform float uSphereRadius;
  
  varying vec3 vPosition;
  
  vec3 getSphereColor(vec3 point) {
    vec3 color = vec3(0.5);
    color *= 1.0 - 0.9 / pow((1.0 + uSphereRadius - abs(point.x)) / uSphereRadius, 3.0);
    color *= 1.0 - 0.9 / pow((1.0 + uSphereRadius - abs(point.z)) / uSphereRadius, 3.0);
    color *= 1.0 - 0.9 / pow((point.y + 1.0 + uSphereRadius) / uSphereRadius, 3.0);
    
    vec3 sphereNormal = (point - uSphereCenter) / uSphereRadius;
    vec3 refractedLight = refract(-uLight, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);
    float diffuse = max(0.0, dot(-refractedLight, sphereNormal)) * 0.5;
    
    vec4 info = texture2D(uWater, point.xz * 0.5 + 0.5);
    if (point.y < info.r) {
      vec4 caustic = texture2D(uCaustics, 0.75 * (point.xz - point.y * refractedLight.xz / refractedLight.y) * 0.5 + 0.5);
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
      wallColor = texture2D(uTiles, point.yz * 0.5 + vec2(1.0, 0.5)).rgb;
      normal = vec3(-point.x, 0.0, 0.0);
    } else if (abs(point.z) > 0.999) {
      wallColor = texture2D(uTiles, point.yx * 0.5 + vec2(1.0, 0.5)).rgb;
      normal = vec3(0.0, 0.0, -point.z);
    } else {
      wallColor = texture2D(uTiles, point.xz * 0.5 + 0.5).rgb;
      normal = vec3(0.0, 1.0, 0.0);
    }
    
    scale /= length(point);
    scale *= 1.0 - 0.9 / pow(length(point - uSphereCenter) / uSphereRadius, 4.0);
    
    vec3 refractedLight = -refract(-uLight, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);
    float diffuse = max(0.0, dot(refractedLight, normal));
    vec4 info = texture2D(uWater, point.xz * 0.5 + 0.5);
    
    if (point.y < info.r) {
      vec4 caustic = texture2D(uCaustics, 0.75 * (point.xz - point.y * refractedLight.xz / refractedLight.y) * 0.5 + 0.5);
      scale += diffuse * caustic.r * 2.0 * caustic.g;
    } else {
      vec2 t = intersectCube(point, refractedLight, vec3(-1.0, -poolHeight, -1.0), vec3(1.0, 2.0, 1.0));
      diffuse *= 1.0 / (1.0 + exp(-200.0 / (1.0 + 10.0 * (t.y - t.x)) * (point.y + refractedLight.y * t.y - 2.0 / 12.0)));
      scale += diffuse * 0.5;
    }
    
    return wallColor * scale;
  }
  
  vec3 getSurfaceRayColor(vec3 origin, vec3 ray, vec3 waterColor) {
    vec3 color;
    float q = intersectSphere(origin, ray, uSphereCenter, uSphereRadius);
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
        color = textureCube(uSky, ray).rgb;
        color += vec3(pow(max(0.0, dot(uLight, ray)), 5000.0)) * vec3(10.0, 8.0, 6.0);
      }
    }
    if (ray.y < 0.0) color *= waterColor;
    return color;
  }
  
  void main() {
    vec2 coord = vPosition.xz * 0.5 + 0.5;
    vec4 info = texture2D(uWater, coord);
    
    for (int i = 0; i < 5; i++) {
      coord += info.ba * 0.005;
      info = texture2D(uWater, coord);
    }
    
    vec3 normal = vec3(info.b, sqrt(1.0 - dot(info.ba, info.ba)), info.a);
    vec3 incomingRay = normalize(vPosition - uEye);
    
    // UNDERWATER VIEW - flip normal
    normal = -normal;
    vec3 reflectedRay = reflect(incomingRay, normal);
    vec3 refractedRay = refract(incomingRay, normal, IOR_WATER / IOR_AIR);
    float fresnel = mix(0.5, 1.0, pow(1.0 - dot(normal, -incomingRay), 3.0));
    
    vec3 reflectedColor = getSurfaceRayColor(vPosition, reflectedRay, underwaterColor);
    vec3 refractedColor = getSurfaceRayColor(vPosition, refractedRay, vec3(1.0)) * vec3(0.8, 1.0, 1.1);
    
    gl_FragColor = vec4(mix(reflectedColor, refractedColor, (1.0 - fresnel) * length(refractedRay)), 1.0);
  }
`;

// Caustics vertex shader - EXACT from original
export const causticsVertexShader = `
  ${helperFunctions}
  
  uniform sampler2D uWater;
  uniform vec3 uLight;
  
  varying vec3 vOldPos;
  varying vec3 vNewPos;
  varying vec3 vRay;
  
  vec3 project(vec3 origin, vec3 ray, vec3 refractedLight) {
    vec2 tcube = intersectCube(origin, ray, vec3(-1.0, -poolHeight, -1.0), vec3(1.0, 2.0, 1.0));
    origin += ray * tcube.y;
    float tplane = (-origin.y - 1.0) / refractedLight.y;
    return origin + refractedLight * tplane;
  }
  
  void main() {
    vec4 info = texture2D(uWater, uv);
    info.ba *= 0.5;
    vec3 normal = vec3(info.b, sqrt(1.0 - dot(info.ba, info.ba)), info.a);
    
    vec3 refractedLight = refract(-uLight, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);
    vRay = refract(-uLight, normal, IOR_AIR / IOR_WATER);
    
    // Original uses gl_Vertex.xzy
    vec3 pos = vec3(position.x, position.z, position.y);
    vOldPos = project(pos, refractedLight, refractedLight);
    vNewPos = project(pos + vec3(0.0, info.r, 0.0), vRay, refractedLight);
    
    gl_Position = vec4(0.75 * (vNewPos.xz + refractedLight.xz / refractedLight.y), 0.0, 1.0);
  }
`;

// Caustics fragment shader
export const causticsFragmentShader = `
  precision highp float;
  
  ${helperFunctions}
  
  uniform vec3 uLight;
  uniform vec3 uSphereCenter;
  uniform float uSphereRadius;
  
  varying vec3 vOldPos;
  varying vec3 vNewPos;
  varying vec3 vRay;
  
  void main() {
    float oldArea = length(dFdx(vOldPos)) * length(dFdy(vOldPos));
    float newArea = length(dFdx(vNewPos)) * length(dFdy(vNewPos));
    gl_FragColor = vec4(oldArea / newArea * 0.2, 1.0, 0.0, 0.0);
    
    vec3 refractedLight = refract(-uLight, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);
    
    // Sphere shadow
    vec3 dir = (uSphereCenter - vNewPos) / uSphereRadius;
    vec3 area = cross(dir, refractedLight);
    float shadow = dot(area, area);
    float dist = dot(dir, -refractedLight);
    shadow = 1.0 + (shadow - 1.0) / (0.05 + dist * 0.025);
    shadow = clamp(1.0 / (1.0 + exp(-shadow)), 0.0, 1.0);
    shadow = mix(1.0, shadow, clamp(dist * 2.0, 0.0, 1.0));
    gl_FragColor.g = shadow;
    
    // Pool rim shadow
    vec2 t = intersectCube(vNewPos, -refractedLight, vec3(-1.0, -poolHeight, -1.0), vec3(1.0, 2.0, 1.0));
    gl_FragColor.r *= 1.0 / (1.0 + exp(-200.0 / (1.0 + 10.0 * (t.y - t.x)) * (vNewPos.y - refractedLight.y * t.y - 2.0 / 12.0)));
  }
`;

// Pool cube vertex shader - EXACT Y transform from original
export const cubeVertexShader = `
  uniform float uPoolHeight;
  varying vec3 vPosition;
  
  void main() {
    vPosition = position;
    // CRITICAL: Original transform - position.y = ((1.0 - position.y) * (7.0 / 12.0) - 1.0) * poolHeight
    vPosition.y = ((1.0 - position.y) * (7.0 / 12.0) - 1.0) * uPoolHeight;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);
  }
`;

// Pool cube fragment shader
export const cubeFragmentShader = `
  precision highp float;
  
  ${helperFunctions}
  
  uniform sampler2D uWater;
  uniform sampler2D uTiles;
  uniform sampler2D uCaustics;
  uniform vec3 uLight;
  uniform vec3 uSphereCenter;
  uniform float uSphereRadius;
  
  varying vec3 vPosition;
  
  vec3 getWallColor(vec3 point) {
    float scale = 0.5;
    
    vec3 wallColor;
    vec3 normal;
    if (abs(point.x) > 0.999) {
      wallColor = texture2D(uTiles, point.yz * 0.5 + vec2(1.0, 0.5)).rgb;
      normal = vec3(-point.x, 0.0, 0.0);
    } else if (abs(point.z) > 0.999) {
      wallColor = texture2D(uTiles, point.yx * 0.5 + vec2(1.0, 0.5)).rgb;
      normal = vec3(0.0, 0.0, -point.z);
    } else {
      wallColor = texture2D(uTiles, point.xz * 0.5 + 0.5).rgb;
      normal = vec3(0.0, 1.0, 0.0);
    }
    
    scale /= length(point);
    scale *= 1.0 - 0.9 / pow(length(point - uSphereCenter) / uSphereRadius, 4.0);
    
    vec3 refractedLight = -refract(-uLight, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);
    float diffuse = max(0.0, dot(refractedLight, normal));
    vec4 info = texture2D(uWater, point.xz * 0.5 + 0.5);
    
    if (point.y < info.r) {
      vec4 caustic = texture2D(uCaustics, 0.75 * (point.xz - point.y * refractedLight.xz / refractedLight.y) * 0.5 + 0.5);
      scale += diffuse * caustic.r * 2.0 * caustic.g;
    } else {
      vec2 t = intersectCube(point, refractedLight, vec3(-1.0, -poolHeight, -1.0), vec3(1.0, 2.0, 1.0));
      diffuse *= 1.0 / (1.0 + exp(-200.0 / (1.0 + 10.0 * (t.y - t.x)) * (point.y + refractedLight.y * t.y - 2.0 / 12.0)));
      scale += diffuse * 0.5;
    }
    
    return wallColor * scale;
  }
  
  void main() {
    gl_FragColor = vec4(getWallColor(vPosition), 1.0);
    
    vec4 info = texture2D(uWater, vPosition.xz * 0.5 + 0.5);
    if (vPosition.y < info.r) {
      gl_FragColor.rgb *= underwaterColor * 1.2;
    }
  }
`;

// Sphere vertex shader - EXACT from original
export const sphereVertexShader = `
  ${helperFunctions}
  
  uniform vec3 uSphereCenter;
  uniform float uSphereRadius;
  
  varying vec3 vPosition;
  
  void main() {
    // Original: position = sphereCenter + gl_Vertex.xyz * sphereRadius
    vPosition = uSphereCenter + position * uSphereRadius;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);
  }
`;

// Sphere fragment shader
export const sphereRenderFragmentShader = `
  precision highp float;
  
  ${helperFunctions}
  
  uniform sampler2D uWater;
  uniform sampler2D uCaustics;
  uniform vec3 uLight;
  uniform vec3 uSphereCenter;
  uniform float uSphereRadius;
  
  varying vec3 vPosition;
  
  vec3 getSphereColor(vec3 point) {
    vec3 color = vec3(0.5);
    
    color *= 1.0 - 0.9 / pow((1.0 + uSphereRadius - abs(point.x)) / uSphereRadius, 3.0);
    color *= 1.0 - 0.9 / pow((1.0 + uSphereRadius - abs(point.z)) / uSphereRadius, 3.0);
    color *= 1.0 - 0.9 / pow((point.y + 1.0 + uSphereRadius) / uSphereRadius, 3.0);
    
    vec3 sphereNormal = (point - uSphereCenter) / uSphereRadius;
    vec3 refractedLight = refract(-uLight, vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);
    float diffuse = max(0.0, dot(-refractedLight, sphereNormal)) * 0.5;
    
    vec4 info = texture2D(uWater, point.xz * 0.5 + 0.5);
    if (point.y < info.r) {
      vec4 caustic = texture2D(uCaustics, 0.75 * (point.xz - point.y * refractedLight.xz / refractedLight.y) * 0.5 + 0.5);
      diffuse *= caustic.r * 4.0;
    }
    color += diffuse;
    
    return color;
  }
  
  void main() {
    gl_FragColor = vec4(getSphereColor(vPosition), 1.0);
    
    vec4 info = texture2D(uWater, vPosition.xz * 0.5 + 0.5);
    if (vPosition.y < info.r) {
      gl_FragColor.rgb *= underwaterColor * 1.2;
    }
  }
`;
