/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { waitFor } from "@webpack";
import { FluxDispatcher, UserStore } from "@webpack/common";

const settings = definePluginSettings({
    triggerRealMention: {
        description: "Trigger real Discord mention notification (red badge on server/channel & ping sound)",
        type: OptionType.BOOLEAN,
        default: true
    },
    keywords: {
        description: "Keywords or phrases that trigger a mention highlight (separated by comma or newline)",
        type: OptionType.STRING,
        default: "",
        onChange: () => updateCSSAndMark()
    },
    highlightColor: {
        description: "Highlight color for keyword mentions",
        type: OptionType.SELECT,
        options: [
            { label: "Discord Mention Orange", value: "#faa61a", default: true },
            { label: "Crimson Red", value: "#ef4444" },
            { label: "Emerald Green", value: "#10b981" },
            { label: "Purple Glow", value: "#8b5cf6" },
            { label: "Cyan Glow", value: "#06b6d4" },
            { label: "Hot Pink", value: "#ec4899" },
            { label: "Gold", value: "#f59e0b" },
            { label: "Bright White", value: "#ffffff" }
        ],
        onChange: () => updateCSSAndMark()
    },
    wholeWord: {
        description: "Match whole words only (e.g. searching 'cat' will not highlight 'catalog')",
        type: OptionType.BOOLEAN,
        default: true,
        onChange: () => updateCSSAndMark()
    },
    caseSensitive: {
        description: "Enable case sensitive matching",
        type: OptionType.BOOLEAN,
        default: false,
        onChange: () => updateCSSAndMark()
    },
    ignoreOwnMessages: {
        description: "Ignore your own sent messages",
        type: OptionType.BOOLEAN,
        default: true,
        onChange: () => updateCSSAndMark()
    }
});

let styleElement: HTMLStyleElement | null = null;
let observer: MutationObserver | null = null;
let originalDispatch: ((event: any) => any) | null = null;

function getActiveColor(): string {
    return settings.store.highlightColor || "#faa61a";
}

function getKeywordsList(): string[] {
    const raw = settings.store.keywords?.trim() || "";
    if (!raw) return [];
    return raw
        .split(/[\n,]+/)
        .map(k => k.trim())
        .filter(k => k.length > 0);
}

function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanRawMessageContent(rawContent: string): string {
    if (!rawContent) return "";
    return rawContent
        .replace(/<@!?\d+>/g, "")
        .replace(/<@&\d+>/g, "")
        .replace(/<#\d+>/g, "")
        .trim();
}

function getMentionClass(el?: Element): string {
    const existing = document.querySelector('[class*="mentioned__"]');
    if (existing) {
        for (const cls of existing.classList) {
            if (cls.startsWith("mentioned__")) return cls;
        }
    }

    const target = el || document.querySelector('li[class*="messageListItem"]');
    if (target) {
        const msg = target.querySelector('[class*="message__"]') || target;
        const className = typeof msg.className === "string" ? msg.className : "";
        const match = className.match(/message__([a-zA-Z0-9_-]+)/)
            || className.match(/cozyMessage__([a-zA-Z0-9_-]+)/)
            || className.match(/messageListItem__([a-zA-Z0-9_-]+)/);
        if (match) return `mentioned__${match[1]}`;
    }

    const anyMsg = document.querySelector('[class*="message__"]');
    if (anyMsg) {
        const className = typeof anyMsg.className === "string" ? anyMsg.className : "";
        const match = className.match(/message__([a-zA-Z0-9_-]+)/);
        if (match) return `mentioned__${match[1]}`;
    }

    return "mentioned";
}

function updateCSS() {
    if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.id = "custom-keyword-highlight-style";
        document.head.appendChild(styleElement);
    }

    const color = getActiveColor();
    const isDefaultOrange = color.toLowerCase() === "#faa61a";

    if (isDefaultOrange) {
        // When default Discord Mention Orange is used, Discord's native mentioned__ class
        // handles 100% of the background, hover transitions, and left 2px bar.
        styleElement.textContent = `
            li[data-custom-keyword-mentioned="true"] {
                position: relative !important;
                background-color: transparent !important;
                border: none !important;
                border-left: none !important;
                border-top: none !important;
                border-bottom: none !important;
                border-right: none !important;
                margin-top: 0 !important;
                margin-bottom: 0 !important;
            }

            /* Prevent friend highlight or other styles from interfering */
            li[data-custom-keyword-mentioned="true"][data-is-friend-message="true"],
            li[data-custom-keyword-mentioned="true"][data-is-important-message="true"],
            li[data-custom-keyword-mentioned="true"][data-is-self-message="true"],
            li[data-custom-keyword-mentioned="true"]:not([data-dummy-specificity]) {
                background-color: transparent !important;
                border: none !important;
                border-left: none !important;
            }
        `;
    } else {
        // Custom color chosen: override Discord's native orange bar & background on the message div
        styleElement.textContent = `
            li[data-custom-keyword-mentioned="true"] {
                position: relative !important;
                background-color: transparent !important;
                border: none !important;
                border-left: none !important;
                margin-top: 0 !important;
                margin-bottom: 0 !important;
            }

            li[data-custom-keyword-mentioned="true"] [class*="message"] {
                background-color: ${color}14 !important;
            }

            li[data-custom-keyword-mentioned="true"] [class*="message"]:hover {
                background-color: ${color}24 !important;
            }

            li[data-custom-keyword-mentioned="true"] [class*="message"]:before {
                background-color: ${color} !important;
            }

            li[data-custom-keyword-mentioned="true"][data-is-friend-message="true"],
            li[data-custom-keyword-mentioned="true"][data-is-important-message="true"],
            li[data-custom-keyword-mentioned="true"][data-is-self-message="true"],
            li[data-custom-keyword-mentioned="true"]:not([data-dummy-specificity]) {
                background-color: transparent !important;
                border: none !important;
                border-left: none !important;
            }
        `;
    }
}

