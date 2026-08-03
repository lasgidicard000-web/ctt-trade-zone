export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_transaction_log: {
        Row: {
          action: string
          admin_user_id: string
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          reason: string | null
          target_id: string | null
          target_table: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          target_id?: string | null
          target_table: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          target_id?: string | null
          target_table?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      alert_notifications: {
        Row: {
          actual_price: number
          alert_id: string
          coin_symbol: string
          condition: string
          created_at: string
          id: string
          is_read: boolean
          target_price: number
          user_id: string
        }
        Insert: {
          actual_price: number
          alert_id: string
          coin_symbol: string
          condition: string
          created_at?: string
          id?: string
          is_read?: boolean
          target_price: number
          user_id: string
        }
        Update: {
          actual_price?: number
          alert_id?: string
          coin_symbol?: string
          condition?: string
          created_at?: string
          id?: string
          is_read?: boolean
          target_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_notifications_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "price_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      card_transactions: {
        Row: {
          amount_btc: number
          amount_usd: number
          btc_rate: number
          card_id: string
          created_at: string
          decline_reason: string | null
          id: string
          merchant: string
          status: string
          user_id: string
        }
        Insert: {
          amount_btc?: number
          amount_usd: number
          btc_rate?: number
          card_id: string
          created_at?: string
          decline_reason?: string | null
          id?: string
          merchant: string
          status?: string
          user_id: string
        }
        Update: {
          amount_btc?: number
          amount_usd?: number
          btc_rate?: number
          card_id?: string
          created_at?: string
          decline_reason?: string | null
          id?: string
          merchant?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "virtual_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_price_history: {
        Row: {
          close: number
          coin_symbol: string
          created_at: string
          high: number
          id: string
          low: number
          open: number
          price: number
          timestamp: string
          volume: number
        }
        Insert: {
          close: number
          coin_symbol: string
          created_at?: string
          high: number
          id?: string
          low: number
          open: number
          price: number
          timestamp?: string
          volume?: number
        }
        Update: {
          close?: number
          coin_symbol?: string
          created_at?: string
          high?: number
          id?: string
          low?: number
          open?: number
          price?: number
          timestamp?: string
          volume?: number
        }
        Relationships: []
      }
      coin_prices: {
        Row: {
          change_24h: number | null
          created_at: string
          icon_url: string | null
          id: string
          name: string
          price: number
          symbol: string
          updated_at: string
        }
        Insert: {
          change_24h?: number | null
          created_at?: string
          icon_url?: string | null
          id?: string
          name: string
          price: number
          symbol: string
          updated_at?: string
        }
        Update: {
          change_24h?: number | null
          created_at?: string
          icon_url?: string | null
          id?: string
          name?: string
          price?: number
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      crypto_payments: {
        Row: {
          actually_paid: number | null
          completed_at: string | null
          created_at: string
          id: string
          order_id: string | null
          outcome_amount: number | null
          pay_address: string | null
          pay_amount: number | null
          pay_currency: string
          payment_id: string
          payment_status: string
          price_amount: number
          price_currency: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actually_paid?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          outcome_amount?: number | null
          pay_address?: string | null
          pay_amount?: number | null
          pay_currency: string
          payment_id: string
          payment_status?: string
          price_amount: number
          price_currency?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actually_paid?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          outcome_amount?: number | null
          pay_address?: string | null
          pay_amount?: number | null
          pay_currency?: string
          payment_id?: string
          payment_status?: string
          price_amount?: number
          price_currency?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crypto_wallet_addresses: {
        Row: {
          coin_symbol: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          coin_symbol: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          coin_symbol?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      deposit_history: {
        Row: {
          amount: number
          coin_symbol: string
          confirmation_status: string
          confirmations: number | null
          confirmed_at: string | null
          created_at: string
          id: string
          notes: string | null
          transaction_hash: string | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          amount: number
          coin_symbol: string
          confirmation_status?: string
          confirmations?: number | null
          confirmed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          transaction_hash?: string | null
          user_id: string
          wallet_address: string
        }
        Update: {
          amount?: number
          coin_symbol?: string
          confirmation_status?: string
          confirmations?: number | null
          confirmed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          transaction_hash?: string | null
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      investment_daily_roi: {
        Row: {
          created_at: string
          id: string
          investment_id: string
          roi: number
          roi_date: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          investment_id: string
          roi: number
          roi_date: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          investment_id?: string
          roi?: number
          roi_date?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_daily_roi_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "user_investments"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string
          description: string
          icon: string | null
          id: string
          is_active: boolean
          milestone_type: string
          name: string
          reward_amount: number
          target_value: number
        }
        Insert: {
          created_at?: string
          description: string
          icon?: string | null
          id?: string
          is_active?: boolean
          milestone_type: string
          name: string
          reward_amount: number
          target_value: number
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          milestone_type?: string
          name?: string
          reward_amount?: number
          target_value?: number
        }
        Relationships: []
      }
      plan_entitlements: {
        Row: {
          badge_color: string
          community_access: boolean
          created_at: string
          daily_withdrawal_cap: number
          plan_id: string
          plan_name: string
          premium_features: boolean
          priority_support: boolean
          tier_rank: number
          updated_at: string
          withdrawal_fee_pct: number
        }
        Insert: {
          badge_color?: string
          community_access?: boolean
          created_at?: string
          daily_withdrawal_cap?: number
          plan_id: string
          plan_name: string
          premium_features?: boolean
          priority_support?: boolean
          tier_rank: number
          updated_at?: string
          withdrawal_fee_pct?: number
        }
        Update: {
          badge_color?: string
          community_access?: boolean
          created_at?: string
          daily_withdrawal_cap?: number
          plan_id?: string
          plan_name?: string
          premium_features?: boolean
          priority_support?: boolean
          tier_rank?: number
          updated_at?: string
          withdrawal_fee_pct?: number
        }
        Relationships: []
      }
      plan_templates: {
        Row: {
          coin: string
          created_at: string
          daily_roi: number
          description: string | null
          duration_days: number
          id: string
          is_active: boolean
          name: string
          principal_max: number
          principal_min: number
          roi_max: number
          roi_min: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          coin?: string
          created_at?: string
          daily_roi?: number
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          name: string
          principal_max?: number
          principal_min?: number
          roi_max: number
          roi_min: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          coin?: string
          created_at?: string
          daily_roi?: number
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          name?: string
          principal_max?: number
          principal_min?: number
          roi_max?: number
          roi_min?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_snapshots: {
        Row: {
          balances: Json
          created_at: string
          id: string
          total_value: number
          user_id: string
        }
        Insert: {
          balances?: Json
          created_at?: string
          id?: string
          total_value: number
          user_id: string
        }
        Update: {
          balances?: Json
          created_at?: string
          id?: string
          total_value?: number
          user_id?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          coin_symbol: string
          condition: string
          created_at: string
          id: string
          is_active: boolean
          target_price: number
          triggered_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          coin_symbol: string
          condition: string
          created_at?: string
          id?: string
          is_active?: boolean
          target_price: number
          triggered_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          coin_symbol?: string
          condition?: string
          created_at?: string
          id?: string
          is_active?: boolean
          target_price?: number
          triggered_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          amount: number | null
          created_at: string
          crypto_symbol: string
          email: string | null
          gift_card_code: string
          gift_card_currency: string | null
          gift_card_type: string | null
          id: string
          screenshot_url: string | null
          status: string
          updated_at: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          crypto_symbol: string
          email?: string | null
          gift_card_code: string
          gift_card_currency?: string | null
          gift_card_type?: string | null
          id?: string
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          crypto_symbol?: string
          email?: string | null
          gift_card_code?: string
          gift_card_currency?: string | null
          gift_card_type?: string | null
          id?: string
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referee_id: string
          referral_code: string
          referrer_id: string
          reward_claimed: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          referee_id: string
          referral_code: string
          referrer_id: string
          reward_claimed?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          referee_id?: string
          referral_code?: string
          referrer_id?: string
          reward_claimed?: boolean
        }
        Relationships: []
      }
      rewards_history: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          reference_id: string | null
          reward_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          reference_id?: string | null
          reward_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          reference_id?: string | null
          reward_type?: string
          user_id?: string
        }
        Relationships: []
      }
      roi_regulation_log: {
        Row: {
          active_only: boolean
          admin_user_id: string
          changes: Json
          created_at: string
          id: string
          investments_updated: number
          mode: string
          plans_updated: number
          propagate: boolean
          value: number
        }
        Insert: {
          active_only: boolean
          admin_user_id: string
          changes?: Json
          created_at?: string
          id?: string
          investments_updated: number
          mode: string
          plans_updated: number
          propagate: boolean
          value: number
        }
        Update: {
          active_only?: boolean
          admin_user_id?: string
          changes?: Json
          created_at?: string
          id?: string
          investments_updated?: number
          mode?: string
          plans_updated?: number
          propagate?: boolean
          value?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          from_symbol: string | null
          id: string
          notes: string | null
          status: string
          to_symbol: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          from_symbol?: string | null
          id?: string
          notes?: string | null
          status?: string
          to_symbol?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          from_symbol?: string | null
          id?: string
          notes?: string | null
          status?: string
          to_symbol?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_investments: {
        Row: {
          amount: number
          created_at: string
          daily_roi: number
          duration_days: number
          ends_at: string
          id: string
          plan_id: string
          plan_name: string
          started_at: string
          status: string
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          daily_roi: number
          duration_days: number
          ends_at: string
          id?: string
          plan_id: string
          plan_name: string
          started_at?: string
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          daily_roi?: number
          duration_days?: number
          ends_at?: string
          id?: string
          plan_id?: string
          plan_name?: string
          started_at?: string
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_investments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_milestones: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          current_progress: number
          id: string
          milestone_id: string
          reward_claimed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          id?: string
          milestone_id: string
          reward_claimed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          id?: string
          milestone_id?: string
          reward_claimed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_milestones_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      virtual_cards: {
        Row: {
          card_number: string
          created_at: string
          cvv: string
          daily_limit: number
          expiry_month: number
          expiry_year: number
          id: string
          issued_at: string
          last4: string
          network: string
          per_tx_limit: number
          pin_hash: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_number: string
          created_at?: string
          cvv: string
          daily_limit?: number
          expiry_month: number
          expiry_year: number
          id?: string
          issued_at?: string
          last4: string
          network?: string
          per_tx_limit?: number
          pin_hash?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_number?: string
          created_at?: string
          cvv?: string
          daily_limit?: number
          expiry_month?: number
          expiry_year?: number
          id?: string
          issued_at?: string
          last4?: string
          network?: string
          per_tx_limit?: number
          pin_hash?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      virtual_transactions: {
        Row: {
          amount: number
          coin_symbol: string
          created_at: string
          id: string
          price: number
          total: number
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          coin_symbol: string
          created_at?: string
          id?: string
          price: number
          total: number
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          coin_symbol?: string
          created_at?: string
          id?: string
          price?: number
          total?: number
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      virtual_wallet_balances: {
        Row: {
          balance: number
          coin_symbol: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          coin_symbol: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          coin_symbol?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_balances: {
        Row: {
          balance: number
          coin_symbol: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          coin_symbol: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          coin_symbol?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          fee: number
          id: string
          notes: string | null
          processed_at: string | null
          status: string
          transaction_hash: string | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          amount: number
          created_at?: string
          fee?: number
          id?: string
          notes?: string | null
          processed_at?: string | null
          status?: string
          transaction_hash?: string | null
          user_id: string
          wallet_address: string
        }
        Update: {
          amount?: number
          created_at?: string
          fee?: number
          id?: string
          notes?: string | null
          processed_at?: string | null
          status?: string
          transaction_hash?: string | null
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_apply_transaction_action: {
        Args: { _action: string; _admin_id: string; _payload: Json }
        Returns: Json
      }
      admin_list_tables: {
        Args: never
        Returns: {
          column_default: string
          column_name: string
          data_type: string
          is_identity: string
          is_nullable: string
          ordinal_position: number
          table_name: string
          udt_name: string
        }[]
      }
      card_spend: {
        Args: { _amount_usd: number; _card_id: string; _merchant: string }
        Returns: Json
      }
      get_card_details: { Args: { _card_id: string }; Returns: Json }
      get_investment_roi_summary: {
        Args: { _investment_id: string }
        Returns: {
          accrued: number
          avg_roi: number
          days_counted: number
          roi_max: number
          roi_min: number
          today_roi: number
        }[]
      }
      get_my_card: {
        Args: never
        Returns: {
          daily_limit: number
          expiry_month: number
          expiry_year: number
          has_pin: boolean
          id: string
          issued_at: string
          last4: string
          network: string
          per_tx_limit: number
          spent_today: number
          spent_total: number
          status: string
        }[]
      }
      get_user_entitlements: {
        Args: { _user_id: string }
        Returns: {
          badge_color: string
          community_access: boolean
          created_at: string
          daily_withdrawal_cap: number
          plan_id: string
          plan_name: string
          premium_features: boolean
          priority_support: boolean
          tier_rank: number
          updated_at: string
          withdrawal_fee_pct: number
        }
        SetofOptions: {
          from: "*"
          to: "plan_entitlements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_active_plan: {
        Args: { _plan_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      issue_virtual_card: { Args: never; Returns: Json }
      regulate_daily_roi: {
        Args: {
          _active_only: boolean
          _admin_id: string
          _mode: string
          _propagate: boolean
          _value: number
        }
        Returns: Json
      }
      roll_investment_daily_roi: { Args: never; Returns: number }
      set_card_pin: { Args: { _card_id: string; _pin: string }; Returns: Json }
      set_card_status: {
        Args: { _card_id: string; _reason?: string; _status: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
