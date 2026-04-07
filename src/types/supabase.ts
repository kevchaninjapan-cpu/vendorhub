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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      inquiries: {
        Row: {
          created_at: string
          from_email: string
          from_name: string
          from_phone: string | null
          id: string
          listing_id: string
          message: string | null
        }
        Insert: {
          created_at?: string
          from_email: string
          from_name: string
          from_phone?: string | null
          id?: string
          listing_id: string
          message?: string | null
        }
        Update: {
          created_at?: string
          from_email?: string
          from_name?: string
          from_phone?: string | null
          id?: string
          listing_id?: string
          message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          is_cover: boolean
          listing_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          is_cover?: boolean
          listing_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          is_cover?: boolean
          listing_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          bathrooms: number | null
          bedrooms: number | null
          car_spaces: number | null
          city: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          expires_at: string | null
          floor_area_m2: number | null
          id: string
          land_area_m2: number | null
          latitude: number | null
          longitude: number | null
          owner_id: string
          postcode: string | null
          price: number | null
          price_display: string | null
          price_numeric: number | null
          property_type: Database["public"]["Enums"]["property_type"]
          published_at: string | null
          region: string | null
          slug: string | null
          status: Database["public"]["Enums"]["listing_status"]
          suburb: string | null
          title: string
          updated_at: string
          year_built: number | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          car_spaces?: number | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          expires_at?: string | null
          floor_area_m2?: number | null
          id?: string
          land_area_m2?: number | null
          latitude?: number | null
          longitude?: number | null
          owner_id: string
          postcode?: string | null
          price?: number | null
          price_display?: string | null
          price_numeric?: number | null
          property_type?: Database["public"]["Enums"]["property_type"]
          published_at?: string | null
          region?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          suburb?: string | null
          title: string
          updated_at?: string
          year_built?: number | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          car_spaces?: number | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          expires_at?: string | null
          floor_area_m2?: number | null
          id?: string
          land_area_m2?: number | null
          latitude?: number | null
          longitude?: number | null
          owner_id?: string
          postcode?: string | null
          price?: number | null
          price_display?: string | null
          price_numeric?: number | null
          property_type?: Database["public"]["Enums"]["property_type"]
          published_at?: string | null
          region?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          suburb?: string | null
          title?: string
          updated_at?: string
          year_built?: number | null
        }
        Relationships: []
      }
      open_homes: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          listing_id: string
          notes: string | null
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          listing_id: string
          notes?: string | null
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          listing_id?: string
          notes?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "open_homes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_admin: boolean | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          is_admin?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          created_at: string
          id: string
          owner_id: string | null
          price: number | null
          status: string | null
          title: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          owner_id?: string | null
          price?: number | null
          status?: string | null
          title: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          owner_id?: string | null
          price?: number | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { u: string }; Returns: boolean }
      slugify: { Args: { input: string }; Returns: string }
    }
    Enums: {
      listing_status: "draft" | "active" | "under_offer" | "sold" | "withdrawn"
      property_type:
        | "house"
        | "apartment"
        | "townhouse"
        | "unit"
        | "section"
        | "lifestyle"
        | "rural"
        | "other"
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
      listing_status: ["draft", "active", "under_offer", "sold", "withdrawn"],
      property_type: [
        "house",
        "apartment",
        "townhouse",
        "unit",
        "section",
        "lifestyle",
        "rural",
        "other",
      ],
    },
  },
} as const
