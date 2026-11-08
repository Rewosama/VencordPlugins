/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { useForceUpdater } from "@utils/react";
import { GuildStore, useRef, useState } from "@webpack/common";

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

    const categories = getCategories();
    const ignoredGuilds = getIgnoredGuilds();

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
            <Paragraph>
                Create categories, pick a color (solid or gradient), and toggle where each
                one highlights. Grab <strong>⠿</strong> to reorder — the topmost category
                wins when a user matches multiple.
                Right-click any server icon to disable highlighting there.
            </Paragraph>

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

            <Button onClick={() => openCategoryModal(null)} style={{ alignSelf: "flex-start" }}>
                + New Category
            </Button>

            {ignoredGuilds.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <Heading>Ignored Servers</Heading>
                    <Paragraph style={{ marginBottom: "4px" }}>
                        Highlighting is disabled in these servers.
                        Right-click any server icon to toggle.
                    </Paragraph>
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
                                <Button size="small" variant="dangerPrimary" onClick={() => removeIgnoredGuild(id)}>
                                    Remove
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}

            <NotificationPanel />
            <ImportExport />
        </div>
    );
}
