/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Public API for the notifier subsystem.
 * Call startNotifier() in plugin start() and stopNotifier() in stop().
 * The CONNECTION_OPEN flux event should call onConnectionOpen().
 */

import { startPresenceTracking, stopPresenceTracking } from "./presence";
import { markConnected, markDisconnected } from "./state";
import { snapshotVoiceState, startVoiceTracking, stopVoiceTracking } from "./voice";

export function startNotifier(): void {
    startVoiceTracking();
    startPresenceTracking();
}

export function stopNotifier(): void {
    stopVoiceTracking();
    stopPresenceTracking();
    markDisconnected();
}

/**
 * Called when Discord re-establishes its gateway connection.
 * Resets the warmup timer and re-syncs current voice/presence state.
 */
export function onConnectionOpen(): void {
    markConnected();
    // Re-snapshot after a short delay to let the gateway finish sending
    // initial state updates.
    setTimeout(() => {
        snapshotVoiceState();
    }, 2_000);
}
