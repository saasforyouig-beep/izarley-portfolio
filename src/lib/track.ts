/**
 * Rastreador de visitas do site: visitas, seções vistas e cliques.
 * Nunca quebra o site — tudo é best-effort e silencioso.
 */
const API_BASE = (import.meta.env.VITE_CHAT_API_URL ?? 'http://localhost:8787/chat').replace(
  /\/chat$/,
  '',
)
const VID_KEY = 'izarley-vid'

function vid(): string {
  try {
    let v = localStorage.getItem(VID_KEY)
    if (!v) {
      v = crypto.randomUUID()
      localStorage.setItem(VID_KEY, v)
    }
    return v
  } catch {
    return 'anon'
  }
}

export function track(type: string, name?: string, chatSessionId?: string) {
  try {
    const payload = JSON.stringify({ vid: vid(), type, name, chatSessionId })
    // sendBeacon com text/plain evita preflight e sobrevive à saída da página
    const ok = navigator.sendBeacon?.(
      `${API_BASE}/track`,
      new Blob([payload], { type: 'text/plain' }),
    )
    if (!ok) {
      fetch(`${API_BASE}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: payload,
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    /* silencioso */
  }
}

export function initTracking() {
  track('visit', 'home')

  // uma visualização por seção, por carregamento
  const seen = new Set<string>()
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const id = (e.target as HTMLElement).id || 'secao'
        if (!seen.has(id)) {
          seen.add(id)
          track('section_view', id)
        }
      }
    },
    { threshold: 0.15 },
  )
  document.querySelectorAll('main > section').forEach((s) => io.observe(s))

  // cliques em WhatsApp e e-mail (o botão do chat rastreia por conta própria)
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest?.('a')
    if (!a) return
    if (a.classList.contains('chat__wa-btn')) return
    const href = a.getAttribute('href') || ''
    if (href.includes('wa.me')) {
      const name = a.classList.contains('hero__cta')
        ? 'hero'
        : a.classList.contains('contact__whats')
          ? 'contato'
          : 'link'
      track('whatsapp_click', name)
    } else if (href.startsWith('mailto:')) {
      track('click', 'email')
    }
  })
}