function updateCSSAndMark() {
    updateCSS();
    markKeywordsInDOM();
}

function getFiberFromElement(el: Element): any {
    if (!el) return null;
    const key = Object.keys(el).find(k => k.startsWith("__reactFiber$") || k.startsWith("__reactProps$"));
    if (key) return (el as any)[key];

    const children = el.querySelectorAll("*");
    for (let i = 0; i < Math.min(children.length, 10); i++) {
        const childKey = Object.keys(children[i]).find(k => k.startsWith("__reactFiber$") || k.startsWith("__reactProps$"));
        if (childKey) return (children[i] as any)[childKey];
    }
    return null;
}

function getMessageAuthorId(el: Element): string | null {
    let curr = getFiberFromElement(el);
    let depth = 0;
    while (curr && depth < 12) {
        const props = curr.memoizedProps || curr.pendingProps;
        if (props?.message?.author?.id) {
            const authorId = props.message.author.id;
            if (typeof authorId === "string" && /^\d{15,20}$/.test(authorId)) {
                return authorId;
            }
        }
        curr = curr.return || curr.child;
        depth++;
    }
    return null;
}


function getCleanMessageText(contentEl: Element): string {
    if (!contentEl.querySelector('[class*="mention"]')) {
        return contentEl.textContent || "";
    }
    const clone = contentEl.cloneNode(true) as Element;
    const mentions = clone.querySelectorAll('[class*="mention"]');
    mentions.forEach(m => m.remove());
    return clone.textContent || "";
}

function textMatchesKeywords(text: string): boolean {
    const keywords = getKeywordsList();
    if (keywords.length === 0) return false;

    const { caseSensitive } = settings.store;
    const { wholeWord } = settings.store;
    const flags = caseSensitive ? "" : "i";

    for (const keyword of keywords) {
        const escaped = escapeRegExp(keyword);
        const pattern = wholeWord ? `(?<!\\p{L})${escaped}(?!\\p{L})` : escaped;
        try {
            const regex = new RegExp(pattern, flags + "u");
            if (regex.test(text)) return true;
        } catch {
            const fallbackPattern = wholeWord ? `\\b${escaped}\\b` : escaped;
            const regex = new RegExp(fallbackPattern, flags);
            if (regex.test(text)) return true;
        }
    }
    return false;
}

function handleIncomingMessage(message: any) {
    if (!message || typeof message.content !== "string") return;
    if (!settings.store.triggerRealMention) return;

    const currentUser = UserStore?.getCurrentUser?.();
    if (!currentUser?.id) return;

    if (settings.store.ignoreOwnMessages && message.author?.id === currentUser.id) return;

    const mentions = Array.isArray(message.mentions) ? message.mentions : [];
    const alreadyMentioned = mentions.some((m: any) =>
        typeof m === "string" ? m === currentUser.id : m?.id === currentUser.id
    );
    if (alreadyMentioned) return;

    const cleanContent = cleanRawMessageContent(message.content);
    if (textMatchesKeywords(cleanContent)) {
        message._isCustomKeywordMention = true;
        message.mentions = [
            ...mentions,
            {
                id: currentUser.id,
                username: currentUser.username,
                avatar: currentUser.avatar,
                discriminator: currentUser.discriminator || "0",
                global_name: currentUser.globalName || currentUser.username
            }
        ];
        message.mentioned = true;
    }
}

