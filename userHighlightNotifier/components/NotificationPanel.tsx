/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Forms, Slider, useState } from "@webpack/common";

import { getNotificationPrefs, updateNotificationPrefs } from "../data";
import { NotificationPrefs } from "../settings";

// ─── Setting row ─────────────────────────────────────────────────────────────

function SettingRow({ label, description, checked, onChange, indent = false, dot }: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    indent?: boolean;
    /** Colored status dot shown before the label (hex color string). */
    dot?: string;
}) {
    return (
        <label style={{
            display: "flex", alignItems: "flex-start", gap: "12px",
            padding: "7px 10px", borderRadius: "8px", cursor: "pointer",
            marginLeft: indent ? "16px" : 0,
            background: checked ? "var(--background-modifier-hover)" : "transparent",
            transition: "background 0.15s ease",
        }}>
            {/* Toggle — border approach keeps the track visible on any bg color */}
            <div style={{
                position: "relative" as const,
                width: "36px", height: "20px", borderRadius: "10px",
                background: checked ? "var(--brand-500)" : "transparent",
                border: `2px solid ${checked ? "var(--brand-500)" : "var(--interactive-muted)"}`,
                flexShrink: 0, marginTop: "1px",
                transition: "background 0.2s ease, border-color 0.2s ease",
                boxSizing: "border-box" as const,
            }}>
                <div style={{
                    position: "absolute" as const,
                    width: "14px", height: "14px", borderRadius: "50%",
                    background: checked ? "white" : "var(--interactive-muted)",
                    top: "1px",
                    left: checked ? "17px" : "1px",
                    transition: "left 0.2s ease, background 0.2s ease",
                    boxShadow: checked ? "0 1px 3px rgba(0,0,0,0.4)" : "none",
                }} />
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => onChange(e.target.checked)}
                    style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer", margin: 0 }}
                />
            </div>
            {/* Optional status dot */}
            {dot && (
                <span style={{
                    width: "10px", height: "10px", borderRadius: "50%",
                    background: dot, flexShrink: 0, marginTop: "5px",
                    boxShadow: `0 0 5px ${dot}`,
                    display: "inline-block",
                }} />
            )}
            <div>
                <div style={{ fontSize: "14px", color: "var(--text-normal)", fontWeight: 500, lineHeight: "20px" }}>{label}</div>
                {description && (
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "1px" }}>{description}</div>
                )}
            </div>
        </label>
    );
}

// ─── Collapsible section card ─────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode; }) {
    const [open, setOpen] = useState(false);

    return (
        <div style={{
            background: "var(--background-secondary-alt)",
            borderRadius: "10px",
            overflow: "hidden",
        }}>
            {/* Header — click to toggle */}
            <div
                role="button"
                onClick={() => setOpen(v => !v)}
                style={{
                    display: "flex", alignItems: "center",
                    padding: "10px 14px", cursor: "pointer",
                    userSelect: "none" as const,
                }}
            >
                <span style={{
                    flex: 1, fontSize: "11px", fontWeight: 700,
                    color: "var(--text-muted)", textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                }}>
                    {title}
                </span>
                <span style={{
                    fontSize: "14px", color: "var(--text-muted)",
                    display: "inline-block",
                    transform: open ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                    lineHeight: 1,
                }}>
                    ›
                </span>
            </div>

            {/* Content — only rendered when open */}
            {open && (
                <div style={{ paddingBottom: "6px", borderTop: "1px solid var(--background-modifier-accent)" }}>
                    {children}
                </div>
            )}
        </div>
    );
}

// ─── Style selector ───────────────────────────────────────────────────────────

