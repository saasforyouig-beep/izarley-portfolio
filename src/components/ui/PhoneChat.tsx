import { useEffect, useRef, useState, type FormEvent } from 'react'
import { track } from '../../lib/track'

type Message = {
  id: number
  from: 'ai' | 'user'
  text: string
}

const CHAT_API = import.meta.env.VITE_CHAT_API_URL ?? 'http://localhost:8787/chat'
const WHATSAPP = 'https://wa.me/5588981163853'
const WA_LINK_RE = /https?:\/\/wa\.me\/\d+/

/** id novo a cada carregamento: recarregou a página, a conversa recomeça */
const SESSION_ID = crypto.randomUUID()

/** espera após a última mensagem antes de acionar a IA — garante que
    quem manda várias mensagens seguidas seja respondido de uma vez só */
const DEBOUNCE_MS = 10_000
const API_TIMEOUT_MS = 30_000

const INTRO_1 = 'Oi! 👋 Eu sou a IA do Izarley.'
const INTRO_2 =
  'Pergunte qualquer coisa — projetos, experiência, automações... Estou online 😉'
const FALLBACK_REPLY = `Opa, tive um probleminha técnico agora 😅 Mas o Izarley responde rapidinho no WhatsApp: ${WHATSAPP}`

export default function PhoneChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  // balão "digitando": fica visível sempre que a última mensagem é do lead
  // (durante a espera E durante a geração), como no WhatsApp
  const [typing, setTyping] = useState(false)
  const screenRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(1)
  /** espelho do input para os timers lerem o valor atual */
  const inputNow = useRef('')
  /** mensagens enviadas e ainda não respondidas pela IA */
  const pending = useRef<string[]>([])
  const debounceTimer = useRef<number | null>(null)

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages, typing])

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  function buzz() {
    const el = screenRef.current
    if (!el) return
    el.classList.remove('buzz')
    void el.offsetWidth
    el.classList.add('buzz')
    window.setTimeout(() => el.classList.remove('buzz'), 550)
  }

  function pushAi(text: string) {
    setMessages((m) => [...m, { id: nextId.current++, from: 'ai', text }])
    buzz()
  }

  // a primeira mensagem só aparece quando o visitante chega de fato na seção
  useEffect(() => {
    const el = screenRef.current
    if (!el) return
    const timeouts: number[] = []

    const arrive = (text: string) => {
      setTyping(false)
      pushAi(text)
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        timeouts.push(window.setTimeout(() => setTyping(true), 700))
        timeouts.push(window.setTimeout(() => arrive(INTRO_1), 1900))
        timeouts.push(window.setTimeout(() => setTyping(true), 2600))
        timeouts.push(window.setTimeout(() => arrive(INTRO_2), 4000))
      },
      // exige o telefone bem dentro da tela antes de iniciar a conversa
      { threshold: 0.55, rootMargin: '0px 0px -12% 0px' },
    )
    io.observe(el)

    return () => {
      io.disconnect()
      timeouts.forEach(clearTimeout)
    }
  }, [])

  /** reinicia a contagem: cada mensagem (ou tecla) espera DEBOUNCE_MS */
  function resetDebounce() {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = window.setTimeout(flush, DEBOUNCE_MS)
  }

  /** dispara a IA com TODAS as mensagens acumuladas — mas só se o lead
      não estiver digitando (campo vazio); senão, espera mais */
  async function flush() {
    if (inputNow.current.trim()) {
      resetDebounce()
      return
    }
    const batch = pending.current.splice(0)
    if (batch.length === 0) return

    try {
      const ctrl = new AbortController()
      const timeout = window.setTimeout(() => ctrl.abort(), API_TIMEOUT_MS)
      const res = await fetch(CHAT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: SESSION_ID, messages: batch }),
        signal: ctrl.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) throw new Error(String(res.status))
      const data = (await res.json()) as { reply?: string; replies?: string[] }
      const list = data.replies?.length ? data.replies : [data.reply || FALLBACK_REPLY]
      // bolhas uma a uma: 4s de "digitando" entre cada envio; se o lead
      // mandar algo no meio, pausa a fila e processa a nova mensagem
      for (let i = 0; i < list.length; i++) {
        if (i > 0) {
          await new Promise((r) => setTimeout(r, 4000))
          if (pending.current.length > 0) break
        }
        pushAi(list[i])
      }
    } catch {
      pushAi(FALLBACK_REPLY)
    } finally {
      // se o lead mandou mais mensagens enquanto a IA gerava, o balão continua
      setTyping(pending.current.length > 0)
    }
  }

  function handleSend(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return

    setMessages((prev) => [...prev, { id: nextId.current++, from: 'user', text }])
    setInput('')
    inputNow.current = ''
    pending.current.push(text)
    // última mensagem agora é do lead: balão "digitando" já aparece
    setTyping(true)
    resetDebounce()
  }

  function handleInputChange(value: string) {
    setInput(value)
    inputNow.current = value
    // digitando com mensagens na fila: segura a resposta da IA
    if (pending.current.length > 0) resetDebounce()
  }

  // o "digitando" só aparece com o campo do lead limpo: enquanto ele digita,
  // o status some e volta assim que o campo esvazia (aí correm os 10s)
  const showTyping = typing && input.trim() === ''

  return (
    <div className="phone-float">
      <div className="phone">
        <div ref={screenRef} className="phone__screen">
          <header className="chat__header">
            <div className="chat__avatar">IA</div>
            <div>
              <div className="chat__title">Izarley.AI</div>
              <div className="chat__status">{showTyping ? 'Digitando...' : 'Online'}</div>
            </div>
          </header>

          <div ref={listRef} className="chat__messages">
            {messages.map((m) => {
              const link = m.from === 'ai' ? m.text.match(WA_LINK_RE)?.[0] : undefined
              const text = link
                ? m.text
                    .replace(link, '')
                    .replace(/\s{2,}/g, ' ')
                    .replace(/\s+([.!?,:])/g, '$1')
                    // restos do link removido: "aqui:." -> "aqui:", "aqui:," -> "aqui:"
                    .replace(/([:,;])[.!?,]+/g, '$1')
                    .trim()
                : m.text
              return (
                <div key={m.id} className={`chat__bubble chat__bubble--${m.from}`}>
                  {text}
                  {link && (
                    <a
                      className="chat__wa-btn"
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => track('whatsapp_click', 'chat', SESSION_ID)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                      </svg>
                      Chamar no WhatsApp
                    </a>
                  )}
                </div>
              )
            })}
            {showTyping && (
              <div className="chat__typing">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>

          <form className="chat__input-bar" onSubmit={handleSend}>
            <input
              className="chat__input"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Pergunte sobre mim..."
              aria-label="Mensagem"
              maxLength={400}
            />
            <button type="submit" className="chat__send" aria-label="Enviar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 11.5L21 3l-8.5 18-2.5-7.5L3 11.5z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
