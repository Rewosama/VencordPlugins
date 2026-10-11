/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    showCountBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show a note count badge on the profile button",
    },
});
