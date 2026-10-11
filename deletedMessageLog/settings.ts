/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { makeRange, OptionType } from "@utils/types";

export const settings = definePluginSettings({
    trackMentions: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Log deleted messages that mention you",
    },
    keywords: {
        type: OptionType.STRING,
        default: "",
        placeholder: "keyword1, keyword2",
        description: "Track messages containing these words. Comma or space separated. If they get deleted, they will be logged.",
    },
    maxEntries: {
        type: OptionType.SLIDER,
        description: "Maximum number of deleted messages to keep",
        markers: makeRange(50, 500, 50),
        default: 100,
        stickToMarkers: false,
    },
});
