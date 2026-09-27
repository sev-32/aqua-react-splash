'use strict';

// dist/src/reference/lightingMath.js
function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
}
function sunDirectionFromAngles(elevationDeg, azimuthDeg) {
    const elevation = elevationDeg * Math.PI / 180;
    const azimuth = azimuthDeg * Math.PI / 180;
    const horizontal = Math.cos(elevation);
    return {
        x: horizontal * Math.sin(azimuth),
        y: Math.sin(elevation),
        z: horizontal * Math.cos(azimuth),
    };
}
function airMass(elevationDeg) {
    const elevation = clamp(elevationDeg, -5, 90);
    if (elevation <= -5)
        return 40;
    const zenith = 90 - elevation;
    return 1 / (Math.cos(zenith * Math.PI / 180) + 0.50572 * Math.pow(96.07995 - zenith, -1.6364));
}
function approximateSunRgb(elevationDeg, turbidity) {
    const mass = airMass(elevationDeg);
    const haze = clamp(turbidity, 1, 12);
    const extinction = 0.008735 * Math.pow(0.55, -4.08) * mass * (0.45 + haze * 0.055);
    const warm = clamp((12 - elevationDeg) / 22, 0, 1);
    const intensity = Math.exp(-extinction * 0.035);
    return {
        r: intensity * (1.0 - 0.06 * warm),
        g: intensity * (1.0 - 0.26 * warm),
        b: intensity * (1.0 - 0.58 * warm),
    };
}
function thinSheetTransmission(incident, baseColor, transmittance, absorption, shadowVisibility, cosIncidence) {
    const pathScale = 1 / Math.max(0.18, Math.abs(cosIncidence));
    const attenuation = Math.exp(-Math.max(0, absorption) * pathScale);
    const scalar = clamp(transmittance, 0, 1) * clamp(shadowVisibility, 0, 1) * attenuation;
    return {
        r: incident.r * baseColor.r * scalar,
        g: incident.g * baseColor.g * scalar,
        b: incident.b * baseColor.b * scalar,
    };
}
function exposureMultiplier(ev100) {
    return 1 / Math.pow(2, ev100);
}
function luminance(rgb) {
    return rgb.r * 0.2126 + rgb.g * 0.7152 + rgb.b * 0.0722;
}


// dist/src/lighting/atmosphere/AtmosphereMath.js

