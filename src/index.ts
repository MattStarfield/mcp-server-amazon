import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { getOrdersHistory } from './orders.js'
import { getCartContent, addToCart, clearCart } from './cart.js'
import { getProductDetails, searchProducts } from './products.js'
import { profileManager } from './config.js'

// Create server instance
const server = new McpServer({
  name: 'amazon',
  version: '2.0.0', // Updated for multi-profile support
})

/**
 * Helper function to check session confirmation and return prompt if needed
 */
function requireSessionConfirmation(): { confirmed: boolean; prompt?: string } {
  if (profileManager.isSessionConfirmed()) {
    return { confirmed: true }
  }
  return {
    confirmed: false,
    prompt: profileManager.getConfirmationPrompt(),
  }
}

// ============================================================================
// PROFILE MANAGEMENT TOOLS (No confirmation required)
// ============================================================================

server.tool(
  'list-profiles',
  'List all available Amazon account profiles and show which one is currently active',
  {},
  async ({}) => {
    const profiles = profileManager.listProfiles()
    const currentProfile = profileManager.getCurrentProfile()
    const sessionConfirmed = profileManager.isSessionConfirmed()

    if (profiles.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No profiles found. Use save-profile to create a new profile.',
          },
        ],
      }
    }

    const profileList = profiles.map(p => {
      const isCurrent = p.name === currentProfile
      const marker = isCurrent ? ' ← ACTIVE' : ''
      return `  • ${p.name}${marker} (${p.cookieCount} cookies, domain: ${p.domain || 'unknown'})`
    }).join('\n')

    return {
      content: [
        {
          type: 'text',
          text: `Available Amazon Profiles:\n${profileList}\n\nSession confirmed: ${sessionConfirmed ? 'Yes ✅' : 'No ⚠️'}`,
        },
      ],
    }
  }
)

server.tool(
  'get-current-profile',
  'Get the name of the currently active Amazon profile',
  {},
  async ({}) => {
    const currentProfile = profileManager.getCurrentProfile()
    const sessionConfirmed = profileManager.isSessionConfirmed()

    return {
      content: [
        {
          type: 'text',
          text: `Current profile: "${currentProfile}"\nSession confirmed: ${sessionConfirmed ? 'Yes ✅' : 'No ⚠️'}`,
        },
      ],
    }
  }
)

server.tool(
  'switch-profile',
  'Switch to a different Amazon account profile',
  {
    profile: z
      .string()
      .min(1)
      .describe('The name of the profile to switch to (e.g., "personal", "work")'),
  },
  async ({ profile }) => {
    const result = profileManager.switchProfile(profile)

    return {
      content: [
        {
          type: 'text',
          text: result.success
            ? `✅ ${result.message}`
            : `❌ ${result.message}`,
        },
      ],
    }
  }
)

server.tool(
  'save-profile',
  'Save Amazon cookies to a named profile. Use this to add a new account or update existing profile cookies.',
  {
    profile: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, 'Profile name must be lowercase alphanumeric with hyphens only')
      .describe('The name for the profile (e.g., "work", "personal", "amazon-uk")'),
    cookies: z
      .string()
      .min(1)
      .describe('The Amazon cookies as a JSON array string (exported from browser cookie editor)'),
  },
  async ({ profile, cookies }) => {
    const result = profileManager.saveProfile(profile, cookies)

    return {
      content: [
        {
          type: 'text',
          text: result.success
            ? `✅ ${result.message}`
            : `❌ ${result.message}`,
        },
      ],
    }
  }
)

server.tool(
  'confirm-profile',
  'Confirm the active profile for this session. Required before performing account-specific operations like viewing cart, adding items, or making purchases.',
  {
    profile: z
      .string()
      .optional()
      .describe('Optional: specify a profile to switch to and confirm in one step'),
  },
  async ({ profile }) => {
    const result = profileManager.confirmSession(profile)

    return {
      content: [
        {
          type: 'text',
          text: result.success
            ? `✅ ${result.message}`
            : `❌ ${result.message}`,
        },
      ],
    }
  }
)

