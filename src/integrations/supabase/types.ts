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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          attachment: Json | null
          created_at: string
          id: string
          reply_to: Json | null
          sender: string
          status: string
          text: string
          user_id: string
        }
        Insert: {
          attachment?: Json | null
          created_at?: string
          id?: string
          reply_to?: Json | null
          sender: string
          status?: string
          text: string
          user_id: string
        }
        Update: {
          attachment?: Json | null
          created_at?: string
          id?: string
          reply_to?: Json | null
          sender?: string
          status?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount: number
          created_at: string
          daily_roi: number
          duration_days: number
          earned: number
          id: string
          plan_id: string
          plan_name: string
          started_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          daily_roi: number
          duration_days: number
          earned?: number
          id?: string
          plan_id: string
          plan_name: string
          started_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          daily_roi?: number
          duration_days?: number
          earned?: number
          id?: string
          plan_id?: string
          plan_name?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          popup: boolean
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: string
          popup?: boolean
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          popup?: boolean
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          daily_roi: number
          duration_days: number
          features: string[]
          id: string
          max_amount: number
          min_amount: number
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          daily_roi: number
          duration_days: number
          features?: string[]
          id: string
          max_amount: number
          min_amount: number
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          daily_roi?: number
          duration_days?: number
          features?: string[]
          id?: string
          max_amount?: number
          min_amount?: number
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          balance: number
          blocked: boolean
          created_at: string
          earnings: number
          email: string
          id: string
          invested: number
          kyc: Database["public"]["Enums"]["kyc_status"]
          language: string
          name: string
          phone: string | null
          referral_code: string
          referral_earnings: number
          referred_by: string | null
          two_factor: boolean
          updated_at: string
          verified: boolean
        }
        Insert: {
          balance?: number
          blocked?: boolean
          created_at?: string
          earnings?: number
          email: string
          id: string
          invested?: number
          kyc?: Database["public"]["Enums"]["kyc_status"]
          language?: string
          name?: string
          phone?: string | null
          referral_code: string
          referral_earnings?: number
          referred_by?: string | null
          two_factor?: boolean
          updated_at?: string
          verified?: boolean
        }
        Update: {
          balance?: number
          blocked?: boolean
          created_at?: string
          earnings?: number
          email?: string
          id?: string
          invested?: number
          kyc?: Database["public"]["Enums"]["kyc_status"]
          language?: string
          name?: string
          phone?: string | null
          referral_code?: string
          referral_earnings?: number
          referred_by?: string | null
          two_factor?: boolean
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          expires_at: string | null
          id: string
          type: string
          usage_limit: number
          used: number
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          type?: string
          usage_limit?: number
          used?: number
          value: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          type?: string
          usage_limit?: number
          used?: number
          value?: number
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: number
          levels: number[]
          min_deposit: number
          min_withdraw: number
          site_name: string
          updated_at: string
        }
        Insert: {
          id?: number
          levels?: number[]
          min_deposit?: number
          min_withdraw?: number
          site_name?: string
          updated_at?: string
        }
        Update: {
          id?: number
          levels?: number[]
          min_deposit?: number
          min_withdraw?: number
          site_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          note: string | null
          reference: string | null
          status: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string | null
          note?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          note?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type?: Database["public"]["Enums"]["tx_type"]
          user_id?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      my_network_codes: { Args: never; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "user"
      kyc_status: "not_submitted" | "pending" | "verified"
      tx_status:
        | "pending"
        | "processing"
        | "approved"
        | "completed"
        | "rejected"
      tx_type:
        | "deposit"
        | "withdraw"
        | "investment"
        | "commission"
        | "bonus"
        | "payout"
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
      kyc_status: ["not_submitted", "pending", "verified"],
      tx_status: ["pending", "processing", "approved", "completed", "rejected"],
      tx_type: [
        "deposit",
        "withdraw",
        "investment",
        "commission",
        "bonus",
        "payout",
      ],
    },
  },
} as const
