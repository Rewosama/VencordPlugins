/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useForceUpdater } from "@utils/react";
import { Button, Forms, GuildStore, useRef, useState } from "@webpack/common";

import {
    getCategories,
    getIgnoredGuilds,
    registerForceUpdate,
    removeIgnoredGuild,
    reorderCategories,
} from "../data";
import { openCategoryModal } from "./CategoryModal";
import { CategoryRow } from "./CategoryRow";
import { ImportExport } from "./ImportExport";
import { NotificationPanel } from "./NotificationPanel";

export function CategoryManager() {
    const forceUpdate = useForceUpdater();
    registerForceUpdate(forceUpdate);

    // Read directly from in-memory store — notifyAll() triggers forceUpdate
    const categories = getCategories();
    const ignoredGuilds = getIgnoredGuilds();

    // ── Drag state ────────────────────────────────────────────────────────────
    const itemEls = useRef<(HTMLElement | null)[]>([]);
    const [dragOver, setDragOver] = useState<{ from: number; over: number; } | null>(null);

    function getOverIndex(clientY: number): number {
        for (let i = 0; i < itemEls.current.length; i++) {
            const el = itemEls.current[i];
            if (!el) continue;
            const { top, height } = el.getBoundingClientRect();
            if (clientY < top + height / 2) return i;
        }
        return itemEls.current.length - 1;
    }

    function startDrag(e: React.MouseEvent, fromIdx: number) {
        e.preventDefault();
        const wrapperEl = itemEls.current[fromIdx];
        if (!wrapperEl) return;

        const card = wrapperEl.firstElementChild as HTMLElement | null;
        const startY = e.clientY;
        let lastOver = fromIdx;

        // Lift animation
        document.documentElement.style.cursor = "grabbing";
        if (card) {
            card.style.transition = "box-shadow 0.15s ease, transform 0.15s ease";
            card.style.boxShadow = "0 16px 48px rgba(0,0,0,0.55)";
            card.style.transform = "scale(1.025) rotate(0.7deg)";
            card.style.zIndex = "200";
            card.style.position = "relative";
        }

        setDragOver({ from: fromIdx, over: fromIdx });

        const onMove = (ev: MouseEvent) => {
            // Move card directly — no React re-render on every pixel
            if (card) {
                card.style.transition = "box-shadow 0.1s ease";
                card.style.transform = `translateY(${ev.clientY - startY}px) scale(1.025) rotate(0.7deg)`;
            }
            const newOver = getOverIndex(ev.clientY);
            if (newOver !== lastOver) {
                lastOver = newOver;
                setDragOver({ from: fromIdx, over: newOver });
            }
        };

        const onUp = () => {
            document.documentElement.style.cursor = "";
            if (card) {
                card.style.transition = "box-shadow 0.2s ease, transform 0.2s ease";
                card.style.transform = "";
                card.style.boxShadow = "";
                card.style.zIndex = "";
                card.style.position = "";
                setTimeout(() => { if (card) card.style.transition = ""; }, 200);
            }
            setDragOver(prev => {
                if (prev && prev.from !== prev.over) reorderCategories(prev.from, prev.over);
                return null;
            });
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Forms.FormText>
                Create categories, pick a color (solid or gradient), and toggle where each
                one highlights. Grab <strong>⠿</strong> to reorder — the topmost category
                wins when a user matches multiple.
                Right-click any server icon to disable highlighting there.
            </Forms.FormText>

            {/* ── Category list ───────────────────────────────────────── */}
            {categories.length === 0 ? (
                <div style={{
                    padding: "28px 16px", textAlign: "center" as const,
                    background: "var(--background-secondary-alt)", borderRadius: "12px",
                    color: "var(--text-muted)", fontSize: "14px",
                    border: "1px dashed var(--background-modifier-accent)",
                }}>
                    No categories yet. Click "+ New Category" to get started.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {categories.map((cat, i) => (
                        <div
                            key={cat.id}
                            ref={(el: HTMLElement | null) => { itemEls.current[i] = el; }}
                            style={{
                                borderTop: dragOver && dragOver.over === i && dragOver.from !== i
                                    ? "3px solid var(--brand-500)"
                                    : "3px solid transparent",
                                transition: "border-color 0.1s ease",
                                borderRadius: "2px",
                            }}
                        >
                            <CategoryRow
                                category={cat}
                                isDragging={dragOver?.from === i}
                                onGripMouseDown={e => startDrag(e, i)}
                            />
                        </div>
                    ))}
                </div>
            )}

            <Button
                color={Button.Colors.BRAND}
                onClick={() => openCategoryModal(null)}
                style={{ alignSelf: "flex-start" }}
            >
                + New Category
            </Button>

            {/* ── Ignored Servers ───────────────────────────────────────── */}
            {ignoredGuilds.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <Forms.FormTitle>Ignored Servers</Forms.FormTitle>
                    <Forms.FormText style={{ marginBottom: "4px" }}>
                        Highlighting is disabled in these servers.
                        Right-click any server icon to toggle.
                    </Forms.FormText>
                    {ignoredGuilds.map(id => {
                        const name = GuildStore.getGuild(id)?.name ?? `Unknown server (${id})`;
                        return (
                            <div key={id} style={{
                                display: "flex", alignItems: "center", gap: "8px",
                                padding: "8px 12px",
                                background: "var(--background-secondary-alt)",
                                borderRadius: "8px",
                            }}>
                                <span style={{ flex: 1, fontSize: "14px", color: "var(--text-normal)" }}>
                                    {name}
                                </span>
                                <Button size={Button.Sizes.SMALL} color={Button.Colors.RED} onClick={() => removeIgnoredGuild(id)}>
                                    Remove
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Notification settings panel ────────────────────────────── */}
            <NotificationPanel />

            {/* ── Import / Export ────────────────────────────────────────── */}
            <ImportExport />
        </div>
    );
}
