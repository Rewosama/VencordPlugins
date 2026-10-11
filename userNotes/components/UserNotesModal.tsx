/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Per-user notes modal — opened from the profile button or right-click.
 * Lists all notes for one user with add / delete / multi-select.
 */

import { Logger } from "@utils/Logger";
import { useForceUpdater } from "@utils/react";
import type { RenderModalProps } from "@vencord/discord-types";
import { Button, closeModal, Forms, Modal, openModal, Text, TextArea, useEffect, useState } from "@webpack/common";

import { addNote, deleteAllUserNotes, deleteNotes, getUserNotes, subscribe, updateNote, UserNote } from "../store";

const logger = new Logger("userNotes/UserNotesModal");

// ─── Note row ─────────────────────────────────────────────────────────────────

function NoteRow({
    note,
    selectionMode,
    selected,
    onToggle,
    onEdit,
}: {
    note: UserNote;
    selectionMode: boolean;
    selected: boolean;
    onToggle: () => void;
    onEdit: () => void;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(note.content);
    const [hovered, setHovered] = useState(false);

    async function onSave() {
        if (!draft.trim()) return;
        try { await updateNote(note.id, draft); } catch (e) { logger.error(e); }
        setEditing(false);
    }

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={selectionMode ? onToggle : undefined}
            style={{
                display: "flex", gap: "8px", alignItems: "flex-start",
                padding: "8px 6px",
                borderBottom: "1px solid var(--background-modifier-accent)",
                background: selected ? "var(--brand-500)12" : "transparent",
                cursor: selectionMode ? "pointer" : "default",
            }}
        >
            {/* Checkbox (selection mode) */}
            {selectionMode && (
                <div style={{
                    width: "16px", height: "16px", borderRadius: "3px", flexShrink: 0,
                    border: `2px solid ${selected ? "var(--brand-500)" : "var(--interactive-muted)"}`,
                    background: selected ? "var(--brand-500)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginTop: "2px", transition: "all 0.1s",
                }}>
                    {selected && <span style={{ color: "white", fontSize: "10px", fontWeight: 700 }}>✓</span>}
                </div>
            )}

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {editing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <TextArea
                            value={draft}
                            onChange={setDraft}
                            rows={3}
                            autosize
                            onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) onSave(); }}
                        />
                        <div style={{ display: "flex", gap: "6px" }}>
                            <Button size={Button.Sizes.SMALL} onClick={onSave} disabled={!draft.trim()}>Save</Button>
                            <Button size={Button.Sizes.SMALL} color={Button.Colors.PRIMARY}
                                onClick={() => { setEditing(false); setDraft(note.content); }}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <Text variant="text-sm/normal"
                            style={{ color: "var(--text-normal)", whiteSpace: "pre-wrap" as const, wordBreak: "break-word" as const, cursor: selectionMode ? "inherit" : "pointer" }}
                            onClick={!selectionMode ? () => setEditing(true) : undefined}
                        >
                            {note.content}
                        </Text>
                        <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", marginTop: "3px" }}>
                            {new Date(note.updatedAt).toLocaleString()}
                        </Text>
                    </>
                )}
            </div>

            {/* Delete button (normal mode, on hover) */}
            {!selectionMode && !editing && hovered && (
                <button
                    onClick={e => { e.stopPropagation(); onEdit(); }}
                    style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--status-danger)", fontSize: "16px",
                        padding: "0 4px", flexShrink: 0, lineHeight: 1,
                    }}
                    title="Delete note"
                >
                    ×
                </button>
            )}
        </div>
    );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface UserNotesModalProps {
    userId: string;
    username: string;
    modalProps: RenderModalProps;
    closeMe: () => void;
}

