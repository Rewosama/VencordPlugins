/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Generates the CSS that visually highlights users in each active location.
 *
 * All background colors use rgba() notation for maximum compatibility —
 * in particular, gradient color stops don't support the #RRGGBBAA format
 * reliably in all CSS contexts.
 *
 * Elements are tagged with data-hl-cat="{id}" by dom/marker.ts.
 */

import { colorBg, HighlightCategory, numToHex } from "../settings";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the CSS declarations for the background (solid or gradient). */
function bgDecl(cat: HighlightCategory, alpha: string): string {
    const value = colorBg(cat, alpha);
    if (cat.color2) {
        // Use background-image + transparent background-color so the gradient
        // is not overridden by Discord's own background-color on message rows.
        return `background-image: ${value} !important; background-color: transparent !important;`;
    }
    return `background-color: ${value} !important;`;
}

// ─── Voice users ─────────────────────────────────────────────────────────────

function voiceCSS(id: string, cat: HighlightCategory): string {
    const c1 = numToHex(cat.color);
    return `
        [class*="voiceUser"][data-hl-cat="${id}"],
        [class*="voiceChannelUser"][data-hl-cat="${id}"] {
            ${bgDecl(cat, "1c")}
            border-left: 2px solid ${c1} !important;
            border-radius: 0 !important;
            box-sizing: border-box !important;
            transition: background 0.2s ease;
        }
        [class*="voiceUser"][data-hl-cat="${id}"]:hover,
        [class*="voiceChannelUser"][data-hl-cat="${id}"]:hover {
            ${bgDecl(cat, "2c")}
        }
        [class*="voiceUser"][data-hl-cat="${id}"] [class*="content"],
        [class*="voiceUser"][data-hl-cat="${id}"] [class*="userRow"],
        [class*="voiceUser"][data-hl-cat="${id}"] [class*="inner"],
        [class*="voiceUser"][data-hl-cat="${id}"] [class*="draggable"],
        [class*="voiceChannelUser"][data-hl-cat="${id}"] [class*="content"],
        [class*="voiceChannelUser"][data-hl-cat="${id}"] [class*="userRow"],
        [class*="voiceChannelUser"][data-hl-cat="${id}"] [class*="inner"],
        [class*="voiceChannelUser"][data-hl-cat="${id}"] [class*="draggable"] {
            background: transparent !important;
            border-radius: inherit !important;
            box-shadow: none !important;
        }
    `;
}

// ─── Member list ──────────────────────────────────────────────────────────────

function memberListCSS(id: string, cat: HighlightCategory): string {
    const c1 = numToHex(cat.color);
    return `
        [class*="member_"][data-hl-cat="${id}"],
        [class*="member-"][data-hl-cat="${id}"] {
            ${bgDecl(cat, "1c")}
            border-left: 3px solid ${c1} !important;
            border-radius: 0 6px 6px 0 !important;
            margin-top: 2px !important;
            margin-bottom: 2px !important;
            width: 100% !important;
            box-sizing: border-box !important;
            transition: background 0.2s ease;
        }
        [class*="member_"][data-hl-cat="${id}"]:hover,
        [class*="member-"][data-hl-cat="${id}"]:hover {
            ${bgDecl(cat, "2c")}
        }
        [class*="member_"][data-hl-cat="${id}"] [class*="layout"],
        [class*="member_"][data-hl-cat="${id}"] [class*="content"],
        [class*="member_"][data-hl-cat="${id}"] [class*="memberInner"],
        [class*="member-"][data-hl-cat="${id}"] [class*="layout"],
        [class*="member-"][data-hl-cat="${id}"] [class*="content"],
        [class*="member-"][data-hl-cat="${id}"] [class*="memberInner"] {
            background: transparent !important;
            border-radius: inherit !important;
            box-shadow: none !important;
        }
    `;
}

// ─── Chat messages ────────────────────────────────────────────────────────────

function messagesCSS(id: string, cat: HighlightCategory): string {
    const c1 = numToHex(cat.color);
    // Simpler selector: rely on marker.ts to NOT stamp data-hl-cat on mentioned
    // rows rather than using the potentially unreliable :has() CSS pseudo-class.
    const row = `li[class*="messageListItem"][data-hl-cat="${id}"]:not([class*="mentioned"])`;
    return `
        ${row} {
            position: relative !important;
            ${bgDecl(cat, "14")}
            border-left: 2px solid ${c1} !important;
            border-top: none !important;
            border-bottom: none !important;
            border-right: none !important;
            border-radius: 0 4px 4px 0 !important;
            transition: background 0.2s ease;
        }
        ${row}:hover {
            ${bgDecl(cat, "20")}
        }
        ${row} * {
            border-top: none !important;
            border-bottom: none !important;
            box-shadow: none !important;
        }
    `;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildCSS(categories: HighlightCategory[]): string {
    let css = "";
    for (const cat of categories) {
        if (cat.highlightVoice !== false) css += voiceCSS(cat.id, cat);
        if (cat.highlightMemberList !== false) css += memberListCSS(cat.id, cat);
        if (cat.highlightMessages !== false) css += messagesCSS(cat.id, cat);
    }
    return css;
}

const STYLE_ID = "vc-userhighlight-notifier-style";

export function injectStyle(categories: HighlightCategory[]): void {
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
        el = document.createElement("style");
        el.id = STYLE_ID;
        document.head.appendChild(el);
    }
    el.textContent = buildCSS(categories);
}

export function removeStyle(): void {
    document.getElementById(STYLE_ID)?.remove();
}
