"use client";

import { useState } from "react";
import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { fetchWithSupabaseAuth } from "@/lib/supabase/auth-fetch";
import type { RagSearchResult } from "@/types/rag";

type CoachMessage = {
  role: "user" | "assistant";
  content: string;
};

type CoachResponse = {
  session_id: string;
  answer: string;
  retrieved_documents: RagSearchResult[];
};

export function CoachClient() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [retrievedDocuments, setRetrievedDocuments] = useState<RagSearchResult[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  async function askCoach() {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      setStatus("Enter a question first.");
      return;
    }

    setStatus(null);
    setIsAsking(true);
    setMessages((current) => [
      ...current,
      {
        role: "user",
        content: trimmedQuestion
      }
    ]);
    setQuestion("");

    try {
      const response = await fetchWithSupabaseAuth("/api/rag/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          session_id: sessionId ?? undefined,
          top_k: 8
        })
      });
      const payload = await response.json();

      if (response.status === 401) {
        setStatus("Your session has expired. Please log in again.");
        return;
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to ask coach.");
      }

      const result = payload as CoachResponse;
      setSessionId(result.session_id);
      setRetrievedDocuments(result.retrieved_documents ?? []);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: result.answer
        }
      ]);
      setStatus(`Retrieved ${result.retrieved_documents?.length ?? 0} context documents.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to ask coach.");
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            RAG health coach
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="min-h-48 space-y-3 rounded-md border bg-muted/30 p-3">
            {messages.length === 0 ? (
              <p className="text-sm leading-6 text-muted-foreground">
                Ask about recent eating patterns, emotional triggers, activity, or
                expected weight movement.
              </p>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-[88%] rounded-md bg-primary px-3 py-2 text-sm leading-6 text-primary-foreground"
                      : "max-w-[88%] rounded-md bg-background px-3 py-2 text-sm leading-6"
                  }
                >
                  {message.content}
                </div>
              ))
            )}
          </div>
          <Textarea
            placeholder="What should I improve this week?"
            rows={5}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <Button className="gap-2" disabled={isAsking} onClick={askCoach}>
            <Send className="h-4 w-4" />
            {isAsking ? "Asking..." : "Ask coach"}
          </Button>
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Retrieved context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {retrievedDocuments.length === 0 ? (
            <p className="text-muted-foreground">No context retrieved yet.</p>
          ) : (
            retrievedDocuments.map((document) => (
              <div key={document.id} className="rounded-md border p-3">
                <div className="font-medium">{document.title ?? document.source_type}</div>
                <p className="mt-1 line-clamp-4 text-muted-foreground">
                  {document.content}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Similarity {Math.round(document.similarity * 100)}%
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