function StyleSelector({ value, onChange }: { value: string; onChange: (v: NotificationPrefs["style"]) => void; }) {
    const opts: { v: NotificationPrefs["style"]; label: string; }[] = [
        { v: "toast", label: "Toast" },
        { v: "card", label: "In-app card" },
        { v: "both", label: "Both" },
    ];
    return (
        <div style={{ display: "flex", gap: "6px", padding: "4px 10px 10px" }}>
            {opts.map(o => (
                <button
                    key={o.v}
                    onClick={() => onChange(o.v)}
                    style={{
                        flex: 1,
                        padding: "6px 0",
                        borderRadius: "8px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 500,
                        background: value === o.v ? "var(--brand-500)" : "var(--background-modifier-accent)",
                        color: value === o.v ? "white" : "var(--text-muted)",
                        transition: "all 0.15s ease",
                    }}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function NotificationPanel() {
    // Local state — NotificationPanel manages its own rendering independently.
    // updateNotificationPrefs() still calls notifyAll() so CategoryManager
    // (and thus the 🔔 chip visibility) stays in sync.
    const [prefs, setPrefs] = useState(() => getNotificationPrefs());

    function set(patch: Partial<NotificationPrefs>) {
        const next = { ...prefs, ...patch };
        setPrefs(next);
        updateNotificationPrefs(patch);
    }

    const p = prefs;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px" }}>
                <Forms.FormTitle style={{ margin: 0 }}>Notifications</Forms.FormTitle>
                {/* Master on/off */}
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <span style={{ fontSize: "13px", color: p.enabled ? "var(--text-positive)" : "var(--text-muted)" }}>
                        {p.enabled ? "On" : "Off"}
                    </span>
                    <div style={{
                        position: "relative" as const, width: "40px", height: "22px",
                        borderRadius: "11px",
                        background: p.enabled ? "var(--brand-500)" : "transparent",
                        border: `2px solid ${p.enabled ? "var(--brand-500)" : "var(--interactive-muted)"}`,
                        transition: "background 0.2s ease, border-color 0.2s ease", flexShrink: 0,
                        boxSizing: "border-box" as const,
                    }}>
                        <div style={{
                            position: "absolute" as const, width: "16px", height: "16px",
                            borderRadius: "50%",
                            background: p.enabled ? "white" : "var(--interactive-muted)",
                            top: "1px",
                            left: p.enabled ? "20px" : "1px",
                            transition: "left 0.2s ease, background 0.2s ease",
                            boxShadow: p.enabled ? "0 1px 3px rgba(0,0,0,0.4)" : "none",
                        }} />
                        <input type="checkbox" checked={p.enabled} onChange={e => set({ enabled: e.target.checked })}
                            style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer", margin: 0 }} />
                    </div>
                </label>
            </div>

            {p.enabled && (<>
                <Forms.FormText style={{ marginTop: "-6px" }}>
                    Notifications fire for users in categories where 🔔 is enabled.
                </Forms.FormText>

                {/* Voice */}
                <Section title="Voice">
                    <SettingRow label="Join" description="User joins a voice channel" dot="#23a55a" checked={p.voiceJoin} onChange={v => set({ voiceJoin: v })} />
                    <SettingRow label="Leave" description="User leaves a voice channel" dot="#f23f43" checked={p.voiceLeave} onChange={v => set({ voiceLeave: v })} />
                    <SettingRow label="Move" description="User switches voice channels" dot="#5865f2" checked={p.voiceMove} onChange={v => set({ voiceMove: v })} />
                    <SettingRow label="Stream" description="User starts streaming or screen sharing" dot="#593695" checked={p.stream} onChange={v => set({ stream: v })} />
                    <SettingRow label="Ignore if in same channel" checked={p.ignoreSameVoice} onChange={v => set({ ignoreSameVoice: v })} />
                </Section>

                {/* Presence */}
                <Section title="Presence">
                    <SettingRow label="Comes online" dot="#23a55a" checked={p.online} onChange={v => set({ online: v })} />
                    <SettingRow label="Goes offline" dot="#80848e" checked={p.offline} onChange={v => set({ offline: v })} />
                    <SettingRow label="Status change" description="Online ↔ Idle ↔ Do Not Disturb" dot="#f0b232" checked={p.statusChange} onChange={v => set({ statusChange: v })} />
                </Section>

                {/* Display */}
                <Section title="Display">
                    <div style={{ padding: "4px 10px 2px" }}>
                        <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "6px" }}>Style</div>
                        <StyleSelector value={p.style} onChange={v => set({ style: v })} />
                    </div>
                    <SettingRow label="Play sound" checked={p.sound} onChange={v => set({ sound: v })} />
                    {p.sound && (
                        <div style={{ padding: "4px 14px 10px" }}>
                            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                                Volume — {p.soundVolume}%
                            </div>
                            <Slider
                                minValue={0}
                                maxValue={100}
                                initialValue={p.soundVolume}
                                onValueChange={v => set({ soundVolume: Math.round(v) })}
                                markers={[0, 25, 50, 75, 100]}
                            />
                        </div>
                    )}
                </Section>
            </>)}
        </div>
    );
}
