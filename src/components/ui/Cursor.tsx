import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/** Cursor customizado: uma bola que segue o mouse com suavidade
    e cresce sobre elementos interativos. Desativado em telas touch. */
export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return

    const dot = dotRef.current!
    document.documentElement.classList.add('has-cursor')
    gsap.set(dot, { xPercent: -50, yPercent: -50, x: -100, y: -100 })

    const xTo = gsap.quickTo(dot, 'x', { duration: 0.3, ease: 'power3' })
    const yTo = gsap.quickTo(dot, 'y', { duration: 0.3, ease: 'power3' })

    const onMove = (e: MouseEvent) => {
      xTo(e.clientX)
      yTo(e.clientY)
    }

    const onOver = (e: MouseEvent) => {
      const interactive = (e.target as Element).closest(
        'a, button, input, .browser, .mobile-mock',
      )
      // cresce em tamanho real (width/height), não em scale — borda sempre nítida
      const size = interactive ? 42 : 22
      gsap.to(dot, { width: size, height: size, duration: 0.25 })
    }

    const onDown = () => gsap.to(dot, { scale: 0.85, duration: 0.15 })
    const onUp = () => gsap.to(dot, { scale: 1, duration: 0.25 })

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mouseover', onOver, { passive: true })
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)

    return () => {
      document.documentElement.classList.remove('has-cursor')
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  return <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
}
