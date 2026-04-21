import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Users, Clock, LayoutDashboard, Bot, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

export default function LandingPage() {
  const features = [
    {
      title: "Automated Posting",
      description: "Publish jobs to Discord channels with a consistent template and expiry window.",
      icon: Zap,
      iconWrap: "bg-[var(--mantis-primary-bg)] text-[var(--mantis-primary-active)]",
    },
    {
      title: "Reaction Shortlisting",
      description: "Capture candidate interest through emoji reactions and manage shortlist capacity.",
      icon: Users,
      iconWrap: "bg-violet-50 text-violet-700",
    },
    {
      title: "Smart Expiration",
      description: "Automatically expire stale listings and keep active opportunities in focus.",
      icon: Clock,
      iconWrap: "bg-amber-50 text-amber-700",
    },
    {
      title: "Central Dashboard",
      description: "Assign, cancel, repost, and complete jobs from one operational workspace.",
      icon: LayoutDashboard,
      iconWrap: "bg-emerald-50 text-emerald-700",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--mantis-canvas)] text-[var(--mantis-text)]">
      <nav className="sticky top-0 z-40 border-b border-[var(--mantis-border)] bg-[var(--mantis-paper)]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
              style={{ background: "var(--mantis-primary)" }}
            >
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">JobBot</p>
              <p className="mt-1 text-[11px] text-[var(--mantis-text-secondary)]">Discord job operations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" className="text-[var(--mantis-text-secondary)] hover:text-[var(--mantis-text)] cursor-pointer">
                Dashboard
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button style={{ background: "var(--mantis-primary)" }} className="text-white hover:opacity-95 cursor-pointer">
                Open Admin
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-[1200px] space-y-16 px-4 py-12 sm:px-6">
        <section className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--mantis-primary-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--mantis-primary-active)]">
              <Sparkles className="h-3.5 w-3.5" />
              New UI update
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Manage your Discord freelance pipeline end-to-end
            </h1>
            <p className="mt-4 max-w-2xl text-base text-[var(--mantis-text-secondary)] sm:text-lg">
              Post roles, collect reactions, shortlist candidates, and track assignment outcomes from a single
              operational dashboard.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="text-white cursor-pointer"
                  style={{ background: "var(--mantis-primary)" }}
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-[var(--mantis-border)] cursor-pointer">
                  Admin Login
                </Button>
              </Link>
            </div>
          </div>

          <Card className="border-[var(--mantis-border)] bg-[var(--mantis-paper)] shadow-[var(--mantis-shadow-card)]">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">Operational Snapshot</CardTitle>
              <CardDescription>
                Core capabilities available from the dashboard home.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Create and publish new jobs to Discord",
                "Review shortlisted candidates and assign owners",
                "Cancel and repost jobs with priority handling",
                "Track candidate completion and cancellation metrics",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <p className="text-sm text-[var(--mantis-text-secondary)]">{item}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-5">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Everything needed for job operations</h2>
            <p className="mt-1 text-sm text-[var(--mantis-text-secondary)]">
              Built for high-volume Discord workflows with clear status visibility.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-[var(--mantis-border)] bg-[var(--mantis-paper)] shadow-[var(--mantis-shadow-card)]"
              >
                <CardHeader className="pb-3">
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${feature.iconWrap}`}>
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-[var(--mantis-text-secondary)]">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--mantis-border)] bg-[var(--mantis-paper)] p-8 text-center shadow-[var(--mantis-shadow-card)]">
          <Bot className="mx-auto h-10 w-10 text-[var(--mantis-primary)]" />
          <h3 className="mt-3 text-2xl font-semibold tracking-tight">Ready to run your job board faster?</h3>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-[var(--mantis-text-secondary)]">
            Launch from the dashboard to manage openings, assignments, shortlist quality, and completion outcomes.
          </p>
          <div className="mt-6">
            <Link href="/dashboard">
              <Button size="lg" style={{ background: "var(--mantis-primary)" }} className="text-white cursor-pointer">
                Start Managing Jobs
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--mantis-border)] bg-[var(--mantis-paper)] py-6">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 px-4 text-sm text-[var(--mantis-text-secondary)] sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-[var(--mantis-primary)]" />
            <span>JobBot</span>
          </div>
          <p>© {new Date().getFullYear()} JobBot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
