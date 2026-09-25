(()=>{var N0=Object.defineProperty,pc=(e,t,i)=>()=>{if(i)throw i[0];try{return e&&(t=e(e=0)),t}catch(r){throw i=[r],r}},I0=(e,t)=>{for(var i in t)N0(e,i,{get:t[i],enumerable:!0})};function _r(){let e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(It[e&255]+It[e>>8&255]+It[e>>16&255]+It[e>>24&255]+"-"+It[t&255]+It[t>>8&255]+"-"+It[t>>16&15|64]+It[t>>24&255]+"-"+It[i&63|128]+It[i>>8&255]+"-"+It[i>>16&255]+It[i>>24&255]+It[r&255]+It[r>>8&255]+It[r>>16&255]+It[r>>24&255]).toLowerCase()}function Ut(e,t,i){return Math.max(t,Math.min(i,e))}function wo(e,t){return(e%t+t)%t}function O0(e,t,i,r,a){return r+(e-t)*(a-r)/(i-t)}function F0(e,t,i){return e!==t?(i-e)/(t-e):0}function en(e,t,i){return(1-i)*e+i*t}function z0(e,t,i,r){return en(e,t,1-Math.exp(-i*r))}function k0(e,t=1){return t-Math.abs(wo(e,t*2)-t)}function B0(e,t,i){return e<=t?0:e>=i?1:(e=(e-t)/(i-t),e*e*(3-2*e))}function V0(e,t,i){return e<=t?0:e>=i?1:(e=(e-t)/(i-t),e*e*e*(e*(e*6-15)+10))}function H0(e,t){return e+Math.floor(Math.random()*(t-e+1))}function G0(e,t){return e+Math.random()*(t-e)}function W0(e){return e*(.5-Math.random())}function X0(e){e!==void 0&&(Il=e);let t=Il+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function j0(e){return e*Aa}function q0(e){return e*Ra}function Eo(e){return(e&e-1)===0&&e!==0}function Y0(e){return Math.pow(2,Math.ceil(Math.log(e)/Math.LN2))}function Qn(e){return Math.pow(2,Math.floor(Math.log(e)/Math.LN2))}function K0(e,t,i,r,a){let n=Math.cos,o=Math.sin,s=n(i/2),l=o(i/2),h=n((t+r)/2),c=o((t+r)/2),u=n((t-r)/2),p=o((t-r)/2),m=n((r-t)/2),g=o((r-t)/2);switch(a){case"XYX":e.set(s*c,l*u,l*p,s*h);break;case"YZY":e.set(l*p,s*c,l*u,s*h);break;case"ZXZ":e.set(l*u,l*p,s*c,s*h);break;case"XZX":e.set(s*c,l*g,l*m,s*h);break;case"YXY":e.set(l*m,s*c,l*g,s*h);break;case"ZYZ":e.set(l*g,l*m,s*c,s*h);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+a)}}function xa(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return e/4294967295;case Uint16Array:return e/65535;case Uint8Array:return e/255;case Int32Array:return Math.max(e/2147483647,-1);case Int16Array:return Math.max(e/32767,-1);case Int8Array:return Math.max(e/127,-1);default:throw new Error("Invalid component type.")}}function jt(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return Math.round(e*4294967295);case Uint16Array:return Math.round(e*65535);case Uint8Array:return Math.round(e*255);case Int32Array:return Math.round(e*2147483647);case Int16Array:return Math.round(e*32767);case Int8Array:return Math.round(e*127);default:throw new Error("Invalid component type.")}}function mc(e){for(let t=e.length-1;t>=0;--t)if(e[t]>=65535)return!0;return!1}function $n(e){return document.createElementNS("http://www.w3.org/1999/xhtml",e)}function J0(){let e=$n("canvas");return e.style.display="block",e}function tn(e){e in Ol||(Ol[e]=!0,console.warn(e))}function ya(e){return e<.04045?e*.0773993808:Math.pow(e*.9478672986+.0521327014,2.4)}function To(e){return e<.0031308?e*12.92:1.055*Math.pow(e,.41666)-.055}function Ao(e){return typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap?kl.getDataURL(e):e.data?{data:Array.from(e.data),width:e.width,height:e.height,type:e.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}function Ro(e,t,i,r,a){for(let n=0,o=e.length-3;n<=o;n+=3){wr.fromArray(e,n);let s=a.x*Math.abs(wr.x)+a.y*Math.abs(wr.y)+a.z*Math.abs(wr.z),l=t.dot(wr),h=i.dot(wr),c=r.dot(wr);if(Math.max(-Math.max(l,h,c),Math.min(l,h,c))>s)return!1}return!0}function Co(e,t,i){return i<0&&(i+=1),i>1&&(i-=1),i<1/6?e+(t-e)*6*i:i<1/2?t:i<2/3?e+(t-e)*6*(2/3-i):e}function Z0(e,t,i,r,a,n,o,s){let l;if(t.side===Vt?l=r.intersectTriangle(o,n,a,!0,s):l=r.intersectTriangle(a,n,o,t.side===tr,s),l===null)return null;In.copy(s),In.applyMatrix4(e.matrixWorld);let h=i.ray.origin.distanceTo(In);return h<i.near||h>i.far?null:{distance:h,point:In.clone(),object:e}}function es(e,t,i,r,a,n,o,s,l,h){e.getVertexPosition(s,Zr),e.getVertexPosition(l,Qr),e.getVertexPosition(h,$r);let c=Z0(e,t,i,r,Zr,Qr,$r,Nn);if(c){a&&(Pn.fromBufferAttribute(a,s),Dn.fromBufferAttribute(a,l),Un.fromBufferAttribute(a,h),c.uv=Tn.getInterpolation(Nn,Zr,Qr,$r,Pn,Dn,Un,new xe)),n&&(Pn.fromBufferAttribute(n,s),Dn.fromBufferAttribute(n,l),Un.fromBufferAttribute(n,h),c.uv1=Tn.getInterpolation(Nn,Zr,Qr,$r,Pn,Dn,Un,new xe),c.uv2=c.uv1),o&&(ah.fromBufferAttribute(o,s),nh.fromBufferAttribute(o,l),sh.fromBufferAttribute(o,h),c.normal=Tn.getInterpolation(Nn,Zr,Qr,$r,ah,nh,sh,new v),c.normal.dot(r.direction)>0&&c.normal.multiplyScalar(-1));let u={a:s,b:l,c:h,normal:new v,materialIndex:0};Tn.getNormal(Zr,Qr,$r,u.normal),c.face=u}return c}function Ma(e){let t={};for(let i in e){t[i]={};for(let r in e[i]){let a=e[i][r];a&&(a.isColor||a.isMatrix3||a.isMatrix4||a.isVector2||a.isVector3||a.isVector4||a.isTexture||a.isQuaternion)?a.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[i][r]=null):t[i][r]=a.clone():Array.isArray(a)?t[i][r]=a.slice():t[i][r]=a}}return t}function qt(e){let t={};for(let i=0;i<e.length;i++){let r=Ma(e[i]);for(let a in r)t[a]=r[a]}return t}function Q0(e){let t=[];for(let i=0;i<e.length;i++)t.push(e[i].clone());return t}function fc(e){return e.getRenderTarget()===null?e.outputColorSpace:it.workingColorSpace}function gc(){let e=null,t=!1,i=null,r=null;function a(n,o){i(n,o),r=e.requestAnimationFrame(a)}return{start:function(){t!==!0&&i!==null&&(r=e.requestAnimationFrame(a),t=!0)},stop:function(){e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(n){i=n},setContext:function(n){e=n}}}function $0(e,t){let i=t.isWebGL2,r=new WeakMap;function a(h,c){let u=h.array,p=h.usage,m=u.byteLength,g=e.createBuffer();e.bindBuffer(c,g),e.bufferData(c,u,p),h.onUploadCallback();let _;if(u instanceof Float32Array)_=e.FLOAT;else if(u instanceof Uint16Array)if(h.isFloat16BufferAttribute)if(i)_=e.HALF_FLOAT;else throw new Error("THREE.WebGLAttributes: Usage of Float16BufferAttribute requires WebGL2.");else _=e.UNSIGNED_SHORT;else if(u instanceof Int16Array)_=e.SHORT;else if(u instanceof Uint32Array)_=e.UNSIGNED_INT;else if(u instanceof Int32Array)_=e.INT;else if(u instanceof Int8Array)_=e.BYTE;else if(u instanceof Uint8Array)_=e.UNSIGNED_BYTE;else if(u instanceof Uint8ClampedArray)_=e.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+u);return{buffer:g,type:_,bytesPerElement:u.BYTES_PER_ELEMENT,version:h.version,size:m}}function n(h,c,u){let p=c.array,m=c._updateRange,g=c.updateRanges;if(e.bindBuffer(u,h),m.count===-1&&g.length===0&&e.bufferSubData(u,0,p),g.length!==0){for(let _=0,f=g.length;_<f;_++){let d=g[_];i?e.bufferSubData(u,d.start*p.BYTES_PER_ELEMENT,p,d.start,d.count):e.bufferSubData(u,d.start*p.BYTES_PER_ELEMENT,p.subarray(d.start,d.start+d.count))}c.clearUpdateRanges()}m.count!==-1&&(i?e.bufferSubData(u,m.offset*p.BYTES_PER_ELEMENT,p,m.offset,m.count):e.bufferSubData(u,m.offset*p.BYTES_PER_ELEMENT,p.subarray(m.offset,m.offset+m.count)),m.count=-1),c.onUploadCallback()}function o(h){return h.isInterleavedBufferAttribute&&(h=h.data),r.get(h)}function s(h){h.isInterleavedBufferAttribute&&(h=h.data);let c=r.get(h);c&&(e.deleteBuffer(c.buffer),r.delete(h))}function l(h,c){if(h.isGLBufferAttribute){let p=r.get(h);(!p||p.version<h.version)&&r.set(h,{buffer:h.buffer,type:h.type,bytesPerElement:h.elementSize,version:h.version});return}h.isInterleavedBufferAttribute&&(h=h.data);let u=r.get(h);if(u===void 0)r.set(h,a(h,c));else if(u.version<h.version){if(u.size!==h.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(u.buffer,h,c),u.version=h.version}}return{get:o,remove:s,update:l}}function eg(e,t,i,r,a,n,o){let s=new Ne(0),l=n===!0?0:1,h,c,u=null,p=0,m=null;function g(f,d){let M=!1,x=d.isScene===!0?d.background:null;x&&x.isTexture&&(x=(d.backgroundBlurriness>0?i:t).get(x)),x===null?_(s,l):x&&x.isColor&&(_(x,1),M=!0);let S=e.xr.getEnvironmentBlendMode();S==="additive"?r.buffers.color.setClear(0,0,0,1,o):S==="alpha-blend"&&r.buffers.color.setClear(0,0,0,0,o),(e.autoClear||M)&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),x&&(x.isCubeTexture||x.mapping===hn)?(c===void 0&&(c=new De(new Ft(1,1,1),new Ai({name:"BackgroundCubeMaterial",uniforms:Ma(Ri.backgroundCube.uniforms),vertexShader:Ri.backgroundCube.vertexShader,fragmentShader:Ri.backgroundCube.fragmentShader,side:Vt,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(D,R,L){this.matrixWorld.copyPosition(L.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),a.update(c)),c.material.uniforms.envMap.value=x,c.material.uniforms.flipEnvMap.value=x.isCubeTexture&&x.isRenderTargetTexture===!1?-1:1,c.material.uniforms.backgroundBlurriness.value=d.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=d.backgroundIntensity,c.material.toneMapped=it.getTransfer(x.colorSpace)!==ct,(u!==x||p!==x.version||m!==e.toneMapping)&&(c.material.needsUpdate=!0,u=x,p=x.version,m=e.toneMapping),c.layers.enableAll(),f.unshift(c,c.geometry,c.material,0,0,null)):x&&x.isTexture&&(h===void 0&&(h=new De(new hh(2,2),new Ai({name:"BackgroundMaterial",uniforms:Ma(Ri.background.uniforms),vertexShader:Ri.background.vertexShader,fragmentShader:Ri.background.fragmentShader,side:tr,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),Object.defineProperty(h.material,"map",{get:function(){return this.uniforms.t2D.value}}),a.update(h)),h.material.uniforms.t2D.value=x,h.material.uniforms.backgroundIntensity.value=d.backgroundIntensity,h.material.toneMapped=it.getTransfer(x.colorSpace)!==ct,x.matrixAutoUpdate===!0&&x.updateMatrix(),h.material.uniforms.uvTransform.value.copy(x.matrix),(u!==x||p!==x.version||m!==e.toneMapping)&&(h.material.needsUpdate=!0,u=x,p=x.version,m=e.toneMapping),h.layers.enableAll(),f.unshift(h,h.geometry,h.material,0,0,null))}function _(f,d){f.getRGB(Fn,fc(e)),r.buffers.color.setClear(Fn.r,Fn.g,Fn.b,d,o)}return{getClearColor:function(){return s},setClearColor:function(f,d=1){s.set(f),l=d,_(s,l)},getClearAlpha:function(){return l},setClearAlpha:function(f){l=f,_(s,l)},render:g}}function tg(e,t,i,r){let a=e.getParameter(e.MAX_VERTEX_ATTRIBS),n=r.isWebGL2?null:t.get("OES_vertex_array_object"),o=r.isWebGL2||n!==null,s={},l=f(null),h=l,c=!1;function u(P,z,C,G,O){let U=!1;if(o){let K=_(G,C,z);h!==K&&(h=K,m(h.object)),U=d(P,G,C,O),U&&M(P,G,C,O)}else{let K=z.wireframe===!0;(h.geometry!==G.id||h.program!==C.id||h.wireframe!==K)&&(h.geometry=G.id,h.program=C.id,h.wireframe=K,U=!0)}O!==null&&i.update(O,e.ELEMENT_ARRAY_BUFFER),(U||c)&&(c=!1,B(P,z,C,G),O!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,i.get(O).buffer))}function p(){return r.isWebGL2?e.createVertexArray():n.createVertexArrayOES()}function m(P){return r.isWebGL2?e.bindVertexArray(P):n.bindVertexArrayOES(P)}function g(P){return r.isWebGL2?e.deleteVertexArray(P):n.deleteVertexArrayOES(P)}function _(P,z,C){let G=C.wireframe===!0,O=s[P.id];O===void 0&&(O={},s[P.id]=O);let U=O[z.id];U===void 0&&(U={},O[z.id]=U);let K=U[G];return K===void 0&&(K=f(p()),U[G]=K),K}function f(P){let z=[],C=[],G=[];for(let O=0;O<a;O++)z[O]=0,C[O]=0,G[O]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:z,enabledAttributes:C,attributeDivisors:G,object:P,attributes:{},index:null}}function d(P,z,C,G){let O=h.attributes,U=z.attributes,K=0,j=C.getAttributes();for(let I in j)if(j[I].location>=0){let W=O[I],he=U[I];if(he===void 0&&(I==="instanceMatrix"&&P.instanceMatrix&&(he=P.instanceMatrix),I==="instanceColor"&&P.instanceColor&&(he=P.instanceColor)),W===void 0||W.attribute!==he||he&&W.data!==he.data)return!0;K++}return h.attributesNum!==K||h.index!==G}function M(P,z,C,G){let O={},U=z.attributes,K=0,j=C.getAttributes();for(let I in j)if(j[I].location>=0){let W=U[I];W===void 0&&(I==="instanceMatrix"&&P.instanceMatrix&&(W=P.instanceMatrix),I==="instanceColor"&&P.instanceColor&&(W=P.instanceColor));let he={};he.attribute=W,W&&W.data&&(he.data=W.data),O[I]=he,K++}h.attributes=O,h.attributesNum=K,h.index=G}function x(){let P=h.newAttributes;for(let z=0,C=P.length;z<C;z++)P[z]=0}function S(P){D(P,0)}function D(P,z){let C=h.newAttributes,G=h.enabledAttributes,O=h.attributeDivisors;C[P]=1,G[P]===0&&(e.enableVertexAttribArray(P),G[P]=1),O[P]!==z&&((r.isWebGL2?e:t.get("ANGLE_instanced_arrays"))[r.isWebGL2?"vertexAttribDivisor":"vertexAttribDivisorANGLE"](P,z),O[P]=z)}function R(){let P=h.newAttributes,z=h.enabledAttributes;for(let C=0,G=z.length;C<G;C++)z[C]!==P[C]&&(e.disableVertexAttribArray(C),z[C]=0)}function L(P,z,C,G,O,U,K){K===!0?e.vertexAttribIPointer(P,z,C,O,U):e.vertexAttribPointer(P,z,C,G,O,U)}function B(P,z,C,G){if(r.isWebGL2===!1&&(P.isInstancedMesh||G.isInstancedBufferGeometry)&&t.get("ANGLE_instanced_arrays")===null)return;x();let O=G.attributes,U=C.getAttributes(),K=z.defaultAttributeValues;for(let j in U){let I=U[j];if(I.location>=0){let W=O[j];if(W===void 0&&(j==="instanceMatrix"&&P.instanceMatrix&&(W=P.instanceMatrix),j==="instanceColor"&&P.instanceColor&&(W=P.instanceColor)),W!==void 0){let he=W.normalized,me=W.itemSize,q=i.get(W);if(q===void 0)continue;let $=q.buffer,pe=q.type,ne=q.bytesPerElement,re=r.isWebGL2===!0&&(pe===e.INT||pe===e.UNSIGNED_INT||W.gpuType===Yo);if(W.isInterleavedBufferAttribute){let T=W.data,ae=T.stride,te=W.offset;if(T.isInstancedInterleavedBuffer){for(let ie=0;ie<I.locationSize;ie++)D(I.location+ie,T.meshPerAttribute);P.isInstancedMesh!==!0&&G._maxInstanceCount===void 0&&(G._maxInstanceCount=T.meshPerAttribute*T.count)}else for(let ie=0;ie<I.locationSize;ie++)S(I.location+ie);e.bindBuffer(e.ARRAY_BUFFER,$);for(let ie=0;ie<I.locationSize;ie++)L(I.location+ie,me/I.locationSize,pe,he,ae*ne,(te+me/I.locationSize*ie)*ne,re)}else{if(W.isInstancedBufferAttribute){for(let T=0;T<I.locationSize;T++)D(I.location+T,W.meshPerAttribute);P.isInstancedMesh!==!0&&G._maxInstanceCount===void 0&&(G._maxInstanceCount=W.meshPerAttribute*W.count)}else for(let T=0;T<I.locationSize;T++)S(I.location+T);e.bindBuffer(e.ARRAY_BUFFER,$);for(let T=0;T<I.locationSize;T++)L(I.location+T,me/I.locationSize,pe,he,me*ne,me/I.locationSize*T*ne,re)}}else if(K!==void 0){let he=K[j];if(he!==void 0)switch(he.length){case 2:e.vertexAttrib2fv(I.location,he);break;case 3:e.vertexAttrib3fv(I.location,he);break;case 4:e.vertexAttrib4fv(I.location,he);break;default:e.vertexAttrib1fv(I.location,he)}}}}R()}function b(){V();for(let P in s){let z=s[P];for(let C in z){let G=z[C];for(let O in G)g(G[O].object),delete G[O];delete z[C]}delete s[P]}}function E(P){if(s[P.id]===void 0)return;let z=s[P.id];for(let C in z){let G=z[C];for(let O in G)g(G[O].object),delete G[O];delete z[C]}delete s[P.id]}function F(P){for(let z in s){let C=s[z];if(C[P.id]===void 0)continue;let G=C[P.id];for(let O in G)g(G[O].object),delete G[O];delete C[P.id]}}function V(){Q(),c=!0,h!==l&&(h=l,m(h.object))}function Q(){l.geometry=null,l.program=null,l.wireframe=!1}return{setup:u,reset:V,resetDefaultState:Q,dispose:b,releaseStatesOfGeometry:E,releaseStatesOfProgram:F,initAttributes:x,enableAttribute:S,disableUnusedAttributes:R}}function ig(e,t,i,r){let a=r.isWebGL2,n;function o(c){n=c}function s(c,u){e.drawArrays(n,c,u),i.update(u,n,1)}function l(c,u,p){if(p===0)return;let m,g;if(a)m=e,g="drawArraysInstanced";else if(m=t.get("ANGLE_instanced_arrays"),g="drawArraysInstancedANGLE",m===null){console.error("THREE.WebGLBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}m[g](n,c,u,p),i.update(u,n,p)}function h(c,u,p){if(p===0)return;let m=t.get("WEBGL_multi_draw");if(m===null)for(let g=0;g<p;g++)this.render(c[g],u[g]);else{m.multiDrawArraysWEBGL(n,c,0,u,0,p);let g=0;for(let _=0;_<p;_++)g+=u[_];i.update(g,n,1)}}this.setMode=o,this.render=s,this.renderInstances=l,this.renderMultiDraw=h}function rg(e,t,i){let r;function a(){if(r!==void 0)return r;if(t.has("EXT_texture_filter_anisotropic")===!0){let L=t.get("EXT_texture_filter_anisotropic");r=e.getParameter(L.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function n(L){if(L==="highp"){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return"highp";L="mediump"}return L==="mediump"&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let o=typeof WebGL2RenderingContext<"u"&&e.constructor.name==="WebGL2RenderingContext",s=i.precision!==void 0?i.precision:"highp",l=n(s);l!==s&&(console.warn("THREE.WebGLRenderer:",s,"not supported, using",l,"instead."),s=l);let h=o||t.has("WEBGL_draw_buffers"),c=i.logarithmicDepthBuffer===!0,u=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),p=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),_=e.getParameter(e.MAX_VERTEX_ATTRIBS),f=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),d=e.getParameter(e.MAX_VARYING_VECTORS),M=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),x=p>0,S=o||t.has("OES_texture_float"),D=x&&S,R=o?e.getParameter(e.MAX_SAMPLES):0;return{isWebGL2:o,drawBuffers:h,getMaxAnisotropy:a,getMaxPrecision:n,precision:s,logarithmicDepthBuffer:c,maxTextures:u,maxVertexTextures:p,maxTextureSize:m,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:f,maxVaryings:d,maxFragmentUniforms:M,vertexTextures:x,floatFragmentTextures:S,floatVertexTextures:D,maxSamples:R}}function ag(e){let t=this,i=null,r=0,a=!1,n=!1,o=new Tr,s=new Xe,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,p){let m=u.length!==0||p||r!==0||a;return a=p,r=u.length,m},this.beginShadows=function(){n=!0,c(null)},this.endShadows=function(){n=!1},this.setGlobalState=function(u,p){i=c(u,p,0)},this.setState=function(u,p,m){let g=u.clippingPlanes,_=u.clipIntersection,f=u.clipShadows,d=e.get(u);if(!a||g===null||g.length===0||n&&!f)n?c(null):h();else{let M=n?0:r,x=M*4,S=d.clippingState||null;l.value=S,S=c(g,p,x,m);for(let D=0;D!==x;++D)S[D]=i[D];d.clippingState=S,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=M}};function h(){l.value!==i&&(l.value=i,l.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function c(u,p,m,g){let _=u!==null?u.length:0,f=null;if(_!==0){if(f=l.value,g!==!0||f===null){let d=m+_*4,M=p.matrixWorldInverse;s.getNormalMatrix(M),(f===null||f.length<d)&&(f=new Float32Array(d));for(let x=0,S=m;x!==_;++x,S+=4)o.copy(u[x]).applyMatrix4(M,s),o.normal.toArray(f,S),f[S+3]=o.constant}l.value=f,l.needsUpdate=!0}return t.numPlanes=_,t.numIntersection=0,f}}function ng(e){let t=new WeakMap;function i(o,s){return s===hs?o.mapping=Fr:s===cs&&(o.mapping=zr),o}function r(o){if(o&&o.isTexture){let s=o.mapping;if(s===hs||s===cs)if(t.has(o)){let l=t.get(o).texture;return i(l,o.mapping)}else{let l=o.image;if(l&&l.height>0){let h=new ed(l.height/2);return h.fromEquirectangularTexture(e,o),t.set(o,h),o.addEventListener("dispose",a),i(h.texture,o.mapping)}else return null}}return o}function a(o){let s=o.target;s.removeEventListener("dispose",a);let l=t.get(s);l!==void 0&&(t.delete(s),l.dispose())}function n(){t=new WeakMap}return{get:r,dispose:n}}function sg(e){let t=[],i=[],r=[],a=e,n=e-ia+1+uh.length;for(let o=0;o<n;o++){let s=Math.pow(2,a);i.push(s);let l=1/s;o>e-ia?l=uh[o-e+ia-1]:o===0&&(l=0),r.push(l);let h=1/(s-2),c=-h,u=1+h,p=[c,c,u,c,u,u,c,c,u,u,c,u],m=6,g=6,_=3,f=2,d=1,M=new Float32Array(_*g*m),x=new Float32Array(f*g*m),S=new Float32Array(d*g*m);for(let R=0;R<m;R++){let L=R%3*2/3-1,B=R>2?0:-1,b=[L,B,0,L+2/3,B,0,L+2/3,B+1,0,L,B,0,L+2/3,B+1,0,L,B+1,0];M.set(b,_*g*R),x.set(p,f*g*R);let E=[R,R,R,R,R,R];S.set(E,d*g*R)}let D=new St;D.setAttribute("position",new Ht(M,_)),D.setAttribute("uv",new Ht(x,f)),D.setAttribute("faceIndex",new Ht(S,d)),t.push(D),a>ia&&a--}return{lodPlanes:t,sizeLods:i,sigmas:r}}function _c(e,t,i){let r=new br(e,t,i);return r.texture.mapping=hn,r.texture.name="PMREM.cubeUv",r.scissorTest=!0,r}function ts(e,t,i,r,a){e.viewport.set(t,i,r,a),e.scissor.set(t,i,r,a)}function og(e,t,i){let r=new Float32Array(Rr),a=new v(0,1,0);return new Ai({name:"SphericalGaussianBlur",defines:{n:Rr,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/i,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:r},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:a}},vertexShader:Lo(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:ir,depthTest:!1,depthWrite:!1})}function vc(){return new Ai({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Lo(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:ir,depthTest:!1,depthWrite:!1})}function xc(){return new Ai({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Lo(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:ir,depthTest:!1,depthWrite:!1})}function Lo(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function lg(e){let t=new WeakMap,i=null;function r(s){if(s&&s.isTexture){let l=s.mapping,h=l===hs||l===cs,c=l===Fr||l===zr;if(h||c)if(s.isRenderTargetTexture&&s.needsPMREMUpdate===!0){s.needsPMREMUpdate=!1;let u=t.get(s);return i===null&&(i=new Hs(e)),u=h?i.fromEquirectangular(s,u):i.fromCubemap(s,u),t.set(s,u),u.texture}else{if(t.has(s))return t.get(s).texture;{let u=s.image;if(h&&u&&u.height>0||c&&u&&a(u)){i===null&&(i=new Hs(e));let p=h?i.fromEquirectangular(s):i.fromCubemap(s);return t.set(s,p),s.addEventListener("dispose",n),p.texture}else return null}}}return s}function a(s){let l=0,h=6;for(let c=0;c<h;c++)s[c]!==void 0&&l++;return l===h}function n(s){let l=s.target;l.removeEventListener("dispose",n);let h=t.get(l);h!==void 0&&(t.delete(l),h.dispose())}function o(){t=new WeakMap,i!==null&&(i.dispose(),i=null)}return{get:r,dispose:o}}function hg(e){let t={};function i(r){if(t[r]!==void 0)return t[r];let a;switch(r){case"WEBGL_depth_texture":a=e.getExtension("WEBGL_depth_texture")||e.getExtension("MOZ_WEBGL_depth_texture")||e.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":a=e.getExtension("EXT_texture_filter_anisotropic")||e.getExtension("MOZ_EXT_texture_filter_anisotropic")||e.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":a=e.getExtension("WEBGL_compressed_texture_s3tc")||e.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||e.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":a=e.getExtension("WEBGL_compressed_texture_pvrtc")||e.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:a=e.getExtension(r)}return t[r]=a,a}return{has:function(r){return i(r)!==null},init:function(r){r.isWebGL2?(i("EXT_color_buffer_float"),i("WEBGL_clip_cull_distance")):(i("WEBGL_depth_texture"),i("OES_texture_float"),i("OES_texture_half_float"),i("OES_texture_half_float_linear"),i("OES_standard_derivatives"),i("OES_element_index_uint"),i("OES_vertex_array_object"),i("ANGLE_instanced_arrays")),i("OES_texture_float_linear"),i("EXT_color_buffer_half_float"),i("WEBGL_multisampled_render_to_texture")},get:function(r){let a=i(r);return a===null&&console.warn("THREE.WebGLRenderer: "+r+" extension not supported."),a}}}function cg(e,t,i,r){let a={},n=new WeakMap;function o(u){let p=u.target;p.index!==null&&t.remove(p.index);for(let g in p.attributes)t.remove(p.attributes[g]);for(let g in p.morphAttributes){let _=p.morphAttributes[g];for(let f=0,d=_.length;f<d;f++)t.remove(_[f])}p.removeEventListener("dispose",o),delete a[p.id];let m=n.get(p);m&&(t.remove(m),n.delete(p)),r.releaseStatesOfGeometry(p),p.isInstancedBufferGeometry===!0&&delete p._maxInstanceCount,i.memory.geometries--}function s(u,p){return a[p.id]===!0||(p.addEventListener("dispose",o),a[p.id]=!0,i.memory.geometries++),p}function l(u){let p=u.attributes;for(let g in p)t.update(p[g],e.ARRAY_BUFFER);let m=u.morphAttributes;for(let g in m){let _=m[g];for(let f=0,d=_.length;f<d;f++)t.update(_[f],e.ARRAY_BUFFER)}}function h(u){let p=[],m=u.index,g=u.attributes.position,_=0;if(m!==null){let M=m.array;_=m.version;for(let x=0,S=M.length;x<S;x+=3){let D=M[x+0],R=M[x+1],L=M[x+2];p.push(D,R,R,L,L,D)}}else if(g!==void 0){let M=g.array;_=g.version;for(let x=0,S=M.length/3-1;x<S;x+=3){let D=x+0,R=x+1,L=x+2;p.push(D,R,R,L,L,D)}}else return;let f=new(mc(p)?th:Us)(p,1);f.version=_;let d=n.get(u);d&&t.remove(d),n.set(u,f)}function c(u){let p=n.get(u);if(p){let m=u.index;m!==null&&p.version<m.version&&h(u)}else h(u);return n.get(u)}return{get:s,update:l,getWireframeAttribute:c}}function ug(e,t,i,r){let a=r.isWebGL2,n;function o(m){n=m}let s,l;function h(m){s=m.type,l=m.bytesPerElement}function c(m,g){e.drawElements(n,g,s,m*l),i.update(g,n,1)}function u(m,g,_){if(_===0)return;let f,d;if(a)f=e,d="drawElementsInstanced";else if(f=t.get("ANGLE_instanced_arrays"),d="drawElementsInstancedANGLE",f===null){console.error("THREE.WebGLIndexedBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}f[d](n,g,s,m*l,_),i.update(g,n,_)}function p(m,g,_){if(_===0)return;let f=t.get("WEBGL_multi_draw");if(f===null)for(let d=0;d<_;d++)this.render(m[d]/l,g[d]);else{f.multiDrawElementsWEBGL(n,g,0,s,m,0,_);let d=0;for(let M=0;M<_;M++)d+=g[M];i.update(d,n,1)}}this.setMode=o,this.setIndex=h,this.render=c,this.renderInstances=u,this.renderMultiDraw=p}function dg(e){let t={geometries:0,textures:0},i={frame:0,calls:0,triangles:0,points:0,lines:0};function r(n,o,s){switch(i.calls++,o){case e.TRIANGLES:i.triangles+=s*(n/3);break;case e.LINES:i.lines+=s*(n/2);break;case e.LINE_STRIP:i.lines+=s*(n-1);break;case e.LINE_LOOP:i.lines+=s*n;break;case e.POINTS:i.points+=s*n;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function a(){i.calls=0,i.triangles=0,i.points=0,i.lines=0}return{memory:t,render:i,programs:null,autoReset:!0,reset:a,update:r}}function pg(e,t){return e[0]-t[0]}function mg(e,t){return Math.abs(t[1])-Math.abs(e[1])}function fg(e,t,i){let r={},a=new Float32Array(8),n=new WeakMap,o=new gt,s=[];for(let h=0;h<8;h++)s[h]=[h,0];function l(h,c,u){let p=h.morphTargetInfluences;if(t.isWebGL2===!0){let m=c.morphAttributes.position||c.morphAttributes.normal||c.morphAttributes.color,g=m!==void 0?m.length:0,_=n.get(c);if(_===void 0||_.count!==g){let M=function(){Q.dispose(),n.delete(c),c.removeEventListener("dispose",M)};_!==void 0&&_.texture.dispose();let x=c.morphAttributes.position!==void 0,S=c.morphAttributes.normal!==void 0,D=c.morphAttributes.color!==void 0,R=c.morphAttributes.position||[],L=c.morphAttributes.normal||[],B=c.morphAttributes.color||[],b=0;x===!0&&(b=1),S===!0&&(b=2),D===!0&&(b=3);let E=c.attributes.position.count*b,F=1;E>t.maxTextureSize&&(F=Math.ceil(E/t.maxTextureSize),E=t.maxTextureSize);let V=new Float32Array(E*F*4*g),Q=new Vl(V,E,F,g);Q.type=zi,Q.needsUpdate=!0;let P=b*4;for(let z=0;z<g;z++){let C=R[z],G=L[z],O=B[z],U=E*F*4*z;for(let K=0;K<C.count;K++){let j=K*P;x===!0&&(o.fromBufferAttribute(C,K),V[U+j+0]=o.x,V[U+j+1]=o.y,V[U+j+2]=o.z,V[U+j+3]=0),S===!0&&(o.fromBufferAttribute(G,K),V[U+j+4]=o.x,V[U+j+5]=o.y,V[U+j+6]=o.z,V[U+j+7]=0),D===!0&&(o.fromBufferAttribute(O,K),V[U+j+8]=o.x,V[U+j+9]=o.y,V[U+j+10]=o.z,V[U+j+11]=O.itemSize===4?o.w:1)}}_={count:g,texture:Q,size:new xe(E,F)},n.set(c,_),c.addEventListener("dispose",M)}let f=0;for(let M=0;M<p.length;M++)f+=p[M];let d=c.morphTargetsRelative?1:1-f;u.getUniforms().setValue(e,"morphTargetBaseInfluence",d),u.getUniforms().setValue(e,"morphTargetInfluences",p),u.getUniforms().setValue(e,"morphTargetsTexture",_.texture,i),u.getUniforms().setValue(e,"morphTargetsTextureSize",_.size)}else{let m=p===void 0?0:p.length,g=r[c.id];if(g===void 0||g.length!==m){g=[];for(let x=0;x<m;x++)g[x]=[x,0];r[c.id]=g}for(let x=0;x<m;x++){let S=g[x];S[0]=x,S[1]=p[x]}g.sort(mg);for(let x=0;x<8;x++)x<m&&g[x][1]?(s[x][0]=g[x][0],s[x][1]=g[x][1]):(s[x][0]=Number.MAX_SAFE_INTEGER,s[x][1]=0);s.sort(pg);let _=c.morphAttributes.position,f=c.morphAttributes.normal,d=0;for(let x=0;x<8;x++){let S=s[x],D=S[0],R=S[1];D!==Number.MAX_SAFE_INTEGER&&R?(_&&c.getAttribute("morphTarget"+x)!==_[D]&&c.setAttribute("morphTarget"+x,_[D]),f&&c.getAttribute("morphNormal"+x)!==f[D]&&c.setAttribute("morphNormal"+x,f[D]),a[x]=R,d+=R):(_&&c.hasAttribute("morphTarget"+x)===!0&&c.deleteAttribute("morphTarget"+x),f&&c.hasAttribute("morphNormal"+x)===!0&&c.deleteAttribute("morphNormal"+x),a[x]=0)}let M=c.morphTargetsRelative?1:1-d;u.getUniforms().setValue(e,"morphTargetBaseInfluence",M),u.getUniforms().setValue(e,"morphTargetInfluences",a)}}return{update:l}}function gg(e,t,i,r){let a=new WeakMap;function n(l){let h=r.render.frame,c=l.geometry,u=t.get(l,c);if(a.get(u)!==h&&(t.update(u),a.set(u,h)),l.isInstancedMesh&&(l.hasEventListener("dispose",s)===!1&&l.addEventListener("dispose",s),a.get(l)!==h&&(i.update(l.instanceMatrix,e.ARRAY_BUFFER),l.instanceColor!==null&&i.update(l.instanceColor,e.ARRAY_BUFFER),a.set(l,h))),l.isSkinnedMesh){let p=l.skeleton;a.get(p)!==h&&(p.update(),a.set(p,h))}return u}function o(){a=new WeakMap}function s(l){let h=l.target;h.removeEventListener("dispose",s),i.remove(h.instanceMatrix),h.instanceColor!==null&&i.remove(h.instanceColor)}return{update:n,dispose:o}}function ba(e,t,i){let r=e[0];if(r<=0||r>0)return e;let a=t*i,n=yh[a];if(n===void 0&&(n=new Float32Array(a),yh[a]=n),t!==0){r.toArray(n,0);for(let o=1,s=0;o!==t;++o)s+=i,e[o].toArray(n,s)}return n}function At(e,t){if(e.length!==t.length)return!1;for(let i=0,r=e.length;i<r;i++)if(e[i]!==t[i])return!1;return!0}function Rt(e,t){for(let i=0,r=t.length;i<r;i++)e[i]=t[i]}function is(e,t){let i=Mh[t];i===void 0&&(i=new Int32Array(t),Mh[t]=i);for(let r=0;r!==t;++r)i[r]=e.allocateTextureUnit();return i}function _g(e,t){let i=this.cache;i[0]!==t&&(e.uniform1f(this.addr,t),i[0]=t)}function vg(e,t){let i=this.cache;if(t.x!==void 0)(i[0]!==t.x||i[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),i[0]=t.x,i[1]=t.y);else{if(At(i,t))return;e.uniform2fv(this.addr,t),Rt(i,t)}}function xg(e,t){let i=this.cache;if(t.x!==void 0)(i[0]!==t.x||i[1]!==t.y||i[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),i[0]=t.x,i[1]=t.y,i[2]=t.z);else if(t.r!==void 0)(i[0]!==t.r||i[1]!==t.g||i[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),i[0]=t.r,i[1]=t.g,i[2]=t.b);else{if(At(i,t))return;e.uniform3fv(this.addr,t),Rt(i,t)}}function yg(e,t){let i=this.cache;if(t.x!==void 0)(i[0]!==t.x||i[1]!==t.y||i[2]!==t.z||i[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),i[0]=t.x,i[1]=t.y,i[2]=t.z,i[3]=t.w);else{if(At(i,t))return;e.uniform4fv(this.addr,t),Rt(i,t)}}function Mg(e,t){let i=this.cache,r=t.elements;if(r===void 0){if(At(i,t))return;e.uniformMatrix2fv(this.addr,!1,t),Rt(i,t)}else{if(At(i,r))return;wh.set(r),e.uniformMatrix2fv(this.addr,!1,wh),Rt(i,r)}}function bg(e,t){let i=this.cache,r=t.elements;if(r===void 0){if(At(i,t))return;e.uniformMatrix3fv(this.addr,!1,t),Rt(i,t)}else{if(At(i,r))return;Sh.set(r),e.uniformMatrix3fv(this.addr,!1,Sh),Rt(i,r)}}function Sg(e,t){let i=this.cache,r=t.elements;if(r===void 0){if(At(i,t))return;e.uniformMatrix4fv(this.addr,!1,t),Rt(i,t)}else{if(At(i,r))return;bh.set(r),e.uniformMatrix4fv(this.addr,!1,bh),Rt(i,r)}}function wg(e,t){let i=this.cache;i[0]!==t&&(e.uniform1i(this.addr,t),i[0]=t)}function Eg(e,t){let i=this.cache;if(t.x!==void 0)(i[0]!==t.x||i[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),i[0]=t.x,i[1]=t.y);else{if(At(i,t))return;e.uniform2iv(this.addr,t),Rt(i,t)}}function Tg(e,t){let i=this.cache;if(t.x!==void 0)(i[0]!==t.x||i[1]!==t.y||i[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),i[0]=t.x,i[1]=t.y,i[2]=t.z);else{if(At(i,t))return;e.uniform3iv(this.addr,t),Rt(i,t)}}function Ag(e,t){let i=this.cache;if(t.x!==void 0)(i[0]!==t.x||i[1]!==t.y||i[2]!==t.z||i[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),i[0]=t.x,i[1]=t.y,i[2]=t.z,i[3]=t.w);else{if(At(i,t))return;e.uniform4iv(this.addr,t),Rt(i,t)}}function Rg(e,t){let i=this.cache;i[0]!==t&&(e.uniform1ui(this.addr,t),i[0]=t)}function Cg(e,t){let i=this.cache;if(t.x!==void 0)(i[0]!==t.x||i[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),i[0]=t.x,i[1]=t.y);else{if(At(i,t))return;e.uniform2uiv(this.addr,t),Rt(i,t)}}function Lg(e,t){let i=this.cache;if(t.x!==void 0)(i[0]!==t.x||i[1]!==t.y||i[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),i[0]=t.x,i[1]=t.y,i[2]=t.z);else{if(At(i,t))return;e.uniform3uiv(this.addr,t),Rt(i,t)}}function Pg(e,t){let i=this.cache;if(t.x!==void 0)(i[0]!==t.x||i[1]!==t.y||i[2]!==t.z||i[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),i[0]=t.x,i[1]=t.y,i[2]=t.z,i[3]=t.w);else{if(At(i,t))return;e.uniform4uiv(this.addr,t),Rt(i,t)}}function Dg(e,t,i){let r=this.cache,a=i.allocateTextureUnit();r[0]!==a&&(e.uniform1i(this.addr,a),r[0]=a);let n=this.type===e.SAMPLER_2D_SHADOW?gh:fh;i.setTexture2D(t||n,a)}function Ug(e,t,i){let r=this.cache,a=i.allocateTextureUnit();r[0]!==a&&(e.uniform1i(this.addr,a),r[0]=a),i.setTexture3D(t||vh,a)}function Ng(e,t,i){let r=this.cache,a=i.allocateTextureUnit();r[0]!==a&&(e.uniform1i(this.addr,a),r[0]=a),i.setTextureCube(t||xh,a)}function Ig(e,t,i){let r=this.cache,a=i.allocateTextureUnit();r[0]!==a&&(e.uniform1i(this.addr,a),r[0]=a),i.setTexture2DArray(t||_h,a)}function Og(e){switch(e){case 5126:return _g;case 35664:return vg;case 35665:return xg;case 35666:return yg;case 35674:return Mg;case 35675:return bg;case 35676:return Sg;case 5124:case 35670:return wg;case 35667:case 35671:return Eg;case 35668:case 35672:return Tg;case 35669:case 35673:return Ag;case 5125:return Rg;case 36294:return Cg;case 36295:return Lg;case 36296:return Pg;case 35678:case 36198:case 36298:case 36306:case 35682:return Dg;case 35679:case 36299:case 36307:return Ug;case 35680:case 36300:case 36308:case 36293:return Ng;case 36289:case 36303:case 36311:case 36292:return Ig}}function Fg(e,t){e.uniform1fv(this.addr,t)}function zg(e,t){let i=ba(t,this.size,2);e.uniform2fv(this.addr,i)}function kg(e,t){let i=ba(t,this.size,3);e.uniform3fv(this.addr,i)}function Bg(e,t){let i=ba(t,this.size,4);e.uniform4fv(this.addr,i)}function Vg(e,t){let i=ba(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,i)}function Hg(e,t){let i=ba(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,i)}function Gg(e,t){let i=ba(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,i)}function Wg(e,t){e.uniform1iv(this.addr,t)}function Xg(e,t){e.uniform2iv(this.addr,t)}function jg(e,t){e.uniform3iv(this.addr,t)}function qg(e,t){e.uniform4iv(this.addr,t)}function Yg(e,t){e.uniform1uiv(this.addr,t)}function Kg(e,t){e.uniform2uiv(this.addr,t)}function Jg(e,t){e.uniform3uiv(this.addr,t)}function Zg(e,t){e.uniform4uiv(this.addr,t)}function Qg(e,t,i){let r=this.cache,a=t.length,n=is(i,a);At(r,n)||(e.uniform1iv(this.addr,n),Rt(r,n));for(let o=0;o!==a;++o)i.setTexture2D(t[o]||fh,n[o])}function $g(e,t,i){let r=this.cache,a=t.length,n=is(i,a);At(r,n)||(e.uniform1iv(this.addr,n),Rt(r,n));for(let o=0;o!==a;++o)i.setTexture3D(t[o]||vh,n[o])}function e_(e,t,i){let r=this.cache,a=t.length,n=is(i,a);At(r,n)||(e.uniform1iv(this.addr,n),Rt(r,n));for(let o=0;o!==a;++o)i.setTextureCube(t[o]||xh,n[o])}function t_(e,t,i){let r=this.cache,a=t.length,n=is(i,a);At(r,n)||(e.uniform1iv(this.addr,n),Rt(r,n));for(let o=0;o!==a;++o)i.setTexture2DArray(t[o]||_h,n[o])}function i_(e){switch(e){case 5126:return Fg;case 35664:return zg;case 35665:return kg;case 35666:return Bg;case 35674:return Vg;case 35675:return Hg;case 35676:return Gg;case 5124:case 35670:return Wg;case 35667:case 35671:return Xg;case 35668:case 35672:return jg;case 35669:case 35673:return qg;case 5125:return Yg;case 36294:return Kg;case 36295:return Jg;case 36296:return Zg;case 35678:case 36198:case 36298:case 36306:case 35682:return Qg;case 35679:case 36299:case 36307:return $g;case 35680:case 36300:case 36308:case 36293:return e_;case 36289:case 36303:case 36311:case 36292:return t_}}function yc(e,t){e.seq.push(t),e.map[t.id]=t}function r_(e,t,i){let r=e.name,a=r.length;for(Gs.lastIndex=0;;){let n=Gs.exec(r),o=Gs.lastIndex,s=n[1],l=n[2]==="]",h=n[3];if(l&&(s=s|0),h===void 0||h==="["&&o+2===a){yc(i,h===void 0?new Om(s,e,t):new Fm(s,e,t));break}else{let c=i.map[s];c===void 0&&(c=new zm(s),yc(i,c)),i=c}}}function Mc(e,t,i){let r=e.createShader(t);return e.shaderSource(r,i),e.compileShader(r),r}function a_(e,t){let i=e.split(`
`),r=[],a=Math.max(t-6,0),n=Math.min(t+6,i.length);for(let o=a;o<n;o++){let s=o+1;r.push(`${s===t?">":" "} ${s}: ${i[o]}`)}return r.join(`
`)}function n_(e){let t=it.getPrimaries(it.workingColorSpace),i=it.getPrimaries(e),r;switch(t===i?r="":t===fn&&i===mn?r="LinearDisplayP3ToLinearSRGB":t===mn&&i===fn&&(r="LinearSRGBToLinearDisplayP3"),e){case ki:case dn:return[r,"LinearTransferOETF"];case vt:case Ms:return[r,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space:",e),[r,"LinearTransferOETF"]}}function bc(e,t,i){let r=e.getShaderParameter(t,e.COMPILE_STATUS),a=e.getShaderInfoLog(t).trim();if(r&&a==="")return"";let n=/ERROR: 0:(\d+)/.exec(a);if(n){let o=parseInt(n[1]);return i.toUpperCase()+`

`+a+`

`+a_(e.getShaderSource(t),o)}else return a}function s_(e,t){let i=n_(t);return`vec4 ${e}( vec4 value ) { return ${i[0]}( ${i[1]}( value ) ); }`}function o_(e,t){let i;switch(t){case cu:i="Linear";break;case uu:i="Reinhard";break;case du:i="OptimizedCineon";break;case Wo:i="ACESFilmic";break;case mu:i="AgX";break;case pu:i="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),i="Linear"}return"vec3 "+e+"( vec3 color ) { return "+i+"ToneMapping( color ); }"}function l_(e){return[e.extensionDerivatives||e.envMapCubeUVHeight||e.bumpMap||e.normalMapTangentSpace||e.clearcoatNormalMap||e.flatShading||e.shaderID==="physical"?"#extension GL_OES_standard_derivatives : enable":"",(e.extensionFragDepth||e.logarithmicDepthBuffer)&&e.rendererExtensionFragDepth?"#extension GL_EXT_frag_depth : enable":"",e.extensionDrawBuffers&&e.rendererExtensionDrawBuffers?"#extension GL_EXT_draw_buffers : require":"",(e.extensionShaderTextureLOD||e.envMap||e.transmission)&&e.rendererExtensionShaderTextureLod?"#extension GL_EXT_shader_texture_lod : enable":""].filter(Sa).join(`
`)}function h_(e){return[e.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":""].filter(Sa).join(`
`)}function c_(e){let t=[];for(let i in e){let r=e[i];r!==!1&&t.push("#define "+i+" "+r)}return t.join(`
`)}function u_(e,t){let i={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let a=0;a<r;a++){let n=e.getActiveAttrib(t,a),o=n.name,s=1;n.type===e.FLOAT_MAT2&&(s=2),n.type===e.FLOAT_MAT3&&(s=3),n.type===e.FLOAT_MAT4&&(s=4),i[o]={type:n.type,location:e.getAttribLocation(t,o),locationSize:s}}return i}function Sa(e){return e!==""}function Sc(e,t){let i=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,i).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function wc(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}function Po(e){return e.replace(Vm,d_)}function d_(e,t){let i=Be[t];if(i===void 0){let r=Hm.get(t);if(r!==void 0)i=Be[r],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,r);else throw new Error("Can not resolve #include <"+t+">")}return Po(i)}function Ec(e){return e.replace(Gm,p_)}function p_(e,t,i,r){let a="";for(let n=parseInt(t);n<parseInt(i);n++)a+=r.replace(/\[\s*i\s*\]/g,"[ "+n+" ]").replace(/UNROLLED_LOOP_INDEX/g,n);return a}function Tc(e){let t="precision "+e.precision+` float;
precision `+e.precision+" int;";return e.precision==="highp"?t+=`
#define HIGH_PRECISION`:e.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:e.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function m_(e){let t="SHADOWMAP_TYPE_BASIC";return e.shadowMapType===Oo?t="SHADOWMAP_TYPE_PCF":e.shadowMapType===Fo?t="SHADOWMAP_TYPE_PCF_SOFT":e.shadowMapType===Fi&&(t="SHADOWMAP_TYPE_VSM"),t}function f_(e){let t="ENVMAP_TYPE_CUBE";if(e.envMap)switch(e.envMapMode){case Fr:case zr:t="ENVMAP_TYPE_CUBE";break;case hn:t="ENVMAP_TYPE_CUBE_UV";break}return t}function g_(e){let t="ENVMAP_MODE_REFLECTION";return e.envMap&&e.envMapMode===zr&&(t="ENVMAP_MODE_REFRACTION"),t}function __(e){let t="ENVMAP_BLENDING_NONE";if(e.envMap)switch(e.combine){case Go:t="ENVMAP_BLENDING_MULTIPLY";break;case lu:t="ENVMAP_BLENDING_MIX";break;case hu:t="ENVMAP_BLENDING_ADD";break}return t}function v_(e){let t=e.envMapCubeUVHeight;if(t===null)return null;let i=Math.log2(t)-2,r=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,i),112)),texelHeight:r,maxMip:i}}function x_(e,t,i,r){let a=e.getContext(),n=i.defines,o=i.vertexShader,s=i.fragmentShader,l=m_(i),h=f_(i),c=g_(i),u=__(i),p=v_(i),m=i.isWebGL2?"":l_(i),g=h_(i),_=c_(n),f=a.createProgram(),d,M,x=i.glslVersion?"#version "+i.glslVersion+`
`:"";i.isRawShaderMaterial?(d=["#define SHADER_TYPE "+i.shaderType,"#define SHADER_NAME "+i.shaderName,_].filter(Sa).join(`
`),d.length>0&&(d+=`
`),M=[m,"#define SHADER_TYPE "+i.shaderType,"#define SHADER_NAME "+i.shaderName,_].filter(Sa).join(`
`),M.length>0&&(M+=`
`)):(d=[Tc(i),"#define SHADER_TYPE "+i.shaderType,"#define SHADER_NAME "+i.shaderName,_,i.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",i.batching?"#define USE_BATCHING":"",i.instancing?"#define USE_INSTANCING":"",i.instancingColor?"#define USE_INSTANCING_COLOR":"",i.useFog&&i.fog?"#define USE_FOG":"",i.useFog&&i.fogExp2?"#define FOG_EXP2":"",i.map?"#define USE_MAP":"",i.envMap?"#define USE_ENVMAP":"",i.envMap?"#define "+c:"",i.lightMap?"#define USE_LIGHTMAP":"",i.aoMap?"#define USE_AOMAP":"",i.bumpMap?"#define USE_BUMPMAP":"",i.normalMap?"#define USE_NORMALMAP":"",i.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",i.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",i.displacementMap?"#define USE_DISPLACEMENTMAP":"",i.emissiveMap?"#define USE_EMISSIVEMAP":"",i.anisotropy?"#define USE_ANISOTROPY":"",i.anisotropyMap?"#define USE_ANISOTROPYMAP":"",i.clearcoatMap?"#define USE_CLEARCOATMAP":"",i.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",i.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",i.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",i.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",i.specularMap?"#define USE_SPECULARMAP":"",i.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",i.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",i.roughnessMap?"#define USE_ROUGHNESSMAP":"",i.metalnessMap?"#define USE_METALNESSMAP":"",i.alphaMap?"#define USE_ALPHAMAP":"",i.alphaHash?"#define USE_ALPHAHASH":"",i.transmission?"#define USE_TRANSMISSION":"",i.transmissionMap?"#define USE_TRANSMISSIONMAP":"",i.thicknessMap?"#define USE_THICKNESSMAP":"",i.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",i.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",i.mapUv?"#define MAP_UV "+i.mapUv:"",i.alphaMapUv?"#define ALPHAMAP_UV "+i.alphaMapUv:"",i.lightMapUv?"#define LIGHTMAP_UV "+i.lightMapUv:"",i.aoMapUv?"#define AOMAP_UV "+i.aoMapUv:"",i.emissiveMapUv?"#define EMISSIVEMAP_UV "+i.emissiveMapUv:"",i.bumpMapUv?"#define BUMPMAP_UV "+i.bumpMapUv:"",i.normalMapUv?"#define NORMALMAP_UV "+i.normalMapUv:"",i.displacementMapUv?"#define DISPLACEMENTMAP_UV "+i.displacementMapUv:"",i.metalnessMapUv?"#define METALNESSMAP_UV "+i.metalnessMapUv:"",i.roughnessMapUv?"#define ROUGHNESSMAP_UV "+i.roughnessMapUv:"",i.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+i.anisotropyMapUv:"",i.clearcoatMapUv?"#define CLEARCOATMAP_UV "+i.clearcoatMapUv:"",i.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+i.clearcoatNormalMapUv:"",i.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+i.clearcoatRoughnessMapUv:"",i.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+i.iridescenceMapUv:"",i.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+i.iridescenceThicknessMapUv:"",i.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+i.sheenColorMapUv:"",i.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+i.sheenRoughnessMapUv:"",i.specularMapUv?"#define SPECULARMAP_UV "+i.specularMapUv:"",i.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+i.specularColorMapUv:"",i.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+i.specularIntensityMapUv:"",i.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+i.transmissionMapUv:"",i.thicknessMapUv?"#define THICKNESSMAP_UV "+i.thicknessMapUv:"",i.vertexTangents&&i.flatShading===!1?"#define USE_TANGENT":"",i.vertexColors?"#define USE_COLOR":"",i.vertexAlphas?"#define USE_COLOR_ALPHA":"",i.vertexUv1s?"#define USE_UV1":"",i.vertexUv2s?"#define USE_UV2":"",i.vertexUv3s?"#define USE_UV3":"",i.pointsUvs?"#define USE_POINTS_UV":"",i.flatShading?"#define FLAT_SHADED":"",i.skinning?"#define USE_SKINNING":"",i.morphTargets?"#define USE_MORPHTARGETS":"",i.morphNormals&&i.flatShading===!1?"#define USE_MORPHNORMALS":"",i.morphColors&&i.isWebGL2?"#define USE_MORPHCOLORS":"",i.morphTargetsCount>0&&i.isWebGL2?"#define MORPHTARGETS_TEXTURE":"",i.morphTargetsCount>0&&i.isWebGL2?"#define MORPHTARGETS_TEXTURE_STRIDE "+i.morphTextureStride:"",i.morphTargetsCount>0&&i.isWebGL2?"#define MORPHTARGETS_COUNT "+i.morphTargetsCount:"",i.doubleSided?"#define DOUBLE_SIDED":"",i.flipSided?"#define FLIP_SIDED":"",i.shadowMapEnabled?"#define USE_SHADOWMAP":"",i.shadowMapEnabled?"#define "+l:"",i.sizeAttenuation?"#define USE_SIZEATTENUATION":"",i.numLightProbes>0?"#define USE_LIGHT_PROBES":"",i.useLegacyLights?"#define LEGACY_LIGHTS":"",i.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",i.logarithmicDepthBuffer&&i.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#if ( defined( USE_MORPHTARGETS ) && ! defined( MORPHTARGETS_TEXTURE ) )","	attribute vec3 morphTarget0;","	attribute vec3 morphTarget1;","	attribute vec3 morphTarget2;","	attribute vec3 morphTarget3;","	#ifdef USE_MORPHNORMALS","		attribute vec3 morphNormal0;","		attribute vec3 morphNormal1;","		attribute vec3 morphNormal2;","		attribute vec3 morphNormal3;","	#else","		attribute vec3 morphTarget4;","		attribute vec3 morphTarget5;","		attribute vec3 morphTarget6;","		attribute vec3 morphTarget7;","	#endif","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Sa).join(`
`),M=[m,Tc(i),"#define SHADER_TYPE "+i.shaderType,"#define SHADER_NAME "+i.shaderName,_,i.useFog&&i.fog?"#define USE_FOG":"",i.useFog&&i.fogExp2?"#define FOG_EXP2":"",i.map?"#define USE_MAP":"",i.matcap?"#define USE_MATCAP":"",i.envMap?"#define USE_ENVMAP":"",i.envMap?"#define "+h:"",i.envMap?"#define "+c:"",i.envMap?"#define "+u:"",p?"#define CUBEUV_TEXEL_WIDTH "+p.texelWidth:"",p?"#define CUBEUV_TEXEL_HEIGHT "+p.texelHeight:"",p?"#define CUBEUV_MAX_MIP "+p.maxMip+".0":"",i.lightMap?"#define USE_LIGHTMAP":"",i.aoMap?"#define USE_AOMAP":"",i.bumpMap?"#define USE_BUMPMAP":"",i.normalMap?"#define USE_NORMALMAP":"",i.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",i.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",i.emissiveMap?"#define USE_EMISSIVEMAP":"",i.anisotropy?"#define USE_ANISOTROPY":"",i.anisotropyMap?"#define USE_ANISOTROPYMAP":"",i.clearcoat?"#define USE_CLEARCOAT":"",i.clearcoatMap?"#define USE_CLEARCOATMAP":"",i.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",i.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",i.iridescence?"#define USE_IRIDESCENCE":"",i.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",i.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",i.specularMap?"#define USE_SPECULARMAP":"",i.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",i.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",i.roughnessMap?"#define USE_ROUGHNESSMAP":"",i.metalnessMap?"#define USE_METALNESSMAP":"",i.alphaMap?"#define USE_ALPHAMAP":"",i.alphaTest?"#define USE_ALPHATEST":"",i.alphaHash?"#define USE_ALPHAHASH":"",i.sheen?"#define USE_SHEEN":"",i.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",i.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",i.transmission?"#define USE_TRANSMISSION":"",i.transmissionMap?"#define USE_TRANSMISSIONMAP":"",i.thicknessMap?"#define USE_THICKNESSMAP":"",i.vertexTangents&&i.flatShading===!1?"#define USE_TANGENT":"",i.vertexColors||i.instancingColor?"#define USE_COLOR":"",i.vertexAlphas?"#define USE_COLOR_ALPHA":"",i.vertexUv1s?"#define USE_UV1":"",i.vertexUv2s?"#define USE_UV2":"",i.vertexUv3s?"#define USE_UV3":"",i.pointsUvs?"#define USE_POINTS_UV":"",i.gradientMap?"#define USE_GRADIENTMAP":"",i.flatShading?"#define FLAT_SHADED":"",i.doubleSided?"#define DOUBLE_SIDED":"",i.flipSided?"#define FLIP_SIDED":"",i.shadowMapEnabled?"#define USE_SHADOWMAP":"",i.shadowMapEnabled?"#define "+l:"",i.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",i.numLightProbes>0?"#define USE_LIGHT_PROBES":"",i.useLegacyLights?"#define LEGACY_LIGHTS":"",i.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",i.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",i.logarithmicDepthBuffer&&i.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",i.toneMapping!==rr?"#define TONE_MAPPING":"",i.toneMapping!==rr?Be.tonemapping_pars_fragment:"",i.toneMapping!==rr?o_("toneMapping",i.toneMapping):"",i.dithering?"#define DITHERING":"",i.opaque?"#define OPAQUE":"",Be.colorspace_pars_fragment,s_("linearToOutputTexel",i.outputColorSpace),i.useDepthPacking?"#define DEPTH_PACKING "+i.depthPacking:"",`
`].filter(Sa).join(`
`)),o=Po(o),o=Sc(o,i),o=wc(o,i),s=Po(s),s=Sc(s,i),s=wc(s,i),o=Ec(o),s=Ec(s),i.isWebGL2&&i.isRawShaderMaterial!==!0&&(x=`#version 300 es
`,d=[g,"precision mediump sampler2DArray;","#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+d,M=["precision mediump sampler2DArray;","#define varying in",i.glslVersion===Nl?"":"layout(location = 0) out highp vec4 pc_fragColor;",i.glslVersion===Nl?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+M);let S=x+d+o,D=x+M+s,R=Mc(a,a.VERTEX_SHADER,S),L=Mc(a,a.FRAGMENT_SHADER,D);a.attachShader(f,R),a.attachShader(f,L),i.index0AttributeName!==void 0?a.bindAttribLocation(f,0,i.index0AttributeName):i.morphTargets===!0&&a.bindAttribLocation(f,0,"position"),a.linkProgram(f);function B(V){if(e.debug.checkShaderErrors){let Q=a.getProgramInfoLog(f).trim(),P=a.getShaderInfoLog(R).trim(),z=a.getShaderInfoLog(L).trim(),C=!0,G=!0;if(a.getProgramParameter(f,a.LINK_STATUS)===!1)if(C=!1,typeof e.debug.onShaderError=="function")e.debug.onShaderError(a,f,R,L);else{let O=bc(a,R,"vertex"),U=bc(a,L,"fragment");console.error("THREE.WebGLProgram: Shader Error "+a.getError()+" - VALIDATE_STATUS "+a.getProgramParameter(f,a.VALIDATE_STATUS)+`

Program Info Log: `+Q+`
`+O+`
`+U)}else Q!==""?console.warn("THREE.WebGLProgram: Program Info Log:",Q):(P===""||z==="")&&(G=!1);G&&(V.diagnostics={runnable:C,programLog:Q,vertexShader:{log:P,prefix:d},fragmentShader:{log:z,prefix:M}})}a.deleteShader(R),a.deleteShader(L),b=new zn(a,f),E=u_(a,f)}let b;this.getUniforms=function(){return b===void 0&&B(this),b};let E;this.getAttributes=function(){return E===void 0&&B(this),E};let F=i.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return F===!1&&(F=a.getProgramParameter(f,km)),F},this.destroy=function(){r.releaseStatesOfProgram(this),a.deleteProgram(f),this.program=void 0},this.type=i.shaderType,this.name=i.shaderName,this.id=Bm++,this.cacheKey=t,this.usedTimes=1,this.program=f,this.vertexShader=R,this.fragmentShader=L,this}function y_(e,t,i,r,a,n,o){let s=new ql,l=new Xm,h=[],c=a.isWebGL2,u=a.logarithmicDepthBuffer,p=a.vertexTextures,m=a.precision,g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(b){return b===0?"uv":`uv${b}`}function f(b,E,F,V,Q){let P=V.fog,z=Q.geometry,C=b.isMeshStandardMaterial?V.environment:null,G=(b.isMeshStandardMaterial?i:t).get(b.envMap||C),O=G&&G.mapping===hn?G.image.height:null,U=g[b.type];b.precision!==null&&(m=a.getMaxPrecision(b.precision),m!==b.precision&&console.warn("THREE.WebGLProgram.getParameters:",b.precision,"not supported, using",m,"instead."));let K=z.morphAttributes.position||z.morphAttributes.normal||z.morphAttributes.color,j=K!==void 0?K.length:0,I=0;z.morphAttributes.position!==void 0&&(I=1),z.morphAttributes.normal!==void 0&&(I=2),z.morphAttributes.color!==void 0&&(I=3);let W,he,me,q;if(U){let Mt=Ri[U];W=Mt.vertexShader,he=Mt.fragmentShader}else W=b.vertexShader,he=b.fragmentShader,l.update(b),me=l.getVertexShaderID(b),q=l.getFragmentShaderID(b);let $=e.getRenderTarget(),pe=Q.isInstancedMesh===!0,ne=Q.isBatchedMesh===!0,re=!!b.map,T=!!b.matcap,ae=!!G,te=!!b.aoMap,ie=!!b.lightMap,ee=!!b.bumpMap,X=!!b.normalMap,se=!!b.displacementMap,ce=!!b.emissiveMap,w=!!b.metalnessMap,y=!!b.roughnessMap,k=b.anisotropy>0,le=b.clearcoat>0,oe=b.iridescence>0,ue=b.sheen>0,Re=b.transmission>0,fe=k&&!!b.anisotropyMap,Me=le&&!!b.clearcoatMap,Te=le&&!!b.clearcoatNormalMap,Fe=le&&!!b.clearcoatRoughnessMap,de=oe&&!!b.iridescenceMap,Tt=oe&&!!b.iridescenceThicknessMap,je=ue&&!!b.sheenColorMap,ze=ue&&!!b.sheenRoughnessMap,Ae=!!b.specularMap,Ce=!!b.specularColorMap,qe=!!b.specularIntensityMap,ot=Re&&!!b.transmissionMap,Qe=Re&&!!b.thicknessMap,lt=!!b.gradientMap,_e=!!b.alphaMap,N=b.alphaTest>0,ve=!!b.alphaHash,we=!!b.extensions,ke=!!z.attributes.uv1,Pe=!!z.attributes.uv2,ht=!!z.attributes.uv3,pt=rr;return b.toneMapped&&($===null||$.isXRRenderTarget===!0)&&(pt=e.toneMapping),{isWebGL2:c,shaderID:U,shaderType:b.type,shaderName:b.name,vertexShader:W,fragmentShader:he,defines:b.defines,customVertexShaderID:me,customFragmentShaderID:q,isRawShaderMaterial:b.isRawShaderMaterial===!0,glslVersion:b.glslVersion,precision:m,batching:ne,instancing:pe,instancingColor:pe&&Q.instanceColor!==null,supportsVertexTextures:p,outputColorSpace:$===null?e.outputColorSpace:$.isXRRenderTarget===!0?$.texture.colorSpace:ki,map:re,matcap:T,envMap:ae,envMapMode:ae&&G.mapping,envMapCubeUVHeight:O,aoMap:te,lightMap:ie,bumpMap:ee,normalMap:X,displacementMap:p&&se,emissiveMap:ce,normalMapObjectSpace:X&&b.normalMapType===Au,normalMapTangentSpace:X&&b.normalMapType===Ll,metalnessMap:w,roughnessMap:y,anisotropy:k,anisotropyMap:fe,clearcoat:le,clearcoatMap:Me,clearcoatNormalMap:Te,clearcoatRoughnessMap:Fe,iridescence:oe,iridescenceMap:de,iridescenceThicknessMap:Tt,sheen:ue,sheenColorMap:je,sheenRoughnessMap:ze,specularMap:Ae,specularColorMap:Ce,specularIntensityMap:qe,transmission:Re,transmissionMap:ot,thicknessMap:Qe,gradientMap:lt,opaque:b.transparent===!1&&b.blending===Or,alphaMap:_e,alphaTest:N,alphaHash:ve,combine:b.combine,mapUv:re&&_(b.map.channel),aoMapUv:te&&_(b.aoMap.channel),lightMapUv:ie&&_(b.lightMap.channel),bumpMapUv:ee&&_(b.bumpMap.channel),normalMapUv:X&&_(b.normalMap.channel),displacementMapUv:se&&_(b.displacementMap.channel),emissiveMapUv:ce&&_(b.emissiveMap.channel),metalnessMapUv:w&&_(b.metalnessMap.channel),roughnessMapUv:y&&_(b.roughnessMap.channel),anisotropyMapUv:fe&&_(b.anisotropyMap.channel),clearcoatMapUv:Me&&_(b.clearcoatMap.channel),clearcoatNormalMapUv:Te&&_(b.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Fe&&_(b.clearcoatRoughnessMap.channel),iridescenceMapUv:de&&_(b.iridescenceMap.channel),iridescenceThicknessMapUv:Tt&&_(b.iridescenceThicknessMap.channel),sheenColorMapUv:je&&_(b.sheenColorMap.channel),sheenRoughnessMapUv:ze&&_(b.sheenRoughnessMap.channel),specularMapUv:Ae&&_(b.specularMap.channel),specularColorMapUv:Ce&&_(b.specularColorMap.channel),specularIntensityMapUv:qe&&_(b.specularIntensityMap.channel),transmissionMapUv:ot&&_(b.transmissionMap.channel),thicknessMapUv:Qe&&_(b.thicknessMap.channel),alphaMapUv:_e&&_(b.alphaMap.channel),vertexTangents:!!z.attributes.tangent&&(X||k),vertexColors:b.vertexColors,vertexAlphas:b.vertexColors===!0&&!!z.attributes.color&&z.attributes.color.itemSize===4,vertexUv1s:ke,vertexUv2s:Pe,vertexUv3s:ht,pointsUvs:Q.isPoints===!0&&!!z.attributes.uv&&(re||_e),fog:!!P,useFog:b.fog===!0,fogExp2:P&&P.isFogExp2,flatShading:b.flatShading===!0,sizeAttenuation:b.sizeAttenuation===!0,logarithmicDepthBuffer:u,skinning:Q.isSkinnedMesh===!0,morphTargets:z.morphAttributes.position!==void 0,morphNormals:z.morphAttributes.normal!==void 0,morphColors:z.morphAttributes.color!==void 0,morphTargetsCount:j,morphTextureStride:I,numDirLights:E.directional.length,numPointLights:E.point.length,numSpotLights:E.spot.length,numSpotLightMaps:E.spotLightMap.length,numRectAreaLights:E.rectArea.length,numHemiLights:E.hemi.length,numDirLightShadows:E.directionalShadowMap.length,numPointLightShadows:E.pointShadowMap.length,numSpotLightShadows:E.spotShadowMap.length,numSpotLightShadowsWithMaps:E.numSpotLightShadowsWithMaps,numLightProbes:E.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:b.dithering,shadowMapEnabled:e.shadowMap.enabled&&F.length>0,shadowMapType:e.shadowMap.type,toneMapping:pt,useLegacyLights:e._useLegacyLights,decodeVideoTexture:re&&b.map.isVideoTexture===!0&&it.getTransfer(b.map.colorSpace)===ct,premultipliedAlpha:b.premultipliedAlpha,doubleSided:b.side===Ti,flipSided:b.side===Vt,useDepthPacking:b.depthPacking>=0,depthPacking:b.depthPacking||0,index0AttributeName:b.index0AttributeName,extensionDerivatives:we&&b.extensions.derivatives===!0,extensionFragDepth:we&&b.extensions.fragDepth===!0,extensionDrawBuffers:we&&b.extensions.drawBuffers===!0,extensionShaderTextureLOD:we&&b.extensions.shaderTextureLOD===!0,extensionClipCullDistance:we&&b.extensions.clipCullDistance&&r.has("WEBGL_clip_cull_distance"),rendererExtensionFragDepth:c||r.has("EXT_frag_depth"),rendererExtensionDrawBuffers:c||r.has("WEBGL_draw_buffers"),rendererExtensionShaderTextureLod:c||r.has("EXT_shader_texture_lod"),rendererExtensionParallelShaderCompile:r.has("KHR_parallel_shader_compile"),customProgramCacheKey:b.customProgramCacheKey()}}function d(b){let E=[];if(b.shaderID?E.push(b.shaderID):(E.push(b.customVertexShaderID),E.push(b.customFragmentShaderID)),b.defines!==void 0)for(let F in b.defines)E.push(F),E.push(b.defines[F]);return b.isRawShaderMaterial===!1&&(M(E,b),x(E,b),E.push(e.outputColorSpace)),E.push(b.customProgramCacheKey),E.join()}function M(b,E){b.push(E.precision),b.push(E.outputColorSpace),b.push(E.envMapMode),b.push(E.envMapCubeUVHeight),b.push(E.mapUv),b.push(E.alphaMapUv),b.push(E.lightMapUv),b.push(E.aoMapUv),b.push(E.bumpMapUv),b.push(E.normalMapUv),b.push(E.displacementMapUv),b.push(E.emissiveMapUv),b.push(E.metalnessMapUv),b.push(E.roughnessMapUv),b.push(E.anisotropyMapUv),b.push(E.clearcoatMapUv),b.push(E.clearcoatNormalMapUv),b.push(E.clearcoatRoughnessMapUv),b.push(E.iridescenceMapUv),b.push(E.iridescenceThicknessMapUv),b.push(E.sheenColorMapUv),b.push(E.sheenRoughnessMapUv),b.push(E.specularMapUv),b.push(E.specularColorMapUv),b.push(E.specularIntensityMapUv),b.push(E.transmissionMapUv),b.push(E.thicknessMapUv),b.push(E.combine),b.push(E.fogExp2),b.push(E.sizeAttenuation),b.push(E.morphTargetsCount),b.push(E.morphAttributeCount),b.push(E.numDirLights),b.push(E.numPointLights),b.push(E.numSpotLights),b.push(E.numSpotLightMaps),b.push(E.numHemiLights),b.push(E.numRectAreaLights),b.push(E.numDirLightShadows),b.push(E.numPointLightShadows),b.push(E.numSpotLightShadows),b.push(E.numSpotLightShadowsWithMaps),b.push(E.numLightProbes),b.push(E.shadowMapType),b.push(E.toneMapping),b.push(E.numClippingPlanes),b.push(E.numClipIntersection),b.push(E.depthPacking)}function x(b,E){s.disableAll(),E.isWebGL2&&s.enable(0),E.supportsVertexTextures&&s.enable(1),E.instancing&&s.enable(2),E.instancingColor&&s.enable(3),E.matcap&&s.enable(4),E.envMap&&s.enable(5),E.normalMapObjectSpace&&s.enable(6),E.normalMapTangentSpace&&s.enable(7),E.clearcoat&&s.enable(8),E.iridescence&&s.enable(9),E.alphaTest&&s.enable(10),E.vertexColors&&s.enable(11),E.vertexAlphas&&s.enable(12),E.vertexUv1s&&s.enable(13),E.vertexUv2s&&s.enable(14),E.vertexUv3s&&s.enable(15),E.vertexTangents&&s.enable(16),E.anisotropy&&s.enable(17),E.alphaHash&&s.enable(18),E.batching&&s.enable(19),b.push(s.mask),s.disableAll(),E.fog&&s.enable(0),E.useFog&&s.enable(1),E.flatShading&&s.enable(2),E.logarithmicDepthBuffer&&s.enable(3),E.skinning&&s.enable(4),E.morphTargets&&s.enable(5),E.morphNormals&&s.enable(6),E.morphColors&&s.enable(7),E.premultipliedAlpha&&s.enable(8),E.shadowMapEnabled&&s.enable(9),E.useLegacyLights&&s.enable(10),E.doubleSided&&s.enable(11),E.flipSided&&s.enable(12),E.useDepthPacking&&s.enable(13),E.dithering&&s.enable(14),E.transmission&&s.enable(15),E.sheen&&s.enable(16),E.opaque&&s.enable(17),E.pointsUvs&&s.enable(18),E.decodeVideoTexture&&s.enable(19),b.push(s.mask)}function S(b){let E=g[b.type],F;if(E){let V=Ri[E];F=Ju.clone(V.uniforms)}else F=b.uniforms;return F}function D(b,E){let F;for(let V=0,Q=h.length;V<Q;V++){let P=h[V];if(P.cacheKey===E){F=P,++F.usedTimes;break}}return F===void 0&&(F=new x_(e,E,b,n),h.push(F)),F}function R(b){if(--b.usedTimes===0){let E=h.indexOf(b);h[E]=h[h.length-1],h.pop(),b.destroy()}}function L(b){l.remove(b)}function B(){l.dispose()}return{getParameters:f,getProgramCacheKey:d,getUniforms:S,acquireProgram:D,releaseProgram:R,releaseShaderCache:L,programs:h,dispose:B}}function M_(){let e=new WeakMap;function t(n){let o=e.get(n);return o===void 0&&(o={},e.set(n,o)),o}function i(n){e.delete(n)}function r(n,o,s){e.get(n)[o]=s}function a(){e=new WeakMap}return{get:t,remove:i,update:r,dispose:a}}function b_(e,t){return e.groupOrder!==t.groupOrder?e.groupOrder-t.groupOrder:e.renderOrder!==t.renderOrder?e.renderOrder-t.renderOrder:e.material.id!==t.material.id?e.material.id-t.material.id:e.z!==t.z?e.z-t.z:e.id-t.id}function Ac(e,t){return e.groupOrder!==t.groupOrder?e.groupOrder-t.groupOrder:e.renderOrder!==t.renderOrder?e.renderOrder-t.renderOrder:e.z!==t.z?t.z-e.z:e.id-t.id}function Rc(){let e=[],t=0,i=[],r=[],a=[];function n(){t=0,i.length=0,r.length=0,a.length=0}function o(u,p,m,g,_,f){let d=e[t];return d===void 0?(d={id:u.id,object:u,geometry:p,material:m,groupOrder:g,renderOrder:u.renderOrder,z:_,group:f},e[t]=d):(d.id=u.id,d.object=u,d.geometry=p,d.material=m,d.groupOrder=g,d.renderOrder=u.renderOrder,d.z=_,d.group=f),t++,d}function s(u,p,m,g,_,f){let d=o(u,p,m,g,_,f);m.transmission>0?r.push(d):m.transparent===!0?a.push(d):i.push(d)}function l(u,p,m,g,_,f){let d=o(u,p,m,g,_,f);m.transmission>0?r.unshift(d):m.transparent===!0?a.unshift(d):i.unshift(d)}function h(u,p){i.length>1&&i.sort(u||b_),r.length>1&&r.sort(p||Ac),a.length>1&&a.sort(p||Ac)}function c(){for(let u=t,p=e.length;u<p;u++){let m=e[u];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:i,transmissive:r,transparent:a,init:n,push:s,unshift:l,finish:c,sort:h}}function S_(){let e=new WeakMap;function t(r,a){let n=e.get(r),o;return n===void 0?(o=new Rc,e.set(r,[o])):a>=n.length?(o=new Rc,n.push(o)):o=n[a],o}function i(){e=new WeakMap}return{get:t,dispose:i}}function w_(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let i;switch(t.type){case"DirectionalLight":i={direction:new v,color:new Ne};break;case"SpotLight":i={position:new v,direction:new v,color:new Ne,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":i={position:new v,color:new Ne,distance:0,decay:0};break;case"HemisphereLight":i={direction:new v,skyColor:new Ne,groundColor:new Ne};break;case"RectAreaLight":i={color:new Ne,position:new v,halfWidth:new v,halfHeight:new v};break}return e[t.id]=i,i}}}function E_(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let i;switch(t.type){case"DirectionalLight":i={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new xe};break;case"SpotLight":i={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new xe};break;case"PointLight":i={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new xe,shadowCameraNear:1,shadowCameraFar:1e3};break}return e[t.id]=i,i}}}function T_(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+(t.map?1:0)-(e.map?1:0)}function A_(e,t){let i=new w_,r=E_(),a={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)a.probe.push(new v);let n=new v,o=new tt,s=new tt;function l(c,u){let p=0,m=0,g=0;for(let V=0;V<9;V++)a.probe[V].set(0,0,0);let _=0,f=0,d=0,M=0,x=0,S=0,D=0,R=0,L=0,B=0,b=0;c.sort(T_);let E=u===!0?Math.PI:1;for(let V=0,Q=c.length;V<Q;V++){let P=c[V],z=P.color,C=P.intensity,G=P.distance,O=P.shadow&&P.shadow.map?P.shadow.map.texture:null;if(P.isAmbientLight)p+=z.r*C*E,m+=z.g*C*E,g+=z.b*C*E;else if(P.isLightProbe){for(let U=0;U<9;U++)a.probe[U].addScaledVector(P.sh.coefficients[U],C);b++}else if(P.isDirectionalLight){let U=i.get(P);if(U.color.copy(P.color).multiplyScalar(P.intensity*E),P.castShadow){let K=P.shadow,j=r.get(P);j.shadowBias=K.bias,j.shadowNormalBias=K.normalBias,j.shadowRadius=K.radius,j.shadowMapSize=K.mapSize,a.directionalShadow[_]=j,a.directionalShadowMap[_]=O,a.directionalShadowMatrix[_]=P.shadow.matrix,S++}a.directional[_]=U,_++}else if(P.isSpotLight){let U=i.get(P);U.position.setFromMatrixPosition(P.matrixWorld),U.color.copy(z).multiplyScalar(C*E),U.distance=G,U.coneCos=Math.cos(P.angle),U.penumbraCos=Math.cos(P.angle*(1-P.penumbra)),U.decay=P.decay,a.spot[d]=U;let K=P.shadow;if(P.map&&(a.spotLightMap[L]=P.map,L++,K.updateMatrices(P),P.castShadow&&B++),a.spotLightMatrix[d]=K.matrix,P.castShadow){let j=r.get(P);j.shadowBias=K.bias,j.shadowNormalBias=K.normalBias,j.shadowRadius=K.radius,j.shadowMapSize=K.mapSize,a.spotShadow[d]=j,a.spotShadowMap[d]=O,R++}d++}else if(P.isRectAreaLight){let U=i.get(P);U.color.copy(z).multiplyScalar(C),U.halfWidth.set(P.width*.5,0,0),U.halfHeight.set(0,P.height*.5,0),a.rectArea[M]=U,M++}else if(P.isPointLight){let U=i.get(P);if(U.color.copy(P.color).multiplyScalar(P.intensity*E),U.distance=P.distance,U.decay=P.decay,P.castShadow){let K=P.shadow,j=r.get(P);j.shadowBias=K.bias,j.shadowNormalBias=K.normalBias,j.shadowRadius=K.radius,j.shadowMapSize=K.mapSize,j.shadowCameraNear=K.camera.near,j.shadowCameraFar=K.camera.far,a.pointShadow[f]=j,a.pointShadowMap[f]=O,a.pointShadowMatrix[f]=P.shadow.matrix,D++}a.point[f]=U,f++}else if(P.isHemisphereLight){let U=i.get(P);U.skyColor.copy(P.color).multiplyScalar(C*E),U.groundColor.copy(P.groundColor).multiplyScalar(C*E),a.hemi[x]=U,x++}}M>0&&(t.isWebGL2?e.has("OES_texture_float_linear")===!0?(a.rectAreaLTC1=ge.LTC_FLOAT_1,a.rectAreaLTC2=ge.LTC_FLOAT_2):(a.rectAreaLTC1=ge.LTC_HALF_1,a.rectAreaLTC2=ge.LTC_HALF_2):e.has("OES_texture_float_linear")===!0?(a.rectAreaLTC1=ge.LTC_FLOAT_1,a.rectAreaLTC2=ge.LTC_FLOAT_2):e.has("OES_texture_half_float_linear")===!0?(a.rectAreaLTC1=ge.LTC_HALF_1,a.rectAreaLTC2=ge.LTC_HALF_2):console.error("THREE.WebGLRenderer: Unable to use RectAreaLight. Missing WebGL extensions.")),a.ambient[0]=p,a.ambient[1]=m,a.ambient[2]=g;let F=a.hash;(F.directionalLength!==_||F.pointLength!==f||F.spotLength!==d||F.rectAreaLength!==M||F.hemiLength!==x||F.numDirectionalShadows!==S||F.numPointShadows!==D||F.numSpotShadows!==R||F.numSpotMaps!==L||F.numLightProbes!==b)&&(a.directional.length=_,a.spot.length=d,a.rectArea.length=M,a.point.length=f,a.hemi.length=x,a.directionalShadow.length=S,a.directionalShadowMap.length=S,a.pointShadow.length=D,a.pointShadowMap.length=D,a.spotShadow.length=R,a.spotShadowMap.length=R,a.directionalShadowMatrix.length=S,a.pointShadowMatrix.length=D,a.spotLightMatrix.length=R+L-B,a.spotLightMap.length=L,a.numSpotLightShadowsWithMaps=B,a.numLightProbes=b,F.directionalLength=_,F.pointLength=f,F.spotLength=d,F.rectAreaLength=M,F.hemiLength=x,F.numDirectionalShadows=S,F.numPointShadows=D,F.numSpotShadows=R,F.numSpotMaps=L,F.numLightProbes=b,a.version=qm++)}function h(c,u){let p=0,m=0,g=0,_=0,f=0,d=u.matrixWorldInverse;for(let M=0,x=c.length;M<x;M++){let S=c[M];if(S.isDirectionalLight){let D=a.directional[p];D.direction.setFromMatrixPosition(S.matrixWorld),n.setFromMatrixPosition(S.target.matrixWorld),D.direction.sub(n),D.direction.transformDirection(d),p++}else if(S.isSpotLight){let D=a.spot[g];D.position.setFromMatrixPosition(S.matrixWorld),D.position.applyMatrix4(d),D.direction.setFromMatrixPosition(S.matrixWorld),n.setFromMatrixPosition(S.target.matrixWorld),D.direction.sub(n),D.direction.transformDirection(d),g++}else if(S.isRectAreaLight){let D=a.rectArea[_];D.position.setFromMatrixPosition(S.matrixWorld),D.position.applyMatrix4(d),s.identity(),o.copy(S.matrixWorld),o.premultiply(d),s.extractRotation(o),D.halfWidth.set(S.width*.5,0,0),D.halfHeight.set(0,S.height*.5,0),D.halfWidth.applyMatrix4(s),D.halfHeight.applyMatrix4(s),_++}else if(S.isPointLight){let D=a.point[m];D.position.setFromMatrixPosition(S.matrixWorld),D.position.applyMatrix4(d),m++}else if(S.isHemisphereLight){let D=a.hemi[f];D.direction.setFromMatrixPosition(S.matrixWorld),D.direction.transformDirection(d),f++}}}return{setup:l,setupView:h,state:a}}function Cc(e,t){let i=new A_(e,t),r=[],a=[];function n(){r.length=0,a.length=0}function o(c){r.push(c)}function s(c){a.push(c)}function l(c){i.setup(r,c)}function h(c){i.setupView(r,c)}return{init:n,state:{lightsArray:r,shadowsArray:a,lights:i},setupLights:l,setupLightsView:h,pushLight:o,pushShadow:s}}function R_(e,t){let i=new WeakMap;function r(n,o=0){let s=i.get(n),l;return s===void 0?(l=new Cc(e,t),i.set(n,[l])):o>=s.length?(l=new Cc(e,t),s.push(l)):l=s[o],l}function a(){i=new WeakMap}return{get:r,dispose:a}}function C_(e,t,i){let r=new Fs,a=new xe,n=new xe,o=new gt,s=new Ym({depthPacking:Tu}),l=new Km,h={},c=i.maxTextureSize,u={[tr]:Vt,[Vt]:tr,[Ti]:Ti},p=new Ai({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new xe},radius:{value:4}},vertexShader:Jm,fragmentShader:Zm}),m=p.clone();m.defines.HORIZONTAL_PASS=1;let g=new St;g.setAttribute("position",new Ht(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let _=new De(g,p),f=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Oo;let d=this.type;this.render=function(R,L,B){if(f.enabled===!1||f.autoUpdate===!1&&f.needsUpdate===!1||R.length===0)return;let b=e.getRenderTarget(),E=e.getActiveCubeFace(),F=e.getActiveMipmapLevel(),V=e.state;V.setBlending(ir),V.buffers.color.setClear(1,1,1,1),V.buffers.depth.setTest(!0),V.setScissorTest(!1);let Q=d!==Fi&&this.type===Fi,P=d===Fi&&this.type!==Fi;for(let z=0,C=R.length;z<C;z++){let G=R[z],O=G.shadow;if(O===void 0){console.warn("THREE.WebGLShadowMap:",G,"has no shadow.");continue}if(O.autoUpdate===!1&&O.needsUpdate===!1)continue;a.copy(O.mapSize);let U=O.getFrameExtents();if(a.multiply(U),n.copy(O.mapSize),(a.x>c||a.y>c)&&(a.x>c&&(n.x=Math.floor(c/U.x),a.x=n.x*U.x,O.mapSize.x=n.x),a.y>c&&(n.y=Math.floor(c/U.y),a.y=n.y*U.y,O.mapSize.y=n.y)),O.map===null||Q===!0||P===!0){let j=this.type!==Fi?{minFilter:Nt,magFilter:Nt}:{};O.map!==null&&O.map.dispose(),O.map=new br(a.x,a.y,j),O.map.texture.name=G.name+".shadowMap",O.camera.updateProjectionMatrix()}e.setRenderTarget(O.map),e.clear();let K=O.getViewportCount();for(let j=0;j<K;j++){let I=O.getViewport(j);o.set(n.x*I.x,n.y*I.y,n.x*I.z,n.y*I.w),V.viewport(o),O.updateMatrices(G,j),r=O.getFrustum(),S(L,B,O.camera,G,this.type)}O.isPointLightShadow!==!0&&this.type===Fi&&M(O,B),O.needsUpdate=!1}d=this.type,f.needsUpdate=!1,e.setRenderTarget(b,E,F)};function M(R,L){let B=t.update(_);p.defines.VSM_SAMPLES!==R.blurSamples&&(p.defines.VSM_SAMPLES=R.blurSamples,m.defines.VSM_SAMPLES=R.blurSamples,p.needsUpdate=!0,m.needsUpdate=!0),R.mapPass===null&&(R.mapPass=new br(a.x,a.y)),p.uniforms.shadow_pass.value=R.map.texture,p.uniforms.resolution.value=R.mapSize,p.uniforms.radius.value=R.radius,e.setRenderTarget(R.mapPass),e.clear(),e.renderBufferDirect(L,null,B,p,_,null),m.uniforms.shadow_pass.value=R.mapPass.texture,m.uniforms.resolution.value=R.mapSize,m.uniforms.radius.value=R.radius,e.setRenderTarget(R.map),e.clear(),e.renderBufferDirect(L,null,B,m,_,null)}function x(R,L,B,b){let E=null,F=B.isPointLight===!0?R.customDistanceMaterial:R.customDepthMaterial;if(F!==void 0)E=F;else if(E=B.isPointLight===!0?l:s,e.localClippingEnabled&&L.clipShadows===!0&&Array.isArray(L.clippingPlanes)&&L.clippingPlanes.length!==0||L.displacementMap&&L.displacementScale!==0||L.alphaMap&&L.alphaTest>0||L.map&&L.alphaTest>0){let V=E.uuid,Q=L.uuid,P=h[V];P===void 0&&(P={},h[V]=P);let z=P[Q];z===void 0&&(z=E.clone(),P[Q]=z,L.addEventListener("dispose",D)),E=z}if(E.visible=L.visible,E.wireframe=L.wireframe,b===Fi?E.side=L.shadowSide!==null?L.shadowSide:L.side:E.side=L.shadowSide!==null?L.shadowSide:u[L.side],E.alphaMap=L.alphaMap,E.alphaTest=L.alphaTest,E.map=L.map,E.clipShadows=L.clipShadows,E.clippingPlanes=L.clippingPlanes,E.clipIntersection=L.clipIntersection,E.displacementMap=L.displacementMap,E.displacementScale=L.displacementScale,E.displacementBias=L.displacementBias,E.wireframeLinewidth=L.wireframeLinewidth,E.linewidth=L.linewidth,B.isPointLight===!0&&E.isMeshDistanceMaterial===!0){let V=e.properties.get(E);V.light=B}return E}function S(R,L,B,b,E){if(R.visible===!1)return;if(R.layers.test(L.layers)&&(R.isMesh||R.isLine||R.isPoints)&&(R.castShadow||R.receiveShadow&&E===Fi)&&(!R.frustumCulled||r.intersectsObject(R))){R.modelViewMatrix.multiplyMatrices(B.matrixWorldInverse,R.matrixWorld);let V=t.update(R),Q=R.material;if(Array.isArray(Q)){let P=V.groups;for(let z=0,C=P.length;z<C;z++){let G=P[z],O=Q[G.materialIndex];if(O&&O.visible){let U=x(R,O,b,E);R.onBeforeShadow(e,R,L,B,V,U,G),e.renderBufferDirect(B,null,V,U,R,G),R.onAfterShadow(e,R,L,B,V,U,G)}}}else if(Q.visible){let P=x(R,Q,b,E);R.onBeforeShadow(e,R,L,B,V,P,null),e.renderBufferDirect(B,null,V,P,R,null),R.onAfterShadow(e,R,L,B,V,P,null)}}let F=R.children;for(let V=0,Q=F.length;V<Q;V++)S(F[V],L,B,b,E)}function D(R){R.target.removeEventListener("dispose",D);for(let L in h){let B=h[L],b=R.target.uuid;b in B&&(B[b].dispose(),delete B[b])}}}function L_(e,t,i){let r=i.isWebGL2;function a(){let N=!1,ve=new gt,we=null,ke=new gt(0,0,0,0);return{setMask:function(Pe){we!==Pe&&!N&&(e.colorMask(Pe,Pe,Pe,Pe),we=Pe)},setLocked:function(Pe){N=Pe},setClear:function(Pe,ht,pt,Mt,Si){Si===!0&&(Pe*=Mt,ht*=Mt,pt*=Mt),ve.set(Pe,ht,pt,Mt),ke.equals(ve)===!1&&(e.clearColor(Pe,ht,pt,Mt),ke.copy(ve))},reset:function(){N=!1,we=null,ke.set(-1,0,0,0)}}}function n(){let N=!1,ve=null,we=null,ke=null;return{setTest:function(Pe){Pe?ne(e.DEPTH_TEST):re(e.DEPTH_TEST)},setMask:function(Pe){ve!==Pe&&!N&&(e.depthMask(Pe),ve=Pe)},setFunc:function(Pe){if(we!==Pe){switch(Pe){case tu:e.depthFunc(e.NEVER);break;case iu:e.depthFunc(e.ALWAYS);break;case ru:e.depthFunc(e.LESS);break;case ln:e.depthFunc(e.LEQUAL);break;case au:e.depthFunc(e.EQUAL);break;case nu:e.depthFunc(e.GEQUAL);break;case su:e.depthFunc(e.GREATER);break;case ou:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}we=Pe}},setLocked:function(Pe){N=Pe},setClear:function(Pe){ke!==Pe&&(e.clearDepth(Pe),ke=Pe)},reset:function(){N=!1,ve=null,we=null,ke=null}}}function o(){let N=!1,ve=null,we=null,ke=null,Pe=null,ht=null,pt=null,Mt=null,Si=null;return{setTest:function(et){N||(et?ne(e.STENCIL_TEST):re(e.STENCIL_TEST))},setMask:function(et){ve!==et&&!N&&(e.stencilMask(et),ve=et)},setFunc:function(et,$i,er){(we!==et||ke!==$i||Pe!==er)&&(e.stencilFunc(et,$i,er),we=et,ke=$i,Pe=er)},setOp:function(et,$i,er){(ht!==et||pt!==$i||Mt!==er)&&(e.stencilOp(et,$i,er),ht=et,pt=$i,Mt=er)},setLocked:function(et){N=et},setClear:function(et){Si!==et&&(e.clearStencil(et),Si=et)},reset:function(){N=!1,ve=null,we=null,ke=null,Pe=null,ht=null,pt=null,Mt=null,Si=null}}}let s=new a,l=new n,h=new o,c=new WeakMap,u=new WeakMap,p={},m={},g=new WeakMap,_=[],f=null,d=!1,M=null,x=null,S=null,D=null,R=null,L=null,B=null,b=new Ne(0,0,0),E=0,F=!1,V=null,Q=null,P=null,z=null,C=null,G=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),O=!1,U=0,K=e.getParameter(e.VERSION);K.indexOf("WebGL")!==-1?(U=parseFloat(/^WebGL (\d)/.exec(K)[1]),O=U>=1):K.indexOf("OpenGL ES")!==-1&&(U=parseFloat(/^OpenGL ES (\d)/.exec(K)[1]),O=U>=2);let j=null,I={},W=e.getParameter(e.SCISSOR_BOX),he=e.getParameter(e.VIEWPORT),me=new gt().fromArray(W),q=new gt().fromArray(he);function $(N,ve,we,ke){let Pe=new Uint8Array(4),ht=e.createTexture();e.bindTexture(N,ht),e.texParameteri(N,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(N,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let pt=0;pt<we;pt++)r&&(N===e.TEXTURE_3D||N===e.TEXTURE_2D_ARRAY)?e.texImage3D(ve,0,e.RGBA,1,1,ke,0,e.RGBA,e.UNSIGNED_BYTE,Pe):e.texImage2D(ve+pt,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,Pe);return ht}let pe={};pe[e.TEXTURE_2D]=$(e.TEXTURE_2D,e.TEXTURE_2D,1),pe[e.TEXTURE_CUBE_MAP]=$(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),r&&(pe[e.TEXTURE_2D_ARRAY]=$(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),pe[e.TEXTURE_3D]=$(e.TEXTURE_3D,e.TEXTURE_3D,1,1)),s.setClear(0,0,0,1),l.setClear(1),h.setClear(0),ne(e.DEPTH_TEST),l.setFunc(ln),ce(!1),w(Io),ne(e.CULL_FACE),X(ir);function ne(N){p[N]!==!0&&(e.enable(N),p[N]=!0)}function re(N){p[N]!==!1&&(e.disable(N),p[N]=!1)}function T(N,ve){return m[N]!==ve?(e.bindFramebuffer(N,ve),m[N]=ve,r&&(N===e.DRAW_FRAMEBUFFER&&(m[e.FRAMEBUFFER]=ve),N===e.FRAMEBUFFER&&(m[e.DRAW_FRAMEBUFFER]=ve)),!0):!1}function ae(N,ve){let we=_,ke=!1;if(N)if(we=g.get(ve),we===void 0&&(we=[],g.set(ve,we)),N.isWebGLMultipleRenderTargets){let Pe=N.texture;if(we.length!==Pe.length||we[0]!==e.COLOR_ATTACHMENT0){for(let ht=0,pt=Pe.length;ht<pt;ht++)we[ht]=e.COLOR_ATTACHMENT0+ht;we.length=Pe.length,ke=!0}}else we[0]!==e.COLOR_ATTACHMENT0&&(we[0]=e.COLOR_ATTACHMENT0,ke=!0);else we[0]!==e.BACK&&(we[0]=e.BACK,ke=!0);ke&&(i.isWebGL2?e.drawBuffers(we):t.get("WEBGL_draw_buffers").drawBuffersWEBGL(we))}function te(N){return f!==N?(e.useProgram(N),f=N,!0):!1}let ie={[vr]:e.FUNC_ADD,[Bc]:e.FUNC_SUBTRACT,[Vc]:e.FUNC_REVERSE_SUBTRACT};if(r)ie[Vo]=e.MIN,ie[Ho]=e.MAX;else{let N=t.get("EXT_blend_minmax");N!==null&&(ie[Vo]=N.MIN_EXT,ie[Ho]=N.MAX_EXT)}let ee={[Hc]:e.ZERO,[Gc]:e.ONE,[Wc]:e.SRC_COLOR,[os]:e.SRC_ALPHA,[Jc]:e.SRC_ALPHA_SATURATE,[Yc]:e.DST_COLOR,[jc]:e.DST_ALPHA,[Xc]:e.ONE_MINUS_SRC_COLOR,[ls]:e.ONE_MINUS_SRC_ALPHA,[Kc]:e.ONE_MINUS_DST_COLOR,[qc]:e.ONE_MINUS_DST_ALPHA,[Zc]:e.CONSTANT_COLOR,[Qc]:e.ONE_MINUS_CONSTANT_COLOR,[$c]:e.CONSTANT_ALPHA,[eu]:e.ONE_MINUS_CONSTANT_ALPHA};function X(N,ve,we,ke,Pe,ht,pt,Mt,Si,et){if(N===ir){d===!0&&(re(e.BLEND),d=!1);return}if(d===!1&&(ne(e.BLEND),d=!0),N!==kc){if(N!==M||et!==F){if((x!==vr||R!==vr)&&(e.blendEquation(e.FUNC_ADD),x=vr,R=vr),et)switch(N){case Or:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case zo:e.blendFunc(e.ONE,e.ONE);break;case ko:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case Bo:e.blendFuncSeparate(e.ZERO,e.SRC_COLOR,e.ZERO,e.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",N);break}else switch(N){case Or:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case zo:e.blendFunc(e.SRC_ALPHA,e.ONE);break;case ko:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case Bo:e.blendFunc(e.ZERO,e.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",N);break}S=null,D=null,L=null,B=null,b.set(0,0,0),E=0,M=N,F=et}return}Pe=Pe||ve,ht=ht||we,pt=pt||ke,(ve!==x||Pe!==R)&&(e.blendEquationSeparate(ie[ve],ie[Pe]),x=ve,R=Pe),(we!==S||ke!==D||ht!==L||pt!==B)&&(e.blendFuncSeparate(ee[we],ee[ke],ee[ht],ee[pt]),S=we,D=ke,L=ht,B=pt),(Mt.equals(b)===!1||Si!==E)&&(e.blendColor(Mt.r,Mt.g,Mt.b,Si),b.copy(Mt),E=Si),M=N,F=!1}function se(N,ve){N.side===Ti?re(e.CULL_FACE):ne(e.CULL_FACE);let we=N.side===Vt;ve&&(we=!we),ce(we),N.blending===Or&&N.transparent===!1?X(ir):X(N.blending,N.blendEquation,N.blendSrc,N.blendDst,N.blendEquationAlpha,N.blendSrcAlpha,N.blendDstAlpha,N.blendColor,N.blendAlpha,N.premultipliedAlpha),l.setFunc(N.depthFunc),l.setTest(N.depthTest),l.setMask(N.depthWrite),s.setMask(N.colorWrite);let ke=N.stencilWrite;h.setTest(ke),ke&&(h.setMask(N.stencilWriteMask),h.setFunc(N.stencilFunc,N.stencilRef,N.stencilFuncMask),h.setOp(N.stencilFail,N.stencilZFail,N.stencilZPass)),k(N.polygonOffset,N.polygonOffsetFactor,N.polygonOffsetUnits),N.alphaToCoverage===!0?ne(e.SAMPLE_ALPHA_TO_COVERAGE):re(e.SAMPLE_ALPHA_TO_COVERAGE)}function ce(N){V!==N&&(N?e.frontFace(e.CW):e.frontFace(e.CCW),V=N)}function w(N){N!==Fc?(ne(e.CULL_FACE),N!==Q&&(N===Io?e.cullFace(e.BACK):N===zc?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))):re(e.CULL_FACE),Q=N}function y(N){N!==P&&(O&&e.lineWidth(N),P=N)}function k(N,ve,we){N?(ne(e.POLYGON_OFFSET_FILL),(z!==ve||C!==we)&&(e.polygonOffset(ve,we),z=ve,C=we)):re(e.POLYGON_OFFSET_FILL)}function le(N){N?ne(e.SCISSOR_TEST):re(e.SCISSOR_TEST)}function oe(N){N===void 0&&(N=e.TEXTURE0+G-1),j!==N&&(e.activeTexture(N),j=N)}function ue(N,ve,we){we===void 0&&(j===null?we=e.TEXTURE0+G-1:we=j);let ke=I[we];ke===void 0&&(ke={type:void 0,texture:void 0},I[we]=ke),(ke.type!==N||ke.texture!==ve)&&(j!==we&&(e.activeTexture(we),j=we),e.bindTexture(N,ve||pe[N]),ke.type=N,ke.texture=ve)}function Re(){let N=I[j];N!==void 0&&N.type!==void 0&&(e.bindTexture(N.type,null),N.type=void 0,N.texture=void 0)}function fe(){try{e.compressedTexImage2D.apply(e,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Me(){try{e.compressedTexImage3D.apply(e,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Te(){try{e.texSubImage2D.apply(e,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Fe(){try{e.texSubImage3D.apply(e,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function de(){try{e.compressedTexSubImage2D.apply(e,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Tt(){try{e.compressedTexSubImage3D.apply(e,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function je(){try{e.texStorage2D.apply(e,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function ze(){try{e.texStorage3D.apply(e,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Ae(){try{e.texImage2D.apply(e,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Ce(){try{e.texImage3D.apply(e,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function qe(N){me.equals(N)===!1&&(e.scissor(N.x,N.y,N.z,N.w),me.copy(N))}function ot(N){q.equals(N)===!1&&(e.viewport(N.x,N.y,N.z,N.w),q.copy(N))}function Qe(N,ve){let we=u.get(ve);we===void 0&&(we=new WeakMap,u.set(ve,we));let ke=we.get(N);ke===void 0&&(ke=e.getUniformBlockIndex(ve,N.name),we.set(N,ke))}function lt(N,ve){let we=u.get(ve).get(N);c.get(ve)!==we&&(e.uniformBlockBinding(ve,we,N.__bindingPointIndex),c.set(ve,we))}function _e(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),r===!0&&(e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null)),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),p={},j=null,I={},m={},g=new WeakMap,_=[],f=null,d=!1,M=null,x=null,S=null,D=null,R=null,L=null,B=null,b=new Ne(0,0,0),E=0,F=!1,V=null,Q=null,P=null,z=null,C=null,me.set(0,0,e.canvas.width,e.canvas.height),q.set(0,0,e.canvas.width,e.canvas.height),s.reset(),l.reset(),h.reset()}return{buffers:{color:s,depth:l,stencil:h},enable:ne,disable:re,bindFramebuffer:T,drawBuffers:ae,useProgram:te,setBlending:X,setMaterial:se,setFlipSided:ce,setCullFace:w,setLineWidth:y,setPolygonOffset:k,setScissorTest:le,activeTexture:oe,bindTexture:ue,unbindTexture:Re,compressedTexImage2D:fe,compressedTexImage3D:Me,texImage2D:Ae,texImage3D:Ce,updateUBOMapping:Qe,uniformBlockBinding:lt,texStorage2D:je,texStorage3D:ze,texSubImage2D:Te,texSubImage3D:Fe,compressedTexSubImage2D:de,compressedTexSubImage3D:Tt,scissor:qe,viewport:ot,reset:_e}}function P_(e,t,i,r,a,n,o){let s=a.isWebGL2,l=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,h=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new WeakMap,u,p=new WeakMap,m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(w,y){return m?new OffscreenCanvas(w,y):$n("canvas")}function _(w,y,k,le){let oe=1;if((w.width>le||w.height>le)&&(oe=le/Math.max(w.width,w.height)),oe<1||y===!0)if(typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&w instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&w instanceof ImageBitmap){let ue=y?Qn:Math.floor,Re=ue(oe*w.width),fe=ue(oe*w.height);u===void 0&&(u=g(Re,fe));let Me=k?g(Re,fe):u;return Me.width=Re,Me.height=fe,Me.getContext("2d").drawImage(w,0,0,Re,fe),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+w.width+"x"+w.height+") to ("+Re+"x"+fe+")."),Me}else return"data"in w&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+w.width+"x"+w.height+")."),w;return w}function f(w){return Eo(w.width)&&Eo(w.height)}function d(w){return s?!1:w.wrapS!==di||w.wrapT!==di||w.minFilter!==Nt&&w.minFilter!==ni}function M(w,y){return w.generateMipmaps&&y&&w.minFilter!==Nt&&w.minFilter!==ni}function x(w){e.generateMipmap(w)}function S(w,y,k,le,oe=!1){if(s===!1)return y;if(w!==null){if(e[w]!==void 0)return e[w];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+w+"'")}let ue=y;if(y===e.RED&&(k===e.FLOAT&&(ue=e.R32F),k===e.HALF_FLOAT&&(ue=e.R16F),k===e.UNSIGNED_BYTE&&(ue=e.R8)),y===e.RED_INTEGER&&(k===e.UNSIGNED_BYTE&&(ue=e.R8UI),k===e.UNSIGNED_SHORT&&(ue=e.R16UI),k===e.UNSIGNED_INT&&(ue=e.R32UI),k===e.BYTE&&(ue=e.R8I),k===e.SHORT&&(ue=e.R16I),k===e.INT&&(ue=e.R32I)),y===e.RG&&(k===e.FLOAT&&(ue=e.RG32F),k===e.HALF_FLOAT&&(ue=e.RG16F),k===e.UNSIGNED_BYTE&&(ue=e.RG8)),y===e.RGBA){let Re=oe?pn:it.getTransfer(le);k===e.FLOAT&&(ue=e.RGBA32F),k===e.HALF_FLOAT&&(ue=e.RGBA16F),k===e.UNSIGNED_BYTE&&(ue=Re===ct?e.SRGB8_ALPHA8:e.RGBA8),k===e.UNSIGNED_SHORT_4_4_4_4&&(ue=e.RGBA4),k===e.UNSIGNED_SHORT_5_5_5_1&&(ue=e.RGB5_A1)}return(ue===e.R16F||ue===e.R32F||ue===e.RG16F||ue===e.RG32F||ue===e.RGBA16F||ue===e.RGBA32F)&&t.get("EXT_color_buffer_float"),ue}function D(w,y,k){return M(w,k)===!0||w.isFramebufferTexture&&w.minFilter!==Nt&&w.minFilter!==ni?Math.log2(Math.max(y.width,y.height))+1:w.mipmaps!==void 0&&w.mipmaps.length>0?w.mipmaps.length:w.isCompressedTexture&&Array.isArray(w.image)?y.mipmaps.length:1}function R(w){return w===Nt||w===qo||w===ps?e.NEAREST:e.LINEAR}function L(w){let y=w.target;y.removeEventListener("dispose",L),b(y),y.isVideoTexture&&c.delete(y)}function B(w){let y=w.target;y.removeEventListener("dispose",B),F(y)}function b(w){let y=r.get(w);if(y.__webglInit===void 0)return;let k=w.source,le=p.get(k);if(le){let oe=le[y.__cacheKey];oe.usedTimes--,oe.usedTimes===0&&E(w),Object.keys(le).length===0&&p.delete(k)}r.remove(w)}function E(w){let y=r.get(w);e.deleteTexture(y.__webglTexture);let k=w.source,le=p.get(k);delete le[y.__cacheKey],o.memory.textures--}function F(w){let y=w.texture,k=r.get(w),le=r.get(y);if(le.__webglTexture!==void 0&&(e.deleteTexture(le.__webglTexture),o.memory.textures--),w.depthTexture&&w.depthTexture.dispose(),w.isWebGLCubeRenderTarget)for(let oe=0;oe<6;oe++){if(Array.isArray(k.__webglFramebuffer[oe]))for(let ue=0;ue<k.__webglFramebuffer[oe].length;ue++)e.deleteFramebuffer(k.__webglFramebuffer[oe][ue]);else e.deleteFramebuffer(k.__webglFramebuffer[oe]);k.__webglDepthbuffer&&e.deleteRenderbuffer(k.__webglDepthbuffer[oe])}else{if(Array.isArray(k.__webglFramebuffer))for(let oe=0;oe<k.__webglFramebuffer.length;oe++)e.deleteFramebuffer(k.__webglFramebuffer[oe]);else e.deleteFramebuffer(k.__webglFramebuffer);if(k.__webglDepthbuffer&&e.deleteRenderbuffer(k.__webglDepthbuffer),k.__webglMultisampledFramebuffer&&e.deleteFramebuffer(k.__webglMultisampledFramebuffer),k.__webglColorRenderbuffer)for(let oe=0;oe<k.__webglColorRenderbuffer.length;oe++)k.__webglColorRenderbuffer[oe]&&e.deleteRenderbuffer(k.__webglColorRenderbuffer[oe]);k.__webglDepthRenderbuffer&&e.deleteRenderbuffer(k.__webglDepthRenderbuffer)}if(w.isWebGLMultipleRenderTargets)for(let oe=0,ue=y.length;oe<ue;oe++){let Re=r.get(y[oe]);Re.__webglTexture&&(e.deleteTexture(Re.__webglTexture),o.memory.textures--),r.remove(y[oe])}r.remove(y),r.remove(w)}let V=0;function Q(){V=0}function P(){let w=V;return w>=a.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+w+" texture units while this GPU supports only "+a.maxTextures),V+=1,w}function z(w){let y=[];return y.push(w.wrapS),y.push(w.wrapT),y.push(w.wrapR||0),y.push(w.magFilter),y.push(w.minFilter),y.push(w.anisotropy),y.push(w.internalFormat),y.push(w.format),y.push(w.type),y.push(w.generateMipmaps),y.push(w.premultiplyAlpha),y.push(w.flipY),y.push(w.unpackAlignment),y.push(w.colorSpace),y.join()}function C(w,y){let k=r.get(w);if(w.isVideoTexture&&se(w),w.isRenderTargetTexture===!1&&w.version>0&&k.__version!==w.version){let le=w.image;if(le===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(le.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{me(k,w,y);return}}i.bindTexture(e.TEXTURE_2D,k.__webglTexture,e.TEXTURE0+y)}function G(w,y){let k=r.get(w);if(w.version>0&&k.__version!==w.version){me(k,w,y);return}i.bindTexture(e.TEXTURE_2D_ARRAY,k.__webglTexture,e.TEXTURE0+y)}function O(w,y){let k=r.get(w);if(w.version>0&&k.__version!==w.version){me(k,w,y);return}i.bindTexture(e.TEXTURE_3D,k.__webglTexture,e.TEXTURE0+y)}function U(w,y){let k=r.get(w);if(w.version>0&&k.__version!==w.version){q(k,w,y);return}i.bindTexture(e.TEXTURE_CUBE_MAP,k.__webglTexture,e.TEXTURE0+y)}let K={[us]:e.REPEAT,[di]:e.CLAMP_TO_EDGE,[ds]:e.MIRRORED_REPEAT},j={[Nt]:e.NEAREST,[qo]:e.NEAREST_MIPMAP_NEAREST,[ps]:e.NEAREST_MIPMAP_LINEAR,[ni]:e.LINEAR,[gu]:e.LINEAR_MIPMAP_NEAREST,[Ea]:e.LINEAR_MIPMAP_LINEAR},I={[Ru]:e.NEVER,[Nu]:e.ALWAYS,[Cu]:e.LESS,[Dl]:e.LEQUAL,[Lu]:e.EQUAL,[Uu]:e.GEQUAL,[Pu]:e.GREATER,[Du]:e.NOTEQUAL};function W(w,y,k){if(k?(e.texParameteri(w,e.TEXTURE_WRAP_S,K[y.wrapS]),e.texParameteri(w,e.TEXTURE_WRAP_T,K[y.wrapT]),(w===e.TEXTURE_3D||w===e.TEXTURE_2D_ARRAY)&&e.texParameteri(w,e.TEXTURE_WRAP_R,K[y.wrapR]),e.texParameteri(w,e.TEXTURE_MAG_FILTER,j[y.magFilter]),e.texParameteri(w,e.TEXTURE_MIN_FILTER,j[y.minFilter])):(e.texParameteri(w,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(w,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),(w===e.TEXTURE_3D||w===e.TEXTURE_2D_ARRAY)&&e.texParameteri(w,e.TEXTURE_WRAP_R,e.CLAMP_TO_EDGE),(y.wrapS!==di||y.wrapT!==di)&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.wrapS and Texture.wrapT should be set to THREE.ClampToEdgeWrapping."),e.texParameteri(w,e.TEXTURE_MAG_FILTER,R(y.magFilter)),e.texParameteri(w,e.TEXTURE_MIN_FILTER,R(y.minFilter)),y.minFilter!==Nt&&y.minFilter!==ni&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.minFilter should be set to THREE.NearestFilter or THREE.LinearFilter.")),y.compareFunction&&(e.texParameteri(w,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(w,e.TEXTURE_COMPARE_FUNC,I[y.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){let le=t.get("EXT_texture_filter_anisotropic");if(y.magFilter===Nt||y.minFilter!==ps&&y.minFilter!==Ea||y.type===zi&&t.has("OES_texture_float_linear")===!1||s===!1&&y.type===Ta&&t.has("OES_texture_half_float_linear")===!1)return;(y.anisotropy>1||r.get(y).__currentAnisotropy)&&(e.texParameterf(w,le.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(y.anisotropy,a.getMaxAnisotropy())),r.get(y).__currentAnisotropy=y.anisotropy)}}function he(w,y){let k=!1;w.__webglInit===void 0&&(w.__webglInit=!0,y.addEventListener("dispose",L));let le=y.source,oe=p.get(le);oe===void 0&&(oe={},p.set(le,oe));let ue=z(y);if(ue!==w.__cacheKey){oe[ue]===void 0&&(oe[ue]={texture:e.createTexture(),usedTimes:0},o.memory.textures++,k=!0),oe[ue].usedTimes++;let Re=oe[w.__cacheKey];Re!==void 0&&(oe[w.__cacheKey].usedTimes--,Re.usedTimes===0&&E(y)),w.__cacheKey=ue,w.__webglTexture=oe[ue].texture}return k}function me(w,y,k){let le=e.TEXTURE_2D;(y.isDataArrayTexture||y.isCompressedArrayTexture)&&(le=e.TEXTURE_2D_ARRAY),y.isData3DTexture&&(le=e.TEXTURE_3D);let oe=he(w,y),ue=y.source;i.bindTexture(le,w.__webglTexture,e.TEXTURE0+k);let Re=r.get(ue);if(ue.version!==Re.__version||oe===!0){i.activeTexture(e.TEXTURE0+k);let fe=it.getPrimaries(it.workingColorSpace),Me=y.colorSpace===oi?null:it.getPrimaries(y.colorSpace),Te=y.colorSpace===oi||fe===Me?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,y.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,y.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,Te);let Fe=d(y)&&f(y.image)===!1,de=_(y.image,Fe,!1,a.maxTextureSize);de=ce(y,de);let Tt=f(de)||s,je=n.convert(y.format,y.colorSpace),ze=n.convert(y.type),Ae=S(y.internalFormat,je,ze,y.colorSpace,y.isVideoTexture);W(le,y,Tt);let Ce,qe=y.mipmaps,ot=s&&y.isVideoTexture!==!0&&Ae!==al,Qe=Re.__version===void 0||oe===!0,lt=D(y,de,Tt);if(y.isDepthTexture)Ae=e.DEPTH_COMPONENT,s?y.type===zi?Ae=e.DEPTH_COMPONENT32F:y.type===nr?Ae=e.DEPTH_COMPONENT24:y.type===xr?Ae=e.DEPTH24_STENCIL8:Ae=e.DEPTH_COMPONENT16:y.type===zi&&console.error("WebGLRenderer: Floating point depth texture requires WebGL2."),y.format===yr&&Ae===e.DEPTH_COMPONENT&&y.type!==ms&&y.type!==nr&&(console.warn("THREE.WebGLRenderer: Use UnsignedShortType or UnsignedIntType for DepthFormat DepthTexture."),y.type=nr,ze=n.convert(y.type)),y.format===kr&&Ae===e.DEPTH_COMPONENT&&(Ae=e.DEPTH_STENCIL,y.type!==xr&&(console.warn("THREE.WebGLRenderer: Use UnsignedInt248Type for DepthStencilFormat DepthTexture."),y.type=xr,ze=n.convert(y.type))),Qe&&(ot?i.texStorage2D(e.TEXTURE_2D,1,Ae,de.width,de.height):i.texImage2D(e.TEXTURE_2D,0,Ae,de.width,de.height,0,je,ze,null));else if(y.isDataTexture)if(qe.length>0&&Tt){ot&&Qe&&i.texStorage2D(e.TEXTURE_2D,lt,Ae,qe[0].width,qe[0].height);for(let _e=0,N=qe.length;_e<N;_e++)Ce=qe[_e],ot?i.texSubImage2D(e.TEXTURE_2D,_e,0,0,Ce.width,Ce.height,je,ze,Ce.data):i.texImage2D(e.TEXTURE_2D,_e,Ae,Ce.width,Ce.height,0,je,ze,Ce.data);y.generateMipmaps=!1}else ot?(Qe&&i.texStorage2D(e.TEXTURE_2D,lt,Ae,de.width,de.height),i.texSubImage2D(e.TEXTURE_2D,0,0,0,de.width,de.height,je,ze,de.data)):i.texImage2D(e.TEXTURE_2D,0,Ae,de.width,de.height,0,je,ze,de.data);else if(y.isCompressedTexture)if(y.isCompressedArrayTexture){ot&&Qe&&i.texStorage3D(e.TEXTURE_2D_ARRAY,lt,Ae,qe[0].width,qe[0].height,de.depth);for(let _e=0,N=qe.length;_e<N;_e++)Ce=qe[_e],y.format!==si?je!==null?ot?i.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,_e,0,0,0,Ce.width,Ce.height,de.depth,je,Ce.data,0,0):i.compressedTexImage3D(e.TEXTURE_2D_ARRAY,_e,Ae,Ce.width,Ce.height,de.depth,0,Ce.data,0,0):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):ot?i.texSubImage3D(e.TEXTURE_2D_ARRAY,_e,0,0,0,Ce.width,Ce.height,de.depth,je,ze,Ce.data):i.texImage3D(e.TEXTURE_2D_ARRAY,_e,Ae,Ce.width,Ce.height,de.depth,0,je,ze,Ce.data)}else{ot&&Qe&&i.texStorage2D(e.TEXTURE_2D,lt,Ae,qe[0].width,qe[0].height);for(let _e=0,N=qe.length;_e<N;_e++)Ce=qe[_e],y.format!==si?je!==null?ot?i.compressedTexSubImage2D(e.TEXTURE_2D,_e,0,0,Ce.width,Ce.height,je,Ce.data):i.compressedTexImage2D(e.TEXTURE_2D,_e,Ae,Ce.width,Ce.height,0,Ce.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):ot?i.texSubImage2D(e.TEXTURE_2D,_e,0,0,Ce.width,Ce.height,je,ze,Ce.data):i.texImage2D(e.TEXTURE_2D,_e,Ae,Ce.width,Ce.height,0,je,ze,Ce.data)}else if(y.isDataArrayTexture)ot?(Qe&&i.texStorage3D(e.TEXTURE_2D_ARRAY,lt,Ae,de.width,de.height,de.depth),i.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,de.width,de.height,de.depth,je,ze,de.data)):i.texImage3D(e.TEXTURE_2D_ARRAY,0,Ae,de.width,de.height,de.depth,0,je,ze,de.data);else if(y.isData3DTexture)ot?(Qe&&i.texStorage3D(e.TEXTURE_3D,lt,Ae,de.width,de.height,de.depth),i.texSubImage3D(e.TEXTURE_3D,0,0,0,0,de.width,de.height,de.depth,je,ze,de.data)):i.texImage3D(e.TEXTURE_3D,0,Ae,de.width,de.height,de.depth,0,je,ze,de.data);else if(y.isFramebufferTexture){if(Qe)if(ot)i.texStorage2D(e.TEXTURE_2D,lt,Ae,de.width,de.height);else{let _e=de.width,N=de.height;for(let ve=0;ve<lt;ve++)i.texImage2D(e.TEXTURE_2D,ve,Ae,_e,N,0,je,ze,null),_e>>=1,N>>=1}}else if(qe.length>0&&Tt){ot&&Qe&&i.texStorage2D(e.TEXTURE_2D,lt,Ae,qe[0].width,qe[0].height);for(let _e=0,N=qe.length;_e<N;_e++)Ce=qe[_e],ot?i.texSubImage2D(e.TEXTURE_2D,_e,0,0,je,ze,Ce):i.texImage2D(e.TEXTURE_2D,_e,Ae,je,ze,Ce);y.generateMipmaps=!1}else ot?(Qe&&i.texStorage2D(e.TEXTURE_2D,lt,Ae,de.width,de.height),i.texSubImage2D(e.TEXTURE_2D,0,0,0,je,ze,de)):i.texImage2D(e.TEXTURE_2D,0,Ae,je,ze,de);M(y,Tt)&&x(le),Re.__version=ue.version,y.onUpdate&&y.onUpdate(y)}w.__version=y.version}function q(w,y,k){if(y.image.length!==6)return;let le=he(w,y),oe=y.source;i.bindTexture(e.TEXTURE_CUBE_MAP,w.__webglTexture,e.TEXTURE0+k);let ue=r.get(oe);if(oe.version!==ue.__version||le===!0){i.activeTexture(e.TEXTURE0+k);let Re=it.getPrimaries(it.workingColorSpace),fe=y.colorSpace===oi?null:it.getPrimaries(y.colorSpace),Me=y.colorSpace===oi||Re===fe?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,y.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,y.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,Me);let Te=y.isCompressedTexture||y.image[0].isCompressedTexture,Fe=y.image[0]&&y.image[0].isDataTexture,de=[];for(let _e=0;_e<6;_e++)!Te&&!Fe?de[_e]=_(y.image[_e],!1,!0,a.maxCubemapSize):de[_e]=Fe?y.image[_e].image:y.image[_e],de[_e]=ce(y,de[_e]);let Tt=de[0],je=f(Tt)||s,ze=n.convert(y.format,y.colorSpace),Ae=n.convert(y.type),Ce=S(y.internalFormat,ze,Ae,y.colorSpace),qe=s&&y.isVideoTexture!==!0,ot=ue.__version===void 0||le===!0,Qe=D(y,Tt,je);W(e.TEXTURE_CUBE_MAP,y,je);let lt;if(Te){qe&&ot&&i.texStorage2D(e.TEXTURE_CUBE_MAP,Qe,Ce,Tt.width,Tt.height);for(let _e=0;_e<6;_e++){lt=de[_e].mipmaps;for(let N=0;N<lt.length;N++){let ve=lt[N];y.format!==si?ze!==null?qe?i.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+_e,N,0,0,ve.width,ve.height,ze,ve.data):i.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+_e,N,Ce,ve.width,ve.height,0,ve.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):qe?i.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+_e,N,0,0,ve.width,ve.height,ze,Ae,ve.data):i.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+_e,N,Ce,ve.width,ve.height,0,ze,Ae,ve.data)}}}else{lt=y.mipmaps,qe&&ot&&(lt.length>0&&Qe++,i.texStorage2D(e.TEXTURE_CUBE_MAP,Qe,Ce,de[0].width,de[0].height));for(let _e=0;_e<6;_e++)if(Fe){qe?i.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+_e,0,0,0,de[_e].width,de[_e].height,ze,Ae,de[_e].data):i.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+_e,0,Ce,de[_e].width,de[_e].height,0,ze,Ae,de[_e].data);for(let N=0;N<lt.length;N++){let ve=lt[N].image[_e].image;qe?i.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+_e,N+1,0,0,ve.width,ve.height,ze,Ae,ve.data):i.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+_e,N+1,Ce,ve.width,ve.height,0,ze,Ae,ve.data)}}else{qe?i.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+_e,0,0,0,ze,Ae,de[_e]):i.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+_e,0,Ce,ze,Ae,de[_e]);for(let N=0;N<lt.length;N++){let ve=lt[N];qe?i.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+_e,N+1,0,0,ze,Ae,ve.image[_e]):i.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+_e,N+1,Ce,ze,Ae,ve.image[_e])}}}M(y,je)&&x(e.TEXTURE_CUBE_MAP),ue.__version=oe.version,y.onUpdate&&y.onUpdate(y)}w.__version=y.version}function $(w,y,k,le,oe,ue){let Re=n.convert(k.format,k.colorSpace),fe=n.convert(k.type),Me=S(k.internalFormat,Re,fe,k.colorSpace);if(!r.get(y).__hasExternalTextures){let Te=Math.max(1,y.width>>ue),Fe=Math.max(1,y.height>>ue);oe===e.TEXTURE_3D||oe===e.TEXTURE_2D_ARRAY?i.texImage3D(oe,ue,Me,Te,Fe,y.depth,0,Re,fe,null):i.texImage2D(oe,ue,Me,Te,Fe,0,Re,fe,null)}i.bindFramebuffer(e.FRAMEBUFFER,w),X(y)?l.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,le,oe,r.get(k).__webglTexture,0,ee(y)):(oe===e.TEXTURE_2D||oe>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&oe<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,le,oe,r.get(k).__webglTexture,ue),i.bindFramebuffer(e.FRAMEBUFFER,null)}function pe(w,y,k){if(e.bindRenderbuffer(e.RENDERBUFFER,w),y.depthBuffer&&!y.stencilBuffer){let le=s===!0?e.DEPTH_COMPONENT24:e.DEPTH_COMPONENT16;if(k||X(y)){let oe=y.depthTexture;oe&&oe.isDepthTexture&&(oe.type===zi?le=e.DEPTH_COMPONENT32F:oe.type===nr&&(le=e.DEPTH_COMPONENT24));let ue=ee(y);X(y)?l.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,ue,le,y.width,y.height):e.renderbufferStorageMultisample(e.RENDERBUFFER,ue,le,y.width,y.height)}else e.renderbufferStorage(e.RENDERBUFFER,le,y.width,y.height);e.framebufferRenderbuffer(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.RENDERBUFFER,w)}else if(y.depthBuffer&&y.stencilBuffer){let le=ee(y);k&&X(y)===!1?e.renderbufferStorageMultisample(e.RENDERBUFFER,le,e.DEPTH24_STENCIL8,y.width,y.height):X(y)?l.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,le,e.DEPTH24_STENCIL8,y.width,y.height):e.renderbufferStorage(e.RENDERBUFFER,e.DEPTH_STENCIL,y.width,y.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.RENDERBUFFER,w)}else{let le=y.isWebGLMultipleRenderTargets===!0?y.texture:[y.texture];for(let oe=0;oe<le.length;oe++){let ue=le[oe],Re=n.convert(ue.format,ue.colorSpace),fe=n.convert(ue.type),Me=S(ue.internalFormat,Re,fe,ue.colorSpace),Te=ee(y);k&&X(y)===!1?e.renderbufferStorageMultisample(e.RENDERBUFFER,Te,Me,y.width,y.height):X(y)?l.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,Te,Me,y.width,y.height):e.renderbufferStorage(e.RENDERBUFFER,Me,y.width,y.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function ne(w,y){if(y&&y.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(i.bindFramebuffer(e.FRAMEBUFFER,w),!(y.depthTexture&&y.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!r.get(y.depthTexture).__webglTexture||y.depthTexture.image.width!==y.width||y.depthTexture.image.height!==y.height)&&(y.depthTexture.image.width=y.width,y.depthTexture.image.height=y.height,y.depthTexture.needsUpdate=!0),C(y.depthTexture,0);let k=r.get(y.depthTexture).__webglTexture,le=ee(y);if(y.depthTexture.format===yr)X(y)?l.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,k,0,le):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,k,0);else if(y.depthTexture.format===kr)X(y)?l.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,k,0,le):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,k,0);else throw new Error("Unknown depthTexture format")}function re(w){let y=r.get(w),k=w.isWebGLCubeRenderTarget===!0;if(w.depthTexture&&!y.__autoAllocateDepthBuffer){if(k)throw new Error("target.depthTexture not supported in Cube render targets");ne(y.__webglFramebuffer,w)}else if(k){y.__webglDepthbuffer=[];for(let le=0;le<6;le++)i.bindFramebuffer(e.FRAMEBUFFER,y.__webglFramebuffer[le]),y.__webglDepthbuffer[le]=e.createRenderbuffer(),pe(y.__webglDepthbuffer[le],w,!1)}else i.bindFramebuffer(e.FRAMEBUFFER,y.__webglFramebuffer),y.__webglDepthbuffer=e.createRenderbuffer(),pe(y.__webglDepthbuffer,w,!1);i.bindFramebuffer(e.FRAMEBUFFER,null)}function T(w,y,k){let le=r.get(w);y!==void 0&&$(le.__webglFramebuffer,w,w.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),k!==void 0&&re(w)}function ae(w){let y=w.texture,k=r.get(w),le=r.get(y);w.addEventListener("dispose",B),w.isWebGLMultipleRenderTargets!==!0&&(le.__webglTexture===void 0&&(le.__webglTexture=e.createTexture()),le.__version=y.version,o.memory.textures++);let oe=w.isWebGLCubeRenderTarget===!0,ue=w.isWebGLMultipleRenderTargets===!0,Re=f(w)||s;if(oe){k.__webglFramebuffer=[];for(let fe=0;fe<6;fe++)if(s&&y.mipmaps&&y.mipmaps.length>0){k.__webglFramebuffer[fe]=[];for(let Me=0;Me<y.mipmaps.length;Me++)k.__webglFramebuffer[fe][Me]=e.createFramebuffer()}else k.__webglFramebuffer[fe]=e.createFramebuffer()}else{if(s&&y.mipmaps&&y.mipmaps.length>0){k.__webglFramebuffer=[];for(let fe=0;fe<y.mipmaps.length;fe++)k.__webglFramebuffer[fe]=e.createFramebuffer()}else k.__webglFramebuffer=e.createFramebuffer();if(ue)if(a.drawBuffers){let fe=w.texture;for(let Me=0,Te=fe.length;Me<Te;Me++){let Fe=r.get(fe[Me]);Fe.__webglTexture===void 0&&(Fe.__webglTexture=e.createTexture(),o.memory.textures++)}}else console.warn("THREE.WebGLRenderer: WebGLMultipleRenderTargets can only be used with WebGL2 or WEBGL_draw_buffers extension.");if(s&&w.samples>0&&X(w)===!1){let fe=ue?y:[y];k.__webglMultisampledFramebuffer=e.createFramebuffer(),k.__webglColorRenderbuffer=[],i.bindFramebuffer(e.FRAMEBUFFER,k.__webglMultisampledFramebuffer);for(let Me=0;Me<fe.length;Me++){let Te=fe[Me];k.__webglColorRenderbuffer[Me]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,k.__webglColorRenderbuffer[Me]);let Fe=n.convert(Te.format,Te.colorSpace),de=n.convert(Te.type),Tt=S(Te.internalFormat,Fe,de,Te.colorSpace,w.isXRRenderTarget===!0),je=ee(w);e.renderbufferStorageMultisample(e.RENDERBUFFER,je,Tt,w.width,w.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+Me,e.RENDERBUFFER,k.__webglColorRenderbuffer[Me])}e.bindRenderbuffer(e.RENDERBUFFER,null),w.depthBuffer&&(k.__webglDepthRenderbuffer=e.createRenderbuffer(),pe(k.__webglDepthRenderbuffer,w,!0)),i.bindFramebuffer(e.FRAMEBUFFER,null)}}if(oe){i.bindTexture(e.TEXTURE_CUBE_MAP,le.__webglTexture),W(e.TEXTURE_CUBE_MAP,y,Re);for(let fe=0;fe<6;fe++)if(s&&y.mipmaps&&y.mipmaps.length>0)for(let Me=0;Me<y.mipmaps.length;Me++)$(k.__webglFramebuffer[fe][Me],w,y,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+fe,Me);else $(k.__webglFramebuffer[fe],w,y,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+fe,0);M(y,Re)&&x(e.TEXTURE_CUBE_MAP),i.unbindTexture()}else if(ue){let fe=w.texture;for(let Me=0,Te=fe.length;Me<Te;Me++){let Fe=fe[Me],de=r.get(Fe);i.bindTexture(e.TEXTURE_2D,de.__webglTexture),W(e.TEXTURE_2D,Fe,Re),$(k.__webglFramebuffer,w,Fe,e.COLOR_ATTACHMENT0+Me,e.TEXTURE_2D,0),M(Fe,Re)&&x(e.TEXTURE_2D)}i.unbindTexture()}else{let fe=e.TEXTURE_2D;if((w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)&&(s?fe=w.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY:console.error("THREE.WebGLTextures: THREE.Data3DTexture and THREE.DataArrayTexture only supported with WebGL2.")),i.bindTexture(fe,le.__webglTexture),W(fe,y,Re),s&&y.mipmaps&&y.mipmaps.length>0)for(let Me=0;Me<y.mipmaps.length;Me++)$(k.__webglFramebuffer[Me],w,y,e.COLOR_ATTACHMENT0,fe,Me);else $(k.__webglFramebuffer,w,y,e.COLOR_ATTACHMENT0,fe,0);M(y,Re)&&x(fe),i.unbindTexture()}w.depthBuffer&&re(w)}function te(w){let y=f(w)||s,k=w.isWebGLMultipleRenderTargets===!0?w.texture:[w.texture];for(let le=0,oe=k.length;le<oe;le++){let ue=k[le];if(M(ue,y)){let Re=w.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:e.TEXTURE_2D,fe=r.get(ue).__webglTexture;i.bindTexture(Re,fe),x(Re),i.unbindTexture()}}}function ie(w){if(s&&w.samples>0&&X(w)===!1){let y=w.isWebGLMultipleRenderTargets?w.texture:[w.texture],k=w.width,le=w.height,oe=e.COLOR_BUFFER_BIT,ue=[],Re=w.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,fe=r.get(w),Me=w.isWebGLMultipleRenderTargets===!0;if(Me)for(let Te=0;Te<y.length;Te++)i.bindFramebuffer(e.FRAMEBUFFER,fe.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+Te,e.RENDERBUFFER,null),i.bindFramebuffer(e.FRAMEBUFFER,fe.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+Te,e.TEXTURE_2D,null,0);i.bindFramebuffer(e.READ_FRAMEBUFFER,fe.__webglMultisampledFramebuffer),i.bindFramebuffer(e.DRAW_FRAMEBUFFER,fe.__webglFramebuffer);for(let Te=0;Te<y.length;Te++){ue.push(e.COLOR_ATTACHMENT0+Te),w.depthBuffer&&ue.push(Re);let Fe=fe.__ignoreDepthValues!==void 0?fe.__ignoreDepthValues:!1;if(Fe===!1&&(w.depthBuffer&&(oe|=e.DEPTH_BUFFER_BIT),w.stencilBuffer&&(oe|=e.STENCIL_BUFFER_BIT)),Me&&e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,fe.__webglColorRenderbuffer[Te]),Fe===!0&&(e.invalidateFramebuffer(e.READ_FRAMEBUFFER,[Re]),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[Re])),Me){let de=r.get(y[Te]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,de,0)}e.blitFramebuffer(0,0,k,le,0,0,k,le,oe,e.NEAREST),h&&e.invalidateFramebuffer(e.READ_FRAMEBUFFER,ue)}if(i.bindFramebuffer(e.READ_FRAMEBUFFER,null),i.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),Me)for(let Te=0;Te<y.length;Te++){i.bindFramebuffer(e.FRAMEBUFFER,fe.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+Te,e.RENDERBUFFER,fe.__webglColorRenderbuffer[Te]);let Fe=r.get(y[Te]).__webglTexture;i.bindFramebuffer(e.FRAMEBUFFER,fe.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+Te,e.TEXTURE_2D,Fe,0)}i.bindFramebuffer(e.DRAW_FRAMEBUFFER,fe.__webglMultisampledFramebuffer)}}function ee(w){return Math.min(a.maxSamples,w.samples)}function X(w){let y=r.get(w);return s&&w.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&y.__useRenderToTexture!==!1}function se(w){let y=o.render.frame;c.get(w)!==y&&(c.set(w,y),w.update())}function ce(w,y){let k=w.colorSpace,le=w.format,oe=w.type;return w.isCompressedTexture===!0||w.isVideoTexture===!0||w.format===bs||k!==ki&&k!==oi&&(it.getTransfer(k)===ct?s===!1?t.has("EXT_sRGB")===!0&&le===si?(w.format=bs,w.minFilter=ni,w.generateMipmaps=!1):y=kl.sRGBToLinear(y):(le!==si||oe!==ar)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",k)),y}this.allocateTextureUnit=P,this.resetTextureUnits=Q,this.setTexture2D=C,this.setTexture2DArray=G,this.setTexture3D=O,this.setTextureCube=U,this.rebindTextures=T,this.setupRenderTarget=ae,this.updateRenderTargetMipmap=te,this.updateMultisampleRenderTarget=ie,this.setupDepthRenderbuffer=re,this.setupFrameBufferTexture=$,this.useMultisampledRTT=X}function D_(e,t,i){let r=i.isWebGL2;function a(n,o=oi){let s,l=it.getTransfer(o);if(n===ar)return e.UNSIGNED_BYTE;if(n===Ko)return e.UNSIGNED_SHORT_4_4_4_4;if(n===Jo)return e.UNSIGNED_SHORT_5_5_5_1;if(n===_u)return e.BYTE;if(n===vu)return e.SHORT;if(n===ms)return e.UNSIGNED_SHORT;if(n===Yo)return e.INT;if(n===nr)return e.UNSIGNED_INT;if(n===zi)return e.FLOAT;if(n===Ta)return r?e.HALF_FLOAT:(s=t.get("OES_texture_half_float"),s!==null?s.HALF_FLOAT_OES:null);if(n===xu)return e.ALPHA;if(n===si)return e.RGBA;if(n===yu)return e.LUMINANCE;if(n===Mu)return e.LUMINANCE_ALPHA;if(n===yr)return e.DEPTH_COMPONENT;if(n===kr)return e.DEPTH_STENCIL;if(n===bs)return s=t.get("EXT_sRGB"),s!==null?s.SRGB_ALPHA_EXT:null;if(n===bu)return e.RED;if(n===Zo)return e.RED_INTEGER;if(n===Su)return e.RG;if(n===Qo)return e.RG_INTEGER;if(n===$o)return e.RGBA_INTEGER;if(n===fs||n===gs||n===_s||n===vs)if(l===ct)if(s=t.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(n===fs)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===gs)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===_s)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===vs)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=t.get("WEBGL_compressed_texture_s3tc"),s!==null){if(n===fs)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===gs)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===_s)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===vs)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===el||n===tl||n===il||n===rl)if(s=t.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(n===el)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===tl)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===il)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===rl)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===al)return s=t.get("WEBGL_compressed_texture_etc1"),s!==null?s.COMPRESSED_RGB_ETC1_WEBGL:null;if(n===nl||n===sl)if(s=t.get("WEBGL_compressed_texture_etc"),s!==null){if(n===nl)return l===ct?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(n===sl)return l===ct?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===ol||n===ll||n===hl||n===cl||n===ul||n===dl||n===pl||n===ml||n===fl||n===gl||n===_l||n===vl||n===xl||n===yl)if(s=t.get("WEBGL_compressed_texture_astc"),s!==null){if(n===ol)return l===ct?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===ll)return l===ct?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===hl)return l===ct?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===cl)return l===ct?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===ul)return l===ct?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===dl)return l===ct?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===pl)return l===ct?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===ml)return l===ct?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===fl)return l===ct?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===gl)return l===ct?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===_l)return l===ct?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===vl)return l===ct?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===xl)return l===ct?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===yl)return l===ct?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===xs||n===Ml||n===bl)if(s=t.get("EXT_texture_compression_bptc"),s!==null){if(n===xs)return l===ct?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Ml)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===bl)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===wu||n===Sl||n===wl||n===El)if(s=t.get("EXT_texture_compression_rgtc"),s!==null){if(n===xs)return s.COMPRESSED_RED_RGTC1_EXT;if(n===Sl)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===wl)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===El)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===xr?r?e.UNSIGNED_INT_24_8:(s=t.get("WEBGL_depth_texture"),s!==null?s.UNSIGNED_INT_24_8_WEBGL:null):e[n]!==void 0?e[n]:null}return{convert:a}}function U_(e,t){function i(f,d){f.matrixAutoUpdate===!0&&f.updateMatrix(),d.value.copy(f.matrix)}function r(f,d){d.color.getRGB(f.fogColor.value,fc(e)),d.isFog?(f.fogNear.value=d.near,f.fogFar.value=d.far):d.isFogExp2&&(f.fogDensity.value=d.density)}function a(f,d,M,x,S){d.isMeshBasicMaterial||d.isMeshLambertMaterial?n(f,d):d.isMeshToonMaterial?(n(f,d),u(f,d)):d.isMeshPhongMaterial?(n(f,d),c(f,d)):d.isMeshStandardMaterial?(n(f,d),p(f,d),d.isMeshPhysicalMaterial&&m(f,d,S)):d.isMeshMatcapMaterial?(n(f,d),g(f,d)):d.isMeshDepthMaterial?n(f,d):d.isMeshDistanceMaterial?(n(f,d),_(f,d)):d.isMeshNormalMaterial?n(f,d):d.isLineBasicMaterial?(o(f,d),d.isLineDashedMaterial&&s(f,d)):d.isPointsMaterial?l(f,d,M,x):d.isSpriteMaterial?h(f,d):d.isShadowMaterial?(f.color.value.copy(d.color),f.opacity.value=d.opacity):d.isShaderMaterial&&(d.uniformsNeedUpdate=!1)}function n(f,d){f.opacity.value=d.opacity,d.color&&f.diffuse.value.copy(d.color),d.emissive&&f.emissive.value.copy(d.emissive).multiplyScalar(d.emissiveIntensity),d.map&&(f.map.value=d.map,i(d.map,f.mapTransform)),d.alphaMap&&(f.alphaMap.value=d.alphaMap,i(d.alphaMap,f.alphaMapTransform)),d.bumpMap&&(f.bumpMap.value=d.bumpMap,i(d.bumpMap,f.bumpMapTransform),f.bumpScale.value=d.bumpScale,d.side===Vt&&(f.bumpScale.value*=-1)),d.normalMap&&(f.normalMap.value=d.normalMap,i(d.normalMap,f.normalMapTransform),f.normalScale.value.copy(d.normalScale),d.side===Vt&&f.normalScale.value.negate()),d.displacementMap&&(f.displacementMap.value=d.displacementMap,i(d.displacementMap,f.displacementMapTransform),f.displacementScale.value=d.displacementScale,f.displacementBias.value=d.displacementBias),d.emissiveMap&&(f.emissiveMap.value=d.emissiveMap,i(d.emissiveMap,f.emissiveMapTransform)),d.specularMap&&(f.specularMap.value=d.specularMap,i(d.specularMap,f.specularMapTransform)),d.alphaTest>0&&(f.alphaTest.value=d.alphaTest);let M=t.get(d).envMap;if(M&&(f.envMap.value=M,f.flipEnvMap.value=M.isCubeTexture&&M.isRenderTargetTexture===!1?-1:1,f.reflectivity.value=d.reflectivity,f.ior.value=d.ior,f.refractionRatio.value=d.refractionRatio),d.lightMap){f.lightMap.value=d.lightMap;let x=e._useLegacyLights===!0?Math.PI:1;f.lightMapIntensity.value=d.lightMapIntensity*x,i(d.lightMap,f.lightMapTransform)}d.aoMap&&(f.aoMap.value=d.aoMap,f.aoMapIntensity.value=d.aoMapIntensity,i(d.aoMap,f.aoMapTransform))}function o(f,d){f.diffuse.value.copy(d.color),f.opacity.value=d.opacity,d.map&&(f.map.value=d.map,i(d.map,f.mapTransform))}function s(f,d){f.dashSize.value=d.dashSize,f.totalSize.value=d.dashSize+d.gapSize,f.scale.value=d.scale}function l(f,d,M,x){f.diffuse.value.copy(d.color),f.opacity.value=d.opacity,f.size.value=d.size*M,f.scale.value=x*.5,d.map&&(f.map.value=d.map,i(d.map,f.uvTransform)),d.alphaMap&&(f.alphaMap.value=d.alphaMap,i(d.alphaMap,f.alphaMapTransform)),d.alphaTest>0&&(f.alphaTest.value=d.alphaTest)}function h(f,d){f.diffuse.value.copy(d.color),f.opacity.value=d.opacity,f.rotation.value=d.rotation,d.map&&(f.map.value=d.map,i(d.map,f.mapTransform)),d.alphaMap&&(f.alphaMap.value=d.alphaMap,i(d.alphaMap,f.alphaMapTransform)),d.alphaTest>0&&(f.alphaTest.value=d.alphaTest)}function c(f,d){f.specular.value.copy(d.specular),f.shininess.value=Math.max(d.shininess,1e-4)}function u(f,d){d.gradientMap&&(f.gradientMap.value=d.gradientMap)}function p(f,d){f.metalness.value=d.metalness,d.metalnessMap&&(f.metalnessMap.value=d.metalnessMap,i(d.metalnessMap,f.metalnessMapTransform)),f.roughness.value=d.roughness,d.roughnessMap&&(f.roughnessMap.value=d.roughnessMap,i(d.roughnessMap,f.roughnessMapTransform)),t.get(d).envMap&&(f.envMapIntensity.value=d.envMapIntensity)}function m(f,d,M){f.ior.value=d.ior,d.sheen>0&&(f.sheenColor.value.copy(d.sheenColor).multiplyScalar(d.sheen),f.sheenRoughness.value=d.sheenRoughness,d.sheenColorMap&&(f.sheenColorMap.value=d.sheenColorMap,i(d.sheenColorMap,f.sheenColorMapTransform)),d.sheenRoughnessMap&&(f.sheenRoughnessMap.value=d.sheenRoughnessMap,i(d.sheenRoughnessMap,f.sheenRoughnessMapTransform))),d.clearcoat>0&&(f.clearcoat.value=d.clearcoat,f.clearcoatRoughness.value=d.clearcoatRoughness,d.clearcoatMap&&(f.clearcoatMap.value=d.clearcoatMap,i(d.clearcoatMap,f.clearcoatMapTransform)),d.clearcoatRoughnessMap&&(f.clearcoatRoughnessMap.value=d.clearcoatRoughnessMap,i(d.clearcoatRoughnessMap,f.clearcoatRoughnessMapTransform)),d.clearcoatNormalMap&&(f.clearcoatNormalMap.value=d.clearcoatNormalMap,i(d.clearcoatNormalMap,f.clearcoatNormalMapTransform),f.clearcoatNormalScale.value.copy(d.clearcoatNormalScale),d.side===Vt&&f.clearcoatNormalScale.value.negate())),d.iridescence>0&&(f.iridescence.value=d.iridescence,f.iridescenceIOR.value=d.iridescenceIOR,f.iridescenceThicknessMinimum.value=d.iridescenceThicknessRange[0],f.iridescenceThicknessMaximum.value=d.iridescenceThicknessRange[1],d.iridescenceMap&&(f.iridescenceMap.value=d.iridescenceMap,i(d.iridescenceMap,f.iridescenceMapTransform)),d.iridescenceThicknessMap&&(f.iridescenceThicknessMap.value=d.iridescenceThicknessMap,i(d.iridescenceThicknessMap,f.iridescenceThicknessMapTransform))),d.transmission>0&&(f.transmission.value=d.transmission,f.transmissionSamplerMap.value=M.texture,f.transmissionSamplerSize.value.set(M.width,M.height),d.transmissionMap&&(f.transmissionMap.value=d.transmissionMap,i(d.transmissionMap,f.transmissionMapTransform)),f.thickness.value=d.thickness,d.thicknessMap&&(f.thicknessMap.value=d.thicknessMap,i(d.thicknessMap,f.thicknessMapTransform)),f.attenuationDistance.value=d.attenuationDistance,f.attenuationColor.value.copy(d.attenuationColor)),d.anisotropy>0&&(f.anisotropyVector.value.set(d.anisotropy*Math.cos(d.anisotropyRotation),d.anisotropy*Math.sin(d.anisotropyRotation)),d.anisotropyMap&&(f.anisotropyMap.value=d.anisotropyMap,i(d.anisotropyMap,f.anisotropyMapTransform))),f.specularIntensity.value=d.specularIntensity,f.specularColor.value.copy(d.specularColor),d.specularColorMap&&(f.specularColorMap.value=d.specularColorMap,i(d.specularColorMap,f.specularColorMapTransform)),d.specularIntensityMap&&(f.specularIntensityMap.value=d.specularIntensityMap,i(d.specularIntensityMap,f.specularIntensityMapTransform))}function g(f,d){d.matcap&&(f.matcap.value=d.matcap)}function _(f,d){let M=t.get(d).light;f.referencePosition.value.setFromMatrixPosition(M.matrixWorld),f.nearDistance.value=M.shadow.camera.near,f.farDistance.value=M.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:a}}function N_(e,t,i,r){let a={},n={},o=[],s=i.isWebGL2?e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS):0;function l(M,x){let S=x.program;r.uniformBlockBinding(M,S)}function h(M,x){let S=a[M.id];S===void 0&&(g(M),S=c(M),a[M.id]=S,M.addEventListener("dispose",f));let D=x.program;r.updateUBOMapping(M,D);let R=t.render.frame;n[M.id]!==R&&(p(M),n[M.id]=R)}function c(M){let x=u();M.__bindingPointIndex=x;let S=e.createBuffer(),D=M.__size,R=M.usage;return e.bindBuffer(e.UNIFORM_BUFFER,S),e.bufferData(e.UNIFORM_BUFFER,D,R),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,x,S),S}function u(){for(let M=0;M<s;M++)if(o.indexOf(M)===-1)return o.push(M),M;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function p(M){let x=a[M.id],S=M.uniforms,D=M.__cache;e.bindBuffer(e.UNIFORM_BUFFER,x);for(let R=0,L=S.length;R<L;R++){let B=Array.isArray(S[R])?S[R]:[S[R]];for(let b=0,E=B.length;b<E;b++){let F=B[b];if(m(F,R,b,D)===!0){let V=F.__offset,Q=Array.isArray(F.value)?F.value:[F.value],P=0;for(let z=0;z<Q.length;z++){let C=Q[z],G=_(C);typeof C=="number"||typeof C=="boolean"?(F.__data[0]=C,e.bufferSubData(e.UNIFORM_BUFFER,V+P,F.__data)):C.isMatrix3?(F.__data[0]=C.elements[0],F.__data[1]=C.elements[1],F.__data[2]=C.elements[2],F.__data[3]=0,F.__data[4]=C.elements[3],F.__data[5]=C.elements[4],F.__data[6]=C.elements[5],F.__data[7]=0,F.__data[8]=C.elements[6],F.__data[9]=C.elements[7],F.__data[10]=C.elements[8],F.__data[11]=0):(C.toArray(F.__data,P),P+=G.storage/Float32Array.BYTES_PER_ELEMENT)}e.bufferSubData(e.UNIFORM_BUFFER,V,F.__data)}}}e.bindBuffer(e.UNIFORM_BUFFER,null)}function m(M,x,S,D){let R=M.value,L=x+"_"+S;if(D[L]===void 0)return typeof R=="number"||typeof R=="boolean"?D[L]=R:D[L]=R.clone(),!0;{let B=D[L];if(typeof R=="number"||typeof R=="boolean"){if(B!==R)return D[L]=R,!0}else if(B.equals(R)===!1)return B.copy(R),!0}return!1}function g(M){let x=M.uniforms,S=0,D=16;for(let L=0,B=x.length;L<B;L++){let b=Array.isArray(x[L])?x[L]:[x[L]];for(let E=0,F=b.length;E<F;E++){let V=b[E],Q=Array.isArray(V.value)?V.value:[V.value];for(let P=0,z=Q.length;P<z;P++){let C=Q[P],G=_(C),O=S%D;O!==0&&D-O<G.boundary&&(S+=D-O),V.__data=new Float32Array(G.storage/Float32Array.BYTES_PER_ELEMENT),V.__offset=S,S+=G.storage}}}let R=S%D;return R>0&&(S+=D-R),M.__size=S,M.__cache={},this}function _(M){let x={boundary:0,storage:0};return typeof M=="number"||typeof M=="boolean"?(x.boundary=4,x.storage=4):M.isVector2?(x.boundary=8,x.storage=8):M.isVector3||M.isColor?(x.boundary=16,x.storage=12):M.isVector4?(x.boundary=16,x.storage=16):M.isMatrix3?(x.boundary=48,x.storage=48):M.isMatrix4?(x.boundary=64,x.storage=64):M.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",M),x}function f(M){let x=M.target;x.removeEventListener("dispose",f);let S=o.indexOf(x.__bindingPointIndex);o.splice(S,1),e.deleteBuffer(a[x.id]),delete a[x.id],delete n[x.id]}function d(){for(let M in a)e.deleteBuffer(a[M]);o=[],a={},n={}}return{bind:l,update:h,dispose:d}}function Do(){let e=0,t=0,i=0,r=0;function a(n,o,s,l){e=n,t=s,i=-3*n+3*o-2*s-l,r=2*n-2*o+s+l}return{initCatmullRom:function(n,o,s,l,h){a(o,s,h*(s-n),h*(l-o))},initNonuniformCatmullRom:function(n,o,s,l,h,c,u){let p=(o-n)/h-(s-n)/(h+c)+(s-o)/c,m=(s-o)/c-(l-o)/(c+u)+(l-s)/u;p*=c,m*=c,a(o,s,p,m)},calc:function(n){let o=n*n,s=o*n;return e+t*n+i*o+r*s}}}function Lc(e,t,i,r,a){let n=(r-t)*.5,o=(a-i)*.5,s=e*e,l=e*s;return(2*i-2*r+n+o)*l+(-3*i+3*r-2*n-o)*s+n*e+i}function I_(e,t){let i=1-e;return i*i*t}function O_(e,t){return 2*(1-e)*e*t}function F_(e,t){return e*e*t}function rn(e,t,i,r){return I_(e,t)+O_(e,i)+F_(e,r)}function z_(e,t){let i=1-e;return i*i*i*t}function k_(e,t){let i=1-e;return 3*i*i*e*t}function B_(e,t){return 3*(1-e)*e*e*t}function V_(e,t){return e*e*e*t}function an(e,t,i,r,a){return z_(e,t)+k_(e,i)+B_(e,r)+V_(e,a)}function Pc(e,t,i,r,a){let n,o;if(a===rv(e,t,i,r)>0)for(n=t;n<i;n+=r)o=Nc(n,e[n],e[n+1],o);else for(n=i-r;n>=t;n-=r)o=Nc(n,e[n],e[n+1],o);return o&&rs(o,o.next)&&(on(o),o=o.next),o}function Ir(e,t){if(!e)return e;t||(t=e);let i=e,r;do if(r=!1,!i.steiner&&(rs(i,i.next)||mt(i.prev,i,i.next)===0)){if(on(i),i=t=i.prev,i===i.next)break;r=!0}else i=i.next;while(r||i!==t);return t}function nn(e,t,i,r,a,n,o){if(!e)return;!o&&n&&Z_(e,r,a,n);let s=e,l,h;for(;e.prev!==e.next;){if(l=e.prev,h=e.next,n?G_(e,r,a,n):H_(e)){t.push(l.i/i|0),t.push(e.i/i|0),t.push(h.i/i|0),on(e),e=h.next,s=h.next;continue}if(e=h,e===s){o?o===1?(e=W_(Ir(e),t,i),nn(e,t,i,r,a,n,2)):o===2&&X_(e,t,i,r,a,n):nn(Ir(e),t,i,r,a,n,1);break}}}function H_(e){let t=e.prev,i=e,r=e.next;if(mt(t,i,r)>=0)return!1;let a=t.x,n=i.x,o=r.x,s=t.y,l=i.y,h=r.y,c=a<n?a<o?a:o:n<o?n:o,u=s<l?s<h?s:h:l<h?l:h,p=a>n?a>o?a:o:n>o?n:o,m=s>l?s>h?s:h:l>h?l:h,g=r.next;for(;g!==t;){if(g.x>=c&&g.x<=p&&g.y>=u&&g.y<=m&&wa(a,s,n,l,o,h,g.x,g.y)&&mt(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function G_(e,t,i,r){let a=e.prev,n=e,o=e.next;if(mt(a,n,o)>=0)return!1;let s=a.x,l=n.x,h=o.x,c=a.y,u=n.y,p=o.y,m=s<l?s<h?s:h:l<h?l:h,g=c<u?c<p?c:p:u<p?u:p,_=s>l?s>h?s:h:l>h?l:h,f=c>u?c>p?c:p:u>p?u:p,d=Uo(m,g,t,i,r),M=Uo(_,f,t,i,r),x=e.prevZ,S=e.nextZ;for(;x&&x.z>=d&&S&&S.z<=M;){if(x.x>=m&&x.x<=_&&x.y>=g&&x.y<=f&&x!==a&&x!==o&&wa(s,c,l,u,h,p,x.x,x.y)&&mt(x.prev,x,x.next)>=0||(x=x.prevZ,S.x>=m&&S.x<=_&&S.y>=g&&S.y<=f&&S!==a&&S!==o&&wa(s,c,l,u,h,p,S.x,S.y)&&mt(S.prev,S,S.next)>=0))return!1;S=S.nextZ}for(;x&&x.z>=d;){if(x.x>=m&&x.x<=_&&x.y>=g&&x.y<=f&&x!==a&&x!==o&&wa(s,c,l,u,h,p,x.x,x.y)&&mt(x.prev,x,x.next)>=0)return!1;x=x.prevZ}for(;S&&S.z<=M;){if(S.x>=m&&S.x<=_&&S.y>=g&&S.y<=f&&S!==a&&S!==o&&wa(s,c,l,u,h,p,S.x,S.y)&&mt(S.prev,S,S.next)>=0)return!1;S=S.nextZ}return!0}function W_(e,t,i){let r=e;do{let a=r.prev,n=r.next.next;!rs(a,n)&&Dc(a,r,r.next,n)&&sn(a,n)&&sn(n,a)&&(t.push(a.i/i|0),t.push(r.i/i|0),t.push(n.i/i|0),on(r),on(r.next),r=e=n),r=r.next}while(r!==e);return Ir(r)}function X_(e,t,i,r,a,n){let o=e;do{let s=o.next.next;for(;s!==o.prev;){if(o.i!==s.i&&ev(o,s)){let l=Uc(o,s);o=Ir(o,o.next),l=Ir(l,l.next),nn(o,t,i,r,a,n,0),nn(l,t,i,r,a,n,0);return}s=s.next}o=o.next}while(o!==e)}function j_(e,t,i,r){let a=[],n,o,s,l,h;for(n=0,o=t.length;n<o;n++)s=t[n]*r,l=n<o-1?t[n+1]*r:e.length,h=Pc(e,s,l,r,!1),h===h.next&&(h.steiner=!0),a.push($_(h));for(a.sort(q_),n=0;n<a.length;n++)i=Y_(a[n],i);return i}function q_(e,t){return e.x-t.x}function Y_(e,t){let i=K_(e,t);if(!i)return t;let r=Uc(i,e);return Ir(r,r.next),Ir(i,i.next)}function K_(e,t){let i=t,r=-1/0,a,n=e.x,o=e.y;do{if(o<=i.y&&o>=i.next.y&&i.next.y!==i.y){let p=i.x+(o-i.y)*(i.next.x-i.x)/(i.next.y-i.y);if(p<=n&&p>r&&(r=p,a=i.x<i.next.x?i:i.next,p===n))return a}i=i.next}while(i!==t);if(!a)return null;let s=a,l=a.x,h=a.y,c=1/0,u;i=a;do n>=i.x&&i.x>=l&&n!==i.x&&wa(o<h?n:r,o,l,h,o<h?r:n,o,i.x,i.y)&&(u=Math.abs(o-i.y)/(n-i.x),sn(i,e)&&(u<c||u===c&&(i.x>a.x||i.x===a.x&&J_(a,i)))&&(a=i,c=u)),i=i.next;while(i!==s);return a}function J_(e,t){return mt(e.prev,e,t.prev)<0&&mt(t.next,e,e.next)<0}function Z_(e,t,i,r){let a=e;do a.z===0&&(a.z=Uo(a.x,a.y,t,i,r)),a.prevZ=a.prev,a.nextZ=a.next,a=a.next;while(a!==e);a.prevZ.nextZ=null,a.prevZ=null,Q_(a)}function Q_(e){let t,i,r,a,n,o,s,l,h=1;do{for(i=e,e=null,n=null,o=0;i;){for(o++,r=i,s=0,t=0;t<h&&(s++,r=r.nextZ,!!r);t++);for(l=h;s>0||l>0&&r;)s!==0&&(l===0||!r||i.z<=r.z)?(a=i,i=i.nextZ,s--):(a=r,r=r.nextZ,l--),n?n.nextZ=a:e=a,a.prevZ=n,n=a;i=r}n.nextZ=null,h*=2}while(o>1);return e}function Uo(e,t,i,r,a){return e=(e-i)*a|0,t=(t-r)*a|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function $_(e){let t=e,i=e;do(t.x<i.x||t.x===i.x&&t.y<i.y)&&(i=t),t=t.next;while(t!==e);return i}function wa(e,t,i,r,a,n,o,s){return(a-o)*(t-s)>=(e-o)*(n-s)&&(e-o)*(r-s)>=(i-o)*(t-s)&&(i-o)*(n-s)>=(a-o)*(r-s)}function ev(e,t){return e.next.i!==t.i&&e.prev.i!==t.i&&!tv(e,t)&&(sn(e,t)&&sn(t,e)&&iv(e,t)&&(mt(e.prev,e,t.prev)||mt(e,t.prev,t))||rs(e,t)&&mt(e.prev,e,e.next)>0&&mt(t.prev,t,t.next)>0)}function mt(e,t,i){return(t.y-e.y)*(i.x-t.x)-(t.x-e.x)*(i.y-t.y)}function rs(e,t){return e.x===t.x&&e.y===t.y}function Dc(e,t,i,r){let a=ns(mt(e,t,i)),n=ns(mt(e,t,r)),o=ns(mt(i,r,e)),s=ns(mt(i,r,t));return!!(a!==n&&o!==s||a===0&&as(e,i,t)||n===0&&as(e,r,t)||o===0&&as(i,e,r)||s===0&&as(i,t,r))}function as(e,t,i){return t.x<=Math.max(e.x,i.x)&&t.x>=Math.min(e.x,i.x)&&t.y<=Math.max(e.y,i.y)&&t.y>=Math.min(e.y,i.y)}function ns(e){return e>0?1:e<0?-1:0}function tv(e,t){let i=e;do{if(i.i!==e.i&&i.next.i!==e.i&&i.i!==t.i&&i.next.i!==t.i&&Dc(i,i.next,e,t))return!0;i=i.next}while(i!==e);return!1}function sn(e,t){return mt(e.prev,e,e.next)<0?mt(e,t,e.next)>=0&&mt(e,e.prev,t)>=0:mt(e,t,e.prev)<0||mt(e,e.next,t)<0}function iv(e,t){let i=e,r=!1,a=(e.x+t.x)/2,n=(e.y+t.y)/2;do i.y>n!=i.next.y>n&&i.next.y!==i.y&&a<(i.next.x-i.x)*(n-i.y)/(i.next.y-i.y)+i.x&&(r=!r),i=i.next;while(i!==e);return r}function Uc(e,t){let i=new No(e.i,e.x,e.y),r=new No(t.i,t.x,t.y),a=e.next,n=t.prev;return e.next=t,t.prev=e,i.next=a,a.prev=i,r.next=i,i.prev=r,n.next=r,r.prev=n,r}function Nc(e,t,i,r){let a=new No(e,t,i);return r?(a.next=r.next,a.prev=r,r.next.prev=a,r.next=a):(a.prev=a,a.next=a),a}function on(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ)}function No(e,t,i){this.i=e,this.x=t,this.y=i,this.prev=null,this.next=null,this.z=0,this.prevZ=null,this.nextZ=null,this.steiner=!1}function rv(e,t,i,r){let a=0;for(let n=t,o=i-r;n<i;n+=r)a+=(e[o]-e[n])*(e[n+1]+e[o+1]),o=n;return a}function Ic(e){let t=e.length;t>2&&e[t-1].equals(e[0])&&e.pop()}function Oc(e,t){for(let i=0;i<t.length;i++)e.push(t[i].x),e.push(t[i].y)}function av(e,t,i){if(i.shapes=[],Array.isArray(e))for(let r=0,a=e.length;r<a;r++){let n=e[r];i.shapes.push(n.uuid)}else i.shapes.push(e.uuid);return i.options=Object.assign({},t),t.extrudePath!==void 0&&(i.options.extrudePath=t.extrudePath.toJSON()),i}function ss(e,t,i){return!e||!i&&e.constructor===t?e:typeof t.BYTES_PER_ELEMENT=="number"?new t(e):Array.prototype.slice.call(e)}function nv(e){return ArrayBuffer.isView(e)&&!(e instanceof DataView)}var Fc,Io,zc,Oo,Fo,Fi,tr,Vt,Ti,ir,Or,zo,ko,Bo,kc,vr,Bc,Vc,Vo,Ho,Hc,Gc,Wc,Xc,os,ls,jc,qc,Yc,Kc,Jc,Zc,Qc,$c,eu,tu,iu,ru,ln,au,nu,su,ou,Go,lu,hu,rr,cu,uu,du,Wo,pu,mu,Xo,fu,jo,Fr,zr,hs,cs,hn,us,di,ds,Nt,qo,ps,ni,gu,Ea,ar,_u,vu,ms,Yo,nr,zi,Ta,Ko,Jo,xr,xu,si,yu,Mu,yr,kr,bu,Zo,Su,Qo,$o,fs,gs,_s,vs,el,tl,il,rl,al,nl,sl,ol,ll,hl,cl,ul,dl,pl,ml,fl,gl,_l,vl,xl,yl,xs,Ml,bl,wu,Sl,wl,El,cn,un,ys,Tl,Al,Rl,Cl,Mr,Eu,Tu,Ll,Au,oi,vt,ki,Ms,dn,pn,ct,mn,fn,Br,Pl,Ru,Cu,Lu,Dl,Pu,Du,Uu,Nu,Ul,Nl,bs,Bi,gn,Vr,It,Il,Aa,Ra,Ye,xe,Xe,Ss,Ol,Fl,zl,_n,Iu,it,Ca,kl,Ou,Bl,Fu,pi,gt,zu,br,Vl,ku,Ct,v,ws,Hl,Hr,Vi,mi,vn,Gr,Wr,Xr,sr,or,Sr,La,xn,yn,wr,Bu,Pa,Es,Da,Hi,Ts,Mn,lr,As,bn,Rs,Gl,tt,jr,fi,Vu,Hu,hr,Sn,Jt,Wl,Xl,jl,ql,Gu,Yl,qr,Gi,wn,Ua,Wu,Xu,Kl,Jl,Zl,ju,qu,Yt,gi,Wi,Cs,Xi,Yr,Kr,Ql,Ls,Ps,Ds,En,Tn,$l,cr,An,Ne,Ot,Yu,Na,eh,xt,Rn,Ht,Us,th,Je,Ku,li,Ns,Jr,Zt,Ia,Lt,St,ih,Er,Cn,rh,Zr,Qr,$r,Is,Ln,Pn,Dn,Un,ah,nh,sh,Nn,In,De,Ft,Ju,Zu,Qu,Ai,oh,hi,ea,ta,$u,lh,ed,Os,td,id,Tr,Ar,On,Fs,hh,rd,ad,nd,sd,od,ld,hd,cd,ud,dd,pd,md,fd,gd,_d,vd,xd,yd,Md,bd,Sd,wd,Ed,Td,Ad,Rd,Cd,Ld,Pd,Dd,Ud,Nd,Id,Od,Fd,zd,kd,Bd,Vd,Hd,Gd,Wd,Xd,jd,qd,Yd,Kd,Jd,Zd,Qd,$d,ep,tp,ip,rp,ap,np,sp,op,lp,hp,cp,up,dp,pp,mp,fp,gp,_p,vp,xp,yp,Mp,bp,Sp,wp,Ep,Tp,Ap,Rp,Cp,Lp,Pp,Dp,Up,Np,Ip,Op,Fp,zp,kp,Bp,Vp,Hp,Gp,Wp,Xp,jp,qp,Yp,Kp,Jp,Zp,Qp,$p,em,tm,im,rm,am,nm,sm,om,lm,hm,cm,um,dm,pm,mm,fm,gm,_m,vm,xm,ym,Mm,bm,Sm,wm,Em,Tm,Am,Rm,Cm,Lm,Pm,Dm,Um,Nm,Im,Be,ge,Ri,Fn,ch,ia,uh,Rr,zs,dh,ks,Bs,Vs,Cr,ra,ph,Hs,mh,fh,gh,_h,vh,xh,yh,Mh,bh,Sh,wh,Om,Fm,zm,Gs,zn,km,Bm,Vm,Hm,Gm,Wm,Xm,jm,qm,Ym,Km,Jm,Zm,Qm,ji,$m,Ws,ef,Eh,tf,Th,Ah,Rh,Ch,rf,Lh,kn,Xs,Ph,js,af,Dh,nf,Uh,sf,of,Nh,Ci,qs,lf,Bn,Ys,Ks,Js,Ih,Oh,hf,Fh,cf,zh,kh,Bh,Vn,uf,Vh,_i,Hh,df,Zs,pf,mf,ff,Lr,Gh,gf,vi,aa,Hn,_f,vf,xf,qi,Oa,yf,Mf,bf,Qs,Fa,Sf,wf,Ef,Tf,Wh,Af,$s,Xh,jh,Rf,Cf,Lf,eo,Pf,to,Df,Uf,Nf,If,Of,Ff,zf,kf,ft,sv,xi=pc(()=>{Fc=0,Io=1,zc=2,Oo=1,Fo=2,Fi=3,tr=0,Vt=1,Ti=2,ir=0,Or=1,zo=2,ko=3,Bo=4,kc=5,vr=100,Bc=101,Vc=102,Vo=103,Ho=104,Hc=200,Gc=201,Wc=202,Xc=203,os=204,ls=205,jc=206,qc=207,Yc=208,Kc=209,Jc=210,Zc=211,Qc=212,$c=213,eu=214,tu=0,iu=1,ru=2,ln=3,au=4,nu=5,su=6,ou=7,Go=0,lu=1,hu=2,rr=0,cu=1,uu=2,du=3,Wo=4,pu=5,mu=6,Xo="attached",fu="detached",jo=300,Fr=301,zr=302,hs=303,cs=304,hn=306,us=1e3,di=1001,ds=1002,Nt=1003,qo=1004,ps=1005,ni=1006,gu=1007,Ea=1008,ar=1009,_u=1010,vu=1011,ms=1012,Yo=1013,nr=1014,zi=1015,Ta=1016,Ko=1017,Jo=1018,xr=1020,xu=1021,si=1023,yu=1024,Mu=1025,yr=1026,kr=1027,bu=1028,Zo=1029,Su=1030,Qo=1031,$o=1033,fs=33776,gs=33777,_s=33778,vs=33779,el=35840,tl=35841,il=35842,rl=35843,al=36196,nl=37492,sl=37496,ol=37808,ll=37809,hl=37810,cl=37811,ul=37812,dl=37813,pl=37814,ml=37815,fl=37816,gl=37817,_l=37818,vl=37819,xl=37820,yl=37821,xs=36492,Ml=36494,bl=36495,wu=36283,Sl=36284,wl=36285,El=36286,cn=2300,un=2301,ys=2302,Tl=2400,Al=2401,Rl=2402,Cl=3e3,Mr=3001,Eu=3200,Tu=3201,Ll=0,Au=1,oi="",vt="srgb",ki="srgb-linear",Ms="display-p3",dn="display-p3-linear",pn="linear",ct="srgb",mn="rec709",fn="p3",Br=7680,Pl=519,Ru=512,Cu=513,Lu=514,Dl=515,Pu=516,Du=517,Uu=518,Nu=519,Ul=35044,Nl="300 es",bs=1035,Bi=2e3,gn=2001,Vr=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;let i=this._listeners;return i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;let i=this._listeners[e];if(i!==void 0){let r=i.indexOf(t);r!==-1&&i.splice(r,1)}}dispatchEvent(e){if(this._listeners===void 0)return;let t=this._listeners[e.type];if(t!==void 0){e.target=this;let i=t.slice(0);for(let r=0,a=i.length;r<a;r++)i[r].call(this,e);e.target=null}}},It=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Il=1234567,Aa=Math.PI/180,Ra=180/Math.PI,Ye={DEG2RAD:Aa,RAD2DEG:Ra,generateUUID:_r,clamp:Ut,euclideanModulo:wo,mapLinear:O0,inverseLerp:F0,lerp:en,damp:z0,pingpong:k0,smoothstep:B0,smootherstep:V0,randInt:H0,randFloat:G0,randFloatSpread:W0,seededRandom:X0,degToRad:j0,radToDeg:q0,isPowerOfTwo:Eo,ceilPowerOfTwo:Y0,floorPowerOfTwo:Qn,setQuaternionFromProperEuler:K0,normalize:jt,denormalize:xa},xe=class v0{constructor(t=0,i=0){v0.prototype.isVector2=!0,this.x=t,this.y=i}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,i){return this.x=t,this.y=i,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,i){switch(t){case 0:this.x=i;break;case 1:this.y=i;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,i){return this.x=t.x+i.x,this.y=t.y+i.y,this}addScaledVector(t,i){return this.x+=t.x*i,this.y+=t.y*i,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,i){return this.x=t.x-i.x,this.y=t.y-i.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let i=this.x,r=this.y,a=t.elements;return this.x=a[0]*i+a[3]*r+a[6],this.y=a[1]*i+a[4]*r+a[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,i){return this.x=Math.max(t.x,Math.min(i.x,this.x)),this.y=Math.max(t.y,Math.min(i.y,this.y)),this}clampScalar(t,i){return this.x=Math.max(t,Math.min(i,this.x)),this.y=Math.max(t,Math.min(i,this.y)),this}clampLength(t,i){let r=this.length();return this.divideScalar(r||1).multiplyScalar(Math.max(t,Math.min(i,r)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let i=Math.sqrt(this.lengthSq()*t.lengthSq());if(i===0)return Math.PI/2;let r=this.dot(t)/i;return Math.acos(Ut(r,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let i=this.x-t.x,r=this.y-t.y;return i*i+r*r}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,i){return this.x+=(t.x-this.x)*i,this.y+=(t.y-this.y)*i,this}lerpVectors(t,i,r){return this.x=t.x+(i.x-t.x)*r,this.y=t.y+(i.y-t.y)*r,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,i=0){return this.x=t[i],this.y=t[i+1],this}toArray(t=[],i=0){return t[i]=this.x,t[i+1]=this.y,t}fromBufferAttribute(t,i){return this.x=t.getX(i),this.y=t.getY(i),this}rotateAround(t,i){let r=Math.cos(i),a=Math.sin(i),n=this.x-t.x,o=this.y-t.y;return this.x=n*r-o*a+t.x,this.y=n*a+o*r+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Xe=class x0{constructor(t,i,r,a,n,o,s,l,h){x0.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,i,r,a,n,o,s,l,h)}set(t,i,r,a,n,o,s,l,h){let c=this.elements;return c[0]=t,c[1]=a,c[2]=s,c[3]=i,c[4]=n,c[5]=l,c[6]=r,c[7]=o,c[8]=h,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let i=this.elements,r=t.elements;return i[0]=r[0],i[1]=r[1],i[2]=r[2],i[3]=r[3],i[4]=r[4],i[5]=r[5],i[6]=r[6],i[7]=r[7],i[8]=r[8],this}extractBasis(t,i,r){return t.setFromMatrix3Column(this,0),i.setFromMatrix3Column(this,1),r.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let i=t.elements;return this.set(i[0],i[4],i[8],i[1],i[5],i[9],i[2],i[6],i[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,i){let r=t.elements,a=i.elements,n=this.elements,o=r[0],s=r[3],l=r[6],h=r[1],c=r[4],u=r[7],p=r[2],m=r[5],g=r[8],_=a[0],f=a[3],d=a[6],M=a[1],x=a[4],S=a[7],D=a[2],R=a[5],L=a[8];return n[0]=o*_+s*M+l*D,n[3]=o*f+s*x+l*R,n[6]=o*d+s*S+l*L,n[1]=h*_+c*M+u*D,n[4]=h*f+c*x+u*R,n[7]=h*d+c*S+u*L,n[2]=p*_+m*M+g*D,n[5]=p*f+m*x+g*R,n[8]=p*d+m*S+g*L,this}multiplyScalar(t){let i=this.elements;return i[0]*=t,i[3]*=t,i[6]*=t,i[1]*=t,i[4]*=t,i[7]*=t,i[2]*=t,i[5]*=t,i[8]*=t,this}determinant(){let t=this.elements,i=t[0],r=t[1],a=t[2],n=t[3],o=t[4],s=t[5],l=t[6],h=t[7],c=t[8];return i*o*c-i*s*h-r*n*c+r*s*l+a*n*h-a*o*l}invert(){let t=this.elements,i=t[0],r=t[1],a=t[2],n=t[3],o=t[4],s=t[5],l=t[6],h=t[7],c=t[8],u=c*o-s*h,p=s*l-c*n,m=h*n-o*l,g=i*u+r*p+a*m;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);let _=1/g;return t[0]=u*_,t[1]=(a*h-c*r)*_,t[2]=(s*r-a*o)*_,t[3]=p*_,t[4]=(c*i-a*l)*_,t[5]=(a*n-s*i)*_,t[6]=m*_,t[7]=(r*l-h*i)*_,t[8]=(o*i-r*n)*_,this}transpose(){let t,i=this.elements;return t=i[1],i[1]=i[3],i[3]=t,t=i[2],i[2]=i[6],i[6]=t,t=i[5],i[5]=i[7],i[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let i=this.elements;return t[0]=i[0],t[1]=i[3],t[2]=i[6],t[3]=i[1],t[4]=i[4],t[5]=i[7],t[6]=i[2],t[7]=i[5],t[8]=i[8],this}setUvTransform(t,i,r,a,n,o,s){let l=Math.cos(n),h=Math.sin(n);return this.set(r*l,r*h,-r*(l*o+h*s)+o+t,-a*h,a*l,-a*(-h*o+l*s)+s+i,0,0,1),this}scale(t,i){return this.premultiply(Ss.makeScale(t,i)),this}rotate(t){return this.premultiply(Ss.makeRotation(-t)),this}translate(t,i){return this.premultiply(Ss.makeTranslation(t,i)),this}makeTranslation(t,i){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,i,0,0,1),this}makeRotation(t){let i=Math.cos(t),r=Math.sin(t);return this.set(i,-r,0,r,i,0,0,0,1),this}makeScale(t,i){return this.set(t,0,0,0,i,0,0,0,1),this}equals(t){let i=this.elements,r=t.elements;for(let a=0;a<9;a++)if(i[a]!==r[a])return!1;return!0}fromArray(t,i=0){for(let r=0;r<9;r++)this.elements[r]=t[r+i];return this}toArray(t=[],i=0){let r=this.elements;return t[i]=r[0],t[i+1]=r[1],t[i+2]=r[2],t[i+3]=r[3],t[i+4]=r[4],t[i+5]=r[5],t[i+6]=r[6],t[i+7]=r[7],t[i+8]=r[8],t}clone(){return new this.constructor().fromArray(this.elements)}},Ss=new Xe,Ol={},Fl=new Xe().set(.8224621,.177538,0,.0331941,.9668058,0,.0170827,.0723974,.9105199),zl=new Xe().set(1.2249401,-.2249404,0,-.0420569,1.0420571,0,-.0196376,-.0786361,1.0982735),_n={[ki]:{transfer:pn,primaries:mn,toReference:e=>e,fromReference:e=>e},[vt]:{transfer:ct,primaries:mn,toReference:e=>e.convertSRGBToLinear(),fromReference:e=>e.convertLinearToSRGB()},[dn]:{transfer:pn,primaries:fn,toReference:e=>e.applyMatrix3(zl),fromReference:e=>e.applyMatrix3(Fl)},[Ms]:{transfer:ct,primaries:fn,toReference:e=>e.convertSRGBToLinear().applyMatrix3(zl),fromReference:e=>e.applyMatrix3(Fl).convertLinearToSRGB()}},Iu=new Set([ki,dn]),it={enabled:!0,_workingColorSpace:ki,get workingColorSpace(){return this._workingColorSpace},set workingColorSpace(e){if(!Iu.has(e))throw new Error(`Unsupported working color space, "${e}".`);this._workingColorSpace=e},convert:function(e,t,i){if(this.enabled===!1||t===i||!t||!i)return e;let r=_n[t].toReference,a=_n[i].fromReference;return a(r(e))},fromWorkingColorSpace:function(e,t){return this.convert(e,this._workingColorSpace,t)},toWorkingColorSpace:function(e,t){return this.convert(e,t,this._workingColorSpace)},getPrimaries:function(e){return _n[e].primaries},getTransfer:function(e){return e===oi?pn:_n[e].transfer}},kl=class{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{Ca===void 0&&(Ca=$n("canvas")),Ca.width=e.width,Ca.height=e.height;let i=Ca.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),t=Ca}return t.width>2048||t.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),t.toDataURL("image/jpeg",.6)):t.toDataURL("image/png")}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=$n("canvas");t.width=e.width,t.height=e.height;let i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);let r=i.getImageData(0,0,e.width,e.height),a=r.data;for(let n=0;n<a.length;n++)a[n]=ya(a[n]/255)*255;return i.putImageData(r,0,0),t}else if(e.data){let t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(ya(t[i]/255)*255):t[i]=ya(t[i]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},Ou=0,Bl=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Ou++}),this.uuid=_r(),this.data=e,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let a;if(Array.isArray(r)){a=[];for(let n=0,o=r.length;n<o;n++)r[n].isDataTexture?a.push(Ao(r[n].image)):a.push(Ao(r[n]))}else a=Ao(r);i.url=a}return t||(e.images[this.uuid]=i),i}},Fu=0,pi=class bo extends Vr{constructor(t=bo.DEFAULT_IMAGE,i=bo.DEFAULT_MAPPING,r=di,a=di,n=ni,o=Ea,s=si,l=ar,h=bo.DEFAULT_ANISOTROPY,c=oi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Fu++}),this.uuid=_r(),this.name="",this.source=new Bl(t),this.mipmaps=[],this.mapping=i,this.channel=0,this.wrapS=r,this.wrapT=a,this.magFilter=n,this.minFilter=o,this.anisotropy=h,this.format=s,this.internalFormat=null,this.type=l,this.offset=new xe(0,0),this.repeat=new xe(1,1),this.center=new xe(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Xe,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,typeof c=="string"?this.colorSpace=c:(tn("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace=c===Mr?vt:oi),this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.needsPMREMUpdate=!1}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}toJSON(t){let i=t===void 0||typeof t=="string";if(!i&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let r={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(r.userData=this.userData),i||(t.textures[this.uuid]=r),r}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==jo)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case us:t.x=t.x-Math.floor(t.x);break;case di:t.x=t.x<0?0:1;break;case ds:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case us:t.y=t.y-Math.floor(t.y);break;case di:t.y=t.y<0?0:1;break;case ds:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}get encoding(){return tn("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace===vt?Mr:Cl}set encoding(t){tn("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace=t===Mr?vt:oi}},pi.DEFAULT_IMAGE=null,pi.DEFAULT_MAPPING=jo,pi.DEFAULT_ANISOTROPY=1,gt=class y0{constructor(t=0,i=0,r=0,a=1){y0.prototype.isVector4=!0,this.x=t,this.y=i,this.z=r,this.w=a}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,i,r,a){return this.x=t,this.y=i,this.z=r,this.w=a,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,i){switch(t){case 0:this.x=i;break;case 1:this.y=i;break;case 2:this.z=i;break;case 3:this.w=i;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,i){return this.x=t.x+i.x,this.y=t.y+i.y,this.z=t.z+i.z,this.w=t.w+i.w,this}addScaledVector(t,i){return this.x+=t.x*i,this.y+=t.y*i,this.z+=t.z*i,this.w+=t.w*i,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,i){return this.x=t.x-i.x,this.y=t.y-i.y,this.z=t.z-i.z,this.w=t.w-i.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){let i=this.x,r=this.y,a=this.z,n=this.w,o=t.elements;return this.x=o[0]*i+o[4]*r+o[8]*a+o[12]*n,this.y=o[1]*i+o[5]*r+o[9]*a+o[13]*n,this.z=o[2]*i+o[6]*r+o[10]*a+o[14]*n,this.w=o[3]*i+o[7]*r+o[11]*a+o[15]*n,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);let i=Math.sqrt(1-t.w*t.w);return i<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/i,this.y=t.y/i,this.z=t.z/i),this}setAxisAngleFromRotationMatrix(t){let i,r,a,n,o=t.elements,s=o[0],l=o[4],h=o[8],c=o[1],u=o[5],p=o[9],m=o[2],g=o[6],_=o[10];if(Math.abs(l-c)<.01&&Math.abs(h-m)<.01&&Math.abs(p-g)<.01){if(Math.abs(l+c)<.1&&Math.abs(h+m)<.1&&Math.abs(p+g)<.1&&Math.abs(s+u+_-3)<.1)return this.set(1,0,0,0),this;i=Math.PI;let d=(s+1)/2,M=(u+1)/2,x=(_+1)/2,S=(l+c)/4,D=(h+m)/4,R=(p+g)/4;return d>M&&d>x?d<.01?(r=0,a=.707106781,n=.707106781):(r=Math.sqrt(d),a=S/r,n=D/r):M>x?M<.01?(r=.707106781,a=0,n=.707106781):(a=Math.sqrt(M),r=S/a,n=R/a):x<.01?(r=.707106781,a=.707106781,n=0):(n=Math.sqrt(x),r=D/n,a=R/n),this.set(r,a,n,i),this}let f=Math.sqrt((g-p)*(g-p)+(h-m)*(h-m)+(c-l)*(c-l));return Math.abs(f)<.001&&(f=1),this.x=(g-p)/f,this.y=(h-m)/f,this.z=(c-l)/f,this.w=Math.acos((s+u+_-1)/2),this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,i){return this.x=Math.max(t.x,Math.min(i.x,this.x)),this.y=Math.max(t.y,Math.min(i.y,this.y)),this.z=Math.max(t.z,Math.min(i.z,this.z)),this.w=Math.max(t.w,Math.min(i.w,this.w)),this}clampScalar(t,i){return this.x=Math.max(t,Math.min(i,this.x)),this.y=Math.max(t,Math.min(i,this.y)),this.z=Math.max(t,Math.min(i,this.z)),this.w=Math.max(t,Math.min(i,this.w)),this}clampLength(t,i){let r=this.length();return this.divideScalar(r||1).multiplyScalar(Math.max(t,Math.min(i,r)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,i){return this.x+=(t.x-this.x)*i,this.y+=(t.y-this.y)*i,this.z+=(t.z-this.z)*i,this.w+=(t.w-this.w)*i,this}lerpVectors(t,i,r){return this.x=t.x+(i.x-t.x)*r,this.y=t.y+(i.y-t.y)*r,this.z=t.z+(i.z-t.z)*r,this.w=t.w+(i.w-t.w)*r,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,i=0){return this.x=t[i],this.y=t[i+1],this.z=t[i+2],this.w=t[i+3],this}toArray(t=[],i=0){return t[i]=this.x,t[i+1]=this.y,t[i+2]=this.z,t[i+3]=this.w,t}fromBufferAttribute(t,i){return this.x=t.getX(i),this.y=t.getY(i),this.z=t.getZ(i),this.w=t.getW(i),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},zu=class extends Vr{constructor(e=1,t=1,i={}){super(),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=1,this.scissor=new gt(0,0,e,t),this.scissorTest=!1,this.viewport=new gt(0,0,e,t);let r={width:e,height:t,depth:1};i.encoding!==void 0&&(tn("THREE.WebGLRenderTarget: option.encoding has been replaced by option.colorSpace."),i.colorSpace=i.encoding===Mr?vt:oi),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:ni,depthBuffer:!0,stencilBuffer:!1,depthTexture:null,samples:0},i),this.texture=new pi(r,i.mapping,i.wrapS,i.wrapT,i.magFilter,i.minFilter,i.format,i.type,i.anisotropy,i.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.flipY=!1,this.texture.generateMipmaps=i.generateMipmaps,this.texture.internalFormat=i.internalFormat,this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.depthTexture=i.depthTexture,this.samples=i.samples}setSize(e,t,i=1){(this.width!==e||this.height!==t||this.depth!==i)&&(this.width=e,this.height=t,this.depth=i,this.texture.image.width=e,this.texture.image.height=t,this.texture.image.depth=i,this.dispose()),this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.texture=e.texture.clone(),this.texture.isRenderTargetTexture=!0;let t=Object.assign({},e.texture.image);return this.texture.source=new Bl(t),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}},br=class extends zu{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}},Vl=class extends pi{constructor(e=null,t=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=Nt,this.minFilter=Nt,this.wrapR=di,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},ku=class extends pi{constructor(e=null,t=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=Nt,this.minFilter=Nt,this.wrapR=di,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},Ct=class{constructor(e=0,t=0,i=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=r}static slerpFlat(e,t,i,r,a,n,o){let s=i[r+0],l=i[r+1],h=i[r+2],c=i[r+3],u=a[n+0],p=a[n+1],m=a[n+2],g=a[n+3];if(o===0){e[t+0]=s,e[t+1]=l,e[t+2]=h,e[t+3]=c;return}if(o===1){e[t+0]=u,e[t+1]=p,e[t+2]=m,e[t+3]=g;return}if(c!==g||s!==u||l!==p||h!==m){let _=1-o,f=s*u+l*p+h*m+c*g,d=f>=0?1:-1,M=1-f*f;if(M>Number.EPSILON){let S=Math.sqrt(M),D=Math.atan2(S,f*d);_=Math.sin(_*D)/S,o=Math.sin(o*D)/S}let x=o*d;if(s=s*_+u*x,l=l*_+p*x,h=h*_+m*x,c=c*_+g*x,_===1-o){let S=1/Math.sqrt(s*s+l*l+h*h+c*c);s*=S,l*=S,h*=S,c*=S}}e[t]=s,e[t+1]=l,e[t+2]=h,e[t+3]=c}static multiplyQuaternionsFlat(e,t,i,r,a,n){let o=i[r],s=i[r+1],l=i[r+2],h=i[r+3],c=a[n],u=a[n+1],p=a[n+2],m=a[n+3];return e[t]=o*m+h*c+s*p-l*u,e[t+1]=s*m+h*u+l*c-o*p,e[t+2]=l*m+h*p+o*u-s*c,e[t+3]=h*m-o*c-s*u-l*p,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,r){return this._x=e,this._y=t,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let i=e._x,r=e._y,a=e._z,n=e._order,o=Math.cos,s=Math.sin,l=o(i/2),h=o(r/2),c=o(a/2),u=s(i/2),p=s(r/2),m=s(a/2);switch(n){case"XYZ":this._x=u*h*c+l*p*m,this._y=l*p*c-u*h*m,this._z=l*h*m+u*p*c,this._w=l*h*c-u*p*m;break;case"YXZ":this._x=u*h*c+l*p*m,this._y=l*p*c-u*h*m,this._z=l*h*m-u*p*c,this._w=l*h*c+u*p*m;break;case"ZXY":this._x=u*h*c-l*p*m,this._y=l*p*c+u*h*m,this._z=l*h*m+u*p*c,this._w=l*h*c-u*p*m;break;case"ZYX":this._x=u*h*c-l*p*m,this._y=l*p*c+u*h*m,this._z=l*h*m-u*p*c,this._w=l*h*c+u*p*m;break;case"YZX":this._x=u*h*c+l*p*m,this._y=l*p*c+u*h*m,this._z=l*h*m-u*p*c,this._w=l*h*c-u*p*m;break;case"XZY":this._x=u*h*c-l*p*m,this._y=l*p*c-u*h*m,this._z=l*h*m+u*p*c,this._w=l*h*c+u*p*m;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+n)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let i=t/2,r=Math.sin(i);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,i=t[0],r=t[4],a=t[8],n=t[1],o=t[5],s=t[9],l=t[2],h=t[6],c=t[10],u=i+o+c;if(u>0){let p=.5/Math.sqrt(u+1);this._w=.25/p,this._x=(h-s)*p,this._y=(a-l)*p,this._z=(n-r)*p}else if(i>o&&i>c){let p=2*Math.sqrt(1+i-o-c);this._w=(h-s)/p,this._x=.25*p,this._y=(r+n)/p,this._z=(a+l)/p}else if(o>c){let p=2*Math.sqrt(1+o-i-c);this._w=(a-l)/p,this._x=(r+n)/p,this._y=.25*p,this._z=(s+h)/p}else{let p=2*Math.sqrt(1+c-i-o);this._w=(n-r)/p,this._x=(a+l)/p,this._y=(s+h)/p,this._z=.25*p}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<Number.EPSILON?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Ut(this.dot(e),-1,1)))}rotateTowards(e,t){let i=this.angleTo(e);if(i===0)return this;let r=Math.min(1,t/i);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let i=e._x,r=e._y,a=e._z,n=e._w,o=t._x,s=t._y,l=t._z,h=t._w;return this._x=i*h+n*o+r*l-a*s,this._y=r*h+n*s+a*o-i*l,this._z=a*h+n*l+i*s-r*o,this._w=n*h-i*o-r*s-a*l,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);let i=this._x,r=this._y,a=this._z,n=this._w,o=n*e._w+i*e._x+r*e._y+a*e._z;if(o<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,o=-o):this.copy(e),o>=1)return this._w=n,this._x=i,this._y=r,this._z=a,this;let s=1-o*o;if(s<=Number.EPSILON){let p=1-t;return this._w=p*n+t*this._w,this._x=p*i+t*this._x,this._y=p*r+t*this._y,this._z=p*a+t*this._z,this.normalize(),this}let l=Math.sqrt(s),h=Math.atan2(l,o),c=Math.sin((1-t)*h)/l,u=Math.sin(t*h)/l;return this._w=n*c+this._w*u,this._x=i*c+this._x*u,this._y=r*c+this._y*u,this._z=a*c+this._z*u,this._onChangeCallback(),this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){let e=Math.random(),t=Math.sqrt(1-e),i=Math.sqrt(e),r=2*Math.PI*Math.random(),a=2*Math.PI*Math.random();return this.set(t*Math.cos(r),i*Math.sin(a),i*Math.cos(a),t*Math.sin(r))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},v=class M0{constructor(t=0,i=0,r=0){M0.prototype.isVector3=!0,this.x=t,this.y=i,this.z=r}set(t,i,r){return r===void 0&&(r=this.z),this.x=t,this.y=i,this.z=r,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,i){switch(t){case 0:this.x=i;break;case 1:this.y=i;break;case 2:this.z=i;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,i){return this.x=t.x+i.x,this.y=t.y+i.y,this.z=t.z+i.z,this}addScaledVector(t,i){return this.x+=t.x*i,this.y+=t.y*i,this.z+=t.z*i,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,i){return this.x=t.x-i.x,this.y=t.y-i.y,this.z=t.z-i.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,i){return this.x=t.x*i.x,this.y=t.y*i.y,this.z=t.z*i.z,this}applyEuler(t){return this.applyQuaternion(Hl.setFromEuler(t))}applyAxisAngle(t,i){return this.applyQuaternion(Hl.setFromAxisAngle(t,i))}applyMatrix3(t){let i=this.x,r=this.y,a=this.z,n=t.elements;return this.x=n[0]*i+n[3]*r+n[6]*a,this.y=n[1]*i+n[4]*r+n[7]*a,this.z=n[2]*i+n[5]*r+n[8]*a,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let i=this.x,r=this.y,a=this.z,n=t.elements,o=1/(n[3]*i+n[7]*r+n[11]*a+n[15]);return this.x=(n[0]*i+n[4]*r+n[8]*a+n[12])*o,this.y=(n[1]*i+n[5]*r+n[9]*a+n[13])*o,this.z=(n[2]*i+n[6]*r+n[10]*a+n[14])*o,this}applyQuaternion(t){let i=this.x,r=this.y,a=this.z,n=t.x,o=t.y,s=t.z,l=t.w,h=2*(o*a-s*r),c=2*(s*i-n*a),u=2*(n*r-o*i);return this.x=i+l*h+o*u-s*c,this.y=r+l*c+s*h-n*u,this.z=a+l*u+n*c-o*h,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let i=this.x,r=this.y,a=this.z,n=t.elements;return this.x=n[0]*i+n[4]*r+n[8]*a,this.y=n[1]*i+n[5]*r+n[9]*a,this.z=n[2]*i+n[6]*r+n[10]*a,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,i){return this.x=Math.max(t.x,Math.min(i.x,this.x)),this.y=Math.max(t.y,Math.min(i.y,this.y)),this.z=Math.max(t.z,Math.min(i.z,this.z)),this}clampScalar(t,i){return this.x=Math.max(t,Math.min(i,this.x)),this.y=Math.max(t,Math.min(i,this.y)),this.z=Math.max(t,Math.min(i,this.z)),this}clampLength(t,i){let r=this.length();return this.divideScalar(r||1).multiplyScalar(Math.max(t,Math.min(i,r)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,i){return this.x+=(t.x-this.x)*i,this.y+=(t.y-this.y)*i,this.z+=(t.z-this.z)*i,this}lerpVectors(t,i,r){return this.x=t.x+(i.x-t.x)*r,this.y=t.y+(i.y-t.y)*r,this.z=t.z+(i.z-t.z)*r,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,i){let r=t.x,a=t.y,n=t.z,o=i.x,s=i.y,l=i.z;return this.x=a*l-n*s,this.y=n*o-r*l,this.z=r*s-a*o,this}projectOnVector(t){let i=t.lengthSq();if(i===0)return this.set(0,0,0);let r=t.dot(this)/i;return this.copy(t).multiplyScalar(r)}projectOnPlane(t){return ws.copy(this).projectOnVector(t),this.sub(ws)}reflect(t){return this.sub(ws.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let i=Math.sqrt(this.lengthSq()*t.lengthSq());if(i===0)return Math.PI/2;let r=this.dot(t)/i;return Math.acos(Ut(r,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let i=this.x-t.x,r=this.y-t.y,a=this.z-t.z;return i*i+r*r+a*a}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,i,r){let a=Math.sin(i)*t;return this.x=a*Math.sin(r),this.y=Math.cos(i)*t,this.z=a*Math.cos(r),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,i,r){return this.x=t*Math.sin(i),this.y=r,this.z=t*Math.cos(i),this}setFromMatrixPosition(t){let i=t.elements;return this.x=i[12],this.y=i[13],this.z=i[14],this}setFromMatrixScale(t){let i=this.setFromMatrixColumn(t,0).length(),r=this.setFromMatrixColumn(t,1).length(),a=this.setFromMatrixColumn(t,2).length();return this.x=i,this.y=r,this.z=a,this}setFromMatrixColumn(t,i){return this.fromArray(t.elements,i*4)}setFromMatrix3Column(t,i){return this.fromArray(t.elements,i*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,i=0){return this.x=t[i],this.y=t[i+1],this.z=t[i+2],this}toArray(t=[],i=0){return t[i]=this.x,t[i+1]=this.y,t[i+2]=this.z,t}fromBufferAttribute(t,i){return this.x=t.getX(i),this.y=t.getY(i),this.z=t.getZ(i),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=(Math.random()-.5)*2,i=Math.random()*Math.PI*2,r=Math.sqrt(1-t**2);return this.x=r*Math.cos(i),this.y=r*Math.sin(i),this.z=t,this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},ws=new v,Hl=new Ct,Hr=class{constructor(e=new v(1/0,1/0,1/0),t=new v(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(mi.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(mi.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let i=mi.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let i=e.geometry;if(i!==void 0){let a=i.getAttribute("position");if(t===!0&&a!==void 0&&e.isInstancedMesh!==!0)for(let n=0,o=a.count;n<o;n++)e.isMesh===!0?e.getVertexPosition(n,mi):mi.fromBufferAttribute(a,n),mi.applyMatrix4(e.matrixWorld),this.expandByPoint(mi);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),vn.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),vn.copy(i.boundingBox)),vn.applyMatrix4(e.matrixWorld),this.union(vn)}let r=e.children;for(let a=0,n=r.length;a<n;a++)this.expandByObject(r[a],t);return this}containsPoint(e){return!(e.x<this.min.x||e.x>this.max.x||e.y<this.min.y||e.y>this.max.y||e.z<this.min.z||e.z>this.max.z)}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return!(e.max.x<this.min.x||e.min.x>this.max.x||e.max.y<this.min.y||e.min.y>this.max.y||e.max.z<this.min.z||e.min.z>this.max.z)}intersectsSphere(e){return this.clampPoint(e.center,mi),mi.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(La),xn.subVectors(this.max,La),Gr.subVectors(e.a,La),Wr.subVectors(e.b,La),Xr.subVectors(e.c,La),sr.subVectors(Wr,Gr),or.subVectors(Xr,Wr),Sr.subVectors(Gr,Xr);let t=[0,-sr.z,sr.y,0,-or.z,or.y,0,-Sr.z,Sr.y,sr.z,0,-sr.x,or.z,0,-or.x,Sr.z,0,-Sr.x,-sr.y,sr.x,0,-or.y,or.x,0,-Sr.y,Sr.x,0];return!Ro(t,Gr,Wr,Xr,xn)||(t=[1,0,0,0,1,0,0,0,1],!Ro(t,Gr,Wr,Xr,xn))?!1:(yn.crossVectors(sr,or),t=[yn.x,yn.y,yn.z],Ro(t,Gr,Wr,Xr,xn))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,mi).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(mi).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Vi[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Vi[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Vi[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Vi[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Vi[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Vi[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Vi[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Vi[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Vi),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}},Vi=[new v,new v,new v,new v,new v,new v,new v,new v],mi=new v,vn=new Hr,Gr=new v,Wr=new v,Xr=new v,sr=new v,or=new v,Sr=new v,La=new v,xn=new v,yn=new v,wr=new v,Bu=new Hr,Pa=new v,Es=new v,Da=class{constructor(e=new v,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let i=this.center;t!==void 0?i.copy(t):Bu.setFromPoints(e).getCenter(i);let r=0;for(let a=0,n=e.length;a<n;a++)r=Math.max(r,i.distanceToSquared(e[a]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Pa.subVectors(e,this.center);let t=Pa.lengthSq();if(t>this.radius*this.radius){let i=Math.sqrt(t),r=(i-this.radius)*.5;this.center.addScaledVector(Pa,r/i),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Es.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Pa.copy(e.center).add(Es)),this.expandByPoint(Pa.copy(e.center).sub(Es))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}},Hi=new v,Ts=new v,Mn=new v,lr=new v,As=new v,bn=new v,Rs=new v,Gl=class{constructor(e=new v,t=new v(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Hi)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Hi.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Hi.copy(this.origin).addScaledVector(this.direction,t),Hi.distanceToSquared(e))}distanceSqToSegment(e,t,i,r){Ts.copy(e).add(t).multiplyScalar(.5),Mn.copy(t).sub(e).normalize(),lr.copy(this.origin).sub(Ts);let a=e.distanceTo(t)*.5,n=-this.direction.dot(Mn),o=lr.dot(this.direction),s=-lr.dot(Mn),l=lr.lengthSq(),h=Math.abs(1-n*n),c,u,p,m;if(h>0)if(c=n*s-o,u=n*o-s,m=a*h,c>=0)if(u>=-m)if(u<=m){let g=1/h;c*=g,u*=g,p=c*(c+n*u+2*o)+u*(n*c+u+2*s)+l}else u=a,c=Math.max(0,-(n*u+o)),p=-c*c+u*(u+2*s)+l;else u=-a,c=Math.max(0,-(n*u+o)),p=-c*c+u*(u+2*s)+l;else u<=-m?(c=Math.max(0,-(-n*a+o)),u=c>0?-a:Math.min(Math.max(-a,-s),a),p=-c*c+u*(u+2*s)+l):u<=m?(c=0,u=Math.min(Math.max(-a,-s),a),p=u*(u+2*s)+l):(c=Math.max(0,-(n*a+o)),u=c>0?a:Math.min(Math.max(-a,-s),a),p=-c*c+u*(u+2*s)+l);else u=n>0?-a:a,c=Math.max(0,-(n*u+o)),p=-c*c+u*(u+2*s)+l;return i&&i.copy(this.origin).addScaledVector(this.direction,c),r&&r.copy(Ts).addScaledVector(Mn,u),p}intersectSphere(e,t){Hi.subVectors(e.center,this.origin);let i=Hi.dot(this.direction),r=Hi.dot(Hi)-i*i,a=e.radius*e.radius;if(r>a)return null;let n=Math.sqrt(a-r),o=i-n,s=i+n;return s<0?null:o<0?this.at(s,t):this.at(o,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){let i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,r,a,n,o,s,l=1/this.direction.x,h=1/this.direction.y,c=1/this.direction.z,u=this.origin;return l>=0?(i=(e.min.x-u.x)*l,r=(e.max.x-u.x)*l):(i=(e.max.x-u.x)*l,r=(e.min.x-u.x)*l),h>=0?(a=(e.min.y-u.y)*h,n=(e.max.y-u.y)*h):(a=(e.max.y-u.y)*h,n=(e.min.y-u.y)*h),i>n||a>r||((a>i||isNaN(i))&&(i=a),(n<r||isNaN(r))&&(r=n),c>=0?(o=(e.min.z-u.z)*c,s=(e.max.z-u.z)*c):(o=(e.max.z-u.z)*c,s=(e.min.z-u.z)*c),i>s||o>r)||((o>i||i!==i)&&(i=o),(s<r||r!==r)&&(r=s),r<0)?null:this.at(i>=0?i:r,t)}intersectsBox(e){return this.intersectBox(e,Hi)!==null}intersectTriangle(e,t,i,r,a){As.subVectors(t,e),bn.subVectors(i,e),Rs.crossVectors(As,bn);let n=this.direction.dot(Rs),o;if(n>0){if(r)return null;o=1}else if(n<0)o=-1,n=-n;else return null;lr.subVectors(this.origin,e);let s=o*this.direction.dot(bn.crossVectors(lr,bn));if(s<0)return null;let l=o*this.direction.dot(As.cross(lr));if(l<0||s+l>n)return null;let h=-o*lr.dot(Rs);return h<0?null:this.at(h/n,a)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},tt=class dc{constructor(t,i,r,a,n,o,s,l,h,c,u,p,m,g,_,f){dc.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,i,r,a,n,o,s,l,h,c,u,p,m,g,_,f)}set(t,i,r,a,n,o,s,l,h,c,u,p,m,g,_,f){let d=this.elements;return d[0]=t,d[4]=i,d[8]=r,d[12]=a,d[1]=n,d[5]=o,d[9]=s,d[13]=l,d[2]=h,d[6]=c,d[10]=u,d[14]=p,d[3]=m,d[7]=g,d[11]=_,d[15]=f,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new dc().fromArray(this.elements)}copy(t){let i=this.elements,r=t.elements;return i[0]=r[0],i[1]=r[1],i[2]=r[2],i[3]=r[3],i[4]=r[4],i[5]=r[5],i[6]=r[6],i[7]=r[7],i[8]=r[8],i[9]=r[9],i[10]=r[10],i[11]=r[11],i[12]=r[12],i[13]=r[13],i[14]=r[14],i[15]=r[15],this}copyPosition(t){let i=this.elements,r=t.elements;return i[12]=r[12],i[13]=r[13],i[14]=r[14],this}setFromMatrix3(t){let i=t.elements;return this.set(i[0],i[3],i[6],0,i[1],i[4],i[7],0,i[2],i[5],i[8],0,0,0,0,1),this}extractBasis(t,i,r){return t.setFromMatrixColumn(this,0),i.setFromMatrixColumn(this,1),r.setFromMatrixColumn(this,2),this}makeBasis(t,i,r){return this.set(t.x,i.x,r.x,0,t.y,i.y,r.y,0,t.z,i.z,r.z,0,0,0,0,1),this}extractRotation(t){let i=this.elements,r=t.elements,a=1/jr.setFromMatrixColumn(t,0).length(),n=1/jr.setFromMatrixColumn(t,1).length(),o=1/jr.setFromMatrixColumn(t,2).length();return i[0]=r[0]*a,i[1]=r[1]*a,i[2]=r[2]*a,i[3]=0,i[4]=r[4]*n,i[5]=r[5]*n,i[6]=r[6]*n,i[7]=0,i[8]=r[8]*o,i[9]=r[9]*o,i[10]=r[10]*o,i[11]=0,i[12]=0,i[13]=0,i[14]=0,i[15]=1,this}makeRotationFromEuler(t){let i=this.elements,r=t.x,a=t.y,n=t.z,o=Math.cos(r),s=Math.sin(r),l=Math.cos(a),h=Math.sin(a),c=Math.cos(n),u=Math.sin(n);if(t.order==="XYZ"){let p=o*c,m=o*u,g=s*c,_=s*u;i[0]=l*c,i[4]=-l*u,i[8]=h,i[1]=m+g*h,i[5]=p-_*h,i[9]=-s*l,i[2]=_-p*h,i[6]=g+m*h,i[10]=o*l}else if(t.order==="YXZ"){let p=l*c,m=l*u,g=h*c,_=h*u;i[0]=p+_*s,i[4]=g*s-m,i[8]=o*h,i[1]=o*u,i[5]=o*c,i[9]=-s,i[2]=m*s-g,i[6]=_+p*s,i[10]=o*l}else if(t.order==="ZXY"){let p=l*c,m=l*u,g=h*c,_=h*u;i[0]=p-_*s,i[4]=-o*u,i[8]=g+m*s,i[1]=m+g*s,i[5]=o*c,i[9]=_-p*s,i[2]=-o*h,i[6]=s,i[10]=o*l}else if(t.order==="ZYX"){let p=o*c,m=o*u,g=s*c,_=s*u;i[0]=l*c,i[4]=g*h-m,i[8]=p*h+_,i[1]=l*u,i[5]=_*h+p,i[9]=m*h-g,i[2]=-h,i[6]=s*l,i[10]=o*l}else if(t.order==="YZX"){let p=o*l,m=o*h,g=s*l,_=s*h;i[0]=l*c,i[4]=_-p*u,i[8]=g*u+m,i[1]=u,i[5]=o*c,i[9]=-s*c,i[2]=-h*c,i[6]=m*u+g,i[10]=p-_*u}else if(t.order==="XZY"){let p=o*l,m=o*h,g=s*l,_=s*h;i[0]=l*c,i[4]=-u,i[8]=h*c,i[1]=p*u+_,i[5]=o*c,i[9]=m*u-g,i[2]=g*u-m,i[6]=s*c,i[10]=_*u+p}return i[3]=0,i[7]=0,i[11]=0,i[12]=0,i[13]=0,i[14]=0,i[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Vu,t,Hu)}lookAt(t,i,r){let a=this.elements;return Jt.subVectors(t,i),Jt.lengthSq()===0&&(Jt.z=1),Jt.normalize(),hr.crossVectors(r,Jt),hr.lengthSq()===0&&(Math.abs(r.z)===1?Jt.x+=1e-4:Jt.z+=1e-4,Jt.normalize(),hr.crossVectors(r,Jt)),hr.normalize(),Sn.crossVectors(Jt,hr),a[0]=hr.x,a[4]=Sn.x,a[8]=Jt.x,a[1]=hr.y,a[5]=Sn.y,a[9]=Jt.y,a[2]=hr.z,a[6]=Sn.z,a[10]=Jt.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,i){let r=t.elements,a=i.elements,n=this.elements,o=r[0],s=r[4],l=r[8],h=r[12],c=r[1],u=r[5],p=r[9],m=r[13],g=r[2],_=r[6],f=r[10],d=r[14],M=r[3],x=r[7],S=r[11],D=r[15],R=a[0],L=a[4],B=a[8],b=a[12],E=a[1],F=a[5],V=a[9],Q=a[13],P=a[2],z=a[6],C=a[10],G=a[14],O=a[3],U=a[7],K=a[11],j=a[15];return n[0]=o*R+s*E+l*P+h*O,n[4]=o*L+s*F+l*z+h*U,n[8]=o*B+s*V+l*C+h*K,n[12]=o*b+s*Q+l*G+h*j,n[1]=c*R+u*E+p*P+m*O,n[5]=c*L+u*F+p*z+m*U,n[9]=c*B+u*V+p*C+m*K,n[13]=c*b+u*Q+p*G+m*j,n[2]=g*R+_*E+f*P+d*O,n[6]=g*L+_*F+f*z+d*U,n[10]=g*B+_*V+f*C+d*K,n[14]=g*b+_*Q+f*G+d*j,n[3]=M*R+x*E+S*P+D*O,n[7]=M*L+x*F+S*z+D*U,n[11]=M*B+x*V+S*C+D*K,n[15]=M*b+x*Q+S*G+D*j,this}multiplyScalar(t){let i=this.elements;return i[0]*=t,i[4]*=t,i[8]*=t,i[12]*=t,i[1]*=t,i[5]*=t,i[9]*=t,i[13]*=t,i[2]*=t,i[6]*=t,i[10]*=t,i[14]*=t,i[3]*=t,i[7]*=t,i[11]*=t,i[15]*=t,this}determinant(){let t=this.elements,i=t[0],r=t[4],a=t[8],n=t[12],o=t[1],s=t[5],l=t[9],h=t[13],c=t[2],u=t[6],p=t[10],m=t[14],g=t[3],_=t[7],f=t[11],d=t[15];return g*(+n*l*u-a*h*u-n*s*p+r*h*p+a*s*m-r*l*m)+_*(+i*l*m-i*h*p+n*o*p-a*o*m+a*h*c-n*l*c)+f*(+i*h*u-i*s*m-n*o*u+r*o*m+n*s*c-r*h*c)+d*(-a*s*c-i*l*u+i*s*p+a*o*u-r*o*p+r*l*c)}transpose(){let t=this.elements,i;return i=t[1],t[1]=t[4],t[4]=i,i=t[2],t[2]=t[8],t[8]=i,i=t[6],t[6]=t[9],t[9]=i,i=t[3],t[3]=t[12],t[12]=i,i=t[7],t[7]=t[13],t[13]=i,i=t[11],t[11]=t[14],t[14]=i,this}setPosition(t,i,r){let a=this.elements;return t.isVector3?(a[12]=t.x,a[13]=t.y,a[14]=t.z):(a[12]=t,a[13]=i,a[14]=r),this}invert(){let t=this.elements,i=t[0],r=t[1],a=t[2],n=t[3],o=t[4],s=t[5],l=t[6],h=t[7],c=t[8],u=t[9],p=t[10],m=t[11],g=t[12],_=t[13],f=t[14],d=t[15],M=u*f*h-_*p*h+_*l*m-s*f*m-u*l*d+s*p*d,x=g*p*h-c*f*h-g*l*m+o*f*m+c*l*d-o*p*d,S=c*_*h-g*u*h+g*s*m-o*_*m-c*s*d+o*u*d,D=g*u*l-c*_*l-g*s*p+o*_*p+c*s*f-o*u*f,R=i*M+r*x+a*S+n*D;if(R===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let L=1/R;return t[0]=M*L,t[1]=(_*p*n-u*f*n-_*a*m+r*f*m+u*a*d-r*p*d)*L,t[2]=(s*f*n-_*l*n+_*a*h-r*f*h-s*a*d+r*l*d)*L,t[3]=(u*l*n-s*p*n-u*a*h+r*p*h+s*a*m-r*l*m)*L,t[4]=x*L,t[5]=(c*f*n-g*p*n+g*a*m-i*f*m-c*a*d+i*p*d)*L,t[6]=(g*l*n-o*f*n-g*a*h+i*f*h+o*a*d-i*l*d)*L,t[7]=(o*p*n-c*l*n+c*a*h-i*p*h-o*a*m+i*l*m)*L,t[8]=S*L,t[9]=(g*u*n-c*_*n-g*r*m+i*_*m+c*r*d-i*u*d)*L,t[10]=(o*_*n-g*s*n+g*r*h-i*_*h-o*r*d+i*s*d)*L,t[11]=(c*s*n-o*u*n-c*r*h+i*u*h+o*r*m-i*s*m)*L,t[12]=D*L,t[13]=(c*_*a-g*u*a+g*r*p-i*_*p-c*r*f+i*u*f)*L,t[14]=(g*s*a-o*_*a-g*r*l+i*_*l+o*r*f-i*s*f)*L,t[15]=(o*u*a-c*s*a+c*r*l-i*u*l-o*r*p+i*s*p)*L,this}scale(t){let i=this.elements,r=t.x,a=t.y,n=t.z;return i[0]*=r,i[4]*=a,i[8]*=n,i[1]*=r,i[5]*=a,i[9]*=n,i[2]*=r,i[6]*=a,i[10]*=n,i[3]*=r,i[7]*=a,i[11]*=n,this}getMaxScaleOnAxis(){let t=this.elements,i=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],r=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],a=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(i,r,a))}makeTranslation(t,i,r){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,i,0,0,1,r,0,0,0,1),this}makeRotationX(t){let i=Math.cos(t),r=Math.sin(t);return this.set(1,0,0,0,0,i,-r,0,0,r,i,0,0,0,0,1),this}makeRotationY(t){let i=Math.cos(t),r=Math.sin(t);return this.set(i,0,r,0,0,1,0,0,-r,0,i,0,0,0,0,1),this}makeRotationZ(t){let i=Math.cos(t),r=Math.sin(t);return this.set(i,-r,0,0,r,i,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,i){let r=Math.cos(i),a=Math.sin(i),n=1-r,o=t.x,s=t.y,l=t.z,h=n*o,c=n*s;return this.set(h*o+r,h*s-a*l,h*l+a*s,0,h*s+a*l,c*s+r,c*l-a*o,0,h*l-a*s,c*l+a*o,n*l*l+r,0,0,0,0,1),this}makeScale(t,i,r){return this.set(t,0,0,0,0,i,0,0,0,0,r,0,0,0,0,1),this}makeShear(t,i,r,a,n,o){return this.set(1,r,n,0,t,1,o,0,i,a,1,0,0,0,0,1),this}compose(t,i,r){let a=this.elements,n=i._x,o=i._y,s=i._z,l=i._w,h=n+n,c=o+o,u=s+s,p=n*h,m=n*c,g=n*u,_=o*c,f=o*u,d=s*u,M=l*h,x=l*c,S=l*u,D=r.x,R=r.y,L=r.z;return a[0]=(1-(_+d))*D,a[1]=(m+S)*D,a[2]=(g-x)*D,a[3]=0,a[4]=(m-S)*R,a[5]=(1-(p+d))*R,a[6]=(f+M)*R,a[7]=0,a[8]=(g+x)*L,a[9]=(f-M)*L,a[10]=(1-(p+_))*L,a[11]=0,a[12]=t.x,a[13]=t.y,a[14]=t.z,a[15]=1,this}decompose(t,i,r){let a=this.elements,n=jr.set(a[0],a[1],a[2]).length(),o=jr.set(a[4],a[5],a[6]).length(),s=jr.set(a[8],a[9],a[10]).length();this.determinant()<0&&(n=-n),t.x=a[12],t.y=a[13],t.z=a[14],fi.copy(this);let l=1/n,h=1/o,c=1/s;return fi.elements[0]*=l,fi.elements[1]*=l,fi.elements[2]*=l,fi.elements[4]*=h,fi.elements[5]*=h,fi.elements[6]*=h,fi.elements[8]*=c,fi.elements[9]*=c,fi.elements[10]*=c,i.setFromRotationMatrix(fi),r.x=n,r.y=o,r.z=s,this}makePerspective(t,i,r,a,n,o,s=Bi){let l=this.elements,h=2*n/(i-t),c=2*n/(r-a),u=(i+t)/(i-t),p=(r+a)/(r-a),m,g;if(s===Bi)m=-(o+n)/(o-n),g=-2*o*n/(o-n);else if(s===gn)m=-o/(o-n),g=-o*n/(o-n);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+s);return l[0]=h,l[4]=0,l[8]=u,l[12]=0,l[1]=0,l[5]=c,l[9]=p,l[13]=0,l[2]=0,l[6]=0,l[10]=m,l[14]=g,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,i,r,a,n,o,s=Bi){let l=this.elements,h=1/(i-t),c=1/(r-a),u=1/(o-n),p=(i+t)*h,m=(r+a)*c,g,_;if(s===Bi)g=(o+n)*u,_=-2*u;else if(s===gn)g=n*u,_=-1*u;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+s);return l[0]=2*h,l[4]=0,l[8]=0,l[12]=-p,l[1]=0,l[5]=2*c,l[9]=0,l[13]=-m,l[2]=0,l[6]=0,l[10]=_,l[14]=-g,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){let i=this.elements,r=t.elements;for(let a=0;a<16;a++)if(i[a]!==r[a])return!1;return!0}fromArray(t,i=0){for(let r=0;r<16;r++)this.elements[r]=t[r+i];return this}toArray(t=[],i=0){let r=this.elements;return t[i]=r[0],t[i+1]=r[1],t[i+2]=r[2],t[i+3]=r[3],t[i+4]=r[4],t[i+5]=r[5],t[i+6]=r[6],t[i+7]=r[7],t[i+8]=r[8],t[i+9]=r[9],t[i+10]=r[10],t[i+11]=r[11],t[i+12]=r[12],t[i+13]=r[13],t[i+14]=r[14],t[i+15]=r[15],t}},jr=new v,fi=new tt,Vu=new v(0,0,0),Hu=new v(1,1,1),hr=new v,Sn=new v,Jt=new v,Wl=new tt,Xl=new Ct,jl=class b0{constructor(t=0,i=0,r=0,a=b0.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=i,this._z=r,this._order=a}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,i,r,a=this._order){return this._x=t,this._y=i,this._z=r,this._order=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,i=this._order,r=!0){let a=t.elements,n=a[0],o=a[4],s=a[8],l=a[1],h=a[5],c=a[9],u=a[2],p=a[6],m=a[10];switch(i){case"XYZ":this._y=Math.asin(Ut(s,-1,1)),Math.abs(s)<.9999999?(this._x=Math.atan2(-c,m),this._z=Math.atan2(-o,n)):(this._x=Math.atan2(p,h),this._z=0);break;case"YXZ":this._x=Math.asin(-Ut(c,-1,1)),Math.abs(c)<.9999999?(this._y=Math.atan2(s,m),this._z=Math.atan2(l,h)):(this._y=Math.atan2(-u,n),this._z=0);break;case"ZXY":this._x=Math.asin(Ut(p,-1,1)),Math.abs(p)<.9999999?(this._y=Math.atan2(-u,m),this._z=Math.atan2(-o,h)):(this._y=0,this._z=Math.atan2(l,n));break;case"ZYX":this._y=Math.asin(-Ut(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(p,m),this._z=Math.atan2(l,n)):(this._x=0,this._z=Math.atan2(-o,h));break;case"YZX":this._z=Math.asin(Ut(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-c,h),this._y=Math.atan2(-u,n)):(this._x=0,this._y=Math.atan2(s,m));break;case"XZY":this._z=Math.asin(-Ut(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(p,h),this._y=Math.atan2(s,n)):(this._x=Math.atan2(-c,m),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+i)}return this._order=i,r===!0&&this._onChangeCallback(),this}setFromQuaternion(t,i,r){return Wl.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Wl,i,r)}setFromVector3(t,i=this._order){return this.set(t.x,t.y,t.z,i)}reorder(t){return Xl.setFromEuler(this),this.setFromQuaternion(Xl,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],i=0){return t[i]=this._x,t[i+1]=this._y,t[i+2]=this._z,t[i+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}},jl.DEFAULT_ORDER="XYZ",ql=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},Gu=0,Yl=new v,qr=new Ct,Gi=new tt,wn=new v,Ua=new v,Wu=new v,Xu=new Ct,Kl=new v(1,0,0),Jl=new v(0,1,0),Zl=new v(0,0,1),ju={type:"added"},qu={type:"removed"},Yt=class So extends Vr{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Gu++}),this.uuid=_r(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=So.DEFAULT_UP.clone();let t=new v,i=new jl,r=new Ct,a=new v(1,1,1);function n(){r.setFromEuler(i,!1)}function o(){i.setFromQuaternion(r,void 0,!1)}i._onChange(n),r._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:i},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:a},modelViewMatrix:{value:new tt},normalMatrix:{value:new Xe}}),this.matrix=new tt,this.matrixWorld=new tt,this.matrixAutoUpdate=So.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=So.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new ql,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,i){this.quaternion.setFromAxisAngle(t,i)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,i){return qr.setFromAxisAngle(t,i),this.quaternion.multiply(qr),this}rotateOnWorldAxis(t,i){return qr.setFromAxisAngle(t,i),this.quaternion.premultiply(qr),this}rotateX(t){return this.rotateOnAxis(Kl,t)}rotateY(t){return this.rotateOnAxis(Jl,t)}rotateZ(t){return this.rotateOnAxis(Zl,t)}translateOnAxis(t,i){return Yl.copy(t).applyQuaternion(this.quaternion),this.position.add(Yl.multiplyScalar(i)),this}translateX(t){return this.translateOnAxis(Kl,t)}translateY(t){return this.translateOnAxis(Jl,t)}translateZ(t){return this.translateOnAxis(Zl,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(Gi.copy(this.matrixWorld).invert())}lookAt(t,i,r){t.isVector3?wn.copy(t):wn.set(t,i,r);let a=this.parent;this.updateWorldMatrix(!0,!1),Ua.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Gi.lookAt(Ua,wn,this.up):Gi.lookAt(wn,Ua,this.up),this.quaternion.setFromRotationMatrix(Gi),a&&(Gi.extractRotation(a.matrixWorld),qr.setFromRotationMatrix(Gi),this.quaternion.premultiply(qr.invert()))}add(t){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.add(arguments[i]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.parent!==null&&t.parent.remove(t),t.parent=this,this.children.push(t),t.dispatchEvent(ju)):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let r=0;r<arguments.length;r++)this.remove(arguments[r]);return this}let i=this.children.indexOf(t);return i!==-1&&(t.parent=null,this.children.splice(i,1),t.dispatchEvent(qu)),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),Gi.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),Gi.multiply(t.parent.matrixWorld)),t.applyMatrix4(Gi),this.add(t),t.updateWorldMatrix(!1,!0),this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,i){if(this[t]===i)return this;for(let r=0,a=this.children.length;r<a;r++){let n=this.children[r].getObjectByProperty(t,i);if(n!==void 0)return n}}getObjectsByProperty(t,i,r=[]){this[t]===i&&r.push(this);let a=this.children;for(let n=0,o=a.length;n<o;n++)a[n].getObjectsByProperty(t,i,r);return r}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ua,t,Wu),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ua,Xu,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let i=this.matrixWorld.elements;return t.set(i[8],i[9],i[10]).normalize()}raycast(){}traverse(t){t(this);let i=this.children;for(let r=0,a=i.length;r<a;r++)i[r].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let i=this.children;for(let r=0,a=i.length;r<a;r++)i[r].traverseVisible(t)}traverseAncestors(t){let i=this.parent;i!==null&&(t(i),i.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,t=!0);let i=this.children;for(let r=0,a=i.length;r<a;r++){let n=i[r];(n.matrixWorldAutoUpdate===!0||t===!0)&&n.updateMatrixWorld(t)}}updateWorldMatrix(t,i){let r=this.parent;if(t===!0&&r!==null&&r.matrixWorldAutoUpdate===!0&&r.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),i===!0){let a=this.children;for(let n=0,o=a.length;n<o;n++){let s=a[n];s.matrixWorldAutoUpdate===!0&&s.updateWorldMatrix(!1,!0)}}}toJSON(t){let i=t===void 0||typeof t=="string",r={};i&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},r.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});let a={};a.uuid=this.uuid,a.type=this.type,this.name!==""&&(a.name=this.name),this.castShadow===!0&&(a.castShadow=!0),this.receiveShadow===!0&&(a.receiveShadow=!0),this.visible===!1&&(a.visible=!1),this.frustumCulled===!1&&(a.frustumCulled=!1),this.renderOrder!==0&&(a.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(a.userData=this.userData),a.layers=this.layers.mask,a.matrix=this.matrix.toArray(),a.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(a.matrixAutoUpdate=!1),this.isInstancedMesh&&(a.type="InstancedMesh",a.count=this.count,a.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(a.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(a.type="BatchedMesh",a.perObjectFrustumCulled=this.perObjectFrustumCulled,a.sortObjects=this.sortObjects,a.drawRanges=this._drawRanges,a.reservedRanges=this._reservedRanges,a.visibility=this._visibility,a.active=this._active,a.bounds=this._bounds.map(s=>({boxInitialized:s.boxInitialized,boxMin:s.box.min.toArray(),boxMax:s.box.max.toArray(),sphereInitialized:s.sphereInitialized,sphereRadius:s.sphere.radius,sphereCenter:s.sphere.center.toArray()})),a.maxGeometryCount=this._maxGeometryCount,a.maxVertexCount=this._maxVertexCount,a.maxIndexCount=this._maxIndexCount,a.geometryInitialized=this._geometryInitialized,a.geometryCount=this._geometryCount,a.matricesTexture=this._matricesTexture.toJSON(t),this.boundingSphere!==null&&(a.boundingSphere={center:a.boundingSphere.center.toArray(),radius:a.boundingSphere.radius}),this.boundingBox!==null&&(a.boundingBox={min:a.boundingBox.min.toArray(),max:a.boundingBox.max.toArray()}));function n(s,l){return s[l.uuid]===void 0&&(s[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?a.background=this.background.toJSON():this.background.isTexture&&(a.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(a.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){a.geometry=n(t.geometries,this.geometry);let s=this.geometry.parameters;if(s!==void 0&&s.shapes!==void 0){let l=s.shapes;if(Array.isArray(l))for(let h=0,c=l.length;h<c;h++){let u=l[h];n(t.shapes,u)}else n(t.shapes,l)}}if(this.isSkinnedMesh&&(a.bindMode=this.bindMode,a.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(n(t.skeletons,this.skeleton),a.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let s=[];for(let l=0,h=this.material.length;l<h;l++)s.push(n(t.materials,this.material[l]));a.material=s}else a.material=n(t.materials,this.material);if(this.children.length>0){a.children=[];for(let s=0;s<this.children.length;s++)a.children.push(this.children[s].toJSON(t).object)}if(this.animations.length>0){a.animations=[];for(let s=0;s<this.animations.length;s++){let l=this.animations[s];a.animations.push(n(t.animations,l))}}if(i){let s=o(t.geometries),l=o(t.materials),h=o(t.textures),c=o(t.images),u=o(t.shapes),p=o(t.skeletons),m=o(t.animations),g=o(t.nodes);s.length>0&&(r.geometries=s),l.length>0&&(r.materials=l),h.length>0&&(r.textures=h),c.length>0&&(r.images=c),u.length>0&&(r.shapes=u),p.length>0&&(r.skeletons=p),m.length>0&&(r.animations=m),g.length>0&&(r.nodes=g)}return r.object=a,r;function o(s){let l=[];for(let h in s){let c=s[h];delete c.metadata,l.push(c)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,i=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),i===!0)for(let r=0;r<t.children.length;r++){let a=t.children[r];this.add(a.clone())}return this}},Yt.DEFAULT_UP=new v(0,1,0),Yt.DEFAULT_MATRIX_AUTO_UPDATE=!0,Yt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0,gi=new v,Wi=new v,Cs=new v,Xi=new v,Yr=new v,Kr=new v,Ql=new v,Ls=new v,Ps=new v,Ds=new v,En=!1,Tn=class va{constructor(t=new v,i=new v,r=new v){this.a=t,this.b=i,this.c=r}static getNormal(t,i,r,a){a.subVectors(r,i),gi.subVectors(t,i),a.cross(gi);let n=a.lengthSq();return n>0?a.multiplyScalar(1/Math.sqrt(n)):a.set(0,0,0)}static getBarycoord(t,i,r,a,n){gi.subVectors(a,i),Wi.subVectors(r,i),Cs.subVectors(t,i);let o=gi.dot(gi),s=gi.dot(Wi),l=gi.dot(Cs),h=Wi.dot(Wi),c=Wi.dot(Cs),u=o*h-s*s;if(u===0)return n.set(0,0,0),null;let p=1/u,m=(h*l-s*c)*p,g=(o*c-s*l)*p;return n.set(1-m-g,g,m)}static containsPoint(t,i,r,a){return this.getBarycoord(t,i,r,a,Xi)===null?!1:Xi.x>=0&&Xi.y>=0&&Xi.x+Xi.y<=1}static getUV(t,i,r,a,n,o,s,l){return En===!1&&(console.warn("THREE.Triangle.getUV() has been renamed to THREE.Triangle.getInterpolation()."),En=!0),this.getInterpolation(t,i,r,a,n,o,s,l)}static getInterpolation(t,i,r,a,n,o,s,l){return this.getBarycoord(t,i,r,a,Xi)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(n,Xi.x),l.addScaledVector(o,Xi.y),l.addScaledVector(s,Xi.z),l)}static isFrontFacing(t,i,r,a){return gi.subVectors(r,i),Wi.subVectors(t,i),gi.cross(Wi).dot(a)<0}set(t,i,r){return this.a.copy(t),this.b.copy(i),this.c.copy(r),this}setFromPointsAndIndices(t,i,r,a){return this.a.copy(t[i]),this.b.copy(t[r]),this.c.copy(t[a]),this}setFromAttributeAndIndices(t,i,r,a){return this.a.fromBufferAttribute(t,i),this.b.fromBufferAttribute(t,r),this.c.fromBufferAttribute(t,a),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return gi.subVectors(this.c,this.b),Wi.subVectors(this.a,this.b),gi.cross(Wi).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return va.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,i){return va.getBarycoord(t,this.a,this.b,this.c,i)}getUV(t,i,r,a,n){return En===!1&&(console.warn("THREE.Triangle.getUV() has been renamed to THREE.Triangle.getInterpolation()."),En=!0),va.getInterpolation(t,this.a,this.b,this.c,i,r,a,n)}getInterpolation(t,i,r,a,n){return va.getInterpolation(t,this.a,this.b,this.c,i,r,a,n)}containsPoint(t){return va.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return va.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,i){let r=this.a,a=this.b,n=this.c,o,s;Yr.subVectors(a,r),Kr.subVectors(n,r),Ls.subVectors(t,r);let l=Yr.dot(Ls),h=Kr.dot(Ls);if(l<=0&&h<=0)return i.copy(r);Ps.subVectors(t,a);let c=Yr.dot(Ps),u=Kr.dot(Ps);if(c>=0&&u<=c)return i.copy(a);let p=l*u-c*h;if(p<=0&&l>=0&&c<=0)return o=l/(l-c),i.copy(r).addScaledVector(Yr,o);Ds.subVectors(t,n);let m=Yr.dot(Ds),g=Kr.dot(Ds);if(g>=0&&m<=g)return i.copy(n);let _=m*h-l*g;if(_<=0&&h>=0&&g<=0)return s=h/(h-g),i.copy(r).addScaledVector(Kr,s);let f=c*g-m*u;if(f<=0&&u-c>=0&&m-g>=0)return Ql.subVectors(n,a),s=(u-c)/(u-c+(m-g)),i.copy(a).addScaledVector(Ql,s);let d=1/(f+_+p);return o=_*d,s=p*d,i.copy(r).addScaledVector(Yr,o).addScaledVector(Kr,s)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}},$l={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},cr={h:0,s:0,l:0},An={h:0,s:0,l:0},Ne=class{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){let r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=vt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,it.toWorkingColorSpace(this,t),this}setRGB(e,t,i,r=it.workingColorSpace){return this.r=e,this.g=t,this.b=i,it.toWorkingColorSpace(this,r),this}setHSL(e,t,i,r=it.workingColorSpace){if(e=wo(e,1),t=Ut(t,0,1),i=Ut(i,0,1),t===0)this.r=this.g=this.b=i;else{let a=i<=.5?i*(1+t):i+t-i*t,n=2*i-a;this.r=Co(n,a,e+1/3),this.g=Co(n,a,e),this.b=Co(n,a,e-1/3)}return it.toWorkingColorSpace(this,r),this}setStyle(e,t=vt){function i(a){a!==void 0&&parseFloat(a)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let a,n=r[1],o=r[2];switch(n){case"rgb":case"rgba":if(a=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(a[4]),this.setRGB(Math.min(255,parseInt(a[1],10))/255,Math.min(255,parseInt(a[2],10))/255,Math.min(255,parseInt(a[3],10))/255,t);if(a=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(a[4]),this.setRGB(Math.min(100,parseInt(a[1],10))/100,Math.min(100,parseInt(a[2],10))/100,Math.min(100,parseInt(a[3],10))/100,t);break;case"hsl":case"hsla":if(a=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(a[4]),this.setHSL(parseFloat(a[1])/360,parseFloat(a[2])/100,parseFloat(a[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){let a=r[1],n=a.length;if(n===3)return this.setRGB(parseInt(a.charAt(0),16)/15,parseInt(a.charAt(1),16)/15,parseInt(a.charAt(2),16)/15,t);if(n===6)return this.setHex(parseInt(a,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=vt){let i=$l[e.toLowerCase()];return i!==void 0?this.setHex(i,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=ya(e.r),this.g=ya(e.g),this.b=ya(e.b),this}copyLinearToSRGB(e){return this.r=To(e.r),this.g=To(e.g),this.b=To(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=vt){return it.fromWorkingColorSpace(Ot.copy(this),e),Math.round(Ut(Ot.r*255,0,255))*65536+Math.round(Ut(Ot.g*255,0,255))*256+Math.round(Ut(Ot.b*255,0,255))}getHexString(e=vt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=it.workingColorSpace){it.fromWorkingColorSpace(Ot.copy(this),t);let i=Ot.r,r=Ot.g,a=Ot.b,n=Math.max(i,r,a),o=Math.min(i,r,a),s,l,h=(o+n)/2;if(o===n)s=0,l=0;else{let c=n-o;switch(l=h<=.5?c/(n+o):c/(2-n-o),n){case i:s=(r-a)/c+(r<a?6:0);break;case r:s=(a-i)/c+2;break;case a:s=(i-r)/c+4;break}s/=6}return e.h=s,e.s=l,e.l=h,e}getRGB(e,t=it.workingColorSpace){return it.fromWorkingColorSpace(Ot.copy(this),t),e.r=Ot.r,e.g=Ot.g,e.b=Ot.b,e}getStyle(e=vt){it.fromWorkingColorSpace(Ot.copy(this),e);let t=Ot.r,i=Ot.g,r=Ot.b;return e!==vt?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(r*255)})`}offsetHSL(e,t,i){return this.getHSL(cr),this.setHSL(cr.h+e,cr.s+t,cr.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(cr),e.getHSL(An);let i=en(cr.h,An.h,t),r=en(cr.s,An.s,t),a=en(cr.l,An.l,t);return this.setHSL(i,r,a),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,i=this.g,r=this.b,a=e.elements;return this.r=a[0]*t+a[3]*i+a[6]*r,this.g=a[1]*t+a[4]*i+a[7]*r,this.b=a[2]*t+a[5]*i+a[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Ot=new Ne,Ne.NAMES=$l,Yu=0,Na=class extends Vr{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Yu++}),this.uuid=_r(),this.name="",this.type="Material",this.blending=Or,this.side=tr,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=os,this.blendDst=ls,this.blendEquation=vr,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ne(0,0,0),this.blendAlpha=0,this.depthFunc=ln,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Pl,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Br,this.stencilZFail=Br,this.stencilZPass=Br,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBuild(){}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let i=e[t];if(i===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(i):r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[t]=i}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let i={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==Or&&(i.blending=this.blending),this.side!==tr&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==os&&(i.blendSrc=this.blendSrc),this.blendDst!==ls&&(i.blendDst=this.blendDst),this.blendEquation!==vr&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==ln&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Pl&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Br&&(i.stencilFail=this.stencilFail),this.stencilZFail!==Br&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==Br&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function r(a){let n=[];for(let o in a){let s=a[o];delete s.metadata,n.push(s)}return n}if(t){let a=r(e.textures),n=r(e.images);a.length>0&&(i.textures=a),n.length>0&&(i.images=n)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,i=null;if(t!==null){let r=t.length;i=new Array(r);for(let a=0;a!==r;++a)i[a]=t[a].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}},eh=class extends Na{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ne(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=Go,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},xt=new v,Rn=new xe,Ht=class{constructor(e,t,i=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=Ul,this._updateRange={offset:0,count:-1},this.updateRanges=[],this.gpuType=zi,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}get updateRange(){return console.warn("THREE.BufferAttribute: updateRange() is deprecated and will be removed in r169. Use addUpdateRange() instead."),this._updateRange}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let r=0,a=this.itemSize;r<a;r++)this.array[e+r]=t.array[i+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)Rn.fromBufferAttribute(this,t),Rn.applyMatrix3(e),this.setXY(t,Rn.x,Rn.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)xt.fromBufferAttribute(this,t),xt.applyMatrix3(e),this.setXYZ(t,xt.x,xt.y,xt.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)xt.fromBufferAttribute(this,t),xt.applyMatrix4(e),this.setXYZ(t,xt.x,xt.y,xt.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)xt.fromBufferAttribute(this,t),xt.applyNormalMatrix(e),this.setXYZ(t,xt.x,xt.y,xt.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)xt.fromBufferAttribute(this,t),xt.transformDirection(e),this.setXYZ(t,xt.x,xt.y,xt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=xa(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=jt(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=xa(t,this.array)),t}setX(e,t){return this.normalized&&(t=jt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=xa(t,this.array)),t}setY(e,t){return this.normalized&&(t=jt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=xa(t,this.array)),t}setZ(e,t){return this.normalized&&(t=jt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=xa(t,this.array)),t}setW(e,t){return this.normalized&&(t=jt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=jt(t,this.array),i=jt(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,r){return e*=this.itemSize,this.normalized&&(t=jt(t,this.array),i=jt(i,this.array),r=jt(r,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this}setXYZW(e,t,i,r,a){return e*=this.itemSize,this.normalized&&(t=jt(t,this.array),i=jt(i,this.array),r=jt(r,this.array),a=jt(a,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this.array[e+3]=a,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Ul&&(e.usage=this.usage),e}},Us=class extends Ht{constructor(e,t,i){super(new Uint16Array(e),t,i)}},th=class extends Ht{constructor(e,t,i){super(new Uint32Array(e),t,i)}},Je=class extends Ht{constructor(e,t,i){super(new Float32Array(e),t,i)}},Ku=0,li=new tt,Ns=new Yt,Jr=new v,Zt=new Hr,Ia=new Hr,Lt=new v,St=class S0 extends Vr{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Ku++}),this.uuid=_r(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(mc(t)?th:Us)(t,1):this.index=t,this}getAttribute(t){return this.attributes[t]}setAttribute(t,i){return this.attributes[t]=i,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,i,r=0){this.groups.push({start:t,count:i,materialIndex:r})}clearGroups(){this.groups=[]}setDrawRange(t,i){this.drawRange.start=t,this.drawRange.count=i}applyMatrix4(t){let i=this.attributes.position;i!==void 0&&(i.applyMatrix4(t),i.needsUpdate=!0);let r=this.attributes.normal;if(r!==void 0){let n=new Xe().getNormalMatrix(t);r.applyNormalMatrix(n),r.needsUpdate=!0}let a=this.attributes.tangent;return a!==void 0&&(a.transformDirection(t),a.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return li.makeRotationFromQuaternion(t),this.applyMatrix4(li),this}rotateX(t){return li.makeRotationX(t),this.applyMatrix4(li),this}rotateY(t){return li.makeRotationY(t),this.applyMatrix4(li),this}rotateZ(t){return li.makeRotationZ(t),this.applyMatrix4(li),this}translate(t,i,r){return li.makeTranslation(t,i,r),this.applyMatrix4(li),this}scale(t,i,r){return li.makeScale(t,i,r),this.applyMatrix4(li),this}lookAt(t){return Ns.lookAt(t),Ns.updateMatrix(),this.applyMatrix4(Ns.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Jr).negate(),this.translate(Jr.x,Jr.y,Jr.z),this}setFromPoints(t){let i=[];for(let r=0,a=t.length;r<a;r++){let n=t[r];i.push(n.x,n.y,n.z||0)}return this.setAttribute("position",new Je(i,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Hr);let t=this.attributes.position,i=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingBox.set(new v(-1/0,-1/0,-1/0),new v(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),i)for(let r=0,a=i.length;r<a;r++){let n=i[r];Zt.setFromBufferAttribute(n),this.morphTargetsRelative?(Lt.addVectors(this.boundingBox.min,Zt.min),this.boundingBox.expandByPoint(Lt),Lt.addVectors(this.boundingBox.max,Zt.max),this.boundingBox.expandByPoint(Lt)):(this.boundingBox.expandByPoint(Zt.min),this.boundingBox.expandByPoint(Zt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Da);let t=this.attributes.position,i=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingSphere.set(new v,1/0);return}if(t){let r=this.boundingSphere.center;if(Zt.setFromBufferAttribute(t),i)for(let n=0,o=i.length;n<o;n++){let s=i[n];Ia.setFromBufferAttribute(s),this.morphTargetsRelative?(Lt.addVectors(Zt.min,Ia.min),Zt.expandByPoint(Lt),Lt.addVectors(Zt.max,Ia.max),Zt.expandByPoint(Lt)):(Zt.expandByPoint(Ia.min),Zt.expandByPoint(Ia.max))}Zt.getCenter(r);let a=0;for(let n=0,o=t.count;n<o;n++)Lt.fromBufferAttribute(t,n),a=Math.max(a,r.distanceToSquared(Lt));if(i)for(let n=0,o=i.length;n<o;n++){let s=i[n],l=this.morphTargetsRelative;for(let h=0,c=s.count;h<c;h++)Lt.fromBufferAttribute(s,h),l&&(Jr.fromBufferAttribute(t,h),Lt.add(Jr)),a=Math.max(a,r.distanceToSquared(Lt))}this.boundingSphere.radius=Math.sqrt(a),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let t=this.index,i=this.attributes;if(t===null||i.position===void 0||i.normal===void 0||i.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let r=t.array,a=i.position.array,n=i.normal.array,o=i.uv.array,s=a.length/3;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Ht(new Float32Array(4*s),4));let l=this.getAttribute("tangent").array,h=[],c=[];for(let E=0;E<s;E++)h[E]=new v,c[E]=new v;let u=new v,p=new v,m=new v,g=new xe,_=new xe,f=new xe,d=new v,M=new v;function x(E,F,V){u.fromArray(a,E*3),p.fromArray(a,F*3),m.fromArray(a,V*3),g.fromArray(o,E*2),_.fromArray(o,F*2),f.fromArray(o,V*2),p.sub(u),m.sub(u),_.sub(g),f.sub(g);let Q=1/(_.x*f.y-f.x*_.y);isFinite(Q)&&(d.copy(p).multiplyScalar(f.y).addScaledVector(m,-_.y).multiplyScalar(Q),M.copy(m).multiplyScalar(_.x).addScaledVector(p,-f.x).multiplyScalar(Q),h[E].add(d),h[F].add(d),h[V].add(d),c[E].add(M),c[F].add(M),c[V].add(M))}let S=this.groups;S.length===0&&(S=[{start:0,count:r.length}]);for(let E=0,F=S.length;E<F;++E){let V=S[E],Q=V.start,P=V.count;for(let z=Q,C=Q+P;z<C;z+=3)x(r[z+0],r[z+1],r[z+2])}let D=new v,R=new v,L=new v,B=new v;function b(E){L.fromArray(n,E*3),B.copy(L);let F=h[E];D.copy(F),D.sub(L.multiplyScalar(L.dot(F))).normalize(),R.crossVectors(B,F);let V=R.dot(c[E])<0?-1:1;l[E*4]=D.x,l[E*4+1]=D.y,l[E*4+2]=D.z,l[E*4+3]=V}for(let E=0,F=S.length;E<F;++E){let V=S[E],Q=V.start,P=V.count;for(let z=Q,C=Q+P;z<C;z+=3)b(r[z+0]),b(r[z+1]),b(r[z+2])}}computeVertexNormals(){let t=this.index,i=this.getAttribute("position");if(i!==void 0){let r=this.getAttribute("normal");if(r===void 0)r=new Ht(new Float32Array(i.count*3),3),this.setAttribute("normal",r);else for(let p=0,m=r.count;p<m;p++)r.setXYZ(p,0,0,0);let a=new v,n=new v,o=new v,s=new v,l=new v,h=new v,c=new v,u=new v;if(t)for(let p=0,m=t.count;p<m;p+=3){let g=t.getX(p+0),_=t.getX(p+1),f=t.getX(p+2);a.fromBufferAttribute(i,g),n.fromBufferAttribute(i,_),o.fromBufferAttribute(i,f),c.subVectors(o,n),u.subVectors(a,n),c.cross(u),s.fromBufferAttribute(r,g),l.fromBufferAttribute(r,_),h.fromBufferAttribute(r,f),s.add(c),l.add(c),h.add(c),r.setXYZ(g,s.x,s.y,s.z),r.setXYZ(_,l.x,l.y,l.z),r.setXYZ(f,h.x,h.y,h.z)}else for(let p=0,m=i.count;p<m;p+=3)a.fromBufferAttribute(i,p+0),n.fromBufferAttribute(i,p+1),o.fromBufferAttribute(i,p+2),c.subVectors(o,n),u.subVectors(a,n),c.cross(u),r.setXYZ(p+0,c.x,c.y,c.z),r.setXYZ(p+1,c.x,c.y,c.z),r.setXYZ(p+2,c.x,c.y,c.z);this.normalizeNormals(),r.needsUpdate=!0}}normalizeNormals(){let t=this.attributes.normal;for(let i=0,r=t.count;i<r;i++)Lt.fromBufferAttribute(t,i),Lt.normalize(),t.setXYZ(i,Lt.x,Lt.y,Lt.z)}toNonIndexed(){function t(s,l){let h=s.array,c=s.itemSize,u=s.normalized,p=new h.constructor(l.length*c),m=0,g=0;for(let _=0,f=l.length;_<f;_++){s.isInterleavedBufferAttribute?m=l[_]*s.data.stride+s.offset:m=l[_]*c;for(let d=0;d<c;d++)p[g++]=h[m++]}return new Ht(p,c,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let i=new S0,r=this.index.array,a=this.attributes;for(let s in a){let l=a[s],h=t(l,r);i.setAttribute(s,h)}let n=this.morphAttributes;for(let s in n){let l=[],h=n[s];for(let c=0,u=h.length;c<u;c++){let p=h[c],m=t(p,r);l.push(m)}i.morphAttributes[s]=l}i.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let s=0,l=o.length;s<l;s++){let h=o[s];i.addGroup(h.start,h.count,h.materialIndex)}return i}toJSON(){let t={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){let l=this.parameters;for(let h in l)l[h]!==void 0&&(t[h]=l[h]);return t}t.data={attributes:{}};let i=this.index;i!==null&&(t.data.index={type:i.array.constructor.name,array:Array.prototype.slice.call(i.array)});let r=this.attributes;for(let l in r){let h=r[l];t.data.attributes[l]=h.toJSON(t.data)}let a={},n=!1;for(let l in this.morphAttributes){let h=this.morphAttributes[l],c=[];for(let u=0,p=h.length;u<p;u++){let m=h[u];c.push(m.toJSON(t.data))}c.length>0&&(a[l]=c,n=!0)}n&&(t.data.morphAttributes=a,t.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));let s=this.boundingSphere;return s!==null&&(t.data.boundingSphere={center:s.center.toArray(),radius:s.radius}),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let i={};this.name=t.name;let r=t.index;r!==null&&this.setIndex(r.clone(i));let a=t.attributes;for(let h in a){let c=a[h];this.setAttribute(h,c.clone(i))}let n=t.morphAttributes;for(let h in n){let c=[],u=n[h];for(let p=0,m=u.length;p<m;p++)c.push(u[p].clone(i));this.morphAttributes[h]=c}this.morphTargetsRelative=t.morphTargetsRelative;let o=t.groups;for(let h=0,c=o.length;h<c;h++){let u=o[h];this.addGroup(u.start,u.count,u.materialIndex)}let s=t.boundingBox;s!==null&&(this.boundingBox=s.clone());let l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}},ih=new tt,Er=new Gl,Cn=new Da,rh=new v,Zr=new v,Qr=new v,$r=new v,Is=new v,Ln=new v,Pn=new xe,Dn=new xe,Un=new xe,ah=new v,nh=new v,sh=new v,Nn=new v,In=new v,De=class extends Yt{constructor(e=new St,t=new eh){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let i=e[t[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=i.length;r<a;r++){let n=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[n]=r}}}}getVertexPosition(e,t){let i=this.geometry,r=i.attributes.position,a=i.morphAttributes.position,n=i.morphTargetsRelative;t.fromBufferAttribute(r,e);let o=this.morphTargetInfluences;if(a&&o){Ln.set(0,0,0);for(let s=0,l=a.length;s<l;s++){let h=o[s],c=a[s];h!==0&&(Is.fromBufferAttribute(c,e),n?Ln.addScaledVector(Is,h):Ln.addScaledVector(Is.sub(t),h))}t.add(Ln)}return t}raycast(e,t){let i=this.geometry,r=this.material,a=this.matrixWorld;r!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),Cn.copy(i.boundingSphere),Cn.applyMatrix4(a),Er.copy(e.ray).recast(e.near),!(Cn.containsPoint(Er.origin)===!1&&(Er.intersectSphere(Cn,rh)===null||Er.origin.distanceToSquared(rh)>(e.far-e.near)**2))&&(ih.copy(a).invert(),Er.copy(e.ray).applyMatrix4(ih),!(i.boundingBox!==null&&Er.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,Er)))}_computeIntersections(e,t,i){let r,a=this.geometry,n=this.material,o=a.index,s=a.attributes.position,l=a.attributes.uv,h=a.attributes.uv1,c=a.attributes.normal,u=a.groups,p=a.drawRange;if(o!==null)if(Array.isArray(n))for(let m=0,g=u.length;m<g;m++){let _=u[m],f=n[_.materialIndex],d=Math.max(_.start,p.start),M=Math.min(o.count,Math.min(_.start+_.count,p.start+p.count));for(let x=d,S=M;x<S;x+=3){let D=o.getX(x),R=o.getX(x+1),L=o.getX(x+2);r=es(this,f,e,i,l,h,c,D,R,L),r&&(r.faceIndex=Math.floor(x/3),r.face.materialIndex=_.materialIndex,t.push(r))}}else{let m=Math.max(0,p.start),g=Math.min(o.count,p.start+p.count);for(let _=m,f=g;_<f;_+=3){let d=o.getX(_),M=o.getX(_+1),x=o.getX(_+2);r=es(this,n,e,i,l,h,c,d,M,x),r&&(r.faceIndex=Math.floor(_/3),t.push(r))}}else if(s!==void 0)if(Array.isArray(n))for(let m=0,g=u.length;m<g;m++){let _=u[m],f=n[_.materialIndex],d=Math.max(_.start,p.start),M=Math.min(s.count,Math.min(_.start+_.count,p.start+p.count));for(let x=d,S=M;x<S;x+=3){let D=x,R=x+1,L=x+2;r=es(this,f,e,i,l,h,c,D,R,L),r&&(r.faceIndex=Math.floor(x/3),r.face.materialIndex=_.materialIndex,t.push(r))}}else{let m=Math.max(0,p.start),g=Math.min(s.count,p.start+p.count);for(let _=m,f=g;_<f;_+=3){let d=_,M=_+1,x=_+2;r=es(this,n,e,i,l,h,c,d,M,x),r&&(r.faceIndex=Math.floor(_/3),t.push(r))}}}},Ft=class w0 extends St{constructor(t=1,i=1,r=1,a=1,n=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:i,depth:r,widthSegments:a,heightSegments:n,depthSegments:o};let s=this;a=Math.floor(a),n=Math.floor(n),o=Math.floor(o);let l=[],h=[],c=[],u=[],p=0,m=0;g("z","y","x",-1,-1,r,i,t,o,n,0),g("z","y","x",1,-1,r,i,-t,o,n,1),g("x","z","y",1,1,t,r,i,a,o,2),g("x","z","y",1,-1,t,r,-i,a,o,3),g("x","y","z",1,-1,t,i,r,a,n,4),g("x","y","z",-1,-1,t,i,-r,a,n,5),this.setIndex(l),this.setAttribute("position",new Je(h,3)),this.setAttribute("normal",new Je(c,3)),this.setAttribute("uv",new Je(u,2));function g(_,f,d,M,x,S,D,R,L,B,b){let E=S/L,F=D/B,V=S/2,Q=D/2,P=R/2,z=L+1,C=B+1,G=0,O=0,U=new v;for(let K=0;K<C;K++){let j=K*F-Q;for(let I=0;I<z;I++){let W=I*E-V;U[_]=W*M,U[f]=j*x,U[d]=P,h.push(U.x,U.y,U.z),U[_]=0,U[f]=0,U[d]=R>0?1:-1,c.push(U.x,U.y,U.z),u.push(I/L),u.push(1-K/B),G+=1}}for(let K=0;K<B;K++)for(let j=0;j<L;j++){let I=p+j+z*K,W=p+j+z*(K+1),he=p+(j+1)+z*(K+1),me=p+(j+1)+z*K;l.push(I,W,me),l.push(W,he,me),O+=6}s.addGroup(m,O,b),m+=O,p+=G}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new w0(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}},Ju={clone:Ma,merge:qt},Zu=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Qu=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Ai=class extends Na{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Zu,this.fragmentShader=Qu,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={derivatives:!1,fragDepth:!1,drawBuffers:!1,shaderTextureLOD:!1,clipCullDistance:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Ma(e.uniforms),this.uniformsGroups=Q0(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let r in this.uniforms){let a=this.uniforms[r].value;a&&a.isTexture?t.uniforms[r]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[r]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[r]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[r]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[r]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[r]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[r]={type:"m4",value:a.toArray()}:t.uniforms[r]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let i={};for(let r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}},oh=class extends Yt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new tt,this.projectionMatrix=new tt,this.projectionMatrixInverse=new tt,this.coordinateSystem=Bi}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}},hi=class extends oh{constructor(e=50,t=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=Ra*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(Aa*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Ra*2*Math.atan(Math.tan(Aa*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}setViewOffset(e,t,i,r,a,n){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=a,this.view.height=n,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(Aa*.5*this.fov)/this.zoom,i=2*t,r=this.aspect*i,a=-.5*r,n=this.view;if(this.view!==null&&this.view.enabled){let s=n.fullWidth,l=n.fullHeight;a+=n.offsetX*r/s,t-=n.offsetY*i/l,r*=n.width/s,i*=n.height/l}let o=this.filmOffset;o!==0&&(a+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(a,a+r,t,t-i,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},ea=-90,ta=1,$u=class extends Yt{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new hi(ea,ta,e,t);r.layers=this.layers,this.add(r);let a=new hi(ea,ta,e,t);a.layers=this.layers,this.add(a);let n=new hi(ea,ta,e,t);n.layers=this.layers,this.add(n);let o=new hi(ea,ta,e,t);o.layers=this.layers,this.add(o);let s=new hi(ea,ta,e,t);s.layers=this.layers,this.add(s);let l=new hi(ea,ta,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[i,r,a,n,o,s]=t;for(let l of t)this.remove(l);if(e===Bi)i.up.set(0,1,0),i.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),a.up.set(0,0,-1),a.lookAt(0,1,0),n.up.set(0,0,1),n.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),s.up.set(0,1,0),s.lookAt(0,0,-1);else if(e===gn)i.up.set(0,-1,0),i.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),a.up.set(0,0,1),a.lookAt(0,1,0),n.up.set(0,0,-1),n.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),s.up.set(0,-1,0),s.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:i,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[a,n,o,s,l,h]=this.children,c=e.getRenderTarget(),u=e.getActiveCubeFace(),p=e.getActiveMipmapLevel(),m=e.xr.enabled;e.xr.enabled=!1;let g=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,e.setRenderTarget(i,0,r),e.render(t,a),e.setRenderTarget(i,1,r),e.render(t,n),e.setRenderTarget(i,2,r),e.render(t,o),e.setRenderTarget(i,3,r),e.render(t,s),e.setRenderTarget(i,4,r),e.render(t,l),i.texture.generateMipmaps=g,e.setRenderTarget(i,5,r),e.render(t,h),e.setRenderTarget(c,u,p),e.xr.enabled=m,i.texture.needsPMREMUpdate=!0}},lh=class extends pi{constructor(e,t,i,r,a,n,o,s,l,h){e=e!==void 0?e:[],t=t!==void 0?t:Fr,super(e,t,i,r,a,n,o,s,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},ed=class extends br{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let i={width:e,height:e,depth:1},r=[i,i,i,i,i,i];t.encoding!==void 0&&(tn("THREE.WebGLCubeRenderTarget: option.encoding has been replaced by option.colorSpace."),t.colorSpace=t.encoding===Mr?vt:oi),this.texture=new lh(r,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:ni}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new Ft(5,5,5),a=new Ai({name:"CubemapFromEquirect",uniforms:Ma(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Vt,blending:ir});a.uniforms.tEquirect.value=t;let n=new De(r,a),o=t.minFilter;return t.minFilter===Ea&&(t.minFilter=ni),new $u(1,10,this).update(e,n),t.minFilter=o,n.geometry.dispose(),n.material.dispose(),this}clear(e,t,i,r){let a=e.getRenderTarget();for(let n=0;n<6;n++)e.setRenderTarget(this,n),e.clear(t,i,r);e.setRenderTarget(a)}},Os=new v,td=new v,id=new Xe,Tr=class{constructor(e=new v(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,r){return this.normal.set(e,t,i),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){let r=Os.subVectors(i,t).cross(td.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){let i=e.delta(Os),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let a=-(e.start.dot(this.normal)+this.constant)/r;return a<0||a>1?null:t.copy(e.start).addScaledVector(i,a)}intersectsLine(e){let t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let i=t||id.getNormalMatrix(e),r=this.coplanarPoint(Os).applyMatrix4(e),a=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(a),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},Ar=new Da,On=new v,Fs=class{constructor(e=new Tr,t=new Tr,i=new Tr,r=new Tr,a=new Tr,n=new Tr){this.planes=[e,t,i,r,a,n]}set(e,t,i,r,a,n){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(i),o[3].copy(r),o[4].copy(a),o[5].copy(n),this}copy(e){let t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=Bi){let i=this.planes,r=e.elements,a=r[0],n=r[1],o=r[2],s=r[3],l=r[4],h=r[5],c=r[6],u=r[7],p=r[8],m=r[9],g=r[10],_=r[11],f=r[12],d=r[13],M=r[14],x=r[15];if(i[0].setComponents(s-a,u-l,_-p,x-f).normalize(),i[1].setComponents(s+a,u+l,_+p,x+f).normalize(),i[2].setComponents(s+n,u+h,_+m,x+d).normalize(),i[3].setComponents(s-n,u-h,_-m,x-d).normalize(),i[4].setComponents(s-o,u-c,_-g,x-M).normalize(),t===Bi)i[5].setComponents(s+o,u+c,_+g,x+M).normalize();else if(t===gn)i[5].setComponents(o,c,g,M).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Ar.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Ar.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Ar)}intersectsSprite(e){return Ar.center.set(0,0,0),Ar.radius=.7071067811865476,Ar.applyMatrix4(e.matrixWorld),this.intersectsSphere(Ar)}intersectsSphere(e){let t=this.planes,i=e.center,r=-e.radius;for(let a=0;a<6;a++)if(t[a].distanceToPoint(i)<r)return!1;return!0}intersectsBox(e){let t=this.planes;for(let i=0;i<6;i++){let r=t[i];if(On.x=r.normal.x>0?e.max.x:e.min.x,On.y=r.normal.y>0?e.max.y:e.min.y,On.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(On)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}},hh=class E0 extends St{constructor(t=1,i=1,r=1,a=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:i,widthSegments:r,heightSegments:a};let n=t/2,o=i/2,s=Math.floor(r),l=Math.floor(a),h=s+1,c=l+1,u=t/s,p=i/l,m=[],g=[],_=[],f=[];for(let d=0;d<c;d++){let M=d*p-o;for(let x=0;x<h;x++){let S=x*u-n;g.push(S,-M,0),_.push(0,0,1),f.push(x/s),f.push(1-d/l)}}for(let d=0;d<l;d++)for(let M=0;M<s;M++){let x=M+h*d,S=M+h*(d+1),D=M+1+h*(d+1),R=M+1+h*d;m.push(x,S,R),m.push(S,D,R)}this.setIndex(m),this.setAttribute("position",new Je(g,3)),this.setAttribute("normal",new Je(_,3)),this.setAttribute("uv",new Je(f,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new E0(t.width,t.height,t.widthSegments,t.heightSegments)}},rd=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,ad=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,nd=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,sd=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,od=`#ifdef USE_ALPHATEST
	if ( diffuseColor.a < alphaTest ) discard;
#endif`,ld=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,hd=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,cd=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,ud=`#ifdef USE_BATCHING
	attribute float batchId;
	uniform highp sampler2D batchingTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,dd=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( batchId );
#endif`,pd=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,md=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,fd=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,gd=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,_d=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,vd=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#pragma unroll_loop_start
	for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
		plane = clippingPlanes[ i ];
		if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
	}
	#pragma unroll_loop_end
	#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
		bool clipped = true;
		#pragma unroll_loop_start
		for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
		}
		#pragma unroll_loop_end
		if ( clipped ) discard;
	#endif
#endif`,xd=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,yd=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Md=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,bd=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Sd=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,wd=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	varying vec3 vColor;
#endif`,Ed=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif`,Td=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
float luminance( const in vec3 rgb ) {
	const vec3 weights = vec3( 0.2126729, 0.7151522, 0.0721750 );
	return dot( weights, rgb );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Ad=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Rd=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Cd=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Ld=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Pd=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Dd=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Ud="gl_FragColor = linearToOutputTexel( gl_FragColor );",Nd=`
const mat3 LINEAR_SRGB_TO_LINEAR_DISPLAY_P3 = mat3(
	vec3( 0.8224621, 0.177538, 0.0 ),
	vec3( 0.0331941, 0.9668058, 0.0 ),
	vec3( 0.0170827, 0.0723974, 0.9105199 )
);
const mat3 LINEAR_DISPLAY_P3_TO_LINEAR_SRGB = mat3(
	vec3( 1.2249401, - 0.2249404, 0.0 ),
	vec3( - 0.0420569, 1.0420571, 0.0 ),
	vec3( - 0.0196376, - 0.0786361, 1.0982735 )
);
vec4 LinearSRGBToLinearDisplayP3( in vec4 value ) {
	return vec4( value.rgb * LINEAR_SRGB_TO_LINEAR_DISPLAY_P3, value.a );
}
vec4 LinearDisplayP3ToLinearSRGB( in vec4 value ) {
	return vec4( value.rgb * LINEAR_DISPLAY_P3_TO_LINEAR_SRGB, value.a );
}
vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
vec4 LinearToLinear( in vec4 value ) {
	return value;
}
vec4 LinearTosRGB( in vec4 value ) {
	return sRGBTransferOETF( value );
}`,Id=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Od=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Fd=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,zd=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,kd=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Bd=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Vd=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Hd=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Gd=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Wd=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Xd=`#ifdef USE_LIGHTMAP
	vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
	vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
	reflectedLight.indirectDiffuse += lightMapIrradiance;
#endif`,jd=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,qd=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Yd=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Kd=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	#if defined ( LEGACY_LIGHTS )
		if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
			return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );
		}
		return 1.0;
	#else
		float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
		if ( cutoffDistance > 0.0 ) {
			distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
		}
		return distanceFalloff;
	#endif
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Jd=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,Zd=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Qd=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,$d=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,ep=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,tp=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,ip=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,rp=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,ap=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,np=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,sp=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	gl_FragDepthEXT = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,op=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,lp=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		varying float vFragDepth;
		varying float vIsPerspective;
	#else
		uniform float logDepthBufFC;
	#endif
#endif`,hp=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		vFragDepth = 1.0 + gl_Position.w;
		vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
	#else
		if ( isPerspectiveMatrix( projectionMatrix ) ) {
			gl_Position.z = log2( max( EPSILON, gl_Position.w + 1.0 ) ) * logDepthBufFC - 1.0;
			gl_Position.z *= gl_Position.w;
		}
	#endif
#endif`,cp=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,up=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,dp=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,pp=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,mp=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,fp=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,gp=`#if defined( USE_MORPHCOLORS ) && defined( MORPHTARGETS_TEXTURE )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,_p=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		objectNormal += morphNormal0 * morphTargetInfluences[ 0 ];
		objectNormal += morphNormal1 * morphTargetInfluences[ 1 ];
		objectNormal += morphNormal2 * morphTargetInfluences[ 2 ];
		objectNormal += morphNormal3 * morphTargetInfluences[ 3 ];
	#endif
#endif`,vp=`#ifdef USE_MORPHTARGETS
	uniform float morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
		uniform sampler2DArray morphTargetsTexture;
		uniform ivec2 morphTargetsTextureSize;
		vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
			int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
			int y = texelIndex / morphTargetsTextureSize.x;
			int x = texelIndex - y * morphTargetsTextureSize.x;
			ivec3 morphUV = ivec3( x, y, morphTargetIndex );
			return texelFetch( morphTargetsTexture, morphUV, 0 );
		}
	#else
		#ifndef USE_MORPHNORMALS
			uniform float morphTargetInfluences[ 8 ];
		#else
			uniform float morphTargetInfluences[ 4 ];
		#endif
	#endif
#endif`,xp=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		transformed += morphTarget0 * morphTargetInfluences[ 0 ];
		transformed += morphTarget1 * morphTargetInfluences[ 1 ];
		transformed += morphTarget2 * morphTargetInfluences[ 2 ];
		transformed += morphTarget3 * morphTargetInfluences[ 3 ];
		#ifndef USE_MORPHNORMALS
			transformed += morphTarget4 * morphTargetInfluences[ 4 ];
			transformed += morphTarget5 * morphTargetInfluences[ 5 ];
			transformed += morphTarget6 * morphTargetInfluences[ 6 ];
			transformed += morphTarget7 * morphTargetInfluences[ 7 ];
		#endif
	#endif
#endif`,yp=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Mp=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,bp=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Sp=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,wp=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Ep=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Tp=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Ap=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Rp=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Cp=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Lp=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Pp=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;
const vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256., 256. );
const vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );
const float ShiftRight8 = 1. / 256.;
vec4 packDepthToRGBA( const in float v ) {
	vec4 r = vec4( fract( v * PackFactors ), v );
	r.yzw -= r.xyz * ShiftRight8;	return r * PackUpscale;
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors );
}
vec2 packDepthToRG( in highp float v ) {
	return packDepthToRGBA( v ).yx;
}
float unpackRGToDepth( const in highp vec2 v ) {
	return unpackRGBAToDepth( vec4( v.xy, 0.0, 0.0 ) );
}
vec4 pack2HalfToRGBA( vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,Dp=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Up=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Np=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Ip=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Op=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Fp=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,zp=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return shadow;
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
		vec3 lightToPosition = shadowCoord.xyz;
		float dp = ( length( lightToPosition ) - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );		dp += shadowBias;
		vec3 bd3D = normalize( lightToPosition );
		#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
			vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
			return (
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
			) * ( 1.0 / 9.0 );
		#else
			return texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
		#endif
	}
#endif`,kp=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Bp=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Vp=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Hp=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Gp=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Wp=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Xp=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,jp=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,qp=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Yp=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Kp=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 OptimizedCineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color *= toneMappingExposure;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	return color;
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Jp=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Zp=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
		vec3 refractedRayExit = position + transmissionRay;
		vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
		vec2 refractionCoords = ndcPos.xy / ndcPos.w;
		refractionCoords += 1.0;
		refractionCoords /= 2.0;
		vec4 transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
		vec3 transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Qp=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,$p=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,em=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,tm=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,im=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,rm=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,am=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,nm=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,sm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,om=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,lm=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,hm=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#endif
}`,cm=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,um=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,dm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,pm=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,mm=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,fm=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,gm=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,_m=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,vm=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,xm=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,ym=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Mm=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,bm=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Sm=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), opacity );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,wm=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Em=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Tm=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Am=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Rm=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Cm=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Lm=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Pm=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Dm=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Um=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Nm=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec2 scale;
	scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
	scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Im=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Be={alphahash_fragment:rd,alphahash_pars_fragment:ad,alphamap_fragment:nd,alphamap_pars_fragment:sd,alphatest_fragment:od,alphatest_pars_fragment:ld,aomap_fragment:hd,aomap_pars_fragment:cd,batching_pars_vertex:ud,batching_vertex:dd,begin_vertex:pd,beginnormal_vertex:md,bsdfs:fd,iridescence_fragment:gd,bumpmap_pars_fragment:_d,clipping_planes_fragment:vd,clipping_planes_pars_fragment:xd,clipping_planes_pars_vertex:yd,clipping_planes_vertex:Md,color_fragment:bd,color_pars_fragment:Sd,color_pars_vertex:wd,color_vertex:Ed,common:Td,cube_uv_reflection_fragment:Ad,defaultnormal_vertex:Rd,displacementmap_pars_vertex:Cd,displacementmap_vertex:Ld,emissivemap_fragment:Pd,emissivemap_pars_fragment:Dd,colorspace_fragment:Ud,colorspace_pars_fragment:Nd,envmap_fragment:Id,envmap_common_pars_fragment:Od,envmap_pars_fragment:Fd,envmap_pars_vertex:zd,envmap_physical_pars_fragment:Jd,envmap_vertex:kd,fog_vertex:Bd,fog_pars_vertex:Vd,fog_fragment:Hd,fog_pars_fragment:Gd,gradientmap_pars_fragment:Wd,lightmap_fragment:Xd,lightmap_pars_fragment:jd,lights_lambert_fragment:qd,lights_lambert_pars_fragment:Yd,lights_pars_begin:Kd,lights_toon_fragment:Zd,lights_toon_pars_fragment:Qd,lights_phong_fragment:$d,lights_phong_pars_fragment:ep,lights_physical_fragment:tp,lights_physical_pars_fragment:ip,lights_fragment_begin:rp,lights_fragment_maps:ap,lights_fragment_end:np,logdepthbuf_fragment:sp,logdepthbuf_pars_fragment:op,logdepthbuf_pars_vertex:lp,logdepthbuf_vertex:hp,map_fragment:cp,map_pars_fragment:up,map_particle_fragment:dp,map_particle_pars_fragment:pp,metalnessmap_fragment:mp,metalnessmap_pars_fragment:fp,morphcolor_vertex:gp,morphnormal_vertex:_p,morphtarget_pars_vertex:vp,morphtarget_vertex:xp,normal_fragment_begin:yp,normal_fragment_maps:Mp,normal_pars_fragment:bp,normal_pars_vertex:Sp,normal_vertex:wp,normalmap_pars_fragment:Ep,clearcoat_normal_fragment_begin:Tp,clearcoat_normal_fragment_maps:Ap,clearcoat_pars_fragment:Rp,iridescence_pars_fragment:Cp,opaque_fragment:Lp,packing:Pp,premultiplied_alpha_fragment:Dp,project_vertex:Up,dithering_fragment:Np,dithering_pars_fragment:Ip,roughnessmap_fragment:Op,roughnessmap_pars_fragment:Fp,shadowmap_pars_fragment:zp,shadowmap_pars_vertex:kp,shadowmap_vertex:Bp,shadowmask_pars_fragment:Vp,skinbase_vertex:Hp,skinning_pars_vertex:Gp,skinning_vertex:Wp,skinnormal_vertex:Xp,specularmap_fragment:jp,specularmap_pars_fragment:qp,tonemapping_fragment:Yp,tonemapping_pars_fragment:Kp,transmission_fragment:Jp,transmission_pars_fragment:Zp,uv_pars_fragment:Qp,uv_pars_vertex:$p,uv_vertex:em,worldpos_vertex:tm,background_vert:im,background_frag:rm,backgroundCube_vert:am,backgroundCube_frag:nm,cube_vert:sm,cube_frag:om,depth_vert:lm,depth_frag:hm,distanceRGBA_vert:cm,distanceRGBA_frag:um,equirect_vert:dm,equirect_frag:pm,linedashed_vert:mm,linedashed_frag:fm,meshbasic_vert:gm,meshbasic_frag:_m,meshlambert_vert:vm,meshlambert_frag:xm,meshmatcap_vert:ym,meshmatcap_frag:Mm,meshnormal_vert:bm,meshnormal_frag:Sm,meshphong_vert:wm,meshphong_frag:Em,meshphysical_vert:Tm,meshphysical_frag:Am,meshtoon_vert:Rm,meshtoon_frag:Cm,points_vert:Lm,points_frag:Pm,shadow_vert:Dm,shadow_frag:Um,sprite_vert:Nm,sprite_frag:Im},ge={common:{diffuse:{value:new Ne(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Xe},alphaMap:{value:null},alphaMapTransform:{value:new Xe},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Xe}},envmap:{envMap:{value:null},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Xe}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Xe}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Xe},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Xe},normalScale:{value:new xe(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Xe},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Xe}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Xe}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Xe}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ne(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ne(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Xe},alphaTest:{value:0},uvTransform:{value:new Xe}},sprite:{diffuse:{value:new Ne(16777215)},opacity:{value:1},center:{value:new xe(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Xe},alphaMap:{value:null},alphaMapTransform:{value:new Xe},alphaTest:{value:0}}},Ri={basic:{uniforms:qt([ge.common,ge.specularmap,ge.envmap,ge.aomap,ge.lightmap,ge.fog]),vertexShader:Be.meshbasic_vert,fragmentShader:Be.meshbasic_frag},lambert:{uniforms:qt([ge.common,ge.specularmap,ge.envmap,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.fog,ge.lights,{emissive:{value:new Ne(0)}}]),vertexShader:Be.meshlambert_vert,fragmentShader:Be.meshlambert_frag},phong:{uniforms:qt([ge.common,ge.specularmap,ge.envmap,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.fog,ge.lights,{emissive:{value:new Ne(0)},specular:{value:new Ne(1118481)},shininess:{value:30}}]),vertexShader:Be.meshphong_vert,fragmentShader:Be.meshphong_frag},standard:{uniforms:qt([ge.common,ge.envmap,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.roughnessmap,ge.metalnessmap,ge.fog,ge.lights,{emissive:{value:new Ne(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Be.meshphysical_vert,fragmentShader:Be.meshphysical_frag},toon:{uniforms:qt([ge.common,ge.aomap,ge.lightmap,ge.emissivemap,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.gradientmap,ge.fog,ge.lights,{emissive:{value:new Ne(0)}}]),vertexShader:Be.meshtoon_vert,fragmentShader:Be.meshtoon_frag},matcap:{uniforms:qt([ge.common,ge.bumpmap,ge.normalmap,ge.displacementmap,ge.fog,{matcap:{value:null}}]),vertexShader:Be.meshmatcap_vert,fragmentShader:Be.meshmatcap_frag},points:{uniforms:qt([ge.points,ge.fog]),vertexShader:Be.points_vert,fragmentShader:Be.points_frag},dashed:{uniforms:qt([ge.common,ge.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Be.linedashed_vert,fragmentShader:Be.linedashed_frag},depth:{uniforms:qt([ge.common,ge.displacementmap]),vertexShader:Be.depth_vert,fragmentShader:Be.depth_frag},normal:{uniforms:qt([ge.common,ge.bumpmap,ge.normalmap,ge.displacementmap,{opacity:{value:1}}]),vertexShader:Be.meshnormal_vert,fragmentShader:Be.meshnormal_frag},sprite:{uniforms:qt([ge.sprite,ge.fog]),vertexShader:Be.sprite_vert,fragmentShader:Be.sprite_frag},background:{uniforms:{uvTransform:{value:new Xe},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Be.background_vert,fragmentShader:Be.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1}},vertexShader:Be.backgroundCube_vert,fragmentShader:Be.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Be.cube_vert,fragmentShader:Be.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Be.equirect_vert,fragmentShader:Be.equirect_frag},distanceRGBA:{uniforms:qt([ge.common,ge.displacementmap,{referencePosition:{value:new v},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Be.distanceRGBA_vert,fragmentShader:Be.distanceRGBA_frag},shadow:{uniforms:qt([ge.lights,ge.fog,{color:{value:new Ne(0)},opacity:{value:1}}]),vertexShader:Be.shadow_vert,fragmentShader:Be.shadow_frag}},Ri.physical={uniforms:qt([Ri.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Xe},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Xe},clearcoatNormalScale:{value:new xe(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Xe},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Xe},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Xe},sheen:{value:0},sheenColor:{value:new Ne(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Xe},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Xe},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Xe},transmissionSamplerSize:{value:new xe},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Xe},attenuationDistance:{value:0},attenuationColor:{value:new Ne(0)},specularColor:{value:new Ne(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Xe},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Xe},anisotropyVector:{value:new xe},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Xe}}]),vertexShader:Be.meshphysical_vert,fragmentShader:Be.meshphysical_frag},Fn={r:0,b:0,g:0},ch=class extends oh{constructor(e=-1,t=1,i=1,r=-1,a=.1,n=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=r,this.near=a,this.far=n,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,r,a,n){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=a,this.view.height=n,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2,a=i-e,n=i+e,o=r+t,s=r-t;if(this.view!==null&&this.view.enabled){let l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;a+=l*this.view.offsetX,n=a+l*this.view.width,o-=h*this.view.offsetY,s=o-h*this.view.height}this.projectionMatrix.makeOrthographic(a,n,o,s,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},ia=4,uh=[.125,.215,.35,.446,.526,.582],Rr=20,zs=new ch,dh=new Ne,ks=null,Bs=0,Vs=0,Cr=(1+Math.sqrt(5))/2,ra=1/Cr,ph=[new v(1,1,1),new v(-1,1,1),new v(1,1,-1),new v(-1,1,-1),new v(0,Cr,ra),new v(0,Cr,-ra),new v(ra,0,Cr),new v(-ra,0,Cr),new v(Cr,ra,0),new v(-Cr,ra,0)],Hs=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,i=.1,r=100){ks=this._renderer.getRenderTarget(),Bs=this._renderer.getActiveCubeFace(),Vs=this._renderer.getActiveMipmapLevel(),this._setSize(256);let a=this._allocateTargets();return a.depthBuffer=!0,this._sceneToCubeUV(e,i,r,a),t>0&&this._blur(a,0,0,t),this._applyPMREM(a),this._cleanup(a),a}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=xc(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=vc(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(ks,Bs,Vs),e.scissorTest=!1,ts(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Fr||e.mapping===zr?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),ks=this._renderer.getRenderTarget(),Bs=this._renderer.getActiveCubeFace(),Vs=this._renderer.getActiveMipmapLevel();let i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:ni,minFilter:ni,generateMipmaps:!1,type:Ta,format:si,colorSpace:ki,depthBuffer:!1},r=_c(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=_c(e,t,i);let{_lodMax:a}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=sg(a)),this._blurMaterial=og(a,e,t)}return r}_compileMaterial(e){let t=new De(this._lodPlanes[0],e);this._renderer.compile(t,zs)}_sceneToCubeUV(e,t,i,r){let a=new hi(90,1,t,i),n=[1,-1,1,1,1,1],o=[1,1,1,-1,-1,-1],s=this._renderer,l=s.autoClear,h=s.toneMapping;s.getClearColor(dh),s.toneMapping=rr,s.autoClear=!1;let c=new eh({name:"PMREM.Background",side:Vt,depthWrite:!1,depthTest:!1}),u=new De(new Ft,c),p=!1,m=e.background;m?m.isColor&&(c.color.copy(m),e.background=null,p=!0):(c.color.copy(dh),p=!0);for(let g=0;g<6;g++){let _=g%3;_===0?(a.up.set(0,n[g],0),a.lookAt(o[g],0,0)):_===1?(a.up.set(0,0,n[g]),a.lookAt(0,o[g],0)):(a.up.set(0,n[g],0),a.lookAt(0,0,o[g]));let f=this._cubeSize;ts(r,_*f,g>2?f:0,f,f),s.setRenderTarget(r),p&&s.render(u,a),s.render(e,a)}u.geometry.dispose(),u.material.dispose(),s.toneMapping=h,s.autoClear=l,e.background=m}_textureToCubeUV(e,t){let i=this._renderer,r=e.mapping===Fr||e.mapping===zr;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=xc()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=vc());let a=r?this._cubemapMaterial:this._equirectMaterial,n=new De(this._lodPlanes[0],a),o=a.uniforms;o.envMap.value=e;let s=this._cubeSize;ts(t,0,0,3*s,2*s),i.setRenderTarget(t),i.render(n,zs)}_applyPMREM(e){let t=this._renderer,i=t.autoClear;t.autoClear=!1;for(let r=1;r<this._lodPlanes.length;r++){let a=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),n=ph[(r-1)%ph.length];this._blur(e,r-1,r,a,n)}t.autoClear=i}_blur(e,t,i,r,a){let n=this._pingPongRenderTarget;this._halfBlur(e,n,t,i,r,"latitudinal",a),this._halfBlur(n,e,i,i,r,"longitudinal",a)}_halfBlur(e,t,i,r,a,n,o){let s=this._renderer,l=this._blurMaterial;n!=="latitudinal"&&n!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");let h=3,c=new De(this._lodPlanes[r],l),u=l.uniforms,p=this._sizeLods[i]-1,m=isFinite(a)?Math.PI/(2*p):2*Math.PI/(2*Rr-1),g=a/m,_=isFinite(a)?1+Math.floor(h*g):Rr;_>Rr&&console.warn(`sigmaRadians, ${a}, is too large and will clip, as it requested ${_} samples when the maximum is set to ${Rr}`);let f=[],d=0;for(let R=0;R<Rr;++R){let L=R/g,B=Math.exp(-L*L/2);f.push(B),R===0?d+=B:R<_&&(d+=2*B)}for(let R=0;R<f.length;R++)f[R]=f[R]/d;u.envMap.value=e.texture,u.samples.value=_,u.weights.value=f,u.latitudinal.value=n==="latitudinal",o&&(u.poleAxis.value=o);let{_lodMax:M}=this;u.dTheta.value=m,u.mipInt.value=M-i;let x=this._sizeLods[r],S=3*x*(r>M-ia?r-M+ia:0),D=4*(this._cubeSize-x);ts(t,S,D,3*x,2*x),s.setRenderTarget(t),s.render(c,zs)}},mh=class extends pi{constructor(e,t,i,r,a,n,o,s,l,h){if(h=h!==void 0?h:yr,h!==yr&&h!==kr)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");i===void 0&&h===yr&&(i=nr),i===void 0&&h===kr&&(i=xr),super(null,r,a,n,o,s,h,i,l),this.isDepthTexture=!0,this.image={width:e,height:t},this.magFilter=o!==void 0?o:Nt,this.minFilter=s!==void 0?s:Nt,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},fh=new pi,gh=new mh(1,1),gh.compareFunction=Dl,_h=new Vl,vh=new ku,xh=new lh,yh=[],Mh=[],bh=new Float32Array(16),Sh=new Float32Array(9),wh=new Float32Array(4),Om=class{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=Og(t.type)}},Fm=class{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=i_(t.type)}},zm=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){let r=this.seq;for(let a=0,n=r.length;a!==n;++a){let o=r[a];o.setValue(e,t[o.id],i)}}},Gs=/(\w+)(\])?(\[|\.)?/g,zn=class{constructor(e,t){this.seq=[],this.map={};let i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<i;++r){let a=e.getActiveUniform(t,r),n=e.getUniformLocation(t,a.name);r_(a,n,this)}}setValue(e,t,i,r){let a=this.map[t];a!==void 0&&a.setValue(e,i,r)}setOptional(e,t,i){let r=t[i];r!==void 0&&this.setValue(e,i,r)}static upload(e,t,i,r){for(let a=0,n=t.length;a!==n;++a){let o=t[a],s=i[o.id];s.needsUpdate!==!1&&o.setValue(e,s.value,r)}}static seqWithValue(e,t){let i=[];for(let r=0,a=e.length;r!==a;++r){let n=e[r];n.id in t&&i.push(n)}return i}},km=37297,Bm=0,Vm=/^[ \t]*#include +<([\w\d./]+)>/gm,Hm=new Map([["encodings_fragment","colorspace_fragment"],["encodings_pars_fragment","colorspace_pars_fragment"],["output_fragment","opaque_fragment"]]),Gm=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g,Wm=0,Xm=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){let t=e.vertexShader,i=e.fragmentShader,r=this._getShaderStage(t),a=this._getShaderStage(i),n=this._getShaderCacheForMaterial(e);return n.has(r)===!1&&(n.add(r),r.usedTimes++),n.has(a)===!1&&(n.add(a),a.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){let t=this.shaderCache,i=t.get(e);return i===void 0&&(i=new jm(e),t.set(e,i)),i}},jm=class{constructor(e){this.id=Wm++,this.code=e,this.usedTimes=0}},qm=0,Ym=class extends Na{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Eu,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},Km=class extends Na{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}},Jm=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Zm=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`,Qm=class extends hi{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e}},ji=class extends Yt{constructor(){super(),this.isGroup=!0,this.type="Group"}},$m={type:"move"},Ws=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new ji,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new ji,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new v,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new v),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new ji,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new v,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new v),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let r=null,a=null,n=null,o=this._targetRay,s=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){n=!0;for(let g of e.hand.values()){let _=t.getJointPose(g,i),f=this._getHandJoint(l,g);_!==null&&(f.matrix.fromArray(_.transform.matrix),f.matrix.decompose(f.position,f.rotation,f.scale),f.matrixWorldNeedsUpdate=!0,f.jointRadius=_.radius),f.visible=_!==null}let h=l.joints["index-finger-tip"],c=l.joints["thumb-tip"],u=h.position.distanceTo(c.position),p=.02,m=.005;l.inputState.pinching&&u>p+m?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&u<=p-m&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else s!==null&&e.gripSpace&&(a=t.getPose(e.gripSpace,i),a!==null&&(s.matrix.fromArray(a.transform.matrix),s.matrix.decompose(s.position,s.rotation,s.scale),s.matrixWorldNeedsUpdate=!0,a.linearVelocity?(s.hasLinearVelocity=!0,s.linearVelocity.copy(a.linearVelocity)):s.hasLinearVelocity=!1,a.angularVelocity?(s.hasAngularVelocity=!0,s.angularVelocity.copy(a.angularVelocity)):s.hasAngularVelocity=!1));o!==null&&(r=t.getPose(e.targetRaySpace,i),r===null&&a!==null&&(r=a),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent($m)))}return o!==null&&(o.visible=r!==null),s!==null&&(s.visible=a!==null),l!==null&&(l.visible=n!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let i=new ji;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}},ef=class extends Vr{constructor(e,t){super();let i=this,r=null,a=1,n=null,o="local-floor",s=1,l=null,h=null,c=null,u=null,p=null,m=null,g=t.getContextAttributes(),_=null,f=null,d=[],M=[],x=new xe,S=null,D=new hi;D.layers.enable(1),D.viewport=new gt;let R=new hi;R.layers.enable(2),R.viewport=new gt;let L=[D,R],B=new Qm;B.layers.enable(1),B.layers.enable(2);let b=null,E=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(I){let W=d[I];return W===void 0&&(W=new Ws,d[I]=W),W.getTargetRaySpace()},this.getControllerGrip=function(I){let W=d[I];return W===void 0&&(W=new Ws,d[I]=W),W.getGripSpace()},this.getHand=function(I){let W=d[I];return W===void 0&&(W=new Ws,d[I]=W),W.getHandSpace()};function F(I){let W=M.indexOf(I.inputSource);if(W===-1)return;let he=d[W];he!==void 0&&(he.update(I.inputSource,I.frame,l||n),he.dispatchEvent({type:I.type,data:I.inputSource}))}function V(){r.removeEventListener("select",F),r.removeEventListener("selectstart",F),r.removeEventListener("selectend",F),r.removeEventListener("squeeze",F),r.removeEventListener("squeezestart",F),r.removeEventListener("squeezeend",F),r.removeEventListener("end",V),r.removeEventListener("inputsourceschange",Q);for(let I=0;I<d.length;I++){let W=M[I];W!==null&&(M[I]=null,d[I].disconnect(W))}b=null,E=null,e.setRenderTarget(_),p=null,u=null,c=null,r=null,f=null,j.stop(),i.isPresenting=!1,e.setPixelRatio(S),e.setSize(x.width,x.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(I){a=I,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(I){o=I,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||n},this.setReferenceSpace=function(I){l=I},this.getBaseLayer=function(){return u!==null?u:p},this.getBinding=function(){return c},this.getFrame=function(){return m},this.getSession=function(){return r},this.setSession=async function(I){if(r=I,r!==null){if(_=e.getRenderTarget(),r.addEventListener("select",F),r.addEventListener("selectstart",F),r.addEventListener("selectend",F),r.addEventListener("squeeze",F),r.addEventListener("squeezestart",F),r.addEventListener("squeezeend",F),r.addEventListener("end",V),r.addEventListener("inputsourceschange",Q),g.xrCompatible!==!0&&await t.makeXRCompatible(),S=e.getPixelRatio(),e.getSize(x),r.renderState.layers===void 0||e.capabilities.isWebGL2===!1){let W={antialias:r.renderState.layers===void 0?g.antialias:!0,alpha:!0,depth:g.depth,stencil:g.stencil,framebufferScaleFactor:a};p=new XRWebGLLayer(r,t,W),r.updateRenderState({baseLayer:p}),e.setPixelRatio(1),e.setSize(p.framebufferWidth,p.framebufferHeight,!1),f=new br(p.framebufferWidth,p.framebufferHeight,{format:si,type:ar,colorSpace:e.outputColorSpace,stencilBuffer:g.stencil})}else{let W=null,he=null,me=null;g.depth&&(me=g.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,W=g.stencil?kr:yr,he=g.stencil?xr:nr);let q={colorFormat:t.RGBA8,depthFormat:me,scaleFactor:a};c=new XRWebGLBinding(r,t),u=c.createProjectionLayer(q),r.updateRenderState({layers:[u]}),e.setPixelRatio(1),e.setSize(u.textureWidth,u.textureHeight,!1),f=new br(u.textureWidth,u.textureHeight,{format:si,type:ar,depthTexture:new mh(u.textureWidth,u.textureHeight,he,void 0,void 0,void 0,void 0,void 0,void 0,W),stencilBuffer:g.stencil,colorSpace:e.outputColorSpace,samples:g.antialias?4:0});let $=e.properties.get(f);$.__ignoreDepthValues=u.ignoreDepthValues}f.isXRRenderTarget=!0,this.setFoveation(s),l=null,n=await r.requestReferenceSpace(o),j.setContext(r),j.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode};function Q(I){for(let W=0;W<I.removed.length;W++){let he=I.removed[W],me=M.indexOf(he);me>=0&&(M[me]=null,d[me].disconnect(he))}for(let W=0;W<I.added.length;W++){let he=I.added[W],me=M.indexOf(he);if(me===-1){for(let $=0;$<d.length;$++)if($>=M.length){M.push(he),me=$;break}else if(M[$]===null){M[$]=he,me=$;break}if(me===-1)break}let q=d[me];q&&q.connect(he)}}let P=new v,z=new v;function C(I,W,he){P.setFromMatrixPosition(W.matrixWorld),z.setFromMatrixPosition(he.matrixWorld);let me=P.distanceTo(z),q=W.projectionMatrix.elements,$=he.projectionMatrix.elements,pe=q[14]/(q[10]-1),ne=q[14]/(q[10]+1),re=(q[9]+1)/q[5],T=(q[9]-1)/q[5],ae=(q[8]-1)/q[0],te=($[8]+1)/$[0],ie=pe*ae,ee=pe*te,X=me/(-ae+te),se=X*-ae;W.matrixWorld.decompose(I.position,I.quaternion,I.scale),I.translateX(se),I.translateZ(X),I.matrixWorld.compose(I.position,I.quaternion,I.scale),I.matrixWorldInverse.copy(I.matrixWorld).invert();let ce=pe+X,w=ne+X,y=ie-se,k=ee+(me-se),le=re*ne/w*ce,oe=T*ne/w*ce;I.projectionMatrix.makePerspective(y,k,le,oe,ce,w),I.projectionMatrixInverse.copy(I.projectionMatrix).invert()}function G(I,W){W===null?I.matrixWorld.copy(I.matrix):I.matrixWorld.multiplyMatrices(W.matrixWorld,I.matrix),I.matrixWorldInverse.copy(I.matrixWorld).invert()}this.updateCamera=function(I){if(r===null)return;B.near=R.near=D.near=I.near,B.far=R.far=D.far=I.far,(b!==B.near||E!==B.far)&&(r.updateRenderState({depthNear:B.near,depthFar:B.far}),b=B.near,E=B.far);let W=I.parent,he=B.cameras;G(B,W);for(let me=0;me<he.length;me++)G(he[me],W);he.length===2?C(B,D,R):B.projectionMatrix.copy(D.projectionMatrix),O(I,B,W)};function O(I,W,he){he===null?I.matrix.copy(W.matrixWorld):(I.matrix.copy(he.matrixWorld),I.matrix.invert(),I.matrix.multiply(W.matrixWorld)),I.matrix.decompose(I.position,I.quaternion,I.scale),I.updateMatrixWorld(!0),I.projectionMatrix.copy(W.projectionMatrix),I.projectionMatrixInverse.copy(W.projectionMatrixInverse),I.isPerspectiveCamera&&(I.fov=Ra*2*Math.atan(1/I.projectionMatrix.elements[5]),I.zoom=1)}this.getCamera=function(){return B},this.getFoveation=function(){if(!(u===null&&p===null))return s},this.setFoveation=function(I){s=I,u!==null&&(u.fixedFoveation=I),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=I)};let U=null;function K(I,W){if(h=W.getViewerPose(l||n),m=W,h!==null){let he=h.views;p!==null&&(e.setRenderTargetFramebuffer(f,p.framebuffer),e.setRenderTarget(f));let me=!1;he.length!==B.cameras.length&&(B.cameras.length=0,me=!0);for(let q=0;q<he.length;q++){let $=he[q],pe=null;if(p!==null)pe=p.getViewport($);else{let re=c.getViewSubImage(u,$);pe=re.viewport,q===0&&(e.setRenderTargetTextures(f,re.colorTexture,u.ignoreDepthValues?void 0:re.depthStencilTexture),e.setRenderTarget(f))}let ne=L[q];ne===void 0&&(ne=new hi,ne.layers.enable(q),ne.viewport=new gt,L[q]=ne),ne.matrix.fromArray($.transform.matrix),ne.matrix.decompose(ne.position,ne.quaternion,ne.scale),ne.projectionMatrix.fromArray($.projectionMatrix),ne.projectionMatrixInverse.copy(ne.projectionMatrix).invert(),ne.viewport.set(pe.x,pe.y,pe.width,pe.height),q===0&&(B.matrix.copy(ne.matrix),B.matrix.decompose(B.position,B.quaternion,B.scale)),me===!0&&B.cameras.push(ne)}}for(let he=0;he<d.length;he++){let me=M[he],q=d[he];me!==null&&q!==void 0&&q.update(me,W,l||n)}U&&U(I,W),W.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:W}),m=null}let j=new gc;j.setAnimationLoop(K),this.setAnimationLoop=function(I){U=I},this.dispose=function(){}}},Eh=class{constructor(e={}){let{canvas:t=J0(),context:i=null,depth:r=!0,stencil:a=!0,alpha:n=!1,antialias:o=!1,premultipliedAlpha:s=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:c=!1}=e;this.isWebGLRenderer=!0;let u;i!==null?u=i.getContextAttributes().alpha:u=n;let p=new Uint32Array(4),m=new Int32Array(4),g=null,_=null,f=[],d=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=vt,this._useLegacyLights=!1,this.toneMapping=rr,this.toneMappingExposure=1;let M=this,x=!1,S=0,D=0,R=null,L=-1,B=null,b=new gt,E=new gt,F=null,V=new Ne(0),Q=0,P=t.width,z=t.height,C=1,G=null,O=null,U=new gt(0,0,P,z),K=new gt(0,0,P,z),j=!1,I=new Fs,W=!1,he=!1,me=null,q=new tt,$=new xe,pe=new v,ne={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};function re(){return R===null?C:1}let T=i;function ae(A,H){for(let J=0;J<A.length;J++){let Z=A[J],Y=t.getContext(Z,H);if(Y!==null)return Y}return null}try{let A={alpha:!0,depth:r,stencil:a,antialias:o,premultipliedAlpha:s,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:c};if("setAttribute"in t&&t.setAttribute("data-engine","three.js r160"),t.addEventListener("webglcontextlost",lt,!1),t.addEventListener("webglcontextrestored",_e,!1),t.addEventListener("webglcontextcreationerror",N,!1),T===null){let H=["webgl2","webgl","experimental-webgl"];if(M.isWebGL1Renderer===!0&&H.shift(),T=ae(H,A),T===null)throw ae(H)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}typeof WebGLRenderingContext<"u"&&T instanceof WebGLRenderingContext&&console.warn("THREE.WebGLRenderer: WebGL 1 support was deprecated in r153 and will be removed in r163."),T.getShaderPrecisionFormat===void 0&&(T.getShaderPrecisionFormat=function(){return{rangeMin:1,rangeMax:1,precision:1}})}catch(A){throw console.error("THREE.WebGLRenderer: "+A.message),A}let te,ie,ee,X,se,ce,w,y,k,le,oe,ue,Re,fe,Me,Te,Fe,de,Tt,je,ze,Ae,Ce,qe;function ot(){te=new hg(T),ie=new rg(T,te,e),te.init(ie),Ae=new D_(T,te,ie),ee=new L_(T,te,ie),X=new dg(T),se=new M_,ce=new P_(T,te,ee,se,ie,Ae,X),w=new ng(M),y=new lg(M),k=new $0(T,ie),Ce=new tg(T,te,k,ie),le=new cg(T,k,X,Ce),oe=new gg(T,le,k,X),Tt=new fg(T,ie,ce),Te=new ag(se),ue=new y_(M,w,y,te,ie,Ce,Te),Re=new U_(M,se),fe=new S_,Me=new R_(te,ie),de=new eg(M,w,y,ee,oe,u,s),Fe=new C_(M,oe,ie),qe=new N_(T,X,ie,ee),je=new ig(T,te,X,ie),ze=new ug(T,te,X,ie),X.programs=ue.programs,M.capabilities=ie,M.extensions=te,M.properties=se,M.renderLists=fe,M.shadowMap=Fe,M.state=ee,M.info=X}ot();let Qe=new ef(M,T);this.xr=Qe,this.getContext=function(){return T},this.getContextAttributes=function(){return T.getContextAttributes()},this.forceContextLoss=function(){let A=te.get("WEBGL_lose_context");A&&A.loseContext()},this.forceContextRestore=function(){let A=te.get("WEBGL_lose_context");A&&A.restoreContext()},this.getPixelRatio=function(){return C},this.setPixelRatio=function(A){A!==void 0&&(C=A,this.setSize(P,z,!1))},this.getSize=function(A){return A.set(P,z)},this.setSize=function(A,H,J=!0){if(Qe.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}P=A,z=H,t.width=Math.floor(A*C),t.height=Math.floor(H*C),J===!0&&(t.style.width=A+"px",t.style.height=H+"px"),this.setViewport(0,0,A,H)},this.getDrawingBufferSize=function(A){return A.set(P*C,z*C).floor()},this.setDrawingBufferSize=function(A,H,J){P=A,z=H,C=J,t.width=Math.floor(A*J),t.height=Math.floor(H*J),this.setViewport(0,0,A,H)},this.getCurrentViewport=function(A){return A.copy(b)},this.getViewport=function(A){return A.copy(U)},this.setViewport=function(A,H,J,Z){A.isVector4?U.set(A.x,A.y,A.z,A.w):U.set(A,H,J,Z),ee.viewport(b.copy(U).multiplyScalar(C).floor())},this.getScissor=function(A){return A.copy(K)},this.setScissor=function(A,H,J,Z){A.isVector4?K.set(A.x,A.y,A.z,A.w):K.set(A,H,J,Z),ee.scissor(E.copy(K).multiplyScalar(C).floor())},this.getScissorTest=function(){return j},this.setScissorTest=function(A){ee.setScissorTest(j=A)},this.setOpaqueSort=function(A){G=A},this.setTransparentSort=function(A){O=A},this.getClearColor=function(A){return A.copy(de.getClearColor())},this.setClearColor=function(){de.setClearColor.apply(de,arguments)},this.getClearAlpha=function(){return de.getClearAlpha()},this.setClearAlpha=function(){de.setClearAlpha.apply(de,arguments)},this.clear=function(A=!0,H=!0,J=!0){let Z=0;if(A){let Y=!1;if(R!==null){let ye=R.texture.format;Y=ye===$o||ye===Qo||ye===Zo}if(Y){let ye=R.texture.type,Le=ye===ar||ye===nr||ye===ms||ye===xr||ye===Ko||ye===Jo,Ue=de.getClearColor(),Oe=de.getClearAlpha(),Ke=Ue.r,He=Ue.g,Ge=Ue.b;Le?(p[0]=Ke,p[1]=He,p[2]=Ge,p[3]=Oe,T.clearBufferuiv(T.COLOR,0,p)):(m[0]=Ke,m[1]=He,m[2]=Ge,m[3]=Oe,T.clearBufferiv(T.COLOR,0,m))}else Z|=T.COLOR_BUFFER_BIT}H&&(Z|=T.DEPTH_BUFFER_BIT),J&&(Z|=T.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),T.clear(Z)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",lt,!1),t.removeEventListener("webglcontextrestored",_e,!1),t.removeEventListener("webglcontextcreationerror",N,!1),fe.dispose(),Me.dispose(),se.dispose(),w.dispose(),y.dispose(),oe.dispose(),Ce.dispose(),qe.dispose(),ue.dispose(),Qe.dispose(),Qe.removeEventListener("sessionstart",Mt),Qe.removeEventListener("sessionend",Si),me&&(me.dispose(),me=null),et.stop()};function lt(A){A.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),x=!0}function _e(){console.log("THREE.WebGLRenderer: Context Restored."),x=!1;let A=X.autoReset,H=Fe.enabled,J=Fe.autoUpdate,Z=Fe.needsUpdate,Y=Fe.type;ot(),X.autoReset=A,Fe.enabled=H,Fe.autoUpdate=J,Fe.needsUpdate=Z,Fe.type=Y}function N(A){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",A.statusMessage)}function ve(A){let H=A.target;H.removeEventListener("dispose",ve),we(H)}function we(A){ke(A),se.remove(A)}function ke(A){let H=se.get(A).programs;H!==void 0&&(H.forEach(function(J){ue.releaseProgram(J)}),A.isShaderMaterial&&ue.releaseShaderCache(A))}this.renderBufferDirect=function(A,H,J,Z,Y,ye){H===null&&(H=ne);let Le=Y.isMesh&&Y.matrixWorld.determinant()<0,Ue=Zv(A,H,J,Z,Y);ee.setMaterial(Z,Le);let Oe=J.index,Ke=1;if(Z.wireframe===!0){if(Oe=le.getWireframeAttribute(J),Oe===void 0)return;Ke=2}let He=J.drawRange,Ge=J.attributes.position,Wt=He.start*Ke,Dt=(He.start+He.count)*Ke;ye!==null&&(Wt=Math.max(Wt,ye.start*Ke),Dt=Math.min(Dt,(ye.start+ye.count)*Ke)),Oe!==null?(Wt=Math.max(Wt,0),Dt=Math.min(Dt,Oe.count)):Ge!=null&&(Wt=Math.max(Wt,0),Dt=Math.min(Dt,Ge.count));let wi=Dt-Wt;if(wi<0||wi===1/0)return;Ce.setup(Y,Z,Ue,J,Oe);let gr,bt=je;if(Oe!==null&&(gr=k.get(Oe),bt=ze,bt.setIndex(gr)),Y.isMesh)Z.wireframe===!0?(ee.setLineWidth(Z.wireframeLinewidth*re()),bt.setMode(T.LINES)):bt.setMode(T.TRIANGLES);else if(Y.isLine){let We=Z.linewidth;We===void 0&&(We=1),ee.setLineWidth(We*re()),Y.isLineSegments?bt.setMode(T.LINES):Y.isLineLoop?bt.setMode(T.LINE_LOOP):bt.setMode(T.LINE_STRIP)}else Y.isPoints?bt.setMode(T.POINTS):Y.isSprite&&bt.setMode(T.TRIANGLES);if(Y.isBatchedMesh)bt.renderMultiDraw(Y._multiDrawStarts,Y._multiDrawCounts,Y._multiDrawCount);else if(Y.isInstancedMesh)bt.renderInstances(Wt,wi,Y.count);else if(J.isInstancedBufferGeometry){let We=J._maxInstanceCount!==void 0?J._maxInstanceCount:1/0,oc=Math.min(J.instanceCount,We);bt.renderInstances(Wt,wi,oc)}else bt.render(Wt,wi)};function Pe(A,H,J){A.transparent===!0&&A.side===Ti&&A.forceSinglePass===!1?(A.side=Vt,A.needsUpdate=!0,Mo(A,H,J),A.side=tr,A.needsUpdate=!0,Mo(A,H,J),A.side=Ti):Mo(A,H,J)}this.compile=function(A,H,J=null){J===null&&(J=A),_=Me.get(J),_.init(),d.push(_),J.traverseVisible(function(Y){Y.isLight&&Y.layers.test(H.layers)&&(_.pushLight(Y),Y.castShadow&&_.pushShadow(Y))}),A!==J&&A.traverseVisible(function(Y){Y.isLight&&Y.layers.test(H.layers)&&(_.pushLight(Y),Y.castShadow&&_.pushShadow(Y))}),_.setupLights(M._useLegacyLights);let Z=new Set;return A.traverse(function(Y){let ye=Y.material;if(ye)if(Array.isArray(ye))for(let Le=0;Le<ye.length;Le++){let Ue=ye[Le];Pe(Ue,J,Y),Z.add(Ue)}else Pe(ye,J,Y),Z.add(ye)}),d.pop(),_=null,Z},this.compileAsync=function(A,H,J=null){let Z=this.compile(A,H,J);return new Promise(Y=>{function ye(){if(Z.forEach(function(Le){se.get(Le).currentProgram.isReady()&&Z.delete(Le)}),Z.size===0){Y(A);return}setTimeout(ye,10)}te.get("KHR_parallel_shader_compile")!==null?ye():setTimeout(ye,10)})};let ht=null;function pt(A){ht&&ht(A)}function Mt(){et.stop()}function Si(){et.start()}let et=new gc;et.setAnimationLoop(pt),typeof self<"u"&&et.setContext(self),this.setAnimationLoop=function(A){ht=A,Qe.setAnimationLoop(A),A===null?et.stop():et.start()},Qe.addEventListener("sessionstart",Mt),Qe.addEventListener("sessionend",Si),this.render=function(A,H){if(H!==void 0&&H.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(x===!0)return;A.matrixWorldAutoUpdate===!0&&A.updateMatrixWorld(),H.parent===null&&H.matrixWorldAutoUpdate===!0&&H.updateMatrixWorld(),Qe.enabled===!0&&Qe.isPresenting===!0&&(Qe.cameraAutoUpdate===!0&&Qe.updateCamera(H),H=Qe.getCamera()),A.isScene===!0&&A.onBeforeRender(M,A,H,R),_=Me.get(A,d.length),_.init(),d.push(_),q.multiplyMatrices(H.projectionMatrix,H.matrixWorldInverse),I.setFromProjectionMatrix(q),he=this.localClippingEnabled,W=Te.init(this.clippingPlanes,he),g=fe.get(A,f.length),g.init(),f.push(g),$i(A,H,0,M.sortObjects),g.finish(),M.sortObjects===!0&&g.sort(G,O),this.info.render.frame++,W===!0&&Te.beginShadows();let J=_.state.shadowsArray;if(Fe.render(J,A,H),W===!0&&Te.endShadows(),this.info.autoReset===!0&&this.info.reset(),de.render(g,A),_.setupLights(M._useLegacyLights),H.isArrayCamera){let Z=H.cameras;for(let Y=0,ye=Z.length;Y<ye;Y++){let Le=Z[Y];er(g,A,Le,Le.viewport)}}else er(g,A,H);R!==null&&(ce.updateMultisampleRenderTarget(R),ce.updateRenderTargetMipmap(R)),A.isScene===!0&&A.onAfterRender(M,A,H),Ce.resetDefaultState(),L=-1,B=null,d.pop(),d.length>0?_=d[d.length-1]:_=null,f.pop(),f.length>0?g=f[f.length-1]:g=null};function $i(A,H,J,Z){if(A.visible===!1)return;if(A.layers.test(H.layers)){if(A.isGroup)J=A.renderOrder;else if(A.isLOD)A.autoUpdate===!0&&A.update(H);else if(A.isLight)_.pushLight(A),A.castShadow&&_.pushShadow(A);else if(A.isSprite){if(!A.frustumCulled||I.intersectsSprite(A)){Z&&pe.setFromMatrixPosition(A.matrixWorld).applyMatrix4(q);let ye=oe.update(A),Le=A.material;Le.visible&&g.push(A,ye,Le,J,pe.z,null)}}else if((A.isMesh||A.isLine||A.isPoints)&&(!A.frustumCulled||I.intersectsObject(A))){let ye=oe.update(A),Le=A.material;if(Z&&(A.boundingSphere!==void 0?(A.boundingSphere===null&&A.computeBoundingSphere(),pe.copy(A.boundingSphere.center)):(ye.boundingSphere===null&&ye.computeBoundingSphere(),pe.copy(ye.boundingSphere.center)),pe.applyMatrix4(A.matrixWorld).applyMatrix4(q)),Array.isArray(Le)){let Ue=ye.groups;for(let Oe=0,Ke=Ue.length;Oe<Ke;Oe++){let He=Ue[Oe],Ge=Le[He.materialIndex];Ge&&Ge.visible&&g.push(A,ye,Ge,J,pe.z,He)}}else Le.visible&&g.push(A,ye,Le,J,pe.z,null)}}let Y=A.children;for(let ye=0,Le=Y.length;ye<Le;ye++)$i(Y[ye],H,J,Z)}function er(A,H,J,Z){let Y=A.opaque,ye=A.transmissive,Le=A.transparent;_.setupLightsView(J),W===!0&&Te.setGlobalState(M.clippingPlanes,J),ye.length>0&&Jv(Y,ye,H,J),Z&&ee.viewport(b.copy(Z)),Y.length>0&&yo(Y,H,J),ye.length>0&&yo(ye,H,J),Le.length>0&&yo(Le,H,J),ee.buffers.depth.setTest(!0),ee.buffers.depth.setMask(!0),ee.buffers.color.setMask(!0),ee.setPolygonOffset(!1)}function Jv(A,H,J,Z){if((J.isScene===!0?J.overrideMaterial:null)!==null)return;let Y=ie.isWebGL2;me===null&&(me=new br(1,1,{generateMipmaps:!0,type:te.has("EXT_color_buffer_half_float")?Ta:ar,minFilter:Ea,samples:Y?4:0})),M.getDrawingBufferSize($),Y?me.setSize($.x,$.y):me.setSize(Qn($.x),Qn($.y));let ye=M.getRenderTarget();M.setRenderTarget(me),M.getClearColor(V),Q=M.getClearAlpha(),Q<1&&M.setClearColor(16777215,.5),M.clear();let Le=M.toneMapping;M.toneMapping=rr,yo(A,J,Z),ce.updateMultisampleRenderTarget(me),ce.updateRenderTargetMipmap(me);let Ue=!1;for(let Oe=0,Ke=H.length;Oe<Ke;Oe++){let He=H[Oe],Ge=He.object,Wt=He.geometry,Dt=He.material,wi=He.group;if(Dt.side===Ti&&Ge.layers.test(Z.layers)){let gr=Dt.side;Dt.side=Vt,Dt.needsUpdate=!0,p0(Ge,J,Z,Wt,Dt,wi),Dt.side=gr,Dt.needsUpdate=!0,Ue=!0}}Ue===!0&&(ce.updateMultisampleRenderTarget(me),ce.updateRenderTargetMipmap(me)),M.setRenderTarget(ye),M.setClearColor(V,Q),M.toneMapping=Le}function yo(A,H,J){let Z=H.isScene===!0?H.overrideMaterial:null;for(let Y=0,ye=A.length;Y<ye;Y++){let Le=A[Y],Ue=Le.object,Oe=Le.geometry,Ke=Z===null?Le.material:Z,He=Le.group;Ue.layers.test(J.layers)&&p0(Ue,H,J,Oe,Ke,He)}}function p0(A,H,J,Z,Y,ye){A.onBeforeRender(M,H,J,Z,Y,ye),A.modelViewMatrix.multiplyMatrices(J.matrixWorldInverse,A.matrixWorld),A.normalMatrix.getNormalMatrix(A.modelViewMatrix),Y.onBeforeRender(M,H,J,Z,A,ye),Y.transparent===!0&&Y.side===Ti&&Y.forceSinglePass===!1?(Y.side=Vt,Y.needsUpdate=!0,M.renderBufferDirect(J,H,Z,Y,A,ye),Y.side=tr,Y.needsUpdate=!0,M.renderBufferDirect(J,H,Z,Y,A,ye),Y.side=Ti):M.renderBufferDirect(J,H,Z,Y,A,ye),A.onAfterRender(M,H,J,Z,Y,ye)}function Mo(A,H,J){H.isScene!==!0&&(H=ne);let Z=se.get(A),Y=_.state.lights,ye=_.state.shadowsArray,Le=Y.state.version,Ue=ue.getParameters(A,Y.state,ye,H,J),Oe=ue.getProgramCacheKey(Ue),Ke=Z.programs;Z.environment=A.isMeshStandardMaterial?H.environment:null,Z.fog=H.fog,Z.envMap=(A.isMeshStandardMaterial?y:w).get(A.envMap||Z.environment),Ke===void 0&&(A.addEventListener("dispose",ve),Ke=new Map,Z.programs=Ke);let He=Ke.get(Oe);if(He!==void 0){if(Z.currentProgram===He&&Z.lightsStateVersion===Le)return f0(A,Ue),He}else Ue.uniforms=ue.getUniforms(A),A.onBuild(J,Ue,M),A.onBeforeCompile(Ue,M),He=ue.acquireProgram(Ue,Oe),Ke.set(Oe,He),Z.uniforms=Ue.uniforms;let Ge=Z.uniforms;return(!A.isShaderMaterial&&!A.isRawShaderMaterial||A.clipping===!0)&&(Ge.clippingPlanes=Te.uniform),f0(A,Ue),Z.needsLights=$v(A),Z.lightsStateVersion=Le,Z.needsLights&&(Ge.ambientLightColor.value=Y.state.ambient,Ge.lightProbe.value=Y.state.probe,Ge.directionalLights.value=Y.state.directional,Ge.directionalLightShadows.value=Y.state.directionalShadow,Ge.spotLights.value=Y.state.spot,Ge.spotLightShadows.value=Y.state.spotShadow,Ge.rectAreaLights.value=Y.state.rectArea,Ge.ltc_1.value=Y.state.rectAreaLTC1,Ge.ltc_2.value=Y.state.rectAreaLTC2,Ge.pointLights.value=Y.state.point,Ge.pointLightShadows.value=Y.state.pointShadow,Ge.hemisphereLights.value=Y.state.hemi,Ge.directionalShadowMap.value=Y.state.directionalShadowMap,Ge.directionalShadowMatrix.value=Y.state.directionalShadowMatrix,Ge.spotShadowMap.value=Y.state.spotShadowMap,Ge.spotLightMatrix.value=Y.state.spotLightMatrix,Ge.spotLightMap.value=Y.state.spotLightMap,Ge.pointShadowMap.value=Y.state.pointShadowMap,Ge.pointShadowMatrix.value=Y.state.pointShadowMatrix),Z.currentProgram=He,Z.uniformsList=null,He}function m0(A){if(A.uniformsList===null){let H=A.currentProgram.getUniforms();A.uniformsList=zn.seqWithValue(H.seq,A.uniforms)}return A.uniformsList}function f0(A,H){let J=se.get(A);J.outputColorSpace=H.outputColorSpace,J.batching=H.batching,J.instancing=H.instancing,J.instancingColor=H.instancingColor,J.skinning=H.skinning,J.morphTargets=H.morphTargets,J.morphNormals=H.morphNormals,J.morphColors=H.morphColors,J.morphTargetsCount=H.morphTargetsCount,J.numClippingPlanes=H.numClippingPlanes,J.numIntersection=H.numClipIntersection,J.vertexAlphas=H.vertexAlphas,J.vertexTangents=H.vertexTangents,J.toneMapping=H.toneMapping}function Zv(A,H,J,Z,Y){H.isScene!==!0&&(H=ne),ce.resetTextureUnits();let ye=H.fog,Le=Z.isMeshStandardMaterial?H.environment:null,Ue=R===null?M.outputColorSpace:R.isXRRenderTarget===!0?R.texture.colorSpace:ki,Oe=(Z.isMeshStandardMaterial?y:w).get(Z.envMap||Le),Ke=Z.vertexColors===!0&&!!J.attributes.color&&J.attributes.color.itemSize===4,He=!!J.attributes.tangent&&(!!Z.normalMap||Z.anisotropy>0),Ge=!!J.morphAttributes.position,Wt=!!J.morphAttributes.normal,Dt=!!J.morphAttributes.color,wi=rr;Z.toneMapped&&(R===null||R.isXRRenderTarget===!0)&&(wi=M.toneMapping);let gr=J.morphAttributes.position||J.morphAttributes.normal||J.morphAttributes.color,bt=gr!==void 0?gr.length:0,We=se.get(Z),oc=_.state.lights;if(W===!0&&(he===!0||A!==B)){let Ei=A===B&&Z.id===L;Te.setState(Z,A,Ei)}let lc=!1;Z.version===We.__version?(We.needsLights&&We.lightsStateVersion!==oc.state.version||We.outputColorSpace!==Ue||Y.isBatchedMesh&&We.batching===!1||!Y.isBatchedMesh&&We.batching===!0||Y.isInstancedMesh&&We.instancing===!1||!Y.isInstancedMesh&&We.instancing===!0||Y.isSkinnedMesh&&We.skinning===!1||!Y.isSkinnedMesh&&We.skinning===!0||Y.isInstancedMesh&&We.instancingColor===!0&&Y.instanceColor===null||Y.isInstancedMesh&&We.instancingColor===!1&&Y.instanceColor!==null||We.envMap!==Oe||Z.fog===!0&&We.fog!==ye||We.numClippingPlanes!==void 0&&(We.numClippingPlanes!==Te.numPlanes||We.numIntersection!==Te.numIntersection)||We.vertexAlphas!==Ke||We.vertexTangents!==He||We.morphTargets!==Ge||We.morphNormals!==Wt||We.morphColors!==Dt||We.toneMapping!==wi||ie.isWebGL2===!0&&We.morphTargetsCount!==bt)&&(lc=!0):(lc=!0,We.__version=Z.version);let ga=We.currentProgram;lc===!0&&(ga=Mo(Z,H,Y));let g0=!1,Zn=!1,hc=!1,Xt=ga.getUniforms(),_a=We.uniforms;if(ee.useProgram(ga.program)&&(g0=!0,Zn=!0,hc=!0),Z.id!==L&&(L=Z.id,Zn=!0),g0||B!==A){Xt.setValue(T,"projectionMatrix",A.projectionMatrix),Xt.setValue(T,"viewMatrix",A.matrixWorldInverse);let Ei=Xt.map.cameraPosition;Ei!==void 0&&Ei.setValue(T,pe.setFromMatrixPosition(A.matrixWorld)),ie.logarithmicDepthBuffer&&Xt.setValue(T,"logDepthBufFC",2/(Math.log(A.far+1)/Math.LN2)),(Z.isMeshPhongMaterial||Z.isMeshToonMaterial||Z.isMeshLambertMaterial||Z.isMeshBasicMaterial||Z.isMeshStandardMaterial||Z.isShaderMaterial)&&Xt.setValue(T,"isOrthographic",A.isOrthographicCamera===!0),B!==A&&(B=A,Zn=!0,hc=!0)}if(Y.isSkinnedMesh){Xt.setOptional(T,Y,"bindMatrix"),Xt.setOptional(T,Y,"bindMatrixInverse");let Ei=Y.skeleton;Ei&&(ie.floatVertexTextures?(Ei.boneTexture===null&&Ei.computeBoneTexture(),Xt.setValue(T,"boneTexture",Ei.boneTexture,ce)):console.warn("THREE.WebGLRenderer: SkinnedMesh can only be used with WebGL 2. With WebGL 1 OES_texture_float and vertex textures support is required."))}Y.isBatchedMesh&&(Xt.setOptional(T,Y,"batchingTexture"),Xt.setValue(T,"batchingTexture",Y._matricesTexture,ce));let cc=J.morphAttributes;if((cc.position!==void 0||cc.normal!==void 0||cc.color!==void 0&&ie.isWebGL2===!0)&&Tt.update(Y,J,ga),(Zn||We.receiveShadow!==Y.receiveShadow)&&(We.receiveShadow=Y.receiveShadow,Xt.setValue(T,"receiveShadow",Y.receiveShadow)),Z.isMeshGouraudMaterial&&Z.envMap!==null&&(_a.envMap.value=Oe,_a.flipEnvMap.value=Oe.isCubeTexture&&Oe.isRenderTargetTexture===!1?-1:1),Zn&&(Xt.setValue(T,"toneMappingExposure",M.toneMappingExposure),We.needsLights&&Qv(_a,hc),ye&&Z.fog===!0&&Re.refreshFogUniforms(_a,ye),Re.refreshMaterialUniforms(_a,Z,C,z,me),zn.upload(T,m0(We),_a,ce)),Z.isShaderMaterial&&Z.uniformsNeedUpdate===!0&&(zn.upload(T,m0(We),_a,ce),Z.uniformsNeedUpdate=!1),Z.isSpriteMaterial&&Xt.setValue(T,"center",Y.center),Xt.setValue(T,"modelViewMatrix",Y.modelViewMatrix),Xt.setValue(T,"normalMatrix",Y.normalMatrix),Xt.setValue(T,"modelMatrix",Y.matrixWorld),Z.isShaderMaterial||Z.isRawShaderMaterial){let Ei=Z.uniformsGroups;for(let uc=0,ex=Ei.length;uc<ex;uc++)if(ie.isWebGL2){let _0=Ei[uc];qe.update(_0,ga),qe.bind(_0,ga)}else console.warn("THREE.WebGLRenderer: Uniform Buffer Objects can only be used with WebGL 2.")}return ga}function Qv(A,H){A.ambientLightColor.needsUpdate=H,A.lightProbe.needsUpdate=H,A.directionalLights.needsUpdate=H,A.directionalLightShadows.needsUpdate=H,A.pointLights.needsUpdate=H,A.pointLightShadows.needsUpdate=H,A.spotLights.needsUpdate=H,A.spotLightShadows.needsUpdate=H,A.rectAreaLights.needsUpdate=H,A.hemisphereLights.needsUpdate=H}function $v(A){return A.isMeshLambertMaterial||A.isMeshToonMaterial||A.isMeshPhongMaterial||A.isMeshStandardMaterial||A.isShadowMaterial||A.isShaderMaterial&&A.lights===!0}this.getActiveCubeFace=function(){return S},this.getActiveMipmapLevel=function(){return D},this.getRenderTarget=function(){return R},this.setRenderTargetTextures=function(A,H,J){se.get(A.texture).__webglTexture=H,se.get(A.depthTexture).__webglTexture=J;let Z=se.get(A);Z.__hasExternalTextures=!0,Z.__hasExternalTextures&&(Z.__autoAllocateDepthBuffer=J===void 0,Z.__autoAllocateDepthBuffer||te.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),Z.__useRenderToTexture=!1))},this.setRenderTargetFramebuffer=function(A,H){let J=se.get(A);J.__webglFramebuffer=H,J.__useDefaultFramebuffer=H===void 0},this.setRenderTarget=function(A,H=0,J=0){R=A,S=H,D=J;let Z=!0,Y=null,ye=!1,Le=!1;if(A){let Ue=se.get(A);Ue.__useDefaultFramebuffer!==void 0?(ee.bindFramebuffer(T.FRAMEBUFFER,null),Z=!1):Ue.__webglFramebuffer===void 0?ce.setupRenderTarget(A):Ue.__hasExternalTextures&&ce.rebindTextures(A,se.get(A.texture).__webglTexture,se.get(A.depthTexture).__webglTexture);let Oe=A.texture;(Oe.isData3DTexture||Oe.isDataArrayTexture||Oe.isCompressedArrayTexture)&&(Le=!0);let Ke=se.get(A).__webglFramebuffer;A.isWebGLCubeRenderTarget?(Array.isArray(Ke[H])?Y=Ke[H][J]:Y=Ke[H],ye=!0):ie.isWebGL2&&A.samples>0&&ce.useMultisampledRTT(A)===!1?Y=se.get(A).__webglMultisampledFramebuffer:Array.isArray(Ke)?Y=Ke[J]:Y=Ke,b.copy(A.viewport),E.copy(A.scissor),F=A.scissorTest}else b.copy(U).multiplyScalar(C).floor(),E.copy(K).multiplyScalar(C).floor(),F=j;if(ee.bindFramebuffer(T.FRAMEBUFFER,Y)&&ie.drawBuffers&&Z&&ee.drawBuffers(A,Y),ee.viewport(b),ee.scissor(E),ee.setScissorTest(F),ye){let Ue=se.get(A.texture);T.framebufferTexture2D(T.FRAMEBUFFER,T.COLOR_ATTACHMENT0,T.TEXTURE_CUBE_MAP_POSITIVE_X+H,Ue.__webglTexture,J)}else if(Le){let Ue=se.get(A.texture),Oe=H||0;T.framebufferTextureLayer(T.FRAMEBUFFER,T.COLOR_ATTACHMENT0,Ue.__webglTexture,J||0,Oe)}L=-1},this.readRenderTargetPixels=function(A,H,J,Z,Y,ye,Le){if(!(A&&A.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ue=se.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&Le!==void 0&&(Ue=Ue[Le]),Ue){ee.bindFramebuffer(T.FRAMEBUFFER,Ue);try{let Oe=A.texture,Ke=Oe.format,He=Oe.type;if(Ke!==si&&Ae.convert(Ke)!==T.getParameter(T.IMPLEMENTATION_COLOR_READ_FORMAT)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}let Ge=He===Ta&&(te.has("EXT_color_buffer_half_float")||ie.isWebGL2&&te.has("EXT_color_buffer_float"));if(He!==ar&&Ae.convert(He)!==T.getParameter(T.IMPLEMENTATION_COLOR_READ_TYPE)&&!(He===zi&&(ie.isWebGL2||te.has("OES_texture_float")||te.has("WEBGL_color_buffer_float")))&&!Ge){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}H>=0&&H<=A.width-Z&&J>=0&&J<=A.height-Y&&T.readPixels(H,J,Z,Y,Ae.convert(Ke),Ae.convert(He),ye)}finally{let Oe=R!==null?se.get(R).__webglFramebuffer:null;ee.bindFramebuffer(T.FRAMEBUFFER,Oe)}}},this.copyFramebufferToTexture=function(A,H,J=0){let Z=Math.pow(2,-J),Y=Math.floor(H.image.width*Z),ye=Math.floor(H.image.height*Z);ce.setTexture2D(H,0),T.copyTexSubImage2D(T.TEXTURE_2D,J,0,0,A.x,A.y,Y,ye),ee.unbindTexture()},this.copyTextureToTexture=function(A,H,J,Z=0){let Y=H.image.width,ye=H.image.height,Le=Ae.convert(J.format),Ue=Ae.convert(J.type);ce.setTexture2D(J,0),T.pixelStorei(T.UNPACK_FLIP_Y_WEBGL,J.flipY),T.pixelStorei(T.UNPACK_PREMULTIPLY_ALPHA_WEBGL,J.premultiplyAlpha),T.pixelStorei(T.UNPACK_ALIGNMENT,J.unpackAlignment),H.isDataTexture?T.texSubImage2D(T.TEXTURE_2D,Z,A.x,A.y,Y,ye,Le,Ue,H.image.data):H.isCompressedTexture?T.compressedTexSubImage2D(T.TEXTURE_2D,Z,A.x,A.y,H.mipmaps[0].width,H.mipmaps[0].height,Le,H.mipmaps[0].data):T.texSubImage2D(T.TEXTURE_2D,Z,A.x,A.y,Le,Ue,H.image),Z===0&&J.generateMipmaps&&T.generateMipmap(T.TEXTURE_2D),ee.unbindTexture()},this.copyTextureToTexture3D=function(A,H,J,Z,Y=0){if(M.isWebGL1Renderer){console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: can only be used with WebGL2.");return}let ye=A.max.x-A.min.x+1,Le=A.max.y-A.min.y+1,Ue=A.max.z-A.min.z+1,Oe=Ae.convert(Z.format),Ke=Ae.convert(Z.type),He;if(Z.isData3DTexture)ce.setTexture3D(Z,0),He=T.TEXTURE_3D;else if(Z.isDataArrayTexture||Z.isCompressedArrayTexture)ce.setTexture2DArray(Z,0),He=T.TEXTURE_2D_ARRAY;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}T.pixelStorei(T.UNPACK_FLIP_Y_WEBGL,Z.flipY),T.pixelStorei(T.UNPACK_PREMULTIPLY_ALPHA_WEBGL,Z.premultiplyAlpha),T.pixelStorei(T.UNPACK_ALIGNMENT,Z.unpackAlignment);let Ge=T.getParameter(T.UNPACK_ROW_LENGTH),Wt=T.getParameter(T.UNPACK_IMAGE_HEIGHT),Dt=T.getParameter(T.UNPACK_SKIP_PIXELS),wi=T.getParameter(T.UNPACK_SKIP_ROWS),gr=T.getParameter(T.UNPACK_SKIP_IMAGES),bt=J.isCompressedTexture?J.mipmaps[Y]:J.image;T.pixelStorei(T.UNPACK_ROW_LENGTH,bt.width),T.pixelStorei(T.UNPACK_IMAGE_HEIGHT,bt.height),T.pixelStorei(T.UNPACK_SKIP_PIXELS,A.min.x),T.pixelStorei(T.UNPACK_SKIP_ROWS,A.min.y),T.pixelStorei(T.UNPACK_SKIP_IMAGES,A.min.z),J.isDataTexture||J.isData3DTexture?T.texSubImage3D(He,Y,H.x,H.y,H.z,ye,Le,Ue,Oe,Ke,bt.data):J.isCompressedArrayTexture?(console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: untested support for compressed srcTexture."),T.compressedTexSubImage3D(He,Y,H.x,H.y,H.z,ye,Le,Ue,Oe,bt.data)):T.texSubImage3D(He,Y,H.x,H.y,H.z,ye,Le,Ue,Oe,Ke,bt),T.pixelStorei(T.UNPACK_ROW_LENGTH,Ge),T.pixelStorei(T.UNPACK_IMAGE_HEIGHT,Wt),T.pixelStorei(T.UNPACK_SKIP_PIXELS,Dt),T.pixelStorei(T.UNPACK_SKIP_ROWS,wi),T.pixelStorei(T.UNPACK_SKIP_IMAGES,gr),Y===0&&Z.generateMipmaps&&T.generateMipmap(He),ee.unbindTexture()},this.initTexture=function(A){A.isCubeTexture?ce.setTextureCube(A,0):A.isData3DTexture?ce.setTexture3D(A,0):A.isDataArrayTexture||A.isCompressedArrayTexture?ce.setTexture2DArray(A,0):ce.setTexture2D(A,0),ee.unbindTexture()},this.resetState=function(){S=0,D=0,R=null,ee.reset(),Ce.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Bi}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=e===Ms?"display-p3":"srgb",t.unpackColorSpace=it.workingColorSpace===dn?"display-p3":"srgb"}get outputEncoding(){return console.warn("THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead."),this.outputColorSpace===vt?Mr:Cl}set outputEncoding(e){console.warn("THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead."),this.outputColorSpace=e===Mr?vt:ki}get useLegacyLights(){return console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights}set useLegacyLights(e){console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights=e}},tf=class extends Eh{},tf.prototype.isWebGL1Renderer=!0,Th=class extends Yt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t}},Ah=new v,Rh=new gt,Ch=new gt,rf=new v,Lh=new tt,kn=new v,Xs=new Da,Ph=new tt,js=new Gl,af=class extends De{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=Xo,this.bindMatrix=new tt,this.bindMatrixInverse=new tt,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){let e=this.geometry;this.boundingBox===null&&(this.boundingBox=new Hr),this.boundingBox.makeEmpty();let t=e.getAttribute("position");for(let i=0;i<t.count;i++)this.getVertexPosition(i,kn),this.boundingBox.expandByPoint(kn)}computeBoundingSphere(){let e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new Da),this.boundingSphere.makeEmpty();let t=e.getAttribute("position");for(let i=0;i<t.count;i++)this.getVertexPosition(i,kn),this.boundingSphere.expandByPoint(kn)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}raycast(e,t){let i=this.material,r=this.matrixWorld;i!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Xs.copy(this.boundingSphere),Xs.applyMatrix4(r),e.ray.intersectsSphere(Xs)!==!1&&(Ph.copy(r).invert(),js.copy(e.ray).applyMatrix4(Ph),!(this.boundingBox!==null&&js.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(e,t,js)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){let e=new gt,t=this.geometry.attributes.skinWeight;for(let i=0,r=t.count;i<r;i++){e.fromBufferAttribute(t,i);let a=1/e.manhattanLength();a!==1/0?e.multiplyScalar(a):e.set(1,0,0,0),t.setXYZW(i,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===Xo?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===fu?this.bindMatrixInverse.copy(this.bindMatrix).invert():console.warn("THREE.SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(e,t){let i=this.skeleton,r=this.geometry;Rh.fromBufferAttribute(r.attributes.skinIndex,e),Ch.fromBufferAttribute(r.attributes.skinWeight,e),Ah.copy(t).applyMatrix4(this.bindMatrix),t.set(0,0,0);for(let a=0;a<4;a++){let n=Ch.getComponent(a);if(n!==0){let o=Rh.getComponent(a);Lh.multiplyMatrices(i.bones[o].matrixWorld,i.boneInverses[o]),t.addScaledVector(rf.copy(Ah).applyMatrix4(Lh),n)}}return t.applyMatrix4(this.bindMatrixInverse)}boneTransform(e,t){return console.warn("THREE.SkinnedMesh: .boneTransform() was renamed to .applyBoneTransform() in r151."),this.applyBoneTransform(e,t)}},Dh=class extends Yt{constructor(){super(),this.isBone=!0,this.type="Bone"}},nf=class extends pi{constructor(e=null,t=1,i=1,r,a,n,o,s,l=Nt,h=Nt,c,u){super(null,n,o,s,l,h,r,a,c,u),this.isDataTexture=!0,this.image={data:e,width:t,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},Uh=new tt,sf=new tt,of=class T0{constructor(t=[],i=[]){this.uuid=_r(),this.bones=t.slice(0),this.boneInverses=i,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){let t=this.bones,i=this.boneInverses;if(this.boneMatrices=new Float32Array(t.length*16),i.length===0)this.calculateInverses();else if(t.length!==i.length){console.warn("THREE.Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let r=0,a=this.bones.length;r<a;r++)this.boneInverses.push(new tt)}}calculateInverses(){this.boneInverses.length=0;for(let t=0,i=this.bones.length;t<i;t++){let r=new tt;this.bones[t]&&r.copy(this.bones[t].matrixWorld).invert(),this.boneInverses.push(r)}}pose(){for(let t=0,i=this.bones.length;t<i;t++){let r=this.bones[t];r&&r.matrixWorld.copy(this.boneInverses[t]).invert()}for(let t=0,i=this.bones.length;t<i;t++){let r=this.bones[t];r&&(r.parent&&r.parent.isBone?(r.matrix.copy(r.parent.matrixWorld).invert(),r.matrix.multiply(r.matrixWorld)):r.matrix.copy(r.matrixWorld),r.matrix.decompose(r.position,r.quaternion,r.scale))}}update(){let t=this.bones,i=this.boneInverses,r=this.boneMatrices,a=this.boneTexture;for(let n=0,o=t.length;n<o;n++){let s=t[n]?t[n].matrixWorld:sf;Uh.multiplyMatrices(s,i[n]),Uh.toArray(r,n*16)}a!==null&&(a.needsUpdate=!0)}clone(){return new T0(this.bones,this.boneInverses)}computeBoneTexture(){let t=Math.sqrt(this.bones.length*4);t=Math.ceil(t/4)*4,t=Math.max(t,4);let i=new Float32Array(t*t*4);i.set(this.boneMatrices);let r=new nf(i,t,t,si,zi);return r.needsUpdate=!0,this.boneMatrices=i,this.boneTexture=r,this}getBoneByName(t){for(let i=0,r=this.bones.length;i<r;i++){let a=this.bones[i];if(a.name===t)return a}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(t,i){this.uuid=t.uuid;for(let r=0,a=t.bones.length;r<a;r++){let n=t.bones[r],o=i[n];o===void 0&&(console.warn("THREE.Skeleton: No bone found with UUID:",n),o=new Dh),this.bones.push(o),this.boneInverses.push(new tt().fromArray(t.boneInverses[r]))}return this.init(),this}toJSON(){let t={metadata:{version:4.6,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};t.uuid=this.uuid;let i=this.bones,r=this.boneInverses;for(let a=0,n=i.length;a<n;a++){let o=i[a];t.bones.push(o.uuid);let s=r[a];t.boneInverses.push(s.toArray())}return t}},Nh=class extends pi{constructor(e,t,i,r,a,n,o,s,l){super(e,t,i,r,a,n,o,s,l),this.isCanvasTexture=!0,this.needsUpdate=!0}},Ci=class{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(e,t){let i=this.getUtoTmapping(e);return this.getPoint(i,t)}getPoints(e=5){let t=[];for(let i=0;i<=e;i++)t.push(this.getPoint(i/e));return t}getSpacedPoints(e=5){let t=[];for(let i=0;i<=e;i++)t.push(this.getPointAt(i/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],i,r=this.getPoint(0),a=0;t.push(0);for(let n=1;n<=e;n++)i=this.getPoint(n/e),a+=i.distanceTo(r),t.push(a),r=i;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t){let i=this.getLengths(),r=0,a=i.length,n;t?n=t:n=e*i[a-1];let o=0,s=a-1,l;for(;o<=s;)if(r=Math.floor(o+(s-o)/2),l=i[r]-n,l<0)o=r+1;else if(l>0)s=r-1;else{s=r;break}if(r=s,i[r]===n)return r/(a-1);let h=i[r],c=i[r+1]-h,u=(n-h)/c;return(r+u)/(a-1)}getTangent(e,t){let i=e-1e-4,r=e+1e-4;i<0&&(i=0),r>1&&(r=1);let a=this.getPoint(i),n=this.getPoint(r),o=t||(a.isVector2?new xe:new v);return o.copy(n).sub(a).normalize(),o}getTangentAt(e,t){let i=this.getUtoTmapping(e);return this.getTangent(i,t)}computeFrenetFrames(e,t){let i=new v,r=[],a=[],n=[],o=new v,s=new tt;for(let p=0;p<=e;p++){let m=p/e;r[p]=this.getTangentAt(m,new v)}a[0]=new v,n[0]=new v;let l=Number.MAX_VALUE,h=Math.abs(r[0].x),c=Math.abs(r[0].y),u=Math.abs(r[0].z);h<=l&&(l=h,i.set(1,0,0)),c<=l&&(l=c,i.set(0,1,0)),u<=l&&i.set(0,0,1),o.crossVectors(r[0],i).normalize(),a[0].crossVectors(r[0],o),n[0].crossVectors(r[0],a[0]);for(let p=1;p<=e;p++){if(a[p]=a[p-1].clone(),n[p]=n[p-1].clone(),o.crossVectors(r[p-1],r[p]),o.length()>Number.EPSILON){o.normalize();let m=Math.acos(Ut(r[p-1].dot(r[p]),-1,1));a[p].applyMatrix4(s.makeRotationAxis(o,m))}n[p].crossVectors(r[p],a[p])}if(t===!0){let p=Math.acos(Ut(a[0].dot(a[e]),-1,1));p/=e,r[0].dot(o.crossVectors(a[0],a[e]))>0&&(p=-p);for(let m=1;m<=e;m++)a[m].applyMatrix4(s.makeRotationAxis(r[m],p*m)),n[m].crossVectors(r[m],a[m])}return{tangents:r,normals:a,binormals:n}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.6,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},qs=class extends Ci{constructor(e=0,t=0,i=1,r=1,a=0,n=Math.PI*2,o=!1,s=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=i,this.yRadius=r,this.aStartAngle=a,this.aEndAngle=n,this.aClockwise=o,this.aRotation=s}getPoint(e,t){let i=t||new xe,r=Math.PI*2,a=this.aEndAngle-this.aStartAngle,n=Math.abs(a)<Number.EPSILON;for(;a<0;)a+=r;for(;a>r;)a-=r;a<Number.EPSILON&&(n?a=0:a=r),this.aClockwise===!0&&!n&&(a===r?a=-r:a=a-r);let o=this.aStartAngle+e*a,s=this.aX+this.xRadius*Math.cos(o),l=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let h=Math.cos(this.aRotation),c=Math.sin(this.aRotation),u=s-this.aX,p=l-this.aY;s=u*h-p*c+this.aX,l=u*c+p*h+this.aY}return i.set(s,l)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},lf=class extends qs{constructor(e,t,i,r,a,n){super(e,t,i,i,r,a,n),this.isArcCurve=!0,this.type="ArcCurve"}},Bn=new v,Ys=new Do,Ks=new Do,Js=new Do,Ih=class extends Ci{constructor(e=[],t=!1,i="centripetal",r=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=i,this.tension=r}getPoint(e,t=new v){let i=t,r=this.points,a=r.length,n=(a-(this.closed?0:1))*e,o=Math.floor(n),s=n-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/a)+1)*a:s===0&&o===a-1&&(o=a-2,s=1);let l,h;this.closed||o>0?l=r[(o-1)%a]:(Bn.subVectors(r[0],r[1]).add(r[0]),l=Bn);let c=r[o%a],u=r[(o+1)%a];if(this.closed||o+2<a?h=r[(o+2)%a]:(Bn.subVectors(r[a-1],r[a-2]).add(r[a-1]),h=Bn),this.curveType==="centripetal"||this.curveType==="chordal"){let p=this.curveType==="chordal"?.5:.25,m=Math.pow(l.distanceToSquared(c),p),g=Math.pow(c.distanceToSquared(u),p),_=Math.pow(u.distanceToSquared(h),p);g<1e-4&&(g=1),m<1e-4&&(m=g),_<1e-4&&(_=g),Ys.initNonuniformCatmullRom(l.x,c.x,u.x,h.x,m,g,_),Ks.initNonuniformCatmullRom(l.y,c.y,u.y,h.y,m,g,_),Js.initNonuniformCatmullRom(l.z,c.z,u.z,h.z,m,g,_)}else this.curveType==="catmullrom"&&(Ys.initCatmullRom(l.x,c.x,u.x,h.x,this.tension),Ks.initCatmullRom(l.y,c.y,u.y,h.y,this.tension),Js.initCatmullRom(l.z,c.z,u.z,h.z,this.tension));return i.set(Ys.calc(s),Ks.calc(s),Js.calc(s)),i}copy(e){super.copy(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){let r=e.points[t];this.points.push(r.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,i=this.points.length;t<i;t++){let r=this.points[t];e.points.push(r.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){let r=e.points[t];this.points.push(new v().fromArray(r))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}},Oh=class extends Ci{constructor(e=new xe,t=new xe,i=new xe,r=new xe){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=i,this.v3=r}getPoint(e,t=new xe){let i=t,r=this.v0,a=this.v1,n=this.v2,o=this.v3;return i.set(an(e,r.x,a.x,n.x,o.x),an(e,r.y,a.y,n.y,o.y)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},hf=class extends Ci{constructor(e=new v,t=new v,i=new v,r=new v){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=i,this.v3=r}getPoint(e,t=new v){let i=t,r=this.v0,a=this.v1,n=this.v2,o=this.v3;return i.set(an(e,r.x,a.x,n.x,o.x),an(e,r.y,a.y,n.y,o.y),an(e,r.z,a.z,n.z,o.z)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Fh=class extends Ci{constructor(e=new xe,t=new xe){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new xe){let i=t;return e===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(e).add(this.v1)),i}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new xe){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},cf=class extends Ci{constructor(e=new v,t=new v){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new v){let i=t;return e===1?i.copy(this.v2):(i.copy(this.v2).sub(this.v1),i.multiplyScalar(e).add(this.v1)),i}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new v){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},zh=class extends Ci{constructor(e=new xe,t=new xe,i=new xe){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=i}getPoint(e,t=new xe){let i=t,r=this.v0,a=this.v1,n=this.v2;return i.set(rn(e,r.x,a.x,n.x),rn(e,r.y,a.y,n.y)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},kh=class extends Ci{constructor(e=new v,t=new v,i=new v){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=i}getPoint(e,t=new v){let i=t,r=this.v0,a=this.v1,n=this.v2;return i.set(rn(e,r.x,a.x,n.x),rn(e,r.y,a.y,n.y),rn(e,r.z,a.z,n.z)),i}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Bh=class extends Ci{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new xe){let i=t,r=this.points,a=(r.length-1)*e,n=Math.floor(a),o=a-n,s=r[n===0?n:n-1],l=r[n],h=r[n>r.length-2?r.length-1:n+1],c=r[n>r.length-3?r.length-1:n+2];return i.set(Lc(o,s.x,l.x,h.x,c.x),Lc(o,s.y,l.y,h.y,c.y)),i}copy(e){super.copy(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){let r=e.points[t];this.points.push(r.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,i=this.points.length;t<i;t++){let r=this.points[t];e.points.push(r.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){let r=e.points[t];this.points.push(new xe().fromArray(r))}return this}},Vn=Object.freeze({__proto__:null,ArcCurve:lf,CatmullRomCurve3:Ih,CubicBezierCurve:Oh,CubicBezierCurve3:hf,EllipseCurve:qs,LineCurve:Fh,LineCurve3:cf,QuadraticBezierCurve:zh,QuadraticBezierCurve3:kh,SplineCurve:Bh}),uf=class extends Ci{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){let e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){let i=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Vn[i](t,e))}return this}getPoint(e,t){let i=e*this.getLength(),r=this.getCurveLengths(),a=0;for(;a<r.length;){if(r[a]>=i){let n=r[a]-i,o=this.curves[a],s=o.getLength(),l=s===0?0:1-n/s;return o.getPointAt(l,t)}a++}return null}getLength(){let e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let e=[],t=0;for(let i=0,r=this.curves.length;i<r;i++)t+=this.curves[i].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){let t=[];for(let i=0;i<=e;i++)t.push(this.getPoint(i/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){let t=[],i;for(let r=0,a=this.curves;r<a.length;r++){let n=a[r],o=n.isEllipseCurve?e*2:n.isLineCurve||n.isLineCurve3?1:n.isSplineCurve?e*n.points.length:e,s=n.getPoints(o);for(let l=0;l<s.length;l++){let h=s[l];i&&i.equals(h)||(t.push(h),i=h)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,i=e.curves.length;t<i;t++){let r=e.curves[t];this.curves.push(r.clone())}return this.autoClose=e.autoClose,this}toJSON(){let e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,i=this.curves.length;t<i;t++){let r=this.curves[t];e.curves.push(r.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,i=e.curves.length;t<i;t++){let r=e.curves[t];this.curves.push(new Vn[r.type]().fromJSON(r))}return this}},Vh=class extends uf{constructor(e){super(),this.type="Path",this.currentPoint=new xe,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,i=e.length;t<i;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){let i=new Fh(this.currentPoint.clone(),new xe(e,t));return this.curves.push(i),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,i,r){let a=new zh(this.currentPoint.clone(),new xe(e,t),new xe(i,r));return this.curves.push(a),this.currentPoint.set(i,r),this}bezierCurveTo(e,t,i,r,a,n){let o=new Oh(this.currentPoint.clone(),new xe(e,t),new xe(i,r),new xe(a,n));return this.curves.push(o),this.currentPoint.set(a,n),this}splineThru(e){let t=[this.currentPoint.clone()].concat(e),i=new Bh(t);return this.curves.push(i),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,i,r,a,n){let o=this.currentPoint.x,s=this.currentPoint.y;return this.absarc(e+o,t+s,i,r,a,n),this}absarc(e,t,i,r,a,n){return this.absellipse(e,t,i,i,r,a,n),this}ellipse(e,t,i,r,a,n,o,s){let l=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(e+l,t+h,i,r,a,n,o,s),this}absellipse(e,t,i,r,a,n,o,s){let l=new qs(e,t,i,r,a,n,o,s);if(this.curves.length>0){let c=l.getPoint(0);c.equals(this.currentPoint)||this.lineTo(c.x,c.y)}this.curves.push(l);let h=l.getPoint(1);return this.currentPoint.copy(h),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){let e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}},_i=class A0 extends St{constructor(t=1,i=1,r=1,a=32,n=1,o=!1,s=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:i,height:r,radialSegments:a,heightSegments:n,openEnded:o,thetaStart:s,thetaLength:l};let h=this;a=Math.floor(a),n=Math.floor(n);let c=[],u=[],p=[],m=[],g=0,_=[],f=r/2,d=0;M(),o===!1&&(t>0&&x(!0),i>0&&x(!1)),this.setIndex(c),this.setAttribute("position",new Je(u,3)),this.setAttribute("normal",new Je(p,3)),this.setAttribute("uv",new Je(m,2));function M(){let S=new v,D=new v,R=0,L=(i-t)/r;for(let B=0;B<=n;B++){let b=[],E=B/n,F=E*(i-t)+t;for(let V=0;V<=a;V++){let Q=V/a,P=Q*l+s,z=Math.sin(P),C=Math.cos(P);D.x=F*z,D.y=-E*r+f,D.z=F*C,u.push(D.x,D.y,D.z),S.set(z,L,C).normalize(),p.push(S.x,S.y,S.z),m.push(Q,1-E),b.push(g++)}_.push(b)}for(let B=0;B<a;B++)for(let b=0;b<n;b++){let E=_[b][B],F=_[b+1][B],V=_[b+1][B+1],Q=_[b][B+1];c.push(E,F,Q),c.push(F,V,Q),R+=6}h.addGroup(d,R,0),d+=R}function x(S){let D=g,R=new xe,L=new v,B=0,b=S===!0?t:i,E=S===!0?1:-1;for(let V=1;V<=a;V++)u.push(0,f*E,0),p.push(0,E,0),m.push(.5,.5),g++;let F=g;for(let V=0;V<=a;V++){let Q=V/a*l+s,P=Math.cos(Q),z=Math.sin(Q);L.x=b*z,L.y=f*E,L.z=b*P,u.push(L.x,L.y,L.z),p.push(0,E,0),R.x=P*.5+.5,R.y=z*.5*E+.5,m.push(R.x,R.y),g++}for(let V=0;V<a;V++){let Q=D+V,P=F+V;S===!0?c.push(P,P+1,Q):c.push(P+1,P,Q),B+=3}h.addGroup(d,B,S===!0?1:2),d+=B}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new A0(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},Hh=class extends Vh{constructor(e){super(e),this.uuid=_r(),this.type="Shape",this.holes=[]}getPointsHoles(e){let t=[];for(let i=0,r=this.holes.length;i<r;i++)t[i]=this.holes[i].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,i=e.holes.length;t<i;t++){let r=e.holes[t];this.holes.push(r.clone())}return this}toJSON(){let e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,i=this.holes.length;t<i;t++){let r=this.holes[t];e.holes.push(r.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,i=e.holes.length;t<i;t++){let r=e.holes[t];this.holes.push(new Vh().fromJSON(r))}return this}},df={triangulate:function(e,t,i=2){let r=t&&t.length,a=r?t[0]*i:e.length,n=Pc(e,0,a,i,!0),o=[];if(!n||n.next===n.prev)return o;let s,l,h,c,u,p,m;if(r&&(n=j_(e,t,n,i)),e.length>80*i){s=h=e[0],l=c=e[1];for(let g=i;g<a;g+=i)u=e[g],p=e[g+1],u<s&&(s=u),p<l&&(l=p),u>h&&(h=u),p>c&&(c=p);m=Math.max(h-s,c-l),m=m!==0?32767/m:0}return nn(n,o,i,s,l,m,0),o}},Zs=class R0{static area(t){let i=t.length,r=0;for(let a=i-1,n=0;n<i;a=n++)r+=t[a].x*t[n].y-t[n].x*t[a].y;return r*.5}static isClockWise(t){return R0.area(t)<0}static triangulateShape(t,i){let r=[],a=[],n=[];Ic(t),Oc(r,t);let o=t.length;i.forEach(Ic);for(let l=0;l<i.length;l++)a.push(o),o+=i[l].length,Oc(r,i[l]);let s=df.triangulate(r,a);for(let l=0;l<s.length;l+=3)n.push(s.slice(l,l+3));return n}},pf=class C0 extends St{constructor(t=new Hh([new xe(.5,.5),new xe(-.5,.5),new xe(-.5,-.5),new xe(.5,-.5)]),i={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:t,options:i},t=Array.isArray(t)?t:[t];let r=this,a=[],n=[];for(let s=0,l=t.length;s<l;s++){let h=t[s];o(h)}this.setAttribute("position",new Je(a,3)),this.setAttribute("uv",new Je(n,2)),this.computeVertexNormals();function o(s){let l=[],h=i.curveSegments!==void 0?i.curveSegments:12,c=i.steps!==void 0?i.steps:1,u=i.depth!==void 0?i.depth:1,p=i.bevelEnabled!==void 0?i.bevelEnabled:!0,m=i.bevelThickness!==void 0?i.bevelThickness:.2,g=i.bevelSize!==void 0?i.bevelSize:m-.1,_=i.bevelOffset!==void 0?i.bevelOffset:0,f=i.bevelSegments!==void 0?i.bevelSegments:3,d=i.extrudePath,M=i.UVGenerator!==void 0?i.UVGenerator:mf,x,S=!1,D,R,L,B;d&&(x=d.getSpacedPoints(c),S=!0,p=!1,D=d.computeFrenetFrames(c,!1),R=new v,L=new v,B=new v),p||(f=0,m=0,g=0,_=0);let b=s.extractPoints(h),E=b.shape,F=b.holes;if(!Zs.isClockWise(E)){E=E.reverse();for(let T=0,ae=F.length;T<ae;T++){let te=F[T];Zs.isClockWise(te)&&(F[T]=te.reverse())}}let V=Zs.triangulateShape(E,F),Q=E;for(let T=0,ae=F.length;T<ae;T++){let te=F[T];E=E.concat(te)}function P(T,ae,te){return ae||console.error("THREE.ExtrudeGeometry: vec does not exist"),T.clone().addScaledVector(ae,te)}let z=E.length,C=V.length;function G(T,ae,te){let ie,ee,X,se=T.x-ae.x,ce=T.y-ae.y,w=te.x-T.x,y=te.y-T.y,k=se*se+ce*ce,le=se*y-ce*w;if(Math.abs(le)>Number.EPSILON){let oe=Math.sqrt(k),ue=Math.sqrt(w*w+y*y),Re=ae.x-ce/oe,fe=ae.y+se/oe,Me=te.x-y/ue,Te=te.y+w/ue,Fe=((Me-Re)*y-(Te-fe)*w)/(se*y-ce*w);ie=Re+se*Fe-T.x,ee=fe+ce*Fe-T.y;let de=ie*ie+ee*ee;if(de<=2)return new xe(ie,ee);X=Math.sqrt(de/2)}else{let oe=!1;se>Number.EPSILON?w>Number.EPSILON&&(oe=!0):se<-Number.EPSILON?w<-Number.EPSILON&&(oe=!0):Math.sign(ce)===Math.sign(y)&&(oe=!0),oe?(ie=-ce,ee=se,X=Math.sqrt(k)):(ie=se,ee=ce,X=Math.sqrt(k/2))}return new xe(ie/X,ee/X)}let O=[];for(let T=0,ae=Q.length,te=ae-1,ie=T+1;T<ae;T++,te++,ie++)te===ae&&(te=0),ie===ae&&(ie=0),O[T]=G(Q[T],Q[te],Q[ie]);let U=[],K,j=O.concat();for(let T=0,ae=F.length;T<ae;T++){let te=F[T];K=[];for(let ie=0,ee=te.length,X=ee-1,se=ie+1;ie<ee;ie++,X++,se++)X===ee&&(X=0),se===ee&&(se=0),K[ie]=G(te[ie],te[X],te[se]);U.push(K),j=j.concat(K)}for(let T=0;T<f;T++){let ae=T/f,te=m*Math.cos(ae*Math.PI/2),ie=g*Math.sin(ae*Math.PI/2)+_;for(let ee=0,X=Q.length;ee<X;ee++){let se=P(Q[ee],O[ee],ie);q(se.x,se.y,-te)}for(let ee=0,X=F.length;ee<X;ee++){let se=F[ee];K=U[ee];for(let ce=0,w=se.length;ce<w;ce++){let y=P(se[ce],K[ce],ie);q(y.x,y.y,-te)}}}let I=g+_;for(let T=0;T<z;T++){let ae=p?P(E[T],j[T],I):E[T];S?(L.copy(D.normals[0]).multiplyScalar(ae.x),R.copy(D.binormals[0]).multiplyScalar(ae.y),B.copy(x[0]).add(L).add(R),q(B.x,B.y,B.z)):q(ae.x,ae.y,0)}for(let T=1;T<=c;T++)for(let ae=0;ae<z;ae++){let te=p?P(E[ae],j[ae],I):E[ae];S?(L.copy(D.normals[T]).multiplyScalar(te.x),R.copy(D.binormals[T]).multiplyScalar(te.y),B.copy(x[T]).add(L).add(R),q(B.x,B.y,B.z)):q(te.x,te.y,u/c*T)}for(let T=f-1;T>=0;T--){let ae=T/f,te=m*Math.cos(ae*Math.PI/2),ie=g*Math.sin(ae*Math.PI/2)+_;for(let ee=0,X=Q.length;ee<X;ee++){let se=P(Q[ee],O[ee],ie);q(se.x,se.y,u+te)}for(let ee=0,X=F.length;ee<X;ee++){let se=F[ee];K=U[ee];for(let ce=0,w=se.length;ce<w;ce++){let y=P(se[ce],K[ce],ie);S?q(y.x,y.y+x[c-1].y,x[c-1].x+te):q(y.x,y.y,u+te)}}}W(),he();function W(){let T=a.length/3;if(p){let ae=0,te=z*ae;for(let ie=0;ie<C;ie++){let ee=V[ie];$(ee[2]+te,ee[1]+te,ee[0]+te)}ae=c+f*2,te=z*ae;for(let ie=0;ie<C;ie++){let ee=V[ie];$(ee[0]+te,ee[1]+te,ee[2]+te)}}else{for(let ae=0;ae<C;ae++){let te=V[ae];$(te[2],te[1],te[0])}for(let ae=0;ae<C;ae++){let te=V[ae];$(te[0]+z*c,te[1]+z*c,te[2]+z*c)}}r.addGroup(T,a.length/3-T,0)}function he(){let T=a.length/3,ae=0;me(Q,ae),ae+=Q.length;for(let te=0,ie=F.length;te<ie;te++){let ee=F[te];me(ee,ae),ae+=ee.length}r.addGroup(T,a.length/3-T,1)}function me(T,ae){let te=T.length;for(;--te>=0;){let ie=te,ee=te-1;ee<0&&(ee=T.length-1);for(let X=0,se=c+f*2;X<se;X++){let ce=z*X,w=z*(X+1),y=ae+ie+ce,k=ae+ee+ce,le=ae+ee+w,oe=ae+ie+w;pe(y,k,le,oe)}}}function q(T,ae,te){l.push(T),l.push(ae),l.push(te)}function $(T,ae,te){ne(T),ne(ae),ne(te);let ie=a.length/3,ee=M.generateTopUV(r,a,ie-3,ie-2,ie-1);re(ee[0]),re(ee[1]),re(ee[2])}function pe(T,ae,te,ie){ne(T),ne(ae),ne(ie),ne(ae),ne(te),ne(ie);let ee=a.length/3,X=M.generateSideWallUV(r,a,ee-6,ee-3,ee-2,ee-1);re(X[0]),re(X[1]),re(X[3]),re(X[1]),re(X[2]),re(X[3])}function ne(T){a.push(l[T*3+0]),a.push(l[T*3+1]),a.push(l[T*3+2])}function re(T){n.push(T.x),n.push(T.y)}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON(),i=this.parameters.shapes,r=this.parameters.options;return av(i,r,t)}static fromJSON(t,i){let r=[];for(let n=0,o=t.shapes.length;n<o;n++){let s=i[t.shapes[n]];r.push(s)}let a=t.options.extrudePath;return a!==void 0&&(t.options.extrudePath=new Vn[a.type]().fromJSON(a)),new C0(r,t.options)}},mf={generateTopUV:function(e,t,i,r,a){let n=t[i*3],o=t[i*3+1],s=t[r*3],l=t[r*3+1],h=t[a*3],c=t[a*3+1];return[new xe(n,o),new xe(s,l),new xe(h,c)]},generateSideWallUV:function(e,t,i,r,a,n){let o=t[i*3],s=t[i*3+1],l=t[i*3+2],h=t[r*3],c=t[r*3+1],u=t[r*3+2],p=t[a*3],m=t[a*3+1],g=t[a*3+2],_=t[n*3],f=t[n*3+1],d=t[n*3+2];return Math.abs(s-c)<Math.abs(o-h)?[new xe(o,1-l),new xe(h,1-u),new xe(p,1-g),new xe(_,1-d)]:[new xe(s,1-l),new xe(c,1-u),new xe(m,1-g),new xe(f,1-d)]}},ff=class L0 extends St{constructor(t=.5,i=1,r=32,a=1,n=0,o=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:t,outerRadius:i,thetaSegments:r,phiSegments:a,thetaStart:n,thetaLength:o},r=Math.max(3,r),a=Math.max(1,a);let s=[],l=[],h=[],c=[],u=t,p=(i-t)/a,m=new v,g=new xe;for(let _=0;_<=a;_++){for(let f=0;f<=r;f++){let d=n+f/r*o;m.x=u*Math.cos(d),m.y=u*Math.sin(d),l.push(m.x,m.y,m.z),h.push(0,0,1),g.x=(m.x/i+1)/2,g.y=(m.y/i+1)/2,c.push(g.x,g.y)}u+=p}for(let _=0;_<a;_++){let f=_*(r+1);for(let d=0;d<r;d++){let M=d+f,x=M,S=M+r+1,D=M+r+2,R=M+1;s.push(x,S,R),s.push(S,D,R)}}this.setIndex(s),this.setAttribute("position",new Je(l,3)),this.setAttribute("normal",new Je(h,3)),this.setAttribute("uv",new Je(c,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new L0(t.innerRadius,t.outerRadius,t.thetaSegments,t.phiSegments,t.thetaStart,t.thetaLength)}},Lr=class P0 extends St{constructor(t=1,i=32,r=16,a=0,n=Math.PI*2,o=0,s=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:i,heightSegments:r,phiStart:a,phiLength:n,thetaStart:o,thetaLength:s},i=Math.max(3,Math.floor(i)),r=Math.max(2,Math.floor(r));let l=Math.min(o+s,Math.PI),h=0,c=[],u=new v,p=new v,m=[],g=[],_=[],f=[];for(let d=0;d<=r;d++){let M=[],x=d/r,S=0;d===0&&o===0?S=.5/i:d===r&&l===Math.PI&&(S=-.5/i);for(let D=0;D<=i;D++){let R=D/i;u.x=-t*Math.cos(a+R*n)*Math.sin(o+x*s),u.y=t*Math.cos(o+x*s),u.z=t*Math.sin(a+R*n)*Math.sin(o+x*s),g.push(u.x,u.y,u.z),p.copy(u).normalize(),_.push(p.x,p.y,p.z),f.push(R+S,1-x),M.push(h++)}c.push(M)}for(let d=0;d<r;d++)for(let M=0;M<i;M++){let x=c[d][M+1],S=c[d][M],D=c[d+1][M],R=c[d+1][M+1];(d!==0||o>0)&&m.push(x,S,R),(d!==r-1||l<Math.PI)&&m.push(S,D,R)}this.setIndex(m),this.setAttribute("position",new Je(g,3)),this.setAttribute("normal",new Je(_,3)),this.setAttribute("uv",new Je(f,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new P0(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}},Gh=class D0 extends St{constructor(t=1,i=.4,r=12,a=48,n=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:i,radialSegments:r,tubularSegments:a,arc:n},r=Math.floor(r),a=Math.floor(a);let o=[],s=[],l=[],h=[],c=new v,u=new v,p=new v;for(let m=0;m<=r;m++)for(let g=0;g<=a;g++){let _=g/a*n,f=m/r*Math.PI*2;u.x=(t+i*Math.cos(f))*Math.cos(_),u.y=(t+i*Math.cos(f))*Math.sin(_),u.z=i*Math.sin(f),s.push(u.x,u.y,u.z),c.x=t*Math.cos(_),c.y=t*Math.sin(_),p.subVectors(u,c).normalize(),l.push(p.x,p.y,p.z),h.push(g/a),h.push(m/r)}for(let m=1;m<=r;m++)for(let g=1;g<=a;g++){let _=(a+1)*m+g-1,f=(a+1)*(m-1)+g-1,d=(a+1)*(m-1)+g,M=(a+1)*m+g;o.push(_,f,M),o.push(f,d,M)}this.setIndex(o),this.setAttribute("position",new Je(s,3)),this.setAttribute("normal",new Je(l,3)),this.setAttribute("uv",new Je(h,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new D0(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc)}},gf=class U0 extends St{constructor(t=new kh(new v(-1,-1,0),new v(-1,1,0),new v(1,1,0)),i=64,r=1,a=8,n=!1){super(),this.type="TubeGeometry",this.parameters={path:t,tubularSegments:i,radius:r,radialSegments:a,closed:n};let o=t.computeFrenetFrames(i,n);this.tangents=o.tangents,this.normals=o.normals,this.binormals=o.binormals;let s=new v,l=new v,h=new xe,c=new v,u=[],p=[],m=[],g=[];_(),this.setIndex(g),this.setAttribute("position",new Je(u,3)),this.setAttribute("normal",new Je(p,3)),this.setAttribute("uv",new Je(m,2));function _(){for(let x=0;x<i;x++)f(x);f(n===!1?i:0),M(),d()}function f(x){c=t.getPointAt(x/i,c);let S=o.normals[x],D=o.binormals[x];for(let R=0;R<=a;R++){let L=R/a*Math.PI*2,B=Math.sin(L),b=-Math.cos(L);l.x=b*S.x+B*D.x,l.y=b*S.y+B*D.y,l.z=b*S.z+B*D.z,l.normalize(),p.push(l.x,l.y,l.z),s.x=c.x+r*l.x,s.y=c.y+r*l.y,s.z=c.z+r*l.z,u.push(s.x,s.y,s.z)}}function d(){for(let x=1;x<=i;x++)for(let S=1;S<=a;S++){let D=(a+1)*(x-1)+(S-1),R=(a+1)*x+(S-1),L=(a+1)*x+S,B=(a+1)*(x-1)+S;g.push(D,R,B),g.push(R,L,B)}}function M(){for(let x=0;x<=i;x++)for(let S=0;S<=a;S++)h.x=x/i,h.y=S/a,m.push(h.x,h.y)}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){let t=super.toJSON();return t.path=this.parameters.path.toJSON(),t}static fromJSON(t){return new U0(new Vn[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}},vi=class extends Na{constructor(e){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.type="MeshStandardMaterial",this.color=new Ne(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ne(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Ll,this.normalScale=new xe(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},aa=class extends vi{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new xe(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return Ut(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Ne(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Ne(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Ne(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}},Hn=class{constructor(e,t,i,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r!==void 0?r:new t.constructor(i),this.sampleValues=t,this.valueSize=i,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,i=this._cachedIndex,r=t[i],a=t[i-1];i:{e:{let n;t:{r:if(!(e<r)){for(let o=i+2;;){if(r===void 0){if(e<a)break r;return i=t.length,this._cachedIndex=i,this.copySampleValue_(i-1)}if(i===o)break;if(a=r,r=t[++i],e<r)break e}n=t.length;break t}if(!(e>=a)){let o=t[1];e<o&&(i=2,a=o);for(let s=i-2;;){if(a===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===s)break;if(r=a,a=t[--i-1],e>=a)break e}n=i,i=0;break t}break i}for(;i<n;){let o=i+n>>>1;e<t[o]?n=o:i=o+1}if(r=t[i],a=t[i-1],a===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return i=t.length,this._cachedIndex=i,this.copySampleValue_(i-1)}this._cachedIndex=i,this.intervalChanged_(i,a,r)}return this.interpolate_(i,a,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,i=this.sampleValues,r=this.valueSize,a=e*r;for(let n=0;n!==r;++n)t[n]=i[a+n];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},_f=class extends Hn{constructor(e,t,i,r){super(e,t,i,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Tl,endingEnd:Tl}}intervalChanged_(e,t,i){let r=this.parameterPositions,a=e-2,n=e+1,o=r[a],s=r[n];if(o===void 0)switch(this.getSettings_().endingStart){case Al:a=e,o=2*t-i;break;case Rl:a=r.length-2,o=t+r[a]-r[a+1];break;default:a=e,o=i}if(s===void 0)switch(this.getSettings_().endingEnd){case Al:n=e,s=2*i-t;break;case Rl:n=1,s=i+r[1]-r[0];break;default:n=e-1,s=t}let l=(i-t)*.5,h=this.valueSize;this._weightPrev=l/(t-o),this._weightNext=l/(s-i),this._offsetPrev=a*h,this._offsetNext=n*h}interpolate_(e,t,i,r){let a=this.resultBuffer,n=this.sampleValues,o=this.valueSize,s=e*o,l=s-o,h=this._offsetPrev,c=this._offsetNext,u=this._weightPrev,p=this._weightNext,m=(i-t)/(r-t),g=m*m,_=g*m,f=-u*_+2*u*g-u*m,d=(1+u)*_+(-1.5-2*u)*g+(-.5+u)*m+1,M=(-1-p)*_+(1.5+p)*g+.5*m,x=p*_-p*g;for(let S=0;S!==o;++S)a[S]=f*n[h+S]+d*n[l+S]+M*n[s+S]+x*n[c+S];return a}},vf=class extends Hn{constructor(e,t,i,r){super(e,t,i,r)}interpolate_(e,t,i,r){let a=this.resultBuffer,n=this.sampleValues,o=this.valueSize,s=e*o,l=s-o,h=(i-t)/(r-t),c=1-h;for(let u=0;u!==o;++u)a[u]=n[l+u]*c+n[s+u]*h;return a}},xf=class extends Hn{constructor(e,t,i,r){super(e,t,i,r)}interpolate_(e){return this.copySampleValue_(e-1)}},qi=class{constructor(e,t,i,r){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=ss(t,this.TimeBufferType),this.values=ss(i,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,i;if(t.toJSON!==this.toJSON)i=t.toJSON(e);else{i={name:e.name,times:ss(e.times,Array),values:ss(e.values,Array)};let r=e.getInterpolation();r!==e.DefaultInterpolation&&(i.interpolation=r)}return i.type=e.ValueTypeName,i}InterpolantFactoryMethodDiscrete(e){return new xf(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new vf(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new _f(this.times,this.values,this.getValueSize(),e)}setInterpolation(e){let t;switch(e){case cn:t=this.InterpolantFactoryMethodDiscrete;break;case un:t=this.InterpolantFactoryMethodLinear;break;case ys:t=this.InterpolantFactoryMethodSmooth;break}if(t===void 0){let i="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(i);return console.warn("THREE.KeyframeTrack:",i),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return cn;case this.InterpolantFactoryMethodLinear:return un;case this.InterpolantFactoryMethodSmooth:return ys}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let i=0,r=t.length;i!==r;++i)t[i]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let i=0,r=t.length;i!==r;++i)t[i]*=e}return this}trim(e,t){let i=this.times,r=i.length,a=0,n=r-1;for(;a!==r&&i[a]<e;)++a;for(;n!==-1&&i[n]>t;)--n;if(++n,a!==0||n!==r){a>=n&&(n=Math.max(n,1),a=n-1);let o=this.getValueSize();this.times=i.slice(a,n),this.values=this.values.slice(a*o,n*o)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),e=!1);let i=this.times,r=this.values,a=i.length;a===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),e=!1);let n=null;for(let o=0;o!==a;o++){let s=i[o];if(typeof s=="number"&&isNaN(s)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,o,s),e=!1;break}if(n!==null&&n>s){console.error("THREE.KeyframeTrack: Out of order keys.",this,o,s,n),e=!1;break}n=s}if(r!==void 0&&nv(r))for(let o=0,s=r.length;o!==s;++o){let l=r[o];if(isNaN(l)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,o,l),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),i=this.getValueSize(),r=this.getInterpolation()===ys,a=e.length-1,n=1;for(let o=1;o<a;++o){let s=!1,l=e[o],h=e[o+1];if(l!==h&&(o!==1||l!==e[0]))if(r)s=!0;else{let c=o*i,u=c-i,p=c+i;for(let m=0;m!==i;++m){let g=t[c+m];if(g!==t[u+m]||g!==t[p+m]){s=!0;break}}}if(s){if(o!==n){e[n]=e[o];let c=o*i,u=n*i;for(let p=0;p!==i;++p)t[u+p]=t[c+p]}++n}}if(a>0){e[n]=e[a];for(let o=a*i,s=n*i,l=0;l!==i;++l)t[s+l]=t[o+l];++n}return n!==e.length?(this.times=e.slice(0,n),this.values=t.slice(0,n*i)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),i=this.constructor,r=new i(this.name,e,t);return r.createInterpolant=this.createInterpolant,r}},qi.prototype.TimeBufferType=Float32Array,qi.prototype.ValueBufferType=Float32Array,qi.prototype.DefaultInterpolation=un,Oa=class extends qi{},Oa.prototype.ValueTypeName="bool",Oa.prototype.ValueBufferType=Array,Oa.prototype.DefaultInterpolation=cn,Oa.prototype.InterpolantFactoryMethodLinear=void 0,Oa.prototype.InterpolantFactoryMethodSmooth=void 0,yf=class extends qi{},yf.prototype.ValueTypeName="color",Mf=class extends qi{},Mf.prototype.ValueTypeName="number",bf=class extends Hn{constructor(e,t,i,r){super(e,t,i,r)}interpolate_(e,t,i,r){let a=this.resultBuffer,n=this.sampleValues,o=this.valueSize,s=(i-t)/(r-t),l=e*o;for(let h=l+o;l!==h;l+=4)Ct.slerpFlat(a,0,n,l-o,n,l,s);return a}},Qs=class extends qi{InterpolantFactoryMethodLinear(e){return new bf(this.times,this.values,this.getValueSize(),e)}},Qs.prototype.ValueTypeName="quaternion",Qs.prototype.DefaultInterpolation=un,Qs.prototype.InterpolantFactoryMethodSmooth=void 0,Fa=class extends qi{},Fa.prototype.ValueTypeName="string",Fa.prototype.ValueBufferType=Array,Fa.prototype.DefaultInterpolation=cn,Fa.prototype.InterpolantFactoryMethodLinear=void 0,Fa.prototype.InterpolantFactoryMethodSmooth=void 0,Sf=class extends qi{},Sf.prototype.ValueTypeName="vector",wf=class{constructor(e,t,i){let r=this,a=!1,n=0,o=0,s,l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=i,this.itemStart=function(h){o++,a===!1&&r.onStart!==void 0&&r.onStart(h,n,o),a=!0},this.itemEnd=function(h){n++,r.onProgress!==void 0&&r.onProgress(h,n,o),n===o&&(a=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(h){r.onError!==void 0&&r.onError(h)},this.resolveURL=function(h){return s?s(h):h},this.setURLModifier=function(h){return s=h,this},this.addHandler=function(h,c){return l.push(h,c),this},this.removeHandler=function(h){let c=l.indexOf(h);return c!==-1&&l.splice(c,2),this},this.getHandler=function(h){for(let c=0,u=l.length;c<u;c+=2){let p=l[c],m=l[c+1];if(p.global&&(p.lastIndex=0),p.test(h))return m}return null}}},Ef=new wf,Tf=class{constructor(e){this.manager=e!==void 0?e:Ef,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){let i=this;return new Promise(function(r,a){i.load(e,r,t,a)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}},Tf.DEFAULT_MATERIAL_NAME="__DEFAULT",Wh=class extends Yt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Ne(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),t}},Af=class extends Wh{constructor(e,t,i){super(e,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Yt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Ne(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}},$s=new tt,Xh=new v,jh=new v,Rf=class{constructor(e){this.camera=e,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new xe(512,512),this.map=null,this.mapPass=null,this.matrix=new tt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Fs,this._frameExtents=new xe(1,1),this._viewportCount=1,this._viewports=[new gt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera,i=this.matrix;Xh.setFromMatrixPosition(e.matrixWorld),t.position.copy(Xh),jh.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(jh),t.updateMatrixWorld(),$s.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix($s),i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply($s)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.bias=e.bias,this.radius=e.radius,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},Cf=class extends Rf{constructor(){super(new ch(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Lf=class extends Wh{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Yt.DEFAULT_UP),this.updateMatrix(),this.target=new Yt,this.shadow=new Cf}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}},eo="\\[\\]\\.:\\/",Pf=new RegExp("["+eo+"]","g"),to="[^"+eo+"]",Df="[^"+eo.replace("\\.","")+"]",Uf=/((?:WC+[\/:])*)/.source.replace("WC",to),Nf=/(WCOD+)?/.source.replace("WCOD",Df),If=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",to),Of=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",to),Ff=new RegExp("^"+Uf+Nf+If+Of+"$"),zf=["material","materials","bones","map"],kf=class{constructor(e,t,i){let r=i||ft.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();let i=this._targetGroup.nCachedObjects_,r=this._bindings[i];r!==void 0&&r.getValue(e,t)}setValue(e,t){let i=this._bindings;for(let r=this._targetGroup.nCachedObjects_,a=i.length;r!==a;++r)i[r].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].unbind()}},ft=class $a{constructor(t,i,r){this.path=i,this.parsedPath=r||$a.parseTrackName(i),this.node=$a.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,i,r){return t&&t.isAnimationObjectGroup?new $a.Composite(t,i,r):new $a(t,i,r)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(Pf,"")}static parseTrackName(t){let i=Ff.exec(t);if(i===null)throw new Error("PropertyBinding: Cannot parse trackName: "+t);let r={nodeName:i[2],objectName:i[3],objectIndex:i[4],propertyName:i[5],propertyIndex:i[6]},a=r.nodeName&&r.nodeName.lastIndexOf(".");if(a!==void 0&&a!==-1){let n=r.nodeName.substring(a+1);zf.indexOf(n)!==-1&&(r.nodeName=r.nodeName.substring(0,a),r.objectName=n)}if(r.propertyName===null||r.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+t);return r}static findNode(t,i){if(i===void 0||i===""||i==="."||i===-1||i===t.name||i===t.uuid)return t;if(t.skeleton){let r=t.skeleton.getBoneByName(i);if(r!==void 0)return r}if(t.children){let r=function(n){for(let o=0;o<n.length;o++){let s=n[o];if(s.name===i||s.uuid===i)return s;let l=r(s.children);if(l)return l}return null},a=r(t.children);if(a)return a}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,i){t[i]=this.targetObject[this.propertyName]}_getValue_array(t,i){let r=this.resolvedProperty;for(let a=0,n=r.length;a!==n;++a)t[i++]=r[a]}_getValue_arrayElement(t,i){t[i]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,i){this.resolvedProperty.toArray(t,i)}_setValue_direct(t,i){this.targetObject[this.propertyName]=t[i]}_setValue_direct_setNeedsUpdate(t,i){this.targetObject[this.propertyName]=t[i],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,i){this.targetObject[this.propertyName]=t[i],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,i){let r=this.resolvedProperty;for(let a=0,n=r.length;a!==n;++a)r[a]=t[i++]}_setValue_array_setNeedsUpdate(t,i){let r=this.resolvedProperty;for(let a=0,n=r.length;a!==n;++a)r[a]=t[i++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,i){let r=this.resolvedProperty;for(let a=0,n=r.length;a!==n;++a)r[a]=t[i++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,i){this.resolvedProperty[this.propertyIndex]=t[i]}_setValue_arrayElement_setNeedsUpdate(t,i){this.resolvedProperty[this.propertyIndex]=t[i],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,i){this.resolvedProperty[this.propertyIndex]=t[i],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,i){this.resolvedProperty.fromArray(t,i)}_setValue_fromArray_setNeedsUpdate(t,i){this.resolvedProperty.fromArray(t,i),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,i){this.resolvedProperty.fromArray(t,i),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,i){this.bind(),this.getValue(t,i)}_setValue_unbound(t,i){this.bind(),this.setValue(t,i)}bind(){let t=this.node,i=this.parsedPath,r=i.objectName,a=i.propertyName,n=i.propertyIndex;if(t||(t=$a.findNode(this.rootNode,i.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(r){let h=i.objectIndex;switch(r){case"materials":if(!t.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let c=0;c<t.length;c++)if(t[c].name===h){h=c;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[r]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[r]}if(h!==void 0){if(t[h]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[h]}}let o=t[a];if(o===void 0){let h=i.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+h+"."+a+" but it wasn't found.",t);return}let s=this.Versioning.None;this.targetObject=t,t.needsUpdate!==void 0?s=this.Versioning.NeedsUpdate:t.matrixWorldNeedsUpdate!==void 0&&(s=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(n!==void 0){if(a==="morphTargetInfluences"){if(!t.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[n]!==void 0&&(n=t.morphTargetDictionary[n])}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=n}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=a;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][s]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}},ft.Composite=kf,ft.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3},ft.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2},ft.prototype.GetterByBindingType=[ft.prototype._getValue_direct,ft.prototype._getValue_array,ft.prototype._getValue_arrayElement,ft.prototype._getValue_toArray],ft.prototype.SetterByBindingTypeAndVersioning=[[ft.prototype._setValue_direct,ft.prototype._setValue_direct_setNeedsUpdate,ft.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[ft.prototype._setValue_array,ft.prototype._setValue_array_setNeedsUpdate,ft.prototype._setValue_array_setMatrixWorldNeedsUpdate],[ft.prototype._setValue_arrayElement,ft.prototype._setValue_arrayElement_setNeedsUpdate,ft.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[ft.prototype._setValue_fromArray,ft.prototype._setValue_fromArray_setNeedsUpdate,ft.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]],sv=new Float32Array(1),typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"160"}})),typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="160")}),Bf={};I0(Bf,{JOINTS:()=>ro,ProceduralHuman:()=>Gn});function ov(e){return{hipsY:.53*e,spineY:.605*e,chestY:.72*e,neckY:.828*e,headY:.905*e,headTop:.985*e,shoulderY:.81*e,shoulderX:.1*e,clavX:.03*e,upperArm:.172*e,foreArm:.152*e,handLen:.098*e,hipX:.064*e,thigh:.238*e,shin:.24*e,ankleH:.036*e,footLen:.14*e,footBack:.04*e,headR:.052*e}}function lv(e){let t={};t.pelvis=new v(0,e.hipsY,0),t.spine=new v(0,e.spineY,.005),t.chest=new v(0,e.chestY,.005),t.neck=new v(0,e.neckY,0),t.head=new v(0,e.headY,.01);for(let i of["L","R"]){let r=i==="L"?1:-1;t["shoulder"+i]=new v(r*e.shoulderX,e.shoulderY,0),t["elbow"+i]=new v(r*(e.shoulderX+.035),e.shoulderY-e.upperArm,.01),t["wrist"+i]=new v(r*(e.shoulderX+.05),e.shoulderY-e.upperArm-e.foreArm,.02),t["hand"+i]=new v(r*(e.shoulderX+.055),e.shoulderY-e.upperArm-e.foreArm-e.handLen,.03),t["hip"+i]=new v(r*e.hipX,e.hipsY-.02,0),t["knee"+i]=new v(r*e.hipX,e.hipsY-.02-e.thigh,.012),t["ankle"+i]=new v(r*e.hipX,e.ankleH,-.02),t["toe"+i]=new v(r*e.hipX,.012,e.footLen-.05)}return t}function na(e,t,i,r,a,n,o=0){let s=[];for(let l=0;l<n;l++){let h=l/n*Math.PI*2,c=Math.cos(h)*r,u=Math.sin(h)*a;s.push([e+c,t+u*Math.sin(o),i+u*Math.cos(o)])}return s}var Qt,Yi,Vf,Hf,Gf,io,hv,Wf,ro,za,Gn,Xf=pc(()=>{xi(),Qt=new v,Yi=new v,Vf=new v,Hf=new v,Gf=new v,io=new Ct,hv=new Ct,Wf=new tt,ro=["pelvis","spine","chest","neck","head","shoulderL","elbowL","wristL","handL","shoulderR","elbowR","wristR","handR","hipL","kneeL","ankleL","toeL","hipR","kneeR","ankleR","toeR"],za=[{name:"pelvis",a:"pelvis",b:"spine",parent:null},{name:"spine",a:"spine",b:"chest",parent:"pelvis"},{name:"chest",a:"chest",b:"neck",parent:"spine"},{name:"neck",a:"neck",b:"head",parent:"chest"},{name:"head",a:"head",b:null,parent:"neck",tip:.075},{name:"uparmL",a:"shoulderL",b:"elbowL",parent:"chest"},{name:"forearmL",a:"elbowL",b:"wristL",parent:"uparmL"},{name:"handL",a:"wristL",b:"handL",parent:"forearmL"},{name:"uparmR",a:"shoulderR",b:"elbowR",parent:"chest"},{name:"forearmR",a:"elbowR",b:"wristR",parent:"uparmR"},{name:"handR",a:"wristR",b:"handR",parent:"forearmR"},{name:"thighL",a:"hipL",b:"kneeL",parent:"pelvis"},{name:"shinL",a:"kneeL",b:"ankleL",parent:"thighL"},{name:"footL",a:"ankleL",b:"toeL",parent:"shinL"},{name:"thighR",a:"hipR",b:"kneeR",parent:"pelvis"},{name:"shinR",a:"kneeR",b:"ankleR",parent:"thighR"},{name:"footR",a:"ankleR",b:"toeR",parent:"shinR"}],Gn=class{constructor(e={}){let t=this.H=e.height??1.76,i=this.P=ov(t);this.rest=lv(i),this.cur={};for(let C of ro)this.cur[C]=this.rest[C].clone();let r={wetsuit:new Ne(e.wetsuit??2303790),vest:new Ne(e.vest??12729136),vestTrim:new Ne(e.vestTrim??1845043),skin:new Ne(e.skin??13211506),cap:new Ne(e.cap??15262938),boot:new Ne(1909030),glove:new Ne(e.glove??7830918),shades:new Ne(1119258)};this.bones={},this.boneList=[],this.boneRest={};for(let C of za){let G=new Dh;G.name=C.name,this.bones[C.name]=G,this.boneList.push(G);let O=this.rest[C.a],U=C.b?this.rest[C.b]:O.clone().add(new v(0,C.tip,0)),K=U.clone().sub(O).normalize();this.boneRest[C.name]={pos:O.clone(),dir:K,len:U.distanceTo(O)}}for(let C of za)C.parent&&this.bones[C.parent].add(this.bones[C.name]);for(let C of za){let G=this.bones[C.name];C.parent?G.position.copy(this.boneRest[C.name].pos).sub(this.boneRest[C.parent].pos):G.position.copy(this.boneRest[C.name].pos)}let a=[],n=[],o=[],s=[],l=[],h=[],c={};this.boneList.forEach((C,G)=>c[C.name]=G);let u=14,p=[],m=(C,G,O,U,K,j)=>{let I=a.length/3;p.push(I);for(let W of C)a.push(W[0],W[1],W[2]),n.push(0,0,1),o.push(j.r,j.g,j.b),s.push(c[G],U?c[U]:0,0,0),l.push(O,U?K:0,0,0);return I},g=(C,G,O=u)=>{for(let U=0;U<O;U++){let K=C+U,j=C+(U+1)%O,I=G+U,W=G+(U+1)%O;h.push(K,I,j,j,I,W)}},_=(C,G,O=u)=>{let U=a.length/3;a.push(G[0],G[1],G[2]),n.push(0,1,0);let K=C*3;o.push(o[C*3],o[C*3+1],o[C*3+2]),s.push(s[C*4],s[C*4+1],0,0),l.push(l[C*4],l[C*4+1],0,0);for(let j=0;j<O;j++)h.push(C+j,U,C+(j+1)%O)},f=(C,G,O=u)=>{let U=a.length/3;a.push(G[0],G[1],G[2]),n.push(0,-1,0),o.push(o[C*3],o[C*3+1],o[C*3+2]),s.push(s[C*4],s[C*4+1],0,0),l.push(l[C*4],l[C*4+1],0,0);for(let K=0;K<O;K++)h.push(C+(K+1)%O,U,C+K)},d=this.rest,M=(C,G,O)=>C+(G-C)*O;{let C=d.pelvis.y-.06,G=[{y:C,rx:.14,rz:.1,b1:"pelvis",w1:1,c:r.wetsuit},{y:M(C,d.chest.y,.24),rx:.142,rz:.1,b1:"pelvis",w1:.7,b2:"spine",w2:.3,c:r.wetsuit},{y:M(C,d.chest.y,.4),rx:.135,rz:.094,b1:"spine",w1:.9,b2:"pelvis",w2:.1,c:r.wetsuit},{y:M(C,d.chest.y,.4),rx:.138,rz:.098,b1:"spine",w1:.9,b2:"pelvis",w2:.1,c:r.vest,dup:!0},{y:M(C,d.chest.y,.6),rx:.152,rz:.118,b1:"spine",w1:.55,b2:"chest",w2:.45,c:r.vest},{y:M(C,d.chest.y,.84),rx:.16,rz:.128,b1:"chest",w1:.9,b2:"spine",w2:.1,c:r.vestTrim},{y:d.chest.y+.03,rx:.155,rz:.122,b1:"chest",w1:1,c:r.vest},{y:i.shoulderY-.01,rx:.138,rz:.1,b1:"chest",w1:1,c:r.vest},{y:i.shoulderY+.035,rx:.092,rz:.075,b1:"chest",w1:1,c:r.wetsuit}],O=null;for(let U of G){let K=m(na(0,U.y,.005,U.rx,U.rz,u),U.b1,U.w1,U.b2,U.w2??0,U.c);O!==null&&g(O,K),O=K}f(p[0],[0,C-.045,0]),_(O,[0,i.shoulderY+.055,0])}{let C=m(na(0,i.neckY-.012,.01,.044,.044,u),"neck",1,null,0,r.skin),G=m(na(0,i.neckY+.03,.012,.043,.043,u),"neck",.55,"head",.45,r.skin);g(C,G);let O=i.headY,U=i.headR,K=[{t:-.88,c:r.skin},{t:-.5,c:r.skin},{t:-.12,c:r.skin},{t:.06,c:r.shades},{t:.24,c:r.shades},{t:.42,c:r.cap},{t:.72,c:r.cap},{t:.93,c:r.cap}],j=G;for(let he of K){let me=U*Math.sqrt(Math.max(1-he.t*he.t,.06)),q=m(na(0,O+he.t*U*1.05,.016,me,me*1.08,u),"head",1,null,0,he.c);g(j,q),j=q}_(j,[0,O+U*1.15,.014]);let I=a.length/3,W=O+U*.42;a.push(-.042,W,U+.005,.042,W,U+.005,-.032,W-.006,U+.062,.032,W-.006,U+.062);for(let he=0;he<4;he++)n.push(0,1,0),o.push(r.cap.r,r.cap.g,r.cap.b),s.push(c.head,0,0,0),l.push(1,0,0,0);h.push(I,I+2,I+1,I+1,I+2,I+3)}let x=(C,G)=>{let O=C==="L"?1:-1,U=null;for(let K of G){let j=m(K.pts,K.b1,K.w1,K.b2,K.w2??0,K.c);U!==null&&!K.noBridge&&g(U,j),U=j}return U};for(let C of["L","R"]){let G=C==="L"?1:-1,O=d["shoulder"+C],U=d["elbow"+C],K=d["wrist"+C],j=d["hand"+C],I=(ie,ee,X)=>na(ie.x,ie.y,ie.z,ee,X,u),W=(ie,ee,X)=>new v().lerpVectors(ie,ee,X),he=x(C,[{pts:I(W(O,U,0),.062,.06),b1:"uparm"+C,w1:1,c:r.vest,noBridge:!0},{pts:I(W(O,U,.3),.05,.049),b1:"uparm"+C,w1:1,c:r.wetsuit},{pts:I(W(O,U,.85),.043,.043),b1:"uparm"+C,w1:.55,b2:"forearm"+C,w2:.45,c:r.wetsuit},{pts:I(W(U,K,.2),.041,.041),b1:"forearm"+C,w1:.9,b2:"uparm"+C,w2:.1,c:r.wetsuit},{pts:I(W(U,K,.8),.034,.034),b1:"forearm"+C,w1:.85,b2:"hand"+C,w2:.15,c:r.wetsuit},{pts:I(W(K,j,.05),.038,.028),b1:"hand"+C,w1:1,c:r.glove},{pts:I(W(K,j,.8),.034,.022),b1:"hand"+C,w1:1,c:r.glove}]);_(he,[j.x,j.y,j.z]);let me=d["hip"+C],q=d["knee"+C],$=d["ankle"+C],pe=d["toe"+C],ne=x(C,[{pts:I(W(me,q,.04),.074,.072),b1:"thigh"+C,w1:1,c:r.wetsuit,noBridge:!0},{pts:I(W(me,q,.45),.066,.064),b1:"thigh"+C,w1:1,c:r.wetsuit},{pts:I(W(me,q,.9),.054,.053),b1:"thigh"+C,w1:.55,b2:"shin"+C,w2:.45,c:r.wetsuit},{pts:I(W(q,$,.18),.05,.05),b1:"shin"+C,w1:.9,b2:"thigh"+C,w2:.1,c:r.wetsuit},{pts:I(W(q,$,.7),.042,.042),b1:"shin"+C,w1:1,c:r.wetsuit},{pts:I(W(q,$,.98),.04,.045),b1:"shin"+C,w1:.55,b2:"foot"+C,w2:.45,c:r.boot}]),re=new v($.x,.035,$.z-i.footBack),T=new v(pe.x,.03,pe.z),ae=m(na(re.x,re.y,re.z+.02,.05,.055,u),"foot"+C,1,null,0,r.boot);g(ne,ae);let te=m(na(T.x,T.y,T.z-.03,.046,.04,u),"foot"+C,1,null,0,r.boot);g(ae,te),_(te,[T.x,.025,T.z+.015]),f(ae,[re.x,.02,re.z-.03])}let S=new St;S.setAttribute("position",new Je(a,3)),S.setAttribute("normal",new Je(n,3)),S.setAttribute("color",new Je(o,3)),S.setAttribute("skinIndex",new Us(s,4)),S.setAttribute("skinWeight",new Je(l,4)),S.setIndex(h),S.computeVertexNormals();let D=new vi({vertexColors:!0,roughness:.72,metalness:.02});this.mesh=new af(S,D),this.mesh.castShadow=!0,this.mesh.frustumCulled=!1;let R=new of(this.boneList);this.mesh.add(this.bones.pelvis),this.mesh.updateMatrixWorld(!0),this.mesh.bind(R),this.group=new ji,this.group.add(this.mesh);let L=(C,G=.62,O=.01)=>new vi({color:C,roughness:G,metalness:O}),B=L(e.vest??12729136,.58),b=L(e.vestTrim??1845043,.48),E=L(e.skin??13211506,.7),F=L(e.glove??7830918,.76),V=(C,G,O,U,K=null)=>{let j=new De(G,O);return j.position.copy(U),K&&j.scale.copy(K),j.castShadow=!0,j.receiveShadow=!0,C.add(j),j},Q=V(this.bones.chest,new Ft(t*.17,t*.12,t*.026),B,new v(0,t*.006,t*.085));Q.name="buoyancy-aid-front-panel";for(let C of[-1,1]){let G=V(this.bones.chest,new Ft(t*.026,t*.13,t*.012),b,new v(C*t*.055,t*.018,t*.104));G.name=`buoyancy-aid-strap-${C<0?"left":"right"}`}for(let C of[-.025,.018]){let G=V(this.bones.chest,new Ft(t*.055,t*.014,t*.014),b,new v(0,t*C,t*.108));G.name="buoyancy-aid-buckle"}let P=V(this.bones.head,new Lr(t*.019,14,10),E,new v(0,-t*.006,t*.061),new v(.58,.72,1.18)),z=V(this.bones.head,new Lr(t*.032,14,10),E,new v(0,-t*.031,t*.017),new v(.92,.62,.82));P.name="nose",z.name="jaw";for(let C of[-1,1]){let G=V(this.bones.head,new Lr(t*.014,12,8),E,new v(C*t*.051,-t*.004,t*.006),new v(.52,1,.72));G.name=`ear-${C<0?"left":"right"}`}for(let C of["L","R"]){let G=this.boneRest["hand"+C],O=G.dir.clone().multiplyScalar(G.len*.72),U=V(this.bones["hand"+C],new Lr(t*.024,12,8),F,O,new v(.82,1.05,.72));U.name=`articulated-grip-${C}`}}static solveTwoBone(e,t,i,r,a,n){Qt.copy(t).sub(e);let o=Qt.length(),s=(i+r)*.9995,l=2.55,h=Math.sqrt(Math.max(1e-8,i*i+r*r+2*i*r*Math.cos(l))),c=Math.max(Math.abs(i-r)*1.02+1e-4,h);o<1e-8&&Qt.set(0,-1,0),o=Ye.clamp(o,c,s),Qt.normalize(),t.copy(e).addScaledVector(Qt,o);let u=(i*i+o*o-r*r)/(2*i*o),p=i*Ye.clamp(u,-1,1),m=Math.sqrt(Math.max(i*i-p*p,0));return Yi.copy(a).addScaledVector(Qt,-a.dot(Qt)),Yi.lengthSq()<1e-8&&(Yi.set(0,1,0).addScaledVector(Qt,-Qt.y),Yi.lengthSq()<1e-8&&Yi.set(1,0,0)),Yi.normalize(),n.copy(e).addScaledVector(Qt,p).addScaledVector(Yi,m)}applyPose(e,t={}){for(let s of ro)e[s]&&this.cur[s].copy(e[s]);let i=this.cur,r={},a={},n=(s,l,h,c,u)=>{Wf.identity();let p=Vf.copy(h).addScaledVector(s,-h.dot(s)).normalize(),m=Hf.crossVectors(s,p),g=Gf.copy(c).addScaledVector(l,-c.dot(l));g.lengthSq()<1e-8&&g.copy(p),g.normalize();let _=Qt.crossVectors(l,g),f=new tt().makeBasis(m,s,p),d=new tt().makeBasis(_,l,g),M=new Ct().setFromRotationMatrix(f),x=new Ct().setFromRotationMatrix(d);return u.copy(x).multiply(M.invert())},o=new v(0,0,1);for(let s of za){let l=this.boneRest[s.name],h=i[s.a],c=s.b?i[s.b]:null,u=c?Yi.copy(c).sub(h).normalize():Yi.copy(l.dir),p=o,m=t[s.name]||o;r[s.name]=n(l.dir,u,p,m,new Ct),a[s.name]=h}for(let s of za){let l=this.bones[s.name];if(!s.parent)l.position.copy(a[s.name]),l.quaternion.copy(r[s.name]);else{let h=r[s.parent];io.copy(h).invert(),l.quaternion.copy(io).multiply(r[s.name]),Qt.copy(a[s.name]).sub(a[s.parent]),l.position.copy(Qt.applyQuaternion(io))}}}}});xi();var cv={env:{g:9.81,rhoWater:1025,rhoAir:1.225},hull:{loa:4.4,lwl:4.22,beam:1.42,massHull:79,massCrew:150,massFoils:6,inertia:{roll:55,pitch:320,yaw:340},bodyReferenceY:.3,comZ:-.15,freeboard:.42,bowZ:2.2,sternZ:-2.2},mast:{stepLocal:{x:0,y:.46,z:.55},height:5.82,nodes:24,massTotal:7.5,houndsFrac:.64433,spreaderFrac:.38660,spreaderLen:.42,gooseneckH:.60,bendComplianceLow:6e-6,bendComplianceHigh:4e-5,stretchCompliance:1e-9,diamondStiffen:.4},boom:{length:2.82,massTotal:2.6,vangZ:.62,sheetZ:2.82,maxSwingDeg:87},main:{area:8.64,luff:5.105,foot:2.67,headFrac:.98024,roach:.16,cols:9,rows:15,clothDensity:.175,stretchCompliance:3e-8,shearCompliance:15e-8,bendCompliance:4e-4,battenRows:[4,8,11],battenBendCompliance:15e-5},jib:{area:2.88,luff:3.74,foot:1.68,cols:6,rows:11,clothDensity:.175,stretchCompliance:3e-8,shearCompliance:15e-8,bendCompliance:5e-4,tackLocal:{x:0,y:.60,z:2.05},fairleadLocal:{x:.52,y:.42,z:-.4},luffWireCompliance:6e-7,halyardSagRange:.1},spin:{area:10.2,luff:4.55,foot:2.65,midGirthFactor:1.35,cols:11,rows:12,clothDensity:.038,stretchCompliance:2e-6,shearCompliance:8e-6,bendCompliance:2,halyardFrac:.70790,poleLength:1.9,poleRingH:.785,sheetFairleadLocal:{x:.62,y:.42,z:-1.55},bagLocal:{x:.35,y:.42,z:1.45},hoistTime:2.6,douseTime:3},foils:{board:{area:.52,span:.95,z:.25,yTop:0,stallDeg:14,clAlpha:4.6,cd0:.008},rudder:{area:.33,span:.78,z:-2.18,yTop:.02,stallDeg:16,clAlpha:4.4,cd0:.009,maxDeg:38}},hydro:{cf:.0032,wetted:3.1,residuaryK:30,humpSpeed:2.85,planingRelief:.62,heelDragK:.35,buoyPointThickness:.16,dampNormal:420,dampTangent:3.2},rig:{shroudLocal:{x:.64,y:.45,z:.18},forestayLocal:{x:0,y:.44,z:2.05},shroudCompliance:2e-7,forestayCompliance:3e-7,travelerLocal:{x:.58,y:.44,z:-2.05},bridleApexH:.24,mainsheetMax:3.3,mainsheetMin:.18,vangMax:1,vangMin:.8,ropeCompliance:5e-8},crew:{helmMass:75,crewMass:75,helmZ:-1.05,crewZ:-.15,seatX:.55,hikeX:1.05,trapX:1.65,trapY:.55},wind:{speed0:5.6,dir0:0,gustiness:.16,dirWander:.1,shearExp:.11},sea:{baseAmp:.16,ampWindFactor:.028,userScale:1},lab:{seatOffsetM:0,boomSafetyRadiusM:.15,visualCableDecayRate:16,visualCableFollowRate:56},sim:{dt:.016666666666666666,substeps:12,iterations:3,maxCatchup:2,clothDamping:.06,ropeDamping:.35}};xi();var Li=new v,ur=new v,jf=new v,tx=new v,sa=new v,dr=new v,ci=new Ct,oa=class{constructor(e,t,i,r=1){this.x=new v(e,t,i),this.p=new v(e,t,i),this.v=new v,this.f=new v,this.w=r,this.damp=0}},uv=class{constructor(e,t){this.pos=new v,this.quat=new Ct,this.vel=new v,this.omega=new v,this.prevPos=new v,this.prevQuat=new Ct,this.invMass=1/e,this.invI=new v(1/t.x,1/t.y,1/t.z),this.force=new v,this.torque=new v,this.kinematic=!1}localToWorld(e,t){return t.copy(e).applyQuaternion(this.quat).add(this.pos)}worldPointVelocity(e,t){return t.copy(e).sub(this.pos),t.crossVectors(this.omega,t).add(this.vel)}invInertiaMul(e,t){return t.copy(e).applyQuaternion(ci.copy(this.quat).invert()),t.set(t.x*this.invI.x,t.y*this.invI.y,t.z*this.invI.z),t.applyQuaternion(this.quat)}genInvMass(e,t){return sa.crossVectors(e,t),this.invInertiaMul(sa,dr),this.invMass+sa.dot(dr)}applyCorrection(e,t){this.pos.addScaledVector(e,this.invMass),sa.crossVectors(t,e),this.invInertiaMul(sa,dr);let i=dr.length();i>1e-12&&(dr.multiplyScalar(1/i),ci.setFromAxisAngle(dr,i),this.quat.premultiply(ci).normalize())}addForceAt(e,t){this.force.add(e),sa.copy(t).sub(this.pos),this.torque.add(dr.crossVectors(sa,e))}integrate(e,t){if(this.kinematic)return;this.prevPos.copy(this.pos),this.prevQuat.copy(this.quat),this.vel.y-=t*e,this.vel.addScaledVector(this.force,this.invMass*e),this.vel.lengthSq()>2500&&this.vel.setLength(50),this.pos.addScaledVector(this.vel,e),this.invInertiaMul(this.torque,dr),this.omega.addScaledVector(dr,e),this.omega.lengthSq()>400&&this.omega.setLength(20);let i=this.omega;ci.set(i.x*e*.5,i.y*e*.5,i.z*e*.5,0).multiply(this.quat),this.quat.x+=ci.x,this.quat.y+=ci.y,this.quat.z+=ci.z,this.quat.w+=ci.w,this.quat.normalize()}updateVelocities(e){if(this.kinematic)return;this.vel.copy(this.pos).sub(this.prevPos).multiplyScalar(1/e),ci.copy(this.quat).multiply(new Ct().copy(this.prevQuat).invert());let t=ci.w>=0?1:-1;this.omega.set(ci.x*t,ci.y*t,ci.z*t).multiplyScalar(2/e)}},_t=class{constructor(e,t,i,r=0,a=null){this.a=e,this.b=t,this.rest=i,this.alpha=r,this.uni=a,this.lambda=0,this.tension=0}solve(e){let t=this.a,i=this.b;Li.copy(i.x).sub(t.x);let r=Li.length();if(r<1e-9)return;let a=r-this.rest,n=t.w+i.w;if(n===0)return;Li.multiplyScalar(1/r);let o=this.alpha/(e*e),s=(-a-o*this.lambda)/(n+o),l=this.lambda+s;this.uni==="tension"&&(l=Math.min(0,l)),this.uni==="compress"&&(l=Math.max(0,l)),s=l-this.lambda,this.lambda=l,this.tension=-this.lambda/(e*e),t.x.addScaledVector(Li,-s*t.w),i.x.addScaledVector(Li,s*i.w)}},Gt=class{constructor(e,t,i,r=0,a=0,n=null){this.body=e,this.local=new v().copy(t),this.p=i,this.rest=r,this.alpha=a,this.uni=n,this.lambda=0,this.tension=0,this._anchor=new v}solve(e){let t=this.body,i=this.p;t.localToWorld(this.local,this._anchor),Li.copy(i.x).sub(this._anchor);let r=Li.length(),a;if(this.rest===0){if(r<1e-9)return;a=Li.multiplyScalar(1/r)}else{if(r<1e-9)return;a=Li.multiplyScalar(1/r)}let n=r-this.rest;ur.copy(this._anchor).sub(t.pos);let o=t.kinematic?0:t.genInvMass(ur,a),s=i.w+o;if(s===0)return;let l=this.alpha/(e*e),h=(-n-l*this.lambda)/(s+l),c=this.lambda+h;this.uni==="tension"&&(c=Math.min(0,c)),this.uni==="compress"&&(c=Math.max(0,c)),h=c-this.lambda,this.lambda=c,this.tension=-this.lambda/(e*e),i.x.addScaledVector(a,h*i.w),t.kinematic||(jf.copy(a).multiplyScalar(-h),t.applyCorrection(jf,ur))}},dv=class{constructor(e,t,i,r=0){this.nodes=e,this.rest=t,this.alpha=i,this.EA=r,this.lambda=0,this.tension=0,this.segmentLengths=new Array(e.length-1).fill(0),this.finite=!0,this._delta=new v,this._lever=new v,this._unit=new v,this._correction=new v,this.entries=[],this.entryByNode=new Map;let a=new Map;for(let n of e){let o=a.get(n);o||(o={node:n,position:new v,gradient:new v},a.set(n,o),this.entries.push(o))}this.entryByNode=a}_position(e,t){return e.body?e.body.localToWorld(e.local,t):t.copy(e.x)}solve(e){this.segmentLengths.fill(0),this.tension=0,this.finite=!0;for(let s of this.entries)this._position(s.node,s.position),s.gradient.set(0,0,0);let t=0;for(let s=0;s<this.nodes.length-1;s++){let l=this.entryByNode.get(this.nodes[s]),h=this.entryByNode.get(this.nodes[s+1]);this._delta.copy(h.position).sub(l.position);let c=this._delta.length();c<1e-9||(this._delta.multiplyScalar(1/c),l.gradient.addScaledVector(this._delta,-1),h.gradient.add(this._delta),this.segmentLengths[s]=c,t+=c)}let i=t-this.rest,r=0;for(let s of this.entries){let l=s.gradient.lengthSq();l<1e-12||(s.node.body?(this._lever.copy(s.position).sub(s.node.body.pos),this._unit.copy(s.gradient).normalize(),r+=s.node.body.genInvMass(this._lever,this._unit)*l):r+=s.node.w*l)}if(![t,i,r,this.rest,this.alpha,e].every(Number.isFinite)){this.finite=!1,this.lambda=0,this.tension=Number.NaN;return}if(r<=0){this.lambda=0;return}let a=this.alpha/(e*e),n=(-i-a*this.lambda)/(r+a),o=Math.min(0,this.lambda+n);n=o-this.lambda,this.lambda=o,this.tension=-this.lambda/(e*e);for(let s of this.entries)s.gradient.lengthSq()<1e-12||(this._correction.copy(s.gradient).multiplyScalar(n),s.node.body?(this._lever.copy(s.position).sub(s.node.body.pos),s.node.body.applyCorrection(this._correction,this._lever)):s.node.x.addScaledVector(this._correction,s.node.w))}},pv=class{constructor(e,t,i={}){if(this.world=e,this.body=t.body,this.EA=i.EA??9e4,this.haulRateMps=i.haulRateMps??1.2,this.easeRateMps=i.easeRateMps??2,this.scope=i.initialScope??.5,this._anchorWorld=new v,this._rayA=new v,this._rayB=new v,this.segmentNodes=[[i.boomAft,i.apex],[i.apex,i.boomAft],[i.boomAft,i.boomMid],[i.boomMid,{body:t.body,local:i.ratchetLocal}]],this.constraints=[],this.segmentLengths=[0,0,0,0],this.segmentRest=[0,0,0,0],this.segmentTensions=[0,0,0,0],this.wrapAngles=[0,0,0],this.sheaveModel="frictionless-ideal",this.tensionUniformityErrorN=0,this.solverFinite=!0,this.solvedRestM=0,this.enabled=!0,this._measureLengths(),this.leadReference=this.segmentLengths[2]+this.segmentLengths[3],this.activeRest=this.segmentLengths.reduce((a,n)=>a+n,0),this.targetRest=this.activeRest,this._allocateUniformRest(this.activeRest),this.routeNodes=[i.boomAft,i.apex,i.boomAft,i.boomMid,{body:t.body,local:i.ratchetLocal}],new Set(this.routeNodes.filter(a=>a.body).map(a=>a.body)).size>1)throw new Error("ReevedPathConstraint supports one rigid-body anchor group.");this.pathConstraint=e.addC(new dv(this.routeNodes,this.activeRest,this.activeRest/this.EA,this.EA)),this.constraints.push(this.pathConstraint),this.setTrim(this.scope),this.resetToCurrentTrim()}_position(e,t){return e.body?e.body.localToWorld(e.local,t):t.copy(e.x)}_measureLengths(){for(let e=0;e<this.segmentNodes.length;e++){let t=this.segmentNodes[e];this._position(t[0],this._rayA),this._position(t[1],this._rayB),this.segmentLengths[e]=this._rayA.distanceTo(this._rayB)}}_allocateUniformRest(e){e=Math.max(.04,e);let t=this.segmentLengths.reduce((r,a)=>r+a,0),i=e-.04;for(let r=0;r<4;r++)this.segmentRest[r]=.01+i*(t>1e-9?this.segmentLengths[r]/t:.25);this.activeRest=e}setTrim(e){this.scope=Ye.clamp(e,0,1),this.targetRest=this.leadReference+2*Ye.lerp(3.3,.46,this.scope)}setBaseCompliance(e){this.EA=Ye.clamp(1/Math.max(e,1e-12),2e4,2e6),this._syncConstraints()}_syncConstraints(){this.pathConstraint.rest=this.activeRest,this.pathConstraint.alpha=this.activeRest/this.EA,this.pathConstraint.EA=this.EA}preSubstep(e){if(!this.enabled)return;let t=this.targetRest-this.activeRest,i=t<0?this.haulRateMps:this.easeRateMps,r=Ye.clamp(t,-i*e,i*e);if(Math.abs(r)>0){let a=Math.max(1e-6,this.activeRest),n=(a+r)/a;for(let o=0;o<4;o++)this.segmentRest[o]*=n;this.activeRest+=r}this._syncConstraints()}postSubstep(){if(!this.enabled)return;this._measureLengths(),this.solverFinite=this.pathConstraint.finite&&Number.isFinite(this.pathConstraint.tension),this.solvedRestM=this.pathConstraint.rest,this.segmentTensions.fill(this.pathConstraint.tension);let e=[this.segmentNodes[0][0],this.segmentNodes[0][1],this.segmentNodes[1][1],this.segmentNodes[2][1],this.segmentNodes[3][1]],t=[1,2,3];for(let i=0;i<3;i++){let r=t[i],a=this._position(e[r],new v),n=this._position(e[r-1],new v),o=this._position(e[r+1],new v);this._rayA.copy(n).sub(a).normalize(),this._rayB.copy(o).sub(a).normalize(),this.wrapAngles[i]=Math.acos(Ye.clamp(-this._rayA.dot(this._rayB),-1,1))}this._allocateUniformRest(this.activeRest),this.tensionUniformityErrorN=Math.max(...this.segmentTensions)-Math.min(...this.segmentTensions),this._syncConstraints()}resetToCurrentTrim(){this._measureLengths(),this._allocateUniformRest(this.segmentLengths.reduce((e,t)=>e+t,0)),this.targetRest=this.activeRest,this.setTrim(this.scope),this._syncConstraints(),this.constraints.forEach(e=>{e.lambda=0,e.tension=0,e.finite=!0}),this.segmentTensions.fill(0),this.tensionUniformityErrorN=0,this.solverFinite=!0,this.solvedRestM=this.activeRest}get rest(){return this.activeRest}get tension(){return this.workingTensionN}get workingTensionN(){return this.pathConstraint.tension}get tailTensionN(){return this.pathConstraint.tension}get allocationErrorM(){return Math.abs(this.segmentRest.reduce((e,t)=>e+t,0)-this.activeRest)}},qh=class{constructor(e,t,i,r,a=0){this.pA=e,this.pB=t,this.t=i,this.p=r,this.alpha=a,this.lambda=0}solve(e){let{pA:t,pB:i,t:r,p:a}=this;Li.copy(t.x).multiplyScalar(1-r).addScaledVector(i.x,r),ur.copy(a.x).sub(Li);let n=ur.length();if(n<1e-9)return;ur.multiplyScalar(1/n);let o=t.w*(1-r)*(1-r)+i.w*r*r,s=a.w+o;if(s===0)return;let l=this.alpha/(e*e),h=(-n-l*this.lambda)/(s+l);this.lambda+=h,a.x.addScaledVector(ur,h*a.w),t.x.addScaledVector(ur,-h*t.w*(1-r)),i.x.addScaledVector(ur,-h*i.w*r)}},mv=class{constructor(e){this.g=e,this.bodies=[],this.particles=[],this.constraints=[],this.forceHooks=[],this.preSolveHooks=[],this.postHooks=[]}addBody(e){return this.bodies.push(e),e}addParticle(e){return this.particles.push(e),e}addC(e){return this.constraints.push(e),e}step(e,t){let i=e/t;for(let r=0;r<t;r++){for(let n of this.bodies)n.force.set(0,0,0),n.torque.set(0,0,0);for(let n of this.particles)n.f.set(0,0,0);for(let n of this.forceHooks)n(i);for(let n of this.bodies)n.integrate(i,this.g);for(let n of this.particles){if(n.w===0){n.p.copy(n.x);continue}n.p.copy(n.x),n.v.y-=this.g*i,n.v.addScaledVector(n.f,n.w*i),n.damp>0&&n.v.multiplyScalar(Math.max(0,1-n.damp*i)),n.v.lengthSq()>3600&&n.v.setLength(60),n.x.addScaledVector(n.v,i)}for(let n of this.preSolveHooks)n(i);for(let n of this.constraints)n.lambda=0;let a=this.iterations||1;for(let n=0;n<a;n++)for(let o of this.constraints)o.enabled!==!1&&o.solve(i);for(let n of this.bodies)n.updateVelocities(i);for(let n of this.particles)n.w!==0&&n.v.copy(n.x).sub(n.p).multiplyScalar(1/i);for(let n of this.postHooks)n(i)}}};xi();function Yh(e,t){let i=e*Math.PI/180;return t.set(-Math.sin(i),0,Math.cos(i))}function qf(e){return Math.sin(e*1)*.44+Math.sin(e*2.37+1.7)*.3+Math.sin(e*5.11+4.1)*.16+Math.sin(e*9.73+2.3)*.1}var fv=class{constructor(e){this.cfg=e,this.speed10=e.speed0,this.fromDeg=0,this.gustiness=e.gustiness,this.shearExp=e.shearExp,this.time=0,this.curSpeed=this.speed10,this.curFromDeg=0,this._dir=new v}update(e){this.time+=e;let t=this.time;this.curSpeed=Math.max(.4,this.speed10*(1+this.gustiness*qf(t*.55))),this.curFromDeg=this.fromDeg+this.cfg.dirWander*57.2958*qf(t*.23+40)}velocityAt(e,t){let i=Math.max(e.y,.15),r=this.curSpeed*Math.pow(i/10,this.shearExp);return Yh(this.curFromDeg,this._dir),t.copy(this._dir).multiplyScalar(-r)}velocityAtHeight(e,t){let i=this.curSpeed*Math.pow(Math.max(e,.15)/10,this.shearExp);return Yh(this.curFromDeg,this._dir),t.copy(this._dir).multiplyScalar(-i)}};xi();var ka=5,Yf=`
  vec3 skyColor(vec3 dir, vec3 sunDir) {
    float e = max(dir.y, -0.08);
    vec3 zenith  = vec3(0.093, 0.28, 0.55);
    vec3 mid     = vec3(0.44, 0.65, 0.86);
    vec3 horizon = vec3(0.78, 0.86, 0.93);
    vec3 col = mix(horizon, mid, smoothstep(0.0, 0.24, e));
    col = mix(col, zenith, smoothstep(0.18, 0.85, e));
    float sunAmt = max(dot(dir, sunDir), 0.0);
    // warm haze around sun
    col += vec3(1.0, 0.72, 0.42) * pow(sunAmt, 24.0) * 0.28;
    col += vec3(1.0, 0.85, 0.6) * pow(sunAmt, 350.0) * 0.9;
    // horizon warmth toward sun azimuth
    float horizGlow = (1.0 - smoothstep(0.0, 0.28, e)) * pow(sunAmt * 0.5 + 0.5, 3.0);
    col += vec3(0.30, 0.18, 0.08) * horizGlow * 0.35;
    return col;
  }
  vec3 sunDisc(vec3 dir, vec3 sunDir) {
    float d = dot(dir, sunDir);
    float disc = smoothstep(0.99984, 0.99993, d);
    return vec3(1.0, 0.93, 0.80) * disc * 42.0;
  }
`,gv=`
  uniform vec4 waveA[${ka}]; // Dx, Dz, k, omega
  uniform vec4 waveB[${ka}]; // amp, Q, phase, 0
  uniform float uTime;
  uniform float uAmpScale;

  vec3 gerstner(vec2 xz, out vec3 nrm, out float crest) {
    vec3 p = vec3(xz.x, 0.0, xz.y);
    float nx = 0.0, ny = 0.0, nz = 0.0, cr = 0.0;
    for (int i = 0; i < ${ka}; i++) {
      float Dx = waveA[i].x, Dz = waveA[i].y, k = waveA[i].z, w = waveA[i].w;
      float A = waveB[i].x * uAmpScale, Q = waveB[i].y, ph = waveB[i].z;
      float th = k * (Dx * xz.x + Dz * xz.y) - w * uTime + ph;
      float s = sin(th), c = cos(th);
      p.x += Q * A * Dx * c;
      p.z += Q * A * Dz * c;
      p.y += A * s;
      float ka = k * A;
      nx -= Dx * ka * c;
      nz -= Dz * ka * c;
      ny += Q * ka * s;
      cr += Q * ka * s;
    }
    nrm = normalize(vec3(nx, 1.0 - ny, nz));
    crest = cr;
    return p;
  }
`,Kf=`
  ${gv}
  uniform vec3 uCenter;
  varying vec3 vWorld;
  varying vec3 vNrm;
  varying float vCrest;
  void main() {
    vec3 base = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 nrm; float crest;
    vec3 p = gerstner(base.xz, nrm, crest);
    vWorld = p; vNrm = nrm; vCrest = crest;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`,Jf=`
  precision highp float;
  ${Yf}
  uniform vec3 uSunDir;
  uniform vec3 uCamPos;
  uniform float uTime;
  uniform float uWindSpeed;
  varying vec3 vWorld;
  varying vec3 vNrm;
  varying float vCrest;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
  }

  void main() {
    vec3 V = normalize(uCamPos - vWorld);
    float dist = length(uCamPos - vWorld);

    // detail normal ripple (two scrolling octaves), fades with distance
    float dScale = exp(-dist * 0.012);
    vec2 uv1 = vWorld.xz * 0.9 + vec2(uTime * 0.07, uTime * 0.045);
    vec2 uv2 = vWorld.xz * 2.7 - vec2(uTime * 0.11, -uTime * 0.06);
    float e = 0.14;
    float n1x = vnoise(uv1 + vec2(e,0.)) - vnoise(uv1 - vec2(e,0.));
    float n1z = vnoise(uv1 + vec2(0.,e)) - vnoise(uv1 - vec2(0.,e));
    float n2x = vnoise(uv2 + vec2(e,0.)) - vnoise(uv2 - vec2(e,0.));
    float n2z = vnoise(uv2 + vec2(0.,e)) - vnoise(uv2 - vec2(0.,e));
    vec3 N = normalize(vNrm + vec3(n1x*0.35 + n2x*0.18, 0.0, n1z*0.35 + n2z*0.18) * dScale * (0.5 + uWindSpeed*0.05));

    // fresnel
    float F = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);

    // reflection of procedural sky
    vec3 R = reflect(-V, N);
    R.y = abs(R.y) * 0.98 + 0.02;
    vec3 sky = skyColor(normalize(R), uSunDir);

    // water body color \u2014 deep blue with sun-lit green in wave flanks
    vec3 deep = vec3(0.012, 0.10, 0.16);
    vec3 shallow = vec3(0.04, 0.30, 0.33);
    float upSun = max(dot(N, uSunDir), 0.0);
    float scatter = pow(upSun, 2.0) * 0.5 + max(vCrest, 0.0) * 0.35;
    vec3 body = mix(deep, shallow, clamp(scatter, 0.0, 1.0));

    vec3 col = mix(body, sky, F);

    // sun specular
    vec3 Hv = normalize(V + uSunDir);
    float spec = pow(max(dot(N, Hv), 0.0), 640.0) * 3.2
               + pow(max(dot(N, Hv), 0.0), 96.0) * 0.22;
    col += vec3(1.0, 0.92, 0.75) * spec * F * 22.0;

    // foam at crowded crests
    float foamMask = smoothstep(0.62, 1.05, vCrest + vnoise(vWorld.xz*3.1 + uTime*0.2)*0.28);
    float streaks = vnoise(vWorld.xz * vec2(0.25, 1.4) + vec2(0.0, uTime*0.05));
    foamMask *= 0.55 + 0.45*streaks;
    col = mix(col, vec3(0.92, 0.96, 0.97), foamMask * 0.75 * exp(-dist*0.01));

    // aerial perspective toward horizon
    vec3 hazeCol = vec3(0.78, 0.86, 0.93);
    float haze = 1.0 - exp(-dist * 0.00075);
    col = mix(col, hazeCol, haze);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`,_v=`
  varying vec3 vDir;
  void main() {
    vDir = (modelMatrix * vec4(position, 1.0)).xyz;
    vec4 mv = viewMatrix * vec4(vDir + cameraPosition, 1.0);
    gl_Position = (projectionMatrix * mv).xyww; // depth = far
  }
`,vv=`
  precision highp float;
  ${Yf}
  uniform vec3 uSunDir;
  varying vec3 vDir;
  void main() {
    vec3 dir = normalize(vDir);
    vec3 col = skyColor(dir, uSunDir) + sunDisc(dir, uSunDir);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`,xv=class{constructor(e,t,i){this.cfg=t,this.time=0,this.sunDir=i.clone().normalize(),this.comp=[],this.uniforms={waveA:{value:Array.from({length:ka},()=>new gt)},waveB:{value:Array.from({length:ka},()=>new gt)},uTime:{value:0},uAmpScale:{value:1},uSunDir:{value:this.sunDir},uCamPos:{value:new v},uCenter:{value:new v},uWindSpeed:{value:6}};let r=new hh(340,340,210,210);r.rotateX(-Math.PI/2),this.matNear=new Ai({vertexShader:Kf,fragmentShader:Jf,uniforms:this.uniforms}),this.meshNear=new De(r,this.matNear),this.meshNear.frustumCulled=!1,e.add(this.meshNear);let a=new ff(160,6e3,64,4);a.rotateX(-Math.PI/2),this.uniformsFar={...this.uniforms,uAmpScale:{value:0}},this.matFar=new Ai({vertexShader:Kf,fragmentShader:Jf,uniforms:this.uniformsFar}),this.meshFar=new De(a,this.matFar),this.meshFar.frustumCulled=!1,e.add(this.meshFar);let n=new Lr(7e3,32,16);this.skyMat=new Ai({vertexShader:_v,fragmentShader:vv,uniforms:{uSunDir:{value:this.sunDir}},side:Vt,depthWrite:!1}),this.skyMesh=new De(n,this.skyMat),this.skyMesh.frustumCulled=!1,this.skyMesh.renderOrder=-10,e.add(this.skyMesh),this.setSea(6,0)}setSea(e,t){let i=this.cfg.userScale,r=(this.cfg.baseAmp+this.cfg.ampWindFactor*e*e)*.115*i,a=(t+180)*Math.PI/180,n=[{rel:.1,lambda:19,a:r*1},{rel:-.3,lambda:11.5,a:r*.62},{rel:.42,lambda:6.8,a:r*.38},{rel:-.55,lambda:3.6,a:r*.22},{rel:.95,lambda:41,a:r*.42}];this.comp=n.map(o=>{let s=a+o.rel,l=2*Math.PI/o.lambda;return{dx:-Math.sin(s),dz:Math.cos(s),k:l,om:Math.sqrt(9.81*l),amp:o.a,Q:Math.min(.75/(l*o.a*ka),1.15),ph:o.rel*13.7}}),this.comp.forEach((o,s)=>{this.uniforms.waveA.value[s].set(o.dx,o.dz,o.k,o.om),this.uniforms.waveB.value[s].set(o.amp,o.Q,o.ph,0)}),this.uniforms.uWindSpeed.value=e}height(e,t){let i=e,r=t;for(let n=0;n<2;n++){let o=0,s=0;for(let l of this.comp){let h=l.k*(l.dx*i+l.dz*r)-l.om*this.time+l.ph,c=Math.cos(h);o+=l.Q*l.amp*l.dx*c,s+=l.Q*l.amp*l.dz*c}i=e-o,r=t-s}let a=0;for(let n of this.comp){let o=n.k*(n.dx*i+n.dz*r)-n.om*this.time+n.ph;a+=n.amp*Math.sin(o)}return a}velocity(e,t,i){i.set(0,0,0);for(let r of this.comp){let a=r.k*(r.dx*e+r.dz*t)-r.om*this.time+r.ph,n=Math.sin(a),o=Math.cos(a);i.y+=-r.amp*r.om*o,i.x+=r.amp*r.om*r.dx*n,i.z+=r.amp*r.om*r.dz*n}return i}update(e,t,i){this.time=e,this.uniforms.uTime.value=e,this.uniformsFar.uTime=this.uniforms.uTime,this.uniforms.uCamPos.value.copy(t.position);let r=340/210;this.meshNear.position.set(Math.round(i.x/r)*r,0,Math.round(i.z/r)*r),this.meshFar.position.set(i.x,0,i.z)}};xi();function Pi(e,t,i){return e+(t-e)*i}function Kh(e){return Math.min(1,Math.max(0,e))}function Ba(e){return e=Kh(e),e*e*(3-2*e)}var Ie={halfLen:2.2,halfWidth(e){let t;return e<.45?t=Pi(.775,1,Math.pow(Ba(e/.45),.9)):t=Math.pow(Math.cos((e-.45)/.55*Math.PI/2),1.18),Math.max(.016,.71*t)},keelY(e){return e<.42?Pi(-.052,-.165,Math.pow(Ba(e/.42),.8)):Pi(-.165,.155,Math.pow((e-.42)/.58,2.15))},sheerY(e){return .365+.045*e+.14*e*e*e},power(e){return e<.45?Pi(3.4,2.5,e/.45):Pi(2.5,1.5,Ba((e-.45)/.55))},z(e){return-this.halfLen+2*this.halfLen*e},point(e,t,i){let r=this.halfWidth(e),a=this.keelY(e),n=this.sheerY(e),o=this.power(e),s=Math.abs(t),l=a+(n-a)*Math.pow(s,o),h=1+.05*Math.pow(s,6);return i.set(t*r*h,l,this.z(e))},cockpit(e,t){let i=this.halfWidth((t+this.halfLen)/(2*this.halfLen))-.175,r=1-Ba((Math.abs(e)-(i-.07))/.09),a=Ba((t+1.78)/.1),n=1-Ba((t-.3)/.1);return r*a*n},deckY(e,t){let i=Kh((t+this.halfLen)/(2*this.halfLen)),r=this.halfWidth(i),a=this.sheerY(i),n=.045*(1-Math.pow(Math.min(Math.abs(e)/Math.max(r,.01),1),2)),o=a+n;return Pi(o,.155,this.cockpit(e,t))},seatPad:{centerX:.565,centerZ:-.65,width:.28,length:1.7,height:.018},seatSurfaceY(e,t){let i=this.seatPad,r=Math.abs(Math.abs(e)-i.centerX)<=i.width*.5&&Math.abs(t-i.centerZ)<=i.length*.5,a=this.deckY(i.centerX,i.centerZ)+.012+i.height*.5;return r?Math.max(this.deckY(e,t),a):this.deckY(e,t)},soleSurfaceY(e,t){return Math.max(this.deckY(e,t),.16249999999999998)}};function yv(){let e=document.createElement("canvas");e.width=e.height=1024;let t=e.getContext("2d"),i=(o,s)=>[(o-.5)*1.55*2,(s-.5)*4.4];t.fillStyle="#eceee8",t.fillRect(0,0,1024,1024);let r=t.getImageData(0,0,1024,1024),a=r.data;for(let o=0;o<1024;o++)for(let s=0;s<1024;s++){let[l,h]=i(s/1024,o/1024),c=Ie.cockpit(l,h),u=Kh((h+2.2)/4.4),p=Ie.halfWidth(u),m=Math.abs(l),g=236,_=238,f=232,d=c<.02&&m<p-.01&&m>p-.185&&h>-1.95&&h<.55,M=c<.02&&h>.62&&h<1.75&&m<p*.82;(d||M)&&(g=62,_=92,f=138),c>.6&&(g=176,_=182,f=178);let x=(Math.sin(s*12.9898+o*78.233)*43758.5453%1-.5)*(d||M?26:8),S=(o*1024+s)*4;a[S]=g+x,a[S+1]=_+x,a[S+2]=f+x,a[S+3]=255}t.putImageData(r,0,0);let n=new Nh(e);return n.colorSpace=vt,n.anisotropy=4,n}function Mv(){let e=[],t=[],i=new v;for(let n=0;n<34;n++){let o=Math.pow(n/33,.92);for(let s=0;s<25;s++){let l=-1+2*(s/24);Ie.point(o,l,i),e.push(i.x,i.y,i.z),t.push(o,s/24)}}let r=[];for(let n=0;n<33;n++)for(let o=0;o<24;o++){let s=n*25+o,l=s+25;r.push(s,s+1,l,l,s+1,l+1)}let a=new St;return a.setAttribute("position",new Je(e,3)),a.setAttribute("uv",new Je(t,2)),a.setIndex(r),a.computeVertexNormals(),a}function bv(){let e=[],t=[];for(let a=0;a<60;a++){let n=a/59,o=Ie.z(n),s=Ie.halfWidth(n)*(1+.05);for(let l=0;l<33;l++){let h=(-1+2*(l/32))*s;e.push(h,Ie.deckY(h,o)+.002,o),t.push(h/(1.55*2)+.5,o/4.4+.5)}}let i=[];for(let a=0;a<59;a++)for(let n=0;n<32;n++){let o=a*33+n,s=o+33;i.push(o,s,o+1,s,s+1,o+1)}let r=new St;return r.setAttribute("position",new Je(e,3)),r.setAttribute("uv",new Je(t,2)),r.setIndex(i),r.computeVertexNormals(),r}function Sv(){let e=[],t=new v,i=0;for(let o=0;o<25;o++){let s=-1+2*(o/24);Ie.point(i,s,t),e.push(t.x,t.y,t.z)}let r=Ie.halfWidth(0)*1.05;for(let o=0;o<25;o++){let s=(-1+2*(o/24))*r;e.push(s,Ie.deckY(s,-Ie.halfLen)+.002,-Ie.halfLen)}let a=[];for(let o=0;o<24;o++){let s=o,l=o+25;a.push(s,l,s+1,l,l+1,s+1)}let n=new St;return n.setAttribute("position",new Je(e,3)),n.setIndex(a),n.computeVertexNormals(),n}function wv(){let e=[],t=new v,i=1;for(let o=0;o<25;o++){let s=-1+2*(o/24);Ie.point(i,s,t),e.push(t.x,t.y,t.z)}let r=Ie.halfWidth(i)*1.05;for(let o=0;o<25;o++){let s=(-1+2*(o/24))*r;e.push(s,Ie.deckY(s,Ie.halfLen)+.002,Ie.halfLen)}let a=[];for(let o=0;o<24;o++){let s=o,l=o+25;a.push(s,s+1,l,l,s+1,l+1)}let n=new St;return n.setAttribute("position",new Je(e,3)),n.setIndex(a),n.computeVertexNormals(),n}function Zf(e,t,i){let r=[];for(let s=0;s<=18;s++){let l=s/18,h=i*5*(.2969*Math.sqrt(l)-.126*l-.3516*l*l+.2843*l**3-.1015*l**4);r.push(new xe(l*e-e*.35,h*e))}for(let s=18;s>=0;s--){let l=s/18,h=i*5*(.2969*Math.sqrt(l)-.126*l-.3516*l*l+.2843*l**3-.1015*l**4);r.push(new xe(l*e-e*.35,-h*e))}let a=new Hh(r),n=new pf(a,{depth:t,bevelEnabled:!1}),o=n.attributes.position;for(let s=0;s<o.count;s++){let l=o.getZ(s),h=1-.45*Math.pow(l/t,2.2);o.setX(s,o.getX(s)*h),o.setY(s,o.getY(s)*h)}return n.rotateX(Math.PI/2),n.computeVertexNormals(),n}function Ev(e){let t=new ji,i=new aa({color:16053746,roughness:.32,clearcoat:.55,clearcoatRoughness:.25}),r=new aa({map:yv(),roughness:.72,clearcoat:.12}),a=new vi({color:2106410,roughness:.55,metalness:.15}),n=new vi({color:10134187,roughness:.38,metalness:.9}),o=new aa({color:1119515,roughness:.3,clearcoat:.5}),s=new De(Mv(),i);s.castShadow=!0,s.receiveShadow=!0,t.add(s);let l=new De(bv(),r);l.castShadow=!0,l.receiveShadow=!0,t.add(l);let h=new De(Sv(),i);h.castShadow=!0,t.add(h);let c=new De(wv(),i);c.castShadow=!0,t.add(c);let u=new aa({color:15198183,roughness:.76,clearcoat:.08}),p=new aa({color:3493222,roughness:.94,clearcoat:.02}),m=new De(new Ft(.82,.035,2.08),u);m.position.set(0,.145,-.73),m.receiveShadow=!0,t.add(m);for(let O of[-1,1]){let U=new De(new Ft(.035,.245,2.08),u),K=new De(new Ft(.045,.09,2.12),a),j=new De(new Ft(Ie.seatPad.width,Ie.seatPad.height,Ie.seatPad.length),p),I=O*Ie.seatPad.centerX,W=Ie.seatPad.centerZ;U.position.set(O*.43,.275,-.73),K.position.set(O*.465,.425,-.73),j.position.set(I,Ie.deckY(I,W)+.012,W),U.receiveShadow=!0,K.castShadow=!0,j.receiveShadow=!0,t.add(U,K,j)}let g=new De(new Ft(.88,.24,.045),u);g.position.set(0,.27,.32),g.receiveShadow=!0,t.add(g);let _=[],f=new v;for(let O=0;O<=50;O++)Ie.point(O/50,-1,f),_.push(f.clone());for(let O=50;O>=0;O--)Ie.point(O/50,1,f),_.push(f.clone());let d=new Ih(_,!0),M=new De(new gf(d,160,.022,8,!0),a);M.castShadow=!0,t.add(M);let x=new De(new _i(.055,.07,.045,16),n);x.position.set(0,Ie.deckY(0,e.mast.stepLocal.z)+.02,e.mast.stepLocal.z),t.add(x);let S=new De(new Ft(.05,.03,.12),n);S.position.set(0,Ie.deckY(0,2.02)+.015,2.02),t.add(S);for(let O of[-1,1]){let U=new De(new Ft(.018,.09,.045),n);U.position.set(e.rig.shroudLocal.x*O,Ie.deckY(e.rig.shroudLocal.x*O,e.rig.shroudLocal.z)+.03,e.rig.shroudLocal.z),t.add(U)}for(let O of[-1,1]){let U=new De(new Gh(.022,.007,8,14),n);U.position.set(e.rig.travelerLocal.x*O,Ie.deckY(e.rig.travelerLocal.x*O,-2.02)+.03,-2.05),U.rotation.x=Math.PI/2,t.add(U)}let D=new De(new _i(.035,.035,.03,14),a);D.position.set(0,.19,-.75),t.add(D);for(let O of[-1,1]){let U=new De(new Ft(.05,.008,1.5),a);U.position.set(.22*O,.2,-.7),t.add(U)}for(let O of[-1,1]){let U=new De(new _i(.02,.028,.03,10),a);U.position.set(e.jib.fairleadLocal.x*O,Ie.deckY(e.jib.fairleadLocal.x*O,e.jib.fairleadLocal.z)+.015,e.jib.fairleadLocal.z),t.add(U)}let R=e.foils.board,L=new De(Zf(.34,R.span+.35,.1),o);L.position.set(0,.3,R.z),L.castShadow=!0,t.add(L);let B=new De(new Ft(.05,.02,.42),a);B.position.set(0,.165,R.z),t.add(B);let b=new ji;b.position.set(0,.18,e.foils.rudder.z);let E=e.foils.rudder,F=new De(Zf(.27,E.span+.25,.11),o);F.position.set(0,.06,-.03),F.castShadow=!0,b.add(F);let V=new De(new Ft(.05,.16,.1),a);V.position.set(0,.05,0),b.add(V);let Q=new De(new _i(.016,.02,1.15,8),a);Q.rotation.x=Math.PI/2-.12,Q.position.set(0,.16,.56),b.add(Q),t.add(b);let P=new De(new _i(.011,.013,1,8),n);P.castShadow=!0,t.add(P);let z=new vi({color:9383722,roughness:.9}),C=new De(new Lr(.16,12,8),z);C.scale.set(1.15,.55,1.3),C.position.set(e.spin.bagLocal.x,Ie.deckY(e.spin.bagLocal.x,e.spin.bagLocal.z)+.05,e.spin.bagLocal.z),t.add(C);let G=new De(new Gh(.05,.012,8,16,Math.PI),a);return G.position.set(0,Ie.deckY(0,2.1)+.01,2.12),G.rotation.set(-Math.PI/2,0,Math.PI/2),t.add(G),t.traverse(O=>{O.isMesh&&(O.castShadow=!0)}),{group:t,rudderPivot:b,extension:P}}function Tv(e){let t=[],i=new v,r=0;for(let n=0;n<12;n++){let o=(n+.5)/12,s=Ie.halfWidth(o),l=Ie.keelY(o),h=Ie.sheerY(o),c=s*(h-l),u=[{x:0,y:l+.035,w:.08,th:.14},{x:-.52,y:Pi(l,0,.45),w:.06,th:.15},{x:.52,y:Pi(l,0,.45),w:.06,th:.15},{x:-.45,y:.005,w:.16,th:.13},{x:.45,y:.005,w:.16,th:.13},{x:-.85,y:.015,w:.22,th:.18},{x:.85,y:.015,w:.22,th:.18},{x:-.97,y:h-.05,w:.08,th:.26},{x:.97,y:h-.05,w:.08,th:.26}];for(let p of u){let m=c*p.w;r+=m,t.push({local:new v(p.x*s,p.y,Ie.z(o)),vol:m,th:p.th})}}let a=(e.hull.massHull+e.hull.massCrew+e.hull.massFoils)/e.env.rhoWater*2.1/r;for(let n of t)n.vol*=a,n.area=Math.pow(n.vol,2/3);return t}xi();var ao=new v;function Av(e,t,i,r,a){let n=i.mast,o=new v(n.stepLocal.x,Ie.deckY(0,n.stepLocal.z)+.02,n.stepLocal.z),s=n.nodes,l=n.height/(s-1),h=[];for(let X=0;X<s;X++){let se=o.clone();se.y+=X*l;let ce=r(se),w=new oa(ce.x,ce.y,ce.z,s/n.massTotal);w.damp=1.3,h.push(e.addParticle(w))}e.addC(new Gt(t,a(o),h[0],0,1e-9));for(let X=0;X<s-1;X++)e.addC(new _t(h[X],h[X+1],l,n.stretchCompliance));let c=Math.round(n.spreaderFrac*(s-1));for(let X=1;X<s-1;X++){let se=X/(s-1)>.62?n.bendComplianceHigh:n.bendComplianceLow;X<=c+1&&(se*=n.diamondStiffen),e.addC(new _t(h[X-1],h[X+1],2*l,se)),X>=2&&X<=s-3&&e.addC(new _t(h[X-2],h[X+2],4*l,se*2.5))}for(let[X,se,ce]of[[0,s-1,25e-6],[0,6,12e-6],[5,s-1,15e-6],[1,7,15e-6],[3,9,15e-6],[2,s-1,2e-5]])e.addC(new _t(h[X],h[se],l*(se-X),ce));let u=Math.round(n.houndsFrac*(s-1)),p=h[u],m=Math.min(u-1,c*2-1),g=[];for(let X of[-1,1]){let se=o.clone();se.y+=c*l,se.x+=X*n.spreaderLen,se.z-=.16;let ce=r(se),w=new oa(ce.x,ce.y,ce.z,1/.15);w.damp=.5,e.addParticle(w);for(let y of[-1,0,1]){let k=h[c+y];e.addC(new _t(w,k,w.x.distanceTo(k.x),1e-6))}e.addC(new _t(h[m],w,h[m].x.distanceTo(w.x),4e-7,"tension")),e.addC(new _t(h[0],w,h[0].x.distanceTo(w.x),4e-7,"tension")),g.push(w)}let _=[],f=[];for(let X of[-1,1]){let se=new v(i.rig.shroudLocal.x*X,Ie.deckY(i.rig.shroudLocal.x*X,i.rig.shroudLocal.z)+.05,i.rig.shroudLocal.z);_.push(se);let ce=g[X<0?0:1];f.push(e.addC(new _t(p,ce,p.x.distanceTo(ce.x),i.rig.shroudCompliance,"tension")));let w=a(se),y=ce.x.distanceTo(r(se));f.push(e.addC(new Gt(t,w,ce,y,i.rig.shroudCompliance,"tension"))),f.push(e.addC(new Gt(t,w,p,p.x.distanceTo(r(se)),i.rig.shroudCompliance,"tension")))}let d=new v(i.rig.forestayLocal.x,Ie.deckY(0,i.rig.forestayLocal.z)+.04,i.rig.forestayLocal.z),M=e.addC(new Gt(t,a(d),p,p.x.distanceTo(r(d))*1.008,i.rig.forestayCompliance,"tension")),x=i.boom,S=n.gooseneckH,D=S/l,R=Math.floor(D),L=D-R,B=[0,x.vangZ,1.6,2.70,x.sheetZ],b=[],E=o.clone();E.y+=S;for(let X of B){let se=E.clone();se.z-=X;let ce=r(se),w=new oa(ce.x,ce.y,ce.z,B.length/x.massTotal);w.damp=.25,b.push(e.addParticle(w))}e.addC(new qh(h[R],h[R+1],L,b[0],1e-9));for(let X=0;X<b.length-1;X++)e.addC(new _t(b[X],b[X+1],B[X+1]-B[X],1e-9));e.addC(new _t(b[0],b[b.length-1],x.sheetZ,5e-9)),e.addC(new _t(b[0],b[2],1.6,2e-8));let F=e.addC(new _t(b[1],h[0],i.rig.vangMax*.92,i.rig.ropeCompliance,"tension")),V=i.rig.travelerLocal,Q=[-1,1].map(X=>new v(V.x*X,Ie.deckY(V.x*X,V.z)+.03,V.z)),P=new v(0,Q[0].y+i.rig.bridleApexH,V.z),z=r(P),C=new oa(z.x,z.y,z.z,1/.06);C.damp=1.5,e.addParticle(C);let G=Q.map(X=>e.addC(new Gt(t,a(X),C,P.distanceTo(X),i.rig.ropeCompliance,"tension"))),O=new v(0,.22,-.75),U=new pv(e,{body:t},{boomAft:b[3],boomMid:b[2],apex:C,ratchetLocal:a(O),EA:9e4,haulRateMps:1.2,easeRateMps:2,initialScope:.5}),K=[];e.preSolveHooks.push(X=>U.preSubstep(X)),e.postHooks.push(()=>U.postSubstep());{let X=x.maxSwingDeg*Math.PI/180,se=new v(0,E.y,2.05),ce=new v(Math.sin(X)*x.sheetZ,E.y,E.z-Math.cos(X)*x.sheetZ).distanceTo(se);K.push(e.addC(new Gt(t,a(se),b[4],ce,1e-7,"compress")))}let j=new ji,I=new vi({color:6055280,roughness:.42,metalness:.85}),W=new vi({color:13159892,roughness:.35,metalness:.9}),he=8,me=new _i(1,1,1,he,s-1,!0),q=new De(new St,I);q.castShadow=!0,q.frustumCulled=!1,j.add(q);{let X=s,se=he,ce=new Float32Array(X*(se+1)*3),w=[];for(let y=0;y<X-1;y++)for(let k=0;k<se;k++){let le=y*(se+1)+k,oe=le+se+1;w.push(le,oe,le+1,oe,oe+1,le+1)}q.geometry.setAttribute("position",new Ht(ce,3)),q.geometry.setIndex(w)}let $=new De(new _i(.032,.036,1,8,1),I);$.castShadow=!0,j.add($);let pe=g.map(()=>{let X=new De(new _i(.012,.015,1,6),I);return X.castShadow=!0,j.add(X),X});function ne(){let X=new De(new _i(.004,.004,1,5),W);return j.add(X),X}let re={shroudUp:[ne(),ne()],shroudLo:[ne(),ne()],forestay:ne()},T=new v,ae=new v;function te(X,se,ce){X.position.copy(se).add(ce).multiplyScalar(.5),ao.copy(ce).sub(se);let w=ao.length();X.scale.set(1,w,1),X.quaternion.setFromUnitVectors(new v(0,1,0),ao.normalize())}let ie=new v;function ee(){let X=q.geometry.attributes.position,se=he,ce=T,w=ae,y=ao;for(let k=0;k<s;k++){let le=h[k].x,oe=h[Math.min(k+1,s-1)].x,ue=h[Math.max(k-1,0)].x;ce.copy(oe).sub(ue).normalize(),w.set(1,0,0).cross(ce),w.lengthSq()<.01&&w.set(0,0,1).cross(ce),w.normalize(),y.crossVectors(ce,w);let Re=0.032-0.01*(k/(s-1));for(let fe=0;fe<=se;fe++){let Me=fe/se*Math.PI*2,Te=(k*(se+1)+fe)*3;X.array[Te]=le.x+(Math.cos(Me)*w.x+Math.sin(Me)*y.x)*Re,X.array[Te+1]=le.y+(Math.cos(Me)*w.y+Math.sin(Me)*y.y)*Re,X.array[Te+2]=le.z+(Math.cos(Me)*w.z+Math.sin(Me)*y.z)*Re}}X.needsUpdate=!0,q.geometry.computeVertexNormals(),te($,b[0].x,b[4].x),ie.copy(b[0].x);for(let k=0;k<2;k++){let le=g[k];te(pe[k],h[c].x,le.x),te(re.shroudUp[k],p.x,le.x),t.localToWorld(a(_[k]),T),te(re.shroudLo[k],le.x,T)}t.localToWorld(a(d),T),te(re.forestay,p.x,T)}return{mast:h,boom:b,hounds:p,houndsNode:u,spreaderTips:g,bridleApex:C,vangC:F,sheetC:U,sheetVisualRest:2.2,sheetRatchetD:O,forestayC:M,bridleLegs:G,shroudCs:f,stops:K,segLen:l,stepD:o,gooseD:E,stemD:d,chainD:_,eyeDs:Q,apexD:P,gooseneckWorld:ie,group:j,update:ee}}xi();var $t=new v,Di=new v,Pr=new v,Ki=new v,pr=new v,mr=new v,no=new v;function Ji(e,t,i){return e+(t-e)*i}var Jh=class{constructor(e,t,i,r,a,n,o,s={}){this.world=e,this.rows=t,this.cols=i,this.parts=[];let l=t*i/a;for(let f=0;f<t;f++){let d=[];for(let M=0;M<i;M++){let x=r(f,M),S=new oa(x.x,x.y,x.z,l);S.damp=s.damp??.08,e.addParticle(S),d.push(S)}this.parts.push(d)}let h=s.designFn||r,c=[];for(let f=0;f<t;f++){c.push([]);for(let d=0;d<i;d++)c[f].push(h(f,d).clone())}this.cons=[];let u=(f,d,M,x)=>{let S=new _t(f,d,M,x);return e.addC(S),this.cons.push(S),S};this.vertCons=[];for(let f=0;f<i;f++)this.vertCons.push([]);for(let f=0;f<t;f++)for(let d=0;d<i;d++)d+1<i&&u(this.parts[f][d],this.parts[f][d+1],c[f][d].distanceTo(c[f][d+1]),n.stretch),f+1<t&&this.vertCons[d].push(u(this.parts[f][d],this.parts[f+1][d],c[f][d].distanceTo(c[f+1][d]),n.stretch)),f+1<t&&d+1<i&&(u(this.parts[f][d],this.parts[f+1][d+1],c[f][d].distanceTo(c[f+1][d+1]),n.shear),u(this.parts[f+1][d],this.parts[f][d+1],c[f+1][d].distanceTo(c[f][d+1]),n.shear)),d+2<i&&u(this.parts[f][d],this.parts[f][d+2],c[f][d].distanceTo(c[f][d+2]),s.battenRows&&s.battenRows.includes(f)?s.battenBend:n.bend),f+2<t&&u(this.parts[f][d],this.parts[f+2][d],c[f][d].distanceTo(c[f+2][d]),n.bend);let p=new St,m=t*i;p.setAttribute("position",new Ht(new Float32Array(m*3),3));let g=new Float32Array(m*2);for(let f=0;f<t;f++)for(let d=0;d<i;d++)g[(f*i+d)*2]=d/(i-1),g[(f*i+d)*2+1]=f/(t-1);p.setAttribute("uv",new Ht(g,2));let _=[];for(let f=0;f<t-1;f++)for(let d=0;d<i-1;d++){let M=f*i+d,x=M+i;_.push(M,x,M+1,x,x+1,M+1)}p.setIndex(_),this.mesh=new De(p,new aa({map:o,side:Ti,roughness:.62,color:16777215,emissive:16777215,emissiveIntensity:.055,...s.matProps||{}})),this.mesh.frustumCulled=!1,this.mesh.castShadow=!0,this.mesh.receiveShadow=!1,this.tris=[];for(let f=0;f<_.length;f+=3)this.tris.push([_[f],_[f+1],_[f+2]]);this.flat=[];for(let f=0;f<t;f++)for(let d=0;d<i;d++)this.flat.push(this.parts[f][d]);this.aeroScale=1}applyAero(e,t,i,r,a,n=.4){let o=this.flat;for(let s of this.tris){let l=o[s[0]],h=o[s[1]],c=o[s[2]];no.copy(l.x).add(h.x).add(c.x).multiplyScalar(1/3),e(no,pr),$t.copy(pr),$t.x-=(l.v.x+h.v.x+c.v.x)/3,$t.y-=(l.v.y+h.v.y+c.v.y)/3,$t.z-=(l.v.z+h.v.z+c.v.z)/3,Pr.copy(h.x).sub(l.x),Ki.copy(c.x).sub(l.x),Di.crossVectors(Pr,Ki);let u=Di.length();if(u<1e-8)continue;Di.multiplyScalar(1/u);let p=u*.5,m=$t.length();if(m<1e-6)continue;let g=$t.dot(Di),_=Math.abs(g)/m,f=1-Math.min(Math.max((_-n)/(n*.7),0),1),d=.5*i*p*m*g*(r*f+a*(1-.3*f))*this.aeroScale;mr.copy(Di).multiplyScalar(d/3),l.f.add(mr),h.f.add(mr),c.f.add(mr)}if(t)for(let s of this.flat){let l=t(s.x.x,s.x.z);if(s.x.y<l){let h=Math.min(l-s.x.y,.5);s.f.y+=h*14/s.w*9.81*.9,s.f.addScaledVector(s.v,-6/s.w)}}}syncMesh(){let e=this.mesh.geometry.attributes.position.array,t=0;for(let i of this.flat)e[t++]=i.x.x,e[t++]=i.x.y,e[t++]=i.x.z;this.mesh.geometry.attributes.position.needsUpdate=!0,this.mesh.geometry.computeVertexNormals()}applyStripAero(e,t,i={}){let r=this.rows,a=this.cols,n=i.clAlpha??5,o=i.camberK??1.7,s=i.stallSin??.5,l=i.cd0??.02,h=i.ar??4;if(!this._stripArea){this._stripArea=[];let u=0;for(let m=0;m<r;m++){let g=this.parts[m][0].x.distanceTo(this.parts[m][a-1].x),_=m===0||m===r-1?.5:1;this._stripArea.push(g*_),u+=g*_}let p=i.area??7;this._stripArea=this._stripArea.map(m=>m/u*p)}let c=Math.floor(a/2);for(let u=0;u<r;u++){let p=this.parts[u][0],m=this.parts[u][a-1];Pr.copy(m.x).sub(p.x);let g=Pr.length();if(g<.02)continue;Pr.multiplyScalar(1/g);let _=this.parts[Math.max(u-1,0)],f=this.parts[Math.min(u+1,r-1)];if(Ki.set(f[0].x.x+f[a-1].x.x-_[0].x.x-_[a-1].x.x,f[0].x.y+f[a-1].x.y-_[0].x.y-_[a-1].x.y,f[0].x.z+f[a-1].x.z-_[0].x.z-_[a-1].x.z),Ki.lengthSq()<1e-8)continue;Ki.normalize(),no.copy(p.x).add(m.x).multiplyScalar(.5),e(no,pr),$t.copy(pr),$t.x-=(p.v.x+m.v.x+this.parts[u][c].v.x)/3,$t.y-=(p.v.y+m.v.y+this.parts[u][c].v.y)/3,$t.z-=(p.v.z+m.v.z+this.parts[u][c].v.z)/3,$t.addScaledVector(Ki,-$t.dot(Ki));let d=$t.length();if(d<.15)continue;pr.copy($t).multiplyScalar(1/d),Di.crossVectors(Pr,pr);let M=Ye.clamp(Di.dot(Ki),-1,1),x=Ye.clamp(Pr.dot(pr),-1,1);Di.crossVectors(Pr,Ki).normalize(),mr.copy(this.parts[u][c].x).sub(p.x);let S=mr.dot(Di)/g,D=M-o*S,R=Math.abs(D),L=x>-.2?1-Math.min(Math.max((R-s)/(s*.8),0),1):0,B=n*D,b=2.3*M*Math.abs(x),E=L*B+(1-L)*b,F=l+L*(E*E)/(Math.PI*h*.85)+(1-L)*1.3*M*M,V=.5*t*d*d*this._stripArea[u]*this.aeroScale;Di.crossVectors(Ki,pr),mr.copy(Di).multiplyScalar(V*E),mr.addScaledVector(pr,V*F);let Q=a-1;for(let P=0;P<a;P++){let z=P===0||P===a-1?.5:1;this.parts[u][P].f.addScaledVector(mr,z/Q)}}}};function Zh(e,t,i){let r=document.createElement("canvas");r.width=e,r.height=t,i(r.getContext("2d"),e,t);let a=new Nh(r);return a.colorSpace=vt,a.anisotropy=4,a}function Rv(){return Zh(512,1024,(e,t,i)=>{e.fillStyle="#f6f4ec",e.fillRect(0,0,t,i),e.strokeStyle="rgba(150,148,138,0.55)",e.lineWidth=2;for(let r=1;r<9;r++){let a=i-r/9*i;e.beginPath(),e.moveTo(0,a),e.lineTo(t,a),e.stroke()}e.strokeStyle="rgba(140,138,128,0.8)",e.lineWidth=7,e.strokeRect(3,3,t-6,i-6),e.fillStyle="rgba(205,200,185,0.9)",e.beginPath(),e.moveTo(0,i),e.lineTo(110,i),e.lineTo(0,i-110),e.fill(),e.beginPath(),e.moveTo(t,i),e.lineTo(t-130,i),e.lineTo(t,i-130),e.fill(),e.beginPath(),e.moveTo(0,0),e.lineTo(90,0),e.lineTo(0,120),e.fill(),e.fillStyle="rgba(180,205,215,0.85)",e.fillRect(t*.18,i*.8,t*.42,i*.085),e.strokeStyle="rgba(120,120,115,0.7)",e.lineWidth=3,e.strokeRect(t*.18,i*.8,t*.42,i*.085),e.save(),e.translate(t*.42,i*.3),e.rotate(-.18),e.fillStyle="#c92a1e",e.font="bold 130px sans-serif",e.fillText("2",-30,0),e.strokeStyle="#c92a1e",e.lineWidth=12,e.beginPath(),e.moveTo(-58,22),e.lineTo(72,-78),e.stroke(),e.restore(),e.fillStyle="#22242a",e.font="bold 64px sans-serif",e.fillText("42607",t*.3,i*.52),e.strokeStyle="rgba(160,158,148,0.9)",e.lineWidth=10;for(let r of[.2,.4,.6,.8])e.beginPath(),e.moveTo(t,i-r*i),e.lineTo(t-120,i-r*i),e.stroke()})}function Cv(){return Zh(512,1024,(e,t,i)=>{e.fillStyle="#f6f4ec",e.fillRect(0,0,t,i),e.strokeStyle="rgba(150,148,138,0.55)",e.lineWidth=2;for(let r=1;r<6;r++){let a=i-r/6*i;e.beginPath(),e.moveTo(0,a),e.lineTo(t,a),e.stroke()}e.strokeStyle="rgba(140,138,128,0.8)",e.lineWidth=7,e.strokeRect(3,3,t-6,i-6),e.fillStyle="rgba(205,200,185,0.9)",e.beginPath(),e.moveTo(0,i),e.lineTo(100,i),e.lineTo(0,i-100),e.fill(),e.beginPath(),e.moveTo(t,i),e.lineTo(t-110,i),e.lineTo(t,i-110),e.fill()})}function Lv(){return Zh(512,512,(e,t,i)=>{e.fillStyle="#e8e6e2",e.fillRect(0,0,t,i),e.fillStyle="#c22730",e.beginPath(),e.moveTo(t/2,0),e.lineTo(0,i),e.lineTo(0,0),e.fill(),e.fillStyle="#1d2f5e",e.beginPath(),e.moveTo(t/2,0),e.lineTo(t,i),e.lineTo(t,0),e.fill(),e.strokeStyle="rgba(120,120,120,0.35)",e.lineWidth=2;for(let r=0;r<=10;r++)e.beginPath(),e.moveTo(t/2,0),e.lineTo(r/10*t,i),e.stroke();for(let r=1;r<5;r++)e.beginPath(),e.moveTo(0,r*i/5),e.lineTo(t,r*i/5),e.stroke()})}function Pv(e,t,i,r){let a=t.main,n=a.rows,o=a.cols,s=t.mast.gooseneckH,l=t.mast.height*a.headFrac,h=x=>s+(l-s)*(x/(n-1)),c=x=>{let S=x/(n-1);return Ji(a.foot,.14,Math.pow(S,1.05))*(1+a.roach*Math.pow(Math.sin(Math.PI*S),1.4))},u=i.stepD,p=(x,S)=>{let D=h(x),R=x/(n-1),L=S/(o-1);return r(new v(u.x+.02*Math.sin(Math.PI*R)*Math.sin(Math.PI*L),u.y+D,u.z-.05-L*c(x)))},m=(x,S)=>{let D=h(x),R=x/(n-1),L=S/(o-1),B=(.115-.045*R)*c(x);return new v(u.x+B*Math.sin(Math.PI*L),u.y+D,u.z-.05-L*c(x))},g=new Jh(e,n,o,p,a.area*a.clothDensity,{stretch:a.stretchCompliance,shear:a.shearCompliance,bend:a.bendCompliance},Rv(),{battenRows:a.battenRows,battenBend:a.battenBendCompliance,designFn:m}),_=i.segLen;for(let x=0;x<n;x++){let S=h(x)/_,D=Math.min(Math.floor(S),i.mast.length-2);e.addC(new qh(i.mast[D],i.mast[D+1],S-D,g.parts[x][0],2e-9))}e.addC(new _t(g.parts[0][0],i.boom[0],.06,1e-8));let f=e.addC(new _t(g.parts[0][o-1],i.boom[3],.1,t.rig.ropeCompliance,"tension")),d=e.addC(new _t(g.parts[0][o-1],i.boom[2],g.parts[0][o-1].x.distanceTo(i.boom[2].x)+.05,t.rig.ropeCompliance,"tension")),M=g.vertCons[0].map(x=>x.rest);return{cloth:g,outhaulC:f,clewDown:d,setCunningham(x){g.vertCons[0].forEach((S,D)=>{D<5&&(S.rest=M[D]*(1-.05*x))})},setOuthaul(x){f.rest=Ji(.3,.02,x)}}}function Dv(e,t,i,r,a,n){let o=t.jib,s=o.rows,l=o.cols,h=new v(o.tackLocal.x,o.tackLocal.y,o.tackLocal.z),c=i.hounds,u=new v(i.stepD.x,i.stepD.y+i.houndsNode*i.segLen,i.stepD.z).clone().sub(h).setLength(o.luff),p=S=>Ji(o.foot,.05,Math.pow(S/(s-1),1)),m=(S,D)=>{let R=S/(s-1),L=D/(l-1),B=h.clone().addScaledVector(u,R);return B.add(new v(.015*L*Math.sin(Math.PI*R),-.12*L*(1-R*.6),-L*p(S))),n(B)},g=(S,D)=>{let R=S/(s-1),L=D/(l-1),B=h.clone().addScaledVector(u,R),b=(.105-.04*R)*p(S);return B.add(new v(.015*L*Math.sin(Math.PI*R)+b*Math.sin(Math.PI*L),-.12*L*(1-R*.6),-L*p(S))),B},_=new Jh(e,s,l,m,o.area*o.clothDensity,{stretch:o.stretchCompliance,shear:o.shearCompliance,bend:o.bendCompliance},Cv(),{designFn:g}),f=[];_.vertCons[0].forEach(S=>{S.alpha=o.luffWireCompliance,f.push(S.rest)}),e.addC(new Gt(r,a(h),_.parts[0][0],.05,1e-8)),e.addC(new _t(_.parts[s-1][0],c,.08,1e-8));let d=_.parts[0][l-1],M=[-1,1].map(S=>new v(o.fairleadLocal.x*S,o.fairleadLocal.y,o.fairleadLocal.z)),x=M.map(S=>e.addC(new Gt(r,a(S),d,1.5,t.rig.ropeCompliance,"tension")));return{cloth:_,generatedLuffM:f.reduce((S,D)=>S+D,0),generatedLuffRestM:[...f],sheetCs:x,flD:M,clew:d,setHalyard(S){let D=1+(1-S)*(o.halyardSagRange/4);_.vertCons[0].forEach((R,L)=>R.rest=f[L]*Ji(1.012,.998,S))},setTrim(S,D){let R=Ji(2.6,.98,S);x[0].rest=D>0?R:R+2.2,x[1].rest=D<0?R:R+2.2}}}function Uv(e,t,i,r,a,n){let o=t.spin,s=o.rows,l=o.cols,h=new v(o.bagLocal.x,o.bagLocal.y,o.bagLocal.z),c=n(h),u=(ne,re)=>{let T=ne/(s-1),ae=Math.max(.07,o.foot*Math.pow(1-T,.72)*(1+(o.midGirthFactor-1)*Math.sin(Math.PI*T))),te=re/(l-1)-.5,ie=.34*ae*(1-4*te*te);return new v(te*ae,.3+T*o.luff*.92,2.6+.5*Math.sin(Math.PI*T)+ie)},p=(ne,re)=>{let T=u(ne,re);return new v(c.x+T.x*.05+Math.sin(ne*3.1+re*1.7)*.02,c.y+T.y*.03+Math.cos(ne*2.3+re)*.02,c.z+(T.z-2.6)*.05)},m=new Jh(e,s,l,p,o.area*o.clothDensity,{stretch:o.stretchCompliance,shear:o.shearCompliance,bend:o.bendCompliance},Lv(),{designFn:u,damp:.1,matProps:{emissiveIntensity:.1}}),g=m.parts[s-1][Math.floor(l/2)],_=m.parts[0][0],f=m.parts[0][l-1],d=i.mast[Math.round(o.halyardFrac*(i.mast.length-1))],M=e.addC(new _t(g,d,5.4,t.rig.ropeCompliance,"tension")),x=o.poleRingH,S=i.segLen,D=x/S,R=Math.floor(D),L=new v(i.stepD.x,i.stepD.y+x,i.stepD.z),B=new v(.08,-.33,.94).normalize(),b=L.clone().addScaledVector(B,o.poleLength),E=n(L),F=n(b),V=new oa(E.x,E.y,E.z,1/.4),Q=new oa(F.x,F.y,F.z,1/.6);V.damp=Q.damp=.5,e.addParticle(V),e.addParticle(Q),e.addC(new qh(i.mast[R],i.mast[R+1],D-R,V,1e-8)),e.addC(new _t(V,Q,o.poleLength,1e-8));let P=e.addC(new Gt(r,a(b),Q,.04,1e-5)),z=i.mast[Math.round((x+1.4)/S)],C=Math.hypot(o.poleLength,1.4)*.99,G=e.addC(new _t(Q,z,C,t.rig.ropeCompliance,"tension")),O=new v(0,.5,.7),U=e.addC(new Gt(r,a(O),Q,Math.hypot(o.poleLength,.75),t.rig.ropeCompliance,"tension")),K=e.addC(new _t(f,Q,.1,t.rig.ropeCompliance,"tension")),j=e.addC(new _t(_,Q,.1,t.rig.ropeCompliance,"tension")),I=new v(o.sheetFairleadLocal.x,o.sheetFairleadLocal.y,o.sheetFairleadLocal.z),W=new v(-o.sheetFairleadLocal.x,o.sheetFairleadLocal.y,o.sheetFairleadLocal.z),he=e.addC(new Gt(r,a(I),f,6,t.rig.ropeCompliance,"tension")),me=e.addC(new Gt(r,a(W),_,6,t.rig.ropeCompliance,"tension")),q=[];for(let ne=0;ne<s;ne+=3)for(let re=0;re<l;re+=4)q.push(e.addC(new Gt(r,a(h),m.parts[ne][re],.12,2e-4)));q.push(e.addC(new Gt(r,a(h),g,.1,2e-4))),q.push(e.addC(new Gt(r,a(h),f,.1,2e-4))),q.push(e.addC(new Gt(r,a(h),_,.1,2e-4)));let $={up:!1,t:0,poleSide:-1,sheetTrim:.5};m.aeroScale=0;function pe(){let ne=$.up;q.forEach(re=>re.enabled=!ne),P.enabled=!ne,K.enabled=ne&&$.poleSide<0,j.enabled=ne&&$.poleSide>0,he.enabled=ne,me.enabled=ne,G.enabled=U.enabled=ne,M.enabled=ne}return pe(),{cloth:m,state:$,poleInner:V,poleOuter:Q,halyardC:M,flD:[I,W],clewP:f,clewS:_,_setEnabled:pe,hoist(){$.up||($.up=!0,$.t=0,pe())},douse(){$.up&&($.up=!1,$.t=0,pe())},setPoleSide(ne){ne!==$.poleSide&&($.poleSide=ne,pe())},update(ne,re){if($.t+=ne,$.up){let T=Math.min($.t/t.spin.hoistTime,1);M.rest=Ji(5.2,.12,T),m.aeroScale=T*T,G.rest=Ji(3,C,T);let ae=Ji(1.4,.1,T);K.rest=ae,j.rest=ae;let te=Math.min(T*1.5,1),ie=Ji(4.5,1.45,te*.62+.38*(1-te)),ee=Ji(5,1.5,re*T);$.poleSide<0?(he.rest=ie,me.rest=ee):(me.rest=ie,he.rest=ee)}else m.aeroScale=Math.max(0,1-$.t/1)}}}xi();var Ui=new v,Wn=new v,Dr=new v,Ni=new v,la=new v,Qf=new v(0,1,0),so=1/60,Va={velocityDecayRate:16,targetFollowRate:56},Kt=class{constructor(e,t,i,r,a=6){this.n=t,this.radius=i,this.rs=a,this.pts=Array.from({length:t},()=>new v),this.goals=Array.from({length:t},()=>new v),this.solved=Array.from({length:t},()=>new v),this.previous=Array.from({length:t},()=>new v),this.initialized=!1,this.maxStretch01=0,this.maxTrackingErrorM=0,this.maxGoalJumpM=0,this.projectionResidual01=0,this.estimatedLoadN=0,this._delta=new v,this._velocity=new v;let n=new St;n.setAttribute("position",new Ht(new Float32Array(t*(a+1)*3),3)),n.setAttribute("normal",new Ht(new Float32Array(t*(a+1)*3),3));let o=[];for(let s=0;s<t-1;s++)for(let l=0;l<a;l++){let h=s*(a+1)+l,c=h+a+1;o.push(h,c,h+1,c,c+1,h+1)}n.setIndex(o),this.mesh=new De(n,new vi({color:r,roughness:.85,metalness:0})),this.mesh.frustumCulled=!1,this.mesh.castShadow=!0,e.add(this.mesh)}solveVisualCable(e){e=Math.min(1/30,Math.max(1/240,Number.isFinite(e)?e:1/60));let t=0;for(let a=0;a<this.n-1;a++)t+=this.pts[a].distanceTo(this.pts[a+1]);t/=Math.max(1,this.n-1);let i=Math.max(.1,1.35*t),r=!this.initialized;if(this.maxGoalJumpM=0,this.projectionResidual01=0,!r)for(let a=0;a<this.n;a++)this.maxGoalJumpM=Math.max(this.maxGoalJumpM,this.goals[a].distanceTo(this.pts[a]));r=r||this.maxGoalJumpM>i;for(let a=0;a<this.n;a++)this.goals[a].copy(this.pts[a]);if(r){for(let a=0;a<this.n;a++)this.solved[a].copy(this.goals[a]),this.previous[a].copy(this.goals[a]);this.initialized=!0}else{let a=Math.exp(-Math.max(10,Va.velocityDecayRate)*e),n=1-Math.exp(-Math.max(48,Va.targetFollowRate*1.35)*e),o=9.81*e*e*.11;for(let l=1;l<this.n-1;l++){let h=this.solved[l],c=this.previous[l];this._velocity.copy(h).sub(c).multiplyScalar(a),c.copy(h),h.add(this._velocity),h.lerp(this.goals[l],n),h.y-=o}this.solved[0].copy(this.goals[0]),this.solved[this.n-1].copy(this.goals[this.n-1]);for(let l=0;l<16;l++){let h=0,c=l%2===0?0:this.n-2,u=l%2===0?this.n-1:-1,p=l%2===0?1:-1;for(let m=c;m!==u;m+=p){let g=this.solved[m],_=this.solved[m+1],f=Math.max(1e-5,this.goals[m].distanceTo(this.goals[m+1]));this._delta.copy(_).sub(g);let d=this._delta.length();if(d<1e-7)continue;h=Math.max(h,Math.abs(d-f)/f);let M=(d-f)/d,x=m===0?0:1,S=m+1===this.n-1?0:1,D=x+S;if(D>0)g.addScaledVector(this._delta,M*x/D),_.addScaledVector(this._delta,-M*S/D)}this.solved[0].copy(this.goals[0]),this.solved[this.n-1].copy(this.goals[this.n-1]),this.projectionResidual01=h;if(h<8e-4)break}}this.maxStretch01=0,this.maxTrackingErrorM=0;for(let a=0;a<this.n-1;a++){let n=Math.max(1e-5,this.goals[a].distanceTo(this.goals[a+1])),o=this.solved[a].distanceTo(this.solved[a+1]);this.maxStretch01=Math.max(this.maxStretch01,Math.abs(o-n)/n),this.maxTrackingErrorM=Math.max(this.maxTrackingErrorM,this.solved[a].distanceTo(this.goals[a]))}this.maxTrackingErrorM=Math.max(this.maxTrackingErrorM,this.solved[this.n-1].distanceTo(this.goals[this.n-1]));if(this.maxStretch01>.01||this.maxTrackingErrorM>.035){for(let a=0;a<this.n;a++)this.solved[a].copy(this.goals[a]),this.previous[a].copy(this.goals[a]);this.maxStretch01=0,this.maxTrackingErrorM=0,this.projectionResidual01=0,this.budgetResets=(this.budgetResets||0)+1}this.estimatedLoadN=Math.max(0,this.maxStretch01)*18e3+this.maxTrackingErrorM*120;for(let a=0;a<this.n;a++)this.pts[a].copy(this.solved[a])}commit(){so>0||!this.initialized?this.solveVisualCable(so>0?so:1/60):this.pts.forEach((a,n)=>a.copy(this.solved[n]));let e=this.mesh.geometry.attributes.position.array,t=this.mesh.geometry.attributes.normal.array,i=this.n,r=this.rs;for(let a=0;a<i;a++){let n=this.pts[a],o=this.pts[Math.min(a+1,i-1)],s=this.pts[Math.max(a-1,0)];Dr.copy(o).sub(s),Dr.lengthSq()<1e-12&&Dr.set(0,1,0),Dr.normalize(),Ni.copy(Qf).cross(Dr),Ni.lengthSq()<.01&&Ni.set(1,0,0).cross(Dr),Ni.normalize(),la.crossVectors(Dr,Ni);for(let l=0;l<=r;l++){let h=l/r*Math.PI*2,c=(a*(r+1)+l)*3,u=Math.cos(h)*this.radius,p=Math.sin(h)*this.radius,m=Math.cos(h)*Ni.x+Math.sin(h)*la.x,g=Math.cos(h)*Ni.y+Math.sin(h)*la.y,_=Math.cos(h)*Ni.z+Math.sin(h)*la.z;e[c]=n.x+Ni.x*u+la.x*p,e[c+1]=n.y+Ni.y*u+la.y*p,e[c+2]=n.z+Ni.z*u+la.z*p,t[c]=m,t[c+1]=g,t[c+2]=_}}this.mesh.geometry.attributes.position.needsUpdate=!0,this.mesh.geometry.attributes.normal.needsUpdate=!0,this.mesh.userData.estimatedLoadN=this.estimatedLoadN,this.mesh.userData.maxStretch01=this.maxStretch01,this.mesh.userData.maxTrackingErrorM=this.maxTrackingErrorM,this.mesh.userData.maxGoalJumpM=this.maxGoalJumpM,this.mesh.userData.projectionResidual01=this.projectionResidual01}setVisible(e){this.mesh.visible=e}};function wt(e,t,i,r,a,n,o=0,s=0){let l=i-t,h=Dr.copy(a).sub(r).length(),c=Math.max(0,n-h),u=Math.sqrt(Math.max(c*(c+2*h),0))*.3;for(let p=0;p<=l;p++){let m=p/l,g=e[t+p];g.copy(r).lerp(a,m);let _=m*(1-m)*4;g.y-=u*_,o>0&&(g.x+=Math.sin(s+m*5.1)*o*_,g.z+=Math.cos(s*.83+m*4.3)*o*_)}}function Ha(e,t=.028){let i=new ji,r=new De(new _i(t,t,.026,12),new vi({color:1316378,roughness:.5}));r.rotation.x=Math.PI/2;let a=new De(new _i(t*.62,t*.62,.03,12),new vi({color:12172998,roughness:.3,metalness:.8}));return a.rotation.x=Math.PI/2,i.add(r,a),e.add(i),i}function Nv(e,t){let{rig:i,main:r,jib:a,spin:n,body:o,d2b:s,cfg:l}=t,h={mainsheet:new Kt(e,30,.007,15131350),bridle:new Kt(e,9,.005,14210248),vang:new Kt(e,8,.006,1645343),vang2:new Kt(e,8,.006,1645343),jibP:new Kt(e,14,.005,9187376),jibS:new Kt(e,14,.005,9187376),outhaul:new Kt(e,6,.0035,9080212),cunning:new Kt(e,8,.0035,11547700),trapP:new Kt(e,8,.0025,13159892),trapS:new Kt(e,8,.0025,13159892),kiteHal:new Kt(e,10,.004,3829416),kiteP:new Kt(e,16,.005,11550784),kiteS:new Kt(e,16,.005,3108422),pole:new Kt(e,4,.021,6449006),poleUp:new Kt(e,6,.0025,13159892)},c={apex:Ha(e,.032),boomEnd:Ha(e,.03),boomMid:Ha(e,.027),ratchet:Ha(e,.035),vangBoom:Ha(e,.024),vangMast:Ha(e,.024)},u={eyeP:new v,eyeS:new v,ratchet:new v,stem:new v,flP:new v,flS:new v,kflP:new v,kflS:new v,trapClipP:new v,trapClipS:new v},p=s(i.eyeDs[0]),m=s(i.eyeDs[1]),g=s(new v(0,.22,-.75)),_=s(a.flD[0]),f=s(a.flD[1]),d=s(n.flD[0]),M=s(n.flD[1]),x=s(new v(-.55,.5,.45)),S=s(new v(.55,.5,.45)),D=0;function R(L,B,b){so=L,o.localToWorld(p,u.eyeP),o.localToWorld(m,u.eyeS),o.localToWorld(g,u.ratchet),o.localToWorld(_,u.flP),o.localToWorld(f,u.flS),o.localToWorld(d,u.kflP),o.localToWorld(M,u.kflS),o.localToWorld(x,u.trapClipP),o.localToWorld(S,u.trapClipS);let E=i.bridleApex.x,F=i.boom[3].x,V=i.boom[2].x,Q=i.boom[1].x,P=i.mast[0].x,z=h.mainsheet,C=i.sheetC.segmentRest;wt(z.pts,0,6,F,E,Math.max(C[0],F.distanceTo(E)),0,0),Ui.copy(F).addScaledVector(Qf,-.02),wt(z.pts,6,11,E,Ui,Math.max(C[1],E.distanceTo(Ui)),.006,b),wt(z.pts,11,15,Ui,V,Math.max(C[2],Ui.distanceTo(V)),.003,b+1.1);let G=Math.max(C[3],V.distanceTo(u.ratchet))+.08;wt(z.pts,15,29,Ui.copy(V).setY(V.y-.05),u.ratchet,G,.03,b*2.1),z.commit(),wt(h.bridle.pts,0,4,u.eyeP,E,u.eyeP.distanceTo(E),0,0),wt(h.bridle.pts,4,8,E,u.eyeS,E.distanceTo(u.eyeS),0,0),h.bridle.commit(),wt(h.vang.pts,0,7,P,Q,P.distanceTo(Q),0,0),Ui.copy(P).lerp(Q,.5),Ui.y-=.035,wt(h.vang2.pts,0,7,Wn.copy(P).setY(P.y+.06),Ui,1.2*Wn.distanceTo(Ui),.01,1),h.vang2.commit(),h.vang.commit();let O=a.clew.x;wt(h.jibP.pts,0,10,O,u.flP,a.sheetCs[0].rest,.05,b*1.7);for(let re=0;re<=3;re++)h.jibP.pts[10+re].copy(u.flP).lerp(u.ratchet,re/3*.5).y-=re*.02;wt(h.jibS.pts,0,10,O,u.flS,a.sheetCs[1].rest,.05,b*1.9+3);for(let re=0;re<=3;re++)h.jibS.pts[10+re].copy(u.flS).lerp(u.ratchet,re/3*.5).y-=re*.02;if(h.jibP.commit(),h.jibS.commit(),t.holds){let re=t.holds;re.mainsheet.copy(z.pts[20]),re.mainsheetTan.copy(z.pts[22]).sub(z.pts[18]).normalize();let T=a.sheetCs[0].rest<a.sheetCs[1].rest?h.jibP:h.jibS;re.jib.copy(T.pts[11]),re.jibTan.copy(T.pts[12]).sub(T.pts[10]).normalize();let ae=n.state.poleSide<0?h.kiteS:h.kiteP;re.kite.copy(ae.pts[9]),re.kiteTan.copy(ae.pts[10]).sub(ae.pts[8]).normalize()}let U=r.cloth.parts[0][r.cloth.cols-1].x;wt(h.outhaul.pts,0,5,U,F,U.distanceTo(F)+.01,0,0),h.outhaul.commit();let K=r.cloth.parts[0][0].x;wt(h.cunning.pts,0,7,K,P,K.distanceTo(P)+.06,.01,2),h.cunning.commit();let j=i.hounds.x,I=t.getTrapeze();if(I.on){let re=t.crewHarness;wt(I.side>0?h.trapS.pts:h.trapP.pts,0,7,j,re,j.distanceTo(re),0,0),wt(I.side>0?h.trapP.pts:h.trapS.pts,0,7,j,I.side>0?u.trapClipP:u.trapClipS,j.distanceTo(I.side>0?u.trapClipP:u.trapClipS)+.15,.02,b)}else wt(h.trapP.pts,0,7,j,u.trapClipP,j.distanceTo(u.trapClipP)+.15,.02,b*1.2),wt(h.trapS.pts,0,7,j,u.trapClipS,j.distanceTo(u.trapClipS)+.15,.02,b*1.1+2);h.trapP.commit(),h.trapS.commit();let W=n.state.up;h.kiteHal.setVisible(W),h.kiteP.setVisible(W),h.kiteS.setVisible(W);let he=i.mast[Math.round(l.spin.halyardFrac*(i.mast.length-1))].x,me=n.cloth.parts[n.cloth.rows-1][Math.floor(n.cloth.cols/2)].x;wt(h.kiteHal.pts,0,9,he,me,he.distanceTo(me)+(W?0:.1),.01,b),h.kiteHal.commit();let q=n.clewP.x,$=n.clewS.x;if(wt(h.kiteP.pts,0,15,q,u.kflP,W?Math.max(2,q.distanceTo(u.kflP)):q.distanceTo(u.kflP)+.3,.04,b*1.3),wt(h.kiteS.pts,0,15,$,u.kflS,W?Math.max(2,$.distanceTo(u.kflS)):$.distanceTo(u.kflS)+.3,.04,b*1.5),h.kiteP.commit(),h.kiteS.commit(),h.pole.setVisible(W),h.poleUp.setVisible(W),W){for(let T=0;T<=3;T++)h.pole.pts[T].copy(n.poleInner.x).lerp(n.poleOuter.x,T/3);h.pole.commit();let re=i.mast[Math.round((l.spin.poleRingH+1.4)/i.segLen)].x;wt(h.poleUp.pts,0,5,re,n.poleOuter.x,re.distanceTo(n.poleOuter.x),0,0),h.poleUp.commit()}let pe=new v(0,0,1),ne=(re,T,ae)=>{Wn.copy(ae).sub(T),Wn.lengthSq()>1e-10&&re.quaternion.setFromUnitVectors(pe,Wn.normalize())};c.apex.position.copy(E),c.boomEnd.position.copy(F).y-=.045,c.boomMid.position.copy(V).y-=.038,c.ratchet.position.copy(u.ratchet),c.vangBoom.position.copy(Q).y-=.03,c.vangMast.position.copy(P).add(Ui.set(0,.1,0)),ne(c.apex,E,F),ne(c.boomEnd,F,E),ne(c.boomMid,V,u.ratchet),ne(c.ratchet,u.ratchet,V),ne(c.vangBoom,Q,P),ne(c.vangMast,P,Q)}return{update:R,ropes:h}}xi(),Xf();var Ve=(e=0,t=0,i=0)=>new v(e,t,i),ei=new v,Xn=new v,$f=new v,e0=new v,jn=new v;function Ga(e,t,i,r){let a=1-Math.exp(-i*r);return e.lerp(t,a),e}var Zi=Ye.clamp,ha=e=>e*e*(3-2*e);function Qh(e,t,i){return ha(Zi((e-t)/(i-t),0,1))}var Et=e=>-e,t0=class{constructor(e,t,i,r={}){this.role=t,this.cfg=i,this.human=new Gn(r),e.add(this.human.group);let a=this.human.P;this.L={uarm:a.upperArm,farm:a.foreArm,hand:a.handLen,thigh:a.thigh,shin:a.shin,ankleH:a.ankleH,torso:a.chestY-a.hipsY,neck:a.neckY-a.chestY,shX:a.shoulderX,hipX:a.hipX,shY:a.shoulderY-a.chestY},this.side=-1,this.pelvis=Ve(Et(-1)*.55,.55,t==="helm"?-.95:-.25),this.pelvisT=this.pelvis.clone(),this.facing=Ve(-Et(-1),0,.2).normalize(),this.facingT=this.facing.clone(),this.lean=0,this.crouch=0,this.feet=[this.pelvis.clone().add(Ve(0,-.3,.2)),this.pelvis.clone().add(Ve(0,-.3,-.05))],this.feetT=[this.feet[0].clone(),this.feet[1].clone()],this.feetPlant=[1,1],this.hands=[this.pelvis.clone(),this.pelvis.clone()],this.handT=[this.hands[0].clone(),this.hands[1].clone()],this.look=Ve(0,1.5,8),this.lookT=this.look.clone(),this.trapB=0,this.crossing=null,this.leverStb=0,this.harness=Ve(),this.gripTan=[null,null],this.rolePhaseOffset=t==="helm"?0:.2,this.sideRequestAge=0,this.boomAvoidance=0,this.boomHorizontalClearanceM=99,this.headBoomSurfaceClearanceM=99,this.handTargetErrorM=0,this.handReachAdjustmentM=0,this.footTargetDriftM=0,this.seatContactActive=!0,this.seatContactPoint=Ve(),this.soleContactPoints=[Ve(),Ve()],this.supportContactCount=3,this.seatContactErrorM=0,this.articulatedComLocal=Ve(),this.comValid=!0}seatAnchor(e,t,i){let r=(this.role==="helm"?-.92:-.22)-i*(this.role==="helm"?.42:.7),a=Zi((r+Ie.halfLen)/(2*Ie.halfLen),0,1),n=Ie.halfWidth(a),o=Math.max(.34,n-.23),s=Math.max(o+.04,n-.025),l=Zi(n-.12,o,s),h=Zi(t,-.35,1),c=h>=0?Pi(l,s,h):Pi(l,o,-h/.35),u=Et(e)*c,p=Ie.seatSurfaceY(u,r),m=.105+this.cfg.lab.seatOffsetM;return this.seatContactPoint.set(u,p,r),Ve(u,p+m,r)}strapFoot(e,t,i){let r=this.role==="helm"?-.28:.18,a=this.role==="helm"?.42:.7,n=r-i*a-t*(this.role==="helm"?.31:.27),o=Et(e)*(t===0?.18:.22),s=Ie.soleSurfaceY(o,n);return this.soleContactPoints[t].set(o,s,n),this.soleContactPoints[t].clone()}startCrossing(e,t=!1){this.crossing||e===this.side||(this.crossing={t:0,dur:t?1.1:this.role==="helm"?1.3:1.5,from:this.side,to:e})}reset(e){this.side=e,this.crossing=null,this.trapB=0,this.lean=0,this.crouch=0;let t=this.seatAnchor(e,.2,0);this.pelvis.copy(t),this.pelvisT.copy(t),this.facing.set(-Et(e),0,.22).normalize(),this.facingT.copy(this.facing);for(let i=0;i<2;i++)this.feet[i].copy(this.strapFoot(e,i,0)),this.feetT[i].copy(this.feet[i]),this.feetPlant[i]=1}update(e){let t=e.dt,i=this.role,r=this.human,a=this.L;!e.capsized&&e.windSide!==this.side&&!this.crossing?(this.sideRequestAge+=t,this.sideRequestAge>=this.rolePhaseOffset&&(this.startCrossing(e.windSide),this.sideRequestAge=0)):this.sideRequestAge=0;let n=this.pelvisT,o=this.facingT,s=e.capsized?0:e.hike,l=0,h=i==="crew"&&e.trapeze&&!e.capsized&&!this.crossing&&e.hike>.15?1:0;if(this.trapB+=Zi(h-this.trapB,-1.9*t,1.4*t),this.crossing){let q=this.crossing;q.t+=t/q.dur;let $=q.t;if($>=1)this.side=q.to,this.crossing=null;else{let pe=this.seatAnchor(q.from,0,e.aft),ne=this.seatAnchor(q.to,0,e.aft),re=Ve(0,.44,(pe.z+ne.z)/2+.06),T=ha($);T<.5?n.lerpVectors(pe,re,ha(T*2)):n.lerpVectors(re,ne,ha((T-.5)*2));let ae=Ve(-Et(q.from),0,.25),te=Ve(-Et(q.to),0,.25),ie=Ve(0,0,1);T<.5?o.lerpVectors(ae,ie,ha(T*2)):o.lerpVectors(ie,te,ha((T-.5)*2)),o.normalize(),l=1.3*Qh($,.08,.28)*(1-Qh($,.78,.94)),s=0;let ee=(le,oe,ue,Re,fe)=>{let Me=Qh($,Re,fe);return Me<=0?!1:Me>=1?(this.feetT[le].copy(ue),this.feetPlant[le]=1,!0):(this.feetT[le].lerpVectors(oe,ue,Me),this.feetT[le].y+=Math.sin(Me*Math.PI)*.13,this.feetPlant[le]=0,!1)},X=this.strapFoot(q.from,0,e.aft),se=this.strapFoot(q.from,1,e.aft),ce=Ve(Et(q.to)*.1,.2,X.z),w=Ve(Et(q.to)*.16,.2,se.z),y=this.strapFoot(q.to,0,e.aft),k=this.strapFoot(q.to,1,e.aft);$<.5?(ee(0,X,ce,.12,.3),ee(1,se,w,.34,.5)):(ee(0,ce,y,.5,.67),ee(1,w,k,.71,.88))}}if(!this.crossing)if(e.capsized)n.copy(Ve(Et(this.side)*.62,.42,i==="helm"?-.9:-.2)),o.set(-Et(this.side),0,.1).normalize(),this.feetT[0].copy(n).add(Ve(-Et(this.side)*.45,-.28,.15)),this.feetT[1].copy(n).add(Ve(-Et(this.side)*.5,-.3,-.12)),this.feetPlant=[0,0];else if(this.trapB>.02&&i==="crew"){let q=.16+Math.max(0,s)*.84,$=this.seatAnchor(this.side,s,e.aft),pe=Ve(Et(this.side)*(.7+q*.72),.6+q*.03,-.22-e.aft*.55);n.lerpVectors($,pe,this.trapB),o.set(-Et(this.side)*.7,.12,.35).normalize();let ne=pe.z+.16,re=pe.z-.14;this.feetT[0].lerp(Ve(Et(this.side)*.7,.47,ne),this.trapB),this.feetT[1].lerp(Ve(Et(this.side)*.7,.47,re),this.trapB),this.trapB>.6&&(this.feetPlant=[1,1])}else n.copy(this.seatAnchor(this.side,s,e.aft)),o.set(-Et(this.side),0,.22).normalize(),this.feetT[0].copy(this.strapFoot(this.side,0,e.aft)),this.feetT[1].copy(this.strapFoot(this.side,1,e.aft)),this.feetPlant=[1,1];let c=0,u=99;if(e.boomLine&&e.boomLine.length>1&&!e.capsized){let q=r.cur.head;for(let $=0;$<e.boomLine.length-1;$++){let pe=e.boomLine[$],ne=e.boomLine[$+1],re=ne.x-pe.x,T=ne.z-pe.z,ae=Math.max(1e-8,re*re+T*T),te=Zi(((q.x-pe.x)*re+(q.z-pe.z)*T)/ae,0,1),ie=pe.x+re*te,ee=Pi(pe.y,ne.y,te),X=pe.z+T*te,se=Math.hypot(q.x-ie,q.z-X);if(ee>n.y+.25&&ee<n.y+.95){u=Math.min(u,se);let w=Math.hypot(se,q.y-ee)-(r.P.headR+.04),y=this.cfg.lab.boomSafetyRadiusM,k=y+.25;c=Math.max(c,1-ha(Zi((w-y)/Math.max(.02,k-y),0,1)))}}}this.boomAvoidance=c,this.boomHorizontalClearanceM=u,l=Math.max(l,1.3*c),this.seatContactActive=!e.capsized&&this.trapB<.35&&(!this.crossing||this.crossing.t<.22||this.crossing.t>.78),this.supportContactCount=(this.seatContactActive?1:0)+this.feetPlant[0]+this.feetPlant[1];let p=this.crossing?10:6;Ga(this.pelvis,n,p,t),Ga(this.facing,o,this.crossing?9:5,t).normalize(),this.lean+=Zi(Math.max(0,s)-this.lean,-2.2*t,2.2*t),this.crouch+=Zi(l-this.crouch,-6*t,(c>.05?24:6)*t);for(let q=0;q<2;q++)Ga(this.feet[q],this.feetT[q],this.feetPlant[q]?14:11,t);let m={},g=Ve(0,1,0),_=Ve(Et(this.side),0,0),f=this.facing,d=ei.crossVectors(f,g).normalize().clone(),M=Math.max(this.lean*1.02,this.trapB*(.9+this.lean*.45)),x=Xn.copy(g).multiplyScalar(Math.cos(M)*(1-this.crouch*.55)).addScaledVector(_,Math.sin(M)*(this.trapB>.5?1.05:.92)).addScaledVector(f,this.crouch*.7+this.lean*-.06).normalize().clone();m.pelvis=this.pelvis.clone(),m.spine=m.pelvis.clone().addScaledVector(x,a.torso*.42).addScaledVector(f,this.crouch*.05),m.chest=m.pelvis.clone().addScaledVector(x,a.torso).addScaledVector(f,this.crouch*.1);let S=$f.copy(x).addScaledVector(f,this.crouch*.9-.04).normalize();m.neck=m.chest.clone().addScaledVector(S,a.neck*.9),m.head=m.neck.clone().addScaledVector(S,.115*(1-this.crouch*.35)),Ga(this.look,this.lookT.copy(e.lookAt||Ve(f.x*8,1.5,f.z*8)),3.5,t);let D=a.shX;m.shoulderL=m.chest.clone().addScaledVector(d,-D).addScaledVector(x,a.shY*.5),m.shoulderR=m.chest.clone().addScaledVector(d,D).addScaledVector(x,a.shY*.5),m.hipL=m.pelvis.clone().addScaledVector(d,-a.hipX).add(Ve(0,-.02,0)),m.hipR=m.pelvis.clone().addScaledVector(d,a.hipX).add(Ve(0,-.02,0));let R=e0.copy(g).multiplyScalar(.32+this.crouch*.72).addScaledVector(f,1.12-this.crouch*.28).clone(),L=(q,$,pe,ne,re)=>{let T=$.clone();T.y+=a.ankleH,Gn.solveTwoBone(q,T,a.thigh,a.shin,R,jn),m[pe]=jn.clone(),m[ne]=T;let ae=ei.copy(T).sub(m.pelvis);ae.y=0,ae.lengthSq()<1e-6&&ae.copy(f),ae.normalize(),m[re]=T.clone().addScaledVector(ae,.16).add(Ve(0,-a.ankleH+.012,0))},B=this.feet[0].clone().sub(m.pelvis).dot(d)<this.feet[1].clone().sub(m.pelvis).dot(d)?0:1;L(m.hipL,this.feet[B],"kneeL","ankleL","toeL"),L(m.hipR,this.feet[1-B],"kneeR","ankleR","toeR");let b=e.holds||{},E=null,F=null,V=null,Q=null,P=!(f.clone().cross(g).z<0),z=m.pelvis.clone().addScaledVector(d,-.22).addScaledVector(f,.18).add(Ve(0,.06,0)),C=m.pelvis.clone().addScaledVector(d,.22).addScaledVector(f,.18).add(Ve(0,.06,0));if(e.capsized)E=m.shoulderL.clone().addScaledVector(_,.3).add(Ve(0,.12,0)),F=m.shoulderR.clone().addScaledVector(_,.3).add(Ve(0,.12,0));else if(i==="helm"){let q=null;if(b.tillerTip){let pe=this.crossing?m.pelvis.clone().add(Ve(0,.18,-.55)):m.chest.clone().addScaledVector(f,.28).add(Ve(0,-.12,0)).addScaledVector(_,.05);ei.copy(pe).sub(b.tillerTip);let ne=Math.min(ei.length(),e.extensionLen??.95);q=b.tillerTip.clone().addScaledVector(ei.normalize(),ne),this.extensionEnd=q.clone(),this.extensionTan=ei.clone()}let $=b.mainsheet?b.mainsheet.clone():null;P?(F=q||C,E=$||z,V=b.mainsheetTan,Q=this.extensionTan):(E=q||z,F=$||C,Q=b.mainsheetTan,V=this.extensionTan)}else{let q=e.kiteUp?b.kite:b.jib,$=e.kiteUp?b.kiteTan:b.jibTan,pe=this.trapB>.35?b.trapHandle:null;P?(F=q||C,Q=$,E=pe||(q?q.clone().add(Ve(0,0,0)).addScaledVector(d,-.16):z),V=pe?null:$):(E=q||z,V=$,F=pe||(q?q.clone().addScaledVector(d,.16):C),Q=pe?null:$)}if(this.crossing){let q=this.crossing.t,$=pe=>m.pelvis.clone().addScaledVector(d,pe*.3).addScaledVector(f,.24).add(Ve(0,.02,0));i!=="helm"?(E=$(-1),F=$(1),V=Q=null):q>.15&&q<.72&&(P?(E=$(-1),V=null):(F=$(1),Q=null))}let G=.97*(a.uarm+a.farm+a.hand*.45),O=0,U=(q,$,pe)=>{let ne=q.clone(),re=q.clone(),T=re.clone().sub(pe);if(T.length()<=G)return re;if($&&$.lengthSq()>1e-10){let ae=$.clone().normalize(),te=pe.clone().sub(q),ie=te.dot(ae),ee=Math.max(0,te.lengthSq()-ie*ie);if(ee<G*G){let X=Math.sqrt(G*G-ee),se=ie-X,ce=ie+X;re.copy(q).addScaledVector(ae,Math.abs(se)<Math.abs(ce)?se:ce)}}return T.copy(re).sub(pe),T.length()>G&&re.copy(pe).addScaledVector(T.normalize(),G),O=Math.max(O,ne.distanceTo(re)),re};E=U(E||z,V,m.shoulderL),F=U(F||C,Q,m.shoulderR),this.handReachAdjustmentM=O,Ga(this.hands[0],this.handT[0].copy(E),18,t),Ga(this.hands[1],this.handT[1].copy(F),18,t);let K=e0.copy(d).multiplyScalar(-.9).add(Ve(0,-.5,0)).addScaledVector(f,-.25).clone(),j=jn.copy(d).multiplyScalar(.9).add(Ve(0,-.5,0)).addScaledVector(f,-.25).clone(),I=(q,$,pe,ne,re,T,ae)=>{Gn.solveTwoBone(q,$,a.uarm,a.farm+a.hand*.45,pe,ei),m[ne]=ei.clone(),Xn.copy($).sub(ei).normalize(),m[re]=$.clone().addScaledVector(Xn,-a.hand*.5),m[T]=ae?m[re].clone().addScaledVector($f.copy(ae).normalize(),a.hand*.55):$.clone()};if(I(m.shoulderL,this.hands[0],K,"elbowL","wristL","handL",V),I(m.shoulderR,this.hands[1],j,"elbowR","wristR","handR",Q),this.handTargetErrorM=Math.max(this.hands[0].distanceTo(this.handT[0]),this.hands[1].distanceTo(this.handT[1])),this.footTargetDriftM=Math.max(this.feetPlant[0]?this.feet[0].distanceTo(this.feetT[0]):0,this.feetPlant[1]?this.feet[1].distanceTo(this.feetT[1]):0),this.headBoomSurfaceClearanceM=99,e.boomLine&&e.boomLine.length>1)for(let q=0;q<e.boomLine.length-1;q++){let $=e.boomLine[q],pe=e.boomLine[q+1];ei.copy(pe).sub($);let ne=Math.max(1e-8,ei.lengthSq()),re=Zi(Xn.copy(m.head).sub($).dot(ei)/ne,0,1);jn.copy($).addScaledVector(ei,re),this.headBoomSurfaceClearanceM=Math.min(this.headBoomSurfaceClearanceM,m.head.distanceTo(jn)-(r.P.headR+.04))}let W={pelvis:f,spine:f,chest:f,neck:f,head:Xn.copy(this.look).sub(m.head).normalize().clone(),thighL:f,thighR:f,shinL:f,shinR:f,footL:g,footR:g,uparmL:f,uparmR:f,forearmL:f,forearmR:f,handL:g,handR:g};r.applyPose(m,W),this.articulatedComLocal.set(0,0,0);let he=(q,$)=>this.articulatedComLocal.addScaledVector(q,$),me=(q,$,pe)=>this.articulatedComLocal.addScaledVector(ei.copy(q).add($).multiplyScalar(.5),pe);he(m.pelvis,.16),he(m.spine,.08),he(m.chest,.18),he(m.head,.08),me(m.hipL,m.kneeL,.1),me(m.hipR,m.kneeR,.1),me(m.kneeL,m.ankleL,.06),me(m.kneeR,m.ankleR,.06),me(m.shoulderL,m.elbowL,.035),me(m.shoulderR,m.elbowR,.035),me(m.elbowL,m.wristL,.025),me(m.elbowR,m.wristR,.025),he(m.handL,.01),he(m.handR,.01),me(m.ankleL,m.toeL,.02),me(m.ankleR,m.toeR,.02),this.comValid=Number.isFinite(this.articulatedComLocal.x)&&Number.isFinite(this.articulatedComLocal.y)&&Number.isFinite(this.articulatedComLocal.z),this.comValid||this.articulatedComLocal.copy(m.pelvis),this.seatContactErrorM=this.seatContactActive?this.pelvis.distanceTo(n):0,this.leverStb=-m.pelvis.x+(this.trapB>.5?-Et(this.side)*0:0),this.harness.copy(m.pelvis).addScaledVector(_,.1).add(Ve(0,.06,0)),this.chestPoint=m.chest,this.pelvisZ=m.pelvis.z}};xi();var ut=new v,ui=new v,yi=new v,Wa=new v,Xa=new v,ja=new v,Ii=new v,ca=new v,ua=new v,qa=new v,oo=new v,Ur=new v,Iv=class{constructor(e,t,i,r,a){this.body=e,this.pts=t,this.ocean=i,this.cfg=r,this.ptsB=t.map(n=>({...n,local:a(n.local)})),this.boardB=a(new v(0,-.05-r.foils.board.span*.45,r.foils.board.z)),this.rudderB=a(new v(0,0-r.foils.rudder.span*.45,r.foils.rudder.z)),this.rudderAngle=0,this.crewX=0,this.helmX=0,this.crewY=.6,this.crewAft=0,this.helmComLocal=new v,this.crewComLocal=new v,this.submergedFrac=0,this.speedKn=0,this.boardStalled=!1}solveStatic(){let e=this.body,t=this.cfg,i=t.env.rhoWater,r=t.env.g,a=r/e.invMass;for(let n=0;n<60;n++){let o=-a,s=0;Ii.set(0,0,1).applyQuaternion(e.quat);for(let h of this.ptsB){e.localToWorld(h.local,ut);let c=-ut.y,u=Math.min(1,Math.max(0,(c+h.th*.5)/h.th));if(u<=0)continue;let p=i*r*h.vol*u;o+=p,s+=p*(ut.z-e.pos.z)*Ii.z+p*(ut.x-e.pos.x)*Ii.x}e.pos.y+=o/6e4;let l=s/3e5;Xa.set(1,0,0).applyQuaternion(e.quat),e.quat.premultiply(new Ct().setFromAxisAngle(Xa,-l*.001)).normalize()}}hook(e){let t=this.body,i=this.cfg,r=this.ocean,a=i.env.rhoWater,n=i.env.g,o=this.dampBoost||1;Ii.set(0,0,1).applyQuaternion(t.quat),ca.set(0,1,0).applyQuaternion(t.quat),ua.set(-1,0,0).applyQuaternion(t.quat);let s=0,l=0;for(let S of this.ptsB){t.localToWorld(S.local,ut);let D=r.height(ut.x,ut.z)-ut.y;if(l+=S.vol,D<=-S.th)continue;let R=Math.min(1,Math.max(0,(D+S.th*.5)/S.th));if(R<=0)continue;s+=S.vol*R,yi.set(0,a*n*S.vol*R,0),t.worldPointVelocity(ut,ui),r.velocity(ut.x,ut.z,Wa),ui.sub(Wa);let L=ui.dot(Ii),B=ui.dot(ua),b=ui.dot(ca),E=i.hydro.dampNormal*R*S.area*o;yi.addScaledVector(Ii,-L*E*.012),yi.addScaledVector(ua,-B*E*.28),yi.addScaledVector(ca,-b*E*1),t.addForceAt(yi,ut)}this.submergedFrac=s/l,t.localToWorld(Ur.set(0,-.1,0),ut),t.worldPointVelocity(ut,ui),r.velocity(ut.x,ut.z,Wa),ui.sub(Wa);let h=ui.dot(Ii),c=Math.abs(h);if(this.speedKn=t.vel.length()*1.9438,c>.01){let S=.5*a*i.hydro.cf*i.hydro.wetted*c*c,D=Math.exp(-Math.pow((c-i.hydro.humpSpeed)/.55,2)),R=1/(1+Math.exp(-(c-i.hydro.humpSpeed*1.08)*2.6)),L=i.hydro.residuaryK*c*c*(.1+D*.55)*(1-i.hydro.planingRelief*R),B=(S+L)*(1+i.hydro.heelDragK*(1-Math.abs(ca.y)));t.addForceAt(yi.copy(Ii).multiplyScalar(-Math.sign(h)*B),ut)}let u=ui.dot(ua);if(Math.abs(u)>.01){let S=.5*a*.55*.42*u*Math.abs(u);t.addForceAt(yi.copy(ua).multiplyScalar(-S),ut)}this.boardStalled=this.foil(this.boardB,i.foils.board,0,e),this.foil(this.rudderB,i.foils.rudder,this.rudderAngle,e);let p=i.crew,m=p.helmMass,g=p.crewMass;Xa.copy(this.helmComLocal).applyQuaternion(t.quat),Ur.set(0,-m*n,0),t.torque.add(yi.crossVectors(Xa,Ur)),Xa.copy(this.crewComLocal).applyQuaternion(t.quat),t.torque.add(yi.crossVectors(Xa,Ur.set(0,-g*n,0)));let _=t.omega,f=_.dot(Ii),d=_.dot(ca),M=_.dot(ua),x=Math.min(this.submergedFrac*4,1)*o;t.torque.addScaledVector(Ii,-f*(40+130*Math.abs(f))*x),t.torque.addScaledVector(ua,-M*(420+900*Math.abs(M))*x),t.torque.addScaledVector(ca,-d*(60+260*Math.abs(d))*x)}foil(e,t,i,r){let a=this.body,n=this.cfg;a.localToWorld(e,ut);let o=this.ocean.height(ut.x,ut.z);if(ut.y>o)return!1;a.worldPointVelocity(ut,ui),this.ocean.velocity(ut.x,ut.z,Wa),ui.sub(Wa),ja.copy(ca),qa.copy(ui).addScaledVector(ja,-ui.dot(ja));let s=qa.length();if(s<.05)return!1;Ur.copy(Ii),i!==0&&Ur.applyAxisAngle(ja,-i);let l=qa.dot(Ur)/s;oo.crossVectors(Ur,qa);let h=oo.dot(ja)/s,c=Math.atan2(h,l),u=t.stallDeg*Math.PI/180,p,m=Math.abs(c);if(m<u)p=t.clAlpha*c;else{let d=Math.min((m-u)/.35,1);p=t.clAlpha*u*Math.sign(c)*(1-.55*d)*(m<1.2?1:Math.max(.3,Math.cos(m)))}let g=t.span*t.span/t.area,_=t.cd0+p*p/(Math.PI*g*.85)+(m>u?.9*(m-u):0),f=.5*n.env.rhoWater*s*s*t.area;return oo.crossVectors(ja,qa).multiplyScalar(1/s),yi.copy(oo).multiplyScalar(-f*p),yi.addScaledVector(qa,-f*_/s),a.addForceAt(yi,ut),m>=u}};xi();var Ov=class{constructor(e){this.keys={},this.state={tiller:0,mainScope:.6,jibScope:.6,kiteSheet:.55,vang:.45,cunningham:.1,outhaul:.5,jibHalyard:.6,hike:.2,trapeze:!1,kiteToggleReq:!1,sideSwitchReq:!1,paused:!1,resetReq:!1,help:!1,camMode:0},window.addEventListener("keydown",t=>{if(t.repeat){this.keys[t.code]=!0;return}switch(this.keys[t.code]=!0,t.code){case"Space":this.state.kiteToggleReq=!0,t.preventDefault();break;case"KeyC":this.state.trapeze=!this.state.trapeze;break;case"KeyB":this.state.sideSwitchReq=!0;break;case"KeyP":this.state.paused=!this.state.paused;break;case"KeyN":this.state.resetReq=!0;break;case"KeyV":this.state.camMode=(this.state.camMode+1)%3;break;case"KeyK":this.state.help=!this.state.help;break}["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(t.code)&&t.preventDefault()}),window.addEventListener("keyup",t=>{this.keys[t.code]=!1})}update(e){let t=this.keys,i=this.state,r=(...s)=>s.some(l=>t[l]),a=(r("ArrowRight","KeyD")?1:0)-(r("ArrowLeft","KeyA")?1:0);a!==0?i.tiller=Ye.clamp(i.tiller+a*2.6*e,-1,1):i.tiller*=Math.max(0,1-3.5*e);let n=(s,l,h,c=.45)=>Ye.clamp(h+((r(s)?1:0)-(r(l)?1:0))*c*e,0,1);i.mainScope=n("KeyW","KeyS",i.mainScope),this.kiteUp?i.kiteSheet=n("KeyQ","KeyE",i.kiteSheet,.6):i.jibScope=n("KeyQ","KeyE",i.jibScope),i.vang=n("KeyR","KeyF",i.vang),i.cunningham=n("KeyT","KeyG",i.cunningham),i.outhaul=n("KeyY","KeyH",i.outhaul);let o=(r("KeyX","ShiftLeft","ShiftRight")?1:0)-(r("KeyZ")?1:0);i.hike=Ye.clamp(i.hike+o*1.6*e,0,1)}},Fv=class{constructor(e,t){this.cam=e,this.yaw=2.35,this.pitch=.24,this.dist=9.5,this.focus=new v,this.smooth=new v(0,2,-8),this.mode=0,this.ready=!1;let i=!1,r=0,a=0;t.addEventListener("mousedown",o=>{i=!0,r=o.clientX,a=o.clientY}),window.addEventListener("mouseup",()=>i=!1),window.addEventListener("mousemove",o=>{i&&(this.yaw-=(o.clientX-r)*.006,this.pitch=Ye.clamp(this.pitch+(o.clientY-a)*.004,-.05,1.2),r=o.clientX,a=o.clientY)}),t.addEventListener("wheel",o=>{this.dist=Ye.clamp(this.dist*(1+o.deltaY*9e-4),3.2,40),o.preventDefault()},{passive:!1});let n=0;t.addEventListener("touchstart",o=>{o.touches.length===1&&(r=o.touches[0].clientX,a=o.touches[0].clientY),o.touches.length===2&&(n=Math.hypot(o.touches[0].clientX-o.touches[1].clientX,o.touches[0].clientY-o.touches[1].clientY))},{passive:!0}),t.addEventListener("touchmove",o=>{if(o.touches.length===1)this.yaw-=(o.touches[0].clientX-r)*.007,this.pitch=Ye.clamp(this.pitch+(o.touches[0].clientY-a)*.005,-.05,1.2),r=o.touches[0].clientX,a=o.touches[0].clientY;else if(o.touches.length===2){let s=Math.hypot(o.touches[0].clientX-o.touches[1].clientX,o.touches[0].clientY-o.touches[1].clientY);this.dist=Ye.clamp(this.dist*(n/Math.max(s,1)),3.2,40),n=s}},{passive:!0})}update(e,t,i,r,a){e=Ye.clamp(Number.isFinite(e)?e:1/60,1/240,1/20);let n,o=r===2?Math.max(this.dist,17):this.dist,s=!Number.isFinite(this.cam.position.x+this.cam.position.y+this.cam.position.z)||this.cam.position.distanceTo(t)>80;if(!this.ready||s){this.focus.copy(t);if(r===1)n=new v(0,1.35,-2.9).applyQuaternion(i).add(t),this.cam.position.copy(n),this.cam.lookAt(new v(0,1,6).applyQuaternion(i).add(t));else n=new v(this.focus.x+o*Math.cos(this.pitch)*Math.sin(this.yaw),this.focus.y+o*Math.sin(this.pitch)+1,this.focus.z+o*Math.cos(this.pitch)*Math.cos(this.yaw)),n.y=Math.max(n.y,a+.6),this.cam.position.copy(n),this.cam.lookAt(this.focus.x,this.focus.y+1.15,this.focus.z);this.ready=!0;return}this.focus.lerp(t,1-Math.exp(-6*e));if(r===1){n=new v(0,1.35,-2.9).applyQuaternion(i).add(t);let l=new v(0,1,6).applyQuaternion(i).add(t);this.cam.position.lerp(n,1-Math.exp(-8*e)),this.cam.lookAt(l)}else n=new v(this.focus.x+o*Math.cos(this.pitch)*Math.sin(this.yaw),this.focus.y+o*Math.sin(this.pitch)+1,this.focus.z+o*Math.cos(this.pitch)*Math.cos(this.yaw)),n.y=Math.max(n.y,a+.6),this.cam.position.lerp(n,1-Math.exp(-9*e)),this.cam.lookAt(this.focus.x,this.focus.y+1.15,this.focus.z)}};function $e(e,t,i,r){let a=document.createElement(e);return t&&(a.className=t),r!==void 0&&(a.innerHTML=r),(i||document.body).appendChild(a),a}var zv=class{constructor(e){this.root=$e("div","hud-root");let t=$e("div","panel top-left",this.root);this.sog=$e("div","sog",t,"0.0"),$e("div","sog-label",t,"KN&nbsp;\xB7&nbsp;SOG");let i=$e("div","inst-row",t);this.hdg=this._mini(i,"HDG"),this.heel=this._mini(i,"HEEL"),this.vmg=this._mini(i,"VMG");let r=$e("div","panel top-right",this.root);r.innerHTML=`
      <svg viewBox="-70 -70 140 140" width="150" height="150">
        <circle r="62" fill="rgba(8,14,22,0.35)" stroke="rgba(255,255,255,0.25)"/>
        <g id="rose-ticks"></g>
        <polygon points="0,-13 8,11 0,6 -8,11" fill="#e8ecf2"/>
        <g id="tw-arrow"><path d="M0,-58 L6,-44 L2,-46 L2,-30 L-2,-30 L-2,-46 L-6,-44 Z" fill="#4db6e8"/></g>
        <g id="aw-arrow"><path d="M0,-58 L6,-44 L2,-46 L2,-30 L-2,-30 L-2,-46 L-6,-44 Z" fill="#e8654a"/></g>
        <text id="rose-n" y="-50" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-size="11">N</text>
      </svg>`;let a=r.querySelector("#rose-ticks");for(let h=0;h<12;h++){let c=h*30*Math.PI/180,u=document.createElementNS("http://www.w3.org/2000/svg","line");u.setAttribute("x1",Math.sin(c)*56),u.setAttribute("y1",-Math.cos(c)*56),u.setAttribute("x2",Math.sin(c)*62),u.setAttribute("y2",-Math.cos(c)*62),u.setAttribute("stroke","rgba(255,255,255,0.3)"),a.appendChild(u)}this.twArrow=r.querySelector("#tw-arrow"),this.awArrow=r.querySelector("#aw-arrow"),this.roseTicksG=a,this.roseN=r.querySelector("#rose-n");let n=$e("div","wind-text",r);this.tws=$e("span","tws",n,"TWS 0.0"),this.aws=$e("span","aws",n,"AWS 0.0");let o=$e("div","panel bottom-left",this.root);this.bars={};for(let[h,c,u]of[["main","MAIN","W/S"],["jib","JIB","Q/E"],["vang","VANG","R/F"],["cun","CUN","T/G"],["out","OUT","Y/H"],["hike","HIKE","Z/X"]]){let p=$e("div","trim-row",o);$e("span","trim-label",p,c);let m=$e("div","trim-track",p);this.bars[h]=$e("div","trim-fill",m),$e("span","trim-keys",p,u)}this.kiteState=$e("div","kite-state",o,"KITE STOWED \u2014 SPACE"),this.crewState=$e("div","crew-state",o,"CREW \xB7 SEATED \xB7 3 SUPPORT TARGETS"),this.rigState=$e("div","rig-state",o,"RIG \xB7 SHEET 0 N \xB7 CABLE LAG 0 mm"),this.alert=$e("div","alert",this.root),this.hint=$e("div","hint",this.root,"drag to orbit \xB7 scroll to zoom \xB7 <b>K</b> for all controls"),setTimeout(()=>this.hint.classList.add("fade"),9e3);let s=$e("div","panel bottom-right",this.root);$e("div","env-title",s,"CONDITIONS"),this.envCtl={};let l=(h,c,u,p,m,g,_)=>{let f=$e("div","env-row",s);$e("span","env-label",f,c);let d=$e("input","",f);d.type="range",d.min=u,d.max=p,d.step=g,d.value=m;let M=$e("span","env-val",f,_(m));return d.addEventListener("input",()=>{M.textContent=_(+d.value),e.onChange()}),this.envCtl[h]=d,d};l("tws","WIND",3,28,11,.5,h=>h.toFixed(0)+" kn"),l("twd","DIR",0,359,0,1,h=>h.toFixed(0)+"\xB0"),l("gust","GUSTS",0,40,16,1,h=>h.toFixed(0)+"%"),l("sea","SEA",0,220,100,5,h=>(h/100).toFixed(1)+"\xD7"),this.sideSwitchButton=$e("button","crew-drill-button",s,"SWITCH-SIDE DRILL \xB7 B"),this.sideSwitchButton.addEventListener("click",()=>e.onSideSwitch()),this.help=$e("div","help-overlay",this.root,`
      <div class="help-card">
        <h2>LASER 2 \u2014 SAILING CONTROLS</h2>
        <div class="help-grid">
          <span>\u25C0 \u25B6 / A D</span><span>tiller (helm)</span>
          <span>W / S</span><span>mainsheet in / out</span>
          <span>Q / E</span><span>jib sheet in / out <i>(kite sheet when flying)</i></span>
          <span>SPACE</span><span>hoist / douse spinnaker</span>
          <span>R / F</span><span>vang (kicker) on / off</span>
          <span>T / G</span><span>cunningham on / off</span>
          <span>Y / H</span><span>outhaul on / off</span>
          <span>Z / X</span><span>hike in / out &nbsp;(X or SHIFT = hike hard)</span>
          <span>C</span><span>crew on / off the trapeze</span>
          <span>B</span><span>run a coordinated helm/crew side-switch drill</span>
          <span>V</span><span>camera: orbit \u2192 onboard \u2192 wide</span>
          <span>P</span><span>pause</span>
          <span>N</span><span>reset after capsize</span>
          <span>K</span><span>close this card</span>
        </div>
        <p class="help-tips">Sail with the telltale of physics: sheet in until the luff
        stops shaking, hike to keep her flat, ease everything and square away before
        hoisting the kite. She'll capsize if you let her.</p>
      </div>`),this.fps=$e("div","fps",this.root)}_mini(e,t){let i=$e("div","inst",e),r=$e("div","inst-val",i,"0");return $e("div","inst-label",i,t),r}update(e){this.sog.textContent=e.sog.toFixed(1),this.hdg.textContent=Math.round((e.hdg+360)%360)+"\xB0",this.heel.textContent=Math.round(Math.abs(e.heel))+"\xB0"+(e.heel>2?" S":e.heel<-2?" P":""),this.vmg.textContent=e.vmg.toFixed(1),this.roseTicksG.setAttribute("transform",`rotate(${-e.hdg})`),this.roseN.setAttribute("transform",`rotate(${-e.hdg})`),this.twArrow.setAttribute("transform",`rotate(${e.twaRel})`),this.awArrow.setAttribute("transform",`rotate(${e.awaRel})`),this.tws.textContent="TWS "+e.tws.toFixed(1),this.aws.textContent="AWS "+e.aws.toFixed(1),this.bars.main.style.width=e.trims.mainScope*100+"%",this.bars.jib.style.width=(e.kiteUp?e.trims.kiteSheet:e.trims.jibScope)*100+"%",this.bars.vang.style.width=e.trims.vang*100+"%",this.bars.cun.style.width=e.trims.cunningham*100+"%",this.bars.out.style.width=e.trims.outhaul*100+"%",this.bars.hike.style.width=e.trims.hike*100+"%",this.kiteState.textContent=e.kiteUp?"KITE FLYING \u2014 SPACE TO DOUSE":"KITE STOWED \u2014 SPACE TO HOIST",this.crewState.textContent="CREW \xB7 "+e.crewState+" \xB7 "+e.supportContacts+" SUPPORT TARGETS",this.rigState.textContent="RIG \xB7 WORK "+e.sheetLoadN.toFixed(0)+" N \xB7 TAIL "+e.sheetTailLoadN.toFixed(0)+" N \xB7 LAG "+e.visualCableLagMm.toFixed(0)+" mm",this.kiteState.classList.toggle("flying",e.kiteUp);let t="";e.capsized?t="CAPSIZED \u2014 press N to reset":Math.abs(e.heel)>32?t="SHE'S GOING OVER \u2014 HIKE!":e.planing&&(t="PLANING"),this.alert.textContent=t,this.alert.classList.toggle("bad",!!t&&!e.planing),this.alert.classList.toggle("good",e.planing&&Math.abs(e.heel)<=32&&!e.capsized),this.help.style.display=e.help?"flex":"none",this.fps.textContent=e.fps.toFixed(0)+" fps \xB7 "+e.physMs.toFixed(1)+" ms"}},kv=Object.freeze({release:"3.0.0",hullTopology:"outward-wound-shell-deck-transom-bow-cap",humanBackends:"local-vrm-or-validated-humanoid-glb-with-embedded-procedural-fallback",seatedPoseTargets:"geometry-derived-seat-and-cockpit-sole",headBoomAvoidance:"live-head-sphere-to-boom-segment-surface-clearance",physicalMainsheet:"frictionless-four-segment-force-coupled-reeved-xpbd",ropeVisuals:"bidirectional-projected-target-tracking-cables",sailAero:"strip-authoritative-main-jib-with-triangle-water-contact-only",certifiedDesignModel:!1}),Ee=cv,$h=document.getElementById("c"),Mi=new Eh({canvas:$h,antialias:!0});Mi.setSize(window.innerWidth,window.innerHeight),Mi.setPixelRatio(Math.min(window.devicePixelRatio,2)),Mi.toneMapping=Wo,Mi.toneMappingExposure=1.05,Mi.outputColorSpace=vt,Mi.shadowMap.enabled=!0,Mi.shadowMap.type=Fo;var ti=new Th,ii=new hi(55,window.innerWidth/window.innerHeight,.08,2e4);ii.position.set(-7,3,-7);var i0=new v(.45,.52,.32).normalize(),ri=new Lf(16773856,3.4);ri.castShadow=!0,ri.shadow.mapSize.set(2048,2048),ri.shadow.camera.left=-11,ri.shadow.camera.right=11,ri.shadow.camera.top=12,ri.shadow.camera.bottom=-7,ri.shadow.camera.near=18,ri.shadow.camera.far=110,ri.shadow.bias=-35e-5,ri.shadow.normalBias=.035,ti.add(ri,ri.target),ti.add(new Af(12376302,1849936,.5));var Pt=new fv(Ee.wind),Oi=new xv(ti,Ee.sea,i0);Oi.setSea(Pt.speed10,Pt.fromDeg);window.LASER2_WATER_INTERNAL=Oi;window.LASER2_WIND_INTERNAL=Pt;{let e=new Hs(Mi),t=new Th;t.add(new De(new Lr(100,32,16),Oi.skyMat)),ti.environment=e.fromScene(t,.05).texture}var rt=new mv(Ee.env.g);rt.iterations=Ee.sim.iterations;var Bv=Ee.hull.massHull+Ee.hull.massCrew+Ee.hull.massFoils,be=new uv(Bv,new v(Ee.hull.inertia.pitch,Ee.hull.inertia.yaw,Ee.hull.inertia.roll));rt.addBody(be);var qn=new v(0,Ee.hull.bodyReferenceY,Ee.hull.comZ),Ya=e=>e.clone().sub(qn),Vv=new v().copy(qn),r0=new Ct().setFromAxisAngle(new v(0,1,0),-Math.PI/2);be.pos.copy(Vv.clone().applyQuaternion(r0)),be.quat.copy(r0);var lo=e=>be.localToWorld(Ya(e),new v),nt=Ev(Ee);ti.add(nt.group);var Hv=Tv(Ee),yt=new Iv(be,Hv,Oi,Ee,Ya);yt.solveStatic(),rt.forceHooks.push(e=>yt.hook(e));var Se=Av(rt,be,Ee,lo,Ya);ti.add(Se.group);var zt=Pv(rt,Ee,Se,lo);ti.add(zt.cloth.mesh);var Qi=Dv(rt,Ee,Se,be,Ya,lo);ti.add(Qi.cloth.mesh);var at=Uv(rt,Ee,Se,be,Ya,lo);ti.add(at.cloth.mesh);var Ze=new t0(nt.group,"helm",Ee,{height:1.8,vest:4881333,vestTrim:14541542,cap:15526626,wetsuit:3949389,glove:9080985}),st=new t0(nt.group,"crew",Ee,{height:1.72,vest:13912122,vestTrim:15262938,cap:3357252,wetsuit:4344406,skin:11039828,glove:9080985}),da={mainsheet:new v,mainsheetTan:new v(1,0,0),jib:new v,jibTan:new v(1,0,0),kite:new v,kiteTan:new v(1,0,0)},kt={tillerTip:new v,mainsheet:new v,mainsheetTan:new v,jib:new v,jibTan:new v,kite:new v,kiteTan:new v,trapHandle:new v},a0=new v(0,3.2,2),ec=new v(0,3,2.5),tc=Se.boom.map(()=>new v),Yn=(e,t)=>Pt.velocityAt(e,t),ix=new v;rt.forceHooks.push(()=>{let e=(t,i)=>Oi.height(t,i);zt.cloth.applyStripAero(Yn,Ee.env.rhoAir,{area:Ee.main.area,clAlpha:5,stallSin:.52,camberK:1.7,cd0:.018,ar:4.2}),zt.cloth.applyAero(Yn,e,Ee.env.rhoAir,0,0,.5),Qi.cloth.applyStripAero(Yn,Ee.env.rhoAir,{area:Ee.jib.area,clAlpha:5.2,stallSin:.52,camberK:1.7,cd0:.02,ar:3.4}),Qi.cloth.applyAero(Yn,e,Ee.env.rhoAir,0,0,.5),at.cloth.aeroScale>.01&&at.cloth.applyAero(Yn,e,Ee.env.rhoAir,2.2,1.4,.62);for(let t of[...Se.mast,...Se.boom]){let i=Oi.height(t.x.x,t.x.z);t.x.y<i&&(t.f.y+=26,t.f.addScaledVector(t.v,-4/t.w*.05))}});var dt=new Ov($h),Gv=new Fv(ii,$h),pa=new zv({onChange:()=>{Pt.speed10=+pa.envCtl.tws.value*.5144,Pt.fromDeg=+pa.envCtl.twd.value,Pt.gustiness=+pa.envCtl.gust.value/100,Ee.sea.userScale=+pa.envCtl.sea.value/100,Oi.setSea(Pt.speed10,Pt.fromDeg)},onSideSwitch:()=>{dt.state.sideSwitchReq=!0}}),n0=new v,Ka=Nv(ti,{rig:Se,main:zt,jib:Qi,spin:at,body:be,d2b:Ya,cfg:Ee,getMainScope:()=>Se.sheetVisualRest,getTrapeze:()=>({on:dt.state.trapeze&&!Nr,side:ai}),crewHarness:n0,holds:da});function ic(e){let t=dt.state;Se.sheetVisualRest=Ye.lerp(Ee.rig.mainsheetMax,Ee.rig.mainsheetMin,t.mainScope),Se.sheetC.setTrim(t.mainScope),Se.vangC.rest=Ye.lerp(Ee.rig.vangMax,Ee.rig.vangMin,t.vang),zt.setCunningham(t.cunningham),zt.setOuthaul(t.outhaul),Qi.setHalyard(t.jibHalyard),Qi.setTrim(t.jibScope,-ai),yt.rudderAngle=-t.tiller*Ee.foils.rudder.maxDeg*Math.PI/180,at.update(e,t.kiteSheet)}var ai=-1,Nr=!1,Kn=0,ho=0,rc=0,ma=0,co=0,uo=.2,po=0,Jn=0;Pt.update(0),Oi.time=0;var Wv=typeof location<"u"&&/debug/.test(location.search);if(!1){for(let e=0;e<150;e++)yt.dampBoost=1+7*Math.max(0,1-e/100),ic(1/60),rt.step(1/60,Ee.sim.substeps);yt.dampBoost=1}var fr={parts:[],body:null};function Xv(){fr.parts=rt.particles.map(e=>({x:e.x.clone(),v:e.v.clone()})),fr.body={pos:be.pos.clone(),quat:be.quat.clone(),vel:be.vel.clone(),om:be.omega.clone()}}Xv();function ac(){rt.particles.forEach((e,t)=>{e.x.copy(fr.parts[t].x),e.p.copy(fr.parts[t].x),e.v.copy(fr.parts[t].v),e.f.set(0,0,0)}),be.pos.copy(fr.body.pos),be.quat.copy(fr.body.quat),be.vel.copy(fr.body.vel),be.omega.copy(fr.body.om),at.state.up&&(at.state.up=!1,at.state.t=99,at._setEnabled()),at.cloth.aeroScale=0,Nr=!1,Kn=0,ho=0,Oi.time=0,Pt.time=0,dt.state.tiller=0,uo=.2,co=0,po=0,ma=0,Jn=0,ai=-1,Se.sheetC.resetToCurrentTrim(),Object.values(Ka.ropes).forEach(e=>e.initialized=!1),Ze.reset(ai),st.reset(ai),fa.set(-1,0,0).applyQuaternion(be.quat),rc=-Math.asin(Ye.clamp(fa.y,-1,1))*57.2958*-ai}var Ja=new v,fa=new v,s0=new v,Bt=new v,bi=new v,Za=new v,jv=new Ct,qv=new v(0,1,0),mo=0,fo=60;function nc(e){dt.kiteUp=at.state.up,dt.update(e),dt.state.resetReq&&(dt.state.resetReq=!1,ac()),dt.state.kiteToggleReq&&(dt.state.kiteToggleReq=!1,at.state.up?at.douse():at.hoist()),Pt.update(e),ho+=e,Oi.time=ho,fa.set(-1,0,0).applyQuaternion(be.quat),Pt.velocityAtHeight(4,bi);let t=-bi.dot(fa);dt.state.sideSwitchReq&&(dt.state.sideSwitchReq=!1,ai=-ai,ma=0,Jn=3.2,Ze.sideRequestAge=Ze.rolePhaseOffset,st.sideRequestAge=0),Jn>0?Jn=Math.max(0,Jn-e):Math.abs(t)>.8&&Math.sign(t)!==ai?(ma+=e,ma>.45&&(ai=Math.sign(t),ma=0)):ma=Math.max(0,ma-2*e),at.state.up&&at.setPoleSide(ai),ic(e),vo(0,!1);for(let f=0;f<Se.boom.length;f++)tc[f].copy(Se.boom[f].x),nt.group.worldToLocal(tc[f]);let i=-Math.asin(Ye.clamp(fa.y,-1,1))*57.2958*-ai,r=(i-(rc??i))/e;rc=i,co+=(r-co)*Math.min(1,8*e);let a=dt.state.trapeze&&!Nr,n=a?.62:.38,o=i+co*.33,s=Ye.clamp(o/(a?8.5:11),-n,1),l=dt.state.hike*.55*(.3+.7*Ye.clamp(i/9,0,1)),h=Nr?0:Ye.clamp(s*.85+l,-n,1),c=(a?1.9:2.4)*e;uo+=Ye.clamp(h-uo,-c,c);let u=uo;bi.set(0,0,1).applyQuaternion(be.quat);let p=Math.asin(Ye.clamp(bi.y,-1,1))*57.2958,m=Ye.clamp((-p-2.5)*.11,0,1);po+=Ye.clamp(m-po,-1.6*e,1.6*e);let g={dt:e,windSide:ai,hike:u,trapeze:dt.state.trapeze,aft:po,capsized:Nr,kiteUp:at.state.up,holds:kt,boomLine:tc,extensionLen:.95};Ze.update({...g,lookAt:a0}),st.update({...g,lookAt:ec}),yt.helmComLocal.copy(Ze.articulatedComLocal).sub(qn),yt.crewComLocal.copy(st.articulatedComLocal).sub(qn),yt.helmX=yt.helmComLocal.x,yt.crewX=yt.crewComLocal.x,yt.crewY=yt.crewComLocal.y,yt.crewAft=0;let _=performance.now();rt.step(Ee.sim.dt,Ee.sim.substeps),mo=mo*.9+(performance.now()-_)*.1,s0.set(0,1,0).applyQuaternion(be.quat),s0.y<.25?Kn+=e:Kn=Math.max(0,Kn-2*e),Nr=Kn>1.2,vo(e,!0),isFinite(be.pos.x+be.pos.y+be.pos.z)||(console.error("physics NaN \u2014 auto reset"),ac())}var Qa=new v,go=new v,_o=new v,sc=new v;function o0(e){go.copy(e.human.cur.head),nt.group.localToWorld(go),e.headBoomSurfaceClearanceM=99;for(let t=0;t<Se.boom.length-1;t++){let i=Se.boom[t].x,r=Se.boom[t+1].x;_o.copy(r).sub(i);let a=Math.max(1e-8,_o.lengthSq()),n=Ye.clamp(sc.copy(go).sub(i).dot(_o)/a,0,1);sc.copy(i).addScaledVector(_o,n),e.headBoomSurfaceClearanceM=Math.min(e.headBoomSurfaceClearanceM,go.distanceTo(sc)-(e.human.P.headR+.04))}}function vo(e,t=!0){be.localToWorld(bi.set(0,0,0).sub(qn),Qa),nt.group.position.copy(Qa),nt.group.quaternion.copy(be.quat),nt.rudderPivot.rotation.y=-yt.rudderAngle,Se.update(),zt.cloth.syncMesh(),Qi.cloth.syncMesh(),at.cloth.syncMesh(),at.cloth.mesh.visible=at.state.up||at.state.t<2.5,nt.group.updateMatrixWorld(!0),nt.group.localToWorld(n0.copy(st.harness)),Ka.update(t?e:0,dt.state,ho),kt.mainsheet.copy(da.mainsheet),nt.group.worldToLocal(kt.mainsheet),kt.jib.copy(da.jib),nt.group.worldToLocal(kt.jib),kt.kite.copy(da.kite),nt.group.worldToLocal(kt.kite);let i=jv.copy(nt.group.quaternion).invert();if(kt.mainsheetTan.copy(da.mainsheetTan).applyQuaternion(i),kt.jibTan.copy(da.jibTan).applyQuaternion(i),kt.kiteTan.copy(da.kiteTan).applyQuaternion(i),bi.set(0,.23,1.13).applyQuaternion(nt.rudderPivot.quaternion).add(nt.rudderPivot.position),kt.tillerTip.copy(bi),Bt.copy(Se.hounds.x),nt.group.worldToLocal(Bt),kt.trapHandle.copy(Bt).sub(st.harness).normalize().multiplyScalar(.55).add(st.harness),Bt.copy(Se.mast[7].x),nt.group.worldToLocal(Bt),a0.set(Bt.x*.4,2.6,2.5),at.state.up?(Bt.copy(at.cloth.parts[8][5].x),nt.group.worldToLocal(Bt),ec.copy(Bt)):(Bt.copy(Qi.cloth.parts[6][2].x),nt.group.worldToLocal(Bt),ec.copy(Bt)),Ze.extensionEnd){let r=nt.extension;Bt.copy(Ze.extensionEnd).add(kt.tillerTip).multiplyScalar(.5),r.position.copy(Bt),bi.copy(Ze.extensionEnd).sub(kt.tillerTip);let a=Math.max(bi.length(),.2);r.scale.set(1,a,1),r.quaternion.setFromUnitVectors(qv,bi.normalize())}o0(Ze),o0(st),ri.position.copy(Qa).addScaledVector(i0,55),ri.target.position.copy(Qa),Oi.update(ho,ii,Qa)}function l0(){Ja.set(0,0,1).applyQuaternion(be.quat);let e=Math.atan2(-Ja.x,Ja.z)*57.2958;fa.set(-1,0,0).applyQuaternion(be.quat);let t=-Math.asin(Ye.clamp(fa.y,-1,1))*57.2958;Pt.velocityAtHeight(4.5,bi),Bt.copy(bi).sub(be.vel),Za.copy(Bt).multiplyScalar(-1);let i=Math.atan2(-Za.x,Za.z)*57.2958,r=Math.hypot(be.vel.x,be.vel.z);Yh(Pt.curFromDeg,Za);let a=(be.vel.x*Za.x+be.vel.z*Za.z)*1.9438;return{sog:r*1.9438,hdg:e,heel:t,vmg:a,twaRel:(Pt.curFromDeg-e)%360,awaRel:(i-e)%360,tws:Pt.curSpeed*1.9438,aws:Bt.length()*1.9438,trims:dt.state,kiteUp:at.state.up,capsized:Nr,planing:r*1.9438>8.5,crewState:st.crossing?"CROSSING":st.boomAvoidance>.35?"DUCKING":st.trapB>.35?"TRAPEZE":st.lean>.28?"HIKING":"SEATED",supportContacts:Ze.supportContactCount+st.supportContactCount,sheetLoadN:Math.max(0,Se.sheetC.workingTensionN||0),sheetTailLoadN:Math.max(0,Se.sheetC.tailTensionN||0),visualCableLagMm:Math.max(0,(Ka.ropes.mainsheet.maxTrackingErrorM||0)*1e3),help:dt.state.help,fps:fo,physMs:mo}}var h0=performance.now(),xo=0;window.LASER2_FRAME_HOOKS=window.LASER2_FRAME_HOOKS||[];function c0(e){for(let t of window.LASER2_FRAME_HOOKS)try{t(e)}catch(i){console.error("Laser 2 external frame hook failed",i)}}function u0(e){requestAnimationFrame(u0);let t=Math.min((e-h0)/1e3,.1);if(h0=e,fo=fo*.95+1/Math.max(t,1e-4)*.05,!dt.state.paused){xo+=t;let r=0;for(;xo>=Ee.sim.dt&&r<Ee.sim.maxCatchup;)nc(Ee.sim.dt),xo-=Ee.sim.dt,r++;r===Ee.sim.maxCatchup&&(xo=0)}vo(0,!1);let i=Oi.height(ii.position.x,ii.position.z);window.__camLock||Gv.update(t,Qa,be.quat,dt.state.camMode,i),pa.update(l0()),c0(t),Mi.render(ti,ii)}requestAnimationFrame(u0),window.addEventListener("resize",()=>{ii.aspect=window.innerWidth/window.innerHeight,ii.updateProjectionMatrix(),Mi.setSize(window.innerWidth,window.innerHeight)}),window.__dbg={scan(){let e=[];return rt.particles.forEach((t,i)=>{isFinite(t.x.x+t.x.y+t.x.z+t.v.x+t.v.y+t.v.z)||e.push(i)}),{badCount:e.length,first:e.slice(0,10),body:be.pos.toArray().map(t=>+t.toFixed(4)),vel:be.vel.toArray().map(t=>+t.toFixed(4)),om:be.omega.toArray().map(t=>+t.toFixed(4)),quatLen:Math.hypot(be.quat.x,be.quat.y,be.quat.z,be.quat.w)}},ap:{on:!1,target:90},step(e=1){for(let t=0;t<e;t++){if(this.ap.on){Ja.set(0,0,1).applyQuaternion(be.quat);let i=Math.atan2(-Ja.x,Ja.z)*57.2958,r=(this.ap.target-i+540)%360-180;dt.state.tiller=Ye.clamp(r*.06-be.omega.y*57.2958*.02,-1,1)}nc(Ee.sim.dt)}return this.scan()},substep(){return ic(1/60),rt.step(1/60/Ee.sim.substeps,1),this.scan()},part(e){let t=rt.particles[e];return{x:t.x.toArray(),v:t.v.toArray(),w:t.w}},counts:{mast:12,spreaders:2,boom:4,apex:1,main:Ee.main.rows*Ee.main.cols,jib:Ee.jib.rows*Ee.jib.cols,spin:Ee.spin.rows*Ee.spin.cols,pole:2},disableHooks(){rt.forceHooks.length=0},conCount(){return rt.constraints.length},range(e,t){rt.constraints.forEach((i,r)=>i.enabled=r>=e&&r<t)},allCons(){rt.constraints.forEach(e=>e.enabled=!0)},conInfo(e){let t=rt.constraints[e];return{type:t.constructor.name,rest:t.rest,alpha:t.alpha,uni:t.uni}},freeze(){rt.particles.forEach(e=>{e.v.set(0,0,0)}),be.vel.set(0,0,0),be.omega.set(0,0,0)},aeroStats(){let e=zt.cloth,t=e.flat,i=0,r=0,a=0,n=0,o=0,s=0,l=new v,h=new v,c=new v,u=new v,p=new v;for(let f of e.tris){let d=t[f[0]],M=t[f[1]],x=t[f[2]];p.copy(d.x).add(M.x).add(x.x).multiplyScalar(1/3),Pt.velocityAt(p,l),l.x-=(d.v.x+M.v.x+x.v.x)/3,l.y-=(d.v.y+M.v.y+x.v.y)/3,l.z-=(d.v.z+M.v.z+x.v.z)/3,h.copy(M.x).sub(d.x),c.copy(x.x).sub(d.x),u.crossVectors(h,c);let S=u.length();if(S<1e-8)continue;u.multiplyScalar(1/S);let D=S/2,R=l.length(),L=l.dot(u),B=Math.abs(L)/Math.max(R,1e-6),b=1-Math.min(Math.max((B-.44)/(.44*.7),0),1),E=(3.6*b+1.3*(1-.3*b))*B;i+=D,r+=R*D,a+=B*D,s+=b*D,n+=Math.abs(.5*1.225*D*R*L*(3.6*b+1.3*(1-.3*b))),o++}let m=e.parts[7],g=m[0].x,_=m[e.cols-1].x;return{tris:o,areaSum:+i.toFixed(2),meanU:+(r/i).toFixed(2),meanSinA:+(a/i).toFixed(3),meanAtt:+(s/i).toFixed(2),instFsum:+n.toFixed(0),chordMid:[g.toArray().map(f=>+f.toFixed(2)),_.toArray().map(f=>+f.toFixed(2))]}},velAudit(){let e=new v(0,0,1).applyQuaternion(be.quat),t=new v(-1,0,0).applyQuaternion(be.quat),i=be.vel.dot(e),r=be.vel.dot(t),a=Math.abs(i),n=.5*1025*Ee.hydro.cf*Ee.hydro.wetted*a*a,o=Math.exp(-Math.pow((a-Ee.hydro.humpSpeed)/.55,2)),s=1/(1+Math.exp(-(a-Ee.hydro.humpSpeed*1.25)*2.2)),l=Ee.hydro.residuaryK*a*a*(.1+o*.9)*(1-Ee.hydro.planingRelief*s);return{vFwd:+i.toFixed(2),vLat:+r.toFixed(2),leewayDeg:+(Math.atan2(r,i)*57.3).toFixed(1),skin:+n.toFixed(1),resid:+l.toFixed(1),boardStalled:yt.boardStalled,subFrac:+yt.submergedFrac.toFixed(2)}},rollAudit(){let e=new v(0,0,1).applyQuaternion(be.quat),t={};be.force.set(0,0,0),be.torque.set(0,0,0),rt.forceHooks[0](1/720),t.hydroRoll=+be.torque.dot(e).toFixed(0),be.force.set(0,0,0),be.torque.set(0,0,0),rt.particles.forEach(n=>n.f.set(0,0,0)),rt.forceHooks[1](1/720);let i=new v,r=new v,a=new v;for(let n of[zt.cloth,Qi.cloth,at.cloth])for(let o of n.flat)r.copy(o.x).sub(be.pos),i.add(r.clone().cross(o.f)),a.add(o.f);return t.aeroRoll=+i.dot(e).toFixed(0),t.aeroF=a.toArray().map(n=>+n.toFixed(0)),be.torque.set(0,0,0),t.crewX=+yt.crewX.toFixed(2),t.helmX=+yt.helmX.toFixed(2),be.force.set(0,0,0),be.torque.set(0,0,0),t},rigProbe(){let e=t=>{let i;if(t.local){let r=new v;be.localToWorld(t.local,r),i=t.p.x.distanceTo(r)}else i=t.a.x.distanceTo(t.b.x);return{type:t.constructor.name.slice(0,4),d:+i.toFixed(3),rest:+t.rest.toFixed(3),T:+(t.tension||0).toFixed(0),on:t.enabled!==!1}};return{houndsY:+Se.hounds.x.y.toFixed(2),shrouds:Se.shroudCs.map(e),forestay:e(Se.forestayC),stop:Se.stops.map(e)}},probe(){let e=Se.boom[3].x,t=Se.bridleApex.x;return{sheetD:+e.distanceTo(t).toFixed(3),sheetRest:+Se.sheetC.rest.toFixed(3),sheetT:+(Se.sheetC.tension||0).toFixed(1),apex:t.toArray().map(i=>+i.toFixed(2)),boomEnd:e.toArray().map(i=>+i.toFixed(2)),boom0:Se.boom[0].x.toArray().map(i=>+i.toFixed(2)),vangD:+Se.boom[1].x.distanceTo(Se.mast[0].x).toFixed(3),vangRest:+Se.vangC.rest.toFixed(3),outhD:+zt.cloth.parts[0][zt.cloth.cols-1].x.distanceTo(Se.boom[3].x).toFixed(3),outhRest:+zt.outhaulC.rest.toFixed(3),clewDownD:+zt.cloth.parts[0][zt.cloth.cols-1].x.distanceTo(Se.boom[2].x).toFixed(3),clewDownRest:+zt.clewDown.rest.toFixed(3),tackD:+zt.cloth.parts[0][0].x.distanceTo(Se.boom[0].x).toFixed(3),mastBase:Se.mast[0].x.toArray().map(i=>+i.toFixed(2)),hounds:Se.hounds.x.toArray().map(i=>+i.toFixed(2))}},sailForce(){rt.particles.forEach(s=>s.f.set(0,0,0)),rt.forceHooks[1](1/600);let e=s=>s.flat.reduce((l,h)=>[l[0]+h.f.x,l[1]+h.f.y,l[2]+h.f.z],[0,0,0]).map(l=>+l.toFixed(1)),t=Se.boom[0].x,i=Se.boom[3].x,r=new v().copy(i).sub(t),a=new v(0,0,1).applyQuaternion(be.quat),n=new v(-1,0,0).applyQuaternion(be.quat),o=Math.atan2(r.dot(n),-r.dot(a))*57.3;return{main:e(zt.cloth),jib:e(Qi.cloth),boomAngle:+o.toFixed(1)}},forces(){let e={};for(let t=0;t<rt.forceHooks.length;t++)be.force.set(0,0,0),be.torque.set(0,0,0),rt.forceHooks[t](1/600),e["hook"+t]={f:be.force.toArray().map(i=>+i.toFixed(1)),t:be.torque.toArray().map(i=>+i.toFixed(1))};return be.force.set(0,0,0),be.torque.set(0,0,0),e.weight=+(9.81/be.invMass).toFixed(1),e.submerged=+yt.submergedFrac.toFixed(3),e},world:rt,body:be,rig:Se,hydro:yt},window.__camLocal=(e,t,i,r,a,n)=>{window.__camLock=!0;let o=new v(e,t,i),s=new v(r,a,n);nt.group.updateMatrixWorld(!0),nt.group.localToWorld(o),nt.group.localToWorld(s),ii.position.copy(o),ii.lookAt(s),Mi.render(ti,ii)},window.__spawnRest=async()=>{let{ProceduralHuman:e}=await Promise.resolve().then(()=>(Xf(),Bf)).catch(()=>null)||{};return"use bundled"},window.__restHuman=()=>{let e=new Ze.human.constructor({height:1.76,vest:13912122,vestTrim:15262938});return e.group.position.set(0,.52,1.3),nt.group.add(e.group),"spawned"},window.__dbgSailor2=()=>({crewTrapB:+st.trapB.toFixed(2),crewCrossing:st.crossing?+st.crossing.t.toFixed(2):null,helmCrossing:Ze.crossing?+Ze.crossing.t.toFixed(2):null,ctxTrapeze:dt.state.trapeze,crewSide:st.side,windSide:ai,helmSeatContact:Ze.seatContactActive,crewSeatContact:st.seatContactActive,helmSeatErrorM:+Ze.seatContactErrorM.toFixed(4),crewSeatErrorM:+st.seatContactErrorM.toFixed(4),helmSupports:Ze.supportContactCount,crewSupports:st.supportContactCount,helmCom:Ze.articulatedComLocal.toArray().map(e=>+e.toFixed(3)),crewCom:st.articulatedComLocal.toArray().map(e=>+e.toFixed(3)),helmComValid:Ze.comValid,crewComValid:st.comValid,helmBoomAvoidance:+Ze.boomAvoidance.toFixed(2),crewBoomAvoidance:+st.boomAvoidance.toFixed(2),helmBoomHorizontalM:+Ze.boomHorizontalClearanceM.toFixed(3),crewBoomHorizontalM:+st.boomHorizontalClearanceM.toFixed(3),crewPelvis:st.pelvis.toArray().map(e=>+e.toFixed(2)),helmHands:[Ze.hands[0].toArray().map(e=>+e.toFixed(2)),Ze.hands[1].toArray().map(e=>+e.toFixed(2))],holdTiller:kt.tillerTip.toArray().map(e=>+e.toFixed(2)),holdMainsheet:kt.mainsheet.toArray().map(e=>+e.toFixed(2)),holdJib:kt.jib.toArray().map(e=>+e.toFixed(2)),extEnd:Ze.extensionEnd?Ze.extensionEnd.toArray().map(e=>+e.toFixed(2)):null}),window.__dbgSailor=()=>{let e=Ze.human.bones.shinL,t=new v;return e.getWorldPosition(t),nt.group.worldToLocal(t),{curKneeL:Ze.human.cur.kneeL.toArray().map(i=>+i.toFixed(3)),boneKneeL:t.toArray().map(i=>+i.toFixed(3)),curPelvis:Ze.human.cur.pelvis.toArray().map(i=>+i.toFixed(3)),lean:+Ze.lean.toFixed(2),side:Ze.side,feet0:Ze.feet[0].toArray().map(i=>+i.toFixed(3)),handL:Ze.hands[0].toArray().map(i=>+i.toFixed(3)),boneQ:Ze.human.bones.thighL.quaternion.toArray().map(i=>+i.toFixed(3))}},window.__sim={pause(e=!0){dt.state.paused=e},stepN(e){for(let t=0;t<e;t++)nc(Ee.sim.dt);vo(0,!1),c0(Ee.sim.dt)},set(e){Object.assign(dt.state,e)},hoist(){at.hoist()},douse(){at.douse()},reset(){ac()},sideSwitch(){dt.state.sideSwitchReq=!0},setWind(e,t){pa.envCtl.tws.value=e,pa.envCtl.twd.value=t,Pt.speed10=e*.5144,Pt.fromDeg=t,Oi.setSea(Pt.speed10,t)},render(){Mi.render(ti,ii)},cam(e,t,i,r,a,n){ii.position.set(e,t,i),ii.lookAt(r||0,a||0,n||0)},get(){let e=l0();return{sog:e.sog,hdg:e.hdg,heel:e.heel,aws:e.aws,tws:e.tws,pos:be.pos.toArray(),capsized:Nr,physMs:mo,fps:fo,mastTipX:Se.mast[Se.mast.length-1].x.toArray(),mastBaseX:Se.mast[0].x.toArray(),sheetTension:Se.sheetC.workingTensionN||0,sheetTailTension:Se.sheetC.tailTensionN||0,sheetActiveLength:Se.sheetC.activeRest,sheetTargetLength:Se.sheetC.targetRest,kiteUp:at.state.up,nan:!isFinite(be.pos.x+be.pos.y+be.pos.z)}}};function Yv(){let e=a=>({seatTargetActive:a.seatContactActive,seatTargetErrorM:a.seatContactErrorM,plantedFeet:a.feetPlant.filter(n=>n>.5).length,footTargetDriftM:a.footTargetDriftM,handTargetErrorM:a.handTargetErrorM,handReachAdjustmentM:a.handReachAdjustmentM,headBoomSurfaceClearanceM:a.headBoomSurfaceClearanceM,comFinite:a.comValid,articulatedComLocal:a.articulatedComLocal.toArray()}),t=Object.values(Ka.ropes).filter(a=>a.mesh.visible&&a.initialized),i=t.reduce((a,n)=>Math.max(a,n.maxTrackingErrorM||0),0),r=t.reduce((a,n)=>Math.max(a,n.maxStretch01||0),0);return{helm:e(Ze),crew:e(st),rig:{workingTensionN:Se.sheetC.workingTensionN,tailTensionN:Se.sheetC.tailTensionN,activeLengthM:Se.sheetC.activeRest,targetLengthM:Se.sheetC.targetRest,solvedRestM:Se.sheetC.solvedRestM,geometricLengthM:Se.sheetC.segmentLengths.reduce((a,n)=>a+n,0),axialRigidityN:Se.sheetC.EA,solverFinite:Se.sheetC.solverFinite,allocationErrorM:Se.sheetC.allocationErrorM,segmentLengthsM:[...Se.sheetC.segmentLengths],segmentRestM:[...Se.sheetC.segmentRest],segmentTensionsN:[...Se.sheetC.segmentTensions],sheaveModel:Se.sheetC.sheaveModel,sheaveWrapAnglesRad:[...Se.sheetC.wrapAngles],tensionUniformityErrorN:Se.sheetC.tensionUniformityErrorN},cables:{visibleSolved:t.length,maxLagMm:i*1e3,maxStretch01:r}}}let Kv={set(e,t){if(!Number.isFinite(t))return!1;if(e==="seatOffsetMm")Ee.lab.seatOffsetM=Ye.clamp(t,-30,50)/1e3;else if(e==="boomSafetyMm")Ee.lab.boomSafetyRadiusM=Ye.clamp(t,100,300)/1e3;else if(e==="cableDecay")Va.velocityDecayRate=Ee.lab.visualCableDecayRate=Ye.clamp(t,2,20);else if(e==="cableFollow")Va.targetFollowRate=Ee.lab.visualCableFollowRate=Ye.clamp(t,8,60);else if(e==="rigComplianceLog")Se.sheetC.setBaseCompliance(10**t);else return!1;return!0},snapshot(){return{seatOffsetM:Ee.lab.seatOffsetM,boomSafetyRadiusM:Ee.lab.boomSafetyRadiusM,visualCableDecayRate:Va.velocityDecayRate,visualCableFollowRate:Va.targetFollowRate,sheetMaterialCompliance:1/Se.sheetC.EA}}};window.__labMetrics=Yv,window.__ropeAudit=()=>Object.fromEntries(Object.entries(Ka.ropes).map(([e,t])=>[e,{nodes:t.n,maxStretch01:+t.maxStretch01.toFixed(6),maxTrackingErrorM:+t.maxTrackingErrorM.toFixed(6),maxGoalJumpM:+t.maxGoalJumpM.toFixed(6),projectionResidual01:+t.projectionResidual01.toFixed(6),budgetResets:t.budgetResets||0,solved:t.initialized,visible:t.mesh.visible}]));let d0={receipt:kv,scene:ti,boat:nt.group,body:be,hydro:yt,config:Ee,physics:rt,water:Oi,wind:Pt,helm:Ze,crew:st,rig:Se,sails:{main:zt,jib:Qi,spin:at},ropeSystem:Ka,ropes:Ka.ropes,designToBody:Ya,bodyReference:qn,tuning:Kv,camera:ii,renderer:Mi,input:dt,holds:kt,boomLine:tc,sideSwitch:()=>dt.state.sideSwitchReq=!0};window.LASER2_CREW_RIGGING_MASTER_V2=d0,window.LASER2_CREW_RIGGING_MASTER_V1=d0})();/*! Bundled license information:

three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2023 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/
