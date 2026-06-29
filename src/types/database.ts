/**
 * Supabase 데이터베이스 타입.
 *
 * 골격 단계에서는 손으로 정의한다. 운영에서는 다음 명령으로 자동 생성 권장:
 *   pnpm dlx supabase gen types typescript --project-id <ref> > src/types/database.ts
 *
 * 멤버 역할: owner(대표) · admin(관리자) · staff(직원)
 */
export type MemberRole = "owner" | "admin" | "staff";

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          business_number: string | null;
          industry: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          business_number?: string | null;
          industry?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          business_number?: string | null;
          industry?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: MemberRole;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: MemberRole;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: MemberRole;
          display_name?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "members_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      member_role: MemberRole;
    };
    CompositeTypes: Record<never, never>;
  };
}

export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type Member = Database["public"]["Tables"]["members"]["Row"];
