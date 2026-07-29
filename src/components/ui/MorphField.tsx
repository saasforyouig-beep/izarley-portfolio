import { useEffect, useRef, useState } from 'react'
import { Renderer, Camera, Geometry, Program, Mesh } from 'ogl'

/**
 * Campo de partículas metamórfico: milhares de pontos que se transformam
 * entre formas tecnológicas — rede neural (3D), cérebro, </> e "IA" — com
 * dispersão ao mouse. WebGL puro (ogl), um único draw call.
 */
const COUNT = 3200
const HOLD_S = 3.4 // segundos parado em cada forma
const MORPH_S = 1.5 // duração da transformação

function usePrefersLight() {
  const [isLight, setIsLight] = useState(
    () => window.matchMedia('(prefers-color-scheme: light)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = (e: MediaQueryListEvent) => setIsLight(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isLight
}

/** desenha num canvas offscreen e vira nuvem de pontos */
function sampleCanvas(
  draw: (ctx: CanvasRenderingContext2D, s: number) => void,
  n: number,
): Float32Array {
  const s = 520
  const c = document.createElement('canvas')
  c.width = s
  c.height = s
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, s, s)
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  draw(ctx, s)
  const img = ctx.getImageData(0, 0, s, s).data
  const cand: number[] = []
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (img[(y * s + x) * 4 + 3] > 100) cand.push(x, y)
    }
  }
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const k = ((Math.random() * cand.length) / 2 | 0) * 2
    out[i * 3] = ((cand[k] + Math.random()) / s - 0.5) * 2.3
    out[i * 3 + 1] = -((cand[k + 1] + Math.random()) / s - 0.5) * 2.3
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.07
  }
  return out
}

function sphereShape(n: number): Float32Array {
  const out = new Float32Array(n * 3)
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const th = golden * i
    out[i * 3] = Math.cos(th) * r * 1.05
    out[i * 3 + 1] = y * 1.05
    out[i * 3 + 2] = Math.sin(th) * r * 1.05
  }
  return out
}

/** cérebro-plexus: silhueta de perfil preenchida pelos giros do córtex
 *  (arcos ondulados), nós brilhantes e "AI" ao centro (ref. arte wireframe) */
