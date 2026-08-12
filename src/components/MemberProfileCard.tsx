import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Camera, Download, Loader2, ShieldCheck } from "lucide-react";
import { planBadgeAlt, planBadgeUrl } from "@/lib/planBadges";
import { useEntitlements } from "@/hooks/useEntitlements";
import { toast } from "sonner";

const planBadgeStyle = (planId: string) => {
  switch (planId) {
    case "recruit":
      return "bg-amber-700/20 text-amber-500 border-amber-700/30";
    case "inspectors":
      return "bg-slate-400/20 text-slate-300 border-slate-400/30";
    case "superintendent":
      return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
    case "commissioners":
      return "bg-cyan-400/20 text-cyan-300 border-cyan-400/30";
    case "general":
      return "bg-purple-400/20 text-purple-300 border-purple-400/30";
    default:
      return "bg-primary/20 text-primary border-primary/30";
  }
};

const initialsOf = (name: string, email: string) => {
  const src = name.trim() || email.split("@")[0] || "";
  const parts = src.split(/[\s._-]+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "U";
};

interface PlanRow {
  id: string;
  plan_id: string;
  plan_name: string;
}

export const MemberProfileCard = ({ userId }: { userId: string }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { entitlements } = useEntitlements(userId);

  const resolvePhoto = async (raw: string | null) => {
    if (!raw) return null;
    if (raw.startsWith("http") || raw.startsWith("/")) return raw;
    const { data } = await supabase.storage.from("avatars").createSignedUrl(raw, 3600);
    return data?.signedUrl ?? null;
  };

  const load = async () => {
    const [{ data: profile }, { data: auth }, { data: inv }] = await Promise.all([
      supabase.from("profiles").select("display_name, avatar_url").eq("user_id", userId).maybeSingle(),
      supabase.auth.getUser(),
      supabase
        .from("user_investments")
        .select("id, plan_id, plan_name")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("started_at", { ascending: true }),
    ]);
    setName(profile?.display_name ?? "");
    setEmail(auth?.user?.email ?? "");
    setPhoto(await resolvePhoto((profile as { avatar_url?: string | null })?.avatar_url ?? null));
    setPlans((inv ?? []) as PlanRow[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/portrait-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path } as never)
        .eq("user_id", userId);
      if (dbErr) throw dbErr;
      setPhoto(await resolvePhoto(path));
      toast.success("Profile photo updated");
    } catch (err) {
      console.error("Avatar upload failed:", err);
      toast.error("Could not update photo");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDownload = async () => {
    if (!photo) return;
    try {
      const res = await fetch(photo);
      if (!res.ok) throw new Error("Could not fetch image");
      const blob = await res.blob();
      const ext = (photo.split(".").pop()?.split("?")[0] || "jpg").toLowerCase();
      const safeExt = ["png", "jpg", "jpeg", "webp", "gif"].includes(ext) ? ext : "jpg";
      const filename = `ctt-member-portrait-${(name || "user").replace(/\s+/g, "-").toLowerCase()}.${safeExt}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download portrait failed:", err);
      toast.error("Could not download photo");
    }
  };

  return (
    <Card className="relative mb-6 overflow-hidden border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative shrink-0">
          <div className="rounded-2xl bg-gradient-to-br from-primary/60 to-primary/10 p-[2px] shadow-[var(--glow-primary)]">
            <div className="h-32 w-32 overflow-hidden rounded-2xl bg-muted sm:h-36 sm:w-36">
              {photo ? (
                <img
                  src={photo}
                  alt={`${name || "Member"} portrait in CTT Trade Zone shirt with active plan badges`}
                  className="h-full w-full object-cover object-top"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-muted-foreground">
                  {initialsOf(name, email)}
                </div>
              )}
            </div>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              {uploading ? "Uploading" : "Change photo"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={handleDownload}
              disabled={!photo || uploading}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
        </div>

        <div className="mt-3 min-w-0 flex-1 text-center sm:mt-0 sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h3 className="truncate text-lg font-bold">{name || email || "Member"}</h3>
            <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/15 text-emerald-500">
              <BadgeCheck className="h-3.5 w-3.5" />
              Verified member
            </Badge>
          </div>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-start">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            {entitlements.plan_name}
            {entitlements.tier_rank > 0 ? ` · Tier ${entitlements.tier_rank}` : ""}
          </p>

          <p className="mt-4 text-[11px] uppercase tracking-wide text-muted-foreground">
            Active plan badges ({plans.length})
          </p>
          {plans.length === 0 ? (
            <p className="mt-1.5 text-sm text-muted-foreground">
              No active plans yet — activate a plan to earn your first badge.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              {plans.map((p) => (
                <Badge
                  key={p.id}
                  variant="outline"
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs font-semibold ${planBadgeStyle(p.plan_id)}`}
                >
                  {planBadgeUrl(p.plan_id) && (
                    <img
                      src={planBadgeUrl(p.plan_id) as string}
                      alt={planBadgeAlt(p.plan_name)}
                      loading="lazy"
                      className="h-5 w-5 object-contain"
                    />
                  )}
                  {p.plan_name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
