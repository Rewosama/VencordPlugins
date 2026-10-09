/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, RelationshipStore, Text, useState } from "@webpack/common";

import { deleteCategoryEntry, getNotificationPrefs, toggleCategoryHighlight } from "../data";
import { colorBg, HighlightCategory, numToHex } from "../settings";
import { openCategoryModal } from "./CategoryModal";
import { UserRow } from "./UserRow";

// ─── Toggle chip ──────────────────────────────────────────────────────────────

function ToggleSwitch({ active, color }: { active: boolean; color: string; }) {
    return (
        <div style={{
            position: "relative" as const,
            width: "30px", height: "18px", borderRadius: "9px",
            background: active ? color : "var(--background-modifier-accent)",
            flexShrink: 0, transition: "background 0.2s ease",
        }}>
            <div style={{
                position: "absolute" as const,
                width: "14px", height: "14px", borderRadius: "50%",
                background: active ? "white" : "var(--interactive-muted)",
                top: "2px", left: active ? "14px" : "2px",
                transition: "left 0.2s ease, background 0.2s ease",
                boxShadow: active ? "0 1px 4px rgba(0,0,0,0.45)" : "none",
            }} />
        </div>
    );
}

function ToggleChip({ emoji, label, active, color, onToggle }: {
    emoji: string; label: string; active: boolean; color: string; onToggle: () => void;
}) {
    return (
        <div
            role="switch"
            aria-checked={active}
            onClick={e => { e.stopPropagation(); onToggle(); }}
            style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "8px 12px 8px 10px", borderRadius: "22px", cursor: "pointer",
                background: active ? `${color}1e` : "var(--background-tertiary)",
                border: `1.5px solid ${active ? color + "60" : "transparent"}`,
                color: active ? color : "var(--interactive-muted)",
                userSelect: "none" as const, transition: "all 0.15s ease",
            }}
        >
            <span style={{ fontSize: "14px", lineHeight: 1 }}>{emoji}</span>
            <span style={{ fontSize: "13px", fontWeight: 600 }}>{label}</span>
            <ToggleSwitch active={active} color={color} />
        </div>
    );
}

// ─── Color swatch (solid or gradient pill) ────────────────────────────────────

function ColorSwatch({ category }: { category: HighlightCategory; }) {
    const c1 = numToHex(category.color);
    const hasGradient = category.color2 != null;
    return (
        <div style={{
            width: hasGradient ? "36px" : "13px",
            height: "13px",
            borderRadius: hasGradient ? "7px" : "50%",
            background: colorBg(category, "ff"),
            flexShrink: 0,
            boxShadow: `0 0 7px ${c1}bb`,
            transition: "width 0.2s ease, border-radius 0.2s ease",
        }} />
    );
}

// ─── Category Card ────────────────────────────────────────────────────────────

export interface CategoryRowProps {
    category: HighlightCategory;
    isDragging: boolean;
    onGripMouseDown: (e: React.MouseEvent) => void;
}

