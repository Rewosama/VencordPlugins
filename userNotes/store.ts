/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserNote {
    id: string; // UUID — unique per note
    userId: string; // which Discord user this note is about
    content: string;
    createdAt: number;
    updatedAt: number;
}

export interface BackupEntry {
    userId: string;
    username?: string;
    notes: Array<{ id: string; content: string; createdAt: number; updatedAt: number; }>;
}

// ─── DataStore keys ───────────────────────────────────────────────────────────

const IDX_KEY = "userNotes_index"; // string[]  — all userIds
const uidKey = (userId: string) => `userNotes_user_${userId}`; // string[]  — noteIds
const noteKey = (noteId: string) => `userNotes_note_${noteId}`; // UserNote

// ─── In-memory cache ──────────────────────────────────────────────────────────

const _notes = new Map<string, UserNote>(); // noteId → UserNote
const _users = new Map<string, string[]>(); // userId → noteId[]
const _listeners = new Set<() => void>();

function notify(): void { _listeners.forEach(fn => fn()); }

// ─── Bootstrap ────────────────────────────────────────────────────────────────

export async function loadNotes(): Promise<void> {
    const userIds = await DataStore.get<string[]>(IDX_KEY) ?? [];

    await Promise.all(userIds.map(async userId => {
        const noteIds = await DataStore.get<string[]>(uidKey(userId)) ?? [];
        _users.set(userId, noteIds);
        await Promise.all(noteIds.map(async id => {
            const note = await DataStore.get<UserNote>(noteKey(id));
            if (note) _notes.set(id, note);
        }));
    }));

    notify();
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/** Returns all notes for a user, newest first. */
export function getUserNotes(userId: string): UserNote[] {
    const ids = _users.get(userId) ?? [];
    return ids
        .map(id => _notes.get(id))
        .filter(Boolean)
        .sort((a, b) => (b!.createdAt - a!.createdAt)) as UserNote[];
}

export function getNote(noteId: string): UserNote | undefined {
    return _notes.get(noteId);
}

/** All users that have at least one note. */
export function getAllUserIds(): string[] {
    return [..._users.keys()].filter(uid => (_users.get(uid)?.length ?? 0) > 0);
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function addNote(userId: string, content: string): Promise<UserNote> {
    const note: UserNote = {
        id: crypto.randomUUID(),
        userId,
        content: content.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    _notes.set(note.id, note);

    const ids = _users.get(userId) ?? [];
    ids.unshift(note.id);
    _users.set(userId, ids);

    // Ensure userId is in the global index
    const idx = await DataStore.get<string[]>(IDX_KEY) ?? [];
    if (!idx.includes(userId)) {
        idx.push(userId);
        await DataStore.set(IDX_KEY, idx);
    }

    await Promise.all([
        DataStore.set(noteKey(note.id), note),
        DataStore.set(uidKey(userId), ids),
    ]);

    notify();
    return note;
}

export async function updateNote(noteId: string, content: string): Promise<void> {
    const note = _notes.get(noteId);
    if (!note) return;
    note.content = content.trim();
    note.updatedAt = Date.now();
    await DataStore.set(noteKey(noteId), { ...note });
    notify();
}

export async function deleteNote(noteId: string): Promise<void> {
    const note = _notes.get(noteId);
    if (!note) return;

    _notes.delete(noteId);
    const ids = (_users.get(note.userId) ?? []).filter(id => id !== noteId);
    _users.set(note.userId, ids);

    await Promise.all([
        DataStore.del(noteKey(noteId)),
        DataStore.set(uidKey(note.userId), ids),
    ]);

    // Clean up userId from index if no notes remain
    if (ids.length === 0) {
        _users.delete(note.userId);
        const idx = (await DataStore.get<string[]>(IDX_KEY) ?? []).filter(id => id !== note.userId);
        await DataStore.set(IDX_KEY, idx);
    }

    notify();
}

export async function deleteNotes(noteIds: Set<string>): Promise<void> {
    await Promise.all([...noteIds].map(deleteNote));
}

export async function deleteAllUserNotes(userId: string): Promise<void> {
    const ids = _users.get(userId) ?? [];
    await deleteNotes(new Set(ids));
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export function exportAll(getUsername: (id: string) => string | undefined): BackupEntry[] {
    return getAllUserIds().map(userId => ({
        userId,
        username: getUsername(userId),
        notes: getUserNotes(userId).map(n => ({
            id: n.id,
            content: n.content,
            createdAt: n.createdAt,
            updatedAt: n.updatedAt,
        })),
    }));
}

export async function importBackup(
    entries: BackupEntry[],
    mode: "merge" | "overwrite"
): Promise<{ added: number; }> {
    let added = 0;
    for (const entry of entries) {
        if (!entry.userId || !Array.isArray(entry.notes)) continue;
        if (mode === "overwrite") await deleteAllUserNotes(entry.userId);
        for (const n of entry.notes) {
            if (!n.content) continue;
            await addNote(entry.userId, n.content);
            added++;
        }
    }
    return { added };
}

// ─── Legacy cleanup ───────────────────────────────────────────────────────────

/**
 * Removes old single-note-per-user data (v1 format).
 * Old keys:  "userNotes_note_<userId>"  where userId is a Discord snowflake
 * New keys:  "userNotes_note_<uuid>"    where uuid is a crypto.randomUUID()
 *
 * Safe to call every start — it only touches keys that look like old format.
 */
export async function cleanupLegacyNotes(): Promise<void> {
    const idx = await DataStore.get<string[]>(IDX_KEY) ?? [];
    if (idx.length === 0) return;

    const staleUserIds: string[] = [];

    for (const userId of idx) {
        // Old format stored a single note at "userNotes_note_<userId>"
        // (userId = numeric Discord snowflake, no dashes)
        const legacyKey = `userNotes_note_${userId}`;
        const legacyNote = await DataStore.get<any>(legacyKey);
        if (legacyNote && typeof legacyNote.content === "string") {
            await DataStore.del(legacyKey);
        }

        // If no new-format notes exist for this user, mark for removal from index
        const newNoteIds = await DataStore.get<string[]>(uidKey(userId));
        if (!newNoteIds || newNoteIds.length === 0) {
            staleUserIds.push(userId);
        }
    }

    if (staleUserIds.length > 0) {
        const cleaned = idx.filter(id => !staleUserIds.includes(id));
        await DataStore.set(IDX_KEY, cleaned);
    }
}

export function subscribe(fn: () => void): () => void {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
}
