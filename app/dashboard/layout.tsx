import Link from "next/link";
import { Bot, LayoutDashboard } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { Toaster } from "@/components/ui/sonner";
import { RealtimeJobs } from "@/components/realtime-jobs";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-[var(--mantis-canvas)]">
            <aside className="fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-[var(--mantis-border)] bg-[var(--mantis-paper)]">
                <div className="flex h-16 items-center gap-3 border-b border-[var(--mantis-border)] px-5">
                    <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                        style={{ background: "var(--mantis-primary)" }}
                    >
                        <Bot size={18} strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-[var(--mantis-text)]">JobBot</div>
                        <div className="text-[11px] text-[var(--mantis-text-secondary)]">Admin Dashboard</div>
                    </div>
                </div>

                <nav className="flex-1 space-y-0.5 p-3">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-[var(--mantis-primary)]"
                        style={{ background: "var(--mantis-primary-bg)" }}
                    >
                        <LayoutDashboard size={18} strokeWidth={2} />
                        Dashboard
                    </Link>
                </nav>

                <div className="border-t border-[var(--mantis-border)] px-5 py-3 text-[11px] text-[var(--mantis-text-secondary)]">
                    JobBot · Discord jobs
                </div>
            </aside>

            <div className="flex min-h-screen flex-1 flex-col pl-[260px]">
                <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-end gap-4 border-b border-[var(--mantis-border)] bg-[var(--mantis-paper)] px-6 shadow-[var(--mantis-shadow-card)]">
                    <div className="flex items-center gap-2.5">
                        <div
                            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ background: "var(--mantis-primary)" }}
                        >
                            A
                        </div>
                        <span className="text-sm font-medium text-[#595959]">Admin</span>
                    </div>
                    <LogoutButton />
                </header>

                <div className="flex-1 p-6">
                    <div className="mx-auto max-w-[1400px] space-y-6">{children}</div>
                </div>
            </div>

            <Toaster />
            <RealtimeJobs />
        </div>
    );
}
