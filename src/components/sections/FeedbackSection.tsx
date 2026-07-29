import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/* Prints reais de conversas com clientes (public/feedback/) */
const FEEDBACKS = [
  {
    src: '/feedback/feedback-1.jpg',
    alt: 'Print de conversa: cliente diz "Está perfeito dessa forma pessoal. Simples e objetivo" com emojis de palmas',
  },
  {
    src: '/feedback/feedback-2.jpg',
    alt: 'Print de conversa: cliente diz "Muito satisfeita com a nossa parceria, que Deus conserve nosso contrato por muitos e muitos anos"',
  },
  {
    src: '/feedback/feedback-3.jpg',
    alt: 'Print de conversa: cliente diz "até os clientes pensam que estão falando com uma pessoa" e outro responde "Surreal" com palmas',
  },
]

export default function FeedbackSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.print-card', {
        y: 60,
        opacity: 0,
        stagger: 0.14,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', once: true },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="section section--auto feedback-section" id="feedback">
      <header className="feedback-section__header">
        <h2 className="section-title">
          Feedback <em>real</em> de clientes
        </h2>
      </header>

      <div className="feedback-grid">
        {FEEDBACKS.map((f) => (
          <figure key={f.src} className="print-card print-card--img">
            <img src={f.src} alt={f.alt} loading="lazy" />
          </figure>
        ))}
      </div>
    </section>
  )
}
