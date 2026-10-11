/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin from "@utils/types";
import type { Channel } from "@vencord/discord-types";
import { ChannelStore, GuildStore, Menu, React, Tooltip, UserStore, VoiceStateStore } from "@webpack/common";

import { openLogModal } from "./components/LogModal";
import { addEntry, endSession, getCurrentSession, startSession } from "./logger";

// ─── Runtime state ────────────────────────────────────────────────────────────

let myChannelId: string | null = null;
const othersChannel = new Map<string, string>();
const othersStreaming = new Map<string, boolean>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function channelName(channelId: string | null | undefined): string | undefined {
    if (!channelId) return undefined;
    return ChannelStore.getChannel(channelId)?.name ?? undefined;
}

const VOICE_TYPES = new Set([2, 13]);

// ─── Snapshot ─────────────────────────────────────────────────────────────────

function snapshotChannelMembers(channelId: string): void {
    try {
        const myId = UserStore.getCurrentUser()?.id;
        const all = (VoiceStateStore as any)?.getAllVoiceStates?.() as
            Record<string, Record<string, { channelId?: string; }>> | undefined ?? {};
        for (const guildStates of Object.values(all)) {
            if (!guildStates) continue;
            for (const [uid, vs] of Object.entries(guildStates)) {
                if (uid !== myId && vs?.channelId === channelId) {
                    othersChannel.set(uid, channelId);
                }
            }
        }
    } catch { /* VoiceStateStore may not be ready */ }
}

// ─── My state handler ─────────────────────────────────────────────────────────

function handleMyState(state: any): void {
    const { channelId, guildId } = state;
    const prev = myChannelId;
    myChannelId = channelId ?? null;

    if (channelId && !prev) {
        snapshotChannelMembers(channelId);
        const guild = guildId ? GuildStore.getGuild(guildId) : null;
        startSession(channelId, channelName(channelId) ?? "Voice", guild?.name ?? undefined);
    } else if (!channelId && prev) {
        endSession();
        othersChannel.clear();
        othersStreaming.clear();
    } else if (channelId && prev && channelId !== prev) {
        endSession();
        othersChannel.clear();
        othersStreaming.clear();
        snapshotChannelMembers(channelId);
        const guild = guildId ? GuildStore.getGuild(guildId) : null;
        startSession(channelId, channelName(channelId) ?? "Voice", guild?.name ?? undefined);
    }
}

// ─── Others' state handler ────────────────────────────────────────────────────

function handleOtherState(state: any): void {
    const { userId, channelId, guildId, selfStream } = state;
    const prevChannel = othersChannel.get(userId);
    const prevStreaming = othersStreaming.get(userId) ?? false;

    if (channelId) othersChannel.set(userId, channelId);
    else othersChannel.delete(userId);
    if (selfStream !== undefined) othersStreaming.set(userId, !!selfStream);

    if (!myChannelId || !getCurrentSession()) return;
    const myChannel = myChannelId;

    const user = UserStore.getUser(userId);
    const name = user?.globalName ?? user?.username ?? "Unknown";
    const avatar = user?.getAvatarURL?.(guildId, 64) ?? undefined;

    if (channelId === myChannel && !prevChannel) {
        addEntry({ userId, username: name, avatarUrl: avatar, event: "join", channelName: channelName(channelId) });
    } else if (channelId === myChannel && prevChannel && prevChannel !== myChannel) {
        addEntry({ userId, username: name, avatarUrl: avatar, event: "move", fromChannelName: channelName(prevChannel), channelName: channelName(channelId) });
    } else if (!channelId && prevChannel === myChannel) {
        addEntry({ userId, username: name, avatarUrl: avatar, event: "leave" });
    } else if (channelId && channelId !== myChannel && prevChannel === myChannel) {
        addEntry({ userId, username: name, avatarUrl: avatar, event: "move", fromChannelName: channelName(prevChannel), channelName: channelName(channelId) });
    }

    if (selfStream && !prevStreaming && channelId === myChannel) {
        addEntry({ userId, username: name, avatarUrl: avatar, event: "stream", channelName: channelName(channelId) });
    }
}

// ─── Title bar button ─────────────────────────────────────────────────────────

function VoiceLogIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path fill="currentColor" d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zm-1 17.93V22h2v-2.07A8 8 0 0 0 20 12h-2a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.93z" />
        </svg>
    );
}

function TitleBarButton() {
    const [hovered, setHovered] = React.useState(false);
    const session = getCurrentSession();
    const hasActivity = session && session.entries.length > 0;

    return (
        <Tooltip text="Voice Session Log">
            {({ onMouseEnter, onMouseLeave }) => (
                <div
                    role="button"
                    tabIndex={0}
                    aria-label="Voice Session Log"
                    onMouseEnter={() => { setHovered(true); onMouseEnter(); }}
                    onMouseLeave={() => { setHovered(false); onMouseLeave(); }}
                    onClick={() => openLogModal()}
                    onKeyDown={e => e.key === "Enter" && openLogModal()}
                    style={{
                        width: "32px", height: "32px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", borderRadius: "4px",
                        color: myChannelId ? "#23a55a" : hovered ? "#ffffff" : "#b9bbbe",
                        background: hovered ? "var(--background-modifier-hover)" : "transparent",
                        transition: "color 0.15s, background 0.15s",
                        position: "relative" as const,
                    }}
                >
                    <VoiceLogIcon />
                    {/* Recording dot when in a session */}
                    {myChannelId && (
                        <span style={{
                            position: "absolute" as const,
                            top: "4px", right: "4px",
                            width: "6px", height: "6px",
                            borderRadius: "50%",
                            background: "#23a55a",
                            boxShadow: "0 0 4px #23a55a",
                        }} />
                    )}
                </div>
            )}
        </Tooltip>
    );
}

// ─── Context menus ────────────────────────────────────────────────────────────

const channelContextPatch: NavContextMenuPatchCallback = (children, { channel }: { channel: Channel; }) => {
    if (!channel || !VOICE_TYPES.has(channel.type)) return;
    children.push(
        <Menu.MenuItem id="vsl-open-log" label="View Session Log" action={() => openLogModal()} />
    );
};

const voicePanelContextPatch: NavContextMenuPatchCallback = children => {
    if (!myChannelId) return;
    children.push(
        <Menu.MenuItem id="vsl-open-log-panel" label="View Session Log" action={() => openLogModal()} />
    );
};

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default definePlugin({
    name: "voiceSessionLog",
    description: "Logs who joins, leaves, moves or starts streaming in your voice channel. Green mic icon lights up in the title bar while recording.",
    authors: [{ name: "Rewosama", id: 0n }],
    tags: ["Voice", "Utility"],

    contextMenus: {
        "channel-context": channelContextPatch,
        "account": voicePanelContextPatch,
        "rtc-channel": voicePanelContextPatch,
    },

    toolboxActions: {
        "Voice Session Log": () => openLogModal(),
    },

    patches: [
        {
            // Inject at the START of the trailing children array.
            // Uses a different match target than deletedMessageLog's Fragment wrap
            // so both plugins coexist without one silently failing.
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
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: any[]; }) {
            if (!Array.isArray(voiceStates)) return;
            const myId = UserStore.getCurrentUser()?.id;
            if (!myId) return;
            const isBatch = voiceStates.length > 5;
            for (const state of voiceStates) {
                if (state.userId === myId) handleMyState(state);
                else if (!isBatch) handleOtherState(state);
            }
        },
    },

    start() {
        try {
            const myId = UserStore.getCurrentUser()?.id;
            if (!myId) return;
            const vs = VoiceStateStore?.getVoiceStateForUser?.(myId);
            if (!vs?.channelId) return;
            myChannelId = vs.channelId;
            snapshotChannelMembers(vs.channelId);
            const ch = ChannelStore.getChannel(vs.channelId);
            const guild = (vs as any).guildId ? GuildStore.getGuild((vs as any).guildId) : null;
            startSession(vs.channelId, ch?.name ?? "Voice", guild?.name ?? undefined);
        } catch { /* ignore early-load errors */ }
    },

    stop() {
        if (myChannelId) endSession();
        myChannelId = null;
        othersChannel.clear();
        othersStreaming.clear();
    },
});
