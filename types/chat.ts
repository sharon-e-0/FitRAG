export type ChatRole = "user" | "assistant" | "system";

export type ChatSession = {
  id: string;
  user_id: string;
  title: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  session_id: string;
  user_id: string;
  role: ChatRole;
  content: string;
  retrieved_document_ids: string[] | null;
  ai_model: string | null;
  token_usage: Record<string, unknown> | null;
  created_at: string;
};
