"use client";

import { useState } from "react";
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
  const [formData, setFormData] = useState({
    description: "",
    reactionEmoji: "👍",
    timeWindowMinutes: 0,
    discordChannelId: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calculate expiration timestamp
      const expireAt = new Date(Date.now() + Number(formData.timeWindowMinutes) * 60000).toISOString();

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: formData.description,
          emoji: formData.reactionEmoji,
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
        reactionEmoji: "👍",
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
                Discord Channel ID
              </label>
              <Input
                id="discordChannelId"
                name="discordChannelId"
                placeholder="123456789012345678"
                value={formData.discordChannelId}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="reactionEmoji" className="text-sm font-medium leading-none">
                Reaction Emoji
              </label>
              <Input
                id="reactionEmoji"
                name="reactionEmoji"
                placeholder="👍"
                value={formData.reactionEmoji}
                onChange={handleChange}
                required
              />
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
                required
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
