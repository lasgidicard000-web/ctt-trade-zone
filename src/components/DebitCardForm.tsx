import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Wallet, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const debitCardSchema = z.object({
  cardholderName: z.string().min(1, "Cardholder name is required").max(100, "Name too long"),
  cardNumber: z.string().regex(/^\d{16}$/, "Card number must be 16 digits"),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Invalid expiry date (MM/YY)"),
  cvv: z.string().regex(/^\d{3,4}$/, "CVV must be 3-4 digits"),
  amount: z.number().positive("Amount must be positive"),
  selectedCrypto: z.string().min(1, "Please select a cryptocurrency"),
});

interface DebitCardFormProps {
  cardName: string;
  supportedCoins: string[];
  gradientClass: string;
}

const DebitCardForm = ({ cardName, supportedCoins, gradientClass }: DebitCardFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    cardholderName: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    amount: "",
    selectedCrypto: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits;
  };

  const formatExpiryDate = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 2) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  const validateExpiryDate = (value: string): boolean => {
    const match = value.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
    if (!match) return false;
    
    const month = parseInt(match[1], 10);
    const year = parseInt(`20${match[2]}`, 10);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;
    
    return true;
  };

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value;
    
    if (field === "cardNumber") {
      formattedValue = formatCardNumber(value);
    } else if (field === "expiryDate") {
      formattedValue = formatExpiryDate(value);
    } else if (field === "cvv") {
      formattedValue = value.replace(/\D/g, "").slice(0, 4);
    }
    
    setFormData((prev) => ({ ...prev, [field]: formattedValue }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    try {
      const dataToValidate = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
      };
      
      debitCardSchema.parse(dataToValidate);
      
      // Additional expiry date validation
      if (!validateExpiryDate(formData.expiryDate)) {
        setErrors({ expiryDate: "Card has expired or invalid date" });
        return;
      }
      
      setIsSubmitting(true);
      
      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      toast({
        title: "Transfer Initiated",
        description: `Successfully initiated transfer of $${formData.amount} worth of ${formData.selectedCrypto} to your Crypto Gift Wallet.`,
      });
      
      // Reset form
      setFormData({
        cardholderName: "",
        cardNumber: "",
        expiryDate: "",
        cvv: "",
        amount: "",
        selectedCrypto: "",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        const issues = error.issues || [];
        issues.forEach((issue: z.ZodIssue) => {
          if (issue.path[0]) {
            newErrors[issue.path[0] as string] = issue.message;
          }
        });
        setErrors(newErrors);
      } else {
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayCardNumber = formData.cardNumber
    ? formData.cardNumber.replace(/(.{4})/g, "$1 ").trim()
    : "";

  return (
    <Card className="bg-card border-border/50 mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Debit Your Card to Your Crypto Gift Wallet
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Your Internal Crypto Gift Wallet</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Funds will be credited directly to your internal Crypto Gift Wallet. No external wallet address required.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cardholderName">Cardholder Name</Label>
              <Input
                id="cardholderName"
                placeholder="John Doe"
                value={formData.cardholderName}
                onChange={(e) => handleInputChange("cardholderName", e.target.value)}
                className={errors.cardholderName ? "border-destructive" : ""}
              />
              {errors.cardholderName && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.cardholderName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={displayCardNumber}
                onChange={(e) => handleInputChange("cardNumber", e.target.value)}
                className={errors.cardNumber ? "border-destructive" : ""}
                maxLength={19}
              />
              {errors.cardNumber && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.cardNumber}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                placeholder="MM/YY"
                value={formData.expiryDate}
                onChange={(e) => handleInputChange("expiryDate", e.target.value)}
                className={errors.expiryDate ? "border-destructive" : ""}
                maxLength={5}
              />
              {errors.expiryDate && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.expiryDate}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                placeholder="123"
                value={formData.cvv}
                onChange={(e) => handleInputChange("cvv", e.target.value)}
                className={errors.cvv ? "border-destructive" : ""}
                maxLength={4}
                type="password"
              />
              {errors.cvv && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.cvv}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="100.00"
                value={formData.amount}
                onChange={(e) => handleInputChange("amount", e.target.value)}
                className={errors.amount ? "border-destructive" : ""}
                min="0"
                step="0.01"
              />
              {errors.amount && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.amount}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="selectedCrypto">Select Cryptocurrency</Label>
              <Select
                value={formData.selectedCrypto}
                onValueChange={(value) => handleInputChange("selectedCrypto", value)}
              >
                <SelectTrigger className={errors.selectedCrypto ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select crypto" />
                </SelectTrigger>
                <SelectContent>
                  {supportedCoins.map((coin) => (
                    <SelectItem key={coin} value={coin}>
                      {coin}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.selectedCrypto && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.selectedCrypto}
                </p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className={`w-full ${gradientClass} text-white font-semibold py-3`}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Processing..." : "Debit to Crypto Gift Wallet"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default DebitCardForm;