export function CategoryRow({ category, isDragging, onGripMouseDown }: CategoryRowProps) {
    const [expanded, setExpanded] = useState(false);
    const hexColor = numToHex(category.color);
    const manualCount = category.users.length;

    let friendCount = 0;
    if (category.syncFriends) {
        try { friendCount = RelationshipStore.getFriendIDs().length; } catch { /* early load */ }
    }
    const syncedSet = category.syncFriends
        ? new Set<string>(RelationshipStore.getFriendIDs?.() ?? [])
        : new Set<string>();
    const extraManual = category.users.filter(id => !syncedSet.has(id)).length;
    const countLabel = category.syncSelf
        ? "you"
        : category.syncFriends
            ? `${friendCount} friend${friendCount !== 1 ? "s" : ""}${extraManual > 0 ? ` +${extraManual}` : ""}`
            : `${manualCount} ${manualCount === 1 ? "user" : "users"}`;

    const voiceOn = category.highlightVoice !== false;
    const memberOn = category.highlightMemberList !== false;
    const msgOn = category.highlightMessages !== false;
    const notifOn = category.notificationsEnabled !== false;

    return (
        <div style={{ borderRadius: "12px", opacity: isDragging ? 0.3 : 1 }}>
            <div style={{
                background: "var(--background-secondary-alt)",
                borderRadius: "12px",
                border: `1.5px solid ${hexColor}44`,
                overflow: "hidden",
            }}>
                {/* ── Header ─────────────────────────────────────── */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "13px 16px" }}>
                    <div
                        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onGripMouseDown(e); }}
                        style={{
                            cursor: "grab", color: "var(--interactive-muted)",
                            fontSize: "17px", lineHeight: 1, letterSpacing: "-2px",
                            flexShrink: 0, padding: "2px 4px",
                            userSelect: "none" as const, opacity: 0.6,
                        }}
                        title="Drag to reorder"
                    >
                        ⠿
                    </div>

                    <ColorSwatch category={category} />

                    <span style={{
                        flex: 1, fontWeight: 700, fontSize: "15px", color: hexColor,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                        {category.name}
                    </span>

                    <span style={{ fontSize: "13px", color: "var(--text-muted)", flexShrink: 0 }}>
                        {countLabel}
                    </span>

                    <button
                        onClick={() => setExpanded(v => !v)}
                        aria-expanded={expanded}
                        style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--text-muted)", fontSize: "12px",
                            padding: "4px 6px", borderRadius: "4px",
                            display: "inline-block", lineHeight: 1,
                            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.2s ease",
                        }}
                    >
                        ▼
                    </button>
                </div>

                {/* ── Toggle chips ────────────────────────────────── */}
                <div style={{ padding: "0 16px 14px", display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
                    <ToggleChip emoji="🎤" label="Voice" active={voiceOn} color={hexColor}
                        onToggle={() => toggleCategoryHighlight(category.id, "highlightVoice")} />
                    <ToggleChip emoji="👥" label="Members" active={memberOn} color={hexColor}
                        onToggle={() => toggleCategoryHighlight(category.id, "highlightMemberList")} />
                    <ToggleChip emoji="💬" label="Chat" active={msgOn} color={hexColor}
                        onToggle={() => toggleCategoryHighlight(category.id, "highlightMessages")} />
                    {/* Bell toggle — hidden for syncSelf (no self-notifications) */}
                    {getNotificationPrefs().enabled && !category.syncSelf && (
                        <ToggleChip emoji="🔔" label="Notify" active={notifOn} color={hexColor}
                            onToggle={() => toggleCategoryHighlight(category.id, "notificationsEnabled")} />
                    )}
                </div>

                {/* ── Footer ──────────────────────────────────────── */}
                <div style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "10px 16px",
                    borderTop: `1px solid ${hexColor}22`,
                    background: `${hexColor}08`,
                }}>
                    {/* Auto-sync badges */}
                    {category.syncSelf && (
                        <span style={{ fontSize: "12px", color: "var(--text-link)" }}>
                            ✦&thinsp;me
                        </span>
                    )}
                    {category.syncFriends && (
                        <span style={{ fontSize: "12px", color: "var(--text-positive)" }}>
                            ✦&thinsp;auto-sync
                        </span>
                    )}
                    <span style={{ flex: 1 }} />
                    <Button size={Button.Sizes.SMALL} onClick={() => openCategoryModal(category.id)}>Edit</Button>
                    <Button size={Button.Sizes.SMALL} color={Button.Colors.RED} onClick={() => deleteCategoryEntry(category.id)}>Delete</Button>
                </div>

                {/* ── Expanded user list ───────────────────────────── */}
                {expanded && (
                    <div style={{
                        padding: "10px 16px 14px",
                        borderTop: `1px solid ${hexColor}22`,
                        display: "flex", flexDirection: "column", gap: "6px",
                    }}>
                        {category.syncSelf && (
                            <Text variant="text-sm/normal" style={{ color: "var(--text-link)" }}>
                                ✓ Highlights your own account
                            </Text>
                        )}
                        {category.syncFriends && (
                            <Text variant="text-sm/normal" style={{ color: "var(--text-positive)" }}>
                                ✓ Auto-syncing {friendCount} Discord friend{friendCount !== 1 ? "s" : ""}
                            </Text>
                        )}
                        {manualCount === 0 && !category.syncFriends ? (
                            <Text variant="text-sm/normal" style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                                No users yet — right-click any user in Discord to add them.
                            </Text>
                        ) : (
                            category.users.map(uid => <UserRow key={uid} userId={uid} />)
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
