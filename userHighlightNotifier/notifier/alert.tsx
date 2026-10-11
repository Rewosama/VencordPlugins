/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Handles displaying notifications (in-app card and/or toast)
 * and playing the optional chime sound.
 */

import { showNotification } from "@api/Notifications";
import { showToast } from "@webpack/common";

// ─── Status colors ────────────────────────────────────────────────────────────

export const StatusColors = {
    online: "#23a55a",
    idle: "#f0b232",
    dnd: "#f23f43",
    offline: "#80848e",
    voiceJoin: "#23a55a",
    voiceMove: "#5865f2",
    voiceLeave: "#f23f43",
    stream: "#593695",
} as const;

// ─── Sound ────────────────────────────────────────────────────────────────────

/** Plays a short two-tone chime using the Web Audio API. */
export function playChime(volume: number): void {
    if (volume <= 0) return;
    try {
        const AudioCtx = window.AudioContext ?? (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
        const v = 0.08 * (volume / 100);
        gain.gain.setValueAtTime(v, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.28);
    } catch { /* AudioContext unavailable */ }
}

// ─── Alert ────────────────────────────────────────────────────────────────────

export interface AlertPayload {
    username: string;
    action: string;
    color: string;
    avatarUrl?: string;
}

/**
 * Sends a notification in the requested style.
 * "card"  → Vencord in-app notification card (top-right corner)
 * "toast" → Discord bottom toast bar
 * "both"  → card + toast
 */
export function sendAlert(
    payload: AlertPayload,
    style: string,
    volume: number
): void {
    const { username, action, color, avatarUrl } = payload;

    if (volume > 0) playChime(volume);

    if (style === "card" || style === "both") {
        try {
            showNotification({
                title: username,
                body: action,
                icon: avatarUrl,
                color,
            });
        } catch { /* ignored */ }
    }

    if (style === "toast" || style === "both") {
        showToast(`${username} ${action}`);
    }
}
