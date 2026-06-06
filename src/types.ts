/**
 * Types and interfaces for the Wilson Sons Visit Scheduling application.
 */

export enum VisitStatus {
  PENDING = "Pendente",
  APPROVED = "Aprovado",
  REJECTED = "Rejeitado"
}

export interface VisitRequest {
  id: string;
  fullName: string;
  cpf: string;
  email: string;
  phone: string;
  organization: string;
  cityState: string;
  visitorCount: number;
  scheduledDate: string;
  purpose: string;
  status: VisitStatus;
  submissionDate: string;
  securityCleared: boolean;
  securityConsentDate: string;
  rejectionReason?: string;
  aiSuggestions?: string;   // New AI-generated recommendations and slot feedback
  feedbackSent?: boolean;    // Tracks if post-visit feedback email was triggered
  feedbackSentDate?: string; // Date feedback email was automatically sent
  visitorPhoto?: string;     // Base64 encoded visitor photo or profile image url
}

export interface FeedbackResponse {
  id: string;
  requestId: string;
  visitorName: string;
  organization: string;
  visitDate: string;
  organizationRating: number; // 1 to 5
  safetyRating: number;       // 1 to 5
  usefulnessRating: number;   // 1 to 5
  comments: string;
  submissionDate: string;
}

export interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface MailLog {
  id: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  htmlBody?: string;
  request: VisitRequest;
  type: "approval" | "feedback" | "rejection";
}

