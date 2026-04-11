"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function JobForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<{id: string, name: string}[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [formData, setFormData] = useState({
    description: "",
    reactionEmoji: "",
    timeWindowMinutes: 0,
    discordChannelId: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      // Calculate expiration timestamp
      const expireAt = new Date(Date.now() + Number(formData.timeWindowMinutes) * 60000).toISOString();

      // Randomize emoji
      let finalEmoji = formData.reactionEmoji;
      if (finalEmoji === "") {
        const emojis = ["👍", "🚀", "💼", "🔥", "✅", "👀", "👨‍💻", "👋"];
        finalEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      }


      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        description: "",
        reactionEmoji: "",
        timeWindowMinutes: 0,
        discordChannelId: "",
      });
      router.refresh(); // Refresh the jobs table
    } catch (error: unknown) {
      console.error(error);
      const e = error as Error;
      toast.error(e.message || "Failed to post job. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Freelance Job</CardTitle>
        <CardDescription>Post a new freelance job to a Discord channel.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Job Description
            </label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe the freelance job..."
              value={formData.description}
              onChange={handleChange}
              required
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="discordChannelId" className="text-sm font-medium leading-none">
                Discord Channel
              </label>
              <select
                id="discordChannelId"
                name="discordChannelId"
                value={formData.discordChannelId}
                onChange={handleChange}
                required
                disabled={loadingChannels}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>
                  {loadingChannels ? "Loading channels..." : "Select a channel..."}
                </option>
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    # {ch.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="reactionEmoji" className="text-sm font-medium leading-none">
                Reaction Emoji
              </label>
              <select
                id="reactionEmoji"
                name="reactionEmoji"
                value={formData.reactionEmoji}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>Select an emoji...</option>
                <option value="👍">👍 Thumbs Up</option>
                <option value="🚀">🚀 Rocket</option>
                <option value="💼">💼 Briefcase</option>
                <option value="🔥">🔥 Fire</option>
                <option value="✅">✅ Checkmark</option>
                <option value="👀">👀 Eyes</option>
                <option value="👨‍💻">👨‍💻 Coder</option>
                <option value="👋">👋 Wave</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="timeWindowMinutes" className="text-sm font-medium leading-none">
                Time Window (Minutes)
              </label>
              <Input
                id="timeWindowMinutes"
                name="timeWindowMinutes"
                type="number"
                min={1}
                value={formData.timeWindowMinutes}
                onChange={handleChange}
                // required
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting Job...
              </>
            ) : (
              "Post Job"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
