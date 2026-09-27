(()=>{
  "use strict";
  const VERSION="LASER2_EXTREME_OCEAN_V4_20260712";
  const water=window.LASER2_WATER_INTERNAL;
  const wind=window.LASER2_WIND_INTERNAL;
  const master=window.LASER2_CREW_RIGGING_MASTER_V2;
  if(!water||!master){console.error(VERSION+": required V3 runtime not found");return;}

  const G=9.81, RHO=1025.0, SURFACE_TENSION=0.074, TWO_PI=Math.PI*2;
  const WIND_FREQ_BINS=8, DIR_BINS=5, SWELL_MODES=4;
  const MACRO_COUNT=WIND_FREQ_BINS*DIR_BINS+SWELL_MODES;
  const MICRO_COUNT=10;
  const Vec3=water.uniforms.uSunDir.value.constructor;
  const Vec4=water.uniforms.waveA.value[0].constructor;
  const Matrix4=master.camera.projectionMatrix.constructor;
  const ShaderMaterial=water.matNear.constructor;
  const PlaneGeometry=water.meshNear.geometry.constructor;
  const RingGeometry=water.meshFar.geometry.constructor;

  const params={
    fetchM:12000,
    depthM:28,
    gamma:3.3,
    swellHsM:0.22,
    swellPeriodS:9.5,
    swellOffsetDeg:32,
    chop:0.88,
    clarity:0.76,
    sceneOptics:true,
    reflectionScale:0.48,
    reflectionStride:1,
    nearSizeM:400,
    nearSegments:280,
    farInnerM:195,
    farOuterM:8000,
    farRadialSegments:18,
    farAngularSegments:128
  };
  const state={time:0,windSpeedMps:Math.max(0.1,wind?.speed10||5.65),windFromDeg:wind?.fromDeg||0,modes:[],micro:[],HsM:0,TpS:0,windHsM:0,spectrumVariance:0,finiteDepth:true,frame:0,offscreenFrames:0,shaderReady:false,reflectionReady:false,lastError:null,gridSpacingM:0,quality:"extreme-hybrid",validation:null,physicsModes:[],physicsVarianceCoverage:0};
  const legacyLabMetrics=window.__labMetrics;
  const receipt=Object.freeze({
    version:VERSION,
    sourceBasis:"Laser 2 V3 verified runtime",
    waveAuthority:"directional JONSWAP/TMA discrete spectrum + separate swell; GPU evaluates full spectrum while hull physics evaluates its energetic hull-resolved subset",
    rendering:"analytical choppy displacement, Jacobian breakers, capillary-gravity micro-normal spectrum, exact dielectric Fresnel, Beer-Lambert volume optics, planar scene reflection/refraction",
    retainedSystems:["V3 hull","hydrostatics","sails","rigging","crew biomechanics","camera","UI"],
    limitations:["discrete real-time spectrum rather than full 2-D inverse FFT grid","breaker foam is diagnostic/instantaneous rather than a persistent advected foam field","planar reflection omits an oblique clip plane"]
  });

  const fract=x=>x-Math.floor(x);
  const hash=n=>fract(Math.sin(n*127.1+311.7)*43758.5453123);
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const deg=x=>x*Math.PI/180;
  function dispersionOmega(k,depth=params.depthM){return Math.sqrt(Math.max(0,(G*k+(SURFACE_TENSION/RHO)*k*k*k)*Math.tanh(k*depth)));}
  function solveK(omega,depth=params.depthM){
    let k=Math.max(1e-5,omega*omega/G);
    for(let i=0;i<10;i++){
      const kh=k*depth, th=Math.tanh(kh), sech2=1/Math.cosh(clamp(kh,-20,20))**2;
      const cap=SURFACE_TENSION/RHO;
      const f=(G*k+cap*k*k*k)*th-omega*omega;
      const df=(G+3*cap*k*k)*th+(G*k+cap*k*k*k)*depth*sech2;
      k=Math.max(1e-6,k-f/Math.max(df,1e-8));
    }
    return k;
  }
  function tmaFactor(omega,depth=params.depthM){
    const x=omega*Math.sqrt(depth/G);
    if(x<=1)return 0.5*x*x;
    if(x<2)return 1-0.5*(2-x)*(2-x);
    return 1;
  }
  function fetchSea(U10,fetch){
    const X=G*fetch/Math.max(U10*U10,0.25);
    const Hs=0.283*Math.tanh(0.0125*Math.pow(X,0.42))*U10*U10/G;
    const Tp=7.54*Math.tanh(0.077*Math.pow(X,0.25))*U10/G;
    return {X,Hs:Math.max(0.03,Hs),Tp:Math.max(1.2,Tp)};
  }
  function jonswapRaw(f,fp,gamma){
    const sigma=f<=fp?0.07:0.09;
    const r=Math.exp(-0.5*Math.pow((f-fp)/(sigma*fp),2));
    return Math.pow(f,-5)*Math.exp(-1.25*Math.pow(fp/f,4))*Math.pow(gamma,r);
  }
  function directionVector(fromDeg,offsetRad=0){
    const to=deg(fromDeg+180)+offsetRad;
    return {dx:-Math.sin(to),dz:Math.cos(to)};
  }
  function rebuildSpectrum(U10=state.windSpeedMps,fromDeg=state.windFromDeg){
    state.windSpeedMps=Math.max(0.1,U10);state.windFromDeg=fromDeg;
    const seaScale=water.cfg?.userScale??1;
    const empirical=fetchSea(state.windSpeedMps,params.fetchM);
    const targetWindHs=Math.max(0.025,empirical.Hs*seaScale);
    const fp=1/empirical.Tp;
    const fMin=Math.max(0.045,fp*0.48),fMax=Math.max(fMin*1.35,Math.min(fp*1.56,0.65));
    const logStep=Math.log(fMax/fMin)/(WIND_FREQ_BINS-1);
    const candidates=[];
    for(let fi=0;fi<WIND_FREQ_BINS;fi++){
      const f=fMin*Math.exp(logStep*fi);
      const prev=fi===0?f/Math.exp(logStep*.5):fMin*Math.exp(logStep*(fi-.5));
      const next=fi===WIND_FREQ_BINS-1?f*Math.exp(logStep*.5):fMin*Math.exp(logStep*(fi+.5));
      const df=next-prev,omega=TWO_PI*f,k=solveK(omega);
      const raw=jonswapRaw(f,fp,params.gamma)*tmaFactor(omega);
      const rel=f/fp;
      const spreadExp=clamp(10/(1+1.35*Math.abs(rel-1)),3.5,12);
      const offsets=[-0.72,-0.34,0.0,0.34,0.72];
      const weights=offsets.map(a=>Math.pow(Math.max(0,Math.cos(a)),2*spreadExp));
      const wsum=weights.reduce((a,b)=>a+b,0);
      offsets.forEach((off,di)=>{
        const dir=directionVector(fromDeg,off);
        candidates.push({band:0,dx:dir.dx,dz:dir.dz,k,omega,amp:Math.sqrt(Math.max(0,2*raw*df*weights[di]/wsum)),chop:params.chop,phase:TWO_PI*hash(101+fi*11+di*29),f});
      });
    }
    let variance=0;for(const m of candidates)variance+=0.5*m.amp*m.amp;
    const targetVariance=targetWindHs*targetWindHs/16;
    const scale=Math.sqrt(targetVariance/Math.max(variance,1e-12));
    for(const m of candidates)m.amp*=scale;

    const swell=[];
    const swellWeights=[0.42,0.28,0.19,0.11],periodRatios=[1.0,0.84,1.18,0.72],angleOffsets=[0,-0.07,0.09,-0.15];
    const targetSwellVar=params.swellHsM*params.swellHsM/16;
    for(let i=0;i<SWELL_MODES;i++){
      const T=params.swellPeriodS*periodRatios[i],omega=TWO_PI/T,k=solveK(omega);
      const dir=directionVector(fromDeg+params.swellOffsetDeg,angleOffsets[i]);
      const amp=Math.sqrt(2*targetSwellVar*swellWeights[i]);
      swell.push({band:1,dx:dir.dx,dz:dir.dz,k,omega,amp,chop:Math.min(params.chop*.62,0.72),phase:TWO_PI*hash(700+i*47),f:1/T});
    }
    state.modes=candidates.concat(swell);
    for(const m of state.modes){m.kx=m.k*m.dx;m.kz=m.k*m.dz;}
    state.physicsModes=state.modes.slice().sort((a,b)=>b.amp*b.amp-a.amp*a.amp).slice(0,24);
    const totalVar=state.modes.reduce((a,m)=>a+.5*m.amp*m.amp,0),physicsVar=state.physicsModes.reduce((a,m)=>a+.5*m.amp*m.amp,0);
    state.physicsVarianceCoverage=physicsVar/Math.max(totalVar,1e-12);
    state.windHsM=targetWindHs;
    state.HsM=Math.sqrt(targetWindHs*targetWindHs+params.swellHsM*params.swellHsM);
    state.TpS=empirical.Tp;
    state.spectrumVariance=state.modes.reduce((a,m)=>a+0.5*m.amp*m.amp,0);
    buildMicroSpectrum(fromDeg);
    uploadSpectrum();
    state.validation=validateSpectrum(2048);
    return state.modes;
  }
  function buildMicroSpectrum(fromDeg){
    state.micro=[];
    const baseAngles=[-.92,-.66,-.42,-.21,0.0,.20,.41,.64,.88,1.15];
    const wavelengths=[3.0,2.0,1.35,.91,.62,.42,.29,.19,.12,.072];
    for(let i=0;i<MICRO_COUNT;i++){
      const dir=directionVector(fromDeg,baseAngles[i]);
      const k=TWO_PI/wavelengths[i],omega=dispersionOmega(k);
      const slope=0.008+0.009*Math.sqrt(Math.max(state.windSpeedMps,0.2))*Math.pow(i/(MICRO_COUNT-1),.42);
      state.micro.push({dx:dir.dx,dz:dir.dz,k,omega,slope:Math.min(.12,slope),phase:TWO_PI*hash(1500+i*79)});
    }
  }

  const uniforms={
    uWaveA:{value:Array.from({length:MACRO_COUNT},()=>new Vec4())},
    uWaveB:{value:Array.from({length:MACRO_COUNT},()=>new Vec4())},
    uMicroA:{value:Array.from({length:MICRO_COUNT},()=>new Vec4())},
    uMicroB:{value:Array.from({length:MICRO_COUNT},()=>new Vec4())},
    uWaveCount:{value:MACRO_COUNT},uMicroCount:{value:MICRO_COUNT},uTime:{value:0},
    uSunDir:{value:water.sunDir},uCamPos:{value:new Vec3()},uHs:{value:.4},uTp:{value:3},uWindSpeed:{value:state.windSpeedMps},
    uIor:{value:1.333},uClarity:{value:params.clarity},uAbsorption:{value:new Vec3(.19,.055,.024)},uScatterColor:{value:new Vec3(.018,.135,.18)},
    uBoatPos:{value:new Vec3()},uBoatForward:{value:new Vec3(0,0,1)},uBoatSpeed:{value:0},uFar:{value:0},uSceneOptics:{value:0},
    uReflectionTex:{value:null},uRefractionTex:{value:null},uReflectionVP:{value:new Matrix4()},uMainVP:{value:new Matrix4()}
  };
  const uniformsFar={};for(const [k,v] of Object.entries(uniforms))uniformsFar[k]=v;
  uniformsFar.uFar={value:1};

  const vertexShader=`
    #define MACRO_COUNT ${MACRO_COUNT}
    uniform vec4 uWaveA[MACRO_COUNT];
    uniform vec4 uWaveB[MACRO_COUNT];
    uniform int uWaveCount;
    uniform float uTime;
    uniform float uFar;
    uniform mat4 uReflectionVP;
    uniform mat4 uMainVP;
    varying vec3 vWorld;
    varying vec3 vNormalW;
    varying float vJacobian;
    varying float vHeight;
    varying vec4 vReflectionClip;
    varying vec4 vMainClip;
    void main(){
      vec3 base=(modelMatrix*vec4(position,1.0)).xyz;
      vec3 P=base;
      vec3 dPx=vec3(1.0,0.0,0.0);
      vec3 dPz=vec3(0.0,0.0,1.0);
      float dXdx=1.0,dXdz=0.0,dZdx=0.0,dZdz=1.0;
      float radial=length(base.xz-cameraPosition.xz);
      for(int i=0;i<MACRO_COUNT;i++){
        if(i>=uWaveCount)break;
        vec4 A=uWaveA[i],B=uWaveB[i];
        float k=A.z, omega=A.w, amp=B.x, chop=B.y;
        float lod=mix(1.0,exp(-max(0.0,k-.22)*radial*.018),uFar);
        amp*=lod;
        float ph=k*dot(A.xy,base.xz)-omega*uTime+B.z;
        float sn=sin(ph),cs=cos(ph);
        P.y+=amp*sn;
        P.xz+=A.xy*(chop*amp*cs);
        float ak=amp*k;
        dPx+=vec3(-chop*ak*A.x*A.x*sn,ak*A.x*cs,-chop*ak*A.x*A.y*sn);
        dPz+=vec3(-chop*ak*A.x*A.y*sn,ak*A.y*cs,-chop*ak*A.y*A.y*sn);
        dXdx-=chop*ak*A.x*A.x*sn;
        dXdz-=chop*ak*A.x*A.y*sn;
        dZdx-=chop*ak*A.x*A.y*sn;
        dZdz-=chop*ak*A.y*A.y*sn;
      }
      vec3 N=normalize(cross(dPz,dPx));
      vWorld=P;vNormalW=N;vHeight=P.y;vJacobian=dXdx*dZdz-dXdz*dZdx;
      vReflectionClip=uReflectionVP*vec4(P,1.0);
      vMainClip=uMainVP*vec4(P,1.0);
      gl_Position=projectionMatrix*viewMatrix*vec4(P,1.0);
    }
  `;
  const fragmentShader=`
    precision highp float;
    #define MICRO_COUNT ${MICRO_COUNT}
    uniform vec4 uMicroA[MICRO_COUNT];
    uniform vec4 uMicroB[MICRO_COUNT];
    uniform int uMicroCount;
    uniform float uTime;
    uniform vec3 uSunDir;
    uniform vec3 uCamPos;
    uniform float uHs;
    uniform float uTp;
    uniform float uWindSpeed;
    uniform float uIor;
    uniform float uClarity;
    uniform vec3 uAbsorption;
    uniform vec3 uScatterColor;
    uniform vec3 uBoatPos;
    uniform vec3 uBoatForward;
    uniform float uBoatSpeed;
    uniform float uFar;
    uniform float uSceneOptics;
    uniform sampler2D uReflectionTex;
    uniform sampler2D uRefractionTex;
    varying vec3 vWorld;
    varying vec3 vNormalW;
    varying float vJacobian;
    varying float vHeight;
    varying vec4 vReflectionClip;
    varying vec4 vMainClip;
    const float PI=3.141592653589793;
    float sat(float x){return clamp(x,0.0,1.0);}
    vec3 sky(vec3 d){
      float h=sat(d.y*.5+.5);
      vec3 horizon=vec3(.74,.84,.91),zenith=vec3(.18,.43,.68);
      vec3 c=mix(horizon,zenith,pow(h,.62));
      float sun=max(dot(d,normalize(uSunDir)),0.0);
      c+=vec3(1.0,.84,.62)*(pow(sun,8500.0)*9.0+pow(sun,96.0)*.16);
      return c;
    }
    float fresnelDielectric(float cosTheta){
      float r0=(1.0-uIor)/(1.0+uIor);r0*=r0;
      return r0+(1.0-r0)*pow(1.0-sat(cosTheta),5.0);
    }
    float ggxD(float ndh,float a){float a2=a*a;float d=ndh*ndh*(a2-1.0)+1.0;return a2/max(PI*d*d,1e-6);}
    float smithG1(float nd,float a){float k=(a+1.0)*(a+1.0)/8.0;return nd/max(nd*(1.0-k)+k,1e-5);}
    vec2 projectedUV(vec4 c){vec2 uv=c.xy/max(c.w,1e-5)*.5+.5;return uv;}
    float edgeMask(vec2 uv){float e=min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y));return smoothstep(.006,.045,e);}
    void main(){
      vec3 V=normalize(uCamPos-vWorld);
      vec2 microSlope=vec2(0.0);
      for(int i=0;i<MICRO_COUNT;i++){
        if(i>=uMicroCount)break;
        vec4 A=uMicroA[i],B=uMicroB[i];
        float ph=A.z*dot(A.xy,vWorld.xz)-A.w*uTime+B.y;
        float footprint=max(fwidth(ph),1e-5);
        float aa=1.0-smoothstep(.72,1.9,footprint);
        microSlope+=A.xy*(B.x*cos(ph)*aa);
      }
      vec3 N=normalize(vNormalW+vec3(-microSlope.x*.68,0.0,-microSlope.y*.68));
      if(dot(N,V)<0.0)N=-N;
      float ndv=max(dot(N,V),.001);
      float F=fresnelDielectric(ndv);
      float rough=clamp(.045+.0065*uWindSpeed,.055,.19);
      vec3 R=reflect(-V,N);
      vec3 reflected=sky(R);
      vec2 reflUV=projectedUV(vReflectionClip);
      vec2 refrUV=projectedUV(vMainClip);
      vec2 distortion=N.xz*(.048+min(.028,uHs*.028))/max(abs(vReflectionClip.w)*.018,1.0);
      reflUV+=vec2(distortion.x,-distortion.y);
      refrUV-=distortion*.42;
      float rb=edgeMask(reflUV),tb=edgeMask(refrUV);
      vec2 reflSafe=clamp(reflUV,.002,.998);
      vec2 blurAxis=normalize(uMicroA[0].xy+vec2(1e-5,0.0));
      vec2 blurPerp=vec2(-blurAxis.y,blurAxis.x);
      float blurRadius=.0012+rough*.010;
      vec3 sceneRefl=texture2D(uReflectionTex,reflSafe).rgb*.40;
      sceneRefl+=texture2D(uReflectionTex,clamp(reflSafe+blurAxis*blurRadius,.002,.998)).rgb*.15;
      sceneRefl+=texture2D(uReflectionTex,clamp(reflSafe-blurAxis*blurRadius,.002,.998)).rgb*.15;
      sceneRefl+=texture2D(uReflectionTex,clamp(reflSafe+blurPerp*blurRadius*.65,.002,.998)).rgb*.15;
      sceneRefl+=texture2D(uReflectionTex,clamp(reflSafe-blurPerp*blurRadius*.65,.002,.998)).rgb*.15;
      reflected=mix(reflected,sceneRefl,rb*uSceneOptics);

      float path=mix(12.0,2.7,1.0-uClarity)/max(ndv,.12);
      vec3 trans=exp(-uAbsorption*path);
      vec3 deepAmbient=vec3(.006,.055,.085);
      vec3 body=uScatterColor*(1.0-trans)+deepAmbient*trans;
      vec3 sceneRefr=texture2D(uRefractionTex,clamp(refrUV,.001,.999)).rgb;
      vec3 raySky=sky(normalize(vWorld-uCamPos));
      float nearBoat=exp(-length(vWorld.xz-uBoatPos.xz)*.34);
      float objectMask=smoothstep(.30,.78,length(sceneRefr-raySky))*nearBoat*tb*uSceneOptics;
      vec3 transmittedObject=sceneRefr*trans+body*(1.0-trans);
      body=mix(body,transmittedObject,objectMask*.56);

      vec3 L=normalize(uSunDir),H=normalize(L+V);
      float ndl=max(dot(N,L),0.0),ndh=max(dot(N,H),0.0);
      float spec=ggxD(ndh,rough)*smithG1(ndv,rough)*smithG1(max(ndl,.001),rough)*fresnelDielectric(max(dot(V,H),0.0))/max(4.0*ndv*max(ndl,.001),1e-4);
      vec3 sunGlitter=vec3(1.0,.89,.72)*spec*ndl*3.2;

      float compression=1.0-smoothstep(.12,.72,vJacobian);
      float crest=smoothstep(max(.015,uHs*.02),max(.08,uHs*.34),vHeight);
      float breaking=compression*crest;
      vec2 forward=normalize(uBoatForward.xz+vec2(1e-6,0.0));
      vec2 right=vec2(forward.y,-forward.x),rel=vWorld.xz-uBoatPos.xz;
      float aft=-dot(rel,forward),lat=dot(rel,right);
      float wakeOn=step(0.0,aft)*smoothstep(1.2,4.5,uBoatSpeed);
      float wedge=abs(abs(lat)-aft*.352);
      float arms=exp(-wedge*wedge/max(.16,.05*aft+.1));
      float churn=exp(-lat*lat/.42)*exp(-aft/18.0);
      float wake=wakeOn*exp(-aft/52.0)*max(arms*.65,churn);
      float foam=sat(breaking*.92+wake*.78);
      float foamDetail=.74+.26*sin(12.0*vWorld.x+9.0*vWorld.z-uTime*1.7)*sin(8.0*vWorld.z-uTime*.9);
      foam*=foamDetail;

      vec3 col=mix(body,reflected,F);
      col+=sunGlitter;
      col=mix(col,vec3(.91,.955,.97),foam*(.72+.18*F));
      float dist=length(vWorld.xz-uCamPos.xz);
      float haze=1.0-exp(-dist*.00072);
      col=mix(col,vec3(.74,.83,.90),haze);
      gl_FragColor=vec4(max(col,vec3(0.0)),1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `;

  function uploadSpectrum(){
    for(let i=0;i<MACRO_COUNT;i++){
      const m=state.modes[i]||{dx:1,dz:0,k:1,omega:1,amp:0,chop:0,phase:0,band:0};
      uniforms.uWaveA.value[i].set(m.dx,m.dz,m.k,m.omega);
      uniforms.uWaveB.value[i].set(m.amp,m.chop,m.phase,m.band);
    }
    for(let i=0;i<MICRO_COUNT;i++){
      const m=state.micro[i]||{dx:1,dz:0,k:1,omega:1,slope:0,phase:0};
      uniforms.uMicroA.value[i].set(m.dx,m.dz,m.k,m.omega);
      uniforms.uMicroB.value[i].set(m.slope,m.phase,0,0);
    }
    uniforms.uHs.value=state.HsM;uniforms.uTp.value=state.TpS;uniforms.uWindSpeed.value=state.windSpeedMps;uniforms.uClarity.value=params.clarity;
    for(const k of ["uWaveA","uWaveB","uMicroA","uMicroB"])uniforms[k].needsUpdate=true;
  }

  const original={setSea:water.setSea.bind(water),height:water.height.bind(water),velocity:water.velocity.bind(water),update:water.update.bind(water),matNear:water.matNear,matFar:water.matFar,geomNear:water.meshNear.geometry,geomFar:water.meshFar.geometry};
  function sampleRaw(x,z,t=water.time,includeHorizontal=true){
    let h=0,hx=0,hz=0,vx=0,vy=0,vz=0,dXdx=1,dXdz=0,dZdx=0,dZdz=1,dYdx=0,dYdz=0;
    for(const m of state.modes){
      const ph=m.kx*x+m.kz*z-m.omega*t+m.phase,sn=Math.sin(ph),cs=Math.cos(ph),ak=m.amp*m.k;
      h+=m.amp*sn;dYdx+=ak*m.dx*cs;dYdz+=ak*m.dz*cs;vy-=m.amp*m.omega*cs;
      if(includeHorizontal){
        hx+=m.chop*m.amp*m.dx*cs;hz+=m.chop*m.amp*m.dz*cs;
        vx+=m.chop*m.amp*m.dx*m.omega*sn;vz+=m.chop*m.amp*m.dz*m.omega*sn;
        dXdx-=m.chop*ak*m.dx*m.dx*sn;dXdz-=m.chop*ak*m.dx*m.dz*sn;dZdx-=m.chop*ak*m.dx*m.dz*sn;dZdz-=m.chop*ak*m.dz*m.dz*sn;
      }
    }
    const nx=dYdz*dZdx-dZdz*dYdx,ny=dZdz*dXdx-dXdz*dZdx,nz=dXdz*dYdx-dYdz*dXdx;
    const nl=Math.hypot(nx,ny,nz)||1;
    return {height:h,horizontal:[hx,hz],velocity:[vx,vy,vz],normal:[nx/nl,ny/nl,nz/nl],jacobian:dXdx*dZdz-dXdz*dZdx};
  }
  function samplePhysics(x,z,t=water.time){
    let h=0,vx=0,vy=0,vz=0,dYdx=0,dYdz=0;
    for(const m of state.physicsModes){
      const ph=m.kx*x+m.kz*z-m.omega*t+m.phase,sn=Math.sin(ph),cs=Math.cos(ph);
      h+=m.amp*sn;vy-=m.amp*m.omega*cs;
      vx+=m.chop*m.amp*m.dx*m.omega*sn;vz+=m.chop*m.amp*m.dz*m.omega*sn;
      dYdx+=m.amp*m.kx*cs;dYdz+=m.amp*m.kz*cs;
    }
    const inv=1/Math.hypot(dYdx,1,dYdz);
    return {height:h,velocity:[vx,vy,vz],normal:[-dYdx*inv,inv,-dYdz*inv],jacobian:1};
  }
  function sample(x,z,t=water.time){
    let sx=x,sz=z;
    for(let i=0;i<3;i++){const q=sampleRaw(sx,sz,t,true);sx=x-q.horizontal[0];sz=z-q.horizontal[1];}
    const q=sampleRaw(sx,sz,t,true);q.source=[sx,sz];return q;
  }

  water.setSea=function(U10,fromDeg){rebuildSpectrum(Math.max(.1,U10),fromDeg);};
  water.height=function(x,z){return samplePhysics(x,z,this.time).height;};
  water.velocity=function(x,z,out){const v=samplePhysics(x,z,this.time).velocity;out.set(v[0],v[1],v[2]);return out;};
  water.update=function(t,camera,center){
    this.time=t;state.time=t;uniforms.uTime.value=t;uniforms.uCamPos.value.copy(camera.position);
    const spacing=params.nearSizeM/params.nearSegments;state.gridSpacingM=spacing;
    this.meshNear.position.set(Math.round(center.x/spacing)*spacing,0,Math.round(center.z/spacing)*spacing);
    this.meshFar.position.set(center.x,-.012,center.z);
    master.boat.getWorldPosition(uniforms.uBoatPos.value);
    master.boat.getWorldQuaternion(tmpQuat);
    uniforms.uBoatForward.value.set(0,0,1).applyQuaternion(tmpQuat).normalize();
    const sogKn=window.__sim?.get?.().sog||0;
    uniforms.uBoatSpeed.value=Math.max(0,sogKn/1.943844);
  };

  const nearGeom=new PlaneGeometry(params.nearSizeM,params.nearSizeM,params.nearSegments,params.nearSegments);nearGeom.rotateX(-Math.PI/2);
  const farGeom=new RingGeometry(params.farInnerM,params.farOuterM,params.farAngularSegments,params.farRadialSegments);farGeom.rotateX(-Math.PI/2);
  const nearMat=new ShaderMaterial({name:"Laser2ExtremeOceanNearV4",vertexShader,fragmentShader,uniforms,depthWrite:true,depthTest:true,transparent:false});
  const farMat=new ShaderMaterial({name:"Laser2ExtremeOceanFarV4",vertexShader,fragmentShader,uniforms:uniformsFar,depthWrite:true,depthTest:true,transparent:false});
  nearMat.toneMapped=true;farMat.toneMapped=true;
  water.meshNear.geometry=nearGeom;water.meshNear.material=nearMat;water.meshNear.frustumCulled=false;water.meshNear.renderOrder=-2;
  water.meshFar.geometry=farGeom;water.meshFar.material=farMat;water.meshFar.frustumCulled=false;water.meshFar.renderOrder=-3;
  water.matNear=nearMat;water.matFar=farMat;water.uniforms=uniforms;water.uniformsFar=uniformsFar;
  const tmpQuat=master.boat.quaternion.clone();
  rebuildSpectrum(state.windSpeedMps,state.windFromDeg);

  let reflectionRT=null,refractionRT=null,mirrorCam=null,rtCtor=null;
  const reflVP=new Matrix4(),mainVP=new Matrix4();
  const tmpForward=new Vec3(),tmpTarget=new Vec3(),tmpUp=new Vec3();
  function ensureRenderTargets(){
    if(!params.sceneOptics)return false;
    if(!rtCtor){master.scene.traverse(o=>{if(!rtCtor&&o.isDirectionalLight&&o.shadow?.map)rtCtor=o.shadow.map.constructor;});}
    if(!rtCtor)return false;
    const canvas=master.renderer.domElement,w=Math.max(256,Math.floor(canvas.width*params.reflectionScale)),h=Math.max(192,Math.floor(canvas.height*params.reflectionScale));
    if(!reflectionRT){
      reflectionRT=new rtCtor(w,h,{depthBuffer:true,stencilBuffer:false,samples:0});
      refractionRT=new rtCtor(w,h,{depthBuffer:true,stencilBuffer:false,samples:0});
      reflectionRT.texture.name="Laser2V4PlanarReflection";refractionRT.texture.name="Laser2V4SceneRefraction";
      uniforms.uReflectionTex.value=reflectionRT.texture;uniforms.uRefractionTex.value=refractionRT.texture;
      mirrorCam=master.camera.clone();state.reflectionReady=true;
    }else if(reflectionRT.width!==w||reflectionRT.height!==h){reflectionRT.setSize(w,h);refractionRT.setSize(w,h);}
    return true;
  }
  function renderSceneOptics(){
    state.frame++;
    if(!params.sceneOptics||state.frame%params.reflectionStride!==0){uniforms.uSceneOptics.value=0;return;}
    if(!ensureRenderTargets()){uniforms.uSceneOptics.value=0;return;}
    const renderer=master.renderer,scene=master.scene,cam=master.camera;
    cam.updateMatrixWorld(true);
    mirrorCam.projectionMatrix.copy(cam.projectionMatrix);mirrorCam.projectionMatrixInverse.copy(cam.projectionMatrixInverse);
    mirrorCam.position.copy(cam.position);mirrorCam.position.y=-cam.position.y;
    tmpForward.set(0,0,-1).applyQuaternion(cam.quaternion);tmpTarget.copy(cam.position).addScaledVector(tmpForward,100);tmpTarget.y=-tmpTarget.y;
    tmpUp.set(0,1,0).applyQuaternion(cam.quaternion);tmpUp.y=-tmpUp.y;mirrorCam.up.copy(tmpUp.normalize());mirrorCam.lookAt(tmpTarget);mirrorCam.updateMatrixWorld(true);
    reflVP.multiplyMatrices(mirrorCam.projectionMatrix,mirrorCam.matrixWorldInverse);uniforms.uReflectionVP.value.copy(reflVP);
    mainVP.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse);uniforms.uMainVP.value.copy(mainVP);
    const oldRT=renderer.getRenderTarget(),nearVis=water.meshNear.visible,farVis=water.meshFar.visible,oldAuto=renderer.shadowMap.autoUpdate;
    water.meshNear.visible=false;water.meshFar.visible=false;renderer.shadowMap.autoUpdate=false;
    try{
      renderer.setRenderTarget(reflectionRT);renderer.clear(true,true,true);renderer.render(scene,mirrorCam);
      renderer.setRenderTarget(refractionRT);renderer.clear(true,true,true);renderer.render(scene,cam);
      state.offscreenFrames++;uniforms.uSceneOptics.value=1;
    }catch(e){state.lastError=String(e?.stack||e);uniforms.uSceneOptics.value=0;console.error(VERSION+" optics pass",e);}
    finally{renderer.setRenderTarget(oldRT);renderer.shadowMap.autoUpdate=oldAuto;water.meshNear.visible=nearVis;water.meshFar.visible=farVis;}
  }
  window.LASER2_FRAME_HOOKS=window.LASER2_FRAME_HOOKS||[];window.LASER2_FRAME_HOOKS.push(renderSceneOptics);

  function validateSpectrum(samples=4096){
    let sum=0,sum2=0,min=Infinity,max=-Infinity,minJ=Infinity;
    const n=Math.max(64,samples|0);
    for(let i=0;i<n;i++){
      const x=(hash(i*17.13+3.1)-.5)*420,z=(hash(i*41.77+9.4)-.5)*420,q=sampleRaw(x,z,state.time,true),h=q.height;
      sum+=h;sum2+=h*h;min=Math.min(min,h);max=Math.max(max,h);minJ=Math.min(minJ,q.jacobian);
    }
    const mean=sum/n,std=Math.sqrt(Math.max(0,sum2/n-mean*mean));
    return {samples:n,meanHeightM:mean,rmsHeightM:std,estimatedHsM:4*std,targetHsM:state.HsM,minHeightM:min,maxHeightM:max,minJacobian:minJ,relativeHsError:Math.abs(4*std-state.HsM)/Math.max(state.HsM,.001)};
  }
  function metrics(){return {version:VERSION,timeS:state.time,HsM:state.HsM,TpS:state.TpS,windHsM:state.windHsM,swellHsM:params.swellHsM,windSpeedMps:state.windSpeedMps,windFromDeg:state.windFromDeg,fetchKm:params.fetchM/1000,depthM:params.depthM,gamma:params.gamma,macroModes:state.modes.length,microModes:state.micro.length,physicsModes:state.physicsModes.length,physicsVarianceCoverage:state.physicsVarianceCoverage,spectrumVariance:state.spectrumVariance,sceneOptics:uniforms.uSceneOptics.value>0,reflectionReady:state.reflectionReady,offscreenFrames:state.offscreenFrames,gridSpacingM:state.gridSpacingM,lastError:state.lastError,validation:state.validation||validateSpectrum(1024)};}

  function addUI(){
    const panel=document.querySelector('.laser2-lab');if(!panel||panel.querySelector('#laser2-ocean-v4'))return;
    const title=panel.querySelector('h2');if(title)title.textContent='BIOMECH + RIG + OCEAN LAB V4';
    const sec=document.createElement('section');sec.id='laser2-ocean-v4';sec.innerHTML=`<h3>EXTREME OCEAN · SPECTRUM / OPTICS</h3>
      <table><tbody>
      <tr><td>model</td><td id="o4-model">JONSWAP/TMA + swell</td></tr><tr><td>sea state</td><td id="o4-sea">—</td></tr><tr><td>spectrum</td><td id="o4-modes">—</td></tr>
      <tr><td>fetch</td><td><input id="o4-fetch" type="range" min="1" max="80" step="1" value="12"> <span id="o4-fetch-v">12 km</span></td></tr>
      <tr><td>depth</td><td><input id="o4-depth" type="range" min="3" max="120" step="1" value="28"> <span id="o4-depth-v">28 m</span></td></tr>
      <tr><td>JONSWAP γ</td><td><input id="o4-gamma" type="range" min="1" max="7" step="0.1" value="3.3"> <span id="o4-gamma-v">3.3</span></td></tr>
      <tr><td>swell Hs</td><td><input id="o4-swell" type="range" min="0" max="1.6" step="0.02" value="0.22"> <span id="o4-swell-v">0.22 m</span></td></tr>
      <tr><td>choppiness</td><td><input id="o4-chop" type="range" min="0" max="1.25" step="0.01" value="0.88"> <span id="o4-chop-v">0.88</span></td></tr>
      <tr><td>clarity</td><td><input id="o4-clarity" type="range" min="0.15" max="1" step="0.01" value="0.76"> <span id="o4-clarity-v">0.76</span></td></tr>
      <tr><td>scene optics</td><td><label><input id="o4-optics" type="checkbox" checked> planar reflection + refraction</label></td></tr>
      </tbody></table><div class="truth">HULL PHYSICS USES THE ENERGETIC HULL-RESOLVED SUBSET OF THE SAME FINITE-DEPTH SPECTRUM; THE RENDERER ADDS SHORT/DIRECTIONAL DETAIL FILTERED BY A 4.4 M HULL. GERSTNER/STOKES IS THE NONLINEAR EVALUATOR, NOT THE SEA-STATE GENERATOR.</div>`;
    panel.appendChild(sec);
    const bind=(id,key,scale=1,fmt=v=>String(v))=>{const el=sec.querySelector('#'+id),out=sec.querySelector('#'+id+'-v');el.addEventListener('input',()=>{params[key]=+el.value*scale;if(out)out.textContent=fmt(params[key]);rebuildSpectrum(state.windSpeedMps,state.windFromDeg);});};
    bind('o4-fetch','fetchM',1000,v=>(v/1000).toFixed(0)+' km');bind('o4-depth','depthM',1,v=>v.toFixed(0)+' m');bind('o4-gamma','gamma',1,v=>v.toFixed(1));bind('o4-swell','swellHsM',1,v=>v.toFixed(2)+' m');bind('o4-chop','chop',1,v=>v.toFixed(2));
    const clarity=sec.querySelector('#o4-clarity'),clarityV=sec.querySelector('#o4-clarity-v');clarity.addEventListener('input',()=>{params.clarity=+clarity.value;uniforms.uClarity.value=params.clarity;clarityV.textContent=params.clarity.toFixed(2);});
    sec.querySelector('#o4-optics').addEventListener('change',e=>{params.sceneOptics=e.target.checked;if(!params.sceneOptics)uniforms.uSceneOptics.value=0;});
  }
  function refreshUI(){
    addUI();const m=metrics(),set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
    set('o4-sea',`Hs ${m.HsM.toFixed(2)} m · Tp ${m.TpS.toFixed(2)} s`);set('o4-modes',`${m.macroModes} render · ${m.physicsModes} hull · ${m.microModes} capillary`);
    let hud=document.getElementById('laser2-o4-hud');if(!hud){const a=document.querySelector('.bottom-left .rig-state:last-of-type')||document.querySelector('.bottom-left');if(a){hud=document.createElement('div');hud.id='laser2-o4-hud';hud.className='rig-state';a.after(hud);}}
    if(hud)hud.textContent=`OCEAN V4 · JONSWAP Hs ${m.HsM.toFixed(2)} m · Tp ${m.TpS.toFixed(1)} s · ${m.macroModes}R/${m.physicsModes}H+${m.microModes}µ MODES · OPTICS ${m.sceneOptics?'ON':'WARMUP'}`;
  }
  const oldLabMetrics=window.__labMetrics;window.__labMetrics=function(){const b=typeof oldLabMetrics==='function'?oldLabMetrics():{};return {...b,oceanV4:metrics()};};
  window.LASER2_OCEAN_V4={VERSION,params,state,receipt,sample,samplePhysics,metrics,rebuildSpectrum,validateSpectrum,original,restore(){water.setSea=original.setSea;water.height=original.height;water.velocity=original.velocity;water.update=original.update;water.meshNear.geometry=original.geomNear;water.meshNear.material=original.matNear;water.meshFar.geometry=original.geomFar;water.meshFar.material=original.matFar;}};
  let lastUI=0;function uiFrame(t){if(t-lastUI>350){refreshUI();lastUI=t}requestAnimationFrame(uiFrame);}requestAnimationFrame(uiFrame);
  state.shaderReady=true;document.title='Laser 2 — Biomechanics + Rigging + Extreme Ocean V4';
  console.info(VERSION+' initialized',metrics());
})();
