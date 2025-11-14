import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

export const useTransactionNotifications = (user: User | null) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const channels: any[] = [];

    // Subscribe to transactions updates
    const transactionsChannel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Transaction",
              description: `${payload.new.type} transaction created`,
            });
          } else if (payload.eventType === 'UPDATE') {
            toast({
              title: "Transaction Updated",
              description: `Transaction status: ${payload.new.status}`,
              variant: payload.new.status === 'completed' ? 'default' : 'destructive',
            });
          }
        }
      )
      .subscribe();

    // Subscribe to crypto_payments updates
    const cryptoChannel = supabase
      .channel('crypto-payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crypto_payments',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const status = payload.new.payment_status;
            if (status === 'finished' || status === 'confirmed') {
              toast({
                title: "Crypto Deposit Confirmed",
                description: `Your ${payload.new.pay_currency} deposit has been confirmed!`,
              });
            } else if (status === 'failed' || status === 'expired') {
              toast({
                title: "Crypto Deposit Failed",
                description: "Your crypto deposit could not be completed",
                variant: 'destructive',
              });
            }
          }
        }
      )
      .subscribe();

    // Subscribe to withdrawals updates
    const withdrawalsChannel = supabase
      .channel('withdrawals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'withdrawals',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const status = payload.new.status;
            if (status === 'completed') {
              toast({
                title: "Withdrawal Completed",
                description: `Your withdrawal of $${payload.new.amount} has been processed`,
              });
            } else if (status === 'rejected') {
              toast({
                title: "Withdrawal Rejected",
                description: payload.new.notes || "Your withdrawal request was rejected",
                variant: 'destructive',
              });
            }
          }
        }
      )
      .subscribe();

    channels.push(transactionsChannel, cryptoChannel, withdrawalsChannel);

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user, toast]);
};
