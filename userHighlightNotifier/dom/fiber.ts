/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Extracts Discord user IDs from DOM elements.
 *
 * Discord renders its UI with React. Most DOM nodes don't carry a plain
 * user-id attribute, but React attaches its internal fiber object to every
 * element via a key that starts with "__reactFiber$". Walking that tree lets
 * us reach the component props and find whichever userId-shaped prop exists.
 */

// ─── Internal ────────────────────────────────────────────────────────────────

/** Returns the first React fiber/props object attached to el or a shallow child. */
function getReactFiber(el: Element): unknown {
    const FIBER_KEY = (key: string) =>
        key.startsWith("__reactFiber$") || key.startsWith("__reactProps$");

    const own = Object.keys(el).find(FIBER_KEY);
    if (own) return (el as any)[own];

    // Some wrapper elements carry no fiber themselves; look one level deeper.
    for (const child of Array.from(el.querySelectorAll("*")).slice(0, 10)) {
        const k = Object.keys(child).find(FIBER_KEY);
        if (k) return (child as any)[k];
    }
    return null;
}

const USER_ID_RE = /^\d{15,20}$/;

/**
 * Walks up/down the fiber tree and applies `pick` to each node's props.
 * Returns the first non-null value that looks like a Discord snowflake.
 */
function walkFiber(
    fiber: any,
    maxDepth: number,
    pick: (props: Record<string, any>) => string | null | undefined
): string | null {
    let node = fiber;
    for (let i = 0; i < maxDepth && node; i++) {
        const props: Record<string, any> = node.memoizedProps ?? node.pendingProps ?? {};
        const id = pick(props);
        if (id && USER_ID_RE.test(id)) return id;
        node = node.return ?? node.child;
    }
    return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Extracts the Discord user ID from a voice-channel or member-list element.
 * Tries cheap DOM checks first, then falls back to the React fiber.
 */
export function extractUserIdFromElement(el: Element): string | null {
    // 1. Direct DOM attribute — sometimes present on user avatars etc.
    const attr =
        el.getAttribute("data-user-id") ??
        el.getAttribute("data-author-id");
    if (attr && USER_ID_RE.test(attr)) return attr;

    // 2. Avatar image URL — Discord CDN URLs embed the user ID.
    const img = el.querySelector<HTMLImageElement>(
        "img[src*='/avatars/'], img[src*='/users/']"
    );
    if (img) {
        const m = img.src.match(/(?:avatars|users)\/(\d{15,20})/);
        if (m) return m[1];
    }

    // 3. React fiber — covers the remaining cases (voice rows, member cards…).
    return walkFiber(getReactFiber(el), 15, p =>
        p.userId ??
        p.user?.id ??
        p.member?.user?.id ??
        p.userListItem?.user?.id ??
        p.userRow?.user?.id ??
        p.voiceState?.userId ??
        p.author?.id ??
        null
    );
}

/**
 * Extracts the author's user ID from a chat message list-item element.
 * Message props are nested deeper (under `message.author.id`).
 */
export function getMessageAuthorId(el: Element): string | null {
    return walkFiber(
        getReactFiber(el),
        12,
        p => p.message?.author?.id ?? null
    );
}
