import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";

export const CardPinPolicy = ({ onChanged }: { onChanged?: () => void }) => {
  const [mode, setMode] = useState<"per_card" | "global">("per_card");
  const [hasGlobalPin, setHasGlobalPin] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.rpc("admin_get_card_pin_policy");
    if (error) return;
    const p = data as any;
    setMode((p?.mode ?? "per_card") as "per_card" | "global");
    setHasGlobalPin(Boolean(p?.has_global_pin));
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (nextMode: "per_card" | "global", newPin?: string) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_set_card_pin_policy", {
      _mode: nextMode,
      _global_pin: newPin && newPin.length === 4 ? newPin : null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setPin("");
    toast.success("Card PIN policy updated");
    await load();
    onChanged?.();
  };

  return (
    <div className="mb-4 rounded-lg border border-border bg-card/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="h-4 w-4 text-primary" /> Card unlock PIN policy
          </p>
          <p className="text-xs text-muted-foreground">
            {mode === "global"
              ? "All cards unlock with a single global PIN."
              : "Each cardholder uses their own PIN."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline">
            {mode === "global" ? "Global PIN" : "Per-card PINs"}
          </Badge>
          <div className="flex items-center gap-2">
            <Label htmlFor="global-pin-mode" className="text-xs">
              Use global PIN
            </Label>
            <Switch
              id="global-pin-mode"
              checked={mode === "global"}
              disabled={busy}
              onCheckedChange={(v) => {
                if (v && !hasGlobalPin && pin.length !== 4) {
                  toast.error("Set a 4-digit global PIN first");
                  return;
                }
                save(v ? "global" : "per_card", pin);
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="global-pin" className="text-xs">
            {hasGlobalPin ? "Replace global PIN" : "Set global PIN"}
          </Label>
          <Input
            id="global-pin"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="w-28 text-center font-mono tracking-[0.4em]"
          />
        </div>
        <Button size="sm" disabled={busy || pin.length !== 4} onClick={() => save(mode, pin)}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save PIN
        </Button>
        {hasGlobalPin && (
          <span className="pb-2 text-xs text-muted-foreground">A global PIN is set.</span>
        )}
      </div>
    </div>
  );
};
