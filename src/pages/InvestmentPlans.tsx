import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { FIXED_BTC_ADDRESS } from "@/components/WalletAddresses";
import {
  TrendingUp,
  Shield,
  Award,
  Crown,
  Star,
  Check,
  Users,
  AlertCircle,
  Copy,
  Wallet as WalletIcon,
  ArrowUpRight,
} from "lucide-react";

type Plan = {
  id: string;
  name: string;
  tagline: string;
  marketing: string;
  minDeposit: number;
  dailyROI: string;
  duration: string;
  salary: string;
  minWithdrawal: string;
  reinvestment: string;
  bonus?: string;
  dashboard: string[];
  privileges: string[];
  referral: { levels: string[]; activation: string; extra: string };
  badge: string;
  badgeColor: string;
  gradient: string;
  icon: typeof Star;
};

const plans: Plan[] = [
  {
    id: "recruit",
    name: "Recruit Plan",
    tagline: "Start Your Journey With Confidence",
    marketing:
      "This beginner-friendly plan offers 1% daily ROI, a monthly $20 salary, and simple rules that help you grow steadily. Designed for new investors who want predictable progress without complexity.",
    minDeposit: 200,
    dailyROI: "1%",
    duration: "30 days",
    salary: "$20 / month",
    minWithdrawal: "$50 profit",
    reinvestment: "Not allowed",
    dashboard: [
      "Daily ROI tracker",
      "Salary countdown",
      "Withdrawal eligibility bar",
      "Basic transaction logs",
    ],
    privileges: [
      "Basic allowances",
      "Access to loan request form",
      "Basic priority support",
      "Bronze Recruit badge",
    ],
    referral: {
      levels: ["Level 1: 3%", "Level 2: 1%"],
      activation: "$5 activation bonus",
      extra: "Basic referral tools",
    },
    badge: "Bronze",
    badgeColor: "bg-amber-700/20 text-amber-700 border-amber-700/30",
    gradient: "from-amber-600 to-amber-800",
    icon: Star,
  },
  {
    id: "inspectors",
    name: "Inspectors Plan",
    tagline: "Step Up to Smarter Earnings",
    marketing:
      "A strategic plan offering 1.5% daily ROI, better analytics, and controlled reinvestment. Perfect for users ready to take a more active and informed role in their financial growth.",
    minDeposit: 500,
    dailyROI: "1.5%",
    duration: "30 days",
    salary: "$35 / month",
    minWithdrawal: "$40",
    reinvestment: "1 per cycle",
    dashboard: [
      "ROI projection graph",
      "Auto-compound toggle",
      "Earnings progression meter",
      "Monthly missions",
    ],
    privileges: [
      "Higher loan limits",
      "Access to Inspectors’ private group",
      "Medium-tier support",
      "Silver Inspector badge",
    ],
    referral: {
      levels: ["Level 1: 5%", "Level 2: 2%", "Level 3: 1%"],
      activation: "$10 activation bonus",
      extra: "Monthly referral leaderboard",
    },
    badge: "Silver",
    badgeColor: "bg-slate-400/20 text-slate-300 border-slate-400/30",
    gradient: "from-slate-400 to-slate-600",
    icon: Shield,
  },
  {
    id: "superintendent",
    name: "Superintendent Plan",
    tagline: "Advanced Growth, Elevated Benefits",
    marketing:
      "With 2% daily ROI and full reinvest flexibility, this plan gives users access to advanced reporting tools and deeper insights. Ideal for structured investors who understand compounding.",
    minDeposit: 1000,
    dailyROI: "2%",
    duration: "45 days",
    salary: "$50 / month",
    minWithdrawal: "$30",
    reinvestment: "Unlimited (monthly cap)",
    dashboard: [
      "Advanced analytics",
      "Auto reinvest scheduler",
      "Exportable monthly report",
      "Earnings goal tracker",
    ],
    privileges: [
      "Priority withdrawals",
      "Access to exclusive staking pools",
      "Feature beta testing",
      "Gold Superintendent badge",
    ],
    referral: {
      levels: ["Level 1: 7%", "Level 2: 3%", "Level 3: 2%", "Level 4: 1%"],
      activation: "$20 activation bonus",
      extra: "Personalized promo code",
    },
    badge: "Gold",
    badgeColor: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    gradient: "from-yellow-500 to-yellow-700",
    icon: Award,
  },
  {
    id: "commissioners",
    name: "Commissioners Plan",
    tagline: "Premium Rewards, High-Level Tools",
    marketing:
      "Offering 2.5% daily ROI and premium dashboard utilities, this plan is crafted for high-level users who value efficiency, analytics, and exclusive opportunities.",
    minDeposit: 2000,
    dailyROI: "2.5%",
    duration: "60 days",
    salary: "$80 / month",
    minWithdrawal: "$20",
    reinvestment: "Fully allowed",
    dashboard: [
      "Portfolio simulation",
      "Auto-withdrawal scheduler",
      "Earnings heatmap",
      "Custom alert controls",
    ],
    privileges: [
      "Highest-tier loan options",
      "Access to Commissioners Council forum",
      "Dividend bonuses",
      "Diamond Commissioner badge",
    ],
    referral: {
      levels: [
        "Level 1: 10%",
        "Level 2: 4%",
        "Level 3: 3%",
        "Level 4: 2%",
        "Level 5: 1%",
      ],
      activation: "$40 activation bonus",
      extra: "Milestone bonus every 15 referrals",
    },
    badge: "Diamond",
    badgeColor: "bg-cyan-400/20 text-cyan-300 border-cyan-400/30",
    gradient: "from-cyan-400 to-blue-600",
    icon: TrendingUp,
  },
  {
    id: "general",
    name: "General Plan",
    tagline: "The Flagship Tier for Maximum Advantage",
    marketing:
      "Our top-tier experience with 3% daily ROI, reinvest freedom, analytic depth, and elite privileges. Designed for users who want maximum utility and complete platform access.",
    minDeposit: 5000,
    dailyROI: "3%",
    duration: "90 days",
    salary: "$150 / month",
    minWithdrawal: "$10",
    reinvestment: "Fully allowed",
    bonus: "Loyalty Bonus: 5% at cycle completion",
    dashboard: [
      "Enterprise-grade analytics",
      "API tracking access",
      "Auto-risk balancing",
      "Personalized reports",
    ],
    privileges: [
      "Elite loan tier",
      "Zero withdrawal fees",
      "VIP webinars",
      "Dedicated account manager",
      "Platinum General badge",
    ],
    referral: {
      levels: [
        "Level 1: 15%",
        "Level 2: 6%",
        "Level 3: 4%",
        "Level 4: 3%",
        "Level 5: 2%",
        "Level 6: 1%",
      ],
      activation: "$75 activation bonus",
      extra: "VIP ambassador privileges",
    },
    badge: "Platinum",
    badgeColor: "bg-purple-400/20 text-purple-300 border-purple-400/30",
    gradient: "from-purple-500 to-fuchsia-600",
    icon: Crown,
  },
];

