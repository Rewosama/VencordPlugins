/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BirthdayEntry {
    userId: string;
    month: number; // 1–12
    day: number; // 1–31
    year?: number; // optional — used for age display
}

export interface BackupEntry {
    userId: string;
    username?: string;
    month: number;
    day: number;
    year?: number;
}

// ─── Keys ─────────────────────────────────────────────────────────────────────

const IDX_KEY = "birthdayReminder_index";
const bKey = (userId: string) => `birthdayReminder_${userId}`;

// ─── Cache ────────────────────────────────────────────────────────────────────

const _cache = new Map<string, BirthdayEntry>();
const _listeners = new Set<() => void>();

function notify(): void { _listeners.forEach(fn => fn()); }

// ─── Bootstrap ────────────────────────────────────────────────────────────────

export async function loadBirthdays(): Promise<void> {
    const ids = await DataStore.get<string[]>(IDX_KEY) ?? [];
    await Promise.all(ids.map(async id => {
        const entry = await DataStore.get<BirthdayEntry>(bKey(id));
        if (entry) _cache.set(id, entry);
    }));
    notify();
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export function getBirthday(userId: string): BirthdayEntry | undefined {
    return _cache.get(userId);
}

export function getAllBirthdays(): BirthdayEntry[] {
    return [..._cache.values()];
}

/** Returns birthdays for today. Feb 29 birthdays show on Feb 28 in non-leap years. */
export function getTodayBirthdays(): BirthdayEntry[] {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    return getAllBirthdays().filter(b => {
        if (b.month === month && b.day === day) return true;
        // Feb 29 birthday → show on Feb 28 when not a leap year
        if (b.month === 2 && b.day === 29 && month === 2 && day === 28) {
            const year = now.getFullYear();
            return !isLeapYear(year);
        }
        return false;
    });
}

function isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Returns upcoming birthdays sorted by days-away (next 30 days). */
export function getUpcomingBirthdays(days = 30): Array<BirthdayEntry & { daysAway: number; }> {
    const now = new Date();
    const result: Array<BirthdayEntry & { daysAway: number; }> = [];

    for (const b of getAllBirthdays()) {
        const upcoming = nextOccurrence(b.month, b.day, now);
        const msAway = upcoming.getTime() - now.getTime();
        const daysAway = Math.ceil(msAway / (1000 * 60 * 60 * 24));
        if (daysAway <= days) result.push({ ...b, daysAway });
    }

    return result.sort((a, b) => a.daysAway - b.daysAway);
}

function nextOccurrence(month: number, day: number, from: Date): Date {
    const year = from.getFullYear();
    // Build the occurrence at midnight of the target day so we compare dates, not datetimes.
    // Without this, a birthday at midnight today would compare < current time and incorrectly
    // advance to next year, giving daysAway ≈ 365 instead of 0.
    const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    let d = new Date(year, month - 1, day);
    if (d < today) d = new Date(year + 1, month - 1, day);
    return d;
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function setBirthday(userId: string, month: number, day: number, year?: number): Promise<void> {
    const entry: BirthdayEntry = { userId, month, day, year };
    _cache.set(userId, entry);

    const idx = await DataStore.get<string[]>(IDX_KEY) ?? [];
    if (!idx.includes(userId)) {
        idx.push(userId);
        await DataStore.set(IDX_KEY, idx);
    }

    await DataStore.set(bKey(userId), entry);
    notify();
}

export async function deleteBirthday(userId: string): Promise<void> {
    if (!_cache.has(userId)) return;
    _cache.delete(userId);

    const idx = (await DataStore.get<string[]>(IDX_KEY) ?? []).filter(id => id !== userId);
    await Promise.all([
        DataStore.set(IDX_KEY, idx),
        DataStore.del(bKey(userId)),
    ]);
    notify();
}

// ─── Import / Export ─────────────────────────────────────────────────────────

export function exportBirthdays(getUsername: (id: string) => string | undefined): BackupEntry[] {
    return getAllBirthdays().map(b => ({
        userId: b.userId,
        username: getUsername(b.userId),
        month: b.month,
        day: b.day,
        year: b.year,
    }));
}

export async function importBirthdays(
    entries: BackupEntry[],
    mode: "merge" | "overwrite"
): Promise<{ added: number; }> {
    let added = 0;
    for (const e of entries) {
        if (!e.userId || !e.month || !e.day) continue;
        if (mode === "merge" && _cache.has(e.userId)) continue;
        await setBirthday(e.userId, e.month, e.day, e.year);
        added++;
    }
    return { added };
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export function subscribe(fn: () => void): () => void {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
}
