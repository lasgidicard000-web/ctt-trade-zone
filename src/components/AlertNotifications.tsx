import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface AlertNotification {
  id: string;
  coin_symbol: string;
  target_price: number;
  actual_price: number;
  condition: string;
  is_read: boolean;
  created_at: string;
}

interface AlertNotificationsProps {
  user: User;
}

const AlertNotifications = ({ user }: AlertNotificationsProps) => {
  const { toast } = useToast();
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel("alert-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alert_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as AlertNotification;
          
          // Avoid duplicate toasts
          if (notification.id !== lastNotificationId) {
            setLastNotificationId(notification.id);
            
            toast({
              title: "🔔 Price Alert Triggered!",
              description: `${notification.coin_symbol} is now ${notification.condition} your target price of $${Number(notification.target_price).toFixed(2)}. Current price: $${Number(notification.actual_price).toFixed(2)}`,
              duration: 10000,
            });

            // Mark as read
            supabase
              .from("alert_notifications" as any)
              .update({ is_read: true })
              .eq("id", notification.id)
              .then();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, toast, lastNotificationId]);

  return null;
};

export default AlertNotifications;
