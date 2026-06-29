/**
 * Supabase 데이터베이스 타입.
 *
 * 골격 단계에서는 손으로 정의한다. 운영/개발에서는 실제 DB 에 맞춰 재생성 권장:
 *   pnpm dlx supabase gen types typescript --local > src/types/database.ts
 *   # 또는 --project-id <ref> (원격)
 *
 * 역할: owner(대표) · manager(관리자) · worker(직원)
 */
export type MemberRole = "owner" | "manager" | "worker";
export type MemberStatus = "active" | "invited" | "disabled";
export type PlanTier = "free" | "trial" | "pro";
export type AssessmentType = "initial" | "regular" | "adhoc";
export type AssessmentStatus = "draft" | "completed";
export type HazardSource = "ai_suggested" | "manual";
export type SafetyRecordType = "education" | "inspection" | "meeting" | "improvement";
export type DocumentKind = "assessment_table" | "safety_policy" | "checklist" | "other";
export type ReminderTarget = "assessment" | "record";
export type ReminderStatus = "pending" | "done";
export type InvitationStatus = "pending" | "accepted" | "revoked";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string; updated_at: string };
type SoftDelete = { deleted_at: string | null };

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          business_no: string | null;
          industry: string | null;
          worker_count: number | null;
          plan: PlanTier;
          trial_ends_at: string | null;
          billing_customer_id: string | null;
          onboarded_at: string | null;
        } & Timestamps &
          SoftDelete;
        Insert: {
          id?: string;
          name: string;
          business_no?: string | null;
          industry?: string | null;
          worker_count?: number | null;
          plan?: PlanTier;
          trial_ends_at?: string | null;
          billing_customer_id?: string | null;
          onboarded_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["workspaces"]["Insert"]>;
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          name: string | null;
          role: MemberRole;
          status: MemberStatus;
        } & Timestamps &
          SoftDelete;
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          name?: string | null;
          role?: MemberRole;
          status?: MemberStatus;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["members"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "members_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      worksites: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          description: string | null;
        } & Timestamps &
          SoftDelete;
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["worksites"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "worksites_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      hazards: {
        Row: {
          id: string;
          workspace_id: string;
          worksite_id: string;
          category: string | null;
          description: string;
          source: HazardSource;
        } & Timestamps &
          SoftDelete;
        Insert: {
          id?: string;
          workspace_id: string;
          worksite_id: string;
          category?: string | null;
          description: string;
          source?: HazardSource;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["hazards"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "hazards_worksite_id_fkey";
            columns: ["worksite_id"];
            referencedRelation: "worksites";
            referencedColumns: ["id"];
          },
        ];
      };
      risk_assessments: {
        Row: {
          id: string;
          workspace_id: string;
          worksite_id: string;
          type: AssessmentType;
          status: AssessmentStatus;
          assessed_on: string | null;
          assessor_member_id: string | null;
          next_due_on: string | null;
          memo: string | null;
        } & Timestamps &
          SoftDelete;
        Insert: {
          id?: string;
          workspace_id: string;
          worksite_id: string;
          type?: AssessmentType;
          status?: AssessmentStatus;
          assessed_on?: string | null;
          assessor_member_id?: string | null;
          next_due_on?: string | null;
          memo?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["risk_assessments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "risk_assessments_worksite_id_fkey";
            columns: ["worksite_id"];
            referencedRelation: "worksites";
            referencedColumns: ["id"];
          },
        ];
      };
      assessment_items: {
        Row: {
          id: string;
          workspace_id: string;
          assessment_id: string;
          hazard_id: string | null;
          /** 가능성 — 사용자가 직접 선택 (시스템 자동 산정 아님) */
          likelihood: number | null;
          /** 중대성 — 사용자가 직접 선택 */
          severity: number | null;
          /** 위험성 — 사용자가 직접 선택 */
          risk_level: number | null;
          measure: string | null;
          owner: string | null;
          due_on: string | null;
          done: boolean;
        } & Timestamps &
          SoftDelete;
        Insert: {
          id?: string;
          workspace_id: string;
          assessment_id: string;
          hazard_id?: string | null;
          likelihood?: number | null;
          severity?: number | null;
          risk_level?: number | null;
          measure?: string | null;
          owner?: string | null;
          due_on?: string | null;
          done?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["assessment_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "assessment_items_assessment_id_fkey";
            columns: ["assessment_id"];
            referencedRelation: "risk_assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessment_items_hazard_id_fkey";
            columns: ["hazard_id"];
            referencedRelation: "hazards";
            referencedColumns: ["id"];
          },
        ];
      };
      safety_records: {
        Row: {
          id: string;
          workspace_id: string;
          type: SafetyRecordType;
          title: string;
          recorded_on: string | null;
          file_path: string | null;
          memo: string | null;
        } & Timestamps &
          SoftDelete;
        Insert: {
          id?: string;
          workspace_id: string;
          type: SafetyRecordType;
          title: string;
          recorded_on?: string | null;
          file_path?: string | null;
          memo?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["safety_records"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "safety_records_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          id: string;
          workspace_id: string;
          kind: DocumentKind;
          title: string | null;
          file_path: string | null;
          generated_from: Json | null;
        } & Timestamps &
          SoftDelete;
        Insert: {
          id?: string;
          workspace_id: string;
          kind: DocumentKind;
          title?: string | null;
          file_path?: string | null;
          generated_from?: Json | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "documents_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      reminders: {
        Row: {
          id: string;
          workspace_id: string;
          target: ReminderTarget;
          target_id: string | null;
          due_on: string;
          status: ReminderStatus;
          label: string | null;
        } & Timestamps &
          SoftDelete;
        Insert: {
          id?: string;
          workspace_id: string;
          target: ReminderTarget;
          target_id?: string | null;
          due_on: string;
          status?: ReminderStatus;
          label?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["reminders"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "reminders_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          id: string;
          workspace_id: string;
          email: string;
          role: MemberRole;
          status: InvitationStatus;
          invited_by_member_id: string | null;
          token: string;
          expires_at: string;
        } & Timestamps &
          SoftDelete;
        Insert: {
          id?: string;
          workspace_id: string;
          email: string;
          role?: MemberRole;
          status?: InvitationStatus;
          invited_by_member_id?: string | null;
          token?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["invitations"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "invitations_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      assessment_revisions: {
        Row: {
          id: string;
          workspace_id: string;
          assessment_id: string;
          version: number;
          status: AssessmentStatus;
          snapshot: Json;
          note: string | null;
          created_by_member_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          assessment_id: string;
          version: number;
          status: AssessmentStatus;
          snapshot: Json;
          note?: string | null;
          created_by_member_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["assessment_revisions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "assessment_revisions_assessment_id_fkey";
            columns: ["assessment_id"];
            referencedRelation: "risk_assessments";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_usage: {
        Row: {
          id: string;
          workspace_id: string;
          month: string;
          input_tokens: number;
          output_tokens: number;
          doc_count: number;
          est_cost_krw: number;
        } & Timestamps;
        Insert: {
          id?: string;
          workspace_id: string;
          month: string;
          input_tokens?: number;
          output_tokens?: number;
          doc_count?: number;
          est_cost_krw?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_usage"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "ai_usage_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          workspace_id: string;
          actor_member_id: string | null;
          action: string;
          target_table: string | null;
          target_id: string | null;
          meta: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          actor_member_id?: string | null;
          action: string;
          target_table?: string | null;
          target_id?: string | null;
          meta?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "audit_logs_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      billing_events: {
        Row: {
          id: string;
          workspace_id: string;
          type: string;
          raw: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          type: string;
          raw?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["billing_events"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "billing_events_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      write_audit_log: {
        Args: {
          p_workspace_id: string;
          p_action: string;
          p_target_table?: string | null;
          p_target_id?: string | null;
          p_meta?: Json | null;
        };
        Returns: string;
      };
      ai_quota_status: {
        Args: { p_workspace_id: string };
        Returns: { plan: string; used: number; limit: number; allowed: boolean }[];
      };
      record_ai_usage: {
        Args: {
          p_workspace_id: string;
          p_input_tokens: number;
          p_output_tokens: number;
          p_cost_krw: number;
          p_doc_count?: number;
        };
        Returns: undefined;
      };
    };
    Enums: {
      member_role: MemberRole;
      member_status: MemberStatus;
      plan_tier: PlanTier;
      assessment_type: AssessmentType;
      assessment_status: AssessmentStatus;
      hazard_source: HazardSource;
      safety_record_type: SafetyRecordType;
      document_kind: DocumentKind;
      reminder_target: ReminderTarget;
      reminder_status: ReminderStatus;
      invitation_status: InvitationStatus;
    };
    CompositeTypes: Record<never, never>;
  };
}

/** 편의 행 타입 별칭 */
type Tables = Database["public"]["Tables"];
export type Workspace = Tables["workspaces"]["Row"];
export type Member = Tables["members"]["Row"];
export type Worksite = Tables["worksites"]["Row"];
export type Hazard = Tables["hazards"]["Row"];
export type RiskAssessment = Tables["risk_assessments"]["Row"];
export type AssessmentItem = Tables["assessment_items"]["Row"];
export type SafetyRecord = Tables["safety_records"]["Row"];
export type AppDocument = Tables["documents"]["Row"];
export type Reminder = Tables["reminders"]["Row"];
export type Invitation = Tables["invitations"]["Row"];
export type AssessmentRevision = Tables["assessment_revisions"]["Row"];
export type AiUsage = Tables["ai_usage"]["Row"];
export type AuditLog = Tables["audit_logs"]["Row"];
export type BillingEvent = Tables["billing_events"]["Row"];
