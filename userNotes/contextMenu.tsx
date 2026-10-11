/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import type { User } from "@vencord/discord-types";
import { Menu } from "@webpack/common";

import { openUserNotesModal } from "./components/UserNotesModal";

const userContextPatch: NavContextMenuPatchCallback = (children, { user }: { user: User; }) => {
    if (!user) return;

    const item = (
        <Menu.MenuItem
            id="un-notes"
            label="Notes"
            action={() => openUserNotesModal(user.id, user.globalName ?? user.username)}
        />
    );

    const group = findGroupChildrenByChildId(["add-friend", "remove-friend", "block"], children);
    if (group) group.push(item);
    else children.push(item);
};

export const contextMenus = {
    "user-context": userContextPatch,
};
