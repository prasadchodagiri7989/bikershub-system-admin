import { useState } from "react";
import {
  Brain, TrendingUp, AlertTriangle, ThumbsUp, Package,
  Users, DollarSign, Star, Loader2, RefreshCw, TrendingDown,
} from "lucide-react";
import { PageHeader } from "@/components/admin/SharedComponents";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";

const severityStyles: Record<string, string> = {
  high:   "border-destructive/30 bg-destructive/5",
  medium: "border-warning/30 bg-warning/5",
  low:    "border-primary/30 bg-primary/5",
  info:   "border-border/50 bg-card",
};

const severityIconStyle: Record<string, string> = {
  high:   "text-destructive bg-destructive/10",
  medium: "text-warning bg-warning/10",
  low:    "text-primary bg-primary/10",
  info:   "text-muted-foreground bg-muted",
};

const typeIcon: Record<string, React.ElementType> = {
  inventory: Package,
  revenue:   DollarSign,
  customers: Users,
  reviews:   Star,
  sales:     TrendingUp,
};

export default function AIInsights() {
  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [insights, setInsights] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function generateAnalysis() {
    setPhase("loading");
    setErrorMsg("");
    try {
      const data = await api.generateAIInsights();
      setInsights(data);
      setPhase("done");
    } catch (e: any) {
      const msg = e.message || "Failed to generate insights";
      setErrorMsg(msg);
      setPhase("error");
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="AI Insights" description="Cificap AI-powered analysis of your platform data">
        <div className="flex items-center gap-2">
          {phase === "done" && (
            <Button variant="outline" size="sm" onClick={generateAnalysis} disabled={phase === "loading"}>
              <RefreshCw className="w-4 h-4 mr-2" />Regenerate
            </Button>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium">
            <Brain className="w-4 h-4" />
            Powered by Cificap AI
          </div>
        </div>
      </PageHeader>

      {/* ── Idle state ── */}
      {phase === "idle" && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">AI Business Insights</h2>
          <p className="text-muted-foreground max-w-md mb-6 text-sm leading-relaxed">
            Click <strong>Generate Analysis</strong> to let Cificap AI analyze your real store
            data — inventory, sales, reviews, and customers — and surface actionable insights.
          </p>
          <Button size="lg" onClick={generateAnalysis}>
            <Brain className="w-5 h-5 mr-2" />Generate Analysis
          </Button>
        </div>
      )}

      {/* ── Loading state ── */}
      {phase === "loading" && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 animate-pulse">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Analyzing your data…</h2>
          <p className="text-muted-foreground text-sm mb-4">Cificap AI is processing your store</p>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>This may take a few seconds</span>
          </div>
        </div>
      )}

      {/* ── Error state ── */}
      {phase === "error" && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <h3 className="font-semibold mb-1">Analysis Failed</h3>
          <p className="text-muted-foreground text-sm mb-4 max-w-sm">{errorMsg}</p>
          <Button onClick={generateAnalysis}>Try Again</Button>
        </div>
      )}

      {/* ── Results ── */}
      {phase === "done" && insights && (
        <>
          {/* Generate button in results */}
          <div className="flex justify-end">
            <Button onClick={generateAnalysis} size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />Regenerate
            </Button>
          </div>

          {/* Executive Summary */}
          {insights.summary && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Executive Summary</h3>
                {insights.generatedAt && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(insights.generatedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{insights.summary}</p>
            </div>
          )}

          {/* Insight Cards */}
          {Array.isArray(insights.insights) && insights.insights.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.insights.map((insight: any, i: number) => {
                const sev = insight.severity || "info";
                const IconComp = typeIcon[insight.type] || TrendingDown;
                return (
                  <div
                    key={i}
                    className={`rounded-xl border p-5 space-y-3 ${severityStyles[sev] || severityStyles.info}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${severityIconStyle[sev] || severityIconStyle.info}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full capitalize">
                        {insight.type || "General"}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm">{insight.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{insight.description}</p>
                    {insight.action && (
                      <div className="text-xs text-primary font-medium border-t border-border/30 pt-2.5">
                        → {insight.action}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
