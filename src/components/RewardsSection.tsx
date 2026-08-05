import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Gift, Users, Trophy, Copy, Check } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Milestone {
  id: string;
  name: string;
  description: string;
  milestone_type: string;
  target_value: number;
  reward_amount: number;
  icon: string;
}

interface UserMilestone {
  id: string;
  milestone_id: string;
  current_progress: number;
  completed: boolean;
  reward_claimed: boolean;
  milestones: Milestone;
}

interface Referral {
  id: string;
  referee_id: string;
  reward_claimed: boolean;
}

interface RewardsSectionProps {
  user: User;
  onRewardClaimed: () => void;
}

export const RewardsSection = ({ user, onRewardClaimed }: RewardsSectionProps) => {
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [referralsCount, setReferralsCount] = useState(0);
  const [unclaimedReferrals, setUnclaimedReferrals] = useState(0);
  const [userMilestones, setUserMilestones] = useState<UserMilestone[]>([]);
  const [applyCodeDialogOpen, setApplyCodeDialogOpen] = useState(false);
  const [inputReferralCode, setInputReferralCode] = useState("");

  useEffect(() => {
    if (user) {
      setReferralCode(user.id);
      fetchReferralStats();
      fetchMilestones();
      updateMilestoneProgress();
    }
  }, [user]);

  const fetchReferralStats = async () => {
    const { data } = await supabase
      .from("referrals" as any)
      .select("id, referee_id, reward_claimed")
      .eq("referrer_id", user.id);

    if (data) {
      setReferralsCount(data.length);
      setUnclaimedReferrals(data.filter((r: any) => !r.reward_claimed).length);
    }
  };

  const fetchMilestones = async () => {
    const { data } = await supabase
      .from("user_milestones" as any)
      .select(`
        id,
        milestone_id,
        current_progress,
        completed,
        reward_claimed,
        milestones (
          id,
          name,
          description,
          milestone_type,
          target_value,
          reward_amount,
          icon
        )
      `)
      .eq("user_id", user.id);

    if (data) {
      setUserMilestones(data as any);
    }
  };

  const updateMilestoneProgress = async () => {
    await supabase.functions.invoke("process-rewards", {
      body: { action: "update-milestone-progress" },
    });
    fetchMilestones();
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard",
    });
  };

  const applyReferralCode = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("process-rewards", {
        body: { action: "apply-referral-code", referralCode: inputReferralCode },
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: `You received $${data.amount} USDT bonus!`,
      });
      setApplyCodeDialogOpen(false);
      setInputReferralCode("");
      onRewardClaimed();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to apply referral code",
        variant: "destructive",
      });
    }
  };

  const claimMilestoneReward = async (milestoneId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("process-rewards", {
        body: { action: "claim-milestone-reward", milestoneId },
      });

      if (error) throw error;

      toast({
        title: "Reward claimed!",
        description: `You received $${data.amount} USDT!`,
      });
      fetchMilestones();
      onRewardClaimed();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to claim reward",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Referral Program</h2>
        </div>
        
        <div className="space-y-4">
          <ReferralLinkCard userId={user.id} />

          <div>
            <Label>Your Referral Code</Label>
            <div className="mt-2 flex gap-2">
              <Input value={referralCode} readOnly className="font-mono" />
              <Button onClick={copyReferralCode} variant="outline" size="icon">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Share this code with friends. You get $10 USDT when they sign up!
            </p>
          </div>


          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-primary/10 p-4">
              <p className="text-2xl font-bold text-primary">{referralsCount}</p>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-4">
              <p className="text-2xl font-bold text-accent">{unclaimedReferrals}</p>
              <p className="text-sm text-muted-foreground">Pending Rewards</p>
            </div>
          </div>

          <Button onClick={() => setApplyCodeDialogOpen(true)} variant="outline" className="w-full">
            <Gift className="mr-2 h-4 w-4" />
            Have a Referral Code?
          </Button>
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Trading Milestones</h2>
        </div>

        <div className="space-y-3">
          {userMilestones.map((um) => {
            const progress = (um.current_progress / parseFloat(um.milestones.target_value.toString())) * 100;
            
            return (
              <div key={um.id} className="rounded-lg border border-border p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{um.milestones.icon}</span>
                    <div>
                      <h3 className="font-semibold">{um.milestones.name}</h3>
                      <p className="text-sm text-muted-foreground">{um.milestones.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">${um.milestones.reward_amount}</p>
                    <p className="text-xs text-muted-foreground">USDT</p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {um.current_progress} / {um.milestones.target_value}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                {um.completed && !um.reward_claimed && (
                  <Button 
                    onClick={() => claimMilestoneReward(um.milestone_id)}
                    className="mt-3 w-full"
                    size="sm"
                  >
                    Claim Reward
                  </Button>
                )}

                {um.reward_claimed && (
                  <div className="mt-3 rounded bg-accent/10 p-2 text-center text-sm text-accent">
                    ✓ Reward Claimed
                  </div>
                )}
              </div>
            );
          })}

          {userMilestones.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              Start trading to unlock milestones!
            </p>
          )}
        </div>
      </Card>

      <Dialog open={applyCodeDialogOpen} onOpenChange={setApplyCodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Referral Code</DialogTitle>
            <DialogDescription>
              Enter a friend's referral code to get a $5 USDT welcome bonus
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="referralCodeInput">Referral Code</Label>
              <Input
                id="referralCodeInput"
                placeholder="Paste referral code here"
                value={inputReferralCode}
                onChange={(e) => setInputReferralCode(e.target.value)}
              />
            </div>
            <Button onClick={applyReferralCode} className="w-full" disabled={!inputReferralCode}>
              Apply Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
