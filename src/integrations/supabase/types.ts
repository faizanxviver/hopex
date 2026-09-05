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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          active: boolean
          api_key: string
          bytes: number
          created_at: string
          failures: number
          id: string
          label: string
          last_error: string | null
          last_used_at: string | null
          provider: string
          purpose: string
          updated_at: string
          uploads: number
        }
        Insert: {
          active?: boolean
          api_key: string
          bytes?: number
          created_at?: string
          failures?: number
          id?: string
          label?: string
          last_error?: string | null
          last_used_at?: string | null
          provider?: string
          purpose?: string
          updated_at?: string
          uploads?: number
        }
        Update: {
          active?: boolean
          api_key?: string
          bytes?: number
          created_at?: string
          failures?: number
          id?: string
          label?: string
          last_error?: string | null
          last_used_at?: string | null
          provider?: string
          purpose?: string
          updated_at?: string
          uploads?: number
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          admin_id: string
          admin_name: string
          created_at: string
          detail: string
          id: string
          target_id: string | null
          target_name: string
        }
        Insert: {
          action: string
          admin_id: string
          admin_name?: string
          created_at?: string
          detail?: string
          id?: string
          target_id?: string | null
          target_name?: string
        }
        Update: {
          action?: string
          admin_id?: string
          admin_name?: string
          created_at?: string
          detail?: string
          id?: string
          target_id?: string | null
          target_name?: string
        }
        Relationships: []
      }
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
      checkout_sessions: {
        Row: {
          amount: number
          created_at: string
          expires_at: string
          gateway_reference: string | null
          id: string
          method_id: string | null
          method_name: string | null
          order_no: string
          proof_url: string | null
          status: string
          token: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          expires_at?: string
          gateway_reference?: string | null
          id?: string
          method_id?: string | null
          method_name?: string | null
          order_no: string
          proof_url?: string | null
          status?: string
          token: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          expires_at?: string
          gateway_reference?: string | null
          id?: string
          method_id?: string | null
          method_name?: string | null
          order_no?: string
          proof_url?: string | null
          status?: string
          token?: string
          transaction_id?: string | null
          updated_at?: string
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
          last_payout_at: string
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
          last_payout_at?: string
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
          last_payout_at?: string
          plan_id?: string
          plan_name?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leader_plans: {
        Row: {
          amount: number
          check_hours: number
          created_at: string
          created_by: string | null
          deadline_at: string
          id: string
          investment_id: string | null
          plan_id: string
          plan_name: string
          required_investment: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          check_hours?: number
          created_at?: string
          created_by?: string | null
          deadline_at: string
          id?: string
          investment_id?: string | null
          plan_id: string
          plan_name: string
          required_investment?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          check_hours?: number
          created_at?: string
          created_by?: string | null
          deadline_at?: string
          id?: string
          investment_id?: string | null
          plan_id?: string
          plan_name?: string
          required_investment?: number
          status?: string
          updated_at?: string
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
      payment_methods: {
        Row: {
          account_name: string
          account_number: string
          active: boolean
          created_at: string
          id: string
          image_url: string | null
          instructions: string
          kind: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          account_name?: string
          account_number?: string
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          instructions?: string
          kind?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          instructions?: string
          kind?: string
          name?: string
          sort_order?: number
          updated_at?: string
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
          image_url: string | null
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
          image_url?: string | null
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
          image_url?: string | null
          max_amount?: number
          min_amount?: number
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_name: string | null
          account_number: string | null
          balance: number
          bank_name: string | null
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
          account_name?: string | null
          account_number?: string | null
          balance?: number
          bank_name?: string | null
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
          account_name?: string | null
          account_number?: string | null
          balance?: number
          bank_name?: string | null
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
          audience: string
          code: string
          created_at: string
          description: string
          expires_at: string | null
          id: string
          per_user_limit: number
          type: string
          usage_limit: number
          used: number
          value: number
        }
        Insert: {
          active?: boolean
          audience?: string
          code: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          per_user_limit?: number
          type?: string
          usage_limit?: number
          used?: number
          value: number
        }
        Update: {
          active?: boolean
          audience?: string
          code?: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          per_user_limit?: number
          type?: string
          usage_limit?: number
          used?: number
          value?: number
        }
        Relationships: []
      }
      promo_redemptions: {
        Row: {
          amount: number
          created_at: string
          id: string
          promo_id: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          promo_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          promo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_claims: {
        Row: {
          admin_note: string
          amount: number
          created_at: string
          facebook_proof: string | null
          id: string
          reviewed_at: string | null
          status: string
          updated_at: string
          user_id: string
          whatsapp_proof: string | null
        }
        Insert: {
          admin_note?: string
          amount?: number
          created_at?: string
          facebook_proof?: string | null
          id?: string
          reviewed_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          whatsapp_proof?: string | null
        }
        Update: {
          admin_note?: string
          amount?: number
          created_at?: string
          facebook_proof?: string | null
          id?: string
          reviewed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          whatsapp_proof?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          announcement_active: boolean
          announcement_text: string
          guidelines: Json
          guidelines_active: boolean
          guidelines_title: string
          id: number
          levels: number[]
          maintenance_message: string
          maintenance_mode: boolean
          min_deposit: number
          min_withdraw: number
          og_image: string | null
          proof_reward_amount: number
          quick_amounts: number[]
          reward_active: boolean
          reward_amount: number
          reward_cooldown_hours: number
          salary_tiers: Json
          seo_description: string
          seo_keywords: string
          show_proofs_section: boolean
          site_favicon: string | null
          site_logo: string | null
          site_name: string
          site_title: string
          support_whatsapp: string
          updated_at: string
          withdraw_close_hour: number
          withdraw_open_hour: number
        }
        Insert: {
          announcement_active?: boolean
          announcement_text?: string
          guidelines?: Json
          guidelines_active?: boolean
          guidelines_title?: string
          id?: number
          levels?: number[]
          maintenance_message?: string
          maintenance_mode?: boolean
          min_deposit?: number
          min_withdraw?: number
          og_image?: string | null
          proof_reward_amount?: number
          quick_amounts?: number[]
          reward_active?: boolean
          reward_amount?: number
          reward_cooldown_hours?: number
          salary_tiers?: Json
          seo_description?: string
          seo_keywords?: string
          show_proofs_section?: boolean
          site_favicon?: string | null
          site_logo?: string | null
          site_name?: string
          site_title?: string
          support_whatsapp?: string
          updated_at?: string
          withdraw_close_hour?: number
          withdraw_open_hour?: number
        }
        Update: {
          announcement_active?: boolean
          announcement_text?: string
          guidelines?: Json
          guidelines_active?: boolean
          guidelines_title?: string
          id?: number
          levels?: number[]
          maintenance_message?: string
          maintenance_mode?: boolean
          min_deposit?: number
          min_withdraw?: number
          og_image?: string | null
          proof_reward_amount?: number
          quick_amounts?: number[]
          reward_active?: boolean
          reward_amount?: number
          reward_cooldown_hours?: number
          salary_tiers?: Json
          seo_description?: string
          seo_keywords?: string
          show_proofs_section?: boolean
          site_favicon?: string | null
          site_logo?: string | null
          site_name?: string
          site_title?: string
          support_whatsapp?: string
          updated_at?: string
          withdraw_close_hour?: number
          withdraw_open_hour?: number
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
          proof_url: string | null
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
          proof_url?: string | null
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
          proof_url?: string | null
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
      withdrawal_proofs: {
        Row: {
          admin_note: string
          amount: number
          created_at: string
          id: string
          image_url: string
          reviewed_at: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string
          amount?: number
          created_at?: string
          id?: string
          image_url: string
          reviewed_at?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string
          amount?: number
          created_at?: string
          id?: string
          image_url?: string
          reviewed_at?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_activate_leader_plan: {
        Args: {
          _amount: number
          _check_hours: number
          _plan_id: string
          _required: number
          _user_id: string
        }
        Returns: string
      }
      admin_adjust_balance: {
        Args: {
          _amount: number
          _kind: string
          _note?: string
          _user_id: string
        }
        Returns: number
      }
      admin_remove_leader_plan: { Args: { _id: string }; Returns: undefined }
      buy_plan: { Args: { _amount: number; _plan_id: string }; Returns: string }
      claim_earnings: { Args: never; Returns: number }
      claim_salary: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      leaderboard: {
        Args: never
        Returns: {
          display_name: string
          earnings: number
          invested: number
          referral_earnings: number
        }[]
      }
      my_network_codes: { Args: never; Returns: string[] }
      redeem_promo: {
        Args: { _amount?: number; _code: string }
        Returns: {
          bonus: number
          code: string
        }[]
      }
      review_reward_claim: {
        Args: { _approve: boolean; _id: string; _note?: string }
        Returns: number
      }
      review_withdrawal_proof: {
        Args: { _approve: boolean; _id: string; _note?: string }
        Returns: number
      }
      run_leader_plan_checks: { Args: never; Returns: number }
      submit_reward_claim: {
        Args: { _facebook: string; _whatsapp: string }
        Returns: string
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