const EARTH_RADIUS_M = 6_371_000;
const ATMOSPHERE_RADIUS_M = 6_471_000;
const RAYLEIGH_SCALE_HEIGHT_M = 8_500;
const MIE_SCALE_HEIGHT_M = 1_200;
const RAYLEIGH_SCATTERING_M_INV = [5.802e-6, 13.558e-6, 33.1e-6];
const MIE_EXTINCTION_M_INV = 21e-6;
const MIE_SINGLE_SCATTERING_ALBEDO = 0.9;
const OZONE_PEAK_ALTITUDE_M = 25_000;
const OZONE_HALF_WIDTH_M = 15_000;
const OZONE_ABSORPTION_M_INV = [0.650e-6, 1.881e-6, 0.085e-6];
function add(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function scale(a, s) { return { x: a.x * s, y: a.y * s, z: a.z * s }; }
function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function length(a) { return Math.sqrt(dot(a, a)); }
function normalize(a) { const l = Math.max(1e-12, length(a)); return scale(a, 1 / l); }
function raySphere(origin, direction, radius) {
    const b = dot(origin, direction);
    const c = dot(origin, origin) - radius * radius;
    const discriminant = b * b - c;
    if (discriminant < 0)
        return null;
    const root = Math.sqrt(discriminant);
    return [-b - root, -b + root];
}
function densities(altitudeM, settings) {
    const h = Math.max(0, altitudeM);
    const rayleigh = Math.exp(-h / RAYLEIGH_SCALE_HEIGHT_M) * Math.max(0, settings.rayleighDensity);
    const hazeScale = Math.max(0, settings.aerosolDensity) * Math.max(0.2, settings.turbidity / 2.8);
    const mie = Math.exp(-h / MIE_SCALE_HEIGHT_M) * hazeScale;
    const ozoneProfile = Math.max(0, 1 - Math.abs(h - OZONE_PEAK_ALTITUDE_M) / OZONE_HALF_WIDTH_M);
    const ozone = ozoneProfile * Math.max(0, settings.ozoneDensity);
    return { rayleigh, mie, ozone };
}
function opticalDepthToAtmosphere(point, direction, settings, samples) {
    const atmosphereHit = raySphere(point, direction, ATMOSPHERE_RADIUS_M);
    if (!atmosphereHit)
        return { rayleigh: 0, mie: 0, ozone: 0, blocked: true };
    const groundHit = raySphere(point, direction, EARTH_RADIUS_M);
    if (groundHit && groundHit[0] > 1e-4 && groundHit[0] < atmosphereHit[1]) {
        return { rayleigh: 1e12, mie: 1e12, ozone: 1e12, blocked: true };
    }
    const segment = Math.max(0, atmosphereHit[1]) / Math.max(1, samples);
    let rayleigh = 0;
    let mie = 0;
    let ozone = 0;
    for (let i = 0; i < Math.max(1, samples); i++) {
        const distanceM = (i + 0.5) * segment;
        const samplePoint = add(point, scale(direction, distanceM));
        const altitudeM = length(samplePoint) - EARTH_RADIUS_M;
        const density = densities(altitudeM, settings);
        rayleigh += density.rayleigh * segment;
        mie += density.mie * segment;
        ozone += density.ozone * segment;
    }
    return { rayleigh, mie, ozone, blocked: false };
}
function atmosphereTransmittanceFromOpticalDepth(rayleighOpticalDepthM, mieOpticalDepthM, ozoneOpticalDepthM = 0) {
    const mieExtinction = MIE_EXTINCTION_M_INV * mieOpticalDepthM;
    return {
        r: Math.exp(-(RAYLEIGH_SCATTERING_M_INV[0] * rayleighOpticalDepthM + mieExtinction + OZONE_ABSORPTION_M_INV[0] * ozoneOpticalDepthM)),
        g: Math.exp(-(RAYLEIGH_SCATTERING_M_INV[1] * rayleighOpticalDepthM + mieExtinction + OZONE_ABSORPTION_M_INV[1] * ozoneOpticalDepthM)),
        b: Math.exp(-(RAYLEIGH_SCATTERING_M_INV[2] * rayleighOpticalDepthM + mieExtinction + OZONE_ABSORPTION_M_INV[2] * ozoneOpticalDepthM)),
    };
}
function atmosphericSunTransmittance(sunDirection, settings, sunSamples = 16, cameraAltitudeM = settings.cameraAltitudeM) {
    if (sunDirection.y <= -0.035)
        return { r: 0, g: 0, b: 0 };
    const origin = { x: 0, y: EARTH_RADIUS_M + Math.max(2, cameraAltitudeM), z: 0 };
    const direction = normalize(sunDirection);
    const depth = opticalDepthToAtmosphere(origin, direction, settings, Math.max(2, sunSamples));
    if (depth.blocked)
        return { r: 0, g: 0, b: 0 };
    return atmosphereTransmittanceFromOpticalDepth(depth.rayleigh, depth.mie, depth.ozone);
}
function rayleighPhase(cosTheta) {
    return 3 / (16 * Math.PI) * (1 + cosTheta * cosTheta);
}
function miePhase(cosTheta, g) {
    const gg = clamp(g, 0, 0.96);
    const denominator = Math.pow(Math.max(1e-4, 1 + gg * gg - 2 * gg * cosTheta), 1.5);
    return 3 / (8 * Math.PI) * ((1 - gg * gg) * (1 + cosTheta * cosTheta)) / ((2 + gg * gg) * denominator);
}
function integrateAtmosphereRadiance(viewDirection, sunDirection, settings, options) {
    if (!settings.atmosphereEnabled)
        return { r: 0.32, g: 0.43, b: 0.62 };
    const view = normalize(viewDirection);
    const sun = normalize(sunDirection);
    const cameraAltitudeM = Math.max(2, options.cameraAltitudeM ?? settings.cameraAltitudeM);
    const origin = { x: 0, y: EARTH_RADIUS_M + cameraAltitudeM, z: 0 };
    const atmosphereHit = raySphere(origin, view, ATMOSPHERE_RADIUS_M);
    if (!atmosphereHit)
        return { r: 0, g: 0, b: 0 };
    let start = Math.max(0, atmosphereHit[0]);
    let end = atmosphereHit[1];
    const groundHit = raySphere(origin, view, EARTH_RADIUS_M);
    if (groundHit && groundHit[0] > 0 && groundHit[0] < end)
        end = groundHit[0];
    if (end <= start)
        return { r: 0, g: 0, b: 0 };
    const viewSamples = Math.max(2, Math.floor(options.viewSamples));
    const sunSamples = Math.max(2, Math.floor(options.sunSamples));
    const stepM = (end - start) / viewSamples;
    let viewRayleigh = 0;
    let viewMie = 0;
    let viewOzone = 0;
    let scatterR = 0;
    let scatterG = 0;
    let scatterB = 0;
    const mu = clamp(dot(view, sun), -1, 1);
    const phaseR = rayleighPhase(mu);
    const phaseM = miePhase(mu, settings.mieAnisotropy);
    for (let i = 0; i < viewSamples; i++) {
        const distanceM = start + (i + 0.5) * stepM;
        const point = add(origin, scale(view, distanceM));
        const altitudeM = length(point) - EARTH_RADIUS_M;
        const density = densities(altitudeM, settings);
        const sampleRayleigh = density.rayleigh * stepM;
        const sampleMie = density.mie * stepM;
        viewRayleigh += sampleRayleigh;
        viewMie += sampleMie;
        viewOzone += density.ozone * stepM;
        const sunDepth = opticalDepthToAtmosphere(point, sun, settings, sunSamples);
        if (sunDepth.blocked)
            continue;
        const transmittance = atmosphereTransmittanceFromOpticalDepth(viewRayleigh + sunDepth.rayleigh, viewMie + sunDepth.mie, viewOzone + sunDepth.ozone);
        const mieScatter = MIE_EXTINCTION_M_INV * MIE_SINGLE_SCATTERING_ALBEDO * sampleMie * phaseM;
        scatterR += transmittance.r * (RAYLEIGH_SCATTERING_M_INV[0] * sampleRayleigh * phaseR + mieScatter);
        scatterG += transmittance.g * (RAYLEIGH_SCATTERING_M_INV[1] * sampleRayleigh * phaseR + mieScatter);
        scatterB += transmittance.b * (RAYLEIGH_SCATTERING_M_INV[2] * sampleRayleigh * phaseR + mieScatter);
    }
    const physicalScale = Math.max(0, settings.skyIntensity) * Math.max(0, settings.sunIlluminanceLux) / 100_000;
    let result = {
        r: scatterR * physicalScale * 18,
        g: scatterG * physicalScale * 18,
        b: scatterB * physicalScale * 18,
    };
    // Energy-conserving dual-scattering approximation. This is deliberately
    // separated from the direct single-scattering integral: it restores a
    // low-frequency isotropic component from light that scattered at least once
    // before reaching the current path. It is not claimed to be a full Bruneton
    // multiple-scattering LUT, but it preserves the missing horizon/ground energy
    // without flattening time-of-day contrast.
    const opticalThickness = viewRayleigh * (RAYLEIGH_SCATTERING_M_INV[0] + RAYLEIGH_SCATTERING_M_INV[1] + RAYLEIGH_SCATTERING_M_INV[2]) / 3
        + viewMie * MIE_EXTINCTION_M_INV;
    const escapedFraction = 1 - Math.exp(-Math.max(0, opticalThickness));
    const ms = clamp(settings.multipleScatteringFactor, 0, 1.5) * escapedFraction;
    const sunHeight = clamp(sun.y * 0.5 + 0.5, 0, 1);
    const isotropicScale = physicalScale * ms * (0.18 + 0.34 * sunHeight);
    result = {
        r: result.r + isotropicScale * (0.55 + 0.45 * scatterR),
        g: result.g + isotropicScale * (0.62 + 0.38 * scatterG),
        b: result.b + isotropicScale * (0.72 + 0.28 * scatterB),
    };
    if (groundHit && groundHit[0] > 0 && groundHit[0] <= atmosphereHit[1]) {
        const sunTransmittance = atmosphericSunTransmittance(sun, settings, sunSamples, 2);
        const direct = Math.max(0, sun.y);
        const ground = Math.max(0, settings.groundAlbedo) * direct * 0.45;
        result = {
            r: result.r + sunTransmittance.r * ground,
            g: result.g + sunTransmittance.g * ground,
            b: result.b + sunTransmittance.b * ground,
        };
    }
    return result;
}
function shBasis(direction) {
    const { x, y, z } = direction;
    return [
        0.282095,
        0.488603 * y,
        0.488603 * z,
        0.488603 * x,
        1.092548 * x * y,
        1.092548 * y * z,
        0.315392 * (3 * z * z - 1),
        1.092548 * x * z,
        0.546274 * (x * x - y * y),
    ];
}
function projectAtmosphereToSh(sunDirection, settings, sampleCount, viewSamples, sunSamples) {
    const started = performance.now();
    const count = Math.max(8, Math.floor(sampleCount));
    const coefficients = Array.from({ length: 9 }, () => ({ r: 0, g: 0, b: 0 }));
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
        const y = 1 - 2 * (i + 0.5) / count;
        const radius = Math.sqrt(Math.max(0, 1 - y * y));
        const angle = i * goldenAngle;
        const direction = { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius };
        const radiance = integrateAtmosphereRadiance(direction, sunDirection, settings, {
            viewSamples,
            sunSamples,
            cameraAltitudeM: settings.cameraAltitudeM,
        });
        const basis = shBasis(direction);
        const weight = 4 * Math.PI / count;
        for (let band = 0; band < 9; band++) {
            const scalar = basis[band] * weight;
            coefficients[band].r += radiance.r * scalar;
            coefficients[band].g += radiance.g * scalar;
            coefficients[band].b += radiance.b * scalar;
        }
    }
    return { coefficients, samples: count, elapsedMs: performance.now() - started };
}
function colorTemperatureWhiteBalance(kelvin) {
    const temperature = clamp(kelvin, 2500, 12000) / 100;
    let r, g, b;
    if (temperature <= 66) {
        r = 255;
        g = 99.4708025861 * Math.log(Math.max(1, temperature)) - 161.1195681661;
        b = temperature <= 19 ? 0 : 138.5177312231 * Math.log(temperature - 10) - 305.0447927307;
    }
    else {
        r = 329.698727446 * Math.pow(temperature - 60, -0.1332047592);
        g = 288.1221695283 * Math.pow(temperature - 60, -0.0755148492);
        b = 255;
    }
    const normalized = { r: clamp(r / 255, 0.01, 1), g: clamp(g / 255, 0.01, 1), b: clamp(b / 255, 0.01, 1) };
    return { r: normalized.g / normalized.r, g: 1, b: normalized.g / normalized.b };
}


