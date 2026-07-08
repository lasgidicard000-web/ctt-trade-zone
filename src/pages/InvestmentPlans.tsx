import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { FIXED_BTC_ADDRESS } from "@/components/WalletAddresses";
import { useRealtimePrices } from "@/hooks/useRealtimePrices";
import { PriceSparkline } from "@/components/PriceSparkline";
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
  Sparkles,
  Bot,
  Activity,
  BarChart3,
  Lock,
  Globe,
  Cpu,
  Zap,
  ShieldCheck,
  Eye,
  Fingerprint,
  Radio,
  KeyRound,
  LineChart,
  Gauge,
  Quote,
  ArrowDownRight,
} from "lucide-react";

type TradingMode = "auto" | "manual";

type Plan = {
  id: string;
  name: string;
  tagline: string;
  marketing: string;
  minDeposit: number;
  dailyROI: string; // internal only — never rendered
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
  investorType: string;
  aiStrategy: string;
  riskLevel: "Low" | "Moderate" | "Balanced" | "High" | "Aggressive";
  projection: string;
  recommended?: boolean;
  // Dynamic performance indicators (market-based, illustrative)
  todayPerf: number;
  weekPerf: number;
  monthPerf: number;
  perfRange: [number, number]; // low/high % per day band
  marketTrend: "Bullish" | "Neutral" | "Bearish";
  aiConfidence: number; // 0-100
};

const plans: Plan[] = [
  {
    id: "recruit",
    name: "Recruit Plan",
    tagline: "Start Your Journey With Confidence",
    marketing:
      "A beginner-friendly entry tier with AI-guided market participation, a monthly $20 salary, and simple rules that help you grow steadily. Designed for new investors who want a predictable, low-complexity experience.",
    minDeposit: 200,
    dailyROI: "1%",
    duration: "30 days",
    salary: "$20 / month",
    minWithdrawal: "$50 profit",
    reinvestment: "Not allowed",
    todayPerf: 0.42,
    weekPerf: 2.8,
    monthPerf: 11.4,
    perfRange: [0.3, 1.2],
    marketTrend: "Bullish",
    aiConfidence: 68,
    dashboard: [
      "Live performance tracker",
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
    investorType: "Beginner",
    aiStrategy: "Conservative Trend Following",
    riskLevel: "Low",
    projection: "~30% over 30 days",
  },
  {
    id: "inspectors",
    name: "Inspectors Plan",
    tagline: "Step Up to Smarter Earnings",
    marketing:
      "A strategic tier with sharper AI signals, richer analytics, and controlled reinvestment. Perfect for users ready to take a more active and informed role in market participation.",
    minDeposit: 500,
    dailyROI: "1.5%",
    duration: "30 days",
    salary: "$35 / month",
    minWithdrawal: "$40",
    reinvestment: "1 per cycle",
    todayPerf: 0.71,
    weekPerf: 4.6,
    monthPerf: 18.2,
    perfRange: [0.6, 1.8],
    marketTrend: "Bullish",
    aiConfidence: 74,
    dashboard: [
      "Performance projection graph",
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
    investorType: "Intermediate",
    aiStrategy: "Momentum + Signal Blending",
    riskLevel: "Moderate",
    projection: "~45% over 30 days",
  },
  {
    id: "superintendent",
    name: "Superintendent Plan",
    tagline: "Advanced Growth, Elevated Benefits",
    marketing:
      "Advanced AI portfolio management with deeper analytics and full reinvest flexibility. Ideal for structured investors who understand compounding and want more of the AI toolkit.",
    minDeposit: 1000,
    dailyROI: "2%",
    duration: "45 days",
    salary: "$50 / month",
    minWithdrawal: "$30",
    reinvestment: "Unlimited (monthly cap)",
    todayPerf: 1.02,
    weekPerf: 6.4,
    monthPerf: 26.8,
    perfRange: [0.9, 2.4],
    marketTrend: "Bullish",
    aiConfidence: 82,
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
    investorType: "Advanced",
    aiStrategy: "Adaptive Multi-Asset AI",
    riskLevel: "Balanced",
    projection: "~90% over 45 days",
    recommended: true,
  },
  {
    id: "commissioners",
    name: "Commissioners Plan",
    tagline: "Premium Rewards, High-Level Tools",
    marketing:
      "Premium AI dashboard utilities and full reinvestment access, crafted for high-level users who value efficiency, sharper signals, and exclusive market opportunities.",
    minDeposit: 2000,
    dailyROI: "2.5%",
    duration: "60 days",
    salary: "$80 / month",
    minWithdrawal: "$20",
    reinvestment: "Fully allowed",
    todayPerf: 1.38,
    weekPerf: 8.9,
    monthPerf: 34.5,
    perfRange: [1.1, 3.0],
    marketTrend: "Bullish",
    aiConfidence: 87,
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
    investorType: "Professional",
    aiStrategy: "High-Frequency Signal AI",
    riskLevel: "High",
    projection: "~150% over 60 days",
  },
  {
    id: "general",
    name: "General Plan",
    tagline: "The Flagship Tier for Maximum Advantage",
    marketing:
      "Our flagship experience — institutional-grade AI, full reinvest freedom, deepest analytics, and elite privileges. Designed for users who want maximum utility and complete platform access.",
    minDeposit: 5000,
    dailyROI: "3%",
    duration: "90 days",
    salary: "$150 / month",
    minWithdrawal: "$10",
    reinvestment: "Fully allowed",
    bonus: "Loyalty Bonus: 5% at cycle completion",
    todayPerf: 1.72,
    weekPerf: 11.4,
    monthPerf: 42.6,
    perfRange: [1.4, 3.6],
    marketTrend: "Bullish",
    aiConfidence: 91,
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
    investorType: "Elite / Institutional",
    aiStrategy: "Institutional-Grade AI Engine",
    riskLevel: "Aggressive",
    projection: "~270% over 90 days",
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

const riskColor = (r: Plan["riskLevel"]) => {
  switch (r) {
    case "Low":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "Moderate":
      return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    case "Balanced":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    case "High":
      return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "Aggressive":
      return "bg-rose-500/15 text-rose-400 border-rose-500/30";
  }
};

// Animated counter
const AnimatedCounter = ({
  end,
  suffix = "",
  prefix = "",
  duration = 1600,
  decimals = 0,
}: {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  decimals?: number;
}) => {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started.current) {
            started.current = true;
            const start = performance.now();
            const step = (t: number) => {
              const p = Math.min(1, (t - start) / duration);
              const eased = 1 - Math.pow(1 - p, 3);
              setVal(end * eased);
              if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          }
        });
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {val.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
};

// Scroll reveal wrapper
const Reveal = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setVisible(true)),
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      {children}
    </div>
  );
};

