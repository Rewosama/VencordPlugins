# CustomKeywordHighlight

Highlights messages containing specified keywords with Discord's native mention style and optionally triggers real mention unread badges and ping sounds.

---

## Features

### 🔔 Real Discord Mentions
Dispatches mention events for matching messages so you get a red badge counter on the server/channel and an audible mention ping sound — just like a real `@mention`.

### 🎨 Customizable Highlight Colors
Style matched messages using Discord's default mention orange or choose from custom accent colors:
- Discord Mention Orange (`#faa61a`)
- Crimson Red (`#ef4444`)
- Emerald Green (`#10b981`)
- Purple Glow (`#8b5cf6`)
- Cyan Glow (`#06b6d4`)
- Hot Pink (`#ec4899`)
- Gold (`#f59e0b`)
- Bright White (`#ffffff`)

### 🔍 Flexible Keyword Matching
- **Multiple Keywords**: Separate keywords by commas or newlines.
- **Whole Word Matching**: Option to only match full words (e.g. matching `cat` won't trigger on `catalog`).
- **Case Sensitivity**: Toggle whether matching should respect uppercase/lowercase.
- **Ignore Own Messages**: Exclude messages you send yourself from triggering highlights or mentions.
- **Smart Mentions**: Excludes user mention pills (`@username`) so regular mentions don't trigger false keyword matches.

---

## Configuration

Available under **Settings → Vencord → Plugins → CustomKeywordHighlight**:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| **Trigger Real Mention** | Toggle | `true` | Trigger real Discord mention notification (red badge on server/channel & ping sound). |
| **Keywords** | Text | `""` | Keywords or phrases that trigger a mention highlight (separated by comma or newline). |
| **Highlight Color** | Select | `Discord Mention Orange` | Highlight color for keyword mentions. |
| **Whole Word** | Toggle | `true` | Match whole words only. |
| **Case Sensitive** | Toggle | `false` | Enable case sensitive matching. |
| **Ignore Own Messages** | Toggle | `true` | Ignore your own sent messages. |

---

## File structure

```
customKeywordHighlight/
├── index.tsx              # Plugin entry, FluxDispatcher hooks, DOM observer, and style injector
└── README.md
```

