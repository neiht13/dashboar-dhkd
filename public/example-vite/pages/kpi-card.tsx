import { TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  subtitle: string;
  value: string;
  plan: string;
  remain: string;
  progress: number;
  badgeText?: string;
  trend?: number;
  footnoteLeft?: string;
  footnoteRight?: string;
  className?: string;
}

export function KpiCard({
  title,
  subtitle,
  value,
  plan,
  remain,
  progress,
  badgeText,
  trend,
  footnoteLeft,
  footnoteRight,
  className,
}: KpiCardProps) {
  const progressValue = Math.max(0, Math.min(100, progress * 100));

  return (
    <Card className={cn("relative overflow-hidden border-primary/25 bg-card/95", className)} data-reveal>
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 bg-primary/20 blur-2xl" />
      <CardHeader className="space-y-1 pb-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground/90">{subtitle}</p>
          </div>
          {badgeText ? (
            <Badge variant="outline" className="rounded-sm px-2 py-0 text-[11px]">
              {badgeText}
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        <p className="text-xl font-semibold tracking-tight text-foreground">{value}</p>

        <div className="space-y-0.5 text-xs text-muted-foreground">
          <p>
            Kế hoạch: <span className="font-semibold text-foreground">{plan}</span>
          </p>
          <p>
            Còn lại: <span className="font-semibold text-foreground">{remain}</span>
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Tiến độ</span>
            <span className="font-semibold text-foreground">{progressValue.toFixed(1)}%</span>
          </div>
          <Progress value={progressValue} className="h-1.5 bg-primary/15" />
        </div>

        {(footnoteLeft || footnoteRight) && (
          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
            <div className="border border-border/70 bg-background/60 px-2 py-1">{footnoteLeft}</div>
            <div className="border border-border/70 bg-background/60 px-2 py-1">{footnoteRight}</div>
          </div>
        )}

        {typeof trend === "number" && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {trend >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
            )}
            <span>
              Biến động so với hôm trước: <span className="font-semibold text-foreground">{trend.toFixed(1)}%</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
