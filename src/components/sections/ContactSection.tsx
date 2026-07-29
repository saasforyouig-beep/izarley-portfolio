import { useEffect, useRef } from 'react'
import gsap from 'gsap'

const SOCIALS = [{ label: 'Instagram', href: 'https://instagram.com/izarley' }]

export default function ContactSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.contact-section > *', {
        y: 50,
        opacity: 0,
        stagger: 0.1,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', once: true },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="section section--auto contact-section" id="contato">
      <h2 className="contact__title">
        Vamos automatizar
        <br />
        o seu <em>negócio?</em>
      </h2>
      {/* WhatsApp em destaque: onde a resposta é mais rápida */}
      <a
        className="contact__whats"
        href="https://wa.me/5588981163853"
        target="_blank"
        rel="noreferrer"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
        Chamar no WhatsApp
      </a>

      {/* e-mail como alternativa, com o próprio respiro */}
      <a className="contact__email" href="mailto:contato@izarley.com.br">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="m3.5 7 8.5 6 8.5-6" />
        </svg>
        contato@izarley.com.br
      </a>
      <div className="contact__links">
        {SOCIALS.map((s) => (
          <a key={s.label} href={s.href} target="_blank" rel="noreferrer">
            {s.label}
          </a>
        ))}
      </div>
    </section>
  )
}
