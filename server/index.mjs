/**
 * IA do Izarley — servidor do chat do portfolio (izarley.com.br)
 * OpenAI GPT-4o-mini
 *
 * POST /chat  { sessionId, messages: string[] }  →  { reply }
 *
 * Rodar:  cd server && npm install && npm start
 * Config: server/.env  (veja .env.example)
 */
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { timingSafeEqual } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import OpenAI from 'openai'
import { initDb, db, dbReady } from './db.mjs'
import { makeLeadIntel } from './lead-intel.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PORT = Number(process.env.PORT || 8787)
const MODEL = process.env.CHAT_MODEL || 'gpt-4o-mini'
// 0.7: humanizada e variada, sem perder consistência comercial
const TEMPERATURE = 0.7
// aceita lista separada por vírgula, ex.: "http://localhost:5173,https://izarley.com.br"
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || '*').split(',').map((s) => s.trim())
const WHATSAPP = 'https://wa.me/5588981163853'

// limites anti-abuso (chat público)
const MAX_MESSAGE_LEN = 400
const MAX_TURNS_PER_SESSION = 20
const IP_WINDOW_MS = 5 * 60 * 1000
const IP_MAX_HITS = 30
const SESSION_TTL_MS = 60 * 60 * 1000
// anti-loop e proteção de gastos
const MIN_SESSION_INTERVAL_MS = 8_000 // intervalo mínimo entre chamadas da mesma sessão (debounce do front: 10s)
const MAX_CONCURRENT = 8 // chamadas simultâneas à OpenAI
const MAX_HISTORY_MSGS = 12 // mensagens de histórico enviadas por chamada (limita tokens)
const DAILY_MAX_CALLS = Number(process.env.DAILY_MAX_CALLS || 300) // teto diário global

// lê OPENAI_API_KEY do ambiente; o placeholder permite o servidor subir sem a
// key (as respostas caem no fallback do WhatsApp até ela ser configurada).
// timeout curto + 1 retry: nada de chamadas penduradas gastando à toa
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder',
  timeout: 30_000,
  maxRetries: 1,
})

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''
const intel = makeLeadIntel({ client, model: MODEL })
initDb()
// varredura: sessões engajadas que esfriaram → resumo + notificação
setInterval(() => intel.notifySweep().catch(() => {}), 5 * 60 * 1000).unref()

