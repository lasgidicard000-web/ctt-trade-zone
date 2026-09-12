import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Landmark, ShieldAlert } from "lucide-react";
import type { CardBankAccount } from "@/hooks/useVirtualCard";

interface Props {
  bankAccount: CardBankAccount | null;
  onSave: (values: {
    holderName: string;
    bankName: string;
    accountNumber: string;
    branchCode?: string;
    country?: string;
  }) => Promise<{ error?: string }>;
  onDone?: () => void;
}

export const BankAccountForm = ({ bankAccount, onSave, onDone }: Props) => {
  const [holderName, setHolderName] = useState(bankAccount?.holder_name ?? "");
  const [bankName, setBankName] = useState(bankAccount?.bank_name ?? "");
  const [accountNumber, setAccountNumber] = useState("");
  const [branchCode, setBranchCode] = useState(bankAccount?.branch_code ?? "");
  const [country, setCountry] = useState(bankAccount?.country ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!holderName.trim() || !bankName.trim() || accountNumber.replace(/\D/g, "").length < 4) {
      setError("Enter an account holder name, a bank name and at least 4 account digits.");
      return;
    }
    setBusy(true);
    const res = await onSave({
      holderName: holderName.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      branchCode: branchCode.trim() || undefined,
      country: country.trim() || undefined,
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setAccountNumber("");
    onDone?.();
  };

  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] font-medium text-amber-700 dark:text-amber-400">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Demonstration only. Use placeholder details — do not enter real banking credentials. No
        information is sent to any bank and no real money moves.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Account holder name</Label>
          <Input value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder="Demo Holder" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Bank name</Label>
          <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Demo Bank" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Account number (demo)</Label>
          <Input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="0000 0000"
            inputMode="numeric"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Branch / routing code (optional)</Label>
          <Input value={branchCode} onChange={(e) => setBranchCode(e.target.value)} placeholder="000-000" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Country (optional)</Label>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Australia" />
        </div>
      </div>

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}

      <Button onClick={submit} disabled={busy} className="w-full">
        <Landmark className="mr-2 h-4 w-4" />
        {busy ? "Saving…" : bankAccount ? "Update demo bank details" : "Save demo bank details"}
      </Button>
    </div>
  );
};

export default BankAccountForm;