const InvestmentPlans = () => {
  const navigate = useNavigate();
  const [depositPlan, setDepositPlan] = useState<Plan | null>(null);
  const [cashOutOpen, setCashOutOpen] = useState(false);
  const [cashOutAddress, setCashOutAddress] = useState("");
  const [cashOutAmount, setCashOutAmount] = useState("");
  const [cashOutNetwork, setCashOutNetwork] = useState("BTC");

  // Per-plan trading mode selection
  const [modeByPlan, setModeByPlan] = useState<Record<string, TradingMode>>({});
  const getMode = (id: string): TradingMode => modeByPlan[id] ?? "auto";
  const setMode = (id: string, m: TradingMode) =>
    setModeByPlan((prev) => ({ ...prev, [id]: m }));

  const openSupport = () => {
    const w = window as any;
    if (w?.Tawk_API?.maximize) {
      w.Tawk_API.maximize();
    } else {
      window.location.href = "mailto:ctttradezone@caltexvault.com";
    }
  };

  const scrollToId = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goToDeposit = (plan: Plan) => {
    const mode = getMode(plan.id);
    navigate(`/wallet?plan=${encodeURIComponent(plan.id)}&mode=${mode}`);
  };

  // Estimator
  const [estAmount, setEstAmount] = useState<string>("1000");
  const [estPlanId, setEstPlanId] = useState<string>("superintendent");
  const [estDays, setEstDays] = useState<string>("30");

  const { prices } = useRealtimePrices();
  const priceBySymbol = (s: string) => prices.find((p) => p.symbol.toUpperCase() === s.toUpperCase());

  const copyBtcAddress = async () => {
    try {
      await navigator.clipboard.writeText(FIXED_BTC_ADDRESS);
      toast.success("BTC address copied!");
    } catch {
      toast.error("Failed to copy address");
    }
  };

  const handleCashOutSubmit = async () => {
    const addr = cashOutAddress.trim();
    const amt = parseFloat(cashOutAmount);
    if (!addr || /^\d+$/.test(addr)) {
      toast.error("Enter a valid external wallet address (numeric-only addresses are not allowed).");
      return;
    }
    if (!amt || amt <= 0) {
      toast.error("Enter a valid cash-out amount in USD.");
      return;
    }
    const payload = [
      "=== Cash Out Invested Capital ===",
      `Network: ${cashOutNetwork}`,
      `External Wallet Address: ${addr}`,
      `Amount (USD): $${amt.toFixed(2)}`,
      `Note: Cash-out requested with/without completion of trading cycle.`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(payload);
      toast.success("Cash-out request copied. Paste it into the live chat to proceed.");
      setCashOutOpen(false);
      setCashOutAddress("");
      setCashOutAmount("");
    } catch {
      toast.error("Failed to copy request.");
    }
  };

  // Estimator — projects a low/mid/high range from the selected plan's dynamic performance band.
  const estPlan = plans.find((p) => p.id === estPlanId) ?? plans[0];
  const lowPct = estPlan.perfRange[0] / 100;
  const highPct = estPlan.perfRange[1] / 100;
  const midPct = (lowPct + highPct) / 2;
  const amt = parseFloat(estAmount) || 0;
  const days = parseInt(estDays) || 0;
  const lowVal = amt * Math.pow(1 + lowPct, days);
  const midVal = amt * Math.pow(1 + midPct, days);
  const highVal = amt * Math.pow(1 + highPct, days);
  const finalVal = midVal;
  const earnings = finalVal - amt;
  const growthPct = amt > 0 ? (earnings / amt) * 100 : 0;
  const dailyPct = midPct;

  const marketSymbols = ["BTC", "ETH", "BNB", "SOL", "XRP"];
  const marketCoins = marketSymbols.map((s) => ({
    symbol: s,
    coin: priceBySymbol(s),
  }));

  const btc = priceBySymbol("BTC");
  const eth = priceBySymbol("ETH");

  const aiFeed = [
    { icon: Bot, text: "AI completed market scan across 42 assets", time: "just now" },
    { icon: TrendingUp, text: "BTC volatility increased — risk model updated", time: "1 min ago" },
    { icon: Gauge, text: "Portfolio risk recalculated for active plans", time: "3 min ago" },
    { icon: LineChart, text: "ETH momentum improving on 4H timeframe", time: "6 min ago" },
    { icon: Sparkles, text: "Opportunity detected: SOL breakout setup", time: "9 min ago" },
    { icon: Activity, text: "Liquidity check passed on BNB pair", time: "12 min ago" },
  ];

  const faqs = [
    {
      q: "How do investment plans work?",
      a: "Each plan has a minimum deposit, a fixed duration, and a set of dynamic market-based performance indicators (today's / 7-day / 30-day performance, AI confidence, market trend, risk level). Once activated, your dashboard tracks live performance and cycle progress automatically. Performance is market-driven and not guaranteed.",
    },
    {
      q: "How do I deposit funds?",
      a: "Choose a plan, pick Automated AI Trading or Manual Trading Signals, then click Deposit & Activate. You'll be sent to the Wallet page where you can pay with Crypto, PayPal, or another supported method. Activation happens automatically once the deposit is confirmed.",
    },
    {
      q: "How are withdrawals processed?",
      a: "Withdrawals are subject to each plan's minimum withdrawal threshold. Requests are reviewed and released to your external wallet.",
    },
    {
      q: "How do referral rewards work?",
      a: "Every plan unlocks a multi-level referral structure with activation bonuses. Commissions land in your referral wallet when your invitees activate a plan.",
    },
    {
      q: "How is the platform secured?",
      a: "We use SSL encryption, cold wallet custody for reserves, AI-driven fraud detection, and 24/7 infrastructure monitoring.",
    },
    {
      q: "What does the AI actually do?",
      a: "Our AI continuously scans markets, evaluates volatility, tracks momentum, and surfaces insights inside your dashboard. AI outputs are advisory and support your decisions.",
    },
    {
      q: "Are returns guaranteed?",
      a: "No. All projections are illustrative estimates based on plan parameters. Crypto markets carry risk — invest only what you can afford to allocate.",
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-yellow-500/5 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/" className="text-primary hover:underline text-sm">
            ← Back to Home
          </Link>
        </div>

        {/* ============ HERO ============ */}
        <section className="grid lg:grid-cols-2 gap-10 items-center mb-16">
          <Reveal>
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/30 backdrop-blur-sm hover:bg-primary/15">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              AI-Powered Investment Suite
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight text-foreground">
              AI-Powered{" "}
              <span className="bg-gradient-to-r from-primary via-cyan-300 to-yellow-400 bg-clip-text text-transparent">
                Crypto Investment
              </span>{" "}
              Platform
            </h1>
            <p className="mt-5 text-muted-foreground text-lg max-w-xl">
              Experience intelligent investment management with AI-assisted market analysis,
              advanced portfolio monitoring, and real-time crypto insights.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-cyan-400 text-primary-foreground hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)] transition-all"
                onClick={() =>
                  document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <Zap className="h-4 w-4 mr-2" />
                Start Investing
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-primary/40 hover:bg-primary/10 backdrop-blur-sm"
              >
                <Link to="/simulator">
                  <Bot className="h-4 w-4 mr-2" />
                  View AI Trading Center
                </Link>
              </Button>
            </div>
          </Reveal>

          <Reveal className="lg:pl-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-cyan-500/10 to-yellow-500/10 blur-2xl rounded-3xl" />
              <Card className="relative border-white/10 bg-card/60 backdrop-blur-xl shadow-2xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-primary via-cyan-400 to-yellow-400" />
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        AI Trading Engine
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        Live Market Intelligence
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sign in to view your portfolio in the dashboard.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 shrink-0">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="text-xs font-medium text-emerald-400">AI Online</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border/50 bg-background/40 p-3">
                      <p className="text-[10px] uppercase text-muted-foreground tracking-wider">
                        Market Sentiment
                      </p>
                      <p className="mt-1 font-semibold text-emerald-400">Bullish</p>
                      <Progress value={72} className="mt-2 h-1.5" />
                    </div>
                    <div className="rounded-xl border border-border/50 bg-background/40 p-3">
                      <p className="text-[10px] uppercase text-muted-foreground tracking-wider">
                        Today's Performance
                      </p>
                      <p className="mt-1 font-semibold text-emerald-400">+2.34%</p>
                      <Progress value={65} className="mt-2 h-1.5" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      { s: "BTC", coin: btc, fallback: 63500 },
                      { s: "ETH", coin: eth, fallback: 1780 },
                    ].map(({ s, coin, fallback }) => (
                      <div
                        key={s}
                        className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center text-xs font-bold text-primary-foreground">
                            {s[0]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{s}/USD</p>
                            <p className="text-[10px] text-muted-foreground">Live price</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-semibold">
                            ${(coin?.price ?? fallback).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                          </p>
                          <p
                            className={`text-[11px] font-medium ${
                              (coin?.change_24h ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {(coin?.change_24h ?? 0) >= 0 ? "+" : ""}
                            {(coin?.change_24h ?? 0).toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </Reveal>
        </section>

        {/* ============ TRUST BAR ============ */}
        <Reveal>
          <Card className="mb-16 border-border/50 bg-card/60 backdrop-blur-md">
            <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-6 p-6">
              {[
                { icon: BarChart3, label: "Assets Monitored", value: 120, suffix: "+" },
                { icon: Users, label: "Active Investors", value: 48500, suffix: "+" },
                { icon: Globe, label: "Platform Availability", value: 99.9, suffix: "%", decimals: 1 },
                { icon: Radio, label: "Countries Served", value: 140, suffix: "+" },
                { icon: Cpu, label: "AI Monitoring", value: 24, suffix: "/7" },
              ].map((s, i) => (
                <div key={i} className="text-center group">
                  <div className="inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-3 group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-foreground">
                    <AnimatedCounter end={s.value} suffix={s.suffix} decimals={s.decimals ?? 0} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </Reveal>

        {/* ============ PLANS ============ */}
        <section id="plans" className="mb-6">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-3 border-primary/30 text-primary">
              Investment Plans
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Choose Your Growth Tier</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              Five tiers built for every stage of your journey — from your first $200 to flagship
              $5,000+ portfolios.
            </p>
          </div>
        </section>

        {/* Render plans in groups of 2, interleaved with breaker sections */}
        {(() => {
          const groups: Plan[][] = [];
          for (let i = 0; i < plans.length; i += 2) groups.push(plans.slice(i, i + 2));

          const breakers = [
            <LiveMarketBreaker key="lm" marketCoins={marketCoins} />,
            <AIMarketOverviewBreaker key="ao" btc={btc} eth={eth} />,
            <SecurityMiniBreaker key="sm" />,
          ];

          return groups.map((group, gi) => (
            <div key={gi}>
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                {group.map((plan) => {
                  const Icon = plan.icon;
                  return (
                    <Reveal key={plan.id}>
                      <Card
                        id={`plan-${plan.id}`}
                        className={`relative flex flex-col border-border/50 bg-card/70 backdrop-blur-md overflow-hidden group transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.35)] scroll-mt-24 ${
                          plan.recommended ? "ring-2 ring-primary/40" : ""
                        }`}
                      >
                        {plan.recommended && (
                          <div className="absolute top-4 right-4 z-10">
                            <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black border-0 shadow-lg">
                              <Star className="h-3 w-3 mr-1 fill-current" /> Recommended
                            </Badge>
                          </div>
                        )}
                        {/* Glow border on hover */}
                        <div
                          className={`pointer-events-none absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                          style={{
                            background: `linear-gradient(135deg, hsl(var(--primary)/0.15), transparent 50%, hsl(var(--accent)/0.15))`,
                          }}
                        />
                        <div className={`h-2 bg-gradient-to-r ${plan.gradient}`} />
                        <CardHeader className="relative">
                          <div className="flex items-start justify-between gap-3">
                            <div
                              className={`p-3 rounded-xl bg-gradient-to-br ${plan.gradient} shadow-lg group-hover:scale-110 transition-transform`}
                            >
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
                          {/* AI meta strip */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <MetaChip icon={Users} label="Investor" value={plan.investorType} />
                            <MetaChip icon={Bot} label="AI Strategy" value={plan.aiStrategy} />
                            <div
                              className={`rounded-lg border px-2.5 py-2 ${riskColor(plan.riskLevel)}`}
                            >
                              <div className="flex items-center gap-1.5">
                                <Gauge className="h-3.5 w-3.5" />
                                <span className="text-[10px] uppercase tracking-wider opacity-80">
                                  Risk
                                </span>
                              </div>
                              <p className="font-semibold mt-0.5">{plan.riskLevel}</p>
                            </div>
                            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-2 text-yellow-400">
                              <div className="flex items-center gap-1.5">
                                <TrendingUp className="h-3.5 w-3.5" />
                                <span className="text-[10px] uppercase tracking-wider opacity-80">
                                  Est. Projection
                                </span>
                              </div>
                              <p className="font-semibold mt-0.5">{plan.projection}</p>
                            </div>
                          </div>

                          <div className="rounded-xl border border-border/50 p-4 bg-muted/20">
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
                            <h4 className="text-sm font-semibold text-foreground mb-2">
                              Privileges
                            </h4>
                            <ul className="space-y-1.5">
                              {plan.privileges.map((p) => (
                                <li key={p} className="flex gap-2 text-sm text-muted-foreground">
                                  <Star className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                  <span>{p}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="rounded-xl border border-border/50 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="h-4 w-4 text-primary" />
                              <h4 className="text-sm font-semibold text-foreground">
                                Referral Commissions
                              </h4>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground mb-2">
                              {plan.referral.levels.map((l) => (
                                <span key={l}>{l}</span>
                              ))}
                            </div>
                            <p className="text-xs text-primary font-medium">
                              {plan.referral.activation}
                            </p>
                            <p className="text-xs text-muted-foreground">{plan.referral.extra}</p>
                          </div>

                          <Button
                            className="w-full mt-auto bg-gradient-to-r from-primary to-cyan-400 text-primary-foreground hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-all"
                            onClick={() => setDepositPlan(plan)}
                          >
                            Deposit & Activate
                          </Button>
                          <p className="text-[10px] text-muted-foreground text-center -mt-1">
                            Projections are illustrative estimates, not guaranteed returns.
                          </p>
                        </CardContent>
                      </Card>
                    </Reveal>
                  );
                })}
              </section>

              {gi < breakers.length && <Reveal>{breakers[gi]}</Reveal>}
            </div>
          ));
        })()}

        {/* ============ AI TRADING ENGINE ============ */}
        <Reveal>
          <section className="mb-16">
            <SectionHeading
              badge="AI Trading Engine"
              title="Institutional-Grade AI Dashboard"
              subtitle="Live view of the AI's status, focus, and confidence signals across markets."
            />
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Bot} label="AI Status" value="Active" accent="emerald" />
              <StatCard icon={Sparkles} label="Current Strategy" value="Adaptive Multi-Asset" />
              <StatCard icon={BarChart3} label="Markets Monitored" value="42" />
              <StatCard icon={Activity} label="Last Scan" value="2s ago" />
              <RingCard label="Confidence Level" value={82} color="hsl(var(--primary))" />
              <RingCard label="Risk Exposure" value={38} color="hsl(43 96% 56%)" />
              <RingCard label="Market Volatility" value={54} color="hsl(0 84% 60%)" />
              <RingCard label="Portfolio Health" value={91} color="hsl(142 76% 46%)" />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Values shown are examples until connected to live services.
            </p>
          </section>
        </Reveal>

        {/* ============ PORTFOLIO ESTIMATOR ============ */}
        <Reveal>
          <section className="mb-16">
            <SectionHeading
              badge="Portfolio Estimator"
              title="Model Your Growth"
              subtitle="Enter your amount, plan, and duration to preview an illustrative projection."
            />
            <Card className="border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
              <div className="grid lg:grid-cols-2 gap-0">
                <div className="p-6 space-y-4 border-b lg:border-b-0 lg:border-r border-border/50">
                  <div className="space-y-1.5">
                    <Label>Investment Amount (USD)</Label>
                    <Input
                      type="number"
                      value={estAmount}
                      onChange={(e) => setEstAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Investment Plan</Label>
                    <Select value={estPlanId} onValueChange={setEstPlanId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.dailyROI}/day)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Investment Duration (days)</Label>
                    <Input
                      type="number"
                      value={estDays}
                      onChange={(e) => setEstDays(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Projections are illustrative estimates and not guaranteed returns.
                  </p>
                </div>
                <div className="p-6 bg-gradient-to-br from-primary/5 via-transparent to-yellow-500/5">
                  <div className="grid grid-cols-3 gap-3">
                    <MiniStat label="Estimated Value" value={`$${finalVal.toFixed(2)}`} />
                    <MiniStat label="Estimated Growth" value={`${growthPct.toFixed(1)}%`} accent />
                    <MiniStat label="Estimated Earnings" value={`$${earnings.toFixed(2)}`} accent />
                  </div>
                  <GrowthChart amt={amt} dailyPct={dailyPct} days={days} />
                </div>
              </div>
            </Card>
          </section>
        </Reveal>

        {/* ============ AI ACTIVITY FEED ============ */}
        <Reveal>
          <section className="mb-16">
            <SectionHeading
              badge="AI Activity"
              title="Live AI Insights"
              subtitle="Sample activity — will connect to live data once services are online."
            />
            <Card className="border-border/50 bg-card/60 backdrop-blur-md">
              <CardContent className="p-4 max-h-72 overflow-hidden relative">
                <div className="space-y-3 animate-[fade-in_0.6s_ease-out]">
                  {aiFeed.map((f, i) => {
                    const Icon = f.icon;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-lg bg-background/40 border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all"
                      >
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-foreground">{f.text}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{f.time}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </section>
        </Reveal>

        {/* ============ SECURITY CENTER ============ */}
        <Reveal>
          <section className="mb-16">
            <SectionHeading
              badge="Security Center"
              title="Institutional-Grade Protection"
              subtitle="Multi-layered defense across custody, identity, and infrastructure."
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Lock, title: "SSL Encryption", desc: "TLS 1.3 across every request." },
                { icon: ShieldCheck, title: "Cold Wallet Security", desc: "Reserves in offline custody." },
                { icon: Bot, title: "AI Fraud Detection", desc: "Anomaly scoring on every action." },
                { icon: Fingerprint, title: "Identity Verification", desc: "KYC & AML aligned checks." },
                { icon: Eye, title: "24/7 Monitoring", desc: "Continuous infra observability." },
                { icon: KeyRound, title: "Encrypted Transactions", desc: "End-to-end payload protection." },
              ].map((s) => (
                <Card
                  key={s.title}
                  className="border-border/50 bg-card/60 backdrop-blur-md hover:border-primary/40 hover:-translate-y-0.5 transition-all"
                >
                  <CardContent className="p-5">
                    <div className="p-2.5 inline-flex rounded-lg bg-primary/10 text-primary mb-3">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <h4 className="font-semibold text-foreground">{s.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ============ WHY INVEST ============ */}
        <Reveal>
          <section className="mb-16">
            <SectionHeading
              badge="Why CTT Trade Zone"
              title="Built for Serious Investors"
              subtitle="Everything you need to run a professional crypto portfolio."
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Bot, title: "AI Market Intelligence", desc: "Continuous scanning across 40+ assets." },
                { icon: LineChart, title: "Smart Portfolio Monitoring", desc: "Real-time performance insight." },
                { icon: BarChart3, title: "Transparent Dashboard", desc: "See every metric that matters." },
                { icon: Users, title: "Advanced Referral System", desc: "Multi-level commissions and bonuses." },
                { icon: ShieldCheck, title: "Secure Infrastructure", desc: "Enterprise-grade custody stack." },
                { icon: Activity, title: "Responsive Support", desc: "24/7 assistance when you need it." },
              ].map((f) => (
                <Card
                  key={f.title}
                  className="border-border/50 bg-card/60 backdrop-blur-md hover:border-primary/40 hover:-translate-y-0.5 transition-all"
                >
                  <CardContent className="p-5">
                    <div className="p-2.5 inline-flex rounded-lg bg-gradient-to-br from-primary/20 to-cyan-400/20 text-primary mb-3">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h4 className="font-semibold text-foreground">{f.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ============ TESTIMONIALS ============ */}
        <Reveal>
          <section className="mb-16">
            <SectionHeading badge="Testimonials" title="Trusted by Investors Worldwide" />
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  name: "Amelia Carter",
                  role: "Portfolio Manager",
                  quote:
                    "The AI dashboard turned my scattered strategy into a disciplined system. Cleanest analytics I've used.",
                },
                {
                  name: "Rohan Mehta",
                  role: "Crypto Trader",
                  quote:
                    "Referral rewards, tight security, and instant AI signals. It genuinely feels institutional.",
                },
                {
                  name: "Sofia Lindqvist",
                  role: "Long-Term Investor",
                  quote:
                    "I appreciate the transparency — every projection is clearly labeled, every metric is visible.",
                },
              ].map((t) => (
                <Card
                  key={t.name}
                  className="border-border/50 bg-card/60 backdrop-blur-md hover:border-primary/40 transition-all"
                >
                  <CardContent className="p-6">
                    <Quote className="h-6 w-6 text-primary/60 mb-3" />
                    <p className="text-sm text-foreground/90 leading-relaxed">{t.quote}</p>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center font-bold text-primary-foreground">
                        {t.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ============ FAQ ============ */}
        <Reveal>
          <section className="mb-16">
            <SectionHeading badge="FAQ" title="Frequently Asked Questions" />
            <Card className="border-border/50 bg-card/60 backdrop-blur-md">
              <CardContent className="p-4 md:p-6">
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((f, i) => (
                    <AccordionItem key={i} value={`item-${i}`} className="border-border/40">
                      <AccordionTrigger className="text-left hover:text-primary transition-colors">
                        {f.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </section>
        </Reveal>

        {/* ============ Referral Program Overview (preserved) ============ */}
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
              <Card
                key={plan.id}
                className="border-border/50 bg-card/60 backdrop-blur-md hover:border-primary/40 transition-all"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-xs">
                  {plan.referral.levels.map((l) => (
                    <div key={l} className="text-muted-foreground">
                      {l}
                    </div>
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

        {/* ============ Terms (preserved) ============ */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <AlertCircle className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Referral Terms & Conditions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {terms.map((t) => (
              <Card key={t.title} className="border-border/50 bg-card/60 backdrop-blur-md">
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

        {/* ============ Cash-Out (preserved) ============ */}
        <section className="mb-16">
          <Card className="border-border/50 bg-gradient-to-br from-primary/10 via-card/60 to-accent/10 backdrop-blur-md">
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <ArrowUpRight className="h-6 w-6 text-primary" />
                    Cash Out Invested Capital
                  </CardTitle>
                  <CardDescription className="mt-2 max-w-2xl">
                    Your invested capital can be cashed out to an external wallet at any time —
                    with or without completion of the trading cycle.
                  </CardDescription>
                </div>
                <Button
                  size="lg"
                  onClick={() => setCashOutOpen(true)}
                  className="bg-gradient-to-r from-primary to-cyan-400 text-primary-foreground"
                >
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Start Cash-Out
                </Button>
              </div>
            </CardHeader>
          </Card>
        </section>
      </div>

      {/* Deposit & Activate dialog */}
      <Dialog open={!!depositPlan} onOpenChange={(o) => !o && setDepositPlan(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WalletIcon className="h-5 w-5 text-primary" />
              Activate {depositPlan?.name ?? "Plan"}
            </DialogTitle>
            <DialogDescription>
              Send the equivalent of your plan's minimum deposit
              {depositPlan ? ` ($${depositPlan.minDeposit.toLocaleString()})` : ""} in BTC to the
              address below. Your plan activates automatically once the deposit is confirmed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                BTC Deposit Address
              </p>
              <p className="font-mono text-sm break-all text-foreground">{FIXED_BTC_ADDRESS}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={copyBtcAddress}>
              <Copy className="h-4 w-4 mr-2" />
              Copy BTC Address
            </Button>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Send BTC only. Deposits on any other network will not be credited.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setDepositPlan(null)}>
              Close
            </Button>
            <Button asChild>
              <Link to="/wallet">Go to Wallet</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cash-out dialog */}
      <Dialog open={cashOutOpen} onOpenChange={setCashOutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-primary" />
              Cash Out Invested Capital
            </DialogTitle>
            <DialogDescription>
              Withdraw your invested capital to any external wallet — with or without completing
              the trading cycle.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cashout-network">Network</Label>
              <Select value={cashOutNetwork} onValueChange={setCashOutNetwork}>
                <SelectTrigger id="cashout-network">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                  <SelectItem value="USDT-TRC20">USDT (TRC20)</SelectItem>
                  <SelectItem value="USDT-ERC20">USDT (ERC20)</SelectItem>
                  <SelectItem value="USDT-BEP20">USDT (BEP20)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cashout-address">External Wallet Address</Label>
              <Input
                id="cashout-address"
                placeholder="Paste your receiving wallet address"
                value={cashOutAddress}
                onChange={(e) => setCashOutAddress(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cashout-amount">Amount (USD)</Label>
              <Input
                id="cashout-amount"
                type="number"
                min="0"
                placeholder="0.00"
                value={cashOutAmount}
                onChange={(e) => setCashOutAmount(e.target.value)}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Submitting copies your cash-out request to the clipboard. Paste it into the live
              chat to complete processing.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setCashOutOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCashOutSubmit}>Submit Cash-Out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ============ Sub-components ============ */

const Row = ({ label, value, full }: { label: string; value: string; full?: boolean }) => (
  <div className={full ? "col-span-2 flex justify-between" : "flex justify-between"}>
    <span className="text-muted-foreground">{label}:</span>
    <span className="text-foreground font-medium text-right">{value}</span>
  </div>
);

const MetaChip = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Star;
  label: string;
  value: string;
}) => (
  <div className="rounded-lg border border-border/50 bg-background/40 px-2.5 py-2">
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      <span className="text-[10px] uppercase tracking-wider">{label}</span>
    </div>
    <p className="font-semibold text-foreground mt-0.5 text-xs">{value}</p>
  </div>
);

const SectionHeading = ({
  badge,
  title,
  subtitle,
}: {
  badge: string;
  title: string;
  subtitle?: string;
}) => (
  <div className="text-center mb-8">
    <Badge variant="outline" className="mb-3 border-primary/30 text-primary">
      {badge}
    </Badge>
    <h2 className="text-3xl md:text-4xl font-bold text-foreground">{title}</h2>
    {subtitle && <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">{subtitle}</p>}
  </div>
);

const StatCard = ({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Star;
  label: string;
  value: string;
  accent?: "emerald";
}) => (
  <Card className="border-border/50 bg-card/60 backdrop-blur-md hover:border-primary/40 hover:-translate-y-0.5 transition-all">
    <CardContent className="p-5">
      <div className="flex items-center justify-between">
        <div
          className={`p-2 rounded-lg ${
            accent === "emerald" ? "bg-emerald-500/15 text-emerald-400" : "bg-primary/10 text-primary"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        {accent === "emerald" && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-3 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-foreground mt-0.5">{value}</p>
    </CardContent>
  </Card>
);

const RingCard = ({ label, value, color }: { label: string; value: number; color: string }) => {
  const [progress, setProgress] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) setProgress(value);
      });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (progress / 100) * c;
  return (
    <Card
      ref={ref as any}
      className="border-border/50 bg-card/60 backdrop-blur-md hover:border-primary/40 transition-all"
    >
      <CardContent className="p-5 flex items-center gap-4">
        <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
          <circle cx="40" cy="40" r={r} stroke="hsl(var(--border))" strokeWidth="6" fill="none" />
          <circle
            cx="40"
            cy="40"
            r={r}
            stroke={color}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
          />
          <text
            x="40"
            y="45"
            textAnchor="middle"
            className="fill-foreground font-bold text-sm"
            transform="rotate(90 40 40)"
          >
            {progress}%
          </text>
        </svg>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-sm font-semibold text-foreground mt-1">Real-time metric</p>
        </div>
      </CardContent>
    </Card>
  );
};

const MiniStat = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) => (
  <div className="rounded-xl border border-border/50 bg-background/50 p-3">
    <p className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</p>
    <p className={`mt-1 font-bold text-lg ${accent ? "text-emerald-400" : "text-foreground"}`}>
      {value}
    </p>
  </div>
);

const GrowthChart = ({
  amt,
  dailyPct,
  days,
}: {
  amt: number;
  dailyPct: number;
  days: number;
}) => {
  const points = Array.from({ length: Math.max(2, days + 1) }, (_, i) => amt * Math.pow(1 + dailyPct, i));
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const w = 100;
  const h = 40;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <div className="mt-5 rounded-xl border border-border/50 bg-background/40 p-4">
      <p className="text-xs text-muted-foreground mb-2">Growth Chart (illustrative)</p>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-32">
        <defs>
          <linearGradient id="gc" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L${w},${h} L0,${h} Z`} fill="url(#gc)" />
        <path d={path} stroke="hsl(var(--primary))" strokeWidth="0.8" fill="none" />
      </svg>
    </div>
  );
};

const LiveMarketBreaker = ({
  marketCoins,
}: {
  marketCoins: { symbol: string; coin: any }[];
}) => (
  <section className="mb-12">
    <SectionHeading
      badge="Live Market"
      title="Real-Time Crypto Pulse"
      subtitle="Live prices with 24h momentum and trend snapshots."
    />
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {marketCoins.map(({ symbol, coin }) => {
        const fallback: Record<string, number> = {
          BTC: 63500,
          ETH: 1780,
          BNB: 580,
          SOL: 145,
          XRP: 0.52,
        };
        const price = coin?.price ?? fallback[symbol] ?? 0;
        const change = coin?.change_24h ?? 0;
        const up = change >= 0;
        return (
          <Card
            key={symbol}
            className="border-border/50 bg-card/60 backdrop-blur-md hover:border-primary/40 hover:-translate-y-0.5 transition-all overflow-hidden"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {symbol[0]}
                  </div>
                  <span className="text-sm font-semibold">{symbol}</span>
                </div>
                {up ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-rose-400" />
                )}
              </div>
              <p className="font-mono font-semibold text-foreground">
                ${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className={`text-xs ${up ? "text-emerald-400" : "text-rose-400"}`}>
                {up ? "+" : ""}
                {change.toFixed(2)}%
              </p>
              <div className="mt-2">
                <PriceSparkline
                  currentPrice={price}
                  change24h={change}
                  symbol={symbol}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Mkt cap: —</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  </section>
);

const AIMarketOverviewBreaker = ({ btc, eth }: { btc: any; eth: any }) => (
  <section className="mb-12">
    <SectionHeading
      badge="AI Market Overview"
      title="Sentiment & Signals"
      subtitle="A snapshot of what the AI is seeing right now."
    />
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="border-border/50 bg-card/60 backdrop-blur-md">
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Market Sentiment</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">Bullish</p>
          <Progress value={72} className="mt-3 h-1.5" />
          <p className="text-xs text-muted-foreground mt-2">72% positive AI signals</p>
        </CardContent>
      </Card>
      {[
        { s: "BTC", coin: btc, fb: 63500 },
        { s: "ETH", coin: eth, fb: 1780 },
      ].map(({ s, coin, fb }) => (
        <Card key={s} className="border-border/50 bg-card/60 backdrop-blur-md">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {s} Live Price
            </p>
            <p className="mt-1 text-2xl font-bold font-mono">
              ${(coin?.price ?? fb).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p
              className={`text-sm font-medium ${
                (coin?.change_24h ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {(coin?.change_24h ?? 0) >= 0 ? "+" : ""}
              {(coin?.change_24h ?? 0).toFixed(2)}% (24h)
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  </section>
);

const SecurityMiniBreaker = () => (
  <section className="mb-12">
    <Card className="border-border/50 bg-gradient-to-r from-primary/10 via-card/60 to-yellow-500/10 backdrop-blur-md overflow-hidden">
      <CardContent className="p-6 grid md:grid-cols-3 gap-6 items-center">
        <div>
          <Badge variant="outline" className="mb-2 border-primary/30 text-primary">
            Security Highlights
          </Badge>
          <h3 className="text-2xl font-bold">Your Capital, Fully Protected</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Cold custody, AI fraud detection, encrypted transactions — always on.
          </p>
        </div>
        {[
          { icon: ShieldCheck, label: "Cold Storage", value: "97% offline" },
          { icon: Cpu, label: "AI Monitoring", value: "24/7 active" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border/50 bg-background/40 p-4 flex items-center gap-3"
          >
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <p className="font-semibold text-foreground">{s.value}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  </section>
);

export default InvestmentPlans;
