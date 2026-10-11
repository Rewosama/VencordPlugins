# birthdayReminder

Remembers birthdays for Discord users. Shows a live section in the DM sidebar, notifies at midnight, and lets you manage the full list from the plugin settings.

---

## Features

- **DM sidebar section** — a "🎂 Birthdays Today" section appears right above the DM list on the home page whenever someone has a birthday today. Shows avatar, display name, and age (if year was saved).
- **Midnight notification** — at 00:00 a system notification fires with each birthday person's name and their new age (when year is known).
- **Right-click context menu** — right-click any user → **🎂 Set Birthday** or **✏️ Edit Birthday**.
- **Settings panel** — full birthday list, per-entry edit/delete, and JSON export/import for backup or sharing between devices.

---

## How to use

### Set a birthday

Right-click any user (in a server member list, DM list, or message) and select **🎂 Set Birthday**.

In the modal:
- **Month / Day** — required.
- **Year** — optional. Only stored locally and only used to display age. Leave blank to keep it private.

### Edit or delete

Right-click the user again → **✏️ Edit Birthday**, or open the plugin's settings page and click **Edit** / **×** next to any entry.

### DM sidebar

When enabled in settings, a compact section appears above the DM list whenever today is someone's birthday. Clicking an entry opens their profile. If a birth year was saved the entry shows their new age (e.g. `🎉 29`).

> Requires a Discord restart to take effect when toggled.

### Midnight notification

At exactly 00:00 a notification pops up listing everyone whose birthday is today. If a birth year was saved the notification includes the age they're turning — e.g. *"Today is Alice's birthday (turns 28)"*.

### Export / Import

Open the plugin settings page. Under **Backup**:

| Button | Effect |
|---|---|
| 📤 Export | Downloads `birthdays-<timestamp>.json` |
| 📥 Import (merge) | Adds entries from the file; skips users who already have a birthday |
| 📥 Import (overwrite) | Replaces existing entries with those from the file |

The JSON format is:
```json
{
  "version": 1,
  "birthdays": [
    { "userId": "123456789012345678", "username": "alice", "month": 6, "day": 15, "year": 1996 },
    { "userId": "234567890123456789", "username": "bob",   "month": 11, "day": 3 }
  ]
}
```

---

## Notes

- **Age is always optional.** The year field only affects what's displayed — it is never sent to Discord.
- **Feb 29 birthdays** are shown on Feb 28 in non-leap years.
- **pinDms compatibility.** If the pinDms plugin is also active it patches the same inner component. In that case the birthday section might not appear in the sidebar (both plugins inject into the same virtualised list). The right-click menu and midnight notifications are unaffected.
- **Data is stored locally** via Vencord's DataStore (IndexedDB). Uninstalling the plugin does not remove the data; use the export button first if you want to back it up.

---

## File structure

```
birthdayReminder/
├── index.tsx              # Plugin entry, webpack patches, DM row rendering
├── store.ts               # DataStore CRUD, birthday cache, import/export logic
├── contextMenu.tsx        # User right-click context menu patch
├── components/
│   ├── SetBirthdayModal.tsx   # Month / Day / Year picker modal
│   ├── SettingsPanel.tsx      # Full list + backup UI (shown in plugin settings)
│   └── TodaySection.tsx       # Standalone React component (today's birthdays)
└── README.md
```
