"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Bot, Shield, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim(),
                    password,
                }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.success) {
                setError(data.error || "Invalid email or password. Please try again.");
                return;
            }

            router.push("/dashboard");
            router.refresh();
        } catch {
            setError("Unable to sign in right now. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const emailActive = emailFocused || email.length > 0;
    const passwordActive = passwordFocused || password.length > 0;

    return (
        <div className="flex min-h-screen bg-[var(--mantis-canvas)]">
            {/* Mantis-style split hero (matches free demo auth layouts) */}
            <div
                className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 text-white lg:flex"
                style={{
                    background: "linear-gradient(145deg, var(--mantis-primary-active) 0%, var(--mantis-primary) 55%, #69c0ff 100%)",
                }}
            >
                <div
                    className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full opacity-30 blur-3xl"
                    style={{ background: "#fff" }}
                />
                <div
                    className="pointer-events-none absolute -bottom-24 left-10 h-72 w-72 rounded-full opacity-20 blur-3xl"
                    style={{ background: "#bae7ff" }}
                />

                <div className="relative flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                        <Bot size={22} className="text-white" strokeWidth={2} />
                    </div>
                    <span className="text-xl font-bold tracking-tight">JobBot</span>
                </div>

                <div className="relative max-w-lg">
                    <h2 className="text-3xl font-semibold leading-tight tracking-tight">
                        Manage Discord freelance jobs in one place.
                    </h2>
                    <p className="mt-4 text-base leading-relaxed text-white/85">
                        Post roles to your server, track shortlists, assign candidates, and review performance from a
                        single, focused admin workspace.
                    </p>
                </div>

                <p className="relative text-sm text-white/70">Secure admin access · JobBot</p>
            </div>

            {/* Form column */}
            <div className="flex w-full flex-1 items-center justify-center p-6 sm:p-10 lg:w-1/2 lg:bg-[var(--mantis-paper)]">
                <div
                    className="w-full max-w-[420px] rounded-lg border border-[var(--mantis-border)] bg-[var(--mantis-paper)] p-8 shadow-[var(--mantis-shadow-card)] sm:p-10 lg:border-0 lg:shadow-none"
                >
                    <div className="mb-6 flex items-center gap-3 lg:hidden">
                        <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                            style={{ background: "var(--mantis-primary)" }}
                        >
                            <Bot size={20} strokeWidth={2} />
                        </div>
                        <span className="text-lg font-bold text-[var(--mantis-text)]">JobBot</span>
                    </div>

                    <p className="mb-6 text-xs font-medium uppercase tracking-wide text-[var(--mantis-text-secondary)]">
                        Admin sign in
                    </p>

                    <h1 className="text-2xl font-semibold tracking-tight text-[var(--mantis-text)]">Welcome back</h1>
                    <p className="mt-1 text-sm text-[var(--mantis-text-secondary)]">
                        Sign in to manage your Discord jobs.
                    </p>

                    <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-5">
                        <div className="relative">
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setEmailFocused(true)}
                                onBlur={() => setEmailFocused(false)}
                                required
                                autoComplete="email"
                                placeholder="Email address"
                                className="h-[52px] rounded-md border-[var(--mantis-border)] bg-[var(--mantis-paper)] px-3.5 pt-[18px] pb-2 text-[15px] text-[var(--mantis-text)] placeholder:text-transparent focus-visible:border-[var(--mantis-primary)] focus-visible:ring-1 focus-visible:ring-[var(--mantis-primary)]"
                            />
                            <label
                                htmlFor="email"
                                className={cn(
                                    "pointer-events-none absolute left-3.5 transition-all duration-150 ease-out",
                                    emailActive
                                        ? "top-2 text-[11px] font-semibold text-[var(--mantis-primary)]"
                                        : "top-1/2 -translate-y-1/2 text-[15px] text-[var(--mantis-text-secondary)]",
                                )}
                            >
                                Email address
                            </label>
                        </div>

                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setPasswordFocused(true)}
                                onBlur={() => setPasswordFocused(false)}
                                required
                                autoComplete="current-password"
                                placeholder="Password"
                                className="h-[52px] rounded-md border-[var(--mantis-border)] bg-[var(--mantis-paper)] py-[18px] pb-2 pl-3.5 pr-11 text-[15px] text-[var(--mantis-text)] placeholder:text-transparent focus-visible:border-[var(--mantis-primary)] focus-visible:ring-1 focus-visible:ring-[var(--mantis-primary)]"
                            />
                            <label
                                htmlFor="password"
                                className={cn(
                                    "pointer-events-none absolute left-3.5 transition-all duration-150 ease-out",
                                    passwordActive
                                        ? "top-2 text-[11px] font-semibold text-[var(--mantis-primary)]"
                                        : "top-1/2 -translate-y-1/2 text-[15px] text-[var(--mantis-text-secondary)]",
                                )}
                            >
                                Password
                            </label>
                            <button
                                type="button"
                                tabIndex={-1}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 flex -translate-y-1/2 cursor-pointer items-center p-1 text-[var(--mantis-text-secondary)] transition-colors hover:text-[var(--mantis-primary)]"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        {error && (
                            <div
                                className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                                role="alert"
                            >
                                <Shield size={14} className="shrink-0" />
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-11 w-full rounded-md text-[15px] font-semibold text-white shadow-sm transition-colors hover:opacity-[0.92] disabled:cursor-not-allowed disabled:opacity-70  cursor-pointer"
                            style={{ background: "var(--mantis-primary)" }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Authenticating…
                                </>
                            ) : (
                                "Sign in"
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-[var(--mantis-text-secondary)]">
                        <Shield size={12} className="shrink-0" />
                        Secure admin access only. Unauthorized use is prohibited.
                    </div>
                </div>
            </div>
        </div>
    );
}
