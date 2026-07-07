import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle, AlertCircle, Shield, Zap, CreditCard, Send, Building } from "lucide-react";

interface WalletStatusCardProps {
  btcBalance: number;
  btcPrice: number;
}

export const WalletStatusCard = ({ btcBalance, btcPrice }: WalletStatusCardProps) => {
  const btcValue = btcBalance * btcPrice;
  const isActive = btcValue >= 200;
  const remainingToActivate = Math.max(0, 200 - btcValue);

  return (
    <Card className="mb-6 border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            CTTTradeZone Wallet Status
          </CardTitle>
          <Badge
            variant={isActive ? "default" : "destructive"}
            className={`text-sm px-3 py-1 ${
              isActive
                ? "bg-accent text-accent-foreground"
                : "bg-destructive text-destructive-foreground"
            }`}
          >
            {isActive ? (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                ACTIVE
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                INACTIVE
              </span>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-lg bg-muted/50 p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Your BTC Balance</p>
              <p className="font-semibold">{btcBalance.toFixed(8)} BTC</p>
            </div>
            <div>
              <p className="text-muted-foreground">BTC Value (USD)</p>
              <p className="font-semibold">${btcValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
          {!isActive && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                ⚠️ You need <span className="font-bold">${remainingToActivate.toFixed(2)}</span> more in BTC to activate your wallet.
              </p>
            </div>
          )}
        </div>

        <Alert className="mb-4 border-primary/20 bg-primary/5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            A minimum deposit of <strong>$200 worth of BTC</strong> to your wallet activates your CTTTradeZone dashboard. Deposit to the wallet section first to unlock all features.
          </AlertDescription>
        </Alert>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="what-happens">
            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                What Happens to Your $500?
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm text-muted-foreground pl-6">
                <p>
                  <strong className="text-foreground">Deposit Method:</strong> Your $500 must be deposited through the normal crypto method in Bitcoin only (not bank debits, PayPal, card debit, etc.)
                </p>
                <p>
                  <strong className="text-foreground">Non-Withdrawable:</strong> This $500 is not withdrawable nor transferable. It serves as your wallet activation reserve.
                </p>
                <p>
                  <strong className="text-foreground">Wallet Closure:</strong> Transferring or attempting to withdraw the $500 leads to immediate closure of your wallet dashboard.
                </p>
                <p>
                  <strong className="text-foreground">Status Protection:</strong> If the $500 BTC reserve is tampered with in any way, your wallet status will automatically change to INACTIVE.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="benefits">
            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-accent" />
                Benefits of an Active CTTTradeZone Wallet Account
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pl-6">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-accent/20 p-1.5">
                    <Shield className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Zero Transaction Fees</p>
                    <p className="text-sm text-muted-foreground">
                      No external charges are being paid during any transactions within the ACTIVE wallet dashboard section.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-accent/20 p-1.5">
                    <CreditCard className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Gas-Free Mastercard Debits</p>
                    <p className="text-sm text-muted-foreground">
                      All crypto Mastercards can be debited into the wallet dashboard without any gas fee. Fees are calculated and deducted from the untouchable $500 reserve.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-accent/20 p-1.5">
                    <Send className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Fee-Free Outgoing Transfers</p>
                    <p className="text-sm text-muted-foreground">
                      CTTTradeZone Active wallet dashboard can send out funds to all other crypto wallets without any hidden charges.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-accent/20 p-1.5">
                    <Building className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Direct Bank Conversion</p>
                    <p className="text-sm text-muted-foreground">
                      CTTTradeZone Active wallet account can convert any crypto to any fiat exchange of your choice and can be paid directly to your local banks worldwide.
                    </p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};
