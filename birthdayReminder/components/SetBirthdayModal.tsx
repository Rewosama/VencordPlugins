/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import type { RenderModalProps } from "@vencord/discord-types";
import { Button, closeModal, Forms, Modal, openModal, Select, useState } from "@webpack/common";

import { deleteBirthday, getBirthday, setBirthday } from "../store";

const logger = new Logger("birthdayReminder/SetBirthdayModal");

const MONTHS = [
    { label: "January", value: 1 }, { label: "February", value: 2 },
    { label: "March", value: 3 }, { label: "April", value: 4 },
    { label: "May", value: 5 }, { label: "June", value: 6 },
    { label: "July", value: 7 }, { label: "August", value: 8 },
    { label: "September", value: 9 }, { label: "October", value: 10 },
    { label: "November", value: 11 }, { label: "December", value: 12 },
];

function daysInMonth(month: number): number {
    // Use a non-leap year for the picker (Feb → 29 still allowed for Feb 29 birthdays)
    return month === 2 ? 29 : new Date(2001, month, 0).getDate();
}

interface Props {
    userId: string;
    username: string;
    modalProps: RenderModalProps;
    closeMe: () => void;
}

function SetBirthdayModal({ userId, username, modalProps, closeMe }: Props) {
    const existing = getBirthday(userId);
    const [month, setMonth] = useState<number>(existing?.month ?? 1);
    const [day, setDay] = useState<number>(existing?.day ?? 1);
    const [year, setYear] = useState<string>(existing?.year?.toString() ?? "");

    const days = Array.from({ length: daysInMonth(month) }, (_, i) => ({
        label: String(i + 1), value: i + 1,
    }));

    async function onSave() {
        try {
            const y = year.trim() ? parseInt(year.trim(), 10) : undefined;
            await setBirthday(userId, month, day, y);
        } catch (e) { logger.error(e); }
        closeMe();
    }

    async function onDelete() {
        try { await deleteBirthday(userId); } catch (e) { logger.error(e); }
        closeMe();
    }

    return (
        <Modal
            {...modalProps}
            title={`Birthday — ${username}`}
            actions={[
                { text: "Cancel", variant: "secondary", onClick: closeMe },
                { text: "Save", variant: "primary", onClick: onSave },
            ]}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "4px 0 8px" }}>
                {/* Month */}
                <section>
                    <Forms.FormTitle>Month</Forms.FormTitle>
                    <Select
                        options={MONTHS}
                        isSelected={v => v === month}
                        select={v => { setMonth(v); if (day > daysInMonth(v)) setDay(1); }}
                        serialize={v => String(v)}
                        placeholder="Select month"
                    />
                </section>

                {/* Day */}
                <section>
                    <Forms.FormTitle>Day</Forms.FormTitle>
                    <Select
                        options={days}
                        isSelected={v => v === day}
                        select={setDay}
                        serialize={v => String(v)}
                        placeholder="Select day"
                    />
                </section>

                {/* Year (optional) */}
                <section>
                    <Forms.FormTitle>Year (optional)</Forms.FormTitle>
                    <Forms.FormText>Only used to display age. Leave blank to keep private.</Forms.FormText>
                    <input
                        type="number"
                        value={year}
                        onChange={e => setYear(e.target.value)}
                        placeholder="e.g. 1995"
                        min={1900}
                        max={new Date().getFullYear()}
                        style={{
                            marginTop: "8px",
                            width: "100%",
                            padding: "8px 10px",
                            background: "var(--input-background)",
                            border: "1px solid var(--input-border)",
                            borderRadius: "4px",
                            color: "var(--text-normal)",
                            fontSize: "14px",
                        }}
                    />
                </section>

                {/* Delete */}
                {existing && (
                    <Button size={Button.Sizes.SMALL} color={Button.Colors.RED} onClick={onDelete}
                        style={{ alignSelf: "flex-start" }}>
                        Delete Birthday
                    </Button>
                )}
            </div>
        </Modal>
    );
}

export function openSetBirthdayModal(userId: string, username: string): void {
    const key = openModal(props => (
        <SetBirthdayModal
            userId={userId}
            username={username}
            modalProps={props}
            closeMe={() => closeModal(key)}
        />
    ));
}
