import { describe, expect, it } from 'vitest';
import { FLAG_ALIVE, MpmParticles } from '../sim/oceanMpm';
import { SplashConnectivity } from '../sim/splashConnectivity';

describe('render-only graph saturation budget',()=>{
  const make=()=>{
    const P=new MpmParticles(80);
    P.count=80;
    // Dense patch deliberately has far more candidates than the 100-bond
    // display budget. Its physical particle state is not modified.
    for(let i=0;i<80;i++){
      P.px[i]=(i%10)*0.04;
      P.py[i]=Math.floor(i/10)*0.035;
      P.pz[i]=0.01*Math.sin(i*0.7);
      P.flags[i]=FLAG_ALIVE;P.vol[i]=0.001;
    }
    const g=new SplashConnectivity({
      form:0.25, break:0.6,memory:0.5,samples:2,thinPower:1.3,maxBonds:100,
    });
    return {P,g};
  };
  it('distributes a saturated bond budget without concentrating it on first particles',()=>{
    const {P,g}=make();
    g.maxDegree=4;
    g.update(P,1/60);
    const degrees=new Uint16Array(P.count);
    for(const e of g.bonds.values()){
      degrees[e.a]++;degrees[e.b]++;
      expect(e.a).not.toBe(e.b);
    }
    expect(g.bonds.size).toBeLessThanOrEqual(100);
    expect(g.bonds.size).toBeGreaterThan(0);
    expect(Math.max(...degrees)).toBeLessThanOrEqual(4);
    expect([...degrees].filter(n=>n>0).length).toBeGreaterThan(30);
    const before=Array.from(P.vol);
    g.update(P,1/60);
    expect(Math.max(...degrees)).toBeLessThanOrEqual(4);
    expect(Array.from(P.vol)).toEqual(before);
  });
  it('retains unlimited per-particle degree as the reference default',()=>{
    const {P,g}=make();
    expect(g.maxDegree).toBe(Infinity);
    g.update(P,1/60);
    expect(g.bonds.size).toBe(100);
  });
});