// ============================================================================
// PROFILE-AGNOSTIC TOOLS (No confirmation required - public data)
// ============================================================================

server.tool(
  'search-products',
  'Search for products on Amazon using a search term - Returns a list of products matching the search term - Always provide the product link when you mention a product in the response',
  {
    searchTerm: z
      .string()
      .min(1, { message: 'Search term cannot be empty.' })
      .describe('The search term to look for products on Amazon. For example: "collagen", "laptop", "books"'),
  },
  async ({ searchTerm }) => {
    let result: Awaited<ReturnType<typeof searchProducts>>
    try {
      result = await searchProducts(searchTerm)
    } catch (error: any) {
      console.error('[ERROR][search-products] Error in search-products tool:', error)
      return {
        content: [
          {
            type: 'text',
            text: `An error occurred while searching for products. Error: ${error.message}`,
          },
        ],
      }
    }

    if (!result || result.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No products found for search term "${searchTerm}".`,
          },
        ],
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  }
)

server.tool(
  'get-product-details',
  'Get detailed information about a product using its ASIN - Always provide the product link when you mention a product in the response',
  {
    asin: z
      .string()
      .length(10, { message: 'ASIN must be a 10-character string.' })
      .describe('The ASIN (Amazon Standard Identification Number) of the product to get details for. Must be a 10-character string.'),
  },
  async ({ asin }) => {
    let result: Awaited<ReturnType<typeof getProductDetails>>
    try {
      result = await getProductDetails(asin)
    } catch (error: any) {
      console.error('[ERROR][get-product-details] Error in get-product-details tool:', error)
      return {
        content: [
          {
            type: 'text',
            text: `An error occurred while retrieving product details. Error: ${error.message}`,
          },
        ],
      }
    }

    return {
      content: result.mainImageBase64
        ? [
            {
              type: 'text',
              text: JSON.stringify(result.data, null, 2),
            },
            {
              type: 'image',
              data: result.mainImageBase64,
              mimeType: 'image/jpeg',
            },
          ]
        : [
            {
              type: 'text',
              text: JSON.stringify(result.data, null, 2),
            },
          ],
    }
  }
)

// ============================================================================
// ACCOUNT-SPECIFIC TOOLS (Require session confirmation)
// ============================================================================

server.tool(
  'get-cart-content',
  'Get the current cart content for a user - Always provide the product link when you mention a product in the response',
  {},
  async ({}) => {
    // Check session confirmation
    const confirmation = requireSessionConfirmation()
    if (!confirmation.confirmed) {
      return {
        content: [
          {
            type: 'text',
            text: confirmation.prompt!,
          },
        ],
      }
    }

    let cartContent: Awaited<ReturnType<typeof getCartContent>>
    try {
      cartContent = await getCartContent()
    } catch (error: any) {
      console.error('[ERROR][get-cart-content] Error in get-cart-content tool:', error)
      return {
        content: [
          {
            type: 'text',
            text: `An error occurred while retrieving cart content. Error: ${error.message}`,
          },
        ],
      }
    }

    if (cartContent.isEmpty) {
      return {
        content: [
          {
            type: 'text',
            text: `Your Amazon cart is empty. (Profile: ${profileManager.getCurrentProfile()})`,
          },
        ],
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `Cart content for profile "${profileManager.getCurrentProfile()}":\n${JSON.stringify(cartContent, null, 2)}`,
        },
      ],
    }
  }
)

server.tool(
  'add-to-cart',
  'Add a product to the Amazon cart using ASIN - You should always ask for confirmation to the user before running this tool',
  {
    asin: z
      .string()
      .length(10, { message: 'ASIN must be a 10-character string.' })
      .describe('The ASIN (Amazon Standard Identification Number) of the product to add to cart. Must be a 10-character string.'),
  },
  async ({ asin }) => {
    // Check session confirmation
    const confirmation = requireSessionConfirmation()
    if (!confirmation.confirmed) {
      return {
        content: [
          {
            type: 'text',
            text: confirmation.prompt!,
          },
        ],
      }
    }

    let result: Awaited<ReturnType<typeof addToCart>>
    try {
      result = await addToCart(asin)
    } catch (error: any) {
      console.error('[ERROR][add-to-cart] Error in add-to-cart tool:', error)
      return {
        content: [
          {
            type: 'text',
            text: `An error occurred while adding product to cart. Error: ${error.message}`,
          },
        ],
      }
    }

    const profileNote = `(Profile: ${profileManager.getCurrentProfile()})`
    return {
      content: [
        {
          type: 'text',
          text: result.success
            ? `✅ ${result.message} ${profileNote}`
            : `❌ Failed to add product to cart: ${result.message} ${profileNote}`,
        },
      ],
    }
  }
)

server.tool(
  'clear-cart',
  'Clear all items from the Amazon cart',
  {},
  async ({}) => {
    // Check session confirmation
    const confirmation = requireSessionConfirmation()
    if (!confirmation.confirmed) {
      return {
        content: [
          {
            type: 'text',
            text: confirmation.prompt!,
          },
        ],
      }
    }

    let result: Awaited<ReturnType<typeof clearCart>>
    try {
      result = await clearCart()
    } catch (error: any) {
      console.error('[ERROR][clear-cart] Error in clear-cart tool:', error)
      return {
        content: [
          {
            type: 'text',
            text: `An error occurred while clearing the cart. Error: ${error.message}`,
          },
        ],
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `${result.message} (Profile: ${profileManager.getCurrentProfile()})`,
        },
      ],
    }
  }
)

server.tool(
  'get-orders-history',
  'Get orders history for a user',
  {},
  async ({}) => {
    // Check session confirmation
    const confirmation = requireSessionConfirmation()
    if (!confirmation.confirmed) {
      return {
        content: [
          {
            type: 'text',
            text: confirmation.prompt!,
          },
        ],
      }
    }

    let ordersHistory: Awaited<ReturnType<typeof getOrdersHistory>>
    try {
      ordersHistory = await getOrdersHistory()
    } catch (error: any) {
      console.error('[ERROR][get-orders-history] Error in get-orders-history tool:', error)
      return {
        content: [
          {
            type: 'text',
            text: `An error occurred while retrieving orders history. Error: ${error.message}`,
          },
        ],
      }
    }

    if (!ordersHistory || ordersHistory.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No orders found. (Profile: ${profileManager.getCurrentProfile()})`,
          },
        ],
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `Orders history for profile "${profileManager.getCurrentProfile()}":\n${JSON.stringify(ordersHistory, null, 2)}`,
        },
      ],
    }
  }
)

server.tool(
  'perform-purchase',
  'Checkout with the current cart and complete the purchase - ' +
    'Before purchasing, you should verify in the cart content that your are not buying another product that was already there. ' +
    'If there are other products, clear the cart then add the items that the user want to buy again to the cart. ' +
    'Eventually you can purchase. ' +
    'You should always ask for confirmation to the user before running this tool',
  {},
  async ({}) => {
    // Check session confirmation
    const confirmation = requireSessionConfirmation()
    if (!confirmation.confirmed) {
      return {
        content: [
          {
            type: 'text',
            text: confirmation.prompt!,
          },
        ],
      }
    }

    // Mock the purchase confirmation for demonstration purposes
    return {
      content: [
        {
          type: 'text',
          text: `✅ Purchase confirmed! You can now consult your orders history to see the details of your latest purchase. (Profile: ${profileManager.getCurrentProfile()})`,
        },
      ],
    }
  }
)

// Start the server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[INFO] Amazon MCP Server v2.0.0 (Multi-Profile) running on stdio')
  console.error(`[INFO] Default profile: ${profileManager.getCurrentProfile()}`)
}

main().catch(error => {
  console.error('[ERROR] Fatal error in main():', error)
  process.exit(1)
})
