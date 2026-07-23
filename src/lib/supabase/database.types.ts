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
      contact_messages: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          message: string
          name: string
          phone: string | null
          status: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_events: {
        Row: {
          contract_id: string
          created_at: string
          event_type: string
          id: string
          message: string | null
          party_id: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          event_type: string
          id?: string
          message?: string | null
          party_id?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          event_type?: string
          id?: string
          message?: string | null
          party_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_events_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "contract_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_fields: {
        Row: {
          anchor_id: string | null
          contract_id: string
          created_at: string
          field_type: string
          filled_at: string | null
          height: number | null
          id: string
          label: string
          options: Json | null
          page_number: number | null
          party_id: string
          pos_x: number | null
          pos_y: number | null
          required: boolean
          value: Json | null
          width: number | null
        }
        Insert: {
          anchor_id?: string | null
          contract_id: string
          created_at?: string
          field_type: string
          filled_at?: string | null
          height?: number | null
          id?: string
          label: string
          options?: Json | null
          page_number?: number | null
          party_id: string
          pos_x?: number | null
          pos_y?: number | null
          required?: boolean
          value?: Json | null
          width?: number | null
        }
        Update: {
          anchor_id?: string | null
          contract_id?: string
          created_at?: string
          field_type?: string
          filled_at?: string | null
          height?: number | null
          id?: string
          label?: string
          options?: Json | null
          page_number?: number | null
          party_id?: string
          pos_x?: number | null
          pos_y?: number | null
          required?: boolean
          value?: Json | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_fields_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_fields_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "contract_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_parties: {
        Row: {
          address: string | null
          contract_id: string
          created_at: string
          date_of_birth: string | null
          email: string | null
          entity_cr_number: string | null
          entity_name: string | null
          full_name: string | null
          id: string
          nafath_random_code: string | null
          nafath_status: string | null
          nafath_trans_id: string | null
          nafath_verified_at: string | null
          national_id: string | null
          nationality: string | null
          order_index: number
          party_type: string
          phone: string | null
          reject_resend_count: number
          role_label: string
          signed_at: string | null
          signed_ip: string | null
          signed_user_agent: string | null
          status: string
          token: string
          user_id: string | null
          verification_method: string
        }
        Insert: {
          address?: string | null
          contract_id: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          entity_cr_number?: string | null
          entity_name?: string | null
          full_name?: string | null
          id?: string
          nafath_random_code?: string | null
          nafath_status?: string | null
          nafath_trans_id?: string | null
          nafath_verified_at?: string | null
          national_id?: string | null
          nationality?: string | null
          order_index?: number
          party_type?: string
          phone?: string | null
          reject_resend_count?: number
          role_label: string
          signed_at?: string | null
          signed_ip?: string | null
          signed_user_agent?: string | null
          status?: string
          token?: string
          user_id?: string | null
          verification_method?: string
        }
        Update: {
          address?: string | null
          contract_id?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          entity_cr_number?: string | null
          entity_name?: string | null
          full_name?: string | null
          id?: string
          nafath_random_code?: string | null
          nafath_status?: string | null
          nafath_trans_id?: string | null
          nafath_verified_at?: string | null
          national_id?: string | null
          nationality?: string | null
          order_index?: number
          party_type?: string
          phone?: string | null
          reject_resend_count?: number
          role_label?: string
          signed_at?: string | null
          signed_ip?: string | null
          signed_user_agent?: string | null
          status?: string
          token?: string
          user_id?: string | null
          verification_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_parties_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_template_access: {
        Row: {
          created_at: string
          granted_by: string
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by: string
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_template_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_template_access_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_template_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          body_json: Json
          created_at: string
          created_by: string
          document_type: string
          id: string
          is_active: boolean
          party_count: number
          sequential_signing: boolean
          title: string
          updated_at: string
        }
        Insert: {
          body_json: Json
          created_at?: string
          created_by: string
          document_type?: string
          id?: string
          is_active?: boolean
          party_count: number
          sequential_signing?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          body_json?: Json
          created_at?: string
          created_by?: string
          document_type?: string
          id?: string
          is_active?: boolean
          party_count?: number
          sequential_signing?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          body_json: Json | null
          company_cr_number: string | null
          company_logo_path: string | null
          company_name: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          credit_used: number
          discount_code_id: string | null
          document_type: string
          duration_days: number | null
          expires_at: string | null
          final_file_path: string | null
          final_html: string | null
          id: string
          invoice_amount: number | null
          original_file_path: string | null
          page_count: number
          sent_at: string | null
          sequential_signing: boolean
          source_type: string
          status: string
          term_end_date: string | null
          term_unit: string | null
          term_value: number | null
          title: string
          updated_at: string
          verification_number: string | null
        }
        Insert: {
          body_json?: Json | null
          company_cr_number?: string | null
          company_logo_path?: string | null
          company_name?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          credit_used?: number
          discount_code_id?: string | null
          document_type?: string
          duration_days?: number | null
          expires_at?: string | null
          final_file_path?: string | null
          final_html?: string | null
          id?: string
          invoice_amount?: number | null
          original_file_path?: string | null
          page_count?: number
          sent_at?: string | null
          sequential_signing?: boolean
          source_type?: string
          status?: string
          term_end_date?: string | null
          term_unit?: string | null
          term_value?: number | null
          title: string
          updated_at?: string
          verification_number?: string | null
        }
        Update: {
          body_json?: Json | null
          company_cr_number?: string | null
          company_logo_path?: string | null
          company_name?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          credit_used?: number
          discount_code_id?: string | null
          document_type?: string
          duration_days?: number | null
          expires_at?: string | null
          final_file_path?: string | null
          final_html?: string | null
          id?: string
          invoice_amount?: number | null
          original_file_path?: string | null
          page_count?: number
          sent_at?: string | null
          sequential_signing?: boolean
          source_type?: string
          status?: string
          term_end_date?: string | null
          term_unit?: string | null
          term_value?: number | null
          title?: string
          updated_at?: string
          verification_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_code_redemptions: {
        Row: {
          amount: number
          created_at: string
          credit_code_id: string
          id: string
          redeemed_by: string
        }
        Insert: {
          amount: number
          created_at?: string
          credit_code_id: string
          id?: string
          redeemed_by: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_code_id?: string
          id?: string
          redeemed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_code_redemptions_credit_code_id_fkey"
            columns: ["credit_code_id"]
            isOneToOne: false
            referencedRelation: "credit_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_codes: {
        Row: {
          amount: number
          approval_status: string
          code: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          max_uses: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          uses_count: number
        }
        Insert: {
          amount: number
          approval_status?: string
          code: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          uses_count?: number
        }
        Update: {
          amount?: number
          approval_status?: string
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_codes_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_code_uses: {
        Row: {
          contract_id: string
          created_at: string
          discount_code_id: string
          id: string
          used_by: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          discount_code_id: string
          id?: string
          used_by: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          discount_code_id?: string
          id?: string
          used_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_uses_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_code_uses_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          approval_status: string
          code: string
          created_at: string
          created_by: string
          discount_percent: number
          ends_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          max_uses_per_user: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          starts_at: string | null
        }
        Insert: {
          approval_status?: string
          code: string
          created_at?: string
          created_by: string
          discount_percent: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          starts_at?: string | null
        }
        Update: {
          approval_status?: string
          code?: string
          created_at?: string
          created_by?: string
          discount_percent?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_messages: {
        Row: {
          created_at: string
          error_detail: string | null
          id: string
          message: string
          recipient_email: string
          sent_by: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          error_detail?: string | null
          id?: string
          message: string
          recipient_email: string
          sent_by?: string | null
          status: string
          subject: string
        }
        Update: {
          created_at?: string
          error_detail?: string | null
          id?: string
          message?: string
          recipient_email?: string
          sent_by?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_pages: {
        Row: {
          content: string
          key: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content: string
          key: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          key?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_pages_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_change_requests: {
        Row: {
          base_amount: number
          created_at: string
          extra_party_fee: number
          id: string
          minimum_invoice: number
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tax_percent: number
        }
        Insert: {
          base_amount: number
          created_at?: string
          extra_party_fee: number
          id?: string
          minimum_invoice: number
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tax_percent: number
        }
        Update: {
          base_amount?: number
          created_at?: string
          extra_party_fee?: number
          id?: string
          minimum_invoice?: number
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tax_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_change_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_change_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_settings: {
        Row: {
          base_amount: number
          extra_party_fee: number
          id: number
          minimum_invoice: number
          price_per_party: number
          tax_percent: number
          updated_at: string
        }
        Insert: {
          base_amount?: number
          extra_party_fee?: number
          id?: number
          minimum_invoice?: number
          price_per_party?: number
          tax_percent?: number
          updated_at?: string
        }
        Update: {
          base_amount?: number
          extra_party_fee?: number
          id?: number
          minimum_invoice?: number
          price_per_party?: number
          tax_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_permissions: string[]
          created_at: string
          credit_balance: number
          date_of_birth: string | null
          email: string
          full_name: string | null
          id: string
          must_change_password: boolean
          national_id: string | null
          nationality: string | null
          notifications_seen_at: string | null
          phone: string | null
          role: string
          signature_data_url: string | null
          suspended_at: string | null
        }
        Insert: {
          admin_permissions?: string[]
          created_at?: string
          credit_balance?: number
          date_of_birth?: string | null
          email: string
          full_name?: string | null
          id: string
          must_change_password?: boolean
          national_id?: string | null
          nationality?: string | null
          notifications_seen_at?: string | null
          phone?: string | null
          role?: string
          signature_data_url?: string | null
          suspended_at?: string | null
        }
        Update: {
          admin_permissions?: string[]
          created_at?: string
          credit_balance?: number
          date_of_birth?: string | null
          email?: string
          full_name?: string | null
          id?: string
          must_change_password?: boolean
          national_id?: string | null
          nationality?: string | null
          notifications_seen_at?: string | null
          phone?: string | null
          role?: string
          signature_data_url?: string | null
          suspended_at?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          id: number
          logo_data_url: string | null
          org_name: string
          social_links: Json
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          id?: number
          logo_data_url?: string | null
          org_name?: string
          social_links?: Json
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          id?: number
          logo_data_url?: string | null
          org_name?: string
          social_links?: Json
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      sms_messages: {
        Row: {
          created_at: string
          error_detail: string | null
          id: string
          message: string
          recipient_phone: string
          sent_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_detail?: string | null
          id?: string
          message: string
          recipient_phone: string
          sent_by?: string | null
          status: string
        }
        Update: {
          created_at?: string
          error_detail?: string | null
          id?: string
          message?: string
          recipient_phone?: string
          sent_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_templates: {
        Row: {
          body: string
          description: string | null
          key: string
          label: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body: string
          description?: string | null
          key: string
          label: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          description?: string | null
          key?: string
          label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      preview_discount_code: {
        Args: { p_code: string; p_party_count: number }
        Returns: {
          base_amount: number
          discount_code_id: string
          discount_percent: number
          final_amount: number
          message: string
        }[]
      }
      redeem_credit_code: { Args: { p_code: string }; Returns: number }
      resend_signing_link: {
        Args: { p_party_id: string }
        Returns: {
          address: string | null
          contract_id: string
          created_at: string
          date_of_birth: string | null
          email: string | null
          entity_cr_number: string | null
          entity_name: string | null
          full_name: string | null
          id: string
          nafath_random_code: string | null
          nafath_status: string | null
          nafath_trans_id: string | null
          nafath_verified_at: string | null
          national_id: string | null
          nationality: string | null
          order_index: number
          party_type: string
          phone: string | null
          reject_resend_count: number
          role_label: string
          signed_at: string | null
          signed_ip: string | null
          signed_user_agent: string | null
          status: string
          token: string
          user_id: string | null
          verification_method: string
        }
        SetofOptions: {
          from: "*"
          to: "contract_parties"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_check_login_rate_limit: {
        Args: { p_national_id: string }
        Returns: boolean
      }
      rpc_delete_password_reset_otp: {
        Args: { p_national_id: string }
        Returns: undefined
      }
      rpc_delete_profile_change_otp: {
        Args: { p_field: string; p_user_id: string }
        Returns: undefined
      }
      rpc_delete_registration_otp: {
        Args: { p_phone: string }
        Returns: undefined
      }
      rpc_get_password_reset_otp: {
        Args: { p_national_id: string }
        Returns: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
        }[]
      }
      rpc_get_profile_change_otp: {
        Args: { p_field: string; p_user_id: string }
        Returns: {
          attempts: number
          code: string
          expires_at: string
          new_value: string
        }[]
      }
      rpc_get_registration_otp: {
        Args: { p_phone: string }
        Returns: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
        }[]
      }
      rpc_get_signing_identity_otp: {
        Args: { p_party_id: string }
        Returns: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          verified: boolean
        }[]
      }
      rpc_get_signing_otp: {
        Args: { p_party_id: string }
        Returns: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          verified: boolean
        }[]
      }
      rpc_increment_password_reset_otp_attempts: {
        Args: { p_national_id: string }
        Returns: undefined
      }
      rpc_increment_profile_change_otp_attempts: {
        Args: { p_field: string; p_user_id: string }
        Returns: undefined
      }
      rpc_increment_registration_otp_attempts: {
        Args: { p_phone: string }
        Returns: undefined
      }
      rpc_increment_signing_identity_otp_attempts: {
        Args: { p_party_id: string }
        Returns: undefined
      }
      rpc_increment_signing_otp_attempts: {
        Args: { p_party_id: string }
        Returns: undefined
      }
      rpc_mark_signing_identity_otp_verified: {
        Args: { p_party_id: string }
        Returns: undefined
      }
      rpc_mark_signing_otp_verified: {
        Args: { p_party_id: string }
        Returns: undefined
      }
      rpc_reset_login_rate_limit: {
        Args: { p_national_id: string }
        Returns: undefined
      }
      rpc_upsert_password_reset_otp: {
        Args: { p_code: string; p_expires_at: string; p_national_id: string }
        Returns: undefined
      }
      rpc_upsert_profile_change_otp: {
        Args: {
          p_code: string
          p_expires_at: string
          p_field: string
          p_new_value: string
          p_user_id: string
        }
        Returns: undefined
      }
      rpc_upsert_registration_otp: {
        Args: { p_code: string; p_expires_at: string; p_phone: string }
        Returns: undefined
      }
      rpc_upsert_signing_identity_otp: {
        Args: { p_code: string; p_expires_at: string; p_party_id: string }
        Returns: undefined
      }
      rpc_upsert_signing_otp: {
        Args: { p_code: string; p_expires_at: string; p_party_id: string }
        Returns: undefined
      }
      send_contract: {
        Args: { p_contract_id: string; p_use_balance_amount?: number }
        Returns: {
          body_json: Json | null
          company_cr_number: string | null
          company_logo_path: string | null
          company_name: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          credit_used: number
          discount_code_id: string | null
          document_type: string
          duration_days: number | null
          expires_at: string | null
          final_file_path: string | null
          final_html: string | null
          id: string
          invoice_amount: number | null
          original_file_path: string | null
          page_count: number
          sent_at: string | null
          sequential_signing: boolean
          source_type: string
          status: string
          term_end_date: string | null
          term_unit: string | null
          term_value: number | null
          title: string
          updated_at: string
          verification_number: string | null
        }
        SetofOptions: {
          from: "*"
          to: "contracts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_contract_discount_code: {
        Args: { p_code: string; p_contract_id: string }
        Returns: {
          body_json: Json | null
          company_cr_number: string | null
          company_logo_path: string | null
          company_name: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          credit_used: number
          discount_code_id: string | null
          document_type: string
          duration_days: number | null
          expires_at: string | null
          final_file_path: string | null
          final_html: string | null
          id: string
          invoice_amount: number | null
          original_file_path: string | null
          page_count: number
          sent_at: string | null
          sequential_signing: boolean
          source_type: string
          status: string
          term_end_date: string | null
          term_unit: string | null
          term_value: number | null
          title: string
          updated_at: string
          verification_number: string | null
        }
        SetofOptions: {
          from: "*"
          to: "contracts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_document: {
        Args: {
          p_completed_date?: string
          p_national_id_1: string
          p_national_id_2?: string
          p_verification_number: string
        }
        Returns: {
          completed_at: string
          document_type: string
          party_full_name: string
          party_role_label: string
          party_signed_at: string
          party_status: string
          title: string
          verification_number: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