const terms = [
  {
    title: "1. Eligibility",
    items: ["Only registered users may participate.", "Eligibility may require an active plan."],
  },
  {
    title: "2. Referral Structure",
    items: ["Commissions vary by investment plan.", "Earnings apply only when referrals activate a plan."],
  },
  {
    title: "3. Valid Referrals",
    items: [
      "Must be a new user.",
      "Must register with your link.",
      "Must complete a minimum deposit.",
      "Invalid referrals include duplicates, fake accounts, and self-referrals.",
    ],
  },
  {
    title: "4. Commission Payments",
    items: ["Paid into referral wallet.", "Subject to withdrawal rules.", "Fraudulent commissions may be reversed."],
  },
  {
    title: "5. Bonuses and Incentives",
    items: ["Subject to verification.", "Can be modified or paused anytime."],
  },
  {
    title: "6. User Responsibilities",
    items: ["Avoid spamming.", "Avoid false claims.", "Share links ethically."],
  },
  {
    title: "7. Prohibited Conduct",
    items: ["Self-referrals.", "Fake accounts.", "Bots or automation.", "Misleading promotions."],
  },
  {
    title: "8. Audit Rights",
    items: ["Review referral activity.", "Freeze or reverse commissions.", "Suspend accounts for violations."],
  },
  {
    title: "9. Program Modifications",
    items: ["Referral structure may change anytime.", "Continued participation means acceptance."],
  },
  {
    title: "10. Limitation of Liability",
    items: ["Not liable for failed referrals.", "Not liable for withdrawal delays.", "Not liable for misuse of referral tools."],
  },
  {
    title: "11. Termination",
    items: ["Platform may end the program at any time.", "Users may be removed for misconduct."],
  },
  {
    title: "12. Acceptance",
    items: ["Using your referral link means you agree to all terms."],
  },
];

