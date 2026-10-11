/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChannelStore, FluxDispatcher, GuildStore, SelectedChannelStore, UserStore } from "@webpack/common";

import { getNotificationPrefs, getUserCategory } from "../data";
import { AlertPayload, sendAlert, StatusColors } from "./alert";
import { isWarmup } from "./state";

export const lastVoiceChannel = new Map<string, string>();
export const lastStreaming = new Map<string, boolean>();

// ─── Snapshot current voice state ────────────────────────────────────────────

export function snapshotVoiceState(): void {
    try {
        const all: Record<string, Record<string, any>> =
            (window as any).Vencord?.Webpack?.Common?.VoiceStateStore?.getAllVoiceStates?.() ?? {};
        for (const states of Object.values(all)) {
            if (!states) continue;
            for (const [uid, vs] of Object.entries(states)) {
                if (vs?.channelId) {
                    lastVoiceChannel.set(uid, vs.channelId);
                    if (vs.selfStream) lastStreaming.set(uid, true);
                }
            }
        }
    } catch { /* unavailable during early load */ }
}

// ─── Flux handler ─────────────────────────────────────────────────────────────

function handleVoiceStates({ voiceStates }: { voiceStates: any[]; }): void {
    if (!Array.isArray(voiceStates)) return;

    const prefs = getNotificationPrefs();
    if (!prefs.enabled) return;

    const isBatch = voiceStates.length > 1;
    const myId = UserStore.getCurrentUser()?.id;
    const myVc = SelectedChannelStore.getVoiceChannelId?.();

    for (const state of voiceStates) {
        const { userId, channelId, guildId, selfStream } = state;
        if (!userId || userId === myId) continue;

        const cat = getUserCategory(userId);
        if (!cat) continue;
        // Per-category notification toggle
        if (cat.notificationsEnabled === false) continue;

        const prevChannel = state.oldChannelId ?? lastVoiceChannel.get(userId);
        const wasStreaming = lastStreaming.get(userId) ?? false;

        if (channelId) lastVoiceChannel.set(userId, channelId);
        else lastVoiceChannel.delete(userId);
        if (selfStream !== undefined) lastStreaming.set(userId, !!selfStream);

        if (isWarmup() || isBatch) continue;

        if (prefs.ignoreSameVoice && myVc &&
            (channelId === myVc || prevChannel === myVc)) continue;

        const user = UserStore.getUser(userId);
        const name = user?.globalName ?? user?.username ?? "A user";
        const avatar = user?.getAvatarURL?.(guildId, 64);
        const guild = guildId ? GuildStore.getGuild(guildId) : null;
        const suffix = guild?.name ? ` (${guild.name})` : "";
        const vol = prefs.sound ? prefs.soundVolume : 0;

        let payload: AlertPayload | null = null;

        if (channelId && !prevChannel && prefs.voiceJoin) {
            const ch = ChannelStore.getChannel(channelId);
            payload = { username: name, action: `joined${ch?.name ? ` #${ch.name}` : " voice"}${suffix}`, color: StatusColors.voiceJoin, avatarUrl: avatar };
        } else if (!channelId && prevChannel && prefs.voiceLeave) {
            const ch = ChannelStore.getChannel(prevChannel);
            payload = { username: name, action: `left${ch?.name ? ` #${ch.name}` : " voice"}${suffix}`, color: StatusColors.voiceLeave, avatarUrl: avatar };
        } else if (channelId && prevChannel && channelId !== prevChannel && prefs.voiceMove) {
            const from = ChannelStore.getChannel(prevChannel)?.name ?? "…";
            const to = ChannelStore.getChannel(channelId)?.name ?? "…";
            payload = { username: name, action: `moved  #${from} → #${to}${suffix}`, color: StatusColors.voiceMove, avatarUrl: avatar };
        }

        if (payload) sendAlert(payload, prefs.style, vol);

        if (selfStream && !wasStreaming && prefs.stream) {
            const ch = channelId ? ChannelStore.getChannel(channelId) : null;
            sendAlert({ username: name, action: `started streaming${ch?.name ? ` in #${ch.name}` : ""}${suffix}`, color: StatusColors.stream, avatarUrl: avatar }, prefs.style, vol);
        }
    }
}

let subscribed = false;

export function startVoiceTracking(): void {
    if (subscribed) return;
    snapshotVoiceState();
    FluxDispatcher.subscribe("VOICE_STATE_UPDATES", handleVoiceStates);
    subscribed = true;
}

export function stopVoiceTracking(): void {
    if (!subscribed) return;
    FluxDispatcher.unsubscribe("VOICE_STATE_UPDATES", handleVoiceStates);
    lastVoiceChannel.clear();
    lastStreaming.clear();
    subscribed = false;
}
