/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Shared warmup state.
 *
 * When Discord connects, there is a burst of voice/presence events as the
 * gateway rehydrates the client. We ignore notifications for a short window
 * after connection so users are not spammed on startup.
 */

const WARMUP_MS = 15_000;

let connectedAt = 0;
let connected = false;

export function markConnected(): void {
    connected = true;
    connectedAt = Date.now();
}

export function markDisconnected(): void {
    connected = false;
    connectedAt = 0;
}

export function isWarmup(): boolean {
    if (!connected) return true;
    return Date.now() - connectedAt < WARMUP_MS;
}