function adminAuthed(req) {
  if (!ADMIN_TOKEN) return false
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const a = Buffer.from(token)
  const b = Buffer.from(ADMIN_TOKEN)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** orçamento diário global — estourou, o chat conduz ao WhatsApp sem gastar */
let dailyDay = new Date().toDateString()
let dailyCount = 0
let inFlight = 0

function budgetExceeded() {
  const today = new Date().toDateString()
  if (today !== dailyDay) {
    dailyDay = today
    dailyCount = 0
  }
  return dailyCount >= DAILY_MAX_CALLS
}

const SYSTEM_PROMPT = `Você é a IA do Izarley Rodrigues, assistente virtual do site izarley.com.br. Você conversa com visitantes em nome dele — e é, você mesma, uma demonstração viva do produto que ele vende: agentes de IA humanizados que atendem como gente de verdade.

## Quem é o Izarley
- Desenvolvedor experiente de sistemas e especialista em IA, automação, servidores e arquitetura de software.
- Cria sistemas de todas as formas e ramos: hospedados na web, aplicativos para computador, apps mobile — do backend ao frontend.
- Trabalha com N8N há anos, orquestrando agentes de IA para WhatsApp 100% humanizados.
- Fundador do Pointt: sistema whitelabel de gestão de agendas, colaboradores, produtos e caixa, com página própria de agendamento para cada negócio.
- Sócio-fundador do Dumply: marketplace que combate o desperdício, onde estabelecimentos vendem alimentos de qualidade perto da validade com desconto — inclui a dumply Feira, catálogo para produtores de hortifrúti.
- Desenvolveu o Pelvic (gestão de clínica com IA que confirma e remarca consultas sozinha — um SDR embutido) e o sistema da Geisa Estética (gestão de clínica de estética com IA integrada ao WhatsApp).
- Tecnologias que domina: React.js, PHP, Java, MySQL e Redis. Especialista em arquitetura de software, banco de dados e servidores.
- Experiente em automatizar empresas de ponta a ponta: processos, disparos de mensagens, follow-ups e organização completa da empresa, do atendimento às vendas — com N8N ou código nativo.
- Hoje atende 3 clínicas, empresas de food/alimentação e revendedoras de produtos.

## O que você vende (seus argumentos)
- O agente de IA é treinado para ser 100% humanizado: toma decisões, é persuasivo, tira dúvidas e interage com os clientes exatamente como o dono do negócio desejar — mais divertido, formal ou informal.
- Fica 24/7 atuando: não tira pausa nem férias, não demora a responder e não tem instabilidade na qualidade — resolve o problema de demora nas respostas, qualidade e resultados.
- Segurança: a IA é treinada para tomar cuidado com palavras e assuntos sensíveis e transferir para um humano imediatamente quando necessário. Fica a critério do cliente: ela pode avisar que é um robô, ou permanecer humanizada e dizer que vai "transferir a um responsável".
- Sistemas sob medida: além de agentes de IA, o Izarley constrói o sistema completo que o negócio precisar, com arquitetura sólida e servidores bem cuidados.

## Preço
- NUNCA diga números. Responda que o valor é simbólico pela qualidade e se encaixa de pequenas empresas até grandes empresas — e emende convidando para uma reunião.

## Como começar (o fluxo que você conduz)
1. Alinhar como a IA deve agir.
2. Uma IA de teste por 7 dias, para a pessoa confirmar que é exatamente o que deseja.
3. Uma chamada para finalizar.
Ao explicar esse fluxo — ou a qualquer sinal claro de interesse — envie o link do WhatsApp: ${WHATSAPP}

## Situações que você não conhece
Se surgir qualquer dúvida ou situação sobre a qual você não tem conhecimento ou segurança para responder, não invente: diga com simpatia que essa é uma boa conversa para ter direto com o Izarley e envie o link ${WHATSAPP} (o site transforma esse link em um botão de redirecionamento automaticamente).

## Estilo
- Português do Brasil, tom humano, caloroso e confiante.
- Mensagens curtas, estilo WhatsApp. Emojis com moderação (😄 🚀 👏).
- Persuasiva sem ser insistente. Sempre termine guiando ao próximo passo.
- O visitante pode mandar várias mensagens de uma vez — responda ao conjunto delas como um todo.
- Divida sua resposta em ATÉ 4 mensagens separadas, como no WhatsApp: separe cada mensagem com uma linha contendo apenas ###.
- Cada mensagem deve ser CURTA: idealmente 1 frase, no máximo 2 frases curtas. Se o conteúdo for grande, divida o máximo que conseguir (até o limite de 4 mensagens).
- Mesmo respostas pequenas ficam mais humanas em 2 mensagens (ex.: uma reação curta + a informação).
- NUNCA envie textão: seja direto e bem explicativo.

## Descoberta: "como automatizar minha empresa?"
Quando o visitante quiser saber como automatizar a empresa dele, conduza uma conversa de descoberta, UMA pergunta por vez: qual o ramo do negócio; como funciona o atendimento hoje; qual a principal dor ou gargalo; qual o volume de clientes/mensagens. Colete o máximo de informação antes de propor.
Depois de entender o cenário, proponha ideias concretas de automação — SOMENTE com o que você tem certeza de que o Izarley entrega: agente de IA humanizado no WhatsApp, confirmação e remarcação de agendamentos, follow-ups automáticos, disparos de mensagens, organização do funil do atendimento às vendas, sistemas sob medida e integrações com N8N ou código nativo. Se não tiver certeza de que algo é possível, NÃO prometa: diga que é uma ótima pergunta para validar direto com o Izarley no WhatsApp.
Durante a conversa, se a pessoa estiver engajada, pergunte com naturalidade o nome dela. Mais adiante — apenas se o engajamento continuar — pergunte o número de WhatsApp para o Izarley falar com ela diretamente. Nunca force nem condicione a conversa a esses dados; são opcionais e devem surgir naturalmente.

## Saudações
O site já enviou duas mensagens iniciais se apresentando. Se o visitante responder apenas com uma saudação ("oi", "olá", "bom dia"), NÃO se apresente de novo nem pergunte "como posso ajudar": responda a saudação em poucas palavras e já seja ativo, puxando assunto sobre o Izarley e o que ele pode fazer pelo negócio da pessoa.

## Regras de ouro
- Fale apenas sobre o Izarley, os serviços e os projetos dele. Assuntos fora disso (política, tarefas gerais, "escreva um texto pra mim"): recuse com simpatia em uma frase e volte ao assunto.
- Nunca invente preços, prazos, números ou clientes que não estão neste prompt.
- Pergunta técnica profunda, negociação ou algo que você não sabe: direcione ao WhatsApp com o link.
- Nada de listas longas ou parágrafos gigantes.

## Exemplos de atendimento (siga exatamente este padrão)

Visitante: Esse negócio de IA no WhatsApp funciona mesmo ou é robozinho de menu?
Você: Nada de menuzinho! 😄 O agente é treinado para ser 100% humanizado: toma decisões, é persuasivo, tira dúvidas e conversa exatamente como você desejar — mais divertido, formal ou informal.

Visitante: Minha secretária não dá conta, perdemos cliente por demora na resposta. Isso resolve?
Você: Resolve exatamente isso: a IA fica 24/7 atuando, não tira pausa nem férias, e não demora a responder. Ela elimina a demora, mantém a qualidade e entrega resultados.

Visitante: Quanto custa? Demora quanto pra ficar pronta?
Você: O valor é simbólico pela qualidade — e se encaixa de pequenas até grandes empresas. Podemos marcar uma reunião para eu te mostrar certinho? 🚀

Visitante: Já fizeram isso pra alguma clínica? Tenho medo de a IA falar besteira.
Você: Sim! Trabalhamos com 3 clínicas hoje, além de empresas de food e revendedoras. E a IA é treinada para evitar assuntos delicados e transferir para um humano na hora — você escolhe se ela avisa que é robô ou se transfere "para um responsável" de forma humanizada.

Visitante: Tenho uma loja e perco vendas porque demoro a responder o WhatsApp.
Você: Isso tem solução, viu? 😄
###
A IA responde na hora, 24/7, tira dúvidas, oferece produtos e ainda faz follow-up com quem não fechou — sem pausa nem férias.
###
Quer ver funcionando na sua loja? Alinhamos como ela deve agir e você testa por 7 dias: https://wa.me/5588981163853

Visitante: Quais linguagens você domina?
Você: Boa pergunta! 😄
###
React.js, PHP, Java, MySQL e Redis são o dia a dia dele.
###
E além do código: especialista em arquitetura, banco de dados e servidores.
###
Quer ver isso aplicado no seu negócio? Me chama: https://wa.me/5588981163853

Visitante: Gostei. Como a gente começa?
Você: Simples: alinhamos como a IA deve agir, você recebe uma IA de teste por 7 dias para confirmar que é exatamente o que deseja, e fazemos uma chamada para finalizar. Bora começar? Me chama aqui: ${WHATSAPP}`

const FALLBACK_REPLY = `Opa, tive um probleminha técnico agora 😅 Mas o Izarley responde rapidinho no WhatsApp: ${WHATSAPP}`
const LIMIT_REPLY = `Adorei nosso papo! 😄 Para continuar, bora falar direto com o Izarley? Me chama aqui: ${WHATSAPP}`

/** sessões em memória: sessionId → { history, turns, lastSeen }
    (o front gera um sessionId novo a cada carregamento da página) */
const sessions = new Map()
/** rate limit por IP: ip → timestamps */
const ipHits = new Map()

setInterval(() => {
  const now = Date.now()
  for (const [id, s] of sessions) if (now - s.lastSeen > SESSION_TTL_MS) sessions.delete(id)
  for (const [ip, hits] of ipHits) {
    const fresh = hits.filter((t) => now - t < IP_WINDOW_MS)
    if (fresh.length === 0) ipHits.delete(ip)
    else ipHits.set(ip, fresh)
  }
}, 10 * 60 * 1000).unref()

function rateLimited(ip) {
  const now = Date.now()
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < IP_WINDOW_MS)
  hits.push(now)
  ipHits.set(ip, hits)
  return hits.length > IP_MAX_HITS
}

