import { useEffect, useRef } from 'react'
import { Renderer, Program, Mesh, Triangle } from 'ogl'

/**
 * Silk (ReactBits) — padrão de "seda" ondulante em WebGL. O original usa
 * three + react-three-fiber; aqui o mesmo shader roda em ogl (já no
 * projeto), num único triângulo de tela cheia — visual idêntico, sem
 * dependências novas.
 */
const hexToNormalizedRGB = (hex: string): [number, number, number] => {
  const c = hex.replace('#', '').padEnd(6, '0')
  return [
    parseInt(c.slice(0, 2), 16) / 255,
    parseInt(c.slice(2, 4), 16) / 255,
    parseInt(c.slice(4, 6), 16) / 255,
  ]
}

const vertexShader = /* glsl */ `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec3  uColor;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uNoiseIntensity;

const float e = 2.71828182845904523536;

float noise(vec2 texCoord) {
  float G = e;
  vec2  r = (G * sin(G * texCoord));
  return fract(r.x * r.y * (1.0 + texCoord.x));
}

vec2 rotateUvs(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  mat2  rot = mat2(c, -s, s, c);
  return rot * uv;
}

void main() {
  float rnd        = noise(gl_FragCoord.xy);
  vec2  uv         = rotateUvs(vUv * uScale, uRotation);
  vec2  tex        = uv * uScale;
  float tOffset    = uSpeed * uTime;

  tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

  float pattern = 0.6 +
                  0.4 * sin(5.0 * (tex.x + tex.y +
                                   cos(3.0 * tex.x + 5.0 * tex.y) +
                                   0.02 * tOffset) +
                           sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

  vec4 col = vec4(uColor, 1.0) * vec4(pattern) - rnd / 15.0 * uNoiseIntensity;
  col.a = 1.0;
  gl_FragColor = col;
}
`

interface SilkProps {
  speed?: number
  scale?: number
  color?: string
  noiseIntensity?: number
  rotation?: number
  className?: string
}

export default function Silk({
  speed = 5,
  scale = 1,
  color = '#7B7481',
  noiseIntensity = 1.5,
  rotation = 0,
  className,
}: SilkProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // props mais recentes num ref: atualizar não recria o contexto WebGL
  const propsRef = useRef({ speed, scale, color, noiseIntensity, rotation })
  propsRef.current = { speed, scale, color, noiseIntensity, rotation }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio || 1, 2) })
    const gl = renderer.gl
    container.appendChild(gl.canvas)
    gl.canvas.style.width = '100%'
    gl.canvas.style.height = '100%'
    gl.canvas.style.display = 'block'

    const geometry = new Triangle(gl)
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: hexToNormalizedRGB(propsRef.current.color) },
        uSpeed: { value: propsRef.current.speed },
        uScale: { value: propsRef.current.scale },
        uRotation: { value: propsRef.current.rotation },
        uNoiseIntensity: { value: propsRef.current.noiseIntensity },
      },
    })

    const mesh = new Mesh(gl, { geometry, program })

    const resize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    resize()

    // só anima com o canvas em tela e a aba visível
    let isVisible = true
    const io = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0].isIntersecting
      },
      { threshold: 0 },
    )
    io.observe(container)

    let last = 0
    let raf = 0
    const update = (t: number) => {
      raf = requestAnimationFrame(update)
      const dt = Math.min((t - last) / 1000, 0.05)
      last = t
      if (!isVisible || document.hidden) return

      const p = propsRef.current
      program.uniforms.uColor.value = hexToNormalizedRGB(p.color)
      program.uniforms.uSpeed.value = p.speed
      program.uniforms.uScale.value = p.scale
      program.uniforms.uRotation.value = p.rotation
      program.uniforms.uNoiseIntensity.value = p.noiseIntensity
      // mesmo ritmo do original: o tempo avança a 0.1× do relógio
      program.uniforms.uTime.value += 0.1 * dt

      renderer.render({ scene: mesh })
    }
    raf = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      if (container.contains(gl.canvas)) container.removeChild(gl.canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`silk-container${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    />
  )
}
