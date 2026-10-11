/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Stamps `data-hl-cat="{categoryId}"` on DOM elements so CSS rules can style
 * them. Uses two complementary strategies:
 *
 *  1. **Immediate marking** — when the MutationObserver fires, newly added
 *     elements are stamped synchronously in the same microtask, before the
 *     browser paints. No delay, no visible flash of unstyled content.
 *
 *  2. **Debounced full rescan** — handles removals, rearrangements and any
 *     mutations the immediate pass may have missed. Runs 200 ms after the
 *     last mutation (longer is fine because the immediate pass covers the
 *     common case).
 *
 * A per-pass userId→category Map prevents calling getUserCategory() more than
 * once per unique user ID within a single marking pass.
 */

import { Logger } from "@utils/Logger";

import { getUserCategory, isGuildIgnored, isHighlightInDMs } from "../data";
import { HighlightCategory } from "../settings";
import { extractUserIdFromElement, getMessageAuthorId } from "./fiber";

const logger = new Logger("UserHighlightNotifier/Marker");
const ATTR = "data-hl-cat";
const FULL_SCAN_DEBOUNCE = 200; // ms — immediate marking covers additions

// ─── Helpers ──────────────────────────────────────────────────────────────────

type CatCache = Map<string, HighlightCategory | null>;

function getCurrentGuildId(): string | null {
    const m = window.location.pathname.match(/\/channels\/(\d{15,20})\//);
    return m ? m[1] : null;
}

function shouldSkip(): boolean {
    if (window.location.pathname.startsWith("/channels/@me") && !isHighlightInDMs()) return true;
    const gid = getCurrentGuildId();
    return !!(gid && isGuildIgnored(gid));
}

function stamp(el: Element, catId: string | undefined): void {
    if (catId) {
        if (el.getAttribute(ATTR) !== catId) el.setAttribute(ATTR, catId);
    } else {
        el.removeAttribute(ATTR);
    }
}

/** Looks up a category for userId, using the per-pass cache to avoid repeats. */
function getCat(userId: string, cache: CatCache): HighlightCategory | null {
    if (cache.has(userId)) return cache.get(userId)!;
    const cat = getUserCategory(userId) ?? null;
    cache.set(userId, cat);
    return cat;
}

// ─── Single-element markers ───────────────────────────────────────────────────

function markVoiceEl(el: Element, cache: CatCache): void {
    if (el.closest("[class*=\"privateChannels\"], [class*=\"peopleColumn\"], [class*=\"friendsTable\"]")) {
        el.removeAttribute(ATTR);
        return;
    }
    const userId = extractUserIdFromElement(el);
    const cat = userId ? getCat(userId, cache) : null;
    stamp(el, cat?.highlightVoice !== false ? cat?.id : undefined);
}

function markMemberEl(el: Element, cache: CatCache): void {
    const cn = typeof el.className === "string" ? el.className : "";
    if (cn.includes("membersWrap") || cn.includes("membersGroup") || cn.includes("membersList") || cn.includes("memberInner")) {
        el.removeAttribute(ATTR);
        return;
    }
    if (el.parentElement?.closest("[class*=\"member_\"], [class*=\"member-\"]")) {
        el.removeAttribute(ATTR);
        return;
    }
    const userId = extractUserIdFromElement(el);
    const cat = userId ? getCat(userId, cache) : null;
    stamp(el, cat?.highlightMemberList !== false ? cat?.id : undefined);
}

function markMessageEl(el: Element, cache: CatCache): void {
    if (
        el.hasAttribute("data-custom-keyword-mentioned") ||
        el.classList.contains("mentioned") ||
        el.querySelector("[class*=\"mentioned\"]") !== null
    ) {
        el.removeAttribute(ATTR);
        return;
    }
    const authorId = getMessageAuthorId(el);
    const cat = authorId ? getCat(authorId, cache) : null;
    stamp(el, cat?.highlightMessages !== false ? cat?.id : undefined);
}

// ─── Full document scan ───────────────────────────────────────────────────────

function fullScan(cache: CatCache): void {
    document.querySelectorAll<Element>(
        "[class*=\"voiceUser\"], [class*=\"voiceChannelUser\"]"
    ).forEach(el => markVoiceEl(el, cache));

    document.querySelectorAll<Element>(
        "[class*=\"member_\"], [class*=\"member-\"]"
    ).forEach(el => markMemberEl(el, cache));

    document.querySelectorAll<Element>(
        "li[class*=\"messageListItem\"]"
    ).forEach(el => markMessageEl(el, cache));
}

// ─── Immediate mutation handler ───────────────────────────────────────────────

/**
 * Called synchronously for each newly added DOM node.
 * Stamps target elements right away so they are highlighted before the first
 * paint — no visible delay.
 */
function handleNewNode(node: Node, cache: CatCache): void {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const cn = typeof el.className === "string" ? el.className : "";

    if (cn.includes("voiceUser") || cn.includes("voiceChannelUser")) {
        markVoiceEl(el, cache);
    } else if (cn.includes("member_") || cn.includes("member-")) {
        markMemberEl(el, cache);
    } else if (el.tagName === "LI" && cn.includes("messageListItem")) {
        markMessageEl(el, cache);
    } else {
        // Container added — scan its relevant descendants
        el.querySelectorAll<Element>("[class*=\"voiceUser\"], [class*=\"voiceChannelUser\"]").forEach(c => markVoiceEl(c, cache));
        el.querySelectorAll<Element>("[class*=\"member_\"], [class*=\"member-\"]").forEach(c => markMemberEl(c, cache));
        el.querySelectorAll<Element>("li[class*=\"messageListItem\"]").forEach(c => markMessageEl(c, cache));
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function markAll(): void {
    if (shouldSkip()) { clearAll(); return; }
    const cache: CatCache = new Map();
    try {
        fullScan(cache);
    } catch (e) {
        logger.error("markAll failed:", e);
    }
}

export function clearAll(): void {
    document.querySelectorAll(`[${ATTR}]`).forEach(el => el.removeAttribute(ATTR));
}

// ─── MutationObserver ─────────────────────────────────────────────────────────

let observer: MutationObserver | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

export function startObserver(): void {
    if (observer) return;

    observer = new MutationObserver((mutations: MutationRecord[]) => {
        if (shouldSkip()) { clearAll(); return; }

        // ── Immediate path: stamp newly added nodes synchronously ────────────
        const cache: CatCache = new Map();
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                handleNewNode(node, cache);
            }
        }

        // ── Debounced full rescan: handles removals and rearrangements ───────
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { timer = null; markAll(); }, FULL_SCAN_DEBOUNCE);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    markAll();
}

export function stopObserver(): void {
    if (timer) { clearTimeout(timer); timer = null; }
    observer?.disconnect();
    observer = null;
    clearAll();
}
