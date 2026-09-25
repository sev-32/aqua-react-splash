import { describe, it, expect } from 'vitest';
import { WEATHER_PRESETS, pickPreset, applyWeatherMorph, seaMorphForWind, seaWindDirAt, relaxSeaMorph, DEFAULT_WEATHER } from '../atmos/weather';
import { SEA_STATES } from '../spectrum/seaStates';
import { sunTransmittance, sunDirection, nimbusLighting } from '../render/sky';

describe('weather → sea coupling', () => {
  it('seaMorphForWind inverts the library wind-sea U10 and is monotone', () => {
    SEA_STATES.forEach((s, i) => {
      const u = s.systems.find((x) => x.kind === 'wind')!.windSpeed;
      expect(seaMorphForWind(u)).toBeCloseTo(i, 6);
    });
    let prev = -1;
    for (let u = 0; u <= 35; u += 0.5) {
      const m = seaMorphForWind(u);
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
  });

  it('the default weather sustains the default (moderate) sea', () => {
    expect(seaMorphForWind(DEFAULT_WEATHER.windSpeed)).toBeCloseTo(3, 2);
  });

  it('duration-limited relaxation converges, grows at the response time and decays faster', () => {
    let m = 1;
    for (let i = 0; i < 600; i++) m = relaxSeaMorph(m, 5, 0.5, 30);
    expect(m).toBeCloseTo(5, 3);
    // one time constant → 63 % of the way
    expect(relaxSeaMorph(1, 5, 30, 30)).toBeCloseTo(5 - 4 * Math.exp(-1), 6);
    const up = relaxSeaMorph(1, 5, 10, 30) - 1, down = 5 - relaxSeaMorph(5, 1, 10, 30);
    expect(down).toBeGreaterThan(up);
  });

  it('preset morph hits the presets exactly and wraps wind direction on the short arc', () => {
    WEATHER_PRESETS.forEach((p, i) => {
      const b = pickPreset(i);
      expect(b.coverage).toBeCloseTo(p.coverage, 9);
      expect(b.windSpeed).toBeCloseTo(p.windSpeed, 9);
    });
    const w = applyWeatherMorph(DEFAULT_WEATHER, 5.5);
    expect(w.morph).toBe(5.5);
    expect(w.precipitation).toBeGreaterThan(0.7);
    const d = seaWindDirAt(3.5);
    expect(d).toBeGreaterThan(38);
    expect(d).toBeLessThan(40);
  });
});

describe('Nimbus atmosphere (CPU twin)', () => {
  it('reddens and dims the sun toward the horizon; ozone and the soft terminator end the day', () => {
    const noon = sunTransmittance(sunDirection(200, 70), 1);
    const low = sunTransmittance(sunDirection(200, 4), 1);
    const below = sunTransmittance(sunDirection(200, -8), 1);
    expect(noon[2]).toBeGreaterThan(0.6);
    expect(low[0] / low[2]).toBeGreaterThan(noon[0] / noon[2] * 2);   // redder at low sun
    expect(below[1]).toBeLessThan(1e-3);
    // haze dims further
    const hazy = sunTransmittance(sunDirection(200, 20), 3);
    const clear = sunTransmittance(sunDirection(200, 20), 1);
    expect(hazy[1]).toBeLessThan(clear[1]);
  });

  it('derived sky fill turns from blue day to warm dusk and fades at night', () => {
    const day = nimbusLighting(40, 22), dusk = nimbusLighting(0, 22), night = nimbusLighting(-7, 22);
    expect(day.skyAmb[2]).toBeGreaterThan(day.skyAmb[0]);
    expect(dusk.skyAmb[0] / dusk.skyAmb[2]).toBeGreaterThan(day.skyAmb[0] / day.skyAmb[2]);
    expect(night.sunWhite).toBe(0);
    expect(night.skyAmb[1]).toBeLessThan(day.skyAmb[1] * 0.05);
  });
});
