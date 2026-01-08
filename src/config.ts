import { profileManager, AmazonCookie } from './profileManager.js'

export const IS_BROWSER_VISIBLE = false

/** Use local mock files instead of live scraping */
export const USE_MOCKS = false

/** Export live scraping HTML to mocks for future use */
export const EXPORT_LIVE_SCRAPING_FOR_MOCKS = true

/**
 * Get the current profile's Amazon cookies
 * This is now dynamic and returns cookies from the active profile
 */
export function getAmazonCookies(): AmazonCookie[] {
  return profileManager.getCurrentCookies()
}

/**
 * Extract the Amazon domain from current profile's cookies
 * Returns the domain without the leading dot (e.g., "amazon.com", "amazon.co.uk", "amazon.de")
 */
export function getAmazonDomain(): string {
  return profileManager.getAmazonDomain()
}

// Re-export profileManager for use in other modules
export { profileManager }
