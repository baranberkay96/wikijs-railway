// Wiki.js pre-deploy step for Railway (runs before every deploy).
//
// On a fresh database Wiki.js 2 opens a setup wizard that lets the first visitor
// create the administrator. This step finishes that wizard from variables inside
// the pre-deploy container (no public traffic reaches it), so the public
// deployment never serves the wizard (STANDARD 8.37):
//   1. wait for Postgres,
//   2. if Wiki.js has no settings yet: start it on a private port, POST /finalize
//      with the admin from WIKI_ADMIN_EMAIL / WIKI_ADMIN_PASSWORD, stop it,
//   3. unless WIKI_GUEST_ACCESS=true, remove the Guests group's read rights so
//      the new wiki is private until the admin opens it up.
'use strict'
const { spawn } = require('child_process')
const crypto = require('crypto')
const net = require('net')
const { Client } = require('/wiki/node_modules/pg')

const env = process.env
const log = msg => console.log(`[railway] ${msg}`)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const BOOT_PORT = '3999'
const MIN_PASSWORD = 12

function tcpReady (host, port) {
  return new Promise(resolve => {
    const socket = net.connect({ host, port, timeout: 3000 })
    const done = ok => { socket.destroy(); resolve(ok) }
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
  })
}

async function waitForPostgres (limitMs) {
  const host = env.DB_HOST
  const port = Number(env.DB_PORT || 5432)
  const end = Date.now() + limitMs
  for (let i = 0; Date.now() < end; i++) {
    if (await tcpReady(host, port)) { log('Postgres reachable'); return true }
    if (i % 6 === 0) log(`waiting for Postgres (${host}:${port})...`)
    await sleep(5000)
  }
  log(`ERROR: Postgres not reachable after ${limitMs / 1000} s`)
  return false
}

function db () {
  return new Client({
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 5432),
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_NAME,
    connectionTimeoutMillis: 10000
  })
}

async function query (sql, params) {
  const client = db()
  await client.connect()
  try {
    return (await client.query(sql, params)).rows
  } finally {
    await client.end()
  }
}

async function setupDone () {
  const rows = await query("SELECT to_regclass('public.settings') IS NOT NULL AS present")
  if (!rows[0].present) return false
  const count = await query("SELECT count(*)::int AS n FROM settings WHERE key = 'host'")
  return count[0].n > 0
}

function adminValues () {
  let siteUrl = (env.WIKI_SITE_URL || '').trim().replace(/\/+$/, '')
  if (!/^https?:\/\/[^\s/]+/.test(siteUrl)) {
    siteUrl = `https://${env.RAILWAY_PUBLIC_DOMAIN || 'localhost'}`
    log(`WIKI_SITE_URL is not a URL; using ${siteUrl}`)
  }
  let email = (env.WIKI_ADMIN_EMAIL || '').trim().toLowerCase()
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) {
    log(`WARNING: WIKI_ADMIN_EMAIL '${email}' is not an e-mail address; using admin@example.com`)
    email = 'admin@example.com'
  }
  let password = env.WIKI_ADMIN_PASSWORD || ''
  if (password.length < MIN_PASSWORD) {
    log(`WARNING: WIKI_ADMIN_PASSWORD is shorter than ${MIN_PASSWORD} characters. The admin login is locked with`)
    log('         a random password; reset it with the steps in the README (Admin password section).')
    password = crypto.randomBytes(24).toString('base64url')
  }
  return { adminEmail: email, adminPassword: password, adminPasswordConfirm: password, siteUrl, telemetry: false }
}

async function finishSetup () {
  const values = adminValues()
  log(`fresh database: starting Wiki.js on private port ${BOOT_PORT} to finish the setup wizard`)
  const child = spawn('node', ['--no-deprecation', 'server'], {
    cwd: '/wiki',
    env: { ...env, PORT: BOOT_PORT },
    stdio: ['ignore', 'inherit', 'inherit'],
    detached: true
  })
  let exited = false
  child.once('exit', code => { exited = true; log(`temporary Wiki.js exited (${code})`) })
  const stop = async () => {
    if (exited) return
    try { process.kill(-child.pid, 'SIGTERM') } catch (err) { /* gone */ }
    for (let i = 0; i < 20 && !exited; i++) await sleep(1000)
    if (!exited) try { process.kill(-child.pid, 'SIGKILL') } catch (err) { /* gone */ }
  }
  try {
    const base = `http://127.0.0.1:${BOOT_PORT}`
    const end = Date.now() + 10 * 60 * 1000
    let up = false
    while (!exited && Date.now() < end) {
      try {
        const res = await fetch(`${base}/`, { signal: AbortSignal.timeout(5000) })
        if (res.ok) { up = true; break }
      } catch (err) { /* not up yet */ }
      await sleep(2000)
    }
    if (!up) { log('ERROR: the temporary Wiki.js did not start'); return false }
    const res = await fetch(`${base}/finalize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
      signal: AbortSignal.timeout(180000)
    })
    const body = await res.json().catch(() => ({}))
    if (!body.ok) { log(`ERROR: setup failed: ${String(body.error || res.status).slice(0, 300)}`); return false }
    log(`setup finished; admin ${values.adminEmail}, site URL ${values.siteUrl}`)
    await sleep(3000)
    return true
  } finally {
    await stop()
  }
}

async function lockGuests () {
  if (/^(1|true|yes|on)$/i.test(env.WIKI_GUEST_ACCESS || '')) {
    log('WIKI_GUEST_ACCESS=true: guests keep read access (Wiki.js default)')
    return
  }
  const rows = await query(
    `UPDATE groups SET permissions = '[]', "pageRules" = '[]'
       WHERE id = 2 AND "isSystem" = true RETURNING name`)
  log(rows.length ? `guests have no access (sign-in required); change it under Administration > Groups > ${rows[0].name}`
    : 'WARNING: guest group not found; check Administration > Groups')
}

async function main () {
  if (!await waitForPostgres(15 * 60 * 1000)) return false
  if (await setupDone()) {
    log('Wiki.js is already set up; nothing to do')
    return true
  }
  if (!await finishSetup()) return false
  await lockGuests()
  return true
}

main().then(ok => process.exit(ok ? 0 : 1), err => {
  log(`ERROR: ${err.message}`)
  process.exit(1)
})
