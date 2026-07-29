import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Transições 3D entre seções, dirigidas pelo scroll.
 * A entrada completa RÁPIDO (até o topo atingir 70% da viewport): a seção
 * chega, "assenta" de frente e segura neutra enquanto é lida — só tomba
 * para trás quando está de fato saindo pelo topo.
 * fromTo com valores explícitos + immediateRender:false garante scrub
 * 100% reversível, sem estados presos ao voltar o scroll.
 */
export function useSectionTransitions() {
  useEffect(() => {
    const ctx = gsap.context(() => {
      // hero e projetos ficam de fora: o hero tem coreografia própria e a
      // seção de projetos anima projeto a projeto (dentro do DevSection)
      const sections = gsap.utils.toArray<HTMLElement>(
        'main > section:not(.hero):not(.dev-section)',
      )

      sections.forEach((sec, i) => {
        gsap.set(sec, { transformPerspective: 1400 })

        // entrada: cartão deitado se levanta e assenta logo ao chegar
        gsap.fromTo(
          sec,
          { rotateX: 12, y: 90, scale: 0.97, opacity: 0.3, transformOrigin: '50% 100%' },
          {
            rotateX: 0,
            y: 0,
            scale: 1,
            opacity: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: sec,
              start: 'top 98%',
              end: 'top 70%',
              scrub: true,
            },
          },
        )

        // saída: só quando a seção está realmente indo embora pelo topo
        if (i < sections.length - 1) {
          gsap.fromTo(
            sec,
            { rotateX: 0, y: 0, scale: 1, opacity: 1, transformOrigin: '50% 0%' },
            {
              rotateX: -8,
              y: -50,
              scale: 0.95,
              opacity: 0.35,
              ease: 'none',
              immediateRender: false,
              scrollTrigger: {
                trigger: sec,
                start: 'bottom 40%',
                end: 'bottom 4%',
                scrub: true,
              },
            },
          )
        }
      })
    })

    return () => ctx.revert()
  }, [])
}
