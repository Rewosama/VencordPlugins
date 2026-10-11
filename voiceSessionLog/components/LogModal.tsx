/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useForceUpdater } from "@utils/react";
import type { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, openUserProfileModal, useEffect } from "@webpack/common";

import {
    clearCurrentEntries,
    getCurrentSession,
    getPastSessions,
    subscribe,
    VoiceLogEntry,
    VoiceSession,
} from "../logger";

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_COLOR: Record<VoiceLogEntry["event"], string> = {
    join: "#23a55a",
    leave: "#f23f43",
    move: "#5865f2",
    stream: "#593695",
};

const EVENT_LABEL: Record<VoiceLogEntry["event"], string> = {
    join: "joined",
    leave: "left",
    move: "moved",
    stream: "started streaming",
};

// ─── Utils ────────────────────────────────────────────────────────────────────

function fmtTime(ts: number): string {
    return new Date(ts).toLocaleTimeString("en", {
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });
}

function fmtDuration(startMs: number, endMs = Date.now()): string {
    const s = Math.floor((endMs - startMs) / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function fmtEntryDesc(e: VoiceLogEntry): string {
    switch (e.event) {
        case "join":
            return `joined${e.channelName ? ` #${e.channelName}` : ""}`;
        case "leave":
            return "left";
        case "move":
            return `${e.fromChannelName ? `#${e.fromChannelName}` : "?"} → ${e.channelName ? `#${e.channelName}` : "?"}`;
        case "stream":
            return `started streaming${e.channelName ? ` in #${e.channelName}` : ""}`;
    }
}

// ─── Entry row ────────────────────────────────────────────────────────────────

function EntryRow({ entry }: { entry: VoiceLogEntry; }) {
    const color = EVENT_COLOR[entry.event];
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "5px 8px", borderRadius: "6px",
            transition: "background 0.1s",
        }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--background-modifier-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
            {/* Timestamp */}
            <span style={{
                fontFamily: "monospace", fontSize: "12px",
                color: "var(--text-muted)", flexShrink: 0, width: "64px",
            }}>
                {fmtTime(entry.ts)}
            </span>

            {/* Event dot */}
            <span style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: color, flexShrink: 0,
                boxShadow: `0 0 5px ${color}88`,
            }} />

            {/* Avatar */}
            {entry.avatarUrl && (
                <img
                    src={entry.avatarUrl} alt=""
                    style={{ width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0 }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
            )}

            {/* Username (clickable → opens profile) + description */}
            <span style={{ fontSize: "14px", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <strong
                    style={{ color, cursor: "pointer" }}
                    onClick={() => openUserProfileModal({ userId: entry.userId })}
                    title="Open profile"
                >
                    {entry.username}
                </strong>
                {" "}
                <span style={{ color: "var(--text-muted)" }}>{fmtEntryDesc(entry)}</span>
            </span>
        </div>
    );
}

// ─── Session block ────────────────────────────────────────────────────────────

function SessionBlock({ session, active }: { session: VoiceSession; active: boolean; }) {
    const color = active ? "#23a55a" : "var(--text-muted)";
    const duration = active
        ? `Active · ${fmtDuration(session.startedAt)}`
        : `${fmtTime(session.startedAt)} · ${fmtDuration(session.startedAt, session.endedAt)}`;

    return (
        <div style={{ marginBottom: "16px" }}>
            {/* Header */}
            <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "8px 12px",
                background: "var(--background-secondary-alt)",
                borderRadius: "10px",
                marginBottom: "4px",
            }}>
                <span style={{
                    width: "10px", height: "10px", borderRadius: "50%",
                    background: color, flexShrink: 0,
                    boxShadow: active ? `0 0 7px ${color}` : "none",
                }} />
                <span style={{ flex: 1, fontWeight: 700, fontSize: "14px", color }}>
                    #{session.channelName}
                    {session.guildName && (
                        <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: "6px" }}>
                            {session.guildName}
                        </span>
                    )}
                </span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{duration}</span>
                {active && session.entries.length > 0 && (
                    <button
                        onClick={clearCurrentEntries}
                        style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--text-muted)", fontSize: "12px",
                            padding: "2px 8px", borderRadius: "4px",
                        }}
                        title="Clear current session log"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Entries */}
            {session.entries.length === 0 ? (
                <div style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: "13px", fontStyle: "italic" }}>
                    {active ? "Waiting for activity in this channel…" : "No events recorded."}
                </div>
            ) : (
                <div>
                    {session.entries.map((e, i) => <EntryRow key={i} entry={e} />)}
                </div>
            )}
        </div>
    );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function VoiceLogModal({ modalProps }: { modalProps: RenderModalProps; }) {
    const forceUpdate = useForceUpdater();

    // Re-render whenever the log changes
    useEffect(() => subscribe(forceUpdate), []);

    const current = getCurrentSession();
    const past = getPastSessions();
    const hasAny = current !== null || past.length > 0;

    return (
        <Modal
            {...modalProps}
            title="Voice Session Log"
            size="md"
        >
            <div style={{ padding: "4px 4px 8px", maxHeight: "60vh", overflowY: "auto" }}>
                {!hasAny && (
                    <div style={{
                        padding: "32px 16px",
                        textAlign: "center" as const,
                        color: "var(--text-muted)",
                        fontSize: "14px",
                    }}>
                        No sessions yet. Join a voice channel and this log will track who comes and goes.
                    </div>
                )}

                {current && (
                    <SessionBlock session={current} active={true} />
                )}

                {past.length > 0 && (
                    <>
                        {current && (
                            <div style={{
                                height: "1px",
                                background: "var(--background-modifier-accent)",
                                margin: "8px 0 16px",
                            }} />
                        )}
                        <div style={{
                            fontSize: "11px", fontWeight: 700, color: "var(--text-muted)",
                            textTransform: "uppercase" as const, letterSpacing: "0.06em",
                            padding: "0 8px 8px",
                        }}>
                            Previous Sessions
                        </div>
                        {past.map(s => (
                            <SessionBlock key={s.id} session={s} active={false} />
                        ))}
                    </>
                )}
            </div>
        </Modal>
    );
}

// ─── Opener ───────────────────────────────────────────────────────────────────

export function openLogModal(): void {
    const key = openModal(props => (
        <VoiceLogModal modalProps={props} />
    ));
    void key;
}
