import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const API_URL = process.env.VITE_API_URL ?? 'http://localhost:8000/api'
const API_SERVER_URL = API_URL.replace(/\/api\/?$/, '')
const APP_URL = process.env.APP_URL ?? 'http://localhost:5173'
const PASSWORD = 'password123'
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

async function isHealthy(url) {
  return fetch(url).then((response) => response.ok).catch(() => false)
}

if (!(await isHealthy(`${API_SERVER_URL}/health`))) {
  throw new Error(`Backend is not reachable at ${API_URL}. Start the API and database first.`)
}

let server
if (await isHealthy(APP_URL)) {
  console.log(`Reusing the dev server at ${APP_URL}`)
} else {
  if (APP_URL !== 'http://localhost:5173') {
    throw new Error(`Application is not reachable at ${APP_URL}. Start that deployment first.`)
  }
  server = await createServer({
    configFile: './vite.config.js',
    logLevel: 'error',
    server: { port: 5173, strictPort: true },
  })
  await server.listen()
  console.log(`Started Vite at ${APP_URL}`)
}

const browser = await chromium.launch()

try {
  const context = await browser.newContext()
  const page = await context.newPage()
  const email = `e2e-${stamp}@example.com`
  let listRequests = 0
  page.on('request', (request) => {
    if (request.method() === 'GET' && /\/api\/v1\/notes$/.test(request.url())) {
      listRequests += 1
    }
  })

  await page.goto(APP_URL)
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Create my account' }).click()
  await page.getByRole('heading', { name: 'Your notes' }).waitFor()
  await page.getByRole('heading', { name: 'No notes yet' }).waitFor()
  assert.ok(listRequests >= 1 && listRequests <= 2, 'initial load should fetch notes, at most twice in React StrictMode dev')
  const initialListRequests = listRequests
  console.log('1. Registration, login, CORS, and initial empty list OK')

  await page.getByRole('button', { name: 'New note' }).click()
  await page.getByLabel('Title').fill('First note')
  await page.getByLabel('Body').fill('first body')
  await page.getByRole('button', { name: 'Create note' }).click()
  await page.getByRole('heading', { name: 'First note' }).waitFor()
  assert.equal(listRequests, initialListRequests, 'create must update state without refetching notes')

  await page.getByRole('button', { name: 'New note' }).click()
  await page.getByLabel('Title').fill('Second note')
  await page.getByLabel('Body').fill('second body')
  await page.getByRole('button', { name: 'Create note' }).click()
  await page.getByRole('heading', { name: 'Second note' }).waitFor()
  assert.equal(listRequests, initialListRequests, 'second create must update state without refetching notes')
  console.log('2. Create ×2 against the real API OK')

  const firstCard = page.locator('.note-card', { hasText: 'First note' })
  await firstCard.getByRole('button', { name: 'Edit' }).click()
  assert.equal(await page.getByLabel('Title').inputValue(), 'First note')
  assert.equal(await page.getByLabel('Body').inputValue(), 'first body')
  await page.getByLabel('Title').fill('First note, edited')
  await page.getByLabel('Body').fill('edited body')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.getByRole('heading', { name: 'First note, edited' }).waitFor()
  assert.equal(listRequests, initialListRequests, 'update must replace state without refetching notes')
  console.log('3. Edit pre-fill and immediate in-state update OK')

  await page.locator('.note-card', { hasText: 'Second note' }).getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('alertdialog', { name: 'Delete this note?' }).getByRole('button', { name: 'Delete note' }).click()
  await page.getByRole('heading', { name: 'Second note' }).waitFor({ state: 'detached' })
  assert.equal(listRequests, initialListRequests, 'delete must filter state without refetching notes')
  console.log('4. Confirmed delete and immediate in-state removal OK')

  const stalePage = await context.newPage()
  await stalePage.goto(APP_URL)
  await stalePage.getByRole('heading', { name: 'First note, edited' }).waitFor()
  await stalePage.getByRole('button', { name: 'Sign out' }).count()
  await stalePage.locator('.note-card', { hasText: 'First note, edited' }).getByRole('button', { name: 'Delete' }).click()
  await stalePage.getByRole('button', { name: 'Delete note' }).click()
  await stalePage.getByRole('heading', { name: 'First note, edited' }).waitFor({ state: 'detached' })

  await page.locator('.note-card', { hasText: 'First note, edited' }).getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete note' }).click()
  await page.getByText('Not found (404): Note not found').waitFor()
  console.log('5. Genuine stale-client 404 is visible and handled OK')

  await page.reload()
  await page.getByRole('heading', { name: 'Your notes' }).waitFor()
  assert.ok(await page.getByText('0 notes').isVisible())
  console.log('6. JWT session persists across reload OK')

  await page.evaluate(() => localStorage.setItem('notes_token', 'corrupted-token'))
  await page.reload()
  await page.getByText('Your session has expired. Please log in again.').waitFor()
  await page.getByRole('button', { name: 'Sign in to Notes' }).waitFor()
  console.log('7. Genuine 401 expires the client session safely OK')

  console.log('\nALL BROWSER E2E CHECKS PASSED')
} finally {
  await browser.close()
  if (server) await server.close()
}
