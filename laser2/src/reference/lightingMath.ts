export interface Vec3Like { x: number; y: number; z: number }
export interface Rgb { r: number; g: number; b: number }

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function sunDirectionFromAngles(elevationDeg: number, azimuthDeg: number): Vec3Like {
  const elevation = elevationDeg * Math.PI / 180;
  const azimuth = azimuthDeg * Math.PI / 180;
  const horizontal = Math.cos(elevation);
  return {
    x: horizontal * Math.sin(azimuth),
    y: Math.sin(elevation),
    z: horizontal * Math.cos(azimuth),
  };
}

export function airMass(elevationDeg: number): number {
  const elevation = clamp(elevationDeg, -5, 90);
  if (elevation <= -5) return 40;
  const zenith = 90 - elevation;
  return 1 / (Math.cos(zenith * Math.PI / 180) + 0.50572 * Math.pow(96.07995 - zenith, -1.6364));
}

export function approximateSunRgb(elevationDeg: number, turbidity: number): Rgb {
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

export function thinSheetTransmission(
  incident: Rgb,
  baseColor: Rgb,
  transmittance: number,
  absorption: number,
  shadowVisibility: number,
  cosIncidence: number,
): Rgb {
  const pathScale = 1 / Math.max(0.18, Math.abs(cosIncidence));
  const attenuation = Math.exp(-Math.max(0, absorption) * pathScale);
  const scalar = clamp(transmittance, 0, 1) * clamp(shadowVisibility, 0, 1) * attenuation;
  return {
    r: incident.r * baseColor.r * scalar,
    g: incident.g * baseColor.g * scalar,
    b: incident.b * baseColor.b * scalar,
  };
}

export function exposureMultiplier(ev100: number): number {
  return 1 / Math.pow(2, ev100);
}

export function luminance(rgb: Rgb): number {
  return rgb.r * 0.2126 + rgb.g * 0.7152 + rgb.b * 0.0722;
}
