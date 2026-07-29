import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export default function BlogSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.blog-card', {
        y: 50,
        opacity: 0,
        stagger: 0.12,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', once: true },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="section section--auto blog-section" id="blog">
      <header className="blog-section__header">
        <h2 className="section-title">
          Blog em <em>construção</em>
        </h2>
      </header>

      <div className="blog-grid">
        {[0, 1, 2].map((i) => (
          <div key={i} className="blog-card">
            <span className="blog-card__soon">Em breve</span>
            <div className="sk-line" style={{ width: '55%' }} />
            <div className="sk-line" style={{ width: '90%', height: 12 }} />
            <div className="sk-line" style={{ width: '75%', height: 12 }} />
            <div className="sk-line" style={{ width: '35%', marginTop: 'auto' }} />
          </div>
        ))}
      </div>
    </section>
  )
}
