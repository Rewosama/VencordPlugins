/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";

import { CategoryManager } from "./components/CategoryManager";
import { contextMenus } from "./contextMenu";
import { getCategories, loadData, registerOnCategoriesChange } from "./data";
import { injectStyle, removeStyle } from "./dom/css";
import { markAll, startObserver, stopObserver } from "./dom/marker";
import { onConnectionOpen, startNotifier, stopNotifier } from "./notifier/index";
import { refreshPresenceSnapshot } from "./notifier/presence";
import { markConnected } from "./notifier/state";
import { settings } from "./settings";

const logger = new Logger("UserHighlightNotifier");

export default definePlugin({
    name: "UserHighlightNotifier",
    description: "Highlight users with custom color categories (voice, member list, chat). Supports gradients, per-category notification alerts, and full settings backup/restore.",
    authors: [{ name: "Rewosama", id: 0n }],
    tags: ["Appearance"],
    settings,

    settingsAboutComponent: CategoryManager,
    contextMenus,

    flux: {
        /** Fired when the Discord gateway (re)connects. */
        CONNECTION_OPEN() {
            markConnected();
            onConnectionOpen();
        },
    },

    async start() {
        await loadData();

        registerOnCategoriesChange(() => {
            injectStyle(getCategories());
            markAll();
            // Re-seed the presence snapshot so newly added users are watched
            refreshPresenceSnapshot();
        });

        injectStyle(getCategories());
        startObserver();
        startNotifier();
    },

    stop() {
        stopObserver();
        removeStyle();
        stopNotifier();
    },
});
