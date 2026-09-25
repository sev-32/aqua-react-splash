import { StateStore } from '../core/StateStore.js';
import { DEFAULT_LIGHTING_SETTINGS, type LightingSettings } from './LightingSettings.js';

export class LightingState extends StateStore<LightingSettings> {
  constructor() { super(DEFAULT_LIGHTING_SETTINGS); }
}
