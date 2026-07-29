import type Lenis from 'lenis'

/** Instância compartilhada do Lenis — permite pausar o scroll durante o tour guiado. */
export const lenisStore: { lenis: Lenis | null } = { lenis: null }
