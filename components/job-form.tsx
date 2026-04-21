"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Rocket } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function JobForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
    const [loadingChannels, setLoadingChannels] = useState(true);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        reactionEmoji: "",
        timeWindowMinutes: 60,
        discordChannelId: "",
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "number" ? Number(value) : value,
        }));
    };

    useEffect(() => {
        async function fetchChannels() {
            try {
                const res = await fetch("/api/channels");
                const data = await res.json();
                if (data.success && data.channels) {
                    setChannels(data.channels);
                } else {
                    toast.error("Failed to load discord channels.");
                }
            } catch (error) {
                console.error("Error fetching channels:", error);
            } finally {
                setLoadingChannels(false);
            }
        }
        fetchChannels();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const expireAt = new Date(
                Date.now() + Number(formData.timeWindowMinutes) * 60000,
            ).toISOString();

            let finalEmoji = formData.reactionEmoji;
            if (finalEmoji === "") {
                const emojis = ["👍", "🚀", "💼", "🔥", "✅", "👀", "👨‍💻", "👋"];
                finalEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            }

            const res = await fetch("/api/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: formData.title.trim(),
                    description: formData.description,
                    emoji: finalEmoji,
                    channel: formData.discordChannelId,
                    expire_at: expireAt,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.error?.message || "Failed to post job");
            }

            toast.success("Job posted successfully!");
            setFormData({
                title: "",
                description: "",
                reactionEmoji: "",
                timeWindowMinutes: 60,
                discordChannelId: "",
            });
            router.refresh(); // Refresh the job tabe
        } catch (error: unknown) {
            const e = error as Error;
            toast.error(e.message || "Failed to post job. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const focusRing =
        "focus:border-[var(--mantis-primary)] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]";
    const selectCls = cn(
        "w-full rounded-md border border-[var(--mantis-border)] bg-[var(--mantis-paper)] px-3 py-2.5 text-sm text-[var(--mantis-text)] outline-none transition-all duration-200 appearance-none cursor-pointer disabled:opacity-50",
        focusRing,
    );

    return (
        <div className="rounded-lg border border-[var(--mantis-border)] bg-[var(--mantis-paper)] shadow-[var(--mantis-shadow-card)]">
            <div className="flex items-start justify-between px-6 pt-5 pb-4">
                <div>
                    <h2 className="text-base font-semibold text-[var(--mantis-text)]">Post a new job</h2>
                    <p className="mt-0.5 text-sm text-[var(--mantis-text-secondary)]">
                        Broadcast a freelance opportunity to your Discord server.
                    </p>
                </div>
            </div>

            <div className="mx-6 h-px bg-[var(--mantis-border)]" />

            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
                <div className="space-y-2">
                    <label
                        htmlFor="title"
                        className="text-xs font-medium text-[var(--mantis-text-secondary)]"
                    >
                        Job title
                    </label>
                    <input
                        id="title"
                        name="title"
                        type="text"
                        placeholder="e.g. Logo redesign for product launch"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        maxLength={200}
                        className={cn(
                            "w-full rounded-md border border-[var(--mantis-border)] bg-[var(--mantis-paper)] px-3 py-2.5 text-sm text-[var(--mantis-text)] outline-none transition-all duration-200 placeholder:text-[var(--mantis-text-secondary)]",
                            focusRing,
                        )}
                    />
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="description"
                        className="text-xs font-medium text-[var(--mantis-text-secondary)]"
                    >
                        Job description
                    </label>
                    <Textarea
                        id="description"
                        name="description"
                        placeholder="Describe the freelance opportunity in detail..."
                        value={formData.description}
                        onChange={handleChange}
                        required
                        className={cn(
                            "min-h-[100px] resize-none rounded-md border border-[var(--mantis-border)] bg-[var(--mantis-paper)] text-[var(--mantis-text)] placeholder:text-[var(--mantis-text-secondary)] focus-visible:ring-0",
                            focusRing,
                        )}
                    />
                </div>

                {/* 3-col grid */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {/* Discord Channel */}
                    <div className="space-y-2">
                        <label
                            htmlFor="discordChannelId"
                            className="text-xs font-medium text-[var(--mantis-text-secondary)]"
                        >
                            Discord channel
                        </label>
                        <select
                            id="discordChannelId"
                            name="discordChannelId"
                            value={formData.discordChannelId}
                            onChange={handleChange}
                            required
                            disabled={loadingChannels}
                            className={selectCls}
                        >
                            <option value="" disabled style={{ background: "#ffffff" }}>
                                {loadingChannels ? "Loading channels…" : "Select a channel…"}
                            </option>
                            {channels.map((ch) => (
                                <option key={ch.id} value={ch.id} style={{ background: "#ffffff" }}>
                                    # {ch.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Reaction Emoji */}
                    <div className="space-y-2">
                        <label
                            htmlFor="reactionEmoji"
                            className="text-xs font-medium text-[var(--mantis-text-secondary)]"
                        >
                            Reaction emoji
                        </label>
                        <select
                            id="reactionEmoji"
                            name="reactionEmoji"
                            value={formData.reactionEmoji}
                            onChange={handleChange}
                            className={selectCls}
                        >
                            <option value="" style={{ background: "#ffffff" }}>Random</option>
                            <option value="👍" style={{ background: "#ffffff" }}>👍 Thumbs Up</option>
                            <option value="🚀" style={{ background: "#ffffff" }}>🚀 Rocket</option>
                            <option value="💼" style={{ background: "#ffffff" }}>💼 Briefcase</option>
                            <option value="🔥" style={{ background: "#ffffff" }}>🔥 Fire</option>
                            <option value="✅" style={{ background: "#ffffff" }}>✅ Checkmark</option>
                            <option value="👀" style={{ background: "#ffffff" }}>👀 Eyes</option>
                            <option value="👨‍💻" style={{ background: "#ffffff" }}>👨‍💻 Coder</option>
                            <option value="👋" style={{ background: "#ffffff" }}>👋 Wave</option>
                        </select>
                    </div>

                    {/* Time Window */}
                    <div className="space-y-2">
                        <label
                            htmlFor="timeWindowMinutes"
                            className="text-xs font-medium text-[var(--mantis-text-secondary)]"
                        >
                            Time window
                        </label>
                        <div className="relative">
                            <input
                                id="timeWindowMinutes"
                                name="timeWindowMinutes"
                                type="number"
                                min={1}
                                value={formData.timeWindowMinutes}
                                onChange={handleChange}
                                className={cn(
                                    "w-full appearance-none rounded-md border border-[var(--mantis-border)] bg-[var(--mantis-paper)] py-2.5 pl-3 pr-20 text-sm text-[var(--mantis-text)] outline-none transition-all duration-200",
                                    focusRing,
                                )}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-[var(--mantis-primary-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--mantis-primary)]">
                                minutes
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md text-[15px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                    style={{ background: "var(--mantis-primary)" }}
                >
                    {loading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Posting Job…
                        </>
                    ) : (
                        <>
                            <Rocket size={16} />
                            Post Job to Discord
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
