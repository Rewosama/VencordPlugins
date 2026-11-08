/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Export / Import buttons for backing up and restoring all plugin data:
 * categories (with users), ignored servers and notification preferences.
 */

import { Button } from "@components/Button";
import { Logger } from "@utils/Logger";
import { showToast } from "@webpack/common";

import {
    BackupData,
    getCategories,
    getIgnoredGuilds,
    getNotificationPrefs,
    importAllData,
} from "../data";

const logger = new Logger("UserHighlightNotifier/ImportExport");

function doExport(): void {
    const backup: BackupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        categories: getCategories(),
        ignoredGuilds: getIgnoredGuilds(),
        notificationPrefs: getNotificationPrefs(),
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `userHighlight-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast({ text: "UserHighlight backup exported." });
}

function doImport(file: File): void {
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const raw = e.target?.result;
            if (typeof raw !== "string") throw new Error("Unreadable file");

            const data = JSON.parse(raw) as Partial<BackupData>;
            if (data.version !== 1) throw new Error("Unsupported backup version");

            importAllData(data);
            showToast({ text: "UserHighlight backup imported successfully." });
        } catch (err) {
            logger.error("Import failed:", err);
            showToast({ text: "Import failed — invalid or corrupted backup file." });
        }
    };
    reader.readAsText(file);
}

export function ImportExport() {
    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) doImport(file);
        e.target.value = "";
    }

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Button size="small" onClick={doExport}>
                📤 Export Settings
            </Button>
            <label style={{ cursor: "pointer" }}>
                <Button
                    size="small"
                    onClick={() => { document.getElementById("vc-uh-import-input")?.click(); }}
                >
                    📥 Import Settings
                </Button>
                <input
                    id="vc-uh-import-input"
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                />
            </label>
        </div>
    );
}
