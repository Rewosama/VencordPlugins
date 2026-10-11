/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { useForceUpdater } from "@utils/react";
import { Button, Forms, Text, TextInput, useEffect, UserStore, useState } from "@webpack/common";

import { deleteAllUserNotes, exportAll, getAllUserIds, getUserNotes, importBackup, subscribe } from "../store";
import { openUserNotesModal } from "./UserNotesModal";

const logger = new Logger("userNotes/AllNotesPanel");

// ─── Export ───────────────────────────────────────────────────────────────────

function doExport() {
    const data = exportAll(id => {
        const u = UserStore.getUser(id);
        return u?.globalName ?? u?.username;
    });
    const blob = new Blob([JSON.stringify({ version: 2, data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `userNotes-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ─── Import ───────────────────────────────────────────────────────────────────

function doImport(file: File, mode: "merge" | "overwrite", onDone: (msg: string) => void) {
    const reader = new FileReader();
    reader.onload = async e => {
        try {
            const raw = JSON.parse(e.target!.result as string);
            const entries = raw.data ?? raw.notes ?? raw;
            if (!Array.isArray(entries)) throw new Error("invalid");
            const { added } = await importBackup(entries, mode);
            onDone(`Imported ${added} note${added !== 1 ? "s" : ""}.`);
        } catch (err) {
            logger.error(err);
            onDone("Import failed — invalid file.");
        }
    };
    reader.readAsText(file);
}

// ─── User chip ────────────────────────────────────────────────────────────────

function UserChip({ userId }: { userId: string; }) {
    const user = UserStore.getUser(userId);
    const username = user?.globalName ?? user?.username ?? userId;
    const count = getUserNotes(userId).length;

    return (
        <div
            onClick={() => openUserNotesModal(userId, username)}
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 10px",
                background: "var(--background-secondary-alt)",
                borderRadius: "20px",
                cursor: "pointer",
                transition: "background 0.1s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--background-modifier-hover)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--background-secondary-alt)"; }}
        >
            {user?.getAvatarURL && (
                <img
                    src={user.getAvatarURL(undefined, 24)} alt=""
                    style={{ width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0 }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
            )}
            <Text variant="text-sm/medium" style={{ color: "var(--text-normal)" }}>
                {username}
            </Text>
            <span style={{
                background: "var(--brand-500)", color: "white",
                borderRadius: "10px", fontSize: "10px", fontWeight: 700,
                padding: "1px 6px", lineHeight: 1.4,
            }}>
                {count}
            </span>
        </div>
    );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function AllNotesPanel() {
    const forceUpdate = useForceUpdater();
    useEffect(() => subscribe(forceUpdate), []);

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");

    const userIds = getAllUserIds();
    const filtered = search.trim()
        ? userIds.filter(id => {
            const u = UserStore.getUser(id);
            return (u?.globalName ?? u?.username ?? id)
                .toLowerCase()
                .includes(search.trim().toLowerCase());
        })
        : userIds;

    const total = userIds.reduce((s, id) => s + getUserNotes(id).length, 0);

    function handleImport(e: React.ChangeEvent<HTMLInputElement>, mode: "merge" | "overwrite") {
        const file = e.target.files?.[0];
        if (file) doImport(file, mode, setStatus);
        e.target.value = "";
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Backup */}
            <div>
                <Forms.FormTitle>Backup</Forms.FormTitle>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const, alignItems: "center" }}>
                    <Button size={Button.Sizes.SMALL} color={Button.Colors.PRIMARY} onClick={doExport}>
                        📤 Export
                    </Button>
                    <label>
                        <Button size={Button.Sizes.SMALL} color={Button.Colors.PRIMARY}
                            onClick={() => document.getElementById("un-imp-m")?.click()}>
                            📥 Import (merge)
                        </Button>
                        <input id="un-imp-m" type="file" accept=".json" style={{ display: "none" }}
                            onChange={e => handleImport(e, "merge")} />
                    </label>
                    <label>
                        <Button size={Button.Sizes.SMALL} color={Button.Colors.RED}
                            onClick={() => document.getElementById("un-imp-o")?.click()}>
                            📥 Import (overwrite)
                        </Button>
                        <input id="un-imp-o" type="file" accept=".json" style={{ display: "none" }}
                            onChange={e => handleImport(e, "overwrite")} />
                    </label>
                    <Button size={Button.Sizes.SMALL} color={Button.Colors.RED}
                        onClick={async () => {
                            for (const id of [...getAllUserIds()]) {
                                await deleteAllUserNotes(id);
                            }
                            setStatus("All notes deleted.");
                        }}
                    >
                        🗑 Delete all
                    </Button>
                    {status && (
                        <Text variant="text-xs/normal" style={{ color: "var(--text-positive)" }}>
                            {status}
                        </Text>
                    )}
                </div>
            </div>

            {/* People with notes */}
            <div>
                <Forms.FormTitle>
                    People with notes{total > 0 ? ` · ${total} note${total !== 1 ? "s" : ""} across ${userIds.length} user${userIds.length !== 1 ? "s" : ""}` : ""}
                </Forms.FormTitle>

                {userIds.length === 0 ? (
                    <Forms.FormText>
                        No notes yet. Right-click any user to add one.
                    </Forms.FormText>
                ) : (
                    <>
                        {userIds.length > 4 && (
                            <TextInput value={search} onChange={setSearch}
                                placeholder="Search…" style={{ marginBottom: "10px" }} />
                        )}
                        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px" }}>
                            {filtered.map(id => <UserChip key={id} userId={id} />)}
                        </div>
                    </>
                )}
            </div>

        </div>
    );
}
