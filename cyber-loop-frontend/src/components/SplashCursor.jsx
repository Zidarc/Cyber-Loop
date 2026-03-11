// SplashCursor — adapted from reactbits.dev/animations/splash-cursor
// Recolored for Stranger Things / Recursion Hell theme
import { useEffect, useRef } from 'react';

function SplashCursor({
  SIM_RESOLUTION = 128,
  DYE_RESOLUTION = 1440,
  CAPTURE_RESOLUTION = 512,
  DENSITY_DISSIPATION = 3.5,
  VELOCITY_DISSIPATION = 2,
  PRESSURE = 0.1,
  PRESSURE_ITERATIONS = 20,
  CURL = 3,
  SPLAT_RADIUS = 0.2,
  SPLAT_FORCE = 6000,
  SHADING = true,
  COLOR_UPDATE_SPEED = 10,
  BACK_COLOR = { r: 0, g: 0, b: 0 },
  TRANSPARENT = true
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function pointerPrototype() {
      this.id = -1; this.texcoordX = 0; this.texcoordY = 0;
      this.prevTexcoordX = 0; this.prevTexcoordY = 0;
      this.deltaX = 0; this.deltaY = 0;
      this.down = false; this.moved = false; this.color = [0,0,0];
    }

    let config = {
      SIM_RESOLUTION, DYE_RESOLUTION, CAPTURE_RESOLUTION,
      DENSITY_DISSIPATION, VELOCITY_DISSIPATION, PRESSURE,
      PRESSURE_ITERATIONS, CURL, SPLAT_RADIUS, SPLAT_FORCE,
      SHADING, COLOR_UPDATE_SPEED, PAUSED: false, BACK_COLOR, TRANSPARENT
    };

    let pointers = [new pointerPrototype()];
    const { gl, ext } = getWebGLContext(canvas);
    if (!ext.supportLinearFiltering) { config.DYE_RESOLUTION = 256; config.SHADING = false; }

    function getWebGLContext(canvas) {
      const params = { alpha:true, depth:false, stencil:false, antialias:false, preserveDrawingBuffer:false };
      let gl = canvas.getContext('webgl2', params);
      const isWebGL2 = !!gl;
      if (!isWebGL2) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
      let halfFloat, supportLinearFiltering;
      if (isWebGL2) {
        gl.getExtension('EXT_color_buffer_float');
        supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
      } else {
        halfFloat = gl.getExtension('OES_texture_half_float');
        supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
      }
      gl.clearColor(0,0,0,1);
      const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat && halfFloat.HALF_FLOAT_OES;
      let formatRGBA, formatRG, formatR;
      if (isWebGL2) {
        formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType);
        formatRG   = getSupportedFormat(gl, gl.RG16F,   gl.RG,   halfFloatTexType);
        formatR    = getSupportedFormat(gl, gl.R16F,    gl.RED,  halfFloatTexType);
      } else {
        formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        formatRG   = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        formatR    = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
      }
      return { gl, ext: { formatRGBA, formatRG, formatR, halfFloatTexType, supportLinearFiltering } };
    }

    function getSupportedFormat(gl, internalFormat, format, type) {
      if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
        switch (internalFormat) {
          case gl.R16F:  return getSupportedFormat(gl, gl.RG16F,   gl.RG,   type);
          case gl.RG16F: return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
          default:       return null;
        }
      }
      return { internalFormat, format };
    }

    function supportRenderTextureFormat(gl, internalFormat, format, type) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    }

    class Material {
      constructor(vertexShader, fragmentShaderSource) {
        this.vertexShader = vertexShader; this.fragmentShaderSource = fragmentShaderSource;
        this.programs = []; this.activeProgram = null; this.uniforms = [];
      }
      setKeywords(keywords) {
        let hash = 0;
        for (let i = 0; i < keywords.length; i++) hash += hashCode(keywords[i]);
        let program = this.programs[hash];
        if (program == null) {
          let fragmentShader = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
          program = createProgram(this.vertexShader, fragmentShader);
          this.programs[hash] = program;
        }
        if (program === this.activeProgram) return;
        this.uniforms = getUniforms(program); this.activeProgram = program;
      }
      bind() { gl.useProgram(this.activeProgram); }
    }

    class Program {
      constructor(vertexShader, fragmentShader) {
        this.uniforms = {};
        this.program = createProgram(vertexShader, fragmentShader);
        this.uniforms = getUniforms(this.program);
      }
      bind() { gl.useProgram(this.program); }
    }

    function createProgram(vs, fs) {
      let p = gl.createProgram();
      gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.trace(gl.getProgramInfoLog(p));
      return p;
    }

    function getUniforms(program) {
      let uniforms = [];
      let count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < count; i++) {
        let name = gl.getActiveUniform(program, i).name;
        uniforms[name] = gl.getUniformLocation(program, name);
      }
      return uniforms;
    }

    function compileShader(type, source, keywords) {
      source = addKeywords(source, keywords);
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) console.trace(gl.getShaderInfoLog(shader));
      return shader;
    }

    function addKeywords(source, keywords) {
      if (!keywords) return source;
      return keywords.map(k => '#define ' + k).join('\n') + '\n' + source;
    }

    const baseVertexShader = compileShader(gl.VERTEX_SHADER, `
      precision highp float;
      attribute vec2 aPosition;
      varying vec2 vUv,vL,vR,vT,vB;
      uniform vec2 texelSize;
      void main(){
        vUv=aPosition*0.5+0.5;
        vL=vUv-vec2(texelSize.x,0); vR=vUv+vec2(texelSize.x,0);
        vT=vUv+vec2(0,texelSize.y); vB=vUv-vec2(0,texelSize.y);
        gl_Position=vec4(aPosition,0,1);
      }
    `);

    const copyShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float; precision mediump sampler2D;
      varying highp vec2 vUv; uniform sampler2D uTexture;
      void main(){ gl_FragColor=texture2D(uTexture,vUv); }
    `);

    const clearShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float; precision mediump sampler2D;
      varying highp vec2 vUv; uniform sampler2D uTexture; uniform float value;
      void main(){ gl_FragColor=value*texture2D(uTexture,vUv); }
    `);

    const displayShaderSource = `
      precision highp float; precision highp sampler2D;
      varying vec2 vUv,vL,vR,vT,vB;
      uniform sampler2D uTexture; uniform vec2 texelSize;
      void main(){
        vec3 c=texture2D(uTexture,vUv).rgb;
        #ifdef SHADING
          vec3 lc=texture2D(uTexture,vL).rgb,rc=texture2D(uTexture,vR).rgb;
          vec3 tc=texture2D(uTexture,vT).rgb,bc=texture2D(uTexture,vB).rgb;
          float dx=length(rc)-length(lc),dy=length(tc)-length(bc);
          vec3 n=normalize(vec3(dx,dy,length(texelSize)));
          float diffuse=clamp(dot(n,vec3(0,0,1))+0.7,0.7,1.0);
          c*=diffuse;
        #endif
        float a=max(c.r,max(c.g,c.b));
        gl_FragColor=vec4(c,a);
      }
    `;

    const splatShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float; precision highp sampler2D;
      varying vec2 vUv; uniform sampler2D uTarget;
      uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius;
      void main(){
        vec2 p=vUv-point; p.x*=aspectRatio;
        vec3 splat=exp(-dot(p,p)/radius)*color;
        gl_FragColor=vec4(texture2D(uTarget,vUv).xyz+splat,1);
      }
    `);

    const advectionShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float; precision highp sampler2D;
      varying vec2 vUv; uniform sampler2D uVelocity,uSource;
      uniform vec2 texelSize,dyeTexelSize; uniform float dt,dissipation;
      vec4 bilerp(sampler2D s,vec2 uv,vec2 ts){
        vec2 st=uv/ts-0.5,iuv=floor(st),fuv=fract(st);
        vec4 a=texture2D(s,(iuv+vec2(.5,.5))*ts),b=texture2D(s,(iuv+vec2(1.5,.5))*ts);
        vec4 c=texture2D(s,(iuv+vec2(.5,1.5))*ts),d=texture2D(s,(iuv+vec2(1.5,1.5))*ts);
        return mix(mix(a,b,fuv.x),mix(c,d,fuv.x),fuv.y);
      }
      void main(){
        #ifdef MANUAL_FILTERING
          vec2 coord=vUv-dt*bilerp(uVelocity,vUv,texelSize).xy*texelSize;
          vec4 result=bilerp(uSource,coord,dyeTexelSize);
        #else
          vec2 coord=vUv-dt*texture2D(uVelocity,vUv).xy*texelSize;
          vec4 result=texture2D(uSource,coord);
        #endif
        gl_FragColor=result/(1.0+dissipation*dt);
      }
    `, ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']);

    const divergenceShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float; precision mediump sampler2D;
      varying highp vec2 vUv,vL,vR,vT,vB; uniform sampler2D uVelocity;
      void main(){
        float L=texture2D(uVelocity,vL).x,R=texture2D(uVelocity,vR).x;
        float T=texture2D(uVelocity,vT).y,B=texture2D(uVelocity,vB).y;
        vec2 C=texture2D(uVelocity,vUv).xy;
        if(vL.x<0.0)L=-C.x; if(vR.x>1.0)R=-C.x; if(vT.y>1.0)T=-C.y; if(vB.y<0.0)B=-C.y;
        gl_FragColor=vec4(0.5*(R-L+T-B),0,0,1);
      }
    `);

    const curlShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float; precision mediump sampler2D;
      varying highp vec2 vUv,vL,vR,vT,vB; uniform sampler2D uVelocity;
      void main(){
        gl_FragColor=vec4(0.5*(texture2D(uVelocity,vR).y-texture2D(uVelocity,vL).y
          -texture2D(uVelocity,vT).x+texture2D(uVelocity,vB).x),0,0,1);
      }
    `);

    const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float; precision highp sampler2D;
      varying vec2 vUv,vL,vR,vT,vB; uniform sampler2D uVelocity,uCurl;
      uniform float curl,dt;
      void main(){
        float L=texture2D(uCurl,vL).x,R=texture2D(uCurl,vR).x;
        float T=texture2D(uCurl,vT).x,B=texture2D(uCurl,vB).x,C=texture2D(uCurl,vUv).x;
        vec2 force=0.5*vec2(abs(T)-abs(B),abs(R)-abs(L));
        force/=length(force)+0.0001; force*=curl*C; force.y*=-1.0;
        vec2 vel=texture2D(uVelocity,vUv).xy+force*dt;
        gl_FragColor=vec4(clamp(vel,-1000.0,1000.0),0,1);
      }
    `);

    const pressureShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float; precision mediump sampler2D;
      varying highp vec2 vUv,vL,vR,vT,vB; uniform sampler2D uPressure,uDivergence;
      void main(){
        float L=texture2D(uPressure,vL).x,R=texture2D(uPressure,vR).x;
        float T=texture2D(uPressure,vT).x,B=texture2D(uPressure,vB).x;
        gl_FragColor=vec4((L+R+B+T-texture2D(uDivergence,vUv).x)*0.25,0,0,1);
      }
    `);

    const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float; precision mediump sampler2D;
      varying highp vec2 vUv,vL,vR,vT,vB; uniform sampler2D uPressure,uVelocity;
      void main(){
        float L=texture2D(uPressure,vL).x,R=texture2D(uPressure,vR).x;
        float T=texture2D(uPressure,vT).x,B=texture2D(uPressure,vB).x;
        gl_FragColor=vec4(texture2D(uVelocity,vUv).xy-vec2(R-L,T-B),0,1);
      }
    `);

    const blit = (() => {
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,-1,1,1,1,1,-1]), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2,0,2,3]), gl.STATIC_DRAW);
      gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
      gl.enableVertexAttribArray(0);
      return (target, clear=false) => {
        if (target==null){ gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER,null); }
        else { gl.viewport(0,0,target.width,target.height); gl.bindFramebuffer(gl.FRAMEBUFFER,target.fbo); }
        if(clear){ gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT); }
        gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);
      };
    })();

    let dye,velocity,divergence,curl,pressure;
    const copyProgram             = new Program(baseVertexShader, copyShader);
    const clearProgram            = new Program(baseVertexShader, clearShader);
    const splatProgram            = new Program(baseVertexShader, splatShader);
    const advectionProgram        = new Program(baseVertexShader, advectionShader);
    const divergenceProgram       = new Program(baseVertexShader, divergenceShader);
    const curlProgram             = new Program(baseVertexShader, curlShader);
    const vorticityProgram        = new Program(baseVertexShader, vorticityShader);
    const pressureProgram         = new Program(baseVertexShader, pressureShader);
    const gradienSubtractProgram  = new Program(baseVertexShader, gradientSubtractShader);
    const displayMaterial         = new Material(baseVertexShader, displayShaderSource);

    function initFramebuffers(){
      let simRes=getResolution(config.SIM_RESOLUTION), dyeRes=getResolution(config.DYE_RESOLUTION);
      const texType=ext.halfFloatTexType, rgba=ext.formatRGBA, rg=ext.formatRG, r=ext.formatR;
      const filtering=ext.supportLinearFiltering?gl.LINEAR:gl.NEAREST;
      gl.disable(gl.BLEND);
      if(!dye) dye=createDoubleFBO(dyeRes.width,dyeRes.height,rgba.internalFormat,rgba.format,texType,filtering);
      else dye=resizeDoubleFBO(dye,dyeRes.width,dyeRes.height,rgba.internalFormat,rgba.format,texType,filtering);
      if(!velocity) velocity=createDoubleFBO(simRes.width,simRes.height,rg.internalFormat,rg.format,texType,filtering);
      else velocity=resizeDoubleFBO(velocity,simRes.width,simRes.height,rg.internalFormat,rg.format,texType,filtering);
      divergence=createFBO(simRes.width,simRes.height,r.internalFormat,r.format,texType,gl.NEAREST);
      curl=createFBO(simRes.width,simRes.height,r.internalFormat,r.format,texType,gl.NEAREST);
      pressure=createDoubleFBO(simRes.width,simRes.height,r.internalFormat,r.format,texType,gl.NEAREST);
    }

    function createFBO(w,h,internalFormat,format,type,param){
      gl.activeTexture(gl.TEXTURE0);
      let texture=gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,param);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,param);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,internalFormat,w,h,0,format,type,null);
      let fbo=gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
      gl.viewport(0,0,w,h); gl.clear(gl.COLOR_BUFFER_BIT);
      return { texture,fbo,width:w,height:h,texelSizeX:1/w,texelSizeY:1/h,
        attach(id){ gl.activeTexture(gl.TEXTURE0+id); gl.bindTexture(gl.TEXTURE_2D,texture); return id; } };
    }

    function createDoubleFBO(w,h,internalFormat,format,type,param){
      let fbo1=createFBO(w,h,internalFormat,format,type,param);
      let fbo2=createFBO(w,h,internalFormat,format,type,param);
      return { width:w,height:h,texelSizeX:fbo1.texelSizeX,texelSizeY:fbo1.texelSizeY,
        get read(){return fbo1;},set read(v){fbo1=v;},
        get write(){return fbo2;},set write(v){fbo2=v;},
        swap(){let t=fbo1;fbo1=fbo2;fbo2=t;} };
    }

    function resizeFBO(target,w,h,internalFormat,format,type,param){
      let n=createFBO(w,h,internalFormat,format,type,param);
      copyProgram.bind(); gl.uniform1i(copyProgram.uniforms.uTexture,target.attach(0));
      blit(n); return n;
    }

    function resizeDoubleFBO(target,w,h,internalFormat,format,type,param){
      if(target.width===w&&target.height===h) return target;
      target.read=resizeFBO(target.read,w,h,internalFormat,format,type,param);
      target.write=createFBO(w,h,internalFormat,format,type,param);
      target.width=w; target.height=h; target.texelSizeX=1/w; target.texelSizeY=1/h;
      return target;
    }

    function updateKeywords(){ let k=[]; if(config.SHADING)k.push('SHADING'); displayMaterial.setKeywords(k); }
    updateKeywords(); initFramebuffers();
    let lastUpdateTime=Date.now(), colorUpdateTimer=0;

    function updateFrame(){
      const dt=calcDeltaTime();
      if(resizeCanvas()) initFramebuffers();
      updateColors(dt); applyInputs(); step(dt); render(null);
      requestAnimationFrame(updateFrame);
    }

    function calcDeltaTime(){ let now=Date.now(),dt=Math.min((now-lastUpdateTime)/1000,0.016666); lastUpdateTime=now; return dt; }

    function resizeCanvas(){
      let w=scaleByPixelRatio(canvas.clientWidth),h=scaleByPixelRatio(canvas.clientHeight);
      if(canvas.width!==w||canvas.height!==h){ canvas.width=w; canvas.height=h; return true; }
      return false;
    }

    function updateColors(dt){
      colorUpdateTimer+=dt*config.COLOR_UPDATE_SPEED;
      if(colorUpdateTimer>=1){ colorUpdateTimer=wrap(colorUpdateTimer,0,1); pointers.forEach(p=>{p.color=generateColor();}); }
    }

    function applyInputs(){ pointers.forEach(p=>{if(p.moved){p.moved=false;splatPointer(p);}}); }

    function step(dt){
      gl.disable(gl.BLEND);
      curlProgram.bind();
      gl.uniform2f(curlProgram.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY);
      gl.uniform1i(curlProgram.uniforms.uVelocity,velocity.read.attach(0)); blit(curl);
      vorticityProgram.bind();
      gl.uniform2f(vorticityProgram.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY);
      gl.uniform1i(vorticityProgram.uniforms.uVelocity,velocity.read.attach(0));
      gl.uniform1i(vorticityProgram.uniforms.uCurl,curl.attach(1));
      gl.uniform1f(vorticityProgram.uniforms.curl,config.CURL);
      gl.uniform1f(vorticityProgram.uniforms.dt,dt); blit(velocity.write); velocity.swap();
      divergenceProgram.bind();
      gl.uniform2f(divergenceProgram.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY);
      gl.uniform1i(divergenceProgram.uniforms.uVelocity,velocity.read.attach(0)); blit(divergence);
      clearProgram.bind();
      gl.uniform1i(clearProgram.uniforms.uTexture,pressure.read.attach(0));
      gl.uniform1f(clearProgram.uniforms.value,config.PRESSURE); blit(pressure.write); pressure.swap();
      pressureProgram.bind();
      gl.uniform2f(pressureProgram.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY);
      gl.uniform1i(pressureProgram.uniforms.uDivergence,divergence.attach(0));
      for(let i=0;i<config.PRESSURE_ITERATIONS;i++){
        gl.uniform1i(pressureProgram.uniforms.uPressure,pressure.read.attach(1));
        blit(pressure.write); pressure.swap();
      }
      gradienSubtractProgram.bind();
      gl.uniform2f(gradienSubtractProgram.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY);
      gl.uniform1i(gradienSubtractProgram.uniforms.uPressure,pressure.read.attach(0));
      gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity,velocity.read.attach(1));
      blit(velocity.write); velocity.swap();
      advectionProgram.bind();
      gl.uniform2f(advectionProgram.uniforms.texelSize,velocity.texelSizeX,velocity.texelSizeY);
      if(!ext.supportLinearFiltering) gl.uniform2f(advectionProgram.uniforms.dyeTexelSize,velocity.texelSizeX,velocity.texelSizeY);
      let vid=velocity.read.attach(0);
      gl.uniform1i(advectionProgram.uniforms.uVelocity,vid);
      gl.uniform1i(advectionProgram.uniforms.uSource,vid);
      gl.uniform1f(advectionProgram.uniforms.dt,dt);
      gl.uniform1f(advectionProgram.uniforms.dissipation,config.VELOCITY_DISSIPATION);
      blit(velocity.write); velocity.swap();
      if(!ext.supportLinearFiltering) gl.uniform2f(advectionProgram.uniforms.dyeTexelSize,dye.texelSizeX,dye.texelSizeY);
      gl.uniform1i(advectionProgram.uniforms.uVelocity,velocity.read.attach(0));
      gl.uniform1i(advectionProgram.uniforms.uSource,dye.read.attach(1));
      gl.uniform1f(advectionProgram.uniforms.dissipation,config.DENSITY_DISSIPATION);
      blit(dye.write); dye.swap();
    }

    function render(target){ gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.BLEND); drawDisplay(target); }

    function drawDisplay(target){
      let w=target==null?gl.drawingBufferWidth:target.width;
      let h=target==null?gl.drawingBufferHeight:target.height;
      displayMaterial.bind();
      if(config.SHADING) gl.uniform2f(displayMaterial.uniforms.texelSize,1/w,1/h);
      gl.uniform1i(displayMaterial.uniforms.uTexture,dye.read.attach(0)); blit(target);
    }

    function splatPointer(p){ splat(p.texcoordX,p.texcoordY,p.deltaX*config.SPLAT_FORCE,p.deltaY*config.SPLAT_FORCE,p.color); }

    function clickSplat(p){
      const c=generateColor(); c.r*=10; c.g*=10; c.b*=10;
      splat(p.texcoordX,p.texcoordY,10*(Math.random()-.5),30*(Math.random()-.5),c);
    }

    function splat(x,y,dx,dy,color){
      splatProgram.bind();
      gl.uniform1i(splatProgram.uniforms.uTarget,velocity.read.attach(0));
      gl.uniform1f(splatProgram.uniforms.aspectRatio,canvas.width/canvas.height);
      gl.uniform2f(splatProgram.uniforms.point,x,y);
      gl.uniform3f(splatProgram.uniforms.color,dx,dy,0);
      gl.uniform1f(splatProgram.uniforms.radius,correctRadius(config.SPLAT_RADIUS/100));
      blit(velocity.write); velocity.swap();
      gl.uniform1i(splatProgram.uniforms.uTarget,dye.read.attach(0));
      gl.uniform3f(splatProgram.uniforms.color,color.r,color.g,color.b);
      blit(dye.write); dye.swap();
    }

    function correctRadius(r){ let ar=canvas.width/canvas.height; if(ar>1)r*=ar; return r; }

    function updatePointerDownData(p,id,x,y){
      p.id=id; p.down=true; p.moved=false;
      p.texcoordX=x/canvas.width; p.texcoordY=1-y/canvas.height;
      p.prevTexcoordX=p.texcoordX; p.prevTexcoordY=p.texcoordY;
      p.deltaX=0; p.deltaY=0; p.color=generateColor();
    }

    function updatePointerMoveData(p,x,y,color){
      p.prevTexcoordX=p.texcoordX; p.prevTexcoordY=p.texcoordY;
      p.texcoordX=x/canvas.width; p.texcoordY=1-y/canvas.height;
      p.deltaX=correctDeltaX(p.texcoordX-p.prevTexcoordX);
      p.deltaY=correctDeltaY(p.texcoordY-p.prevTexcoordY);
      p.moved=Math.abs(p.deltaX)>0||Math.abs(p.deltaY)>0;
      p.color=color;
    }

    function updatePointerUpData(p){ p.down=false; }
    function correctDeltaX(d){ let ar=canvas.width/canvas.height; if(ar<1)d*=ar; return d; }
    function correctDeltaY(d){ let ar=canvas.width/canvas.height; if(ar>1)d/=ar; return d; }

    // ── ST THEME: blood red / dark crimson / deep ember palette ──
    function generateColor(){
      const palette=[
        {r:0.55,g:0.00,b:0.00},  // blood red
        {r:0.80,g:0.05,b:0.00},  // dark ember red
        {r:0.40,g:0.00,b:0.05},  // deep crimson
        {r:0.65,g:0.02,b:0.02},  // medium red
        {r:0.30,g:0.00,b:0.10},  // dark purple-red
        {r:0.70,g:0.10,b:0.00},  // ember orange-red
      ];
      const c=palette[Math.floor(Math.random()*palette.length)];
      return {r:c.r*0.18, g:c.g*0.18, b:c.b*0.18};
    }

    function wrap(value,min,max){ const range=max-min; if(range===0)return min; return((value-min)%range)+min; }

    function getResolution(resolution){
      let ar=gl.drawingBufferWidth/gl.drawingBufferHeight;
      if(ar<1)ar=1/ar;
      const min=Math.round(resolution),max=Math.round(resolution*ar);
      return gl.drawingBufferWidth>gl.drawingBufferHeight?{width:max,height:min}:{width:min,height:max};
    }

    function scaleByPixelRatio(input){ return Math.floor(input*(window.devicePixelRatio||1)); }

    function hashCode(s){
      let hash=0;
      for(let i=0;i<s.length;i++){hash=(hash<<5)-hash+s.charCodeAt(i);hash|=0;}
      return hash;
    }

    window.addEventListener('mousedown',e=>{
      let p=pointers[0];
      updatePointerDownData(p,-1,scaleByPixelRatio(e.clientX),scaleByPixelRatio(e.clientY));
      clickSplat(p);
    });

    document.body.addEventListener('mousemove',function first(e){
      let p=pointers[0],color=generateColor();
      updateFrame();
      updatePointerMoveData(p,scaleByPixelRatio(e.clientX),scaleByPixelRatio(e.clientY),color);
      document.body.removeEventListener('mousemove',first);
    });

    window.addEventListener('mousemove',e=>{
      let p=pointers[0];
      updatePointerMoveData(p,scaleByPixelRatio(e.clientX),scaleByPixelRatio(e.clientY),p.color);
    });

    document.body.addEventListener('touchstart',function first(e){
      const touches=e.targetTouches,p=pointers[0];
      for(let i=0;i<touches.length;i++){
        updateFrame();
        updatePointerDownData(p,touches[i].identifier,scaleByPixelRatio(touches[i].clientX),scaleByPixelRatio(touches[i].clientY));
      }
      document.body.removeEventListener('touchstart',first);
    });

    window.addEventListener('touchstart',e=>{
      const touches=e.targetTouches,p=pointers[0];
      for(let i=0;i<touches.length;i++)
        updatePointerDownData(p,touches[i].identifier,scaleByPixelRatio(touches[i].clientX),scaleByPixelRatio(touches[i].clientY));
    });

    window.addEventListener('touchmove',e=>{
      const touches=e.targetTouches,p=pointers[0];
      for(let i=0;i<touches.length;i++)
        updatePointerMoveData(p,scaleByPixelRatio(touches[i].clientX),scaleByPixelRatio(touches[i].clientY),p.color);
    },false);

    window.addEventListener('touchend',e=>{
      const touches=e.changedTouches,p=pointers[0];
      for(let i=0;i<touches.length;i++) updatePointerUpData(p);
    });

    updateFrame();
  }, []);

  return (
    <div style={{position:'fixed',top:0,left:0,zIndex:50,pointerEvents:'none',width:'100%',height:'100%'}}>
      <canvas ref={canvasRef} style={{width:'100vw',height:'100vh',display:'block'}}/>
    </div>
  );
}

export default SplashCursor;