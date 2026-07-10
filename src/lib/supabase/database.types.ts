export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      contract_events: {
        Row: {
          contract_id: string;
          created_at: string;
          event_type: string;
          id: string;
          message: string | null;
          party_id: string | null;
        };
        Insert: {
          contract_id: string;
          created_at?: string;
          event_type: string;
          id?: string;
          message?: string | null;
          party_id?: string | null;
        };
        Update: {
          contract_id?: string;
          created_at?: string;
          event_type?: string;
          id?: string;
          message?: string | null;
          party_id?: string | null;
        };
        Relationships: [];
      };
      contract_fields: {
        Row: {
          anchor_id: string | null;
          contract_id: string;
          created_at: string;
          field_type: string;
          filled_at: string | null;
          height: number | null;
          id: string;
          label: string;
          options: Json | null;
          page_number: number | null;
          party_id: string;
          pos_x: number | null;
          pos_y: number | null;
          required: boolean;
          value: Json | null;
          width: number | null;
        };
        Insert: {
          anchor_id?: string | null;
          contract_id: string;
          created_at?: string;
          field_type: string;
          filled_at?: string | null;
          height?: number | null;
          id?: string;
          label: string;
          options?: Json | null;
          page_number?: number | null;
          party_id: string;
          pos_x?: number | null;
          pos_y?: number | null;
          required?: boolean;
          value?: Json | null;
          width?: number | null;
        };
        Update: {
          anchor_id?: string | null;
          contract_id?: string;
          created_at?: string;
          field_type?: string;
          filled_at?: string | null;
          height?: number | null;
          id?: string;
          label?: string;
          options?: Json | null;
          page_number?: number | null;
          party_id?: string;
          pos_x?: number | null;
          pos_y?: number | null;
          required?: boolean;
          value?: Json | null;
          width?: number | null;
        };
        Relationships: [];
      };
      contract_parties: {
        Row: {
          address: string | null;
          contract_id: string;
          created_at: string;
          date_of_birth: string | null;
          email: string | null;
          entity_cr_number: string | null;
          entity_name: string | null;
          full_name: string | null;
          id: string;
          nafath_random_code: string | null;
          nafath_status: string | null;
          nafath_trans_id: string | null;
          nafath_verified_at: string | null;
          national_id: string | null;
          nationality: string | null;
          order_index: number;
          party_type: string;
          phone: string | null;
          reject_resend_count: number;
          role_label: string;
          signed_at: string | null;
          status: string;
          token: string;
          user_id: string | null;
          verification_method: string;
        };
        Insert: {
          address?: string | null;
          contract_id: string;
          created_at?: string;
          date_of_birth?: string | null;
          email?: string | null;
          entity_cr_number?: string | null;
          entity_name?: string | null;
          full_name?: string | null;
          id?: string;
          nafath_random_code?: string | null;
          nafath_status?: string | null;
          nafath_trans_id?: string | null;
          nafath_verified_at?: string | null;
          national_id?: string | null;
          nationality?: string | null;
          order_index?: number;
          party_type?: string;
          phone?: string | null;
          reject_resend_count?: number;
          role_label: string;
          signed_at?: string | null;
          status?: string;
          token?: string;
          user_id?: string | null;
          verification_method?: string;
        };
        Update: {
          address?: string | null;
          contract_id?: string;
          created_at?: string;
          date_of_birth?: string | null;
          email?: string | null;
          entity_cr_number?: string | null;
          entity_name?: string | null;
          full_name?: string | null;
          id?: string;
          nafath_random_code?: string | null;
          nafath_status?: string | null;
          nafath_trans_id?: string | null;
          nafath_verified_at?: string | null;
          national_id?: string | null;
          nationality?: string | null;
          order_index?: number;
          party_type?: string;
          phone?: string | null;
          reject_resend_count?: number;
          role_label?: string;
          signed_at?: string | null;
          status?: string;
          token?: string;
          user_id?: string | null;
          verification_method?: string;
        };
        Relationships: [];
      };
      contracts: {
        Row: {
          body_json: Json | null;
          company_cr_number: string | null;
          company_logo_path: string | null;
          company_name: string | null;
          completed_at: string | null;
          created_at: string;
          created_by: string;
          discount_code_id: string | null;
          document_type: string;
          duration_days: number | null;
          expires_at: string | null;
          final_file_path: string | null;
          final_html: string | null;
          id: string;
          invoice_amount: number | null;
          original_file_path: string | null;
          page_count: number;
          sent_at: string | null;
          source_type: string;
          status: string;
          term_end_date: string | null;
          term_unit: string | null;
          term_value: number | null;
          title: string;
          updated_at: string;
          verification_number: string | null;
        };
        Insert: {
          body_json?: Json | null;
          company_cr_number?: string | null;
          company_logo_path?: string | null;
          company_name?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by: string;
          discount_code_id?: string | null;
          document_type?: string;
          duration_days?: number | null;
          expires_at?: string | null;
          final_file_path?: string | null;
          final_html?: string | null;
          id?: string;
          invoice_amount?: number | null;
          original_file_path?: string | null;
          page_count?: number;
          sent_at?: string | null;
          source_type?: string;
          status?: string;
          term_end_date?: string | null;
          term_unit?: string | null;
          term_value?: number | null;
          title: string;
          updated_at?: string;
          verification_number?: string | null;
        };
        Update: {
          body_json?: Json | null;
          company_cr_number?: string | null;
          company_logo_path?: string | null;
          company_name?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string;
          discount_code_id?: string | null;
          document_type?: string;
          duration_days?: number | null;
          expires_at?: string | null;
          final_file_path?: string | null;
          final_html?: string | null;
          id?: string;
          invoice_amount?: number | null;
          original_file_path?: string | null;
          page_count?: number;
          sent_at?: string | null;
          source_type?: string;
          status?: string;
          term_end_date?: string | null;
          term_unit?: string | null;
          term_value?: number | null;
          title?: string;
          updated_at?: string;
          verification_number?: string | null;
        };
        Relationships: [];
      };
      credit_codes: {
        Row: {
          amount: number;
          code: string;
          created_at: string;
          created_by: string;
          id: string;
          is_active: boolean;
          max_uses: number | null;
          uses_count: number;
        };
        Insert: {
          amount: number;
          code: string;
          created_at?: string;
          created_by: string;
          id?: string;
          is_active?: boolean;
          max_uses?: number | null;
          uses_count?: number;
        };
        Update: {
          amount?: number;
          code?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          is_active?: boolean;
          max_uses?: number | null;
          uses_count?: number;
        };
        Relationships: [];
      };
      credit_code_redemptions: {
        Row: {
          amount: number;
          created_at: string;
          credit_code_id: string;
          id: string;
          redeemed_by: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          credit_code_id: string;
          id?: string;
          redeemed_by: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          credit_code_id?: string;
          id?: string;
          redeemed_by?: string;
        };
        Relationships: [];
      };
      discount_code_uses: {
        Row: {
          contract_id: string;
          created_at: string;
          discount_code_id: string;
          id: string;
          used_by: string;
        };
        Insert: {
          contract_id: string;
          created_at?: string;
          discount_code_id: string;
          id?: string;
          used_by: string;
        };
        Update: {
          contract_id?: string;
          created_at?: string;
          discount_code_id?: string;
          id?: string;
          used_by?: string;
        };
        Relationships: [];
      };
      discount_codes: {
        Row: {
          code: string;
          created_at: string;
          created_by: string;
          discount_percent: number;
          ends_at: string | null;
          id: string;
          is_active: boolean;
          max_uses: number | null;
          max_uses_per_user: number | null;
          starts_at: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by: string;
          discount_percent: number;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_uses?: number | null;
          max_uses_per_user?: number | null;
          starts_at?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string;
          discount_percent?: number;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_uses?: number | null;
          max_uses_per_user?: number | null;
          starts_at?: string | null;
        };
        Relationships: [];
      };
      pricing_settings: {
        Row: {
          base_amount: number;
          extra_party_fee: number;
          id: number;
          minimum_invoice: number;
          price_per_party: number;
          tax_percent: number;
          updated_at: string;
        };
        Insert: {
          base_amount?: number;
          extra_party_fee?: number;
          id?: number;
          minimum_invoice?: number;
          price_per_party?: number;
          tax_percent?: number;
          updated_at?: string;
        };
        Update: {
          base_amount?: number;
          extra_party_fee?: number;
          id?: number;
          minimum_invoice?: number;
          price_per_party?: number;
          tax_percent?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          credit_balance: number;
          date_of_birth: string | null;
          email: string;
          full_name: string | null;
          id: string;
          must_change_password: boolean;
          national_id: string | null;
          nationality: string | null;
          phone: string | null;
          role: string;
        };
        Insert: {
          created_at?: string;
          credit_balance?: number;
          date_of_birth?: string | null;
          email: string;
          full_name?: string | null;
          id: string;
          must_change_password?: boolean;
          national_id?: string | null;
          nationality?: string | null;
          phone?: string | null;
          role?: string;
        };
        Update: {
          created_at?: string;
          credit_balance?: number;
          date_of_birth?: string | null;
          email?: string;
          full_name?: string | null;
          id?: string;
          must_change_password?: boolean;
          national_id?: string | null;
          nationality?: string | null;
          phone?: string | null;
          role?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      login_email_for_national_id: {
        Args: { p_national_id: string };
        Returns: string;
      };
      redeem_credit_code: {
        Args: { p_code: string };
        Returns: number;
      };
      verify_document: {
        Args: { p_verification_number: string; p_national_id_1: string; p_national_id_2?: string; p_completed_date?: string };
        Returns: {
          title: string;
          document_type: string;
          verification_number: string;
          completed_at: string;
          party_full_name: string | null;
          party_role_label: string;
          party_status: string;
          party_signed_at: string | null;
        }[];
      };
      preview_discount_code: {
        Args: { p_code: string; p_party_count: number };
        Returns: {
          base_amount: number;
          discount_code_id: string | null;
          discount_percent: number | null;
          final_amount: number;
          message: string | null;
        }[];
      };
      resend_to_rejected_party: {
        Args: { p_party_id: string };
        Returns: Database['public']['Tables']['contract_parties']['Row'];
      };
      send_contract: {
        Args: { p_contract_id: string };
        Returns: Database['public']['Tables']['contracts']['Row'];
      };
      set_contract_discount_code: {
        Args: { p_code: string; p_contract_id: string };
        Returns: Database['public']['Tables']['contracts']['Row'];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
