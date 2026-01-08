import fs from 'fs'
import puppeteer from 'puppeteer'
import { IS_BROWSER_VISIBLE, getAmazonCookies } from './config.js'

/** Get the current timestamp like "2024-06-06_15-30-45" */
export function getTimestamp() {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(
    now.getSeconds()
  )}`
}

export async function createBrowserAndPage(): Promise<{ browser: puppeteer.Browser; page: puppeteer.Page }> {
  // Launch Puppeteer with system Chromium (required for ARM64/Raspberry Pi)
  const browser = await puppeteer.launch({
    headless: !IS_BROWSER_VISIBLE,
    devtools: false,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--disable-blink-features=AutomationControlled', '--disable-gpu'],
    ignoreDefaultArgs: ['--enable-automation'],
    defaultViewport: null,
  })

  // Get cookies from current profile (dynamic)
  const cookies = getAmazonCookies()

  // Set cookies if available
  if (cookies?.length > 0) {
    await browser.setCookie(...cookies)
    console.error('[INFO] Set Amazon cookies in the browser')
  } else {
    console.error('[WARN] No Amazon cookies found, proceeding without them')
  }

  const page = await browser.newPage()

  // Remove automation indicators
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    })
  })

  // Set user agent to match real browser
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
  )

  // Set viewport
  await page.setViewport({ width: 1366, height: 768 })

  return { browser, page }
}

export async function downloadImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const b64 = buffer.toString('base64')
  return `${b64}`
}

export async function throwIfNotLoggedIn(page: puppeteer.Page): Promise<void> {
  const isLoginPage = (await page.$('#ap_email')) !== null || (await page.$('#signInSubmit')) !== null
  if (isLoginPage) {
    throw new Error('You need to be logged in to access this feature. Please log in to Amazon first and then try again.')
  }
}
