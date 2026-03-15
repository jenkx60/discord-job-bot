import { Badge } from "@/components/ui/badge";

export type JobStatus = "open" | "assigned" | "expired";

interface StatusBadgeProps {
  status: JobStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case "open":
      return <Badge className="bg-green-500 hover:bg-green-600">Open</Badge>;
    case "assigned":
      return <Badge className="bg-blue-500 hover:bg-blue-600">Assigned</Badge>;
    case "expired":
      return <Badge variant="destructive">Expired</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}
