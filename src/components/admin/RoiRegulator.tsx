import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, Sliders } from "lucide-react";

type PlanTemplate = {
  id: string;
  name: string;
  daily_roi: number;
  is_active: boolean;
};

type Mode = "delta" | "multiply" | "set";

interface Props {
  templates: PlanTemplate[];
  onApplied?: () => void;
}

const MAX_ROI = 1; // 100% / day hard cap

export function RoiRegulator({ templates, onApplied }: Props) {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("delta");
  const [value, setValue] = useState<string>("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [propagate, setPropagate] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const scoped = useMemo(
    () => templates.filter((t) => (activeOnly ? t.is_active : true)),
    [templates, activeOnly]
  );

  const numericValue = parseFloat(value);
  const hasValue = Number.isFinite(numericValue);

  const computeNew = (current: number): number => {
    if (!hasValue) return current;
    let next = current;
    if (mode === "delta") next = current + numericValue / 100;
    else if (mode === "multiply") next = current * numericValue;
    else next = numericValue / 100;
    return next;
  };

  const preview = useMemo(
    () =>
      scoped.map((t) => {
        const next = computeNew(Number(t.daily_roi));
        return { ...t, next, invalid: next < 0 || next > MAX_ROI };
      }),
    [scoped, mode, value]
  );

  const anyInvalid = preview.some((p) => p.invalid);
  const anyChanged = preview.some((p) => Math.abs(p.next - p.daily_roi) > 1e-9);

  const applyPreset = (deltaPct: number) => {
    setMode("delta");
    setValue(String(deltaPct));
  };

  const openConfirm = () => {
    if (!hasValue) return toast({ title: "Enter a value", variant: "destructive" });
    if (mode === "multiply" && numericValue <= 0)
      return toast({ title: "Multiplier must be > 0", variant: "destructive" });
    if (mode === "set" && numericValue < 0)
      return toast({ title: "ROI cannot be negative", variant: "destructive" });
    if (anyInvalid)
      return toast({
        title: "Some plans would exceed 0–100% range",
        variant: "destructive",
      });
    if (!anyChanged)
      return toast({ title: "No changes to apply", variant: "destructive" });
    setConfirmOpen(true);
  };

  const apply = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-regulate-roi",
        {
          body: {
            mode,
            value: numericValue,
            activeOnly,
            propagateToActive: propagate,
          },
        }
      );
      if (error) throw error;
      const plansUpdated = (data as any)?.plansUpdated ?? 0;
      const investmentsUpdated = (data as any)?.investmentsUpdated ?? 0;

      toast({
        title: "ROI updated",
        description: `${plansUpdated} plan${plansUpdated === 1 ? "" : "s"}${
          propagate
            ? ` · ${investmentsUpdated} active investment${investmentsUpdated === 1 ? "" : "s"}`
            : ""
        }`,
      });
      setConfirmOpen(false);
      setValue("");
      onApplied?.();
    } catch (e: any) {

      toast({
        title: "Update failed",
        description: e.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" />
            Regulate Daily ROI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground self-center mr-1">
              Quick adjust:
            </span>
            {[-0.5, -0.1, 0.1, 0.5, 1].map((v) => (
              <Button
                key={v}
                size="sm"
                variant="outline"
                onClick={() => applyPreset(v)}
              >
                {v > 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {v > 0 ? "+" : ""}
                {v}%
              </Button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-[180px_1fr_auto]">
            <div>
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delta">Add / subtract (pp)</SelectItem>
                  <SelectItem value="multiply">Multiply by factor</SelectItem>
                  <SelectItem value="set">Set all to (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                {mode === "delta"
                  ? "Percentage-point change (e.g. 0.25 or -0.5)"
                  : mode === "multiply"
                  ? "Factor (e.g. 1.1 = +10%, 0.9 = -10%)"
                  : "New daily ROI (%)"}
              </Label>
              <Input
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={
                  mode === "delta" ? "0.25" : mode === "multiply" ? "1.10" : "1.5"
                }
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={openConfirm}
                disabled={!hasValue || anyInvalid || !anyChanged}
              >
                Apply to {scoped.length} plan{scoped.length === 1 ? "" : "s"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={activeOnly}
                onCheckedChange={(v) => setActiveOnly(!!v)}
              />
              Only active plans
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={propagate}
                onCheckedChange={(v) => setPropagate(!!v)}
              />
              Also update currently active user investments
            </label>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Current ROI</TableHead>
                  <TableHead>New ROI</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No plans in scope
                    </TableCell>
                  </TableRow>
                ) : (
                  preview.map((p) => {
                    const diff = p.next - p.daily_roi;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{(p.daily_roi * 100).toFixed(3)}%</TableCell>
                        <TableCell
                          className={
                            p.invalid ? "text-destructive font-semibold" : ""
                          }
                        >
                          {(p.next * 100).toFixed(3)}%
                          {p.invalid && " (out of range)"}
                        </TableCell>
                        <TableCell
                          className={
                            diff > 0
                              ? "text-emerald-500"
                              : diff < 0
                              ? "text-red-500"
                              : "text-muted-foreground"
                          }
                        >
                          {diff === 0
                            ? "—"
                            : `${diff > 0 ? "+" : ""}${(diff * 100).toFixed(3)} pp`}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm ROI update</DialogTitle>
            <DialogDescription>
              This will update {preview.filter((p) => Math.abs(p.next - p.daily_roi) > 1e-9).length}{" "}
              plan template{preview.length === 1 ? "" : "s"}
              {propagate
                ? " and also update the daily ROI on all currently active user investments tied to those plans."
                : ". Existing user investments will keep their original ROI."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={apply} disabled={saving}>
              {saving ? "Applying…" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
