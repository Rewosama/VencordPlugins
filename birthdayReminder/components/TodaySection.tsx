/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Birthday section injected above the DM list on Discord's home page.
 * Only rendered when there are birthdays today.
 */

import { useForceUpdater } from "@utils/react";
import { openUserProfileModal, Text, useEffect, UserStore } from "@webpack/common";

import { getTodayBirthdays, subscribe } from "../store";

function calcAge(year: number): number {
    return new Date().getFullYear() - year;
}

export function TodaySection() {
    const forceUpdate = useForceUpdater();
    useEffect(() => subscribe(forceUpdate), []);

    const birthdays = getTodayBirthdays();
    if (birthdays.length === 0) return null;

    return (
        <div style={{
            padding: "8px 8px 4px",
            borderBottom: "1px solid var(--background-modifier-accent)",
        }}>
            {/* Header */}
            <div style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "0 4px 6px",
            }}>
                <span style={{ fontSize: "14px" }}>🎂</span>
                <Text variant="text-xs/semibold" style={{
                    color: "var(--text-muted)",
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    flex: 1,
                }}>
                    Birthdays Today
                </Text>
            </div>

            {/* Birthday list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                {birthdays.map(b => {
                    const user = UserStore.getUser(b.userId);
                    const username = user?.globalName ?? user?.username ?? b.userId;
                    const age = b.year ? calcAge(b.year) : null;

                    return (
                        <div
                            key={b.userId}
                            onClick={() => openUserProfileModal({ userId: b.userId })}
                            style={{
                                display: "flex", alignItems: "center", gap: "8px",
                                padding: "4px 6px", borderRadius: "6px",
                                cursor: "pointer",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "var(--background-modifier-hover)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                        >
                            {user?.getAvatarURL && (
                                <img
                                    src={user.getAvatarURL(undefined, 24)} alt=""
                                    style={{ width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0 }}
                                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                            )}
                            <Text variant="text-sm/medium" style={{ flex: 1, color: "var(--text-normal)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {username}
                            </Text>
                            {age !== null && (
                                <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                                    🎉 {age}
                                </Text>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
