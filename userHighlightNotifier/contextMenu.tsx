/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import type { User } from "@vencord/discord-types";
import { Menu } from "@webpack/common";

import { openCategoryModal } from "./components/CategoryModal";
import {
    addIgnoredGuild,
    addUserToCategory,
    getCategories,
    getUserCategory,
    isGuildIgnored,
    isSyncedFriend,
    removeIgnoredGuild,
    removeUserFromHighlight,
} from "./data";

// ─── User context menu ────────────────────────────────────────────────────────

const userContextPatch: NavContextMenuPatchCallback = (children, { user }: { user: User; }) => {
    if (!user) return;

    const categories = getCategories();
    const current = getUserCategory(user.id);

    // A user is "synced" when they appear in a category automatically (syncFriends or syncSelf)
    // rather than being manually added via the users[] array.
    const synced = current
        ? (isSyncedFriend(user.id, current) || !!current.syncSelf)
        : false;

    // Categories valid as manual assignment targets:
    // ─ exclude syncSelf ("Me") — you can't manually add someone to your own Me category
    const assignable = categories.filter(c => !c.syncSelf);

    const items: React.ReactNode[] = [];

    if (current) {
        // Manual removal — not applicable for auto-synced categories
        if (!synced) {
            items.push(
                <Menu.MenuItem
                    key="remove"
                    id="vc-uh-remove"
                    label={`Remove from "${current.name}"`}
                    color="danger"
                    action={() => removeUserFromHighlight(user.id)}
                />
            );
        }

        // Move / override options — only show non-syncSelf categories
        const others = assignable.filter(c => c.id !== current.id);
        if (others.length > 0) {
            // Only add a separator when there is already something above it
            if (items.length > 0) items.push(<Menu.MenuSeparator key="sep-move" />);
            for (const cat of others) {
                items.push(
                    <Menu.MenuItem
                        key={`move-${cat.id}`}
                        id={`vc-uh-move-${cat.id}`}
                        label={`${synced ? "Add to" : "Move to"} "${cat.name}"`}
                        action={() => addUserToCategory(user.id, cat.id)}
                    />
                );
            }
        }
    } else {
        // Not highlighted — list all assignable categories
        for (const cat of assignable) {
            items.push(
                <Menu.MenuItem
                    key={`add-${cat.id}`}
                    id={`vc-uh-add-${cat.id}`}
                    label={`Add to "${cat.name}"`}
                    action={() => addUserToCategory(user.id, cat.id)}
                />
            );
        }
    }

    // "New Category..." — separator only when there are items above it
    if (items.length > 0) items.push(<Menu.MenuSeparator key="sep-new" />);
    items.push(
        <Menu.MenuItem
            key="new-category"
            id="vc-uh-new-category"
            label="New Category..."
            color="brand"
            action={() => openCategoryModal(null)}
        />
    );

    const highlightItem = (
        <Menu.MenuItem id="vc-autohighlight" label="Highlight">
            {items}
        </Menu.MenuItem>
    );

    const group = findGroupChildrenByChildId("block", children);
    if (group) {
        group.unshift(highlightItem);
    } else {
        children.push(highlightItem);
    }
};

// ─── Guild context menu ───────────────────────────────────────────────────────

const guildContextPatch: NavContextMenuPatchCallback = (children, { guild }: { guild?: { id: string; name: string; }; }) => {
    if (!guild) return;

    const ignored = isGuildIgnored(guild.id);

    children.push(
        <Menu.MenuItem
            id="vc-uh-guild"
            label={ignored ? "Enable UserHighlight here" : "Disable UserHighlight here"}
            action={() => (ignored ? removeIgnoredGuild : addIgnoredGuild)(guild.id)}
        />
    );
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const contextMenus = {
    "user-context": userContextPatch,
    "guild-context": guildContextPatch,
};
