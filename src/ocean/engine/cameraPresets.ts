import type { CameraPose } from './camera';

export interface CameraPreset {
  id: string;
  label: string;
  pose: CameraPose;
}

/** Named viewpoints used by the UI, the capture script and the proof boards. */
export const CAMERA_PRESETS: CameraPreset[] = [
  { id: 'deck', label: 'Deck', pose: { position: [0, 3.2, 0], yawDeg: 38, pitchDeg: -6, fovDeg: 58 } },
  { id: 'wide', label: 'Wide ocean', pose: { position: [0, 16, 0], yawDeg: 30, pitchDeg: -4.5, fovDeg: 60 } },
  { id: 'glitter', label: 'Sun glitter', pose: { position: [0, 9, 0], yawDeg: 208, pitchDeg: -5, fovDeg: 55 } },
  { id: 'aerial', label: 'Aerial', pose: { position: [0, 180, 0], yawDeg: 45, pitchDeg: -22, fovDeg: 55 } },
  { id: 'surface', label: 'Eye level', pose: { position: [0, 0.9, 0], yawDeg: 20, pitchDeg: -2, fovDeg: 62 } },
  { id: 'orbit', label: 'Low orbit', pose: { position: [0, 2400, 0], yawDeg: 40, pitchDeg: -30, fovDeg: 50 } },
];
