import * as THREE from 'three';

/**
 * Generates a procedural HDR-style sky cubemap using a fragment shader.
 * Returns a CubeTexture containing 6 RGBA8 faces rendered with a smooth
 * horizon → zenith gradient and a soft sun disk in the +X +Y direction.
 */
export function generateProceduralSky(
  renderer: THREE.WebGLRenderer,
  size = 512,
): THREE.CubeTexture {
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(size, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    generateMipmaps: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });

  // We'll render a fullscreen quad per face using a perspective camera
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      sunDir: { value: new THREE.Vector3(2, 2, -1).normalize() },
      horizonColor: { value: new THREE.Color('#9fc8d8') },
      zenithColor: { value: new THREE.Color('#1c3a55') },
      groundColor: { value: new THREE.Color('#0a141c') },
      sunColor: { value: new THREE.Color('#fff5c8') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec3 vDir;
      uniform vec3 sunDir;
      uniform vec3 horizonColor;
      uniform vec3 zenithColor;
      uniform vec3 groundColor;
      uniform vec3 sunColor;

      void main() {
        vec3 d = normalize(vDir);
        float y = d.y;

        // Sky gradient
        float t = smoothstep(-0.05, 0.7, y);
        vec3 sky = mix(horizonColor, zenithColor, t);

        // Below horizon: blend to a deep ground tone
        float g = smoothstep(0.05, -0.4, y);
        sky = mix(sky, groundColor, g);

        // Soft atmospheric haze near horizon
        float haze = exp(-pow(abs(y) * 4.0, 2.0)) * 0.25;
        sky += vec3(haze * 0.9, haze * 0.7, haze * 0.5);

        // Sun disk + bloom
        float sunDot = max(0.0, dot(d, normalize(sunDir)));
        float sunDisk = smoothstep(0.998, 1.0, sunDot);
        float sunGlow = pow(sunDot, 256.0) * 0.6;
        float sunHalo = pow(sunDot, 16.0) * 0.15;
        sky += sunColor * (sunDisk * 8.0 + sunGlow + sunHalo);

        // Subtle vertical banding to suggest cloud layer
        float clouds = smoothstep(0.0, 1.0, sin(d.x * 3.0 + d.z * 2.0) * 0.5 + 0.5);
        clouds *= smoothstep(0.0, 0.4, y) * smoothstep(0.9, 0.3, y);
        sky += vec3(clouds * 0.04);

        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });

  const cubeCamera = new THREE.CubeCamera(0.1, 10, cubeRenderTarget);
  // Build a large inward-facing sphere of the sky and render the cube camera in it.
  const scene = new THREE.Scene();
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 32), skyMaterial);
  scene.add(sphere);
  cubeCamera.update(renderer, scene);

  const tex = cubeRenderTarget.texture;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  // Cleanup intermediates
  sphere.geometry.dispose();
  skyMaterial.dispose();

  return tex as THREE.CubeTexture;
}

/**
 * Generates a procedural pool-tile texture (light blue ceramic with grout)
 * with subtle grain. Returns a CanvasTexture set up for repeat wrapping.
 */
export function generateTilesTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base grout
  ctx.fillStyle = '#0a1a22';
  ctx.fillRect(0, 0, size, size);

  // Tiles
  const tilesPerSide = 8;
  const tileSize = size / tilesPerSide;
  const gap = 4;

  for (let y = 0; y < tilesPerSide; y++) {
    for (let x = 0; x < tilesPerSide; x++) {
      const px = x * tileSize + gap / 2;
      const py = y * tileSize + gap / 2;
      const w = tileSize - gap;
      const h = tileSize - gap;

      // Per-tile color variation
      const hue = 195 + (Math.random() - 0.5) * 14;
      const sat = 35 + Math.random() * 20;
      const lum = 38 + Math.random() * 16;
      ctx.fillStyle = `hsl(${hue}, ${sat}%, ${lum}%)`;
      ctx.fillRect(px, py, w, h);

      // Subtle gradient highlight
      const grad = ctx.createLinearGradient(px, py, px + w, py + h);
      grad.addColorStop(0, 'rgba(255,255,255,0.08)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.12)');
      ctx.fillStyle = grad;
      ctx.fillRect(px, py, w, h);

      // Speckle noise
      const speckles = 30;
      for (let i = 0; i < speckles; i++) {
        const sx = px + Math.random() * w;
        const sy = py + Math.random() * h;
        const a = Math.random() * 0.06;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(sx, sy, 1, 1);
      }
    }
  }

  // Overall grain
  const imageData = ctx.getImageData(0, 0, size, size);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 8;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(imageData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  return tex;
}
