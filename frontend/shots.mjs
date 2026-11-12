import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const URL = 'http://localhost:5183/'
const OUT = 'shots'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
})

const errors = []

async function shot(name, { width, height, theme, page: pageName, act }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  })
  const p = await ctx.newPage()
  p.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[${name}] console: ${m.text()}`)
  })
  p.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}`))

  await p.goto(URL, { waitUntil: 'networkidle' })

  // App boots in dark; click the toggle to reach light.
  if (theme === 'light') await p.click('.theme-toggle')
  if (pageName) await p.click(`.main-nav button:text-is("${pageName}")`)
  if (act) await act(p)

  // Let fonts settle and entrance animations finish.
  await p.waitForTimeout(700)
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: !act })

  // Report the live value of a few tokens + a contrast-critical computed colour.
  const probe = await p.evaluate(() => {
    const app = document.querySelector('.store-app')
    const s = getComputedStyle(app)
    const h1 = document.querySelector('h1')
    return {
      themeClass: app.className,
      page: s.getPropertyValue('--page').trim(),
      ink: s.getPropertyValue('--ink').trim(),
      headingColor: h1 ? getComputedStyle(h1).color : null,
      font: getComputedStyle(document.body).fontFamily,
      docOverflowX:
        document.documentElement.scrollWidth > window.innerWidth + 1
          ? `OVERFLOW ${document.documentElement.scrollWidth}>${window.innerWidth}`
          : 'ok',
    }
  })
  console.log(name.padEnd(26), JSON.stringify(probe))

  await ctx.close()
}

const DESK = { width: 1440, height: 1000 }
const MOB = { width: 390, height: 844 }

for (const theme of ['dark', 'light']) {
  for (const [label, pageName] of [
    ['home', null],
    ['shop', 'Shop'],
    ['about', 'About'],
    ['contact', 'Contact'],
  ]) {
    await shot(`desktop-${theme}-${label}`, { ...DESK, theme, page: pageName })
  }
}

// Mobile
for (const theme of ['dark', 'light']) {
  await shot(`mobile-${theme}-home`, { ...MOB, theme })
  await shot(`mobile-${theme}-shop`, { ...MOB, theme, page: 'Shop' })
}

// Overlays: cart drawer with items + coupon applied, and the product modal.
const fillCart = async (p) => {
  await p.click('.main-nav button:text-is("Shop")')
  const adds = p.locator('.add-button')
  await adds.nth(0).click()
  await adds.nth(1).click()
  await adds.nth(2).click()
  await p.click('.cart-button')
  await p.fill('.cart-coupon-input', 'RAACASE10')
  await p.click('.cart-coupon-button')
}
const openModal = async (p) => {
  await p.click('.main-nav button:text-is("Shop")')
  await p.click('.product-card')
}
const emptyCart = async (p) => p.click('.cart-button')

await shot('desktop-dark-cart', { ...DESK, theme: 'dark', act: fillCart })
await shot('desktop-light-cart', { ...DESK, theme: 'light', act: fillCart })
await shot('desktop-dark-cart-empty', { ...DESK, theme: 'dark', act: emptyCart })
await shot('desktop-dark-modal', { ...DESK, theme: 'dark', act: openModal })
await shot('desktop-light-modal', { ...DESK, theme: 'light', act: openModal })
await shot('mobile-dark-cart', { ...MOB, theme: 'dark', act: fillCart })
await shot('mobile-light-modal', { ...MOB, theme: 'light', act: openModal })

await browser.close()

console.log('\n--- console/page errors ---')
console.log(errors.length ? errors.join('\n') : 'none')
