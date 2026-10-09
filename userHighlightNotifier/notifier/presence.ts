/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PresenceStore, RelationshipStore, UserStore } from "@webpack/common";

import { getCategories, getNotificationPrefs, getUserCategory } from "../data";
import { AlertPayload, sendAlert, StatusColors } from "./alert";
import { isWarmup } from "./state";

const lastStatus = new Map<string, string>();

function statusLabel(s: string): string {
    switch (s) {
        case "online": return "Online";
        case "idle": return "Idle";
        case "dnd": return "Do Not Disturb";
        default: return "Offline";
    }
}

function statusColor(s: string): string {
    switch (s) {
        case "online": return StatusColors.online;
        case "idle": return StatusColors.idle;
        case "dnd": return StatusColors.dnd;
        default: return StatusColors.offline;
    }
}

function getWatchedIds(): Set<string> {
    const set = new Set<string>();
    for (const cat of getCategories()) {
        for (const uid of cat.users) set.add(uid);
        if (cat.syncFriends) {
            try { for (const fid of RelationshipStore.getFriendIDs()) set.add(fid); }
            catch { /* ignore */ }
        }
    }
    return set;
}

export function snapshotPresence(): void {
    for (const uid of getWatchedIds()) {
        try { lastStatus.set(uid, PresenceStore.getStatus?.(uid) ?? "offline"); }
        catch { /* ignore */ }
    }
}

function onPresenceChange(): void {
    const prefs = getNotificationPrefs();
    if (!prefs.enabled) return;
    if (!prefs.online && !prefs.offline && !prefs.statusChange) return;

    const myId = UserStore.getCurrentUser()?.id;

    for (const uid of getWatchedIds()) {
        if (uid === myId) continue;

        const cat = getUserCategory(uid);
        if (!cat || cat.notificationsEnabled === false) continue;

        let current = "offline";
        try { current = PresenceStore.getStatus?.(uid) ?? "offline"; }
        catch { continue; }

        const prev = lastStatus.get(uid);
        if (prev === undefined) { lastStatus.set(uid, current); continue; }
        if (prev === current) continue;
        lastStatus.set(uid, current);
        if (isWarmup()) continue;

        const user = UserStore.getUser(uid);
        const name = user?.globalName ?? user?.username ?? "A user";
        const avatar = user?.getAvatarURL?.(undefined, 64);
        const vol = prefs.sound ? prefs.soundVolume : 0;

        const wasOnline = prev !== "offline";
        const isOnline = current !== "offline";

        let payload: AlertPayload | null = null;

        if (!wasOnline && isOnline && prefs.online) {
            payload = { username: name, action: `is now ${statusLabel(current).toLowerCase()}`, color: statusColor(current), avatarUrl: avatar };
        } else if (wasOnline && !isOnline && prefs.offline) {
            payload = { username: name, action: "went offline", color: StatusColors.offline, avatarUrl: avatar };
        } else if (wasOnline && isOnline && prefs.statusChange) {
            payload = { username: name, action: `${statusLabel(prev)} → ${statusLabel(current)}`, color: statusColor(current), avatarUrl: avatar };
        }

        if (payload) sendAlert(payload, prefs.style, vol);
    }
}

let listening = false;

export function startPresenceTracking(): void {
    if (listening) return;
    snapshotPresence();
    try { PresenceStore.addChangeListener?.(onPresenceChange); } catch { /* ignore */ }
    listening = true;
}

export function stopPresenceTracking(): void {
    if (!listening) return;
    try { PresenceStore.removeChangeListener?.(onPresenceChange); } catch { /* ignore */ }
    lastStatus.clear();
    listening = false;
}

export function refreshPresenceSnapshot(): void {
    snapshotPresence();
}
