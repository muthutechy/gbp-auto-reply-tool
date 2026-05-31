export type UserRole = "admin" | "client";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  tenant_id: string | null;
}

export type Sentiment = "positive" | "neutral" | "negative";

export interface Review {
  id: string;
  tenant_id: string;
  external_id: string | null;
  rating: number;
  comment: string | null;
  reviewer_name: string | null;
  status: string;
  ai_reply: string | null;
  final_reply: string | null;
  sentiment?: Sentiment | null;
  keyword_used?: string | null;
  created_at: string;
  updated_at: string;
  replied_at?: string | null;
}

export interface ReviewFilters {
  status?: string;
  rating?: number;
  sentiment?: string;
  date_from?: string;
  date_to?: string;
}

export interface Analytics {
  totalReviews: number;
  repliedCount: number;
  repliedPercent: number;
  pendingApprovals: number;
  pendingProcessing: number;
  avgResponseTimeMs: number;
  avgResponseTimeMinutes: number;
  avgResponseTimeHours: number;
  avgResponseTimeLabel?: string;
  responseTimeSeoNote?: string;
  sentimentBreakdown?: {
    positive: number;
    neutral: number;
    negative: number;
    unknown: number;
  };
  keywordUsage?: Record<string, number>;
}

export interface BulkApproveResult {
  results: Array<{
    id: string;
    success: boolean;
    review?: Review;
    error?: string;
  }>;
  succeeded: number;
  failed: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Tenant {
  id: string;
  business_name: string;
  primary_keyword: string;
  secondary_keywords?: string[];
  location?: string | null;
  tone: string;
  auto_reply_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  review_id: string | null;
  review_snippet: {
    comment: string | null;
    rating: number;
    reviewer_name: string | null;
  } | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}
