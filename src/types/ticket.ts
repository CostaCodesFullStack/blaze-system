export interface TicketData {
  ticket_id: string;
  guild_id: string;
  channel_id: string;
  user_id: string;
  created_at: number;
  closed_at?: number;
  closed_by?: string;
  reason?: string;
  ticket_number?: number;
  category?: string;
  assumed_by?: string;
  assumed_at?: number;
  priority?: TicketPriority;
}

export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TicketStatus = "open" | "closed" | "on-hold";
export type TicketMessageType = "text" | "image" | "file" | "embed" | "sticker" | "system";

export interface TicketMessageData {
  user: { id: string; username: string };
  content: string;
  timestamp: number;
  attachments?: string[];
  message_type?: TicketMessageType;
}

export interface TicketFeedback {
  id: number;
  ticket_id: string;
  guild_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  staff_id?: string;
  created_at: number;
}

export interface VoiceSession {
  id: number;
  ticket_id: string;
  guild_id: string;
  voice_channel_id: string;
  started_by: string;
  started_at: number;
  ended_at?: number;
  duration_seconds?: number;
}

export interface GuildTicketStats {
  total: number;
  open: number;
  closed: number;
  avgDurationMs: number;
  avgRating: number;
  feedbackCount: number;
  byCategory: Record<string, number>;
  topStaff: Array<{ staff_id: string; avg_rating: number; count: number }>;
}
