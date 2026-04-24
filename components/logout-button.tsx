"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";

export function LogoutButton() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
            router.refresh();
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleLogout}
            disabled={loading}
            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-sm font-medium text-[var(--mantis-text-secondary)] transition-all duration-200 hover:border-[var(--mantis-border)] hover:bg-[#fafafa] hover:text-[var(--mantis-text)] disabled:cursor-not-allowed disabled:opacity-70"
        >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            {loading ? "Logging out..." : "Log out"}
        </button>
    );
}
