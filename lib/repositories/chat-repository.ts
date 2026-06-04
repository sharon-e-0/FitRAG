import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage, ChatRole, ChatSession } from "@/types/chat";

export class ChatRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getOrCreateSession(params: {
    userId: string;
    sessionId?: string;
    title?: string;
  }) {
    if (params.sessionId) {
      const { data, error } = await this.supabase
        .from("chat_sessions")
        .select("id,user_id,title,last_message_at,created_at,updated_at")
        .eq("id", params.sessionId)
        .eq("user_id", params.userId)
        .single<ChatSession>();

      if (error) {
        throw error;
      }

      return data;
    }

    const { data, error } = await this.supabase
      .from("chat_sessions")
      .insert({
        user_id: params.userId,
        title: params.title ?? "Health coaching",
        last_message_at: new Date().toISOString()
      })
      .select("id,user_id,title,last_message_at,created_at,updated_at")
      .single<ChatSession>();

    if (error) {
      throw error;
    }

    return data;
  }

  async createMessage(params: {
    sessionId: string;
    userId: string;
    role: ChatRole;
    content: string;
    retrievedDocumentIds?: string[];
    aiModel?: string;
    tokenUsage?: Record<string, unknown>;
  }) {
    const { data, error } = await this.supabase
      .from("chat_messages")
      .insert({
        session_id: params.sessionId,
        user_id: params.userId,
        role: params.role,
        content: params.content,
        retrieved_document_ids: params.retrievedDocumentIds ?? null,
        ai_model: params.aiModel ?? null,
        token_usage: params.tokenUsage ?? null
      })
      .select("id,session_id,user_id,role,content,retrieved_document_ids,ai_model,token_usage,created_at")
      .single<ChatMessage>();

    if (error) {
      throw error;
    }

    await this.touchSession(params.sessionId, params.userId);

    return data;
  }

  private async touchSession(sessionId: string, userId: string) {
    const { error } = await this.supabase
      .from("chat_sessions")
      .update({
        last_message_at: new Date().toISOString()
      })
      .eq("id", sessionId)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }
  }
}