function corsHeaders(req) {
  const origin = req.headers.origin || ''
  const allow = ALLOWED_ORIGINS.includes('*')
    ? '*'
    : ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(req, res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders(req) })
  res.end(JSON.stringify(body))
}

async function readBody(req) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > 10_000) throw new Error('payload too large')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

async function askGPT(history) {
  // só as últimas mensagens vão para a API: conversa longa não vira fatura longa
  const recent = history.slice(-MAX_HISTORY_MSGS)
  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: TEMPERATURE,
    max_tokens: 300,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...recent],
  })
  return completion.choices[0]?.message?.content?.trim() || FALLBACK_REPLY
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req))
    return res.end()
  }

  const url = new URL(req.url, 'http://x')

  // ---------- rastreio de visitas/cliques (público, validado) ----------
  if (req.method === 'POST' && url.pathname === '/track') {
    let body
    try {
      body = await readBody(req)
    } catch {
      return json(req, res, 400, { ok: false })
    }
    const TYPES = ['visit', 'section_view', 'click', 'whatsapp_click']
    const type = TYPES.includes(body.type) ? body.type : null
    const vid = typeof body.vid === 'string' ? body.vid.slice(0, 64) : null
    if (!type || !vid) return json(req, res, 400, { ok: false })
    db.saveEvent(vid, type, body.name)
    if (type === 'whatsapp_click' && typeof body.chatSessionId === 'string') {
      db.setWhatsappClicked(body.chatSessionId.slice(0, 64))
    }
    return json(req, res, 200, { ok: true })
  }

  // ---------- painel admin (privado: token obrigatório) ----------
  if (url.pathname === '/admin' || url.pathname === '/admin/') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
    })
    return res.end(readFileSync(join(__dirname, 'admin.html')))
  }
  if (url.pathname.startsWith('/admin/api/')) {
    if (!adminAuthed(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      return res.end(JSON.stringify({ error: 'unauthorized' }))
    }
    if (!dbReady) {
      res.writeHead(503, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'banco indisponível' }))
    }
    let payload = null
    if (url.pathname === '/admin/api/stats') {
      payload = await db.adminStats(url.searchParams.get('days'))
    } else if (url.pathname === '/admin/api/leads') {
      payload = await db.adminLeads(url.searchParams.get('only') !== '0')
    } else if (url.pathname === '/admin/api/conversa') {
      payload = await db.transcript((url.searchParams.get('session') || '').slice(0, 64))
    }
    res.writeHead(payload ? 200 : 404, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    })
    return res.end(JSON.stringify(payload ?? { error: 'not found' }))
  }

  if (req.method !== 'POST' || url.pathname !== '/chat') {
    return json(req, res, 404, { error: 'not found' })
  }

  // navegador com origem fora da lista: bloqueia antes de qualquer gasto
  const origin = req.headers.origin
  if (origin && !ALLOWED_ORIGINS.includes('*') && !ALLOWED_ORIGINS.includes(origin)) {
    return json(req, res, 403, { error: 'origin não permitida' })
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '?'
  if (rateLimited(ip)) return json(req, res, 429, { reply: LIMIT_REPLY })

  let body
  try {
    body = await readBody(req)
  } catch {
    return json(req, res, 400, { error: 'invalid body' })
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.slice(0, 64) : null
  // aceita várias mensagens de uma vez (o front agrupa com debounce)
  const rawList = Array.isArray(body.messages)
    ? body.messages
    : typeof body.message === 'string'
      ? [body.message]
      : []
  const parts = rawList
    .filter((m) => typeof m === 'string')
    .map((m) => m.trim().slice(0, MAX_MESSAGE_LEN))
    .filter(Boolean)
    .slice(0, 10)

  if (!sessionId || parts.length === 0) {
    return json(req, res, 400, { error: 'sessionId e messages são obrigatórios' })
  }

  let session = sessions.get(sessionId)
  if (!session) {
    session = { history: [], turns: 0, lastSeen: Date.now() }
    sessions.set(sessionId, session)
  }
  session.lastSeen = Date.now()

  // sessão longa demais: conduz para o WhatsApp sem gastar tokens
  if (session.turns >= MAX_TURNS_PER_SESSION) return json(req, res, 200, { reply: LIMIT_REPLY })

  // anti-loop: intervalo mínimo entre chamadas da mesma sessão
  // (o fluxo legítimo tem debounce de 30s no front — mais rápido que isso é bot)
  const now = Date.now()
  if (now - (session.lastCall || 0) < MIN_SESSION_INTERVAL_MS) {
    return json(req, res, 429, { reply: LIMIT_REPLY })
  }

  // anti-loop: exatamente a mesma mensagem repetida não gasta API
  const joined = parts.join('\n')
  if (session.lastText === joined) {
    return json(req, res, 200, {
      reply: `Acho que essa mensagem chegou em dobro 😄 Me chama no WhatsApp que resolvemos rapidinho: ${WHATSAPP}`,
    })
  }

  // proteção de gastos: teto diário global e teto de chamadas simultâneas
  if (budgetExceeded()) return json(req, res, 200, { reply: LIMIT_REPLY })
  if (inFlight >= MAX_CONCURRENT) {
    return json(req, res, 200, {
      reply: `Estou com muita gente falando comigo agora 😅 Me chama no WhatsApp que o Izarley responde: ${WHATSAPP}`,
    })
  }

  session.turns++
  session.lastCall = now
  session.lastText = joined
  session.history.push({ role: 'user', content: joined })
  db.touchSession(sessionId)
  db.saveMessage(sessionId, 'user', joined)

  inFlight++
  dailyCount++
  try {
    const raw = await askGPT(session.history)
    // a IA pode dividir a resposta em até 3 mensagens separadas por ###
    const replies = raw
      .split(/\n?\s*###\s*\n?|\n{2,}/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4)
    const reply = replies.join('\n\n')
    session.history.push({ role: 'assistant', content: reply })
    db.saveMessage(sessionId, 'ai', reply)
    // extrai nome/número/empresa/dor da conversa (assíncrono, sem travar)
    if (/\d{8,}/.test(joined) || (session.turns >= 2 && session.turns % 2 === 0)) {
      intel.extractLead(sessionId, session.history).catch(() => {})
    }
    return json(req, res, 200, { reply, replies })
  } catch (err) {
    // remove a mensagem que falhou para não corromper o histórico
    session.history.pop()
    if (err instanceof OpenAI.RateLimitError) {
      return json(req, res, 200, {
        reply: `Estou com muita gente falando comigo agora 😅 Me chama no WhatsApp que o Izarley responde: ${WHATSAPP}`,
      })
    }
    if (err instanceof OpenAI.AuthenticationError) {
      console.error('[chat] OPENAI_API_KEY ausente ou inválida')
    } else if (err instanceof OpenAI.APIError) {
      console.error('[chat] API error', err.status, err.message)
    } else {
      console.error('[chat] erro', err)
    }
    return json(req, res, 200, { reply: FALLBACK_REPLY })
  } finally {
    inFlight--
  }
})

server.listen(PORT, () => {
  console.log(`IA do Izarley ouvindo em http://localhost:${PORT}/chat (modelo: ${MODEL}, temp: ${TEMPERATURE})`)
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  OPENAI_API_KEY não definida — as respostas cairão no fallback do WhatsApp')
  }
})
