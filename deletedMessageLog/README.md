# DeletedMessageLog

A Vencord userplugin that logs deleted messages in channels and DMs when they mention you or match your custom keywords. Review deleted content, attachments, and context at any time.

---

## Features

### 🔍 Selective Message Tracking

Instead of logging every single deleted message across all servers, the plugin specifically captures messages relevant to you:

| Trigger | Description |
|---------|-------------|
| 🔔 **Mentions** | Captures messages that mention your user account (`@you`). |
| 🔑 **Keywords** | Captures messages containing words or phrases you define in settings. |

### 🖼 Attachment Previews

Captures image and media attachment URLs alongside the deleted message content so you don't lose context.

### 📌 Quick Access Button & Toolbox

- **Title bar button**: Adds an icon directly to the top bar (next to inbox/help) with an active badge indicator when deleted messages are present.
- **Vencord Toolbox**: Accessible anytime from the chat bar Vencord menu under **Deleted Message Log**.

### 📋 Detailed Log Modal

- View message content, author name & avatar, channel/server name, and time of deletion.
- Click any author's username to open their Discord profile.
- Filter, delete individual entries, or wipe the log with **Clear All**.
- Persistent history saved locally across Discord restarts (up to your configured limit).

---

## Configuration

Available under **Settings → Vencord → Plugins → DeletedMessageLog**:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| **Log deleted messages that mention you** | Toggle | `true` | Automatically track and log deleted messages that mention you. |
| **Keywords** | Text | `""` | Comma or space separated keywords to monitor. |
| **Max Entries** | Slider | `100` | Maximum number of deleted messages to keep (50–500). |
