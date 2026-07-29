import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import PhoneChat from '../ui/PhoneChat'

const STATS = [
  { value: 12, suffix: '+', label: 'Empresas automatizadas' },
  { value: 10, suffix: '+', label: 'Agentes em produção' },
  { value: 99, suffix: '%', label: 'Disponibilidade dos fluxos' },
]

const CAPABILITIES = [
  'Agentes de IA autônomos',
  'Automação de processos',
  'Atendimento inteligente 24/7',
  'Análise de dados com IA',
  'Integração via N8N',
  'RAG & bases de conhecimento',
  'Relatórios que geram decisão',
]

export default function AISection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // título revela linha por linha, saindo de trás de uma máscara;
      // ao final libera o overflow para o glow sobrepor livremente
      gsap.from('.reveal-line > span', {
        yPercent: 115,
        duration: 1.1,
        stagger: 0.14,
        ease: 'power4.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', once: true },
        onComplete: () => {
          sectionRef.current
            ?.querySelectorAll<HTMLElement>('.reveal-line')
            .forEach((el) => (el.style.overflow = 'visible'))
        },
      })

      // contadores: recontam do zero toda vez que a seção entra na tela
      gsap.utils.toArray<HTMLElement>('.ai-stat__value').forEach((el) => {
        const target = Number(el.dataset.value)
        const suffix = el.dataset.suffix ?? ''
        const counter = { n: 0 }
        gsap.to(counter, {
          n: target,
          duration: 2.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.ai-stats',
            start: 'top 88%',
            toggleActions: 'restart none restart none',
          },
          onUpdate: () => {
            el.innerHTML = `${Math.round(counter.n)}<span>${suffix}</span>`
          },
        })
      })

      // o telefone entra em 3D girando conforme o scroll
      gsap.fromTo(
        '.phone',
        { rotateY: -22, rotateX: 8, y: 90, opacity: 0 },
        {
          rotateY: 0,
          rotateX: 0,
          y: 0,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            end: 'top 20%',
            scrub: true,
          },
        },
      )

      // fade-in do conteúdo à esquerda (título e chips têm animações próprias)
      gsap.from('.ai-section__left > :not(h2):not(.ai-capabilities)', {
        y: 40,
        opacity: 0,
        stagger: 0.08,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 65%', once: true },
      })

      // chips de capacidades pipocam uma a uma
      gsap.from('.ai-capability', {
        y: 16,
        opacity: 0,
        scale: 0.9,
        stagger: 0.05,
        duration: 0.5,
        ease: 'back.out(1.7)',
        scrollTrigger: { trigger: '.ai-capabilities', start: 'top 88%', once: true },
      })

      // ícones de IA orbitando o celular
      gsap.from('.ai-orbit__item', {
        scale: 0,
        opacity: 0,
        stagger: 0.09,
        duration: 0.6,
        ease: 'back.out(2)',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 55%', once: true },
      })

      // seta que se desenha apontando para o chat — em loop:
      // desenha, segura, some, e recomeça
      const drawPaths = gsap.utils.toArray<SVGPathElement>('.phone-arrow .draw')
      const lens = drawPaths.map((p) => p.getTotalLength())
      drawPaths.forEach((p, i) =>
        gsap.set(p, { strokeDasharray: lens[i], strokeDashoffset: lens[i] }),
      )
      if (drawPaths.length) {
        gsap
          .timeline({
            repeat: -1,
            repeatDelay: 1.6,
            scrollTrigger: { trigger: '.phone-wrap', start: 'top 55%', once: true },
          })
          .set('.phone-arrow', { opacity: 1 })
          .fromTo(
            drawPaths[0],
            { strokeDashoffset: lens[0] },
            { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut' },
          )
          .fromTo(
            drawPaths[1],
            { strokeDashoffset: lens[1] },
            { strokeDashoffset: 0, duration: 0.25 },
            '-=0.05',
          )
          .to('.phone-arrow', { opacity: 0, duration: 0.6, delay: 1.3 })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="section ai-section" id="ia">
      <div className="ai-section__left">
        <h2 className="ai-section__title">
          <span className="reveal-line">
            <span>Um analista de IA</span>
          </span>
          <span className="reveal-line">
            <span>
              que <em>entrega resultados</em>
            </span>
          </span>
        </h2>
        <p className="ai-section__desc">
          Automação com agentes de IA que trabalham pela sua empresa: atendimento,
          análise, integração e decisão — rodando em produção, todos os dias.
        </p>

        <div className="ai-stats">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="ai-stat__value" data-value={s.value} data-suffix={s.suffix}>
                0<span>{s.suffix}</span>
              </div>
              <div className="ai-stat__label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="ai-capabilities">
          {CAPABILITIES.map((c) => (
            <span key={c} className="ai-capability">
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="phone-wrap">
        <PhoneChat />

        {/* seta desenhada apontando para o chat */}
        <svg className="phone-arrow" viewBox="0 0 220 140" fill="none" aria-hidden="true">
          <path
            className="draw"
            d="M12 22 C 74 6, 152 28, 194 96"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            className="draw"
            d="M194 96 l-17 -3 M194 96 l-5 -16"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>

        {/* ícones de IA flutuando ao redor do celular */}
        <div className="ai-orbit" aria-hidden="true">
          <span className="ai-orbit__item">
            {/* robô / agente */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="5" y="9" width="14" height="10" rx="3" />
              <circle cx="9.5" cy="14" r="1" fill="currentColor" stroke="none" />
              <circle cx="14.5" cy="14" r="1" fill="currentColor" stroke="none" />
              <path d="M12 9V5" />
              <circle cx="12" cy="3.5" r="1.4" />
            </svg>
          </span>
          <span className="ai-orbit__item">
            {/* automação / raio */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M13 2 5 13.5h5.5L10 22l8.5-11.5H13L13 2z" />
            </svg>
          </span>
          <span className="ai-orbit__item">
            {/* chip / processamento */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="7" y="7" width="10" height="10" rx="2" />
              <path d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3" />
            </svg>
          </span>
          <span className="ai-orbit__item">
            {/* rede de nós */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6" cy="6" r="2.2" />
              <circle cx="18" cy="8" r="2.2" />
              <circle cx="12" cy="18" r="2.2" />
              <path d="M8 7l7.8.8M7.2 7.8l3.6 8.2M16.8 10l-3.6 6.2" />
            </svg>
          </span>
          <span className="ai-orbit__item">
            {/* faísca / spark de IA */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M12 3c.6 4.8 3.2 7.4 9 9-5.8 1.6-8.4 4.2-9 9-.6-4.8-3.2-7.4-9-9 5.8-1.6 8.4-4.2 9-9z" />
            </svg>
          </span>
          <span className="ai-orbit__item">
            {/* cérebro */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M9.5 4a3 3 0 0 0-3 3c-1.7.3-3 1.8-3 3.5 0 1.1.5 2.1 1.3 2.8A3.5 3.5 0 0 0 8 20h1.5V4z" />
              <path d="M14.5 4a3 3 0 0 1 3 3c1.7.3 3 1.8 3 3.5 0 1.1-.5 2.1-1.3 2.8A3.5 3.5 0 0 1 16 20h-1.5V4z" />
            </svg>
          </span>
          <span className="ai-orbit__item">
            {/* base de dados */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <ellipse cx="12" cy="5" rx="7" ry="2.5" />
              <path d="M5 5v7c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5" />
              <path d="M5 12v7c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-7" />
            </svg>
          </span>
          <span className="ai-orbit__item">
            {/* código */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 6 3 12l5 6M16 6l5 6-5 6" />
            </svg>
          </span>
        </div>
      </div>
    </section>
  )
}
