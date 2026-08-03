import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Snowflake, Play, KeyRound, Trash2, ShoppingBag } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { VirtualCard } from "@/hooks/useVirtualCard";

interface Props {
  card: VirtualCard;
  onSetStatus: (s: "active" | "frozen" | "terminated") => Promise<{ error?: string }>;
  onSetPin: (pin: string) => Promise<{ error?: string }>;
  onOpenSpend: () => void;
}

export const CardControls = ({ card, onSetStatus, onSetPin, onOpenSpend }: Props) => {
  const [busy, setBusy] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");

  const frozen = card.status === "frozen";
  const pct = card.daily_limit > 0 ? Math.min(100, (card.spent_today / card.daily_limit) * 100) : 0;

  const toggleFreeze = async () => {
    setBusy(true);
    const { error } = await onSetStatus(frozen ? "active" : "frozen");
    setBusy(false);
    if (error) return toast({ title: "Action failed", description: error, variant: "destructive" });
    toast({ title: frozen ? "Card unfrozen" : "Card frozen" });
  };

  const terminate = async () => {
    const { error } = await onSetStatus("terminated");
    if (error) return toast({ title: "Action failed", description: error, variant: "destructive" });
    toast({ title: "Card terminated" });
  };

  const savePin = async () => {
    if (!/^\d{4}$/.test(pin)) {
      return toast({ title: "PIN must be 4 digits", variant: "destructive" });
    }
    setBusy(true);
    const { error } = await onSetPin(pin);
    setBusy(false);
    if (error) return toast({ title: "Could not save PIN", description: error, variant: "destructive" });
    setPin("");
    setPinOpen(false);
    toast({ title: "Card PIN saved" });
  };

  return (
    <div className="mt-4 space-y-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Daily spend</span>
          <span className="font-medium tabular-nums">
            ${card.spent_today.toLocaleString()} / ${card.daily_limit.toLocaleString()}
          </span>
        </div>
        <Progress value={pct} className="h-2" />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Per-transaction limit ${card.per_tx_limit.toLocaleString()} · lifetime spend $
          {card.spent_total.toLocaleString()}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onOpenSpend} disabled={frozen}>
          <ShoppingBag className="mr-2 h-4 w-4" /> Make a purchase
        </Button>
        <Button size="sm" variant="outline" onClick={toggleFreeze} disabled={busy}>
          {frozen ? <Play className="mr-2 h-4 w-4" /> : <Snowflake className="mr-2 h-4 w-4" />}
          {frozen ? "Unfreeze" : "Freeze"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setPinOpen(true)}>
          <KeyRound className="mr-2 h-4 w-4" /> {card.has_pin ? "Change PIN" : "Set PIN"}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Terminate
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Terminate this card?</AlertDialogTitle>
              <AlertDialogDescription>
                The card number stops working immediately. You can request a new card afterwards while
                your plan stays active.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep card</AlertDialogCancel>
              <AlertDialogAction onClick={terminate}>Terminate</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{card.has_pin ? "Change card PIN" : "Set card PIN"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="card-pin">4-digit PIN</Label>
            <Input
              id="card-pin"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
            />
            <Button className="w-full" onClick={savePin} disabled={busy}>
              Save PIN
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
