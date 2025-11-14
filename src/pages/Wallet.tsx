import { Card } from "@/components/ui/card";
import { Wallet as WalletIcon, TrendingUp, TrendingDown } from "lucide-react";

const Wallet = () => {
  const coins = [
    { symbol: "BTC", name: "Bitcoin", price: 43250.00, change: 2.4, balance: 0.045 },
    { symbol: "ETH", name: "Ethereum", price: 2280.50, change: -1.2, balance: 1.23 },
    { symbol: "USDT", name: "Tether", price: 1.00, change: 0.0, balance: 1500.00 },
    { symbol: "BNB", name: "Binance Coin", price: 310.25, change: 3.8, balance: 5.5 },
    { symbol: "CCT", name: "Custom Coin Token", price: 1.20, change: 5.2, balance: 2500.00 },
  ];

  const totalPortfolioValue = coins.reduce((acc, coin) => acc + (coin.price * coin.balance), 0);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-6xl py-12">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex rounded-full bg-primary/10 p-4">
            <WalletIcon className="h-12 w-12 text-primary" />
          </div>
          <h1 className="mb-2 text-4xl font-bold">Wallet Dashboard</h1>
          <p className="text-muted-foreground">View all available cryptocurrencies and your portfolio</p>
        </div>

        <Card className="mb-6 border-border bg-gradient-to-br from-primary/10 to-accent/10 p-6">
          <div className="text-center">
            <p className="mb-2 text-sm text-muted-foreground">Total Portfolio Value</p>
            <p className="text-4xl font-bold text-foreground">
              ${totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coins.map((coin) => (
            <Card key={coin.symbol} className="border-border bg-card p-6 transition-all hover:border-primary/50">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{coin.symbol}</h3>
                  <p className="text-sm text-muted-foreground">{coin.name}</p>
                </div>
                <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
                  coin.change > 0 ? 'bg-accent/10 text-accent' : coin.change < 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                }`}>
                  {coin.change > 0 ? <TrendingUp className="h-3 w-3" /> : coin.change < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                  {coin.change > 0 ? '+' : ''}{coin.change}%
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Price</span>
                  <span className="font-medium">${coin.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Balance</span>
                  <span className="font-medium">{coin.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} {coin.symbol}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="text-sm text-muted-foreground">Value</span>
                  <span className="font-semibold text-primary">
                    ${(coin.price * coin.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-6 border-border bg-card/50 p-4">
          <p className="text-center text-sm text-muted-foreground">
            Prices update in real-time. Admin can manage coins and pricing through the admin panel.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Wallet;
