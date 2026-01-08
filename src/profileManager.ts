import fs from 'fs'
import path from 'path'

const __dirname = new URL('.', import.meta.url).pathname

export interface AmazonCookie {
  domain: string
  expirationDate?: number
  hostOnly?: boolean
  httpOnly?: boolean
  name: string
  path: string
  sameSite?: 'Strict' | 'Lax' | 'None'
  secure?: boolean
  session?: boolean
  storeId?: string | null
  value: string
}

export interface ProfileInfo {
  name: string
  cookieCount: number
  domain: string | null
}

/**
 * ProfileManager handles multiple Amazon account profiles with runtime switching
 * and session confirmation for account-specific operations.
 */
class ProfileManager {
  private profilesDir: string
  private legacyCookiesPath: string
  private currentProfile: string = 'personal'
  private currentCookies: AmazonCookie[] = []
  private sessionConfirmed: boolean = false

  constructor() {
    this.profilesDir = path.join(__dirname, '..', 'profiles')
    this.legacyCookiesPath = path.join(__dirname, '..', 'amazonCookies.json')
    this.initializeProfiles()
  }

  /**
   * Initialize profiles directory and load default profile
   */
  private initializeProfiles(): void {
    // Create profiles directory if it doesn't exist
    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true })
      console.error('[INFO] Created profiles directory')
    }

    // Migrate legacy amazonCookies.json to profiles/personal.json if needed
    const personalProfilePath = path.join(this.profilesDir, 'personal.json')
    if (fs.existsSync(this.legacyCookiesPath) && !fs.existsSync(personalProfilePath)) {
      try {
        const legacyCookies = fs.readFileSync(this.legacyCookiesPath, 'utf-8')
        fs.writeFileSync(personalProfilePath, legacyCookies)
        console.error('[INFO] Migrated legacy amazonCookies.json to profiles/personal.json')
      } catch (error: any) {
        console.error(`[WARN] Failed to migrate legacy cookies: ${error.message}`)
      }
    }

    // Load default profile
    this.loadProfile('personal')
  }

  /**
   * Get list of available profiles
   */
  listProfiles(): ProfileInfo[] {
    const profiles: ProfileInfo[] = []

    if (!fs.existsSync(this.profilesDir)) {
      return profiles
    }

    const files = fs.readdirSync(this.profilesDir)
    for (const file of files) {
      if (file.endsWith('.json')) {
        const profileName = file.replace('.json', '')
        const profilePath = path.join(this.profilesDir, file)
        try {
          const cookies = JSON.parse(fs.readFileSync(profilePath, 'utf-8')) as AmazonCookie[]
          const domain = this.extractDomain(cookies)
          profiles.push({
            name: profileName,
            cookieCount: cookies.length,
            domain: domain,
          })
        } catch (error) {
          profiles.push({
            name: profileName,
            cookieCount: 0,
            domain: null,
          })
        }
      }
    }

    return profiles
  }

  /**
   * Get the current active profile name
   */
  getCurrentProfile(): string {
    return this.currentProfile
  }

  /**
   * Get the current profile's cookies
   */
  getCurrentCookies(): AmazonCookie[] {
    return this.currentCookies
  }

  /**
   * Check if session is confirmed
   */
  isSessionConfirmed(): boolean {
    return this.sessionConfirmed
  }

  /**
   * Confirm the current session for account-specific operations
   */
  confirmSession(profileName?: string): { success: boolean; message: string; profile: string } {
    // If a profile name is provided, switch to it first
    if (profileName && profileName !== this.currentProfile) {
      const switchResult = this.switchProfile(profileName)
      if (!switchResult.success) {
        return switchResult
      }
    }

    this.sessionConfirmed = true
    console.error(`[INFO] Session confirmed for profile: ${this.currentProfile}`)
    return {
      success: true,
      message: `Session confirmed for profile "${this.currentProfile}". You can now perform account-specific operations.`,
      profile: this.currentProfile,
    }
  }

  /**
   * Get confirmation prompt message for when session is not confirmed
   * Returns a structured JSON object that Claude can recognize and present as AskUserQuestion modal
   */
  getConfirmationPrompt(): string {
    const profiles = this.listProfiles()
    const profileNames = profiles.map(p => p.name)

    // Return structured JSON for Claude to parse and present as AskUserQuestion modal
    const confirmationData = {
      type: 'AMAZON_PROFILE_CONFIRMATION_REQUIRED',
      currentProfile: this.currentProfile,
      availableProfiles: profileNames,
      question: `Which Amazon account should be used for this operation?`,
      options: profileNames.map(name => ({
        label: name === this.currentProfile ? `${name} (current)` : name,
        value: name,
        description: name === this.currentProfile
          ? 'Continue with the currently active profile'
          : `Switch to the ${name} profile`
      }))
    }

    return JSON.stringify(confirmationData)
  }

  /**
   * Load a profile's cookies
   */
  private loadProfile(profileName: string): boolean {
    const profilePath = path.join(this.profilesDir, `${profileName}.json`)

    // Try profiles directory first
    if (fs.existsSync(profilePath)) {
      try {
        const json = JSON.parse(fs.readFileSync(profilePath, 'utf-8'))
        this.currentCookies = this.normalizeCookies(json)
        this.currentProfile = profileName
        console.error(`[INFO] Loaded profile: ${profileName} (${this.currentCookies.length} cookies)`)
        return true
      } catch (error: any) {
        console.error(`[ERROR] Failed to load profile ${profileName}: ${error.message}`)
        return false
      }
    }

    // Fall back to legacy amazonCookies.json for 'personal' profile
    if (profileName === 'personal' && fs.existsSync(this.legacyCookiesPath)) {
      try {
        const json = JSON.parse(fs.readFileSync(this.legacyCookiesPath, 'utf-8'))
        this.currentCookies = this.normalizeCookies(json)
        this.currentProfile = profileName
        console.error(`[INFO] Loaded profile from legacy path: ${profileName}`)
        return true
      } catch (error: any) {
        console.error(`[ERROR] Failed to load legacy cookies: ${error.message}`)
        return false
      }
    }

    console.error(`[WARN] Profile not found: ${profileName}`)
    return false
  }

  /**
   * Switch to a different profile
   */
  switchProfile(profileName: string): { success: boolean; message: string; profile: string } {
    // Validate profile name
    if (!this.isValidProfileName(profileName)) {
      return {
        success: false,
        message: `Invalid profile name "${profileName}". Profile names must be lowercase alphanumeric with hyphens only.`,
        profile: this.currentProfile,
      }
    }

    // Check if profile exists
    const profilePath = path.join(this.profilesDir, `${profileName}.json`)
    if (!fs.existsSync(profilePath)) {
      const profiles = this.listProfiles()
      const available = profiles.map(p => p.name).join(', ')
      return {
        success: false,
        message: `Profile "${profileName}" not found. Available profiles: ${available}`,
        profile: this.currentProfile,
      }
    }

    // Load the profile
    if (this.loadProfile(profileName)) {
      // Reset session confirmation when switching profiles for safety
      // This ensures users must confirm before account-specific operations on the new profile
      this.sessionConfirmed = false
      return {
        success: true,
        message: `Switched to profile "${profileName}" (${this.currentCookies.length} cookies loaded). ⚠️ Session confirmation required for account-specific operations.`,
        profile: this.currentProfile,
      }
    }

    return {
      success: false,
      message: `Failed to load profile "${profileName}"`,
      profile: this.currentProfile,
    }
  }

  /**
   * Save cookies to a named profile
   */
  saveProfile(profileName: string, cookiesJson: string): { success: boolean; message: string } {
    // Validate profile name
    if (!this.isValidProfileName(profileName)) {
      return {
        success: false,
        message: `Invalid profile name "${profileName}". Profile names must be lowercase alphanumeric with hyphens only.`,
      }
    }

    // Parse and validate cookies JSON
    let cookies: AmazonCookie[]
    try {
      cookies = JSON.parse(cookiesJson)
      if (!Array.isArray(cookies)) {
        throw new Error('Cookies must be a JSON array')
      }
      if (cookies.length === 0) {
        throw new Error('Cookies array is empty')
      }
      // Basic validation - check required fields
      for (const cookie of cookies) {
        if (!cookie.name || !cookie.value || !cookie.domain) {
          throw new Error('Each cookie must have name, value, and domain fields')
        }
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Invalid cookies JSON: ${error.message}`,
      }
    }

    // Ensure profiles directory exists
    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true })
    }

    // Save to file
    const profilePath = path.join(this.profilesDir, `${profileName}.json`)
    try {
      fs.writeFileSync(profilePath, JSON.stringify(cookies, null, 2))
      console.error(`[INFO] Saved profile: ${profileName} (${cookies.length} cookies)`)
      return {
        success: true,
        message: `Profile "${profileName}" saved successfully with ${cookies.length} cookies. Use "switch to ${profileName}" to activate it.`,
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to save profile: ${error.message}`,
      }
    }
  }

  /**
   * Validate profile name format
   */
  private isValidProfileName(name: string): boolean {
    return /^[a-z0-9-]+$/.test(name)
  }

  /**
   * Normalize cookies to ensure sameSite has valid value
   */
  private normalizeCookies(cookies: any[]): AmazonCookie[] {
    return cookies.map((cookie: any) => {
      // Handle sameSite - convert null/invalid to valid values
      let sameSite: 'Strict' | 'Lax' | 'None' | undefined = undefined
      if (cookie.sameSite === 'Strict' || cookie.sameSite === 'Lax' || cookie.sameSite === 'None') {
        sameSite = cookie.sameSite
      } else if (cookie.sameSite === 'no_restriction') {
        sameSite = 'None'
      }

      return {
        domain: cookie.domain,
        name: cookie.name,
        value: cookie.value,
        path: cookie.path,
        expirationDate: cookie.expirationDate,
        hostOnly: cookie.hostOnly,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        session: cookie.session,
        sameSite,
      }
    })
  }

  /**
   * Extract Amazon domain from cookies
   */
  private extractDomain(cookies: AmazonCookie[]): string | null {
    const amazonCookie = cookies.find(cookie =>
      cookie.domain && cookie.domain.includes('amazon')
    )
    if (amazonCookie) {
      let domain = amazonCookie.domain
      if (domain.startsWith('.')) {
        domain = domain.substring(1)
      }
      return domain
    }
    return null
  }

  /**
   * Get the Amazon domain from current profile's cookies
   */
  getAmazonDomain(): string {
    if (this.currentCookies.length === 0) {
      console.error('[WARN] No cookies loaded, using default amazon.com domain')
      return 'amazon.com'
    }

    const domain = this.extractDomain(this.currentCookies)
    if (domain) {
      console.error(`[INFO] Detected Amazon domain: ${domain}`)
      return domain
    }

    console.error('[WARN] Could not detect Amazon domain, using default amazon.com')
    return 'amazon.com'
  }
}

// Export singleton instance
export const profileManager = new ProfileManager()
