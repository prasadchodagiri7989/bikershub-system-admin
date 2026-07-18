import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  description?: string;
  valueClassName?: string;
}

export function StatsCard({ title, value, change, changeType = "neutral", icon: Icon, description, valueClassName }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <div className={cn("text-2xl font-bold tracking-tight truncate", valueClassName)}>{value}</div>
      {(change || description) && (
        <div className="mt-1 flex items-center gap-2">
          {change && (
            <span className={cn(
              "text-xs font-medium",
              changeType === "positive" && "text-success",
              changeType === "negative" && "text-destructive",
              changeType === "neutral" && "text-muted-foreground"
            )}>
              {change}
            </span>
          )}
          {description && <span className="text-xs text-muted-foreground">{description}</span>}
        </div>
      )}
    </div>
  );
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}

export type StatusTone = "success" | "warning" | "destructive" | "neutral-badge";

/**
 * Every status/badge string in the app resolves to one of 4 tones:
 * success (active/paid/delivered/captured/approved), warning (pending/draft/
 * confirmed/placed/pending-awb/authorized), destructive (out-of-stock/failed/
 * cancelled/banned/refunded/flagged), neutral-badge (fallback, e.g. role labels).
 */
const STATUS_TONE_MAP: Record<string, StatusTone> = {
  // success
  delivered: "success",
  paid: "success",
  active: "success",
  captured: "success",
  approved: "success",
  completed: "success",
  success: "success",
  "in stock": "success",
  verified: "success",
  resolved: "success",
  shipped: "success",
  // warning
  pending: "warning",
  draft: "warning",
  confirmed: "warning",
  placed: "warning",
  "pending-awb": "warning",
  "pending awb": "warning",
  authorized: "warning",
  processing: "warning",
  "low stock": "warning",
  awaiting: "warning",
  review: "warning",
  unverified: "warning",
  // destructive
  "out of stock": "destructive",
  "out-of-stock": "destructive",
  failed: "destructive",
  cancelled: "destructive",
  canceled: "destructive",
  banned: "destructive",
  refunded: "destructive",
  flagged: "destructive",
  inactive: "destructive",
  rejected: "destructive",
  suspended: "destructive",
  rto: "destructive",
  // shiprocket / shipment tracking additions
  "awb assigned": "success",
  "out for delivery": "success",
  "sr created": "warning",
  "in-transit": "warning",
  "in transit": "warning",
  "picked up": "warning",
  "picked-up": "warning",
  "pickup scheduled": "warning",
  unpaid: "warning",
};

export function resolveStatusTone(status: string): StatusTone {
  return STATUS_TONE_MAP[status?.toLowerCase?.().trim()] || "neutral-badge";
}

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/15 text-destructive",
  "neutral-badge": "bg-neutral-badge/15 text-neutral-badge",
};

export function StatusBadge({ status, tone }: { status: string; tone?: StatusTone }) {
  const resolvedTone = tone || resolveStatusTone(status);

  return (
    <span className={cn("status-pill inline-flex items-center capitalize", TONE_CLASSES[resolvedTone])}>
      {status}
    </span>
  );
}
