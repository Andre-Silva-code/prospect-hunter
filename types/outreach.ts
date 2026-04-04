export type OutreachStatus =
  | "pending"
  | "phone_verified"
  | "phone_invalid"
  | "scheduled"
  | "sent"
  | "delivered"
  | "replied"
  | "follow_up_1"
  | "follow_up_2"
  | "pdf_sent"
  | "post_analysis_1"
  | "post_analysis_2"
  | "failed";

export type OutreachQueueItem = {
  id: string;
  leadId: string;
  userId: string;
  phone: string;
  whatsappJid: string | null;
  status: OutreachStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  messageId: string | null;
  pdfGenerated: boolean;
  attemptCount: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};
