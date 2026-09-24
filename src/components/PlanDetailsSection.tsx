import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, TrendingUp } from "lucide-react";
import { usePlanDetails } from "@/hooks/usePlanDetails";
import { planBadgeAlt, planBadgeUrl } from "@/lib/planBadges";

type Props = {
  surface: "homepage" | "dashboard";
  title?: string;
  subtitle?: string;
  className?: string;
};

export default function PlanDetailsSection({
  surface,
  title = "Our Investment Plans",
  subtitle = "Choose the tier that matches your goals",
  className = "",
}: Props) {
  const { plans, loading } = usePlanDetails(surface);

  if (loading || plans.length === 0) return null;

  return (
    <section className={`container mx-auto px-4 py-12 ${className}`}>
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-3xl font-bold">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const badge = planBadgeUrl(plan.name.toLowerCase());
          return (
            <Card
              key={plan.id}
              className="flex h-full flex-col border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/20"
            >
              <div className="mb-4 flex items-start gap-3">
                {badge ? (
                  <img
                    src={badge}
                    alt={planBadgeAlt(plan.name)}
                    loading="lazy"
                    className="h-12 w-12 object-contain"
                  />
                ) : (
                  <div className="inline-flex rounded-lg bg-primary/10 p-3">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  {plan.tagline && (
                    <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                  )}
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <Badge variant="outline">
                  From ${Number(plan.principal_min).toLocaleString()}
                </Badge>
                <Badge variant="outline">{plan.duration_days} days</Badge>
                <Badge variant="outline">{plan.coin}</Badge>
              </div>

              {(plan.about || plan.description) && (
                <p className="mb-4 whitespace-pre-line text-sm text-muted-foreground">
                  {plan.about || plan.description}
                </p>
              )}

              {plan.highlights.length > 0 && (
                <ul className="mb-4 space-y-2">
                  {plan.highlights.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-auto pt-2">
                <Button className="w-full" asChild>
                  <Link to="/investment-plans">View plan</Link>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