function hookDispatcher() {
    if (originalDispatch) return;
    if (!FluxDispatcher?.dispatch) {
        waitFor(["dispatch", "subscribe"], () => hookDispatcher());
        return;
    }

    const dispatch = originalDispatch = FluxDispatcher.dispatch;
    FluxDispatcher.dispatch = function (this: any, ...args: any[]) {
        try {
            const event = args[0];
            if ((event?.type === "MESSAGE_CREATE" || event?.type === "MESSAGE_UPDATE") && event?.message) {
                handleIncomingMessage(event.message);
            }
        } catch (err) {
            console.error("[CustomKeywordHighlight] Dispatch interception error:", err);
        }
        return dispatch.apply(this, args as any);
    };
}

function unhookDispatcher() {
    if (originalDispatch && FluxDispatcher) {
        FluxDispatcher.dispatch = originalDispatch;
        originalDispatch = null;
    }
}

function markKeywordsInDOM() {
    const keywords = getKeywordsList();
    const mentionClass = getMentionClass();

    if (keywords.length === 0) {
        document.querySelectorAll('[data-ckh-mention="true"]').forEach(el => {
            el.classList.remove(mentionClass, "mentioned");
            el.removeAttribute("data-ckh-mention");
        });
        document.querySelectorAll('li[data-custom-keyword-mentioned="true"]').forEach(el => {
            el.removeAttribute("data-custom-keyword-mentioned");
        });
        return;
    }

    const currentUserId = UserStore.getCurrentUser()?.id;

    const messageListItems = document.querySelectorAll('li[class*="messageListItem"]');
    messageListItems.forEach(el => {
        const contentEl = el.querySelector('[class*="messageContent"]');
        const msgDiv = (el.querySelector('[class*="message__"]')
            || contentEl?.closest('[class*="message__"]')
            || el.firstElementChild) as HTMLElement | null;

        if (settings.store.ignoreOwnMessages && currentUserId) {
            const authorId = getMessageAuthorId(el);
            if (authorId === currentUserId) {
                if (el.hasAttribute("data-custom-keyword-mentioned")) {
                    el.removeAttribute("data-custom-keyword-mentioned");
                }
                if (msgDiv?.getAttribute("data-ckh-mention") === "true") {
                    msgDiv.classList.remove(mentionClass, "mentioned");
                    msgDiv.removeAttribute("data-ckh-mention");
                }
                return;
            }
        }

        if (!contentEl) return;

        // Exclude mention pills so @username does not trigger keyword matching
        const text = getCleanMessageText(contentEl);
        if (textMatchesKeywords(text)) {
            if (!el.hasAttribute("data-custom-keyword-mentioned")) {
                el.setAttribute("data-custom-keyword-mentioned", "true");
            }
            // Keyword mention overrides any friend or important user highlight
            el.removeAttribute("data-is-friend-message");
            el.removeAttribute("data-is-important-message");
            el.removeAttribute("data-is-self-message");

            // Apply Discord's native mention classes to the message div
            if (msgDiv && !msgDiv.classList.contains(mentionClass)) {
                msgDiv.classList.add(mentionClass, "mentioned");
                msgDiv.setAttribute("data-ckh-mention", "true");
            }
        } else {
            if (el.hasAttribute("data-custom-keyword-mentioned")) {
                el.removeAttribute("data-custom-keyword-mentioned");
            }
            if (msgDiv?.getAttribute("data-ckh-mention") === "true") {
                msgDiv.classList.remove(mentionClass, "mentioned");
                msgDiv.removeAttribute("data-ckh-mention");
            }
        }
    });
}

export default definePlugin({
    name: "CustomKeywordHighlight",
    description: "Highlights messages containing specified keywords with Discord's mention highlight style and triggers real mention unread badges.",
    authors: [
        {
            name: "Rewosama",
            id: 0n
        }
    ],
    tags: ["Chat", "Customisation", "Utility"],
    settings,

    start() {
        updateCSS();
        hookDispatcher();

        observer = new MutationObserver(() => {
            markKeywordsInDOM();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        markKeywordsInDOM();
    },

    stop() {
        unhookDispatcher();

        if (observer) {
            observer.disconnect();
            observer = null;
        }

        if (styleElement) {
            styleElement.remove();
            styleElement = null;
        }

        const mentionClass = getMentionClass();
        document.querySelectorAll('[data-ckh-mention="true"]').forEach(el => {
            el.classList.remove(mentionClass, "mentioned");
            el.removeAttribute("data-ckh-mention");
        });
        document.querySelectorAll('li[data-custom-keyword-mentioned="true"]').forEach(el => {
            el.removeAttribute("data-custom-keyword-mentioned");
        });
    }
});
