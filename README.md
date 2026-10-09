# Vencord Custom Plugins

A collection of custom plugins for [Vencord](https://vencord.dev).

---

## Plugins

| Plugin                                           | Description                                                                                                |  Status   |
| :----------------------------------------------- | :--------------------------------------------------------------------------------------------------------- | :-------: |
| [UserHighlightNotifier](./userHighlightNotifier) | Organize users into color-coded categories, highlight them across Discord, and get notified when they act. | 🟢 Active |
| [VoiceSessionLog](./voiceSessionLog)             | Logs voice channel activity during your sessions — tracks who joins, leaves, switches channels, or starts streaming, with a full reviewable history. | 🟢 Active |
| [DeletedMessageLog](./deletedMessageLog)         | Logs deleted messages in channels and DMs — tracks content, attachments, and keyword/mention filters with a full reviewable history. | 🟢 Active |

---

## Installation

1. Copy the plugin folder(s) you want into `Vencord/src/userplugins/`.
2. Build Vencord: `pnpm build`
3. Reload Discord (`Ctrl+R` / `Cmd+R`) and enable the plugin under **Settings → Vencord → Plugins**.

Each plugin folder contains its own README with detailed setup and configuration info.

---

## License

GPL-3.0 — see [LICENSE](./LICENSE).
