import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gift, ArrowLeftRight, Wallet, Zap, Shield, TrendingUp, CreditCard, Calculator, Banknote } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="absolute inset-0" style={{ boxShadow: "var(--glow-primary)" }} />
        
        <div className="container relative mx-auto px-4 py-20">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-7xl">
              Your Gateway to{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Instant Crypto
              </span>
            </h1>
            <p className="mb-8 text-xl text-muted-foreground">
              Redeem gift cards, trade Caltex tokens, and manage your crypto portfolio—all in one powerful platform
            </p>
            <div className="mb-8 flex justify-center">
              <Button
                size="lg"
                className="h-14 bg-gradient-to-r from-primary to-accent px-10 text-base font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/40 transition-transform hover:scale-105 hover:shadow-xl hover:shadow-accent/50"
                asChild
              >
                <Link to="/investment-plans">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  View Investment Plans
                </Link>
              </Button>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                <Link to="/redeem">Redeem Gift Card</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" asChild>
                <Link to="/redeem#calculator">
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculator
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/trade">Start Trading</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground" asChild>
                <Link to="/crypto-cards">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Crypto Cards
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" asChild>
                <Link to="/spend-card">
                  <Banknote className="mr-2 h-4 w-4" />
                  Spend Card
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold">Everything You Need</h2>
          <p className="text-muted-foreground">Four powerful tools in one seamless platform</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Link to="/redeem">
            <Card className="group h-full cursor-pointer border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/20">
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Gift Card Redemption</h3>
              <p className="text-muted-foreground">
                Convert your gift cards into crypto instantly. Send directly to your wallet address with zero hassle.
              </p>
            </Card>
          </Link>

          <Link to="/trade">
            <Card className="group h-full cursor-pointer border-border bg-card p-6 transition-all hover:border-accent hover:shadow-lg hover:shadow-accent/20">
              <div className="mb-4 inline-flex rounded-lg bg-accent/10 p-3">
                <ArrowLeftRight className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Caltex Trading</h3>
              <p className="text-muted-foreground">
                Trade your Caltex tokens for other cryptocurrencies. Access competitive rates and instant execution.
              </p>
            </Card>
          </Link>

          <Link to="/wallet">
            <Card className="group h-full cursor-pointer border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/20">
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Wallet Dashboard</h3>
              <p className="text-muted-foreground">
                View all available coins and their current prices. Track your portfolio in real-time.
              </p>
            </Card>
          </Link>

          <Link to="/spend-card">
            <Card className="group h-full cursor-pointer border-border bg-card p-6 transition-all hover:border-accent hover:shadow-lg hover:shadow-accent/20">
              <div className="mb-4 inline-flex rounded-lg bg-accent/10 p-3">
                <Banknote className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Spend Card</h3>
              <p className="text-muted-foreground">
                Transfer funds from your Mastercard directly to any bank account worldwide with ease.
              </p>
            </Card>
          </Link>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="border-t border-border bg-card/50">
        <div className="container mx-auto px-4 py-20">
          <div className="grid gap-12 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-4 inline-flex rounded-full bg-primary/10 p-4">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Instant Transfers</h3>
              <p className="text-muted-foreground">
                Get your crypto within seconds of redemption or trade
              </p>
            </div>

            <div className="text-center">
              <div className="mb-4 inline-flex rounded-full bg-accent/10 p-4">
                <Shield className="h-8 w-8 text-accent" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Secure Platform</h3>
              <p className="text-muted-foreground">
                Bank-level security to protect your assets and transactions
              </p>
            </div>

            <div className="text-center">
              <div className="mb-4 inline-flex rounded-full bg-primary/10 p-4">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Real-Time Rates</h3>
              <p className="text-muted-foreground">
                Always get the most current market prices for your trades
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
