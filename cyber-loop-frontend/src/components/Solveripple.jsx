import { useRef, useEffect } from 'react'

/**
 * SolveRipple — slow glow-ring ripple expanding from the solved node.
 *
 * Props:
 *   active     {boolean}    Trigger when true
 *   origin     {{x,y}}      Screen pixel coords of the solved node
 *   onComplete {function}   Called when animation ends
 */
export default function SolveRipple({ active, origin, onComplete }) {
  const canvasRef = useRef(null)
  const glDataRef = useRef(null)
  const rafRef    = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const gl = canvas.getContext('webgl')
    if (!gl) return

    const VERT = `
      attribute vec2 aPos;
      void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
    `

    const FRAG = `
      precision highp float;
      uniform vec2  iResolution;
      uniform float iTime;
      uniform vec2  uOrigin;

      float glowRing(float dist, float center, float sigma) {
        float d = dist - center;
        return exp(-(d*d) / (2.0*sigma*sigma));
      }

      void main() {
        vec2  uv    = gl_FragCoord.xy / iResolution;
        vec2  delta = (uv - uOrigin) * vec2(iResolution.x / iResolution.y, 1.0);
        float dist  = length(delta);

        float t    = iTime;
        float dur  = 2.8;
        float fade = pow(max(0.0, 1.0 - t / dur), 2.0);

        float spd   = 0.58;
        float r1    = t * spd;
        float sig   = 0.022 + t * 0.011;

        float ring1 = glowRing(dist, r1,        sig        ) * 1.00;
        float ring2 = glowRing(dist, max(0.0, r1 - 0.10), sig * 0.65) * 0.50;
        float ring3 = glowRing(dist, max(0.0, r1 - 0.22), sig * 0.42) * 0.24;

        float flash = exp(-dist * 16.0) * exp(-t * 7.5) * 1.6;
        float bloom = exp(-dist * 4.2 ) * 0.10 * fade;

        float rings = (ring1 + ring2 + ring3) * fade;
        float total = rings + flash + bloom;

        vec3 gold  = vec3(1.00, 0.96, 0.70);
        vec3 green = vec3(0.05, 0.92, 0.47);
        float tc   = clamp(dist / max(r1, 0.001), 0.0, 1.0);
        vec3  col  = mix(gold, green, clamp(tc, 0.0, 1.0));
        col += vec3(0.12, 0.30, 0.08) * rings * fade;

        float alpha = clamp(total * 0.88, 0.0, 0.82);
        gl_FragColor = vec4(col, alpha);
      }
    `

    const compile = (src, type) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }

    const prog = gl.createProgram()
    gl.attachShader(prog, compile(VERT, gl.VERTEX_SHADER))
    gl.attachShader(prog, compile(FRAG, gl.FRAGMENT_SHADER))
    gl.linkProgram(prog)

    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW)

    const aPos = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    glDataRef.current = {
      gl,
      uRes:    gl.getUniformLocation(prog, 'iResolution'),
      uTime:   gl.getUniformLocation(prog, 'iTime'),
      uOrigin: gl.getUniformLocation(prog, 'uOrigin'),
    }

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  useEffect(() => {
    if (!active || !glDataRef.current) return
    cancelAnimationFrame(rafRef.current)

    const { gl, uRes, uTime, uOrigin } = glDataRef.current
    const canvas   = canvasRef.current
    const DURATION = 2.8
    const start    = performance.now()

    // Convert pixel → WebGL UV (WebGL y=0 is bottom)
    const ox = origin ? origin.x / window.innerWidth        : 0.5
    const oy = origin ? 1.0 - origin.y / window.innerHeight : 0.5

    const render = () => {
      const t = (performance.now() - start) / 1000
      if (t > DURATION) {
        gl.clear(gl.COLOR_BUFFER_BIT)
        onComplete?.()
        return
      }
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(uRes,    canvas.width, canvas.height)
      gl.uniform1f(uTime,   t)
      gl.uniform2f(uOrigin, ox, oy)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      rafRef.current = requestAnimationFrame(render)
    }
    rafRef.current = requestAnimationFrame(render)

    return () => cancelAnimationFrame(rafRef.current)
  }, [active, origin, onComplete])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 58,
        pointerEvents: 'none',
        display: active ? 'block' : 'none',
      }}
    />
  )
}