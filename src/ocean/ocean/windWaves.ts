/**
 * Wind field + wind-forced micro waves (POSEIDON R7 "wind-wave" lane).
 *
 * A 2-D gusting wind field (direction wander, curl turbulence, travelling gust
 * cells, vortex street, fetch growth) drives a capillary-gravity micro-wave
 * heightfield by its pressure fluctuations. The sea gets:
 *   - near-field micro geometry and micro normals (cat's paws, gust patches),
 *   - a spatially varying optical roughness (gusts darken/brighten the sheen).
 *
 * The weather is the authority: U10, direction, gustiness and squalls come
 * from Nimbus's WeatherParams, mapped onto POSEIDON's calm → long-fetch →
 * veering scenario parameters.
 */
import { Program, Target, Quad, FULLSCREEN_VS, createTexture, FMT, type GL } from '../gl/context';
import type { WeatherParams } from '../atmos/weather';

const WIND_FIELD_FS = /* glsl */ `#version 300 es
precision highp float;
layout(location=0) out vec4 windOut;
uniform float time;
uniform float domainSize;
uniform float baseSpeed;
uniform float directionRad;
uniform float directionVariance;
uniform float fieldScale;
uniform float timeScale;
uniform float turbulence;
uniform float gustVariance;
uniform float gustSpread;
uniform float vortexStrength;
uniform float vortexFrequency;
uniform float vortexTightness;
uniform float wakeStrength;
uniform float coastX;
uniform float fetchLength;
uniform float resolution;
float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash12(i),hash12(i+vec2(1,0)),f.x),mix(hash12(i+vec2(0,1)),hash12(i+vec2(1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.58,1.17,-1.17,1.58);for(int i=0;i<5;i++){v+=a*n2(p);p=m*p+13.7;a*=.52;}return v;}
vec2 curlField(vec2 p,float t){
 float e=.35;
 float a=fbm(p+vec2(0,e)+t),b=fbm(p-vec2(0,e)+t),c=fbm(p+vec2(e,0)-t),d=fbm(p-vec2(e,0)-t);
 return vec2((a-b)/(2.*e),-(c-d)/(2.*e));
}
void main(){
 vec2 uv=gl_FragCoord.xy/resolution;
 vec2 world=(uv-.5)*domainSize;
 vec2 dir=vec2(cos(directionRad),sin(directionRad));
 vec2 perp=vec2(-dir.y,dir.x);
 float t=time*timeScale;
 vec2 q=world*fieldScale*.055;
 vec2 curl=curlField(q+dir*t*.37,t*.13);
 float angleNoise=(fbm(q*.72+dir*t*.19)-.5)*2.*directionVariance;
 float ca=cos(angleNoise),sa=sin(angleNoise);
 vec2 localDir=mat2(ca,-sa,sa,ca)*dir;
 float cell=fbm(q*.42-dir*t*.22);
 float small=fbm(q*1.35+perp*t*.17);
 float tke=max(0.,turbulence*(.22+.78*small)+.35*length(curl));
 float speed=baseSpeed*(.62+.58*cell);
 speed*=1.+.12*turbulence*(small-.5);
 vec2 gustCenter=dir*mod(t*baseSpeed*8.+domainSize*.7,domainSize)-dir*domainSize*.5+perp*sin(t*.37)*domainSize*.18;
 vec2 rel=world-gustCenter;
 float along=dot(rel,dir),across=dot(rel,perp);
 float gLong=mix(38.,155.,clamp(gustSpread,0.,1.5)/1.5);
 float gWide=mix(18.,72.,clamp(gustSpread,0.,1.5)/1.5);
 float gust=exp(-.5*(along*along/(gLong*gLong)+across*across/(gWide*gWide)));
 gust*=.65+.35*sin(vortexFrequency*t+along*.045);
 float vortexPhase=vortexFrequency*t+dot(world,dir)*.035;
 float vortexEnvelope=exp(-abs(across)/(28.+75.*vortexTightness));
 vec2 vortex=perp*sin(vortexPhase)*vortexEnvelope*vortexStrength*(.3+.7*gust);
 float fetch=max(dot(world-vec2(coastX,0.),dir),0.);
 float fetchGrowth=1.-exp(-fetch/max(fetchLength,1.));
 float coastShelter=mix(1.-wakeStrength,.98,smoothstep(0.,max(fetchLength*.45,8.),fetch));
 vec2 wind=localDir*speed*coastShelter*(1.+gustVariance*gust*.55);
 wind+=curl*baseSpeed*turbulence*.18+vortex*baseSpeed*.18;
 float pressure=(gustVariance*gust-.28)*(0.55+0.45*fetchGrowth)+dot(curl,perp)*turbulence*.32+sin(vortexPhase)*vortexEnvelope*vortexStrength*.18;
 pressure=clamp(pressure,-1.5,2.5);
 windOut=vec4(wind,pressure,tke*(.45+.55*fetchGrowth));
}
`;

