import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Database Types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url: string | null;
          plan: 'free' | 'premium' | 'enterprise';
          reports_used: number;
          reports_limit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      reports: {
        Row: {
          id: string;
          user_id: string;
          company: string;
          ticker: string;
          exchange: string;
          overall_score: number;
          summary: string;
          metrics: any;
          key_ratios: any;
          strengths: string[];
          red_flags: string[];
          investment_assessment: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['reports']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['reports']['Insert']>;
      };
      source_documents: {
        Row: {
          id: string;
          user_id: string;
          report_id: string | null;
          file_name: string;
          file_size: number;
          file_type: string;
          storage_path: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['source_documents']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['source_documents']['Insert']>;
      };
      chat_messages: {
        Row: {
          id: string;
          report_id: string;
          user_id: string;
          role: 'user' | 'assistant';
          content: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['chat_messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>;
      };
      watchlist: {
        Row: {
          id: string;
          user_id: string;
          ticker: string;
          company_name: string;
          added_at: string;
        };
        Insert: Omit<Database['public']['Tables']['watchlist']['Row'], 'id' | 'added_at'>;
        Update: Partial<Database['public']['Tables']['watchlist']['Insert']>;
      };
    };
  };
}