const InvestmentPlans = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/" className="text-primary hover:underline text-sm">
            ← Back to Home
          </Link>
        </div>

        {/* Hero */}
        <header className="text-center mb-14">
          <div className="inline-flex items-center gap-3 mb-4">
            <TrendingUp className="h-10 w-10 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">Investment Plans</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Five tiers built for every stage of your journey — from your first $200 to flagship
            $5,000+ portfolios. Choose the plan that matches your ambition.
          </p>
        </header>

        {/* Plans */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-20">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.id}
                className="flex flex-col border-border/50 bg-card overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                <div className={`h-2 bg-gradient-to-r ${plan.gradient}`} />
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${plan.gradient}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <Badge variant="outline" className={plan.badgeColor}>
                      {plan.badge}
                    </Badge>
                  </div>
                  <CardTitle className="mt-3 text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-sm font-medium text-primary">
                    {plan.tagline}
                  </CardDescription>
                  <p className="text-sm text-muted-foreground mt-2">{plan.marketing}</p>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col gap-5">
                  <div className="rounded-lg border border-border/50 p-4 bg-muted/30">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Minimum Deposit
                      </span>
                      <span className="text-2xl font-bold text-foreground">
                        ${plan.minDeposit.toLocaleString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm mt-3">
                      <Row label="Daily ROI" value={plan.dailyROI} />
                      <Row label="Duration" value={plan.duration} />
                      <Row label="Salary" value={plan.salary} />
                      <Row label="Min. Withdrawal" value={plan.minWithdrawal} />
                      <Row label="Reinvestment" value={plan.reinvestment} full />
                      {plan.bonus && <Row label="Bonus" value={plan.bonus} full />}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      Dashboard Features
                    </h4>
                    <ul className="space-y-1.5">
                      {plan.dashboard.map((f) => (
                        <li key={f} className="flex gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">Privileges</h4>
                    <ul className="space-y-1.5">
                      {plan.privileges.map((p) => (
                        <li key={p} className="flex gap-2 text-sm text-muted-foreground">
                          <Star className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-border/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold text-foreground">Referral Commissions</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground mb-2">
                      {plan.referral.levels.map((l) => (
                        <span key={l}>{l}</span>
                      ))}
                    </div>
                    <p className="text-xs text-primary font-medium">{plan.referral.activation}</p>
                    <p className="text-xs text-muted-foreground">{plan.referral.extra}</p>
                  </div>

                  <Button asChild className="w-full mt-auto">
                    <Link to="/wallet">Deposit & Activate</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* Referral Program Overview */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Referral Commission Program</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each plan unlocks a unique multi-level referral system. Grow your network, grow your
              earnings.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {plans.map((plan) => (
              <Card key={plan.id} className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-xs">
                  {plan.referral.levels.map((l) => (
                    <div key={l} className="text-muted-foreground">{l}</div>
                  ))}
                  <div className="pt-2 mt-2 border-t border-border/50 text-primary font-medium">
                    {plan.referral.activation}
                  </div>
                  <div className="text-muted-foreground">{plan.referral.extra}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Terms */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <AlertCircle className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Referral Terms & Conditions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {terms.map((t) => (
              <Card key={t.title} className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {t.items.map((i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2">
                        <span className="text-primary">•</span>
                        <span>{i}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

const Row = ({ label, value, full }: { label: string; value: string; full?: boolean }) => (
  <div className={full ? "col-span-2 flex justify-between" : "flex justify-between"}>
    <span className="text-muted-foreground">{label}:</span>
    <span className="text-foreground font-medium text-right">{value}</span>
  </div>
);

export default InvestmentPlans;
