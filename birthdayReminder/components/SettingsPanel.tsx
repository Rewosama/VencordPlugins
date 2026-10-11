/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { useForceUpdater } from "@utils/react";
import { Button, Forms, Text, useEffect, UserStore, useState } from "@webpack/common";

import {
    deleteBirthday,
    exportBirthdays,
    getAllBirthdays,
    getBirthday,
    importBirthdays,
    subscribe,
} from "../store";
import { openSetBirthdayModal } from "./SetBirthdayModal";

const logger = new Logger("birthdayReminder/SettingsPanel");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── Export / Import ──────────────────────────────────────────────────────────

function doExport() {
    const data = exportBirthdays(id => {
        const u = UserStore.getUser(id);
        return u?.globalName ?? u?.username;
    });
    const blob = new Blob([JSON.stringify({ version: 1, birthdays: data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `birthdays-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function doImport(file: File, mode: "merge" | "overwrite", onDone: (msg: string) => void) {
    const reader = new FileReader();
    reader.onload = async e => {
        try {
            const raw = JSON.parse(e.target!.result as string);
            const entries = raw.birthdays ?? raw;
            if (!Array.isArray(entries)) throw new Error("invalid");
            const { added } = await importBirthdays(entries, mode);
            onDone(`Imported ${added} birthday${added !== 1 ? "s" : ""}.`);
        } catch (err) {
            logger.error(err);
            onDone("Import failed — invalid file.");
        }
    };
    reader.readAsText(file);
}

// ─── Birthday row ─────────────────────────────────────────────────────────────

function BirthdayRow({ userId }: { userId: string; }) {
    const user = UserStore.getUser(userId);
    const name = user?.globalName ?? user?.username ?? userId;
    const b = getBirthday(userId);
    if (!b) return null;

    const dateStr = `${MONTHS[b.month - 1]} ${b.day}${b.year ? `, ${b.year}` : ""}`;

    return (
        <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "6px 4px",
            borderBottom: "1px solid var(--background-modifier-accent)",
        }}>
            {user?.getAvatarURL && (
                <img src={user.getAvatarURL(undefined, 28)} alt=""
                    style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0 }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
            )}
            <Text variant="text-sm/semibold" style={{ flex: 1, color: "var(--text-normal)" }}>
                {name}
            </Text>
            <Text variant="text-sm/normal" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                🎂 {dateStr}
            </Text>
            <Button
                size={Button.Sizes.SMALL}
                onClick={() => openSetBirthdayModal(userId, name)}
            >
                Edit
            </Button>
            <Button
                size={Button.Sizes.SMALL}
                color={Button.Colors.RED}
                onClick={() => deleteBirthday(userId)}
            >
                ×
            </Button>
        </div>
    );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function SettingsPanel() {
    const forceUpdate = useForceUpdater();
    useEffect(() => subscribe(forceUpdate), []);

    const [status, setStatus] = useState("");
    const all = getAllBirthdays();

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
                            onClick={() => document.getElementById("br-imp-m")?.click()}>
                            📥 Import (merge)
                        </Button>
                        <input id="br-imp-m" type="file" accept=".json" style={{ display: "none" }}
                            onChange={e => handleImport(e, "merge")} />
                    </label>
                    <label>
                        <Button size={Button.Sizes.SMALL} color={Button.Colors.RED}
                            onClick={() => document.getElementById("br-imp-o")?.click()}>
                            📥 Import (overwrite)
                        </Button>
                        <input id="br-imp-o" type="file" accept=".json" style={{ display: "none" }}
                            onChange={e => handleImport(e, "overwrite")} />
                    </label>
                    {status && (
                        <Text variant="text-xs/normal" style={{ color: "var(--text-positive)" }}>
                            {status}
                        </Text>
                    )}
                </div>
            </div>

            {/* List */}
            <div>
                <Forms.FormTitle>
                    Birthdays{all.length > 0 ? ` (${all.length})` : ""}
                </Forms.FormTitle>
                {all.length === 0 ? (
                    <Forms.FormText>
                        No birthdays saved yet. Right-click any user to set their birthday.
                    </Forms.FormText>
                ) : (
                    <div>
                        {all
                            .sort((a, b) => a.month !== b.month ? a.month - b.month : a.day - b.day)
                            .map(b => <BirthdayRow key={b.userId} userId={b.userId} />)
                        }
                    </div>
                )}
            </div>
        </div>
    );
}
