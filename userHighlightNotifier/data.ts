/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { RelationshipStore, UserStore } from "@webpack/common";

import { DEFAULT_CATEGORIES, DEFAULT_NOTIFICATION_PREFS, HighlightCategory, NotificationPrefs, settings } from "./settings";

// ─── Storage keys ────────────────────────────────────────────────────────────

const KEY_CATS = "userHighlightNotifier_categories";
const KEY_IGNORED = "userHighlightNotifier_ignoredGuilds";
const KEY_NOTIF = "userHighlightNotifier_notificationPrefs";

// ─── In-memory state ─────────────────────────────────────────────────────────
// Data lives here during runtime; DataStore provides persistence.

let _categories: HighlightCategory[] = [];
let _ignoredGuilds: string[] = [];
let _notifPrefs: NotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS };

// ─── Callbacks ───────────────────────────────────────────────────────────────

let _forceUpdateUI: (() => void) | null = null;
let _onCategoriesChange: (() => void) | null = null;

export function registerForceUpdate(fn: () => void): void {
    _forceUpdateUI = fn;
}

export function registerOnCategoriesChange(fn: () => void): void {
    _onCategoriesChange = fn;
}

function notifyAll(): void {
    _forceUpdateUI?.();
    _onCategoriesChange?.();
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

/** Called once in plugin start(). Loads persisted data from DataStore. */
export async function loadData(): Promise<void> {
    const [cats, ignored, notif] = await Promise.all([
        DataStore.get<HighlightCategory[]>(KEY_CATS),
        DataStore.get<string[]>(KEY_IGNORED),
        DataStore.get<NotificationPrefs>(KEY_NOTIF),
    ]);
    let migratedCats = cats ?? [...DEFAULT_CATEGORIES];

    // Migration: users who installed before "Me" was added won't have a syncSelf category.
    // Prepend the default Me category so it appears at the top of the list.
    if (!migratedCats.some(c => c.syncSelf)) {
        const meCat = DEFAULT_CATEGORIES.find(c => c.syncSelf);
        if (meCat) {
            migratedCats = [{ ...meCat }, ...migratedCats];
            DataStore.set(KEY_CATS, migratedCats);
        }
    }

    _categories = migratedCats;
    _ignoredGuilds = ignored ?? [];
    _notifPrefs = notif ? { ...DEFAULT_NOTIFICATION_PREFS, ...notif } : { ...DEFAULT_NOTIFICATION_PREFS };
}

// ─── Categories — read ───────────────────────────────────────────────────────

export function getCategories(): HighlightCategory[] {
    return _categories;
}

/**
 * Returns the topmost matching category for a user (priority = list order).
 *
 * Precedence rules checked per-category in order:
 *   1. Manual assignment  (users[])
 *   2. syncSelf           (current user)
 *   3. syncFriends        (Discord friends)
 *
 * Mention highlighting in chat is never overridden — the DOM marker and CSS
 * both skip message rows that carry Discord's "mentioned" class.
 */
export function getUserCategory(userId: string): HighlightCategory | undefined {
    let friendStatus: boolean | null = null;
    let selfId: string | null = null;

    for (const cat of _categories) {
        if (cat.users.includes(userId)) return cat;

        if (cat.syncSelf) {
            if (selfId === null) {
                try { selfId = UserStore.getCurrentUser()?.id ?? null; }
                catch { selfId = null; }
            }
            if (selfId && userId === selfId) return cat;
        }

        if (cat.syncFriends) {
            if (friendStatus === null) {
                try { friendStatus = RelationshipStore.isFriend(userId); }
                catch { friendStatus = false; }
            }
            if (friendStatus) return cat;
        }
    }
    return undefined;
}

export function isSyncedFriend(userId: string, category: HighlightCategory): boolean {
    return !!category.syncFriends && !category.users.includes(userId);
}

// ─── Categories — write ──────────────────────────────────────────────────────
// All writes are optimistic: update in-memory + notify immediately,
// persist to DataStore in the background.

function commitCategories(cats: HighlightCategory[]): void {
    _categories = cats;
    notifyAll();
    DataStore.set(KEY_CATS, cats);
}

export function createCategoryEntry(
    name: string, color: number,
    opts: Partial<Pick<HighlightCategory, "color2" | "syncFriends" | "syncSelf" | "highlightVoice" | "highlightMemberList" | "highlightMessages">> = {}
): void {
    commitCategories([..._categories, { id: crypto.randomUUID(), name, color, users: [], ...opts }]);
}

export function deleteCategoryEntry(categoryId: string): void {
    commitCategories(_categories.filter(c => c.id !== categoryId));
}

export function updateCategoryEntry(
    categoryId: string, name: string, color: number,
    opts: Partial<Pick<HighlightCategory, "color2" | "syncFriends" | "syncSelf" | "highlightVoice" | "highlightMemberList" | "highlightMessages">>
): void {
    commitCategories(_categories.map(c => c.id === categoryId ? { ...c, name, color, ...opts } : c));
}

export function addUserToCategory(userId: string, categoryId: string): void {
    commitCategories(_categories.map(c => ({
        ...c,
        users: c.id === categoryId
            ? [...new Set([...c.users.filter(id => id !== userId), userId])]
            : c.users.filter(id => id !== userId),
    })));
}

export function removeUserFromHighlight(userId: string): void {
    commitCategories(_categories.map(c => ({ ...c, users: c.users.filter(id => id !== userId) })));
}

export function reorderCategories(fromIndex: number, toIndex: number): void {
    const cats = [..._categories];
    const [moved] = cats.splice(fromIndex, 1);
    cats.splice(toIndex, 0, moved);
    commitCategories(cats);
}

export function moveCategoryUp(categoryId: string): void {
    const i = _categories.findIndex(c => c.id === categoryId);
    if (i > 0) reorderCategories(i, i - 1);
}

export function moveCategoryDown(categoryId: string): void {
    const i = _categories.findIndex(c => c.id === categoryId);
    if (i >= 0 && i < _categories.length - 1) reorderCategories(i, i + 1);
}

export function toggleCategoryHighlight(
    categoryId: string,
    field: "highlightVoice" | "highlightMemberList" | "highlightMessages" | "notificationsEnabled"
): void {
    const cat = _categories.find(c => c.id === categoryId);
    if (!cat) return;
    const current = cat[field] !== false;
    commitCategories(_categories.map(c => c.id === categoryId ? { ...c, [field]: !current } : c));
}

// ─── Ignored guilds ───────────────────────────────────────────────────────────

export function getIgnoredGuilds(): string[] {
    return _ignoredGuilds;
}

export function isGuildIgnored(guildId: string): boolean {
    return _ignoredGuilds.includes(guildId);
}

/** Whether highlighting should run in DMs/group chats. */
export function isHighlightInDMs(): boolean {
    try { return settings.store.highlightInDMs; } catch { return false; }
}

// ─── Notification prefs ───────────────────────────────────────────────────────

export function getNotificationPrefs(): NotificationPrefs {
    return _notifPrefs;
}

export function updateNotificationPrefs(patch: Partial<NotificationPrefs>): void {
    _notifPrefs = { ..._notifPrefs, ...patch };
    DataStore.set(KEY_NOTIF, _notifPrefs);
    notifyAll();
}

// ─── Bulk import (restore from backup) ───────────────────────────────────────

export interface BackupData {
    version: number;
    exportedAt: string;
    categories: HighlightCategory[];
    ignoredGuilds: string[];
    notificationPrefs: NotificationPrefs;
}

/** Replaces all in-memory data with a previously exported backup. */
export function importAllData(backup: Partial<BackupData>): void {
    if (Array.isArray(backup.categories)) commitCategories(backup.categories);
    if (Array.isArray(backup.ignoredGuilds)) {
        _ignoredGuilds = [...backup.ignoredGuilds];
        DataStore.set(KEY_IGNORED, _ignoredGuilds);
    }
    if (backup.notificationPrefs && typeof backup.notificationPrefs === "object") {
        _notifPrefs = { ...DEFAULT_NOTIFICATION_PREFS, ...backup.notificationPrefs };
        DataStore.set(KEY_NOTIF, _notifPrefs);
    }
    notifyAll();
}

export function addIgnoredGuild(guildId: string): void {
    if (isGuildIgnored(guildId)) return;
    _ignoredGuilds = [..._ignoredGuilds, guildId];
    DataStore.set(KEY_IGNORED, _ignoredGuilds);
    notifyAll();
}

export function removeIgnoredGuild(guildId: string): void {
    _ignoredGuilds = _ignoredGuilds.filter(id => id !== guildId);
    DataStore.set(KEY_IGNORED, _ignoredGuilds);
    notifyAll();
}
