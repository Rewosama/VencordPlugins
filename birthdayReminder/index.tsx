/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { openUserProfileModal, Text, useEffect, UserStore } from "@webpack/common";

import { SettingsPanel } from "./components/SettingsPanel";
import { contextMenus } from "./contextMenu";
import { BirthdayEntry, getTodayBirthdays, loadBirthdays, subscribe } from "./store";

// ─── Midnight timer ───────────────────────────────────────────────────────────

let _midnightTimer: ReturnType<typeof setTimeout> | null = null;

function msUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    return midnight.getTime() - now.getTime();
}

function checkAndNotify(): void {
    const today = getTodayBirthdays();
    if (today.length === 0) return;

    const thisYear = new Date().getFullYear();

    if (today.length === 1) {
        const b = today[0];
        const u = UserStore.getUser(b.userId);
        const name = u?.globalName ?? u?.username ?? b.userId;
        const agePart = b.year != null ? ` (turns ${thisYear - b.year})` : "";
        showNotification({
            title: `🎂 Birthday: ${name}!`,
            body: `Today is ${name}'s birthday${agePart}. Don't forget to wish them well!`,
        });
    } else {
        const names = today.map(b => {
            const u = UserStore.getUser(b.userId);
            const name = u?.globalName ?? u?.username ?? b.userId;
            return b.year != null ? `${name} (${thisYear - b.year})` : name;
        });
        showNotification({
            title: `🎂 ${today.length} birthdays today!`,
            body: names.join(", "),
        });
    }
}

function scheduleMidnight(): void {
    if (_midnightTimer) clearTimeout(_midnightTimer);
    _midnightTimer = setTimeout(() => {
        checkAndNotify();
        scheduleMidnight(); // reschedule for next midnight
    }, msUntilMidnight());
}

// ─── Settings ─────────────────────────────────────────────────────────────────

