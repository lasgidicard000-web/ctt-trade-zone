import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarIcon,
  Layers,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import { RoiRegulator } from "@/components/admin/RoiRegulator";

type PlanTemplate = {
  id: string;
  name: string;
  coin: string;
  principal_min: number;
  principal_max: number;
  daily_roi: number;
  roi_min: number;
  roi_max: number;
  duration_days: number;
  is_active: boolean;
  sort_order: number;
  description: string | null;
};

type UserInvestment = {
  id: string;
  user_id: string;
  template_id: string | null;
  plan_id: string;
  plan_name: string;
  amount: number;
  daily_roi: number;
  duration_days: number;
  status: string;
  started_at: string;
  ends_at: string;
  created_at: string;
};

type ProfileLite = { user_id: string; display_name: string | null };

const COINS = ["BTC", "ETH", "USDT", "USDC", "BNB", "SOL"];

const emptyTemplate = {
  name: "",
  coin: "USDT",
  principal_min: "",
  principal_max: "",
  daily_roi_pct: "", // percent, e.g. 1.5
  roi_min_pct: "",
  roi_max_pct: "",
  duration_days: "30",
  is_active: true,
  sort_order: "0",
  description: "",
};

export default function AdminPlans() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [investments, setInvestments] = useState<UserInvestment[]>([]);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);

  // Template dialog
  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<PlanTemplate | null>(null);
  const [tplForm, setTplForm] = useState({ ...emptyTemplate });
  const [tplSaving, setTplSaving] = useState(false);

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    user_id: "",
    template_id: "",
    amount: "",
    start_date: new Date(),
  });
  const [userSearch, setUserSearch] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);

  // Daily ROI history dialog
  const [roiOpen, setRoiOpen] = useState(false);
  const [roiInvestment, setRoiInvestment] = useState<UserInvestment | null>(null);
  const [roiRows, setRoiRows] = useState<{ id: string; roi_date: string; roi: number }[]>([]);
  const [roiLoading, setRoiLoading] = useState(false);

  const openRoiHistory = async (inv: UserInvestment) => {
    setRoiInvestment(inv);
    setRoiOpen(true);
    setRoiLoading(true);
    const { data, error } = await supabase
      .from("investment_daily_roi")
      .select("id, roi_date, roi")
      .eq("investment_id", inv.id)
      .order("roi_date", { ascending: false });
    if (error) {
      toast({ title: "Failed to load ROI history", description: error.message, variant: "destructive" });
    }
    setRoiRows((data ?? []) as any);
    setRoiLoading(false);
  };

  const saveRoiDay = async (rowId: string, pct: string) => {
    const value = Number(pct) / 100;
    if (!isFinite(value) || value < 0 || value > 1) {
      toast({ title: "Invalid ROI", description: "Enter 0–100%", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("investment_daily_roi")
      .update({ roi: value })
      .eq("id", rowId);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setRoiRows((rows) => rows.map((r) => (r.id === rowId ? { ...r, roi: value } : r)));
    toast({ title: "Daily ROI updated" });
  };

  const rollRoiNow = async () => {
    const { error } = await supabase.rpc("roll_investment_daily_roi" as any);
    if (error) {
      toast({ title: "Roll failed", description: error.message, variant: "destructive" });
      return;
    }
    if (roiInvestment) await openRoiHistory(roiInvestment);
    toast({ title: "Daily ROI rolled" });
  };

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session?.user) {
        navigate("/auth");
        return;
      }
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", sess.session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleRow) {
        toast({ title: "Access denied", description: "Admin only", variant: "destructive" });
        navigate("/wallet");
        return;
      }
      setIsAdmin(true);
      await refresh();
      setLoading(false);
    })();
  }, [navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    const ch = supabase
      .channel("admin-plans")
      .on("postgres_changes", { event: "*", schema: "public", table: "plan_templates" }, () =>
        loadTemplates()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "user_investments" }, () =>
        loadInvestments()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [isAdmin]);

  const refresh = async () => {
    await Promise.all([loadTemplates(), loadInvestments(), loadProfiles()]);
  };

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from("plan_templates")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      toast({ title: "Failed to load plans", description: error.message, variant: "destructive" });
      return;
    }
    setTemplates((data ?? []) as PlanTemplate[]);
  };

  const loadInvestments = async () => {
    const { data, error } = await supabase
      .from("user_investments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load assignments", description: error.message, variant: "destructive" });
      return;
    }
    setInvestments((data ?? []) as UserInvestment[]);
  };

  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("user_id, display_name");
    setProfiles((data ?? []) as ProfileLite[]);
  };

  const nameFor = (userId: string) =>
    profiles.find((p) => p.user_id === userId)?.display_name || userId.slice(0, 8) + "…";

  // ---------- Template CRUD ----------
  const openNewTpl = () => {
    setEditingTpl(null);
    setTplForm({ ...emptyTemplate });
    setTplDialogOpen(true);
  };

  const openEditTpl = (t: PlanTemplate) => {
    setEditingTpl(t);
    setTplForm({
      name: t.name,
      coin: t.coin,
      principal_min: String(t.principal_min),
      principal_max: String(t.principal_max),
      daily_roi_pct: String(t.daily_roi * 100),
      roi_min_pct: String(Number(t.roi_min ?? t.daily_roi * 0.6) * 100),
      roi_max_pct: String(Number(t.roi_max ?? t.daily_roi * 1.4) * 100),
      duration_days: String(t.duration_days),
      is_active: t.is_active,
      sort_order: String(t.sort_order),
      description: t.description ?? "",
    });
    setTplDialogOpen(true);
  };

  const saveTpl = async () => {
    const min = parseFloat(tplForm.principal_min);
    const max = parseFloat(tplForm.principal_max);
    const roiPct = parseFloat(tplForm.daily_roi_pct);
    const dur = parseInt(tplForm.duration_days);
    const sort = parseInt(tplForm.sort_order || "0");
    if (!tplForm.name.trim()) return toast({ title: "Name required", variant: "destructive" });
    if (!Number.isFinite(min) || min < 0) return toast({ title: "Invalid min principal", variant: "destructive" });
    if (!Number.isFinite(max) || max < min)
      return toast({ title: "Max must be ≥ min", variant: "destructive" });
    if (!Number.isFinite(roiPct) || roiPct < 0)
      return toast({ title: "Invalid daily ROI", variant: "destructive" });
    if (!Number.isFinite(dur) || dur <= 0)
      return toast({ title: "Invalid duration", variant: "destructive" });

    const roiMinPct = Number.isFinite(parseFloat(tplForm.roi_min_pct))
      ? parseFloat(tplForm.roi_min_pct)
      : roiPct * 0.6;
    const roiMaxPct = Number.isFinite(parseFloat(tplForm.roi_max_pct))
      ? parseFloat(tplForm.roi_max_pct)
      : roiPct * 1.4;
    if (roiMinPct < 0 || roiMaxPct < roiMinPct)
      return toast({ title: "Max ROI must be ≥ min ROI", variant: "destructive" });

    setTplSaving(true);
    const payload = {
      name: tplForm.name.trim(),
      coin: tplForm.coin,
      principal_min: min,
      principal_max: max,
      daily_roi: roiPct / 100,
      roi_min: roiMinPct / 100,
      roi_max: roiMaxPct / 100,
      duration_days: dur,
      is_active: tplForm.is_active,
      sort_order: sort,
      description: tplForm.description.trim() || null,
    };
    const { error } = editingTpl
      ? await supabase.from("plan_templates").update(payload).eq("id", editingTpl.id)
      : await supabase.from("plan_templates").insert(payload);
    setTplSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editingTpl ? "Plan updated" : "Plan created" });
    setTplDialogOpen(false);
    loadTemplates();
  };

  const toggleActive = async (t: PlanTemplate) => {
    const { error } = await supabase
      .from("plan_templates")
      .update({ is_active: !t.is_active })
      .eq("id", t.id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
  };

  const deleteTpl = async (t: PlanTemplate) => {
    const inUse = investments.some((i) => i.template_id === t.id);
    if (inUse) {
      toast({
        title: "Cannot delete",
        description: "Plan is assigned to users. Deactivate it instead.",
        variant: "destructive",
      });
      return;
    }
    if (!confirm(`Delete plan "${t.name}"?`)) return;
    const { error } = await supabase.from("plan_templates").delete().eq("id", t.id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else toast({ title: "Plan deleted" });
  };

  // ---------- Assignment ----------
  const activeTemplates = useMemo(() => templates.filter((t) => t.is_active), [templates]);
  const selectedTemplate = activeTemplates.find((t) => t.id === assignForm.template_id);

  const filteredProfiles = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return profiles.slice(0, 20);
    return profiles
      .filter(
        (p) =>
          p.display_name?.toLowerCase().includes(q) ||
          p.user_id.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [userSearch, profiles]);

  const openAssign = () => {
    setAssignForm({
      user_id: "",
      template_id: "",
      amount: "",
      start_date: new Date(),
    });
    setUserSearch("");
    setAssignOpen(true);
  };

  const submitAssign = async () => {
    if (!assignForm.user_id) return toast({ title: "Select a user", variant: "destructive" });
    if (!selectedTemplate) return toast({ title: "Select a plan", variant: "destructive" });
    const amt = parseFloat(assignForm.amount);
    if (!Number.isFinite(amt) || amt <= 0)
      return toast({ title: "Invalid amount", variant: "destructive" });
    if (amt < selectedTemplate.principal_min || amt > selectedTemplate.principal_max)
      return toast({
        title: "Amount out of range",
        description: `Must be between $${selectedTemplate.principal_min} and $${selectedTemplate.principal_max}`,
        variant: "destructive",
      });

    setAssignSaving(true);
    const started = assignForm.start_date;
    const ends = new Date(started.getTime() + selectedTemplate.duration_days * 86400000);
    const { error } = await supabase.from("user_investments").insert({
      user_id: assignForm.user_id,
      template_id: selectedTemplate.id,
      plan_id: selectedTemplate.name.toLowerCase().replace(/\s+/g, "-"),
      plan_name: selectedTemplate.name,
      amount: amt,
      daily_roi: selectedTemplate.daily_roi,
      duration_days: selectedTemplate.duration_days,
      status: "active",
      started_at: started.toISOString(),
      ends_at: ends.toISOString(),
    });
    setAssignSaving(false);
    if (error) {
      toast({ title: "Assignment failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Plan assigned" });
    setAssignOpen(false);
    loadInvestments();
  };

  const updateInvestmentStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("user_investments").update({ status }).eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
  };

  const deleteInvestment = async (id: string) => {
    if (!confirm("Delete this assignment?")) return;
    const { error } = await supabase.from("user_investments").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else toast({ title: "Assignment deleted" });
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-7xl py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Admin
            </Button>
            <div className="flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Plans & Assignments</h1>
            </div>
          </div>
        </div>

        <Tabs defaultValue="templates">
          <TabsList>
            <TabsTrigger value="templates">Plan Templates</TabsTrigger>
            <TabsTrigger value="assignments">User Assignments</TabsTrigger>
          </TabsList>

          {/* Templates */}
          <TabsContent value="templates" className="space-y-4">
            <RoiRegulator templates={templates} onApplied={loadTemplates} />
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Plan Templates</CardTitle>
                <Button onClick={openNewTpl}>
                  <Plus className="mr-1 h-4 w-4" /> New plan
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Coin</TableHead>
                      <TableHead>Principal range</TableHead>
                      <TableHead>Daily ROI</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No plans yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      templates.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{t.coin}</Badge>
                          </TableCell>
                          <TableCell>
                            ${t.principal_min.toLocaleString()} – ${t.principal_max.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {(Number(t.roi_min ?? t.daily_roi * 0.6) * 100).toFixed(2)}% –{" "}
                            {(Number(t.roi_max ?? t.daily_roi * 1.4) * 100).toFixed(2)}%
                            <span className="block text-[11px] text-muted-foreground">
                              avg {(t.daily_roi * 100).toFixed(2)}%
                            </span>
                          </TableCell>
                          <TableCell>{t.duration_days}d</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={t.is_active}
                                onCheckedChange={() => toggleActive(t)}
                              />
                              <span className="text-xs text-muted-foreground">
                                {t.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => openEditTpl(t)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="ml-1 text-destructive"
                              onClick={() => deleteTpl(t)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assignments */}
          <TabsContent value="assignments" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>User Assignments</CardTitle>
                <Button onClick={openAssign}>
                  <UserPlus className="mr-1 h-4 w-4" /> Assign plan
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Principal</TableHead>
                      <TableHead>Avg daily ROI</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Ends</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          No assignments yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      investments.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium">{nameFor(i.user_id)}</TableCell>
                          <TableCell>{i.plan_name}</TableCell>
                          <TableCell>${Number(i.amount).toLocaleString()}</TableCell>
                          <TableCell>{(Number(i.daily_roi) * 100).toFixed(2)}%</TableCell>
                          <TableCell>{format(new Date(i.started_at), "MMM d, yyyy")}</TableCell>
                          <TableCell>{format(new Date(i.ends_at), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                i.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                  : i.status === "completed"
                                  ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                  : "bg-red-500/10 text-red-500 border-red-500/20"
                              }
                            >
                              {i.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="mr-1"
                              onClick={() => openRoiHistory(i)}
                            >
                              Daily ROI
                            </Button>
                            {i.status === "active" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateInvestmentStatus(i.id, "completed")}
                                >
                                  Complete
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="ml-1"
                                  onClick={() => updateInvestmentStatus(i.id, "cancelled")}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="ml-1 text-destructive"
                              onClick={() => deleteInvestment(i.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Template dialog */}
      <Dialog open={tplDialogOpen} onOpenChange={setTplDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTpl ? "Edit plan" : "New plan"}</DialogTitle>
            <DialogDescription>
              Define principal range, coin, ROI, and duration.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name</Label>
              <Input
                value={tplForm.name}
                onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })}
                placeholder="Recruit Plan"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Coin</Label>
                <Select
                  value={tplForm.coin}
                  onValueChange={(v) => setTplForm({ ...tplForm, coin: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COINS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={tplForm.sort_order}
                  onChange={(e) => setTplForm({ ...tplForm, sort_order: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min principal (USD)</Label>
                <Input
                  type="number"
                  value={tplForm.principal_min}
                  onChange={(e) => setTplForm({ ...tplForm, principal_min: e.target.value })}
                />
              </div>
              <div>
                <Label>Max principal (USD)</Label>
                <Input
                  type="number"
                  value={tplForm.principal_max}
                  onChange={(e) => setTplForm({ ...tplForm, principal_max: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Average daily ROI (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={tplForm.daily_roi_pct}
                  onChange={(e) => setTplForm({ ...tplForm, daily_roi_pct: e.target.value })}
                  placeholder="1.5"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Reference average — actual daily rates are rolled inside the band below.
                </p>
              </div>
              <div>
                <Label>Duration (days)</Label>
                <Input
                  type="number"
                  value={tplForm.duration_days}
                  onChange={(e) => setTplForm({ ...tplForm, duration_days: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min daily ROI (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={tplForm.roi_min_pct}
                  onChange={(e) => setTplForm({ ...tplForm, roi_min_pct: e.target.value })}
                  placeholder="0.9"
                />
              </div>
              <div>
                <Label>Max daily ROI (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={tplForm.roi_max_pct}
                  onChange={(e) => setTplForm({ ...tplForm, roi_max_pct: e.target.value })}
                  placeholder="2.1"
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={tplForm.description}
                onChange={(e) => setTplForm({ ...tplForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={tplForm.is_active}
                onCheckedChange={(v) => setTplForm({ ...tplForm, is_active: v })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTplDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveTpl} disabled={tplSaving}>
              {tplSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign plan to user</DialogTitle>
            <DialogDescription>
              Activates an investment for the selected user immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Search user</Label>
              <Input
                placeholder="Name or user ID…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              <div className="mt-2 max-h-40 overflow-y-auto rounded border border-border">
                {filteredProfiles.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No users</div>
                ) : (
                  filteredProfiles.map((p) => (
                    <button
                      key={p.user_id}
                      type="button"
                      onClick={() => setAssignForm({ ...assignForm, user_id: p.user_id })}
                      className={cn(
                        "block w-full text-left px-2 py-1.5 text-sm hover:bg-muted",
                        assignForm.user_id === p.user_id && "bg-primary/10"
                      )}
                    >
                      <span className="font-medium">{p.display_name || "Unnamed"}</span>{" "}
                      <span className="text-xs text-muted-foreground font-mono">
                        {p.user_id.slice(0, 8)}…
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div>
              <Label>Plan</Label>
              <Select
                value={assignForm.template_id}
                onValueChange={(v) => setAssignForm({ ...assignForm, template_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger>
                <SelectContent>
                  {activeTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} — {t.coin} · {(t.daily_roi * 100).toFixed(2)}%/d · {t.duration_days}d
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Principal ${selectedTemplate.principal_min.toLocaleString()} – $
                  {selectedTemplate.principal_max.toLocaleString()}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Principal (USD)</Label>
                <Input
                  type="number"
                  value={assignForm.amount}
                  onChange={(e) => setAssignForm({ ...assignForm, amount: e.target.value })}
                />
              </div>
              <div>
                <Label>Start date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !assignForm.start_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1 h-4 w-4" />
                      {assignForm.start_date
                        ? format(assignForm.start_date, "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={assignForm.start_date}
                      onSelect={(d) =>
                        d && setAssignForm({ ...assignForm, start_date: d })
                      }
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {selectedTemplate && assignForm.start_date && (
              <p className="text-xs text-muted-foreground">
                Ends{" "}
                {format(
                  new Date(
                    assignForm.start_date.getTime() +
                      selectedTemplate.duration_days * 86400000
                  ),
                  "PPP"
                )}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={submitAssign} disabled={assignSaving}>
              {assignSaving ? "Assigning…" : "Assign plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
