# Amazon MCP Server (MattStarfield Fork)

> **This is a customized fork** of [rigwild/mcp-server-amazon](https://github.com/rigwild/mcp-server-amazon) with significant enhancements for multi-account management, safety features, and ARM64 compatibility.

[![Fork](https://img.shields.io/badge/fork-MattStarfield-blue)](https://github.com/MattStarfield/mcp-server-amazon)
[![Original](https://img.shields.io/badge/original-rigwild-green)](https://github.com/rigwild/mcp-server-amazon)
[![License](https://img.shields.io/badge/license-MIT-yellow)](./LICENSE)

---

## What's Different in This Fork?

This fork adds **enterprise-grade multi-account management** with safety guardrails, making it suitable for users who manage multiple Amazon accounts (personal, work, business, etc.).

### Key Enhancements

| Feature | Description |
|---------|-------------|
| **Multi-Profile Support** | Switch between multiple Amazon accounts at runtime without restarting |
| **Session Confirmation Gate** | Prevents accidental operations on the wrong account with explicit confirmation |
| **Per-Profile Confirmation Reset** | Switching profiles requires re-confirmation - no silent account changes |
| **Claude Code Modal UI** | Interactive clickable modal instead of text prompts for profile selection |
| **ARM64/Raspberry Pi Support** | Native compatibility with Raspberry Pi and other ARM64 systems |
| **Cookie Normalization** | Robust handling of browser-exported cookies with edge case fixes |

### New MCP Tools (5 Added)

| Tool | Description |
|------|-------------|
| `list-profiles` | View all configured Amazon account profiles |
| `get-current-profile` | Check which profile is currently active |
| `switch-profile` | Switch to a different Amazon account |
| `save-profile` | Save new account cookies to a named profile |
| `confirm-profile` | Explicitly confirm profile before sensitive operations |

### Files Changed from Original

| File | Change | Purpose |
|------|--------|---------|
| `src/profileManager.ts` | **NEW** | Core multi-profile and confirmation logic |
| `src/index.ts` | **Major** | 5 new tools + confirmation gates on account operations |
| `src/config.ts` | **Refactored** | Dynamic cookie loading from active profile |
| `src/utils.ts` | **Modified** | ARM64 Chromium support + dynamic cookies |
| `profiles/` | **NEW** | Directory for account profile JSON files |

---

## Quick Start

### Installation

```sh
# Clone this fork
git clone https://github.com/MattStarfield/mcp-server-amazon.git
cd mcp-server-amazon

# Install dependencies
npm install -D

# Build
npm run build
```

### ARM64 Systems (Raspberry Pi)

```sh
# Install system Chromium (required for ARM64)
sudo apt install chromium
```

### Claude Code Configuration

Add to your `~/.claude.json`:

```json
{
  "mcpServers": {
    "amazon-shopping": {
      "command": "node",
      "args": ["/path/to/mcp-server-amazon/build/index.js"]
    }
  }
}
```

---

## Multi-Profile System

The standout feature of this fork is **multi-profile support** - manage multiple Amazon accounts seamlessly.

### Why Multi-Profile?

- **Separate personal and work purchases** - Never accidentally buy on the wrong account
- **Manage multiple regions** - amazon.com, amazon.co.uk, amazon.de, etc.
- **Family accounts** - Keep household accounts organized
- **Business accounts** - Separate business purchasing from personal

### Setting Up Profiles

#### 1. Export Cookies from Your Browser

1. Log into your Amazon account in your browser
2. Install a cookie editor extension (e.g., "Cookie-Editor" for Chrome/Firefox)
3. Export all cookies for amazon.com as JSON

#### 2. Save Profile via Claude

```
"Save these cookies as my work profile: [paste JSON]"
```

Or manually create `profiles/work.json` with exported cookies.

#### 3. Directory Structure

```
mcp-server-amazon/
├── profiles/
│   ├── personal.json    # Your personal Amazon cookies
│   ├── work.json        # Work account cookies
│   └── uk.json          # Amazon UK account (optional)
├── src/
└── ...
```

### Switching Profiles

Use natural language:

- *"Switch to my work Amazon account"*
- *"Use my personal profile"*
- *"List my Amazon profiles"*

---

## Session Confirmation Gate

This fork implements a **safety gate** that prevents accidental operations on the wrong account.

### How It Works

1. **First account-specific operation** triggers confirmation
2. **Claude Code displays a modal** with profile options
3. **User clicks to confirm** which account to use
4. **Subsequent operations proceed** without re-prompting
5. **Switching profiles resets confirmation** - must confirm again

### Visual Modal (Claude Code)

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

### Operations Requiring Confirmation

These account-specific operations require confirmation:

- `add-to-cart` - Adding items to cart
- `get-cart-content` - Viewing cart contents
- `clear-cart` - Emptying the cart
- `get-orders-history` - Viewing order history
- `perform-purchase` - Completing purchases

### Operations NOT Requiring Confirmation

These public/read-only operations work without confirmation:

- `search-products` - Searching Amazon catalog
- `get-product-details` - Viewing product information

---

## Example Workflow

```
User: "Find me a USB-C cable under $20"

Claude: [Searches Amazon - no confirmation needed]
        "I found several options. Here are the top 3..."

User: "Add the first one to my cart"

Claude: [Modal appears]
        "Which Amazon account should be used?"

User: [Clicks "personal (current)" → Submit]

Claude: "✅ Session confirmed for profile 'personal'"
        "✅ USB-C cable added to cart"

User: "Actually, add it to my work account instead"

Claude: [Switches profile, confirmation resets]
        [Modal appears again for work profile]

User: [Clicks "work" → Submit]

Claude: "✅ Session confirmed for profile 'work'"
        "✅ USB-C cable added to work cart"
```

---

## All Available Tools

### Profile Management (No Confirmation)

| Tool | Description |
|------|-------------|
| `list-profiles` | Shows all profiles with cookie counts and active status |
| `get-current-profile` | Returns current profile name and confirmation status |
| `switch-profile` | Switches to named profile (resets confirmation) |
| `save-profile` | Saves cookie JSON to a new or existing profile |
| `confirm-profile` | Explicitly confirms current or specified profile |

### Product Discovery (No Confirmation)

| Tool | Description |
|------|-------------|
| `search-products` | Search Amazon catalog by keyword |
| `get-product-details` | Get detailed product info by ASIN |

### Account Operations (Confirmation Required)

| Tool | Description |
|------|-------------|
| `get-cart-content` | View current cart items and totals |
| `add-to-cart` | Add product to cart by ASIN |
| `clear-cart` | Remove all items from cart |
| `get-orders-history` | View recent order history |
| `perform-purchase` | Complete checkout (demo mode) |

---

## ARM64 / Raspberry Pi Support

This fork includes native ARM64 support, tested on Raspberry Pi 5.

### The Problem

Puppeteer downloads x86-64 Chrome binaries by default, which fail on ARM64.

### The Solution

This fork automatically uses system Chromium on ARM64:

```typescript
executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium'
```

### Setup

```sh
# Install system Chromium
sudo apt install chromium

# Verify installation
which chromium  # Should show /usr/bin/chromium
```

---

## Troubleshooting

### "Profile confirmation required"

This is expected behavior! The safety gate is working. Simply:
- Click your profile choice in the modal, or
- Say "confirm" or "confirm personal profile"

### Profile not found

- Check `profiles/` directory contains your JSON file
- Profile names must be lowercase alphanumeric with hyphens (e.g., `work`, `amazon-uk`)
- Run `list-profiles` to see available profiles

### Browser launch errors on ARM64

```sh
# Ensure Chromium is installed
sudo apt install chromium

# Test it works
chromium --version
```

### Cookie issues

- Re-export cookies if they've expired
- Ensure you're exporting ALL cookies for the Amazon domain
- Check for special characters in cookie values

---

## Original Project

This fork is based on [rigwild/mcp-server-amazon](https://github.com/rigwild/mcp-server-amazon).

**Original features preserved:**
- Product search and details
- Cart management
- Order history
- Purchase flow (demo)

**Original demos** (from upstream):

- Quick demo: ![Demo GIF](./demo.gif)
- Full video: [YouTube Demo](https://www.youtube.com/watch?v=xas2CLkJDYg)

---

## License

[MIT License](./LICENSE) - Same as original project.

---

## Contributing

Issues and PRs welcome! This fork is actively maintained.

**Maintainer**: [MattStarfield](https://github.com/MattStarfield)
