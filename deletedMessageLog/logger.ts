/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";

const STORE_KEY = "deletedMessageLog_log";
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MessageSnapshot {
    content: string;
    authorId: string;
    authorName: string;
    avatarUrl?: string;
    channelId: string;
    guildId?: string;
    capturedAt: number;
    isMention: boolean;
    matchedKeyword?: string;
    attachments?: AttachmentInfo[];
}

export interface AttachmentInfo {
    url: string;
    proxyUrl?: string;
    filename: string;
    contentType?: string;
    width?: number;
    height?: number;
}

export interface DeletedMessage {
    /** Unique log entry ID — used for individual/bulk deletion. */
    uid: string;
    id: string; // Discord message ID
    deletedAt: number;
    content: string;
    authorId: string;
    authorName: string;
    avatarUrl?: string;
    channelId: string;
    channelName?: string;
    guildId?: string;
    guildName?: string;
    isMention: boolean;
    matchedKeyword?: string;
    attachments?: AttachmentInfo[];
}

// ─── State ────────────────────────────────────────────────────────────────────

const _pending = new Map<string, MessageSnapshot>();
const _log: DeletedMessage[] = [];
const _listeners = new Set<() => void>();

// ─── Internal ─────────────────────────────────────────────────────────────────

function notify(): void { _listeners.forEach(fn => fn()); }

/** Persist current log to DataStore (async, fire-and-forget). */
function persist(): void {
    DataStore.set(STORE_KEY, [..._log]);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

/** Load persisted log from DataStore. Call once in plugin start(). */
export async function loadLog(): Promise<void> {
    const stored = await DataStore.get<DeletedMessage[]>(STORE_KEY);
    if (stored && stored.length > 0) {
        _log.splice(0, _log.length, ...stored);
        notify();
    }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export function getLog(): readonly DeletedMessage[] { return _log; }

// ─── Pending tracking ─────────────────────────────────────────────────────────

export function trackMessage(messageId: string, snap: MessageSnapshot): void {
    _pending.set(messageId, snap);
}

export function updateTracked(messageId: string, newContent: string): void {
    const snap = _pending.get(messageId);
    if (snap) snap.content = newContent;
}

export function onMessageDeleted(
    messageId: string,
    channelName: string | undefined,
    guildName: string | undefined,
    maxEntries: number
): void {
    const snap = _pending.get(messageId);
    if (!snap) return;
    _pending.delete(messageId);

    _log.unshift({
        uid: crypto.randomUUID(),
        id: messageId,
        deletedAt: Date.now(),
        content: snap.content,
        authorId: snap.authorId,
        authorName: snap.authorName,
        avatarUrl: snap.avatarUrl,
        channelId: snap.channelId,
        channelName,
        guildId: snap.guildId,
        guildName,
        isMention: snap.isMention,
        matchedKeyword: snap.matchedKeyword,
        attachments: snap.attachments,
    });

    if (_log.length > maxEntries) _log.splice(maxEntries);
    persist();
    notify();
}

export function evictStale(): void {
    const cutoff = Date.now() - PENDING_TTL_MS;
    for (const [id, snap] of _pending) {
        if (snap.capturedAt < cutoff) _pending.delete(id);
    }
}

// ─── Deletion ─────────────────────────────────────────────────────────────────

/** Delete a single log entry by its uid. */
export function deleteEntry(uid: string): void {
    const i = _log.findIndex(e => e.uid === uid);
    if (i === -1) return;
    _log.splice(i, 1);
    persist();
    notify();
}

/** Delete multiple log entries by uid. */
export function deleteEntries(uids: Set<string>): void {
    const before = _log.length;
    _log.splice(0, _log.length, ..._log.filter(e => !uids.has(e.uid)));
    if (_log.length !== before) { persist(); notify(); }
}

/** Delete all log entries. Also removes from DataStore. */
export function clearLog(): void {
    _log.splice(0);
    DataStore.del(STORE_KEY);
    notify();
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export function subscribe(fn: () => void): () => void {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
}
