import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface PriceAlert {
  id: string;
  coin_symbol: string;
  target_price: number;
  condition: "above" | "below";
  is_active: boolean;
  created_at: string;
}

interface CoinPrice {
  symbol: string;
  name: string;
  price: number;
}

interface PriceAlertsProps {
  user: User;
  coins: CoinPrice[];
}

const PriceAlerts = ({ user, coins }: PriceAlertsProps) => {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [newAlert, setNewAlert] = useState({
    coin_symbol: "",
    target_price: "",
    condition: "above" as "above" | "below",
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, [user]);

  const loadAlerts = async () => {
    const { data, error } = await supabase
      .from("price_alerts" as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading alerts:", error);
      return;
    }

    setAlerts((data as unknown as PriceAlert[]) || []);
  };

  const createAlert = async () => {
    if (!newAlert.coin_symbol || !newAlert.target_price) {
      toast({
        title: "Missing information",
        description: "Please select a coin and enter a target price",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    const { error } = await supabase
      .from("price_alerts" as any)
      .insert({
        user_id: user.id,
        coin_symbol: newAlert.coin_symbol,
        target_price: parseFloat(newAlert.target_price),
        condition: newAlert.condition,
      });

    setIsCreating(false);

    if (error) {
      console.error("Error creating alert:", error);
      toast({
        title: "Error",
        description: "Failed to create price alert",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Alert created",
      description: `You'll be notified when ${newAlert.coin_symbol} goes ${newAlert.condition} $${newAlert.target_price}`,
    });

    setNewAlert({ coin_symbol: "", target_price: "", condition: "above" });
    loadAlerts();
  };

  const deleteAlert = async (id: string) => {
    const { error } = await supabase
      .from("price_alerts" as any)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting alert:", error);
      toast({
        title: "Error",
        description: "Failed to delete alert",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Alert deleted",
      description: "Price alert has been removed",
    });

    loadAlerts();
  };

  const getCoinName = (symbol: string) => {
    return coins.find((c) => c.symbol === symbol)?.name || symbol;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Price Alerts
        </CardTitle>
        <CardDescription>
          Get notified when cryptocurrencies reach your target prices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Select
            value={newAlert.coin_symbol}
            onValueChange={(value) =>
              setNewAlert({ ...newAlert, coin_symbol: value })
            }
          >
            <SelectTrigger className="bg-background border-input">
              <SelectValue placeholder="Select coin" />
            </SelectTrigger>
            <SelectContent>
              {coins.map((coin) => (
                <SelectItem key={coin.symbol} value={coin.symbol}>
                  {coin.name} ({coin.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={newAlert.condition}
            onValueChange={(value) =>
              setNewAlert({ ...newAlert, condition: value as "above" | "below" })
            }
          >
            <SelectTrigger className="bg-background border-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="above">Above</SelectItem>
              <SelectItem value="below">Below</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="number"
            placeholder="Target price"
            value={newAlert.target_price}
            onChange={(e) =>
              setNewAlert({ ...newAlert, target_price: e.target.value })
            }
            className="bg-background border-input"
          />

          <Button
            onClick={createAlert}
            disabled={isCreating}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Alert
          </Button>
        </div>

        <div className="space-y-2">
          {alerts.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No active price alerts. Create one above to get started.
            </p>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {getCoinName(alert.coin_symbol)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Alert when price goes{" "}
                    <span className="font-medium">{alert.condition}</span> $
                    {Number(alert.target_price).toFixed(2)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteAlert(alert.id)}
                  className="text-destructive hover:text-destructive/90"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceAlerts;