function UserNotesModal({ userId, username, modalProps, closeMe }: UserNotesModalProps) {
    const forceUpdate = useForceUpdater();
    useEffect(() => subscribe(forceUpdate), [userId]);

    const [selectionMode, setSelectionMode] = useState(false);
    const [selected, setSelected] = useState(new Set<string>());
    const [addingNew, setAddingNew] = useState(false);
    const [newDraft, setNewDraft] = useState("");

    const notes = getUserNotes(userId);

    function toggleSelect(id: string) {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function cancelSelection() { setSelectionMode(false); setSelected(new Set()); }

    async function handleAdd() {
        if (!newDraft.trim()) return;
        try { await addNote(userId, newDraft); } catch (e) { logger.error(e); }
        setNewDraft("");
        setAddingNew(false);
    }

    async function handleDeleteSelected() {
        try { await deleteNotes(selected); } catch (e) { logger.error(e); }
        cancelSelection();
    }

    async function handleDeleteAll() {
        try { await deleteAllUserNotes(userId); } catch (e) { logger.error(e); }
        cancelSelection();
    }

    return (
        <Modal
            {...modalProps}
            title={`Notes — ${username}`}
        >
            <div style={{ padding: "8px 4px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {/* Toolbar */}
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    {selectionMode ? (
                        <>
                            <button onClick={() => {
                                const allIds = new Set(notes.map(n => n.id));
                                selected.size === notes.length ? setSelected(new Set()) : setSelected(allIds);
                            }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "12px", padding: 0 }}>
                                {selected.size === notes.length ? "Deselect all" : "Select all"}
                            </button>
                            <span style={{ flex: 1 }} />
                            <Button size={Button.Sizes.SMALL} onClick={cancelSelection}>Cancel</Button>
                            {selected.size > 0 && (
                                <Button size={Button.Sizes.SMALL} color={Button.Colors.RED} onClick={handleDeleteSelected}>
                                    Delete ({selected.size})
                                </Button>
                            )}
                        </>
                    ) : (
                        <>
                            <Forms.FormText style={{ flex: 1 }}>
                                {notes.length === 0 ? "No notes yet" : `${notes.length} note${notes.length !== 1 ? "s" : ""}`}
                            </Forms.FormText>
                            {notes.length > 0 && (
                                <Button size={Button.Sizes.SMALL} onClick={() => setSelectionMode(true)}>Select</Button>
                            )}
                            {notes.length > 0 && (
                                <Button size={Button.Sizes.SMALL} color={Button.Colors.RED} onClick={handleDeleteAll}>
                                    Delete all
                                </Button>
                            )}
                            <Button size={Button.Sizes.SMALL} color={Button.Colors.BRAND} onClick={() => setAddingNew(true)}>
                                + Add note
                            </Button>
                        </>
                    )}
                </div>

                {/* New note composer */}
                {addingNew && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "8px", background: "var(--background-secondary-alt)", borderRadius: "8px" }}>
                        <TextArea
                            value={newDraft}
                            onChange={setNewDraft}
                            placeholder="Write a note…"
                            rows={3}
                            autoFocus
                            autosize
                            onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleAdd(); }}
                        />
                        <Text variant="text-xs/normal" style={{ color: "var(--text-muted)" }}>Ctrl+Enter to save</Text>
                        <div style={{ display: "flex", gap: "6px" }}>
                            <Button size={Button.Sizes.SMALL} color={Button.Colors.BRAND} onClick={handleAdd} disabled={!newDraft.trim()}>
                                Save
                            </Button>
                            <Button size={Button.Sizes.SMALL} onClick={() => { setAddingNew(false); setNewDraft(""); }}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {/* Notes list */}
                {notes.length === 0 && !addingNew ? (
                    <div style={{ padding: "24px 16px", textAlign: "center" as const, color: "var(--text-muted)", fontSize: "14px" }}>
                        No notes yet. Click "+ Add note" to write your first note about {username}.
                    </div>
                ) : (
                    <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
                        {notes.map(note => (
                            <NoteRow
                                key={note.id}
                                note={note}
                                selectionMode={selectionMode}
                                selected={selected.has(note.id)}
                                onToggle={() => toggleSelect(note.id)}
                                onEdit={async () => { try { await deleteNotes(new Set([note.id])); } catch (e) { logger.error(e); } }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
}

// ─── Opener ───────────────────────────────────────────────────────────────────

export function openUserNotesModal(userId: string, username: string): void {
    const key = openModal(props => (
        <UserNotesModal
            userId={userId}
            username={username}
            modalProps={props}
            closeMe={() => closeModal(key)}
        />
    ));
}
