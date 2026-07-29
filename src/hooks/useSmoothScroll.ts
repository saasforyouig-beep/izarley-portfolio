import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { lenisStore } from '../lib/lenisStore'

gsap.registerPlugin(ScrollTrigger)

/**
 * Smooth scroll (Lenis) sincronizado com o GSAP ScrollTrigger.
 * O ticker do GSAP dirige o raf do Lenis — uma única fonte de tempo,
 * sem dois requestAnimationFrame competindo.
 */
export function useSmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      // um pouco mais pesado: o scroll "assenta" ao chegar nas seções
      duration: 1.4,
      smoothWheel: true,
    })
    lenisStore.lenis = lenis

    lenis.on('scroll', ScrollTrigger.update)

    const tick = (time: number) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      lenisStore.lenis = null
    }
  }, [])
}
