/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import type { RenderModalProps } from "@vencord/discord-types";
import { closeModal, Forms, Modal, openModal, TextInput, useState } from "@webpack/common";

import { createCategoryEntry, getCategories, updateCategoryEntry } from "../data";
import { colorBg, DEFAULT_COLOR, hexToNum, HighlightCategory, numToHex } from "../settings";

const logger = new Logger("AutoHighlight/CategoryModal");

// ─── Small checkbox ───────────────────────────────────────────────────────────

function Checkbox({ label, description, checked, onChange }: {
    label: string; description?: string;
    checked: boolean; onChange: (v: boolean) => void;
}) {
    return (
        <label style={{
            display: "flex", alignItems: "flex-start", gap: "10px",
            cursor: "pointer", userSelect: "none" as const, padding: "4px 0",
        }}>
            <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
                style={{ marginTop: "2px", width: "16px", height: "16px", cursor: "pointer", flexShrink: 0 }}
            />
            <span>
                <span style={{ fontSize: "14px", color: "var(--text-normal)", fontWeight: 500 }}>{label}</span>
                {description && (
                    <span style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginTop: "1px" }}>
                        {description}
                    </span>
                )}
            </span>
        </label>
    );
}

// ─── Color row ────────────────────────────────────────────────────────────────

function ColorRow({ value, onChange }: { value: number; onChange: (n: number) => void; }) {
    const hex = numToHex(value);
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input
                type="color"
                value={hex}
                onChange={e => onChange(hexToNum(e.target.value))}
                style={{
                    width: "44px", height: "32px", padding: "2px 3px", cursor: "pointer",
                    border: "2px solid var(--background-modifier-accent)",
                    borderRadius: "6px", background: "var(--background-secondary)",
                }}
            />
            <div style={{
                width: "32px", height: "32px", borderRadius: "50%", background: hex,
                border: "2px solid var(--background-modifier-accent)",
                boxShadow: `0 0 8px ${hex}88`, flexShrink: 0,
            }} />
            <code style={{
                fontSize: "13px", color: "var(--text-muted)",
                background: "var(--background-tertiary)", padding: "4px 8px", borderRadius: "4px",
            }}>
                {hex.toUpperCase()}
            </code>
        </div>
    );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

interface CategoryModalProps {
    categoryId: string | null;
    modalProps: RenderModalProps;
    closeMe: () => void;
}

function CategoryModal({ categoryId, modalProps, closeMe }: CategoryModalProps) {
    const [existing] = useState(
        () => categoryId ? getCategories().find(c => c.id === categoryId) ?? null : null
    );

    const [name, setName] = useState(existing?.name ?? `Category ${getCategories().length + 1}`);
    const [color, setColor] = useState(existing?.color ?? DEFAULT_COLOR);
    const [useGradient, setUseGradient] = useState(existing?.color2 != null);
    const [color2, setColor2] = useState(existing?.color2 ?? DEFAULT_COLOR);

    const [syncFriends, setSyncFriends] = useState(existing?.syncFriends ?? false);
    const [syncSelf, setSyncSelf] = useState(existing?.syncSelf ?? false);
    const [highlightVoice, setHighlightVoice] = useState(existing?.highlightVoice ?? true);
    const [highlightMemberList, setHighlightMemberList] = useState(existing?.highlightMemberList ?? true);
    const [highlightMessages, setHighlightMessages] = useState(existing?.highlightMessages ?? true);

    // Live gradient preview for the swatch
    const previewCat: Pick<HighlightCategory, "color" | "color2"> = {
        color,
        color2: useGradient ? color2 : undefined,
    };
    const previewBg = colorBg(previewCat as HighlightCategory, "ff");

    function onSave() {
        if (!name.trim()) return;
        const opts = {
            color2: useGradient ? color2 : undefined,
            syncFriends, syncSelf, highlightVoice, highlightMemberList, highlightMessages,
        };
        try {
            if (existing) {
                updateCategoryEntry(existing.id, name.trim(), color, opts);
            } else {
                createCategoryEntry(name.trim(), color, opts);
            }
        } catch (e) {
            logger.error("Failed to save category:", e);
        }
        closeMe();
    }

    return (
        <Modal
            {...modalProps}
            title={existing ? "Edit Category" : "New Category"}
            actions={[
                { text: "Cancel", variant: "secondary", onClick: closeMe },
                { text: existing ? "Save Changes" : "Create", variant: "primary", onClick: onSave, disabled: !name.trim() },
            ]}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "4px 0 8px" }}>

                {/* Name */}
                <section>
                    <Forms.FormTitle>Category Name</Forms.FormTitle>
                    <TextInput
                        value={name}
                        onChange={setName}
                        placeholder="e.g. Friends, Streamers, Colleagues..."
                        onKeyDown={e => { if (e.key === "Enter") onSave(); }}
                    />
                </section>

                {/* Colors */}
                <section>
                    <Forms.FormTitle>Color</Forms.FormTitle>
                    <ColorRow value={color} onChange={setColor} />

                    <div style={{ marginTop: "12px" }}>
                        <Checkbox
                            label="Use gradient (two colors)"
                            description="Blends from the first color to a second color, left to right."
                            checked={useGradient}
                            onChange={setUseGradient}
                        />
                    </div>

                    {useGradient && (
                        <div style={{ marginTop: "12px" }}>
                            <Forms.FormTitle>Second Color</Forms.FormTitle>
                            <ColorRow value={color2} onChange={setColor2} />
                        </div>
                    )}

                    {/* Gradient preview */}
                    {useGradient && (
                        <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{
                                flex: 1, height: "12px", borderRadius: "6px",
                                background: previewBg,
                                boxShadow: `0 0 8px ${numToHex(color)}66`,
                            }} />
                            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>preview</span>
                        </div>
                    )}
                </section>

                {/* Highlight locations */}
                <section>
                    <Forms.FormTitle>Highlight Locations</Forms.FormTitle>
                    <Forms.FormText style={{ marginBottom: "8px" }}>
                        You can also toggle these directly on the category card without opening Edit.
                    </Forms.FormText>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <Checkbox label="🎤  Voice Channels" description="Background + border on voice user rows." checked={highlightVoice} onChange={setHighlightVoice} />
                        <Checkbox label="👥  Member List" description="Background + border on member cards." checked={highlightMemberList} onChange={setHighlightMemberList} />
                        <Checkbox label="💬  Chat Messages" description="Background + border on chat messages." checked={highlightMessages} onChange={setHighlightMessages} />
                    </div>
                </section>

                {/* Sync self + sync friends */}
                <section>
                    <Forms.FormTitle>Auto-sync</Forms.FormTitle>
                    <Checkbox
                        label="Highlight yourself (Me)"
                        description="Your own account is always included in this category."
                        checked={syncSelf}
                        onChange={setSyncSelf}
                    />
                    <Checkbox
                        label="Highlight all Discord friends"
                        description="Every Discord friend is included without manual assignment."
                        checked={syncFriends}
                        onChange={setSyncFriends}
                    />
                </section>

            </div>
        </Modal>
    );
}

// ─── Opener ──────────────────────────────────────────────────────────────────

export function openCategoryModal(categoryId: string | null): void {
    const key = openModal(props => (
        <CategoryModal
            categoryId={categoryId}
            modalProps={props}
            closeMe={() => closeModal(key)}
        />
    ));
}
