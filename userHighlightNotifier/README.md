# UserHighlightNotifier

A Vencord userplugin that lets you organize Discord users into color-coded categories and highlights them across the entire client — voice channels, member list, and chat messages. Optionally sends real-time notifications when highlighted users join voice or change online status.

---

## Features

### 🎨 Category-based Highlighting

Create as many named categories as you like and assign a unique color to each one. Every category can be highlighted independently in three locations:

| Location | What gets highlighted |
|----------|-----------------------|
| 🎤 Voice | Background + left border on voice channel rows |
| 👥 Members | Background + left border on member list cards |
| 💬 Chat | Background + left border on chat message rows |

Toggle each location on or off directly from the category card — no need to open the edit modal.

### 🌈 Gradient Colors

Each category supports an optional **second color** for a left-to-right gradient. Configure it in the category's Edit modal.

### ⚡ Category Priority

Categories are listed in priority order. If a user belongs to multiple categories (e.g. they are both a friend via auto-sync and manually added to another category), the **topmost category wins**. Drag the `⠿` handle to reorder categories and control priority.

### 🤝 Auto-sync

Two special sync modes are available per category and require no manual user assignment:

- **Me** (`✦ me`) — always highlights your own Discord account
- **Friends** (`✦ auto-sync`) — automatically includes your entire Discord friend list

Both sync modes are live: changes to your friend list are reflected immediately without any plugin restart.

### 🔕 Mention protection

Discord's native `@mention` highlight always takes priority. If a message has a mention highlight, the plugin's background highlight is suppressed for that row.

### 🔔 Notifications

When notifications are enabled (master toggle in the Notifications panel), the plugin can alert you when highlighted users:

**Voice events**
- Join a voice channel
- Leave a voice channel
- Switch between channels
- Start streaming / screen sharing

**Presence events**
- Come online
- Go offline
- Change status (Online ↔ Idle ↔ Do Not Disturb)

Each category has its own **🔔 Notify** toggle chip on the card — enable it only for the categories you care about (e.g. notify for "Important" but not for "Friends"). The **Me** category never sends notifications.

Notification display style, sound volume, and per-event toggles are all configurable in the collapsible Voice / Presence / Display sections of the Notifications panel.

### 🚫 Ignored Servers

Right-click any server icon in the sidebar and choose **Disable UserHighlightNotifier here** to suppress all highlighting in that server. The server appears in the Ignored Servers list in settings and can be removed at any time.

### 💾 Backup & Restore

Use the **Export Settings** and **Import Settings** buttons at the bottom of the settings page to back up or migrate your full configuration — including all categories, user assignments, ignored servers, and notification preferences.

---

## Installation

1. Place the `userHighlightNotifier` folder inside your Vencord `src/userplugins/` directory.
2. Build Vencord (`pnpm build` or `pnpm watch`).
3. Enable **UserHighlightNotifier** in Vencord Settings → Plugins.

---

## Settings overview

| Setting | Description |
|---------|-------------|
| **Highlight in DMs** | Apply category highlights in DMs and group chats (off by default) |
| **Category cards** | Create, edit, delete and reorder categories; toggle highlight locations per card |
| **Notifications** | Master on/off toggle + collapsible Voice, Presence and Display sections |
| **Ignored Servers** | List of servers where highlighting is disabled (managed via right-click) |
| **Export / Import** | Full JSON backup and restore of all plugin data |

---

## Author

Made by **Rewosama**.
