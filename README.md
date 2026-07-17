# DexScreener Token Info

Tampermonkey userscript that extracts token contract addresses from [dexscreener.com](https://dexscreener.com) pages and displays enriched token data from the DexScreener API. Supports sending tokens to a Project Checker instance.

## Setup

1. Install [Tampermonkey](https://tampermonkey.net/) in your browser
2. Add this script (`dexscreener-token-info.user.js`)
3. Configure **Project Checker API Key** and **Project Checker URL** via the in-script dashboard

## What it does

- Injects a **📋 Token Info** button on DexScreener token pages
- Extracts the contract address from page elements automatically
- Displays token name, symbol, contract address, chain, website, Twitter, and Telegram as formatted JSON
- Click the JSON to copy it to clipboard
- **Add token to Project Checker** sends the token data to your Project Checker instance via POST

## How to open settings

Three ways to open the Project Checker dashboard:

- **Tampermonkey menu** — right-click the Tampermonkey icon → *Open Project Checker Dashboard*
- **⚙️ button** — bottom-right corner of any DexScreener token page
- **Hotkey** — `Shift+S` on any DexScreener page

Settings are also editable directly in the Tampermonkey dashboard under **Storage** (`pcApiKey`, `pcApiUrl`).

## API data shape

Tokens are sent to Project Checker as:

```json
{
  "name": "Token Name",
  "symbol": "SYM",
  "contractAddress": "0x...",
  "chainId": "solana",
  "website": "https://...",
  "twitter": "https://twitter.com/...",
  "telegram": "https://t.me/..."
}
```

## Permissions

| Permission | Purpose |
|------------|---------|
| `GM_setClipboard` | Copy contract address and JSON to clipboard |
| `GM_getValue / GM_setValue` | Persist Project Checker credentials |
| `GM_addStyle` | Inject panel CSS |
| `GM_xmlhttpRequest` | Allow fetch to any host (including `localhost`) |
| `GM_registerMenuCommand` | Add entry to Tampermonkey dropdown menu |
| `@connect *` | Allow fetch requests to any domain |

## Project structure

```
dexscreener-token-info/
├── dexscreener-token-info.user.js   # Main (and only) script
└── README.md
```
