/**
 * Banco de dados (MySQL) — sessões, mensagens, leads e eventos do site.
 * Se o banco estiver indisponível, o chat continua funcionando (tudo aqui
 * é fire-and-forget); apenas o rastreio/painel ficam sem dados novos.
 */
import mysql from 'mysql2/promise'

let pool = null
export let dbReady = false

export async function initDb() {
  if (!process.env.DB_HOST) {
    console.warn('⚠️  DB_* não configurado — rastreio e painel desativados')
    return
  }
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_DATABASE,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      connectionLimit: 5,
      connectTimeout: 8000,
    })

    await pool.query(`CREATE TABLE IF NOT EXISTS chat_sessions (
      id VARCHAR(64) PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      notified TINYINT DEFAULT 0
    )`)
    await pool.query(`CREATE TABLE IF NOT EXISTS chat_messages (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      session_id VARCHAR(64) NOT NULL,
      role ENUM('user','ai') NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_session (session_id)
    )`)
    await pool.query(`CREATE TABLE IF NOT EXISTS leads (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      session_id VARCHAR(64) UNIQUE NOT NULL,
      nome VARCHAR(120) NULL,
      numero VARCHAR(32) NULL,
      empresa VARCHAR(160) NULL,
      dor TEXT NULL,
      resumo TEXT NULL,
      whatsapp_clicked TINYINT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`)
    await pool.query(`CREATE TABLE IF NOT EXISTS site_events (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      visitor_id VARCHAR(64) NULL,
      type VARCHAR(32) NOT NULL,
      name VARCHAR(120) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_type (type),
      INDEX idx_created (created_at)
    )`)

    dbReady = true
    console.log('✓ MySQL conectado e tabelas prontas')
  } catch (err) {
    console.error('⚠️  MySQL indisponível:', err.message)
  }
}

async function safe(fn) {
  if (!dbReady) return null
  try {
    return await fn()
  } catch (err) {
    console.error('[db]', err.message)
    return null
  }
}

