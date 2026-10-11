/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

// ─── Category ────────────────────────────────────────────────────────────────

export interface HighlightCategory {
    id: string;
    name: string;
    color: number;
    color2?: number;
    users: string[];
    syncFriends?: boolean;
    syncSelf?: boolean; // auto-include the current user (Me)
    highlightVoice?: boolean;
    highlightMemberList?: boolean;
    highlightMessages?: boolean;
    notificationsEnabled?: boolean; // per-category notification toggle
}

// ─── Notification preferences (stored in DataStore, not definePluginSettings) ─

export interface NotificationPrefs {
    enabled: boolean;
    // Voice events
    voiceJoin: boolean;
    voiceLeave: boolean;
    voiceMove: boolean;
    stream: boolean;
    ignoreSameVoice: boolean;
    // Presence events
    online: boolean;
    offline: boolean;
    statusChange: boolean;
    // Display
    style: "toast" | "card" | "both";
    sound: boolean;
    soundVolume: number; // 0–100
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
    enabled: false,
    voiceJoin: true,
    voiceLeave: true,
    voiceMove: true,
    stream: true,
    ignoreSameVoice: true,
    online: true,
    offline: false,
    statusChange: false,
    style: "toast",
    sound: true,
    soundVolume: 50,
};

// ─── Color utils ─────────────────────────────────────────────────────────────

export function numToHex(n: number): string {
    return `#${(n & 0xFFFFFF).toString(16).padStart(6, "0")}`;
}

export function hexToNum(hex: string): number {
    return parseInt(hex.replace("#", ""), 16);
}

export function hexAlpha(hexColor: string, alphaHex: string): string {
    const n = parseInt(hexColor.slice(1), 16);
    const r = (n >> 16) & 0xFF;
    const g = (n >> 8) & 0xFF;
    const b = n & 0xFF;
    const a = (parseInt(alphaHex, 16) / 255).toFixed(3);
    return `rgba(${r},${g},${b},${a})`;
}

export function colorBg(cat: HighlightCategory, alpha: string): string {
    const c1 = hexAlpha(numToHex(cat.color), alpha);
    if (!cat.color2) return c1;
    const c2 = hexAlpha(numToHex(cat.color2), alpha);
    return `linear-gradient(90deg, ${c1}, ${c2})`;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_COLOR = 0x5865F2;

export const DEFAULT_CATEGORIES: HighlightCategory[] = [
    {
        id: "default-me",
        name: "Me",
        color: 0x06b6d4, // cyan
        users: [],
        syncSelf: true,
        highlightVoice: true,
        highlightMemberList: true,
        highlightMessages: true,
        notificationsEnabled: false, // no notifications for yourself
    },
    {
        id: "default-friends",
        name: "Friends",
        color: 0x10b981,
        users: [],
        syncFriends: true,
        highlightVoice: true,
        highlightMemberList: true,
        highlightMessages: true,
        notificationsEnabled: true,
    },
];

// ─── Plugin-level settings (keep minimal — just what must live in Vencord settings)

export const settings = definePluginSettings({
    highlightInDMs: {
        type: OptionType.BOOLEAN,
        default: false,
        displayName: "Highlight in DMs",
        description: "Also highlight users in direct messages and group chats",
    },
});
