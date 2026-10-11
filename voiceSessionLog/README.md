# voiceSessionLog

A Vencord userplugin that logs voice channel activity during your sessions. Whenever you are in a voice channel, it tracks who joins, leaves, switches channels, or starts streaming — and lets you review the full history at any time.

---

## Features

### 🎙 Automatic session tracking

A new session starts automatically when you join a voice channel and ends when you leave. You don't need to do anything — it just runs in the background.

Each session records:

| Event | Description |
|-------|-------------|
| 🟢 **Joined** | Someone connected to your channel |
| 🔴 **Left** | Someone disconnected from your channel |
| 🔵 **Moved** | Someone switched channels (from → to) |
| 🟣 **Started streaming** | Someone started a stream or screen share in your channel |

### 👤 Clickable usernames

Every username in the log is clickable — tapping it opens the user's Discord profile.

### 🕓 Session history

Up to 50 past sessions are kept in memory (cleared when the plugin is stopped or Discord restarts). The log modal shows the active session first, followed by previous sessions with their start time and duration.

### 🗑 Clear log

While a session is active, a **Clear** button in the session header wipes the current entries without ending the session.

---

## How to open the log

Right-click on any voice channel in the sidebar **or** right-click the voice connection panel in the bottom-left corner while you are in a call. Both show a **"View Session Log"** option.

The log can also be opened via the **Vencord Toolbox** (the Vencord icon in the chat bar area → Voice Session Log).

---

## Session header explained

```
● #General  Rewound Çöplüğü     Active · 32s     Clear
```

| Part | Meaning |
|------|---------|
| Colored dot | Green = active session, grey = past session |
| `#General` | Voice channel name |
| `Rewound Çöplüğü` | Server name |
| `Active · 32s` | Session has been running for 32 seconds |
| `Clear` | Wipes log entries for the current session |

For past sessions the duration shows as `14:32:05 · 35m` (start time · total length).

---

## Log entry format

```
00:21:50  🟢  [avatar]  Luft  joined #General
00:21:51  🔴  [avatar]  Luft  left
00:22:10  🔵  [avatar]  Alice  #AFK → #General
00:23:05  🟣  [avatar]  Bob  started streaming in #General
```

- **Timestamp** — local time in HH:MM:SS format
- **Colored dot** — event type (green/red/blue/purple)
- **Avatar** — small circular profile picture
- **Username** — clickable, opens the user's Discord profile

---

## Notes

- The plugin only logs activity **after** you have joined the channel. People who were already present when you joined are not logged as "joined".
- Events are stored in memory only and are lost when Discord restarts.
- The log is **not saved to disk** and is never sent anywhere.

---

## Installation

Place the `voiceSessionLog` folder inside your Vencord `src/userplugins/` directory, build Vencord, and enable **voiceSessionLog** in Vencord Settings → Plugins.

---

## Author

Made by **Rewosama**.
