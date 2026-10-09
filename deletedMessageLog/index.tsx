/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin from "@utils/types";
import { ChannelStore, GuildStore, React, Tooltip, UserStore } from "@webpack/common";

import { openLogModal } from "./components/LogModal";
import { AttachmentInfo, evictStale, getLog, loadLog, onMessageDeleted, trackMessage, updateTracked } from "./logger";
import { settings } from "./settings";

// ─── Keyword helpers ──────────────────────────────────────────────────────────

function getKeywords(): string[] {
    const raw = settings.store.keywords.trim();
    if (!raw) return [];
    return raw.split(/[\s,]+/).map(k => k.trim().toLowerCase()).filter(Boolean);
}

function findMatchedKeyword(content: string): string | undefined {
    const lower = content.toLowerCase();
    return getKeywords().find(kw => lower.includes(kw));
}

function mentionsMe(message: any): boolean {
    if (!settings.store.trackMentions) return false;
    const myId = UserStore.getCurrentUser()?.id;
    if (!myId) return false;
    // message.mentions is an array of user objects or IDs
    return message.mentions?.some((m: any) =>
        (typeof m === "string" ? m : m?.id) === myId
    ) ?? false;
}

// ─── Title bar button ─────────────────────────────────────────────────────────

function LogIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path fill="currentColor" d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM8 11H6V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z" />
        </svg>
    );
}

function TitleBarButton() {
    const count = getLog().length;

    const [hovered, setHovered] = React.useState(false);

    return (
        <Tooltip text="Deleted Message Log">
            {({ onMouseEnter, onMouseLeave }) => (
                <div
                    role="button"
                    tabIndex={0}
                    aria-label="Deleted Message Log"
                    onMouseEnter={e => { setHovered(true); onMouseEnter(); }}
                    onMouseLeave={e => { setHovered(false); onMouseLeave(); }}
                    onClick={() => openLogModal()}
                    onKeyDown={e => e.key === "Enter" && openLogModal()}
                    style={{
                        width: "32px", height: "32px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer",
                        borderRadius: "4px",
                        color: count > 0 ? "#f0b232" : hovered ? "#ffffff" : "#b9bbbe",
                        background: hovered ? "var(--background-modifier-hover)" : "transparent",
                        transition: "color 0.15s, background 0.15s",
                        position: "relative" as const,
                    }}
                >
                    <LogIcon />
                    {count > 0 && (
                        <span style={{
                            position: "absolute" as const,
                            top: "4px", right: "4px",
                            width: "7px", height: "7px",
                            borderRadius: "50%",
                            background: "#f0b232",
                            boxShadow: "0 0 4px #f0b23288",
                        }} />
                    )}
                </div>
            )}
        </Tooltip>
    );
}

// ─── Cleanup interval ─────────────────────────────────────────────────────────

let _cleanupInterval: ReturnType<typeof setInterval> | null = null;

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default definePlugin({
    name: "deletedMessageLog",
    description: "Logs deleted messages that mention you or contain your keywords. Open from the title bar or toolbox.",
    authors: [{ name: "Rewosama", id: 0n }],
    tags: ["Utility", "Chat"],
    settings,

    toolboxActions: {
        "Deleted Message Log": () => openLogModal(),
    },

    patches: [
        {
            // Inject at the START of the trailing children array (same strategy
            // as voiceSessionLog). Because deletedMessageLog sorts before
            // voiceSessionLog alphabetically, it patches first → result order:
            //   [🎙 voice] [📩 deleted] [inbox] [help]
            find: '?"BACK_FORWARD_NAVIGATION":',
            replacement: {
                match: /(trailing:.{0,150}?\{children:\[)/,
                replace: "$1$self.renderTitleBarButton(),"
            }
        }
    ],

    renderTitleBarButton() {
        return (
            <ErrorBoundary noop>
                <TitleBarButton />
            </ErrorBoundary>
        );
    },

    flux: {
        MESSAGE_CREATE({ message, guildId }: { message: any; guildId?: string; }) {
            if (!message?.id) return;

            const myId = UserStore.getCurrentUser()?.id;
            if (!myId || message.author?.id === myId) return;

            const textContent: string = message.content ?? "";

            const isMention = mentionsMe(message);
            const matchedKeyword = isMention ? undefined : findMatchedKeyword(textContent);

            if (!isMention && !matchedKeyword) return;

            // Collect real attachment data (URLs preserved for display in modal)
            const rawAttachments: any[] = message.attachments ?? [];
            const attachments: AttachmentInfo[] = rawAttachments.map((a: any) => ({
                url: a.url ?? a.proxy_url ?? "",
                proxyUrl: a.proxy_url,
                filename: a.filename ?? "file",
                contentType: a.content_type,
                width: a.width,
                height: a.height,
            })).filter(a => a.url);

            // Text description of non-image attachments + embeds + stickers
            const parts: string[] = [];
            if (textContent) parts.push(textContent);
            const embeds: any[] = message.embeds ?? [];
            embeds.forEach((e: any) => {
                if (e.type === "gifv") parts.push("[GIF]");
                else if (e.type !== "image" && e.type !== "video") parts.push("[embed]");
            });
            const stickers: any[] = message.sticker_items ?? message.stickerItems ?? [];
            stickers.forEach((s: any) => parts.push(`[sticker: ${s.name ?? "sticker"}]`));
            // Non-image file attachments get a text note; images are shown visually in the modal
            rawAttachments.forEach((a: any) => {
                const ct: string = a.content_type ?? "";
                if (!ct.startsWith("image/") && !ct.startsWith("video/")) {
                    parts.push(`[file: ${a.filename ?? "file"}]`);
                }
            });
            const displayContent = parts.join(" ").trim() || "(no text)";

            const user = UserStore.getUser(message.author?.id);
            const avatar = user?.getAvatarURL?.(guildId, 64) ?? undefined;

            trackMessage(message.id, {
                content: displayContent,
                authorId: message.author?.id ?? "",
                authorName: message.author?.global_name ?? message.author?.username ?? "Unknown",
                avatarUrl: avatar,
                channelId: message.channel_id,
                guildId,
                capturedAt: Date.now(),
                isMention,
                matchedKeyword,
                attachments: attachments.length > 0 ? attachments : undefined,
            });
        },

        MESSAGE_UPDATE({ message, guildId }: { message: any; guildId?: string; }) {
            if (message?.id && message?.content !== undefined) {
                updateTracked(message.id, message.content as string);
            }
        },

        MESSAGE_DELETE({ id, channelId }: { id: string; channelId: string; }) {
            const ch = ChannelStore.getChannel(channelId);
            const guild = ch?.guild_id ? GuildStore.getGuild(ch.guild_id) : null;
            onMessageDeleted(id, ch?.name, guild?.name, settings.store.maxEntries);
        },

        MESSAGE_DELETE_BULK({ ids, channelId }: { ids: string[]; channelId: string; }) {
            const ch = ChannelStore.getChannel(channelId);
            const guild = ch?.guild_id ? GuildStore.getGuild(ch.guild_id) : null;
            for (const id of ids) {
                onMessageDeleted(id, ch?.name, guild?.name, settings.store.maxEntries);
            }
        },
    },

    async start() {
        await loadLog(); // restore persisted log from DataStore
        _cleanupInterval = setInterval(evictStale, 60 * 60 * 1000);
    },

    stop() {
        if (_cleanupInterval) { clearInterval(_cleanupInterval); _cleanupInterval = null; }
    },
});
