// Auto-generated types for the project's backend schema (fallback module)
// NOTE: This file exists to satisfy the Supabase client type import.
// If your schema changes, we can update these types as needed.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      coin_prices: {
        Row: {
          id: string;
          name: string;
          price: number;
          change_24h: number | null;
          created_at: string;
          updated_at: string;
          symbol: string;
          icon_url: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          change_24h?: number | null;
          created_at?: string;
          updated_at?: string;
          symbol: string;
          icon_url?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          change_24h?: number | null;
          created_at?: string;
          updated_at?: string;
          symbol?: string;
          icon_url?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
          display_name: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
          display_name?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
          display_name?: string | null;
        };
        Relationships: [];
      };
      redemptions: {
        Row: {
          wallet_address: string;
          screenshot_url: string | null;
          created_at: string;
          updated_at: string;
          status: string;
          id: string;
          amount: number | null;
          gift_card_code: string;
          crypto_symbol: string;
          user_id: string;
        };
        Insert: {
          wallet_address: string;
          screenshot_url?: string | null;
          created_at?: string;
          updated_at?: string;
          status?: string;
          id?: string;
          amount?: number | null;
          gift_card_code: string;
          crypto_symbol: string;
          user_id: string;
        };
        Update: {
          wallet_address?: string;
          screenshot_url?: string | null;
          created_at?: string;
          updated_at?: string;
          status?: string;
          id?: string;
          amount?: number | null;
          gift_card_code?: string;
          crypto_symbol?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          type: string;
          from_symbol: string | null;
          created_at: string;
          id: string;
          to_symbol: string | null;
          amount: number;
          user_id: string;
          status: string;
        };
        Insert: {
          type: string;
          from_symbol?: string | null;
          created_at?: string;
          id?: string;
          to_symbol?: string | null;
          amount: number;
          user_id: string;
          status?: string;
        };
        Update: {
          type?: string;
          from_symbol?: string | null;
          created_at?: string;
          id?: string;
          to_symbol?: string | null;
          amount?: number;
          user_id?: string;
          status?: string;
        };
        Relationships: [];
      };
      wallet_balances: {
        Row: {
          user_id: string;
          created_at: string;
          updated_at: string;
          coin_symbol: string;
          id: string;
          balance: number;
        };
        Insert: {
          user_id: string;
          created_at?: string;
          updated_at?: string;
          coin_symbol: string;
          id?: string;
          balance?: number;
        };
        Update: {
          user_id?: string;
          created_at?: string;
          updated_at?: string;
          coin_symbol?: string;
          id?: string;
          balance?: number;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}

export type PublicSchema = Database['public'];
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update'];