// dist/src/lighting/atmosphere/AtmosphereLutJob.js


function finite(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
}
function indexOf(x, y, width) {
    return (y * width + x) * 4;
}
/**
 * Computes the atmosphere radiance atlas without DOM or WebGL. Higher orders
 * are a bounded angular redistribution of first-order radiance. This is not a
 * full Bruneton spectral precomputation; the approximation is explicit in
 * telemetry and can be replaced without changing the worker protocol.
 */
function computeAtmosphereLut(request) {
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
            firstOrderEnergy += data[index] + data[index + 1] + data[index + 2];
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
                    let blurred = previous[center + channel] * 2;
                    for (const neighbor of neighbors)
                        blurred += previous[neighbor + channel];
                    blurred /= 10;
                    next[center + channel] = data[center + channel] + blurred * orderGain;
                }
                next[center + 3] = 1;
            }
        }
        previous = next;
    }
    let finalEnergy = 0;
    for (let i = 0; i < previous.length; i += 4) {
        finalEnergy += previous[i] + previous[i + 1] + previous[i + 2];
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


// dist/src/lighting/atmosphere/AtmosphereLutWorker.js

const scope = self;
scope.onmessage = (event) => {
    try {
        const result = computeAtmosphereLut(event.data);
        scope.postMessage(result, [result.data]);
    }
    catch (error) {
        scope.postMessage({
            generation: event.data?.generation ?? -1,
            error: error instanceof Error ? error.stack ?? error.message : String(error),
        });
    }
};

