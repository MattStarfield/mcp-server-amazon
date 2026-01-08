# Amazon MCP Server (Customized Fork)

This is a customized fork of [rigwild/mcp-server-amazon](https://github.com/rigwild/mcp-server-amazon) with enhanced features for multi-profile support, session confirmation gates, and ARM64 (Raspberry Pi) compatibility.

This server allows you to interact with Amazon's services using the MCP (Model Context Protocol) framework. This lets you use your Amazon account through ChatGPT or Claude AI interfaces.

## Fork Customizations

This fork extends the original server with the following enhancements:

| Feature | Description |
|---------|-------------|
| **Multi-Profile Support** | Manage multiple Amazon accounts (personal, work, etc.) with runtime switching |
| **Session Confirmation Gate** | Safety feature requiring explicit profile confirmation before account-specific operations |
| **Per-Profile Confirmation** | Switching profiles resets confirmation, preventing accidental operations on wrong account |
| **AskUserQuestion Modal** | Returns structured JSON for Claude Code's modal UI instead of text prompts |
| **ARM64 Compatibility** | Uses system Chromium for Raspberry Pi and other ARM64 systems |
| **Cookie Type Normalization** | Handles edge cases in browser-exported cookies (sameSite, null values) |

### Original Repository

- **Author**: [rigwild](https://github.com/rigwild)
- **Repository**: [rigwild/mcp-server-amazon](https://github.com/rigwild/mcp-server-amazon)
- **License**: MIT

### Files Added/Modified

| File | Status | Description |
|------|--------|-------------|
| `src/profileManager.ts` | **NEW** | Profile management with session confirmation logic |
| `src/config.ts` | Modified | Refactored to use ProfileManager for dynamic cookie loading |
| `src/utils.ts` | Modified | ARM64 Chromium support, dynamic cookie injection |
| `src/index.ts` | Modified | Added 5 new MCP tools, confirmation gates on account-specific tools |
| `profiles/` | **NEW** | Directory for profile JSON files |

## Features

- **Product search**: Search for products on Amazon
- **Product details**: Retrieve detailed information about a specific product on Amazon
- **Cart management**: Add items or clear your Amazon cart
- **Ordering**: Place orders (fake for demonstration purposes)
- **Orders history**: Retrieve your recent Amazon orders details
- **Multi-Profile Support**: Manage multiple Amazon accounts (personal, work, etc.) with runtime switching
- **Session Confirmation**: Safety gate requiring profile confirmation before account-specific operations

## Demo

Simple demo, showcasing a quick product search and purchase.

![Demo GIF video](./demo.gif)

## Full Demo

Another more complex demo with products search, leveraging Claude AI recommendations to compare and make a decision, then purchase.

It showcases how natural and powerful the Amazon MCP integration could be inside a conversation

Video: https://www.youtube.com/watch?v=xas2CLkJDYg

## Install

Install dependencies

```sh
npm install -D
```

Build the project

```sh
npm run build
```

## Claude Desktop Integration

Create or update `~/Library/Application Support/Claude/claude_desktop_config.json` with the path to the MCP server.

```json
{
  "mcpServers": {
    "amazon": {
      "command": "node",
      "args": ["/Users/admin/dev/mcp-server-amazon/build/index.js"]
    }
  }
}
```

Restart the Claude Desktop app to apply the changes. You should now see the Amazon MCP server listed in the Claude Desktop app.

|                                  |                                    |
| :------------------------------: | :--------------------------------: |
| ![screenshot](./screenshot.webp) | ![screenshot2](./screenshot2.webp) |

## Multi-Profile Setup

The server supports multiple Amazon account profiles, allowing you to switch between personal and work accounts without restarting.

### Profile Directory Structure

Profiles are stored in the `profiles/` directory:

```
mcp-server-amazon/
├── profiles/
│   ├── personal.json    # Your personal Amazon account cookies
│   └── work.json        # Your work Amazon account cookies
└── ...
```

### Setting Up Profiles

1. **Export cookies from your browser** using a cookie editor extension (like "Cookie-Editor")
2. **Save cookies to a profile** by telling Claude:
   ```
   "Save these as my work profile: [paste JSON cookies]"
   ```
   Or manually create `profiles/work.json` with your exported cookies.

### Switching Profiles

Use natural language to switch between profiles:
- "Switch to my work Amazon account"
- "Use my personal profile"
- "List my Amazon profiles"

### Profile Management Tools

| Tool | Description |
|------|-------------|
| `list-profiles` | Shows all available profiles and which is active |
| `get-current-profile` | Returns the currently active profile name |
| `switch-profile` | Switches to a different profile |
| `save-profile` | Saves cookies to a named profile |
| `confirm-profile` | Confirms the profile for session operations |

### Session Confirmation

For safety, account-specific operations (cart, orders, purchases) require profile confirmation at the start of each session. This prevents accidentally operating on the wrong account.

**Tools requiring confirmation:**
- `get-cart-content`
- `add-to-cart`
- `clear-cart`
- `get-orders-history`
- `perform-purchase`

**Tools NOT requiring confirmation (public data):**
- `search-products`
- `get-product-details`

**Profile management tools (no confirmation needed):**
- `list-profiles`
- `get-current-profile`
- `switch-profile`
- `save-profile`
- `confirm-profile`

### Claude Code Modal Integration

When confirmation is needed, the server returns structured JSON that Claude Code recognizes and presents as an interactive modal:

```json
{
  "type": "AMAZON_PROFILE_CONFIRMATION_REQUIRED",
  "currentProfile": "personal",
  "availableProfiles": ["personal", "work"],
  "question": "Which Amazon account should be used for this operation?",
  "options": [...]
}
```

Claude Code displays this as a clickable modal:

```
┌─────────────────────────────────────────────────┐
│ Which Amazon account should be used for this    │
│ operation?                                      │
│                                                 │
│ ○ personal (current)                            │
│   Continue with the currently active profile    │
│                                                 │
│ ○ work                                          │
│   Switch to the work profile                    │
│                                                 │
│                              [Submit]           │
└─────────────────────────────────────────────────┘
```

### Example Workflow

```
User: "Add this iPhone to my cart"
Claude: [Displays modal with profile options]

User: [Clicks "work" option and submits]
Claude: "✅ Session confirmed for profile 'work'. You can now perform account-specific operations."
        "✅ Product added to cart (Profile: work)"
```

## Raspberry Pi / ARM64 Support

For ARM64 systems (like Raspberry Pi), the server is configured to use the system Chromium browser instead of Puppeteer's bundled Chrome. Ensure Chromium is installed:

```sh
sudo apt install chromium
```

The server will automatically use `/usr/bin/chromium` on ARM64 systems.

## Troubleshooting

The MCP server logs its output to a file. If you encounter any issues, you can check the log file for more information.

See `~/Library/Logs/Claude/mcp-server-amazon.log`

### Common Issues

**"Profile confirmation required" message:**
- This is expected behavior for account-specific operations
- Say "confirm" or "confirm profile" to proceed
- You can also specify a profile: "confirm work profile"

**Profile not found:**
- Check that the profile JSON file exists in `profiles/`
- Profile names must be lowercase alphanumeric with hyphens only
- Run `list-profiles` to see available profiles

**Browser launch errors on ARM64:**
- Ensure system Chromium is installed: `sudo apt install chromium`
- The server automatically uses `/usr/bin/chromium` on ARM64

## License

[The MIT license](./LICENSE)
