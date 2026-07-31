import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { lenisStore } from '../../lib/lenisStore'

export type TourStep = {
  /** elemento HTML dentro do mockup (mockups de esqueleto) */
  selector?: string
  /** região percentual sobre o print (0–100) — responsivo por natureza */
  region?: { x: number; y: number; w: number; h: number }
  /** print exibido neste passo (tour pode navegar entre telas) */
  image?: string
  title: string
  text: string
}

type Rect = { top: number; left: number; width: number; height: number }

const PAD = 10
const CARD_W = 340
const CARD_GAP = 20

export default function ProjectTour({
  steps,
  container,
  onClose,
  onStepChange,
}: {
  steps: TourStep[]
  container: HTMLElement
  onClose: () => void
  onStepChange?: (step: TourStep) => void
}) {
  const [stepIndex, setStepIndex] = useState(0)

  // avisa o pai a cada passo (para trocar o print exibido, por exemplo)
  useEffect(() => {
    onStepChange?.(steps[stepIndex])
  }, [stepIndex, steps, onStepChange])
  const [spot, setSpot] = useState<Rect | null>(null)
  const [card, setCard] = useState<{ top: number; left: number } | null>(null)

  const measure = useCallback(() => {
    const step = steps[stepIndex]

    let r: Rect
    if (step.region) {
      // região em % do print: escala junto com a imagem em qualquer tela
      // (em molduras com bezel, mede a área da tela, não o aro)
      const base =
        container.querySelector<HTMLElement>('[data-tour-screen]') ?? container
      const c = base.getBoundingClientRect()
      r = {
        top: c.top + (step.region.y / 100) * c.height,
        left: c.left + (step.region.x / 100) * c.width,
        width: (step.region.w / 100) * c.width,
        height: (step.region.h / 100) * c.height,
      }
    } else if (step.selector) {
      const el = container.querySelector<HTMLElement>(step.selector)
      if (!el) return
      const b = el.getBoundingClientRect()
      r = { top: b.top, left: b.left, width: b.width, height: b.height }
    } else {
      return
    }

    const rect: Rect = {
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    }
    setSpot(rect)

    // posiciona o card: à esquerda do alvo se couber, senão abaixo/acima
    // (no mobile o card encolhe para caber; visualViewport = altura real no iOS)
    const vw = window.innerWidth
    const vh = window.visualViewport?.height ?? window.innerHeight
    const cardW = Math.min(CARD_W, vw - 32)
    let top: number
    let left: number

    if (rect.left > cardW + CARD_GAP + 16) {
      left = rect.left - cardW - CARD_GAP
      top = rect.top
    } else if (rect.left + rect.width + cardW + CARD_GAP < vw - 16) {
      left = rect.left + rect.width + CARD_GAP
      top = rect.top
    } else {
      left = Math.min(Math.max(16, rect.left), vw - cardW - 16)
      top = rect.top + rect.height + CARD_GAP
    }
    top = Math.min(Math.max(16, top), vh - 240)
    setCard({ top, left })
  }, [steps, stepIndex, container])

  // pausa o smooth scroll enquanto o tour está aberto
  useEffect(() => {
    lenisStore.lenis?.stop()
    return () => {
      lenisStore.lenis?.start()
    }
  }, [])

  useLayoutEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    // re-mede quando a moldura muda de tamanho (ex.: print carregou depois)
    const base =
      container.querySelector<HTMLElement>('[data-tour-screen]') ?? container
    const ro = new ResizeObserver(() => measure())
    ro.observe(base)
    ro.observe(container)
    return () => {
      window.removeEventListener('resize', measure)
      ro.disconnect()
    }
  }, [measure, container])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      if (e.key === 'ArrowLeft') setStepIndex((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function next() {
    if (stepIndex >= steps.length - 1) {
      onClose()
    } else {
      setStepIndex((i) => i + 1)
    }
  }

  if (!spot || !card) return null

  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

  return (
    <div className="tour-overlay" role="dialog" aria-label="Tour guiado do projeto">
      <div
        className="tour-spotlight"
        style={{
          top: spot.top,
          left: spot.left,
          width: spot.width,
          height: spot.height,
        }}
      />
      <div className="tour-card" style={{ top: card.top, left: card.left }}>
        <div className="tour-card__step">
          PASSO {stepIndex + 1} / {steps.length}
        </div>
        <div className="tour-card__title">{step.title}</div>
        <p className="tour-card__text">{step.text}</p>
        <div className="tour-card__actions">
          <button className="tour-card__skip" onClick={onClose}>
            Pular
          </button>
          <div className="tour-card__dots">
            {steps.map((_, i) => (
              <i key={i} className={i === stepIndex ? 'active' : ''} />
            ))}
          </div>
          <button className="tour-card__next" onClick={next}>
            {isLast ? 'Concluir' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  )
}