const MICRO_WAVE_FS = /* glsl */ `#version 300 es
precision highp float;
layout(location=0) out vec4 nextState;
uniform sampler2D previousState;
uniform sampler2D windField;
uniform float resolution;
uniform float domainSize;
uniform float windDomainSize;
uniform float dt;
uniform float celerity;
uniform float damping;
uniform float pressureGain;
vec2 state(vec2 uv){return texture(previousState,fract(uv)).rg;}
vec4 wind(vec2 world){return texture(windField,fract(world/windDomainSize+.5));}
void main(){
 vec2 uv=gl_FragCoord.xy/resolution;
 vec2 world=(uv-.5)*domainSize;
 vec4 wf=wind(world);
 vec2 advect=wf.xy*dt*.10/domainSize;
 vec2 s=state(uv-advect);
 vec2 px=vec2(1./resolution,0),py=vec2(0,1./resolution);
 float h=s.x,v=s.y;
 float lap=(state(uv+px).x+state(uv-px).x+state(uv+py).x+state(uv-py).x-4.*h);
 float p0=wf.z;
 float pAvg=.25*(wind(world+vec2(domainSize/resolution,0)).z+wind(world-vec2(domainSize/resolution,0)).z+
                   wind(world+vec2(0,domainSize/resolution)).z+wind(world-vec2(0,domainSize/resolution)).z);
 float forcing=(p0-pAvg)+.12*(wf.w-.45);
 float acc=celerity*celerity*lap+pressureGain*forcing;
 v=(v+dt*acc)*exp(-damping*dt);
 h=clamp(h+dt*v,-.35,.35);
 nextState=vec4(h,v,0.,0.);
}
`;

