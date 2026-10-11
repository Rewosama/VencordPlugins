/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, useMemo, UserStore } from "@webpack/common";

import { removeUserFromHighlight } from "../data";

interface UserRowProps {
    userId: string;
}

export function UserRow({ userId }: UserRowProps) {
    const user = useMemo(() => UserStore.getUser(userId), [userId]);
    const displayName = user?.globalName ?? user?.username ?? userId;

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "5px 8px",
            background: "var(--background-tertiary)",
            borderRadius: "4px",
        }}>
            <span style={{
                flex: 1,
                fontSize: "14px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: "var(--text-normal)",
            }}>
                {displayName}
            </span>
            <span style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                flexShrink: 0,
            }}>
                {userId}
            </span>
            <Button
                size={Button.Sizes.SMALL}
                color={Button.Colors.RED}
                onClick={() => removeUserFromHighlight(userId)}
            >
                Remove
            </Button>
        </div>
    );
}
