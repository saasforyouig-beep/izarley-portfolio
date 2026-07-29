/**
 * Inteligência de leads:
 * - extractLead: deduz nome/número/empresa/dor a partir da conversa
 *   (a IA pergunta naturalmente; aqui apenas extraímos o que foi dito)
 * - notifySweep: sessões engajadas que esfriaram sem clique no WhatsApp
 *   ganham um resumo e disparam uma mensagem para o Izarley via webhook
 *   (ex.: fluxo N8N que manda WhatsApp para ele mesmo)
 */
import { db, dbReady } from './db.mjs'

const NOTIFY_WEBHOOK = process.env.NOTIFY_WEBHOOK || ''
const INACTIVE_MINUTES = 10

export function makeLeadIntel({ client, model }) {
  async function extractLead(sessionId, history) {
    if (!dbReady) return
    try {
      const dialog = history
        .map((m) => `${m.role === 'user' ? 'Visitante' : 'IA'}: ${m.content}`)
        .join('\n')
        .slice(-6000)

      const completion = await client.chat.completions.create({
        model,
        temperature: 0,
        max_tokens: 200,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Extraia do diálogo os dados do VISITANTE (não da IA). Responda APENAS JSON no formato {"nome": string|null, "numero": string|null, "empresa": string|null, "dor": string|null}. "numero" é o telefone/WhatsApp do visitante, apenas dígitos com DDD (null se não informado). "empresa" é o ramo/nome do negócio dele. "dor" é o problema/gargalo que ele descreveu, em uma frase. Use null para tudo que não foi dito explicitamente.',
          },
          { role: 'user', content: dialog },
        ],
      })
      const data = JSON.parse(completion.choices[0]?.message?.content || '{}')
      const numero = typeof data.numero === 'string' ? data.numero.replace(/\D/g, '').slice(0, 20) : null
      await db.upsertLead(sessionId, {
        nome: data.nome || null,
        numero: numero && numero.length >= 8 ? numero : null,
        empresa: data.empresa || null,
        dor: data.dor || null,
      })
    } catch (err) {
      console.error('[lead] extração falhou:', err.message)
    }
  }

  async function notifySweep() {
    if (!dbReady) return
    const sessions = (await db.sessionsToNotify(INACTIVE_MINUTES)) || []
    for (const { id } of sessions) {
      try {
        const rows = (await db.transcript(id)) || []
        if (rows.length === 0) {
          await db.markNotified(id)
          continue
        }
        const dialog = rows
          .map((m) => `${m.role === 'user' ? 'Visitante' : 'IA'}: ${m.content}`)
          .join('\n')
          .slice(-6000)

        const completion = await client.chat.completions.create({
          model,
          temperature: 0.3,
          max_tokens: 220,
          messages: [
            {
              role: 'system',
              content:
                'Resuma esta conversa do site em até 5 linhas, para o Izarley (o dono) ler rápido: quem é o lead, qual o negócio, qual a dor, o que foi proposto e o nível de interesse. Português direto.',
            },
            { role: 'user', content: dialog },
          ],
        })
        const resumo = completion.choices[0]?.message?.content?.trim() || null
        if (resumo) await db.upsertLead(id, { resumo })

        const lead = (await db.leadBySession(id)) || {}
        if (NOTIFY_WEBHOOK) {
          await fetch(NOTIFY_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origem: 'izarley.com.br',
              sessionId: id,
              nome: lead.nome || null,
              numero: lead.numero || null,
              empresa: lead.empresa || null,
              dor: lead.dor || null,
              resumo,
            }),
            signal: AbortSignal.timeout(10_000),
          }).catch((e) => console.error('[notify] webhook falhou:', e.message))
        }

        await db.markNotified(id)
        console.log(`[notify] lead ${id} resumido${NOTIFY_WEBHOOK ? ' e notificado' : ''}`)
      } catch (err) {
        console.error('[notify] sweep falhou para', id, err.message)
      }
    }
  }

  return { extractLead, notifySweep }
}
