import { useEffect, useState } from 'react'
import { lenisStore } from '../../lib/lenisStore'

const LINKS = [
  { href: '#ia', label: 'IA' },
  { href: '#projetos', label: 'Projetos' },
  { href: '#feedback', label: 'Feedback' },
  { href: '#livros', label: 'Livros' },
  { href: '#blog', label: 'Blog' },
  { href: '#contato', label: 'Contato' },
]

export default function Nav() {
  const [open, setOpen] = useState(false)

  // trava o scroll enquanto o menu mobile está aberto
  useEffect(() => {
    if (open) lenisStore.lenis?.stop()
    else lenisStore.lenis?.start()
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function go(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault()
    setOpen(false)
    const el = document.querySelector<HTMLElement>(href)
    if (!el) return
    if (lenisStore.lenis) {
      lenisStore.lenis.start()
      lenisStore.lenis.scrollTo(el, { duration: 1.4 })
    } else {
      el.scrollIntoView()
    }
  }

  return (
    <>
      <nav className="nav">
        <a href="#home" className="nav__logo" onClick={(e) => go(e, '#home')}>
          izarley<span style={{ opacity: 0.5 }}>.com.br</span>
        </a>

        <div className="nav__links">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={(e) => go(e, l.href)}>
              {l.label}
            </a>
          ))}
        </div>

        <button
          className={`nav__burger${open ? ' is-open' : ''}`}
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
        >
          <span />
          <span />
        </button>
      </nav>

      <div className={`nav-menu${open ? ' is-open' : ''}`} role="dialog" aria-label="Menu">
        {LINKS.map((l, i) => (
          <a
            key={l.href}
            href={l.href}
            style={{ transitionDelay: open ? `${0.06 * i + 0.1}s` : '0s' }}
            onClick={(e) => go(e, l.href)}
          >
            <span className="nav-menu__index">0{i + 1}</span>
            {l.label}
          </a>
        ))}
      </div>
    </>
  )
}
