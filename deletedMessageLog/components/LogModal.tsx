/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useForceUpdater } from "@utils/react";
import type { RenderModalProps } from "@vencord/discord-types";
import { Button, ChannelStore, GuildStore, Modal, openModal, openUserProfileModal, Text, useEffect, useState } from "@webpack/common";

import { clearLog, deleteEntries, deleteEntry, getLog, subscribe } from "../logger";

// ─── Utils ────────────────────────────────────────────────────────────────────

function fmtTimestamp(ts: number): string {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const time = d.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false });
    if (d.toDateString() === today.toDateString()) return time;
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
    return `${d.toLocaleDateString("en", { month: "short", day: "numeric" })} ${time}`;
}

// ─── Single entry row ─────────────────────────────────────────────────────────

function EntryRow({
    entry,
    selectionMode,
    selected,
    onToggle,
}: {
    entry: ReturnType<typeof getLog>[number];
    selectionMode: boolean;
    selected: boolean;
    onToggle: () => void;
}) {
    const channelName = entry.channelName ?? ChannelStore.getChannel(entry.channelId)?.name ?? "unknown";
    const guildName = entry.guildName ?? (entry.guildId ? GuildStore.getGuild(entry.guildId)?.name : undefined);
    const accentColor = entry.isMention ? "#5865f2" : "#f0b232";
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={selectionMode ? onToggle : undefined}
            style={{
                display: "flex", gap: "10px",
                padding: "8px 4px",
                borderBottom: "1px solid var(--background-modifier-accent)",
                cursor: selectionMode ? "pointer" : "default",
                background: selected ? accentColor + "12" : "transparent",
                transition: "background 0.1s",
            }}
        >
            {/* Checkbox (selection mode) or accent line */}
            {selectionMode ? (
                <div style={{
                    width: "16px", height: "16px", borderRadius: "3px",
                    border: `2px solid ${selected ? accentColor : "var(--interactive-muted)"}`,
                    background: selected ? accentColor : "transparent",
                    flexShrink: 0, alignSelf: "center",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.1s",
                }}>
                    {selected && <span style={{ color: "white", fontSize: "10px", lineHeight: 1, fontWeight: 700 }}>✓</span>}
                </div>
            ) : (
                <div style={{ width: "2px", borderRadius: "2px", background: accentColor, flexShrink: 0, alignSelf: "stretch" }} />
            )}

            {/* Avatar */}
            <div style={{ flexShrink: 0, paddingTop: "1px" }}>
                {entry.avatarUrl ? (
                    <img
                        src={entry.avatarUrl} alt=""
                        style={{ width: "28px", height: "28px", borderRadius: "50%" }}
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                ) : (
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--background-modifier-accent)" }} />
                )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "3px" }}>
                    <span
                        style={{ fontWeight: 600, fontSize: "13px", color: accentColor, cursor: "pointer" }}
                        onClick={e => { e.stopPropagation(); openUserProfileModal({ userId: entry.authorId }); }}
                        title="Open profile"
                    >
                        {entry.authorName}
                    </span>
                    <span style={{
                        fontSize: "10px", fontWeight: 600,
                        color: accentColor,
                        background: accentColor + "1a",
                        padding: "0 5px", borderRadius: "3px",
                    }}>
                        {entry.isMention ? "@mention" : `"${entry.matchedKeyword}"`}
                    </span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>
                        {fmtTimestamp(entry.deletedAt)}
                    </span>
                </div>

                {/* Message text */}
                {entry.content && entry.content !== "(no text)" && (
                    <div style={{
                        fontSize: "14px", color: "var(--text-normal)",
                        lineHeight: "1.4", wordBreak: "break-word" as const, whiteSpace: "pre-wrap" as const,
                    }}>
                        {entry.content}
                    </div>
                )}

                {/* Attachments */}
                {entry.attachments && entry.attachments.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px", marginTop: "4px" }}>
                        {entry.attachments.map((att, i) => {
                            const isImg = att.contentType?.startsWith("image/") ?? /\.(png|jpe?g|gif|webp)$/i.test(att.filename);
                            const isVid = att.contentType?.startsWith("video/") ?? /\.(mp4|webm|mov)$/i.test(att.filename);
                            if (isImg) return (
                                <a key={i} href={att.url} target="_blank" rel="noreferrer" title={att.filename}>
                                    <img src={att.proxyUrl ?? att.url} alt={att.filename}
                                        style={{ maxWidth: "220px", maxHeight: "140px", borderRadius: "6px", objectFit: "cover" as const, display: "block" }}
                                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                                    />
                                </a>
                            );
                            if (isVid) return (
                                <video key={i} src={att.url} controls
                                    style={{ maxWidth: "220px", maxHeight: "140px", borderRadius: "6px" }} />
                            );
                            return (
                                <a key={i} href={att.url} target="_blank" rel="noreferrer"
                                    style={{ fontSize: "12px", color: "var(--text-link)" }} onClick={e => e.stopPropagation()}>
                                    📎 {att.filename}
                                </a>
                            );
                        })}
                    </div>
                )}

                {/* Location */}
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "3px" }}>
                    #{channelName}{guildName ? ` · ${guildName}` : ""}
                </div>
            </div>

            {/* Delete button (normal mode, on hover) */}
            {!selectionMode && hovered && (
                <button
                    onClick={e => { e.stopPropagation(); deleteEntry(entry.uid); }}
                    title="Delete this entry"
                    style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--text-muted)", fontSize: "16px", padding: "0 4px",
                        alignSelf: "flex-start", flexShrink: 0, lineHeight: 1,
                    }}
                >
                    ×
                </button>
            )}
        </div>
    );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function DeletedMessageModal({ modalProps }: { modalProps: RenderModalProps; }) {
    const forceUpdate = useForceUpdater();
    useEffect(() => subscribe(forceUpdate), []);

    const log = getLog();
    const [selectionMode, setSelectionMode] = useState(false);
    const [selected, setSelected] = useState(new Set<string>());

    function toggleSelect(uid: string) {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(uid)) next.delete(uid);
            else next.add(uid);
            return next;
        });
    }

    function toggleSelectAll() {
        if (selected.size === log.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(log.map(e => e.uid)));
        }
    }

    function cancelSelection() {
        setSelectionMode(false);
        setSelected(new Set());
    }

    function deleteSelected() {
        deleteEntries(selected);
        cancelSelection();
    }

    const allSelected = selected.size === log.length && log.length > 0;

    return (
        <Modal {...modalProps} title="Deleted Message Log">
            <div style={{ padding: "8px 4px" }}>
                {/* Toolbar */}
                <div style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    marginBottom: "8px", padding: "0 4px",
                }}>
                    {selectionMode ? (
                        <>
                            <button onClick={toggleSelectAll} style={{
                                background: "none", border: "none", cursor: "pointer",
                                fontSize: "12px", color: "var(--text-muted)", padding: 0,
                            }}>
                                {allSelected ? "Deselect all" : "Select all"}
                            </button>
                            <Text variant="text-sm/normal" style={{ color: "var(--text-muted)", flex: 1 }}>
                                {selected.size > 0 ? `${selected.size} selected` : ""}
                            </Text>
                            <Button size={Button.Sizes.SMALL} onClick={cancelSelection}>
                                Cancel
                            </Button>
                            {selected.size > 0 && (
                                <Button size={Button.Sizes.SMALL} color={Button.Colors.RED} onClick={deleteSelected}>
                                    Delete ({selected.size})
                                </Button>
                            )}
                        </>
                    ) : (
                        <>
                            <Text variant="text-sm/normal" style={{ color: "var(--text-muted)", flex: 1 }}>
                                {log.length === 0 ? "Nothing logged yet" : `${log.length} deleted message${log.length !== 1 ? "s" : ""}`}
                            </Text>
                            {log.length > 0 && (<>
                                <Button size={Button.Sizes.SMALL} onClick={() => setSelectionMode(true)}>
                                    Select
                                </Button>
                                <Button size={Button.Sizes.SMALL} color={Button.Colors.RED} onClick={clearLog}>
                                    Clear all
                                </Button>
                            </>)}
                        </>
                    )}
                </div>

                {/* Log list */}
                {log.length === 0 ? (
                    <div style={{ padding: "32px 16px", textAlign: "center" as const, color: "var(--text-muted)", fontSize: "14px" }}>
                        Messages that mention you or contain your keywords will appear here when deleted.
                    </div>
                ) : (
                    <div style={{ maxHeight: "65vh", overflowY: "auto", display: "flex", flexDirection: "column" }}>
                        {log.map(entry => (
                            <EntryRow
                                key={entry.uid}
                                entry={entry}
                                selectionMode={selectionMode}
                                selected={selected.has(entry.uid)}
                                onToggle={() => toggleSelect(entry.uid)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
}

// ─── Opener ───────────────────────────────────────────────────────────────────

export function openLogModal(): void {
    openModal(props => <DeletedMessageModal modalProps={props} />);
}
