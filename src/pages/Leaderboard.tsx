import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, Users, ArrowLeft, Crown, Medal, Award } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { User } from "@supabase/supabase-js";

interface LeaderboardEntry {
  display_name: string;
  value: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [portfolioLeaders, setPortfolioLeaders] = useState<LeaderboardEntry[]>([]);
  const [volumeLeaders, setVolumeLeaders] = useState<LeaderboardEntry[]>([]);
  const [referralLeaders, setReferralLeaders] = useState<LeaderboardEntry[]>([]);
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchLeaderboards();
  }, [timeframe]);

  const fetchLeaderboards = async () => {
    // Fetch portfolio leaders
    const { data: portfolioData } = await supabase.functions.invoke('get-leaderboard', {
      body: { category: 'portfolio', timeframe },
    });
    if (portfolioData?.leaderboard) {
      setPortfolioLeaders(portfolioData.leaderboard);
    }

    // Fetch volume leaders
    const { data: volumeData } = await supabase.functions.invoke('get-leaderboard', {
      body: { category: 'volume', timeframe },
    });
    if (volumeData?.leaderboard) {
      setVolumeLeaders(volumeData.leaderboard);
    }

    // Fetch referral leaders
    const { data: referralData } = await supabase.functions.invoke('get-leaderboard', {
      body: { category: 'referrals', timeframe },
    });
    if (referralData?.leaderboard) {
      setReferralLeaders(referralData.leaderboard);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-muted-foreground font-semibold">#{rank}</span>;
    }
  };

  const renderLeaderboardCard = (entries: LeaderboardEntry[], valueLabel: string, icon: React.ReactNode) => (
    <Card className="border-border bg-card p-6">
      <div className="mb-6 flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-semibold">{valueLabel}</h3>
      </div>
      
      <div className="space-y-3">
        {entries.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No data available</p>
        ) : (
          entries.map((entry, index) => (
            <div
              key={entry.user_id}
              className={`flex items-center justify-between rounded-lg p-4 transition-colors ${
                entry.user_id === user?.id
                  ? 'bg-primary/10 border-2 border-primary'
                  : 'bg-muted/50 hover:bg-muted'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center">
                  {getRankIcon(index + 1)}
                </div>
                <div>
                  <p className="font-semibold">
                    {entry.display_name}
                    {entry.user_id === user?.id && (
                      <span className="ml-2 text-xs text-primary">(You)</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">
                  {valueLabel.includes('Portfolio') || valueLabel.includes('Volume')
                    ? `$${entry.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : entry.value.toLocaleString()}
                </p>
                {valueLabel.includes('Referrals') && (
                  <p className="text-xs text-muted-foreground">referrals</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-6xl py-12">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex rounded-full bg-primary/10 p-4">
            <Trophy className="h-12 w-12 text-primary" />
          </div>
          <h1 className="mb-2 text-4xl font-bold">Leaderboard</h1>
          <p className="text-muted-foreground">Compete with top traders and climb the ranks</p>
          
          <div className="mt-6 flex gap-2 justify-center flex-wrap">
            <ThemeToggle />
            <Button onClick={() => navigate("/wallet")} variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Wallet
            </Button>
          </div>
        </div>

        <div className="mb-6 flex justify-center">
          <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as 'weekly' | 'monthly')} className="w-full max-w-md">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="weekly">This Week</TabsTrigger>
              <TabsTrigger value="monthly">This Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Tabs defaultValue="portfolio" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="portfolio">
              <Trophy className="mr-2 h-4 w-4" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="volume">
              <TrendingUp className="mr-2 h-4 w-4" />
              Volume
            </TabsTrigger>
            <TabsTrigger value="referrals">
              <Users className="mr-2 h-4 w-4" />
              Referrals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="space-y-4">
            {renderLeaderboardCard(
              portfolioLeaders,
              'Top Portfolio Value',
              <Trophy className="h-5 w-5 text-primary" />
            )}
          </TabsContent>

          <TabsContent value="volume" className="space-y-4">
            {renderLeaderboardCard(
              volumeLeaders,
              `Trading Volume (${timeframe === 'weekly' ? 'This Week' : 'This Month'})`,
              <TrendingUp className="h-5 w-5 text-primary" />
            )}
          </TabsContent>

          <TabsContent value="referrals" className="space-y-4">
            {renderLeaderboardCard(
              referralLeaders,
              `Referrals (${timeframe === 'weekly' ? 'This Week' : 'This Month'})`,
              <Users className="h-5 w-5 text-primary" />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Leaderboard;