export const db = {
  touchSession: (id) =>
    safe(() =>
      pool.query(
        'INSERT INTO chat_sessions (id) VALUES (?) ON DUPLICATE KEY UPDATE last_seen = NOW()',
        [id],
      ),
    ),

  saveMessage: (sessionId, role, content) =>
    safe(() =>
      pool.query('INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)', [
        sessionId,
        role,
        content.slice(0, 4000),
      ]),
    ),

  /** atualiza só os campos que vieram preenchidos (nunca apaga dado já salvo) */
  upsertLead: (sessionId, { nome, numero, empresa, dor, resumo }) =>
    safe(() =>
      pool.query(
        `INSERT INTO leads (session_id, nome, numero, empresa, dor, resumo)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           nome = COALESCE(VALUES(nome), nome),
           numero = COALESCE(VALUES(numero), numero),
           empresa = COALESCE(VALUES(empresa), empresa),
           dor = COALESCE(VALUES(dor), dor),
           resumo = COALESCE(VALUES(resumo), resumo)`,
        [sessionId, nome || null, numero || null, empresa || null, dor || null, resumo || null],
      ),
    ),

  setWhatsappClicked: (sessionId) =>
    safe(() =>
      pool.query(
        `INSERT INTO leads (session_id, whatsapp_clicked) VALUES (?, 1)
         ON DUPLICATE KEY UPDATE whatsapp_clicked = 1`,
        [sessionId],
      ),
    ),

  saveEvent: (visitorId, type, name) =>
    safe(() =>
      pool.query('INSERT INTO site_events (visitor_id, type, name) VALUES (?, ?, ?)', [
        visitorId || null,
        type,
        name ? String(name).slice(0, 120) : null,
      ]),
    ),

  /** sessões engajadas, inativas há X min e ainda não notificadas */
  sessionsToNotify: (inactiveMinutes) =>
    safe(async () => {
      const [rows] = await pool.query(
        `SELECT s.id FROM chat_sessions s
         LEFT JOIN leads l ON l.session_id = s.id
         WHERE s.notified = 0
           AND s.last_seen < NOW() - INTERVAL ? MINUTE
           AND COALESCE(l.whatsapp_clicked, 0) = 0
           AND (
             (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id AND m.role = 'user') >= 3
             OR l.numero IS NOT NULL
           )
         LIMIT 10`,
        [inactiveMinutes],
      )
      return rows
    }),

  markNotified: (sessionId) =>
    safe(() => pool.query('UPDATE chat_sessions SET notified = 1 WHERE id = ?', [sessionId])),

  transcript: (sessionId) =>
    safe(async () => {
      const [rows] = await pool.query(
        'SELECT role, content, created_at FROM chat_messages WHERE session_id = ? ORDER BY id ASC LIMIT 200',
        [sessionId],
      )
      return rows
    }),

  leadBySession: (sessionId) =>
    safe(async () => {
      const [rows] = await pool.query('SELECT * FROM leads WHERE session_id = ?', [sessionId])
      return rows[0] || null
    }),

  // ---------- consultas do painel admin ----------

  adminStats: (days) =>
    safe(async () => {
      const d = Math.min(Math.max(Number(days) || 30, 1), 365)
      const [[visits]] = await pool.query(
        `SELECT COUNT(*) n FROM site_events WHERE type='visit' AND created_at > NOW() - INTERVAL ? DAY`, [d])
      const [[uniques]] = await pool.query(
        `SELECT COUNT(DISTINCT visitor_id) n FROM site_events WHERE type='visit' AND created_at > NOW() - INTERVAL ? DAY`, [d])
      const [[chats]] = await pool.query(
        `SELECT COUNT(*) n FROM chat_sessions WHERE created_at > NOW() - INTERVAL ? DAY`, [d])
      const [[leadsN]] = await pool.query(
        `SELECT COUNT(*) n FROM leads WHERE (numero IS NOT NULL OR nome IS NOT NULL OR dor IS NOT NULL) AND created_at > NOW() - INTERVAL ? DAY`, [d])
      const [[wa]] = await pool.query(
        `SELECT COUNT(*) n FROM site_events WHERE type='whatsapp_click' AND created_at > NOW() - INTERVAL ? DAY`, [d])
      const [sections] = await pool.query(
        `SELECT name, COUNT(*) n FROM site_events WHERE type='section_view' AND created_at > NOW() - INTERVAL ? DAY GROUP BY name ORDER BY n DESC`, [d])
      const [clicks] = await pool.query(
        `SELECT name, COUNT(*) n FROM site_events WHERE type IN ('click','whatsapp_click') AND created_at > NOW() - INTERVAL ? DAY GROUP BY name ORDER BY n DESC LIMIT 20`, [d])
      const [byDay] = await pool.query(
        `SELECT DATE(created_at) day, COUNT(*) n FROM site_events WHERE type='visit' AND created_at > NOW() - INTERVAL ? DAY GROUP BY day ORDER BY day ASC`, [d])
      return {
        visits: visits.n, uniques: uniques.n, chats: chats.n,
        leads: leadsN.n, waClicks: wa.n, sections, clicks, byDay,
      }
    }),

  adminLeads: (onlyLeads) =>
    safe(async () => {
      const where = onlyLeads
        ? `WHERE l.numero IS NOT NULL OR l.nome IS NOT NULL OR l.dor IS NOT NULL OR l.whatsapp_clicked = 1`
        : ''
      const [rows] = await pool.query(
        `SELECT s.id AS session_id, s.created_at, s.last_seen, s.notified,
                l.nome, l.numero, l.empresa, l.dor, l.resumo, l.whatsapp_clicked,
                (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id) AS msgs
         FROM chat_sessions s
         LEFT JOIN leads l ON l.session_id = s.id
         ${where}
         ORDER BY s.last_seen DESC
         LIMIT 200`,
      )
      return rows
    }),
}