function brainShape(n: number): Float32Array {
  return sampleCanvas((ctx, s) => {
    const u = (x: number, y: number) => [x * s, y * s] as [number, number]

    // silhueta do cérebro (perfil, frente à esquerda, cerebelo + tronco)
    const p = new Path2D()
    p.moveTo(...u(0.185, 0.6))
    p.bezierCurveTo(...u(0.12, 0.5), ...u(0.14, 0.34), ...u(0.24, 0.27))
    p.bezierCurveTo(...u(0.27, 0.14), ...u(0.45, 0.08), ...u(0.56, 0.14))
    p.bezierCurveTo(...u(0.7, 0.08), ...u(0.85, 0.18), ...u(0.86, 0.33))
    p.bezierCurveTo(...u(0.93, 0.43), ...u(0.89, 0.55), ...u(0.8, 0.59))
    // cerebelo
    p.bezierCurveTo(...u(0.87, 0.67), ...u(0.79, 0.78), ...u(0.68, 0.74))
    // tronco
    p.bezierCurveTo(...u(0.66, 0.83), ...u(0.57, 0.85), ...u(0.55, 0.77))
    p.bezierCurveTo(...u(0.43, 0.79), ...u(0.29, 0.75), ...u(0.25, 0.67))
    p.bezierCurveTo(...u(0.19, 0.65), ...u(0.185, 0.62), ...u(0.185, 0.6))
    p.closePath()

    ctx.lineCap = 'round'
    ctx.lineWidth = s * 0.012
    ctx.stroke(p)

    const cx = s * 0.52
    const cy = s * 0.44
    const rx = s * 0.36
    const ry = s * 0.33

    ctx.save()
    ctx.clip(p)

    // giros do córtex: arcos concêntricos ondulados (convoluções)
    ctx.lineWidth = s * 0.009
    for (let i = 0; i < 18; i++) {
      const a0 = Math.random() * Math.PI * 2
      const span = 0.6 + Math.random() * 1.1
      const r = 0.25 + Math.random() * 0.7
      const waves = 2 + Math.random() * 3
      const ph = Math.random() * Math.PI * 2
      ctx.beginPath()
      for (let j = 0; j <= 36; j++) {
        const t = j / 36
        const th = a0 + t * span
        const rr = r * (1 + 0.09 * Math.sin(t * Math.PI * waves + ph))
        const x = cx + Math.cos(th) * rx * rr
        const y = cy + Math.sin(th) * ry * rr
        if (j === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    // nós brilhantes espalhados (efeito plexus)
    for (let i = 0; i < 42; i++) {
      const x = cx + (Math.random() * 2 - 1) * rx
      const y = cy + (Math.random() * 2 - 1) * ry
      if (!ctx.isPointInPath(p, x, y)) continue
      ctx.beginPath()
      ctx.arc(x, y, s * (0.004 + Math.random() * 0.006), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    // "AI" ao centro, com um respiro limpo ao redor para leitura
    const fw = s * 0.105
    ctx.clearRect(cx - fw, cy - fw * 0.66, fw * 2, fw * 1.32)
    ctx.font = `500 ${s * 0.1}px "Space Grotesk", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('AI', cx, cy + s * 0.004)
  }, n)
}

function textShape(text: string, n: number, fontSize: number): Float32Array {
  return sampleCanvas((ctx, s) => {
    ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, s / 2, s / 2)
  }, n)
}

const vertex = /* glsl */ `
  attribute vec3 aS0;
  attribute vec3 aS1;
  attribute vec3 aS2;
  attribute vec3 aS3;
  attribute float aPhase;
  attribute float aSpeed;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uMorph;
  uniform vec2 uMouse;
  uniform float uAspect;
  uniform float uSize;
  varying float vTw;

  vec3 pick(float i) {
    if (i < 0.5) return aS0;
    if (i < 1.5) return aS1;
    if (i < 2.5) return aS2;
    return aS3;
  }

  void main() {
    float seg = mod(floor(uMorph), 4.0);
    float nxt = mod(seg + 1.0, 4.0);
    // cada partícula parte num instante levemente diferente (efeito enxame)
    float t = clamp(fract(uMorph) * 1.35 - aPhase * 0.35, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    vec3 pos = mix(pick(seg), pick(nxt), t);

    // respiração orgânica
    pos += 0.006 * vec3(
      sin(uTime * aSpeed + aPhase * 6.28),
      cos(uTime * aSpeed * 0.9 + aPhase * 12.0),
      sin(uTime * 0.7 + aPhase * 3.0)
    );

    // balanço 3D sutil + inclinação com o mouse
    float ang = sin(uTime * 0.25) * 0.35 + uMouse.x * 0.3;
    float ca = cos(ang), sa = sin(ang);
    pos = vec3(ca * pos.x + sa * pos.z, pos.y, -sa * pos.x + ca * pos.z);

    // dispersão perto do cursor (em coordenadas de tela)
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    vec2 d = (clip.xy / clip.w - uMouse) * vec2(uAspect, 1.0);
    float push = exp(-dot(d, d) * 9.0);
    pos.xy += normalize(pos.xy + vec2(0.0001)) * push * 0.28;

    float tw = 0.5 + 0.5 * sin(uTime * aSpeed * 1.5 + aPhase * 20.0);
    vTw = tw;
    // formas densas (símbolos) usam pontos menores para manter nitidez
    float fA = seg < 0.5 ? 1.0 : 0.46;
    float fB = nxt < 0.5 ? 1.0 : 0.46;
    float shapeF = mix(fA, fB, t);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = min(uSize * shapeF * (0.8 + 0.35 * tw) * (300.0 / -mv.z), 40.0);
    gl_Position = projectionMatrix * mv;
  }
`

const fragment = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  varying float vTw;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    float alpha = smoothstep(1.0, 0.55, d);
    float core = smoothstep(0.35, 0.0, d);
    gl_FragColor = vec4(uColor * (0.72 + 0.5 * core), alpha * (0.45 + 0.55 * vTw));
  }
`

export default function MorphField() {
  const holder = useRef<HTMLDivElement>(null)
  const isLight = usePrefersLight()

  useEffect(() => {
    const el = holder.current
    if (!el) return

    const renderer = new Renderer({ alpha: true, dpr: Math.min(window.devicePixelRatio, 1.75) })
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)
    el.appendChild(gl.canvas)
    gl.canvas.style.position = 'absolute'
    gl.canvas.style.inset = '0'

    const camera = new Camera(gl, { fov: 45 })
    camera.position.z = 3.6

    // formas: rede neural → cérebro → </> → IA
    const shapes = [
      sphereShape(COUNT),
      brainShape(COUNT),
      textShape('</>', COUNT, 168),
      textShape('IA', COUNT, 220),
    ]
    const phases = new Float32Array(COUNT)
    const speeds = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      phases[i] = Math.random()
      speeds[i] = 0.6 + Math.random() * 1.4
    }

    const geometry = new Geometry(gl, {
      position: { size: 3, data: shapes[0] }, // exigido pelo ogl; não usado no shader
      aS0: { size: 3, data: shapes[0] },
      aS1: { size: 3, data: shapes[1] },
      aS2: { size: 3, data: shapes[2] },
      aS3: { size: 3, data: shapes[3] },
      aPhase: { size: 1, data: phases },
      aSpeed: { size: 1, data: speeds },
    })

    const program = new Program(gl, {
      vertex,
      fragment,
      transparent: true,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uMorph: { value: 0 },
        uMouse: { value: [10, 10] },
        uAspect: { value: 1 },
        uSize: { value: 0.09 * Math.min(window.devicePixelRatio, 1.75) },
        uColor: { value: isLight ? [0.024, 0.043, 0.043] : [1.0, 0.953, 0.918] },
      },
    })

    const mesh = new Mesh(gl, { geometry, program, mode: gl.POINTS })

    const resize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      renderer.setSize(w, h)
      camera.perspective({ aspect: w / h })
      program.uniforms.uAspect.value = w / h
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    // mouse relativo ao container do efeito
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      program.uniforms.uMouse.value = [
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -(((e.clientY - r.top) / r.height) * 2 - 1),
      ]
    }
    window.addEventListener('mousemove', onMove, { passive: true })

    // ciclo: segura na forma → transforma → próxima
    let morphBase = 0
    let phase: 'hold' | 'morph' = 'hold'
    let elapsed = 0
    let last = 0
    let raf = 0

    const update = (t: number) => {
      raf = requestAnimationFrame(update)
      const dt = Math.min((t - last) / 1000, 0.05)
      last = t
      elapsed += dt

      if (phase === 'hold' && elapsed >= HOLD_S) {
        phase = 'morph'
        elapsed = 0
      } else if (phase === 'morph' && elapsed >= MORPH_S) {
        phase = 'hold'
        morphBase = (morphBase + 1) % 4
        elapsed = 0
      }
      program.uniforms.uMorph.value =
        phase === 'hold' ? morphBase : morphBase + Math.min(elapsed / MORPH_S, 1)

      program.uniforms.uTime.value = t / 1000
      renderer.render({ scene: mesh, camera })
    }
    raf = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('mousemove', onMove)
      el.removeChild(gl.canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [isLight])

  return <div ref={holder} className="morph-holder" aria-hidden="true" />
}