const settings = definePluginSettings({
    showInDmList: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show a birthday section above the DM list on the home page",
        restartNeeded: true,
    },
    midnightNotification: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show a notification at midnight when it's someone's birthday",
    },
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default definePlugin({
    name: "birthdayReminder",
    description: "Remember birthdays for Discord users. Shows a section above DMs and notifies at midnight.",
    authors: [{ name: "Rewosama", id: 0n }],
    tags: ["Utility", "Friends"],
    settings,

    contextMenus,
    settingsAboutComponent: SettingsPanel,

    patches: [
        // ── Inner PrivateChannelsList: inject birthday section into the sections list ──────
        //
        // The class component found by '"dm-quick-launcher"===' renders the DM sidebar via a
        // virtualised list.  Its render options object contains:
        //   { renderRow: this.renderRow, sections: [...counts], ... }
        //
        // We mirror what pinDms does:
        //   1. Splice our section (header row + N birthday rows) at index 1 (after the nav
        //      items section, before the "DIRECT MESSAGES" / DM channels section).
        //   2. Return null from renderSection so no extra divider is shown for our section.
        //   3. Return our row JSX from renderRow when the section index matches.
        //   4. Return a fixed pixel height from getRowHeight for our rows.
        //   5. Offset the "section-divider" index check so the DMs header lands on the right
        //      section now that ours has been inserted.
        {
            find: '"dm-quick-launcher"===',
            replacement: [
                {
                    // Splice our section into the sections array.
                    // Pattern: the sections prop passed to the virtualised list ends in `1)` —
                    // e.g. sections:[getRenderedPrivateChannelCount()+1]
                    match: /(?<=renderRow:this\.renderRow,)sections:\[.+?1\)]/,
                    replace: "...$self.makeBirthdayProps(this,{$&})"
                },
                {
                    // renderSection: let our section be invisible (no divider header).
                    match: /renderSection(?:",|=)(\i)=>{/,
                    replace: "$&if($self.isBirthdaySection($1.section))return null;"
                },
                {
                    // renderRow: intercept rows that belong to our section.
                    match: /renderRow(?:",|=)(\i)=>{/,
                    replace: "$&if($self.isBirthdaySection($1.section))return $self.renderBirthdayRow($1.row);"
                },
                {
                    // getRowHeight: fixed heights so the virtualised list can lay out correctly.
                    match: /getRowHeight(?:",|=)\((\i),(\i)\)=>{/,
                    replace: "$&if($self.isBirthdaySection($1))return $2===0?28:44;"
                },
                {
                    // The "section-divider" height check originally reads `return 1 === sectionIndex`.
                    // After we insert a section at index 1 the DM section moves to index 2, so we
                    // subtract our offset to keep the check pointing at the right section.
                    match: /(\.startsWith\("section-divider"\).+?return 1===)(\i)/,
                    replace: "$1($2-$self.birthdaySectionOffset())"
                }
            ],
            predicate: () => settings.store.showInDmList,
        },

        // ── Outer wrapper: hook to re-render when today's birthdays change ───────────────
        //
        // The outer wrapper component (found by '.FRIENDS},"friends"') renders the whole home
        // sidebar.  pinDms already uses this find to inject `usePinnedDms()`.  We inject our
        // own hook the same way so the sidebar re-renders whenever the birthday list changes.
        {
            find: '.FRIENDS},"friends"',
            replacement: {
                match: /let\{showLibrary:\i,/,
                replace: "$self.useBirthdaySection();$&"
            },
            predicate: () => settings.store.showInDmList,
        },
    ],

    // ─── State shared across render calls ──────────────────────────────────────

    /** Section index within the virtualised list where birthdays are rendered.
     *  null when no birthdays are due today. */
    birthdaySectionIndex: null as number | null,

    /** Snapshot of today's birthdays taken in makeBirthdayProps and reused by
     *  renderBirthdayRow so getTodayBirthdays() is filtered only once per render. */
    _todayBirthdays: null as BirthdayEntry[] | null,

    // ─── Patch helpers ─────────────────────────────────────────────────────────

    /**
     * Called from the patched sections prop of the inner PrivateChannelsList.
     * Splices the birthday section in at index 1 when there are birthdays today.
     */
    makeBirthdayProps(instance: unknown, { sections }: { sections: number[]; }) {
        this._todayBirthdays = getTodayBirthdays();
        const birthdays = this._todayBirthdays;

        if (birthdays.length === 0) {
            this.birthdaySectionIndex = null;
            return { sections };
        }
        const newSections = [...sections];
        // 1 header row + N birthday rows
        newSections.splice(1, 0, birthdays.length + 1);
        this.birthdaySectionIndex = 1;
        return { sections: newSections };
    },

    /** Returns 1 when the birthday section is active, 0 otherwise.
     *  Used to shift the "section-divider" index check. */
    birthdaySectionOffset(): number {
        return this.birthdaySectionIndex !== null ? 1 : 0;
    },

    /** Returns true when `sectionIndex` belongs to our birthday section. */
    isBirthdaySection(sectionIndex: number): boolean {
        return this.birthdaySectionIndex !== null && sectionIndex === this.birthdaySectionIndex;
    },

    /**
     * Renders a single row in the birthday section.
     * row 0  → "🎂 Birthdays Today" header (28 px)
     * row 1+ → individual birthday entries  (44 px each)
     */
    renderBirthdayRow(rowIndex: number) {
        if (rowIndex === 0) {
            // ── Section header row ──────────────────────────────────────────
            return (
                <ErrorBoundary noop>
                    <div style={{
                        height: "28px",
                        display: "flex", alignItems: "center", gap: "6px",
                        padding: "0 12px",
                    }}>
                        <span style={{ fontSize: "11px", lineHeight: 1 }}>🎂</span>
                        <Text
                            variant="text-xs/semibold"
                            style={{
                                color: "var(--text-muted)",
                                textTransform: "uppercase" as const,
                                letterSpacing: "0.06em",
                            }}
                        >
                            Birthdays Today
                        </Text>
                    </div>
                </ErrorBoundary>
            );
        }

        // ── Birthday entry row ──────────────────────────────────────────────
        const b = (this._todayBirthdays ?? getTodayBirthdays())[rowIndex - 1];
        if (!b) return null;

        const user = UserStore.getUser(b.userId);
        const username = user?.globalName ?? user?.username ?? b.userId;
        const age = b.year != null ? new Date().getFullYear() - b.year : null;

        return (
            <ErrorBoundary noop>
                <div
                    style={{
                        height: "44px",
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: "0 8px",
                        cursor: "pointer",
                    }}
                    onClick={() => openUserProfileModal({ userId: b.userId })}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "var(--background-modifier-hover)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                >
                    {user?.getAvatarURL && (
                        <img
                            src={user.getAvatarURL(undefined, 24)}
                            alt=""
                            style={{ width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0 }}
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                    )}
                    <Text
                        variant="text-sm/medium"
                        style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                        {username}
                    </Text>
                    {age !== null && (
                        <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                            🎉 {age}
                        </Text>
                    )}
                </div>
            </ErrorBoundary>
        );
    },

    /**
     * React hook injected into the outer wrapper component.
     * Subscribes to birthday store changes so the sidebar re-renders when needed.
     */
    useBirthdaySection() {
        const forceUpdate = useForceUpdater();
        useEffect(() => subscribe(forceUpdate), []);
    },

    // ─── Lifecycle ─────────────────────────────────────────────────────────────

    async start() {
        await loadBirthdays();

        if (settings.store.midnightNotification) {
            checkAndNotify();
            scheduleMidnight();
        }
    },

    stop() {
        if (_midnightTimer) { clearTimeout(_midnightTimer); _midnightTimer = null; }
    },
});
