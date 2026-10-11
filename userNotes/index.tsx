/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin from "@utils/types";

import { AllNotesPanel } from "./components/AllNotesPanel";
import { ProfileButton } from "./components/ProfileButton";
import { contextMenus } from "./contextMenu";
import { settings } from "./settings";
import { cleanupLegacyNotes, loadNotes } from "./store";

export default definePlugin({
    name: "userNotes",
    description: "Attach multiple private notes to any Discord user. Access via right-click or the Notes button in their profile.",
    authors: [{ name: "Rewosama", id: 0n }],
    tags: ["Utility"],

    contextMenus,
    settings,
    settingsAboutComponent: AllNotesPanel,

    patches: [
        // ── Inject Notes icon into the profile action area ─────────────────
        // "#{intl::USER_PROFILE_PRONOUNS}" covers all three profile views:
        // mini popout, DM side panel, full profile modal.
        // Same approach as userVoiceShow — injects a small icon into the
        // trailing element next to the username display.
        {
            find: "#{intl::USER_PROFILE_PRONOUNS}",
            replacement: {
                match: /(user:(\i).{0,100}onClickDisplayName:\i,trailing:)(\i)/,
                replace: "$1[$self.profileButton({userId:$2.id}),$3]"
            }
        },
    ],

    profileButton({ userId }: { userId: string; }) {
        if (!userId) return null;
        return (
            <ErrorBoundary noop>
                <ProfileButton userId={userId} />
            </ErrorBoundary>
        );
    },

    async start() {
        await cleanupLegacyNotes(); // remove old single-note-per-user format
        await loadNotes();
    },
});
