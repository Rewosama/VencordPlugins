# userNotes

A Vencord userplugin for attaching multiple private notes to any Discord user. Notes are stored locally in IndexedDB and are never synced to Discord or sent anywhere.

---

## Features

### 📝 Multiple notes per user

Unlike Discord's built-in single note field, this plugin lets you write as many notes as you want for each person. Each note has its own timestamp and can be edited or deleted independently.

### Profile button

A small transparent notepad icon is injected next to every user's display name. It appears in:

- The mini profile popout (clicking a user in chat)
- The DM side panel
- The full profile modal

When notes exist, a small blue dot appears on the icon. Hovering shows a tooltip with the note count. Clicking opens the per-user notes modal.

### 📋 Per-user notes modal

Opened from the profile button or the right-click context menu.

- **Add note** — inline composer, Ctrl+Enter to save
- **Edit note** — click any note text to edit in-place
- **Delete single** — hover a note and click ×
- **Multi-select** — "Select" → check notes → "Delete (n)"
- **Delete all** — removes every note for that user at once

### 🖱 Right-click access

Right-clicking any user shows a **Notes** option that opens the same per-user modal.

### ⚙️ Settings page

Open via the gear icon in Vencord Settings → Plugins → userNotes.

| Section                | Description                                            |
| ---------------------- | ------------------------------------------------------ |
| **Show count badge**   | Toggle the blue indicator dot on the profile button    |
| **Export**             | Download all notes as a JSON backup                    |
| **Import (merge)**     | Add notes from a backup, keeping existing ones         |
| **Import (overwrite)** | Replace all notes with the backup                      |
| **Delete all**         | Permanently wipe every note from storage               |
| **People with notes**  | Chip list of all users — click any to open their notes |

---

## How notes are stored

Notes live in Discord's local IndexedDB under Vencord's data store. Three key types are used:

| Key                       | Value                                         |
| ------------------------- | --------------------------------------------- |
| `userNotes_index`         | Array of Discord user IDs that have notes     |
| `userNotes_user_<userId>` | Array of note IDs for that user               |
| `userNotes_note_<uuid>`   | Individual note object (content + timestamps) |

Every delete operation — single, bulk, or "delete all" — removes the relevant keys from all three levels. Data never leaves your device.

---

## Backup format

```json
{
    "version": 2,
    "data": [
        {
            "userId": "123456789012345",
            "username": "someuser",
            "notes": [
                {
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "content": "Met at server X, admin of Y",
                    "createdAt": 1718000000000,
                    "updatedAt": 1718000000000
                }
            ]
        }
    ]
}
```

---

## Installation

1. Copy the `userNotes` folder into `src/userplugins/`
2. Build Vencord (`pnpm build` or `pnpm watch`)
3. Enable **userNotes** in Vencord Settings → Plugins

---

## Author

Made by **Rewosama**.
