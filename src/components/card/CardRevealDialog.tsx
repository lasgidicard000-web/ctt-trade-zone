import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (pin: string) => Promise<{ ok: boolean; error?: string }>;
}

export const CardRevealDialog = ({ open, onOpenChange, onSubmit }: Props) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setPin("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const submit = async () => {
    if (!/^[0-9]{4}$/.test(pin)) {
      setError("Enter your 4-digit card PIN");
      return;
    }
    setBusy(true);
    const res = await onSubmit(pin);
    setBusy(false);
    if (res.ok) {
      onOpenChange(false);
      return;
    }
    setPin("");
    setError(res.error ?? "Could not unlock card details");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Verify your card PIN
          </DialogTitle>
          <DialogDescription>
            Enter your 4-digit PIN to view the card number, expiry and CVV. Details hide
            automatically after 60 seconds.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="reveal-pin">Card PIN</Label>
            <Input
              id="reveal-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="text-center font-mono text-lg tracking-[0.5em]"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={submit} disabled={busy || pin.length !== 4}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Unlock details
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
