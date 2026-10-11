/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useForceUpdater } from "@utils/react";
import { Tooltip, useEffect, UserStore } from "@webpack/common";

import { getUserNotes, subscribe } from "../store";
import { openUserNotesModal } from "./UserNotesModal";

export function ProfileButton({ userId }: { userId: string; }) {
    const forceUpdate = useForceUpdater();
    useEffect(() => subscribe(forceUpdate), [userId]);

    const notes = getUserNotes(userId);
    const count = notes.length;
    const user = UserStore.getUser(userId);
    const name = user?.globalName ?? user?.username ?? userId;

    const tooltipText = count > 0
        ? `Notes (${count})`
        : "Add notes";

    return (
        <Tooltip text={tooltipText}>
            {({ onMouseEnter, onMouseLeave }) => (
                <button
                    aria-label={tooltipText}
                    onClick={e => { e.stopPropagation(); openUserNotesModal(userId, name); }}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative" as const,
                        verticalAlign: "middle",
                        flexShrink: 0,
                        borderRadius: "4px",
                        color: "rgba(255,255,255,0.6)",
                        transition: "color 0.15s",
                    }}
                    onMouseOver={e => { e.currentTarget.style.color = "rgba(255,255,255,1)"; }}
                    onMouseOut={e => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                >
                    {/* Notepad icon */}
                    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            fill="currentColor"
                            d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"
                        />
                    </svg>

                    {/* Small dot when notes exist */}
                    {count > 0 && (
                        <span style={{
                            position: "absolute" as const,
                            top: "2px",
                            right: "2px",
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "var(--brand-500)",
                        }} />
                    )}
                </button>
            )}
        </Tooltip>
    );
}
