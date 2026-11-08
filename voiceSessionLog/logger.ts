/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Pure in-memory session and log management.
 * No Discord imports — all Discord-specific data is resolved by index.tsx
 * and passed in as plain strings.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type VoiceEventType = "join" | "leave" | "move" | "stream";

export interface VoiceLogEntry {
    ts: number;
    userId: string;
    username: string;
    avatarUrl?: string;
    event: VoiceEventType;
    channelName?: string; // joined/moved-to channel
    fromChannelName?: string; // moved-from channel
}

export interface VoiceSession {
    id: string;
    channelId: string;
    channelName: string;
    guildName?: string;
    startedAt: number;
    endedAt?: number;
    entries: VoiceLogEntry[];
}

// ─── State ───────────────────────────────────────────────────────────────────

const MAX_PAST_SESSIONS = 50;

let _current: VoiceSession | null = null;
const _past: VoiceSession[] = [];

const _listeners = new Set<() => void>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function notify(): void {
    _listeners.forEach(fn => fn());
}

// ─── Read ────────────────────────────────────────────────────────────────────

export function getCurrentSession(): VoiceSession | null {
    return _current;
}

export function getPastSessions(): VoiceSession[] {
    return _past;
}

// ─── Write ───────────────────────────────────────────────────────────────────

export function startSession(
    channelId: string,
    channelName: string,
    guildName?: string
): void {
    if (_current) endSession();
    _current = {
        id: crypto.randomUUID(),
        channelId,
        channelName,
        guildName,
        startedAt: Date.now(),
        entries: [],
    };
    notify();
}

export function endSession(): void {
    if (!_current) return;
    _current.endedAt = Date.now();
    _past.unshift({ ..._current, entries: [..._current.entries] });
    if (_past.length > MAX_PAST_SESSIONS) _past.pop();
    _current = null;
    notify();
}

export function addEntry(entry: Omit<VoiceLogEntry, "ts">): void {
    if (!_current) return;
    _current.entries.push({ ts: Date.now(), ...entry });
    notify();
}

export function clearCurrentEntries(): void {
    if (!_current) return;
    _current.entries = [];
    notify();
}

export function clearAll(): void {
    _current = null;
    _past.splice(0);
    notify();
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

/** Subscribe to any log change. Returns an unsubscribe function. */
export function subscribe(fn: () => void): () => void {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
}