export interface WindWaveParams {
  baseSpeed: number; directionDeg: number; directionVariance: number; fieldScale: number; timeScale: number;
  turbulence: number; gustVariance: number; gustSpread: number; vortexStrength: number; vortexFrequency: number;
  vortexTightness: number; wakeStrength: number; coastX: number; fetchLength: number; pressureGain: number;
  microCelerity: number; microDamping: number;
  /** Render couplings (POSEIDON microGeometryGain / microNormalGain / windOpticalRoughness). */
  microGeometryGain: number; microGeometryRange: number; microNormalGain: number; opticalRoughness: number;
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Map the weather onto POSEIDON's wind-scenario space: calm (U10 0) → long fetch
 * (15 m/s) → veering/opposing (≥ 20 m/s); rain squalls add gust variance.
 */
export function windWaveParamsFor(w: WeatherParams): WindWaveParams {
  const u = Math.max(w.windSpeed, 0);
  const a = Math.min(u / 15, 1), b = Math.min(Math.max((u - 15) / 8, 0), 1);
  const squall = w.precipitation;
  return {
    baseSpeed: u, directionDeg: w.windDirDeg,
    directionVariance: mix(mix(0.08, 0.42, a), 1.05, b),
    fieldScale: 0.11, timeScale: 0.28,
    turbulence: mix(mix(0.08, 0.72, a), 1.15, b) + 0.2 * squall,
    gustVariance: mix(mix(0, 0.72, a), 1.2, b) + 0.6 * squall,
    gustSpread: mix(mix(0.25, 0.52, a), 0.88, b),
    vortexStrength: mix(mix(0.05, 0.42, a), 0.95, b),
    vortexFrequency: 1.2, vortexTightness: 0.65,
    // Open ocean: fully developed fetch everywhere (POSEIDON's coast model is for its test basin).
    wakeStrength: 0.2, coastX: -1e6, fetchLength: 1200,
    pressureGain: mix(mix(0, 0.88, a), 1.25, b) + 0.3 * squall,
    microCelerity: 2.7, microDamping: 0.36,
    microGeometryGain: mix(mix(0.02, 0.09, a), 0.12, b),
    microGeometryRange: 240,
    microNormalGain: mix(mix(0.2, 1.15, a), 1.65, b),
    opticalRoughness: mix(mix(0.08, 0.92, a), 1.35, b),
  };
}

export class WindWaves {
  static readonly WIND_DOMAIN = 512;
  static readonly MICRO_DOMAIN = 256;
  readonly windTex: Target;
  private micro: [Target, Target];
  private ping = 0;
  private pWind: Program; private pMicro: Program;
  private quad: Quad;
  params: WindWaveParams | null = null;

  constructor(private gl: GL, readonly windN = 256, readonly microN = 256) {
    const f32 = { ...FMT.rgba32f(gl), filter: gl.NEAREST, wrap: gl.REPEAT };
    this.windTex = new Target(gl, windN, windN, [createTexture(gl, windN, windN, f32)]);
    const mk = () => new Target(gl, microN, microN, [createTexture(gl, microN, microN, f32)]);
    this.micro = [mk(), mk()];
    for (const t of this.micro) { t.bind(); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.pWind = new Program(gl, 'wind.field', FULLSCREEN_VS, WIND_FIELD_FS);
    this.pMicro = new Program(gl, 'wind.micro', FULLSCREEN_VS, MICRO_WAVE_FS);
    this.quad = new Quad(gl);
  }

  get microTex() {
    return this.micro[this.ping].texture;
  }

  update(weather: WeatherParams, time: number, dt: number) {
    const gl = this.gl;
    const p = (this.params = windWaveParamsFor(weather));
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    this.pWind.use().set('time', time).set('domainSize', WindWaves.WIND_DOMAIN).set('baseSpeed', p.baseSpeed)
      .set('directionRad', (p.directionDeg * Math.PI) / 180).set('directionVariance', p.directionVariance)
      .set('fieldScale', p.fieldScale).set('timeScale', p.timeScale).set('turbulence', p.turbulence)
      .set('gustVariance', p.gustVariance).set('gustSpread', p.gustSpread).set('vortexStrength', p.vortexStrength)
      .set('vortexFrequency', p.vortexFrequency).set('vortexTightness', p.vortexTightness).set('wakeStrength', p.wakeStrength)
      .set('coastX', p.coastX).set('fetchLength', p.fetchLength).set('resolution', this.windN);
    this.windTex.bind();
    this.quad.draw();
    if (dt > 0) {
      const src = this.micro[this.ping], dst = this.micro[1 - this.ping];
      this.pMicro.use().tex('previousState', src.texture).tex('windField', this.windTex.texture)
        .set('resolution', this.microN).set('domainSize', WindWaves.MICRO_DOMAIN).set('windDomainSize', WindWaves.WIND_DOMAIN)
        .set('dt', Math.min(Math.max(dt, 0), 0.033)).set('celerity', p.microCelerity).set('damping', p.microDamping)
        .set('pressureGain', p.pressureGain);
      dst.bind();
      this.quad.draw();
      this.ping = 1 - this.ping;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  dispose() {
    this.windTex.dispose();
    this.micro.forEach((t) => t.dispose());
    this.pWind.dispose();
    this.pMicro.dispose();
  }
}
