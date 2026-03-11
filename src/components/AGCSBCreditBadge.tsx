import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, CheckCircle, ArrowRight } from "lucide-react";

interface AGCSBCreditBadgeProps {
  userId: string;
}

export const AGCSBCreditBadge = ({ userId }: AGCSBCreditBadgeProps) => {
  const navigate = useNavigate();
  const [hasCreditTransaction, setHasCreditTransaction] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCredit = async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id, amount, notes")
        .eq("user_id", userId)
        .eq("type", "deposit")
        .eq("status", "completed")
        .ilike("notes", "%AGCSB%")
        .limit(1);

      setHasCreditTransaction(!!data && data.length > 0);
      setLoading(false);
    };

    checkCredit();
  }, [userId]);

  if (loading || !hasCreditTransaction) return null;

  return (
    <Card className="mb-6 overflow-hidden border-accent/40 bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5">
      <div className="flex items-center gap-4 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/20">
          <ShieldCheck className="h-6 w-6 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">AGCSB Credit Applied</h3>
            <Badge className="bg-accent/20 text-accent hover:bg-accent/30 text-[10px]">VERIFIED</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="font-semibold text-foreground">$1,000 USD</span> ($2,000 AUD) credited
            <span className="inline-flex items-center gap-1 mx-1">
              <span>SafePal</span>
              <ArrowRight className="h-3 w-3" />
              <span>CTTradezone Wallet</span>
            </span>
          </p>
        </div>
        <CheckCircle className="h-5 w-5 text-accent shrink-0" />
      </div>
    </Card>
  );
};
