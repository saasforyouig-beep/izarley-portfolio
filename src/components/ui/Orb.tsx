import { useEffect, useRef, useState } from 'react'
import { Renderer, Program, Mesh, Triangle, Vec2, Vec3 } from 'ogl'

interface OrbProps {
  hoverIntensity?: number
}

/** Segue o tema do sistema (claro/escuro) em tempo real. */
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

/**
 * Orb em WebGL puro (ogl): anel de luz com pulso de ruído e uma luz
 * viajando pela borda. Gira continuamente; no hover a rotação acelera
 * e o anel se dissipa em ondas. Renderizado por shader — nítido em
 * qualquer resolução. Cores seguem a paleta do site nos dois temas.
 */
export default function Orb({ hoverIntensity = 0.55 }: OrbProps) {
  const ctnDom = useRef<HTMLDivElement>(null)
  const isLight = usePrefersLight()

  useEffect(() => {
    const container = ctnDom.current
    if (!container) return

    const vert = /* glsl */ `
      precision highp float;
      attribute vec2 position;
      attribute vec2 uv;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `

    const frag = /* glsl */ `
      precision highp float;

      uniform float iTime;
      uniform vec3 iResolution;
      uniform float hover;
      uniform float rot;
      uniform float uLightRot;
      uniform vec2 uMouse;
      uniform float hoverIntensity;
      uniform float uUseInk;
      varying vec2 vUv;

      vec3 hash33(vec3 p3) {
        p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
        p3 += dot(p3, p3.yxz + 19.19);
        return -1.0 + 2.0 * fract(vec3(
          p3.x + p3.y,
          p3.x + p3.z,
          p3.y + p3.z
        ) * p3.zyx);
      }

      float snoise3(vec3 p) {
        const float K1 = 0.333333333;
        const float K2 = 0.166666667;
        vec3 i = floor(p + (p.x + p.y + p.z) * K1);
        vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
        vec3 e = step(vec3(0.0), d0 - d0.yzx);
        vec3 i1 = e * (1.0 - e.zxy);
        vec3 i2 = 1.0 - e.zxy * (1.0 - e);
        vec3 d1 = d0 - (i1 - K2);
        vec3 d2 = d0 - (i2 - K1);
        vec3 d3 = d0 - 0.5;
        vec4 h = max(0.6 - vec4(
          dot(d0, d0),
          dot(d1, d1),
          dot(d2, d2),
          dot(d3, d3)
        ), 0.0);
        vec4 n = h * h * h * h * vec4(
          dot(d0, hash33(i)),
          dot(d1, hash33(i + i1)),
          dot(d2, hash33(i + i2)),
          dot(d3, hash33(i + 1.0))
        );
        return dot(vec4(31.316), n);
      }

      vec4 extractAlpha(vec3 colorIn) {
        float a = max(max(colorIn.r, colorIn.g), colorIn.b);
        return vec4(colorIn.rgb / (a + 1e-5), a);
      }

      /* paleta do site: cream #FFF3EA sobre #060B0B */
      const vec3 baseColor1 = vec3(1.000, 0.953, 0.918);
      const vec3 baseColor2 = vec3(0.620, 0.580, 0.550);
      const vec3 baseColor3 = vec3(0.050, 0.070, 0.070);
      const vec3 inkColor = vec3(0.024, 0.043, 0.043);
      const float innerRadius = 0.6;
      const float noiseScale = 0.65;

      float light1(float intensity, float attenuation, float dist) {
        return intensity / (1.0 + dist * attenuation);
      }

      float light2(float intensity, float attenuation, float dist) {
        return intensity / (1.0 + dist * dist * attenuation);
      }

      vec4 draw(vec2 uv, vec2 m) {
        vec3 color1 = baseColor1;
        vec3 color2 = baseColor2;
        vec3 color3 = baseColor3;

        float ang = atan(uv.y, uv.x);
        float len = length(uv);
        float invLen = len > 0.0 ? 1.0 / len : 0.0;

        float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5;
        float r0 = mix(mix(innerRadius, 1.0, 0.4), mix(innerRadius, 1.0, 0.6), n0);

        // "atenção": o anel percebe o cursor e se estica na direção dele,
        // num lobo suave (~±40°); o resto permanece calmo
        float mAng = atan(m.y, m.x);
        float attention = exp(6.0 * (cos(ang - mAng) - 1.0));
        float reach = attention * hover * hoverIntensity
          * smoothstep(0.1, 0.45, length(m)) * 0.14;
        r0 *= 1.0 + reach;

        float d0 = distance(uv, (r0 * invLen) * uv);
        float v0 = light1(1.0, 10.0, d0);
        v0 *= smoothstep(r0 * 1.05, r0, len);
        // a região que "olha" para o cursor acende de leve
        v0 *= 1.0 + attention * hover * 0.6;
        float cl = cos(ang + iTime * 2.0) * 0.5 + 0.5;

        // luz viajante: acelera no hover (ângulo acumulado no CPU, sem saltos)
        vec2 pos = vec2(cos(uLightRot), sin(uLightRot)) * r0;
        float d = distance(uv, pos);
        float v1 = light2(1.5 + hover * 0.6, 5.0, d);
        v1 *= light1(1.0, 50.0, d0);

        float v2 = smoothstep(1.0, mix(innerRadius, 1.0, n0 * 0.5), len);
        float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len);

        vec3 col = mix(color1, color2, cl);
        col = mix(color3, col, v0);
        col = (col + v1) * v2 * v3;
        col = clamp(col, 0.0, 1.0);

        return extractAlpha(col);
      }

      vec4 mainImage(vec2 fragCoord) {
        vec2 center = iResolution.xy * 0.5;
        float size = min(iResolution.x, iResolution.y);
        vec2 uv = (fragCoord - center) / size * 2.0;

        // margem interna: o glow termina antes da borda da div,
        // sem marca de recorte
        uv *= 1.22;

        float angle = rot;
        float s = sin(angle);
        float c = cos(angle);
        uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);

        // o mouse entra no mesmo espaço rotacionado/escalado do anel
        vec2 m = vec2(c * uMouse.x - s * uMouse.y, s * uMouse.x + c * uMouse.y) * 1.22;

        return draw(uv, m);
      }

      void main() {
        vec2 fragCoord = vUv * iResolution.xy;
        vec4 col = mainImage(fragCoord);
        // tema claro: mesma forma/alpha, mas em "tinta" escura
        vec3 rgb = mix(col.rgb, inkColor, uUseInk);
        gl_FragColor = vec4(rgb * col.a, col.a);
      }
    `

    const renderer = new Renderer({ alpha: true, premultipliedAlpha: false })
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)
    container.appendChild(gl.canvas)

    const geometry = new Triangle(gl)
    const program = new Program(gl, {
      vertex: vert,
      fragment: frag,
      uniforms: {
        iTime: { value: 0 },
        iResolution: {
          value: new Vec3(
            gl.canvas.width,
            gl.canvas.height,
            gl.canvas.width / gl.canvas.height,
          ),
        },
        hover: { value: 0 },
        rot: { value: 0 },
        uLightRot: { value: 0 },
        uMouse: { value: new Vec2(10, 10) },
        hoverIntensity: { value: hoverIntensity },
        uUseInk: { value: isLight ? 1 : 0 },
      },
    })

    const mesh = new Mesh(gl, { geometry, program })

    function resize() {
      if (!container) return
      const dpr = window.devicePixelRatio || 1
      const width = container.clientWidth
      const height = container.clientHeight
      renderer.setSize(width * dpr, height * dpr)
      gl.canvas.style.width = width + 'px'
      gl.canvas.style.height = height + 'px'
      program.uniforms.iResolution.value.set(
        gl.canvas.width,
        gl.canvas.height,
        gl.canvas.width / gl.canvas.height,
      )
    }
    window.addEventListener('resize', resize)
    resize()

    let targetHover = 0
    let targetMX = 10
    let targetMY = 10
    let lastTime = 0
    let currentRot = 0
    let lightRot = 0
    const idleSpeed = 0.12 // gira sempre, devagar
    const hoverSpeed = 0.35 // acelera no hover

    // o hover é detectado na janela toda: o orb fica atrás do texto,
    // então não pode depender de receber eventos de mouse diretamente
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const size = Math.min(rect.width, rect.height)
      const uvX = ((x - rect.width / 2) / size) * 2.0
      const uvY = ((y - rect.height / 2) / size) * 2.0
      targetHover = Math.sqrt(uvX * uvX + uvY * uvY) < 0.9 ? 1 : 0
      // shader usa y para cima; tela usa y para baixo
      targetMX = uvX
      targetMY = -uvY
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    let rafId: number
    const update = (t: number) => {
      rafId = requestAnimationFrame(update)
      const dt = Math.min((t - lastTime) * 0.001, 0.05)
      lastTime = t
      program.uniforms.iTime.value = t * 0.001

      program.uniforms.hover.value +=
        (targetHover - program.uniforms.hover.value) * 0.08

      // o "olhar" do anel segue o cursor com inércia
      const um = program.uniforms.uMouse.value as Vec2
      um.x += (targetMX - um.x) * 0.07
      um.y += (targetMY - um.y) * 0.07

      // rotação contínua + aceleração proporcional ao hover
      const h = program.uniforms.hover.value
      currentRot += dt * (idleSpeed + h * hoverSpeed)
      program.uniforms.rot.value = currentRot

      // luz viajante: mais rápida no hover ("dados circulando")
      lightRot -= dt * (1.0 + h * 2.5)
      program.uniforms.uLightRot.value = lightRot

      renderer.render({ scene: mesh })
    }
    rafId = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      container.removeChild(gl.canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [hoverIntensity, isLight])

  return <div ref={ctnDom} className="orb-container" />
}
