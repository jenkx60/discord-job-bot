import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Users, Clock, LayoutDashboard, Bot, ArrowRight, Github } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-purple-500/30">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full" />
      </div>

      <nav className="relative z-10 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-linear-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-slate-50 to-slate-400">
              JobBot
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" className="text-slate-400 hover:text-slate-50">Dashboard</Button>
            </Link>
            <Link href="/dashboard">
              <Button className="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-none shadow-lg shadow-purple-500/25">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="pt-24 pb-16 px-4 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="inline-flex items-center px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-medium animate-pulse">
              <Zap className="w-3 h-3 mr-2" />
              v1.0 is now live
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
              Seamless Freelance <br />
              <span className="bg-clip-text text-transparent bg-linear-to-r from-purple-400 via-blue-400 to-emerald-400">
                Task Management
              </span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Post, manage, and track freelance jobs directly from Discord. 
              Automated posting, reaction-based claiming, and real-time dashboard tracking.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/dashboard">
                <Button size="lg" className="h-12 px-8 text-lg font-semibold bg-white text-slate-950 hover:bg-slate-200 transition-all shadow-xl shadow-white/10">
                  Open Dashboard
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-12 px-8 border-slate-800 bg-transparent text-slate-300 hover:bg-slate-900 transition-all">
                <Github className="mr-2 w-5 h-5" />
                View Source
              </Button>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 px-4 bg-slate-950/50">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold italic tracking-tight">Built for speed. Designed for scale.</h2>
              <p className="text-slate-400">Everything you need to manage high-volume freelance requests without leaving Discord.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "Automated Posting",
                  description: "Post jobs automatically across multiple channels with custom embeds and template support.",
                  icon: Zap,
                  color: "text-blue-500",
                  bg: "bg-blue-500/10",
                  border: "border-blue-500/20"
                },
                {
                  title: "Reaction Claiming",
                  description: "Freelancers can claim tasks instantly with a single emoji. No more manual assignment headaches.",
                  icon: Users,
                  color: "text-purple-500",
                  bg: "bg-purple-500/10",
                  border: "border-purple-500/20"
                },
                {
                  title: "Smart Expiration",
                  description: "Jobs automatically archive or repost if not claimed within your set timeframes. Keep channels clean.",
                  icon: Clock,
                  color: "text-emerald-500",
                  bg: "bg-emerald-500/10",
                  border: "border-emerald-500/20"
                },
                {
                  title: "Central Dashboard",
                  description: "Manage all active tasks, view freelancer analytics, and export reports in a sleek web UI.",
                  icon: LayoutDashboard,
                  color: "text-amber-500",
                  bg: "bg-amber-500/10",
                  border: "border-amber-500/20"
                }
              ].map((feature, i) => (
                <Card key={i} className={`bg-slate-900/40 border-slate-800 backdrop-blur-sm hover:border-slate-700 transition-all group`}>
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${feature.bg} ${feature.border} group-hover:scale-110 transition-transform`}>
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-slate-400 group-hover:text-slate-300">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 px-4">
          <div className="max-w-4xl mx-auto rounded-3xl p-12 bg-linear-to-br from-indigo-900/40 to-slate-900/40 border border-indigo-500/20 text-center space-y-8 relative overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full" />
            <Bot className="w-16 h-16 mx-auto text-indigo-400 mb-4 animate-bounce" />
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Ready to automate your workflow?</h2>
            <p className="text-lg text-slate-400">Join thousands of teams scaling their freelance operations with JobBot.</p>
            <div className="pt-4">
              <Link href="/dashboard">
                <Button size="lg" className="h-14 px-10 text-lg bg-indigo-600 hover:bg-indigo-500 transition-all rounded-full border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1">
                  Start Managing Jobs
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-800 pt-12 pb-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            <span className="text-lg font-semibold">JobBot</span>
          </div>
          <div className="flex gap-8 text-slate-500 text-sm">
            <Link href="#" className="hover:text-slate-300">Privacy Policy</Link>
            <Link href="#" className="hover:text-slate-300">Terms of Service</Link>
            <Link href="#" className="hover:text-slate-300">Twitter</Link>
            <Link href="#" className="hover:text-slate-300">Discord</Link>
          </div>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} JobBot. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
