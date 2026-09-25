import type { LightingSettings } from '../LightingSettings.js';
import { integrateAtmosphereRadiance } from './AtmosphereMath.js';
import { sunDirectionFromAngles } from '../../reference/lightingMath.js';

export interface AtmosphereLutJobRequest {
  generation: number;
  width: number;
  height: number;
  viewSamples: number;
  sunSamples: number;
  scatteringOrders: number;
  settings: LightingSettings;
}

export interface AtmosphereLutJobResult {
  generation: number;
  width: number;
  height: number;
  scatteringOrders: number;
  data: ArrayBuffer;
  computeMs: number;
  firstOrderEnergy: number;
  finalEnergy: number;
}

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function indexOf(x: number, y: number, width: number): number {
  return (y * width + x) * 4;
}

/**
 * Computes the atmosphere radiance atlas without DOM or WebGL. Higher orders
 * are a bounded angular redistribution of first-order radiance. This is not a
 * full Bruneton spectral precomputation; the approximation is explicit in
 * telemetry and can be replaced without changing the worker protocol.
 */
export function computeAtmosphereLut(request: AtmosphereLutJobRequest): AtmosphereLutJobResult {
  const started = performance.now();
  const width = Math.max(8, Math.floor(request.width));
  const height = Math.max(4, Math.floor(request.height));
  const orders = Math.max(1, Math.min(8, Math.floor(request.scatteringOrders)));
  const data = new Float32Array(width * height * 4);
  const sunDirection = sunDirectionFromAngles(request.settings.sunElevationDeg, request.settings.sunAzimuthDeg);
  let firstOrderEnergy = 0;

  for (let y = 0; y < height; y++) {
    const latitude = ((y + 0.5) / height - 0.5) * Math.PI;
    const cosLatitude = Math.cos(latitude);
    const directionY = Math.sin(latitude);
    for (let x = 0; x < width; x++) {
      const longitude = ((x + 0.5) / width - 0.5) * Math.PI * 2;
      const direction = {
        x: Math.sin(longitude) * cosLatitude,
        y: directionY,
        z: Math.cos(longitude) * cosLatitude,
      };
      const radiance = integrateAtmosphereRadiance(direction, sunDirection, {
        ...request.settings,
        multipleScatteringFactor: 0,
      }, {
        viewSamples: Math.max(2, Math.floor(request.viewSamples)),
        sunSamples: Math.max(1, Math.floor(request.sunSamples)),
        cameraAltitudeM: request.settings.cameraAltitudeM,
      });
      const index = indexOf(x, y, width);
      data[index] = Math.max(0, finite(radiance.r));
      data[index + 1] = Math.max(0, finite(radiance.g));
      data[index + 2] = Math.max(0, finite(radiance.b));
      data[index + 3] = 1;
      firstOrderEnergy += data[index]! + data[index + 1]! + data[index + 2]!;
    }
  }

  const multipleStrength = Math.max(0, Math.min(1.5, request.settings.multipleScatteringFactor));
  let previous = data;
  for (let order = 2; order <= orders; order++) {
    const next = new Float32Array(previous.length);
    const orderGain = multipleStrength * 0.28 / Math.pow(order - 1, 1.35);
    for (let y = 0; y < height; y++) {
      const ym = Math.max(0, y - 1);
      const yp = Math.min(height - 1, y + 1);
      for (let x = 0; x < width; x++) {
        const xm = (x + width - 1) % width;
        const xp = (x + 1) % width;
        const center = indexOf(x, y, width);
        const neighbors = [
          indexOf(xm, y, width), indexOf(xp, y, width),
          indexOf(x, ym, width), indexOf(x, yp, width),
          indexOf(xm, ym, width), indexOf(xp, ym, width),
          indexOf(xm, yp, width), indexOf(xp, yp, width),
        ];
        for (let channel = 0; channel < 3; channel++) {
          let blurred = previous[center + channel]! * 2;
          for (const neighbor of neighbors) blurred += previous[neighbor + channel]!;
          blurred /= 10;
          next[center + channel] = data[center + channel]! + blurred * orderGain;
        }
        next[center + 3] = 1;
      }
    }
    previous = next;
  }

  let finalEnergy = 0;
  for (let i = 0; i < previous.length; i += 4) {
    finalEnergy += previous[i]! + previous[i + 1]! + previous[i + 2]!;
  }

  return {
    generation: request.generation,
    width,
    height,
    scatteringOrders: orders,
    data: previous.buffer,
    computeMs: performance.now() - started,
    firstOrderEnergy,
    finalEnergy,
  };
}
