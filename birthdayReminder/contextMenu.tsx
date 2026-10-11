/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import type { User } from "@vencord/discord-types";
import { Menu } from "@webpack/common";

import { openSetBirthdayModal } from "./components/SetBirthdayModal";
import { getBirthday } from "./store";

const userContextPatch: NavContextMenuPatchCallback = (children, { user }: { user: User; }) => {
    if (!user) return;

    const has = !!getBirthday(user.id);

    const item = (
        <Menu.MenuItem
            id="br-set-birthday"
            label={has ? "✏️ Edit Birthday" : "🎂 Set Birthday"}
            action={() => openSetBirthdayModal(user.id, user.globalName ?? user.username)}
        />
    );

    // Always push — if we can find the block/friend group, inject nearby; otherwise append
    const group = findGroupChildrenByChildId(["add-friend", "remove-friend", "block", "remove-friend-request"], children);
    if (group) {
        group.push(item);
    } else {
        children.push(
            <Menu.MenuGroup>
                {item}
            </Menu.MenuGroup>
        );
    }
};

export const contextMenus = {
    "user-context": userContextPatch,
};
