"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { fetchWithSupabaseAuth } from "@/lib/supabase/auth-fetch";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { RagSearchResult } from "@/types/rag";

type CoachMessage = {
  role: "user" | "assistant";
  content: string;
};

type CoachResponse = {
  session_id: string;
  answer?: unknown;
  retrieved_documents: RagSearchResult[];
};

export function CoachClient() {
  const router = useRouter();
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

    const supabase = createClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setIsAsking(false);
      setStatus("로그인이 필요합니다. AI 코치를 사용하려면 다시 로그인해 주세요.");
      router.replace("/login?next=/coach");
      return;
    }

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
        setStatus("로그인 세션이 만료되었습니다. AI 코치를 사용하려면 다시 로그인해 주세요.");
        router.replace("/login?next=/coach");
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
          content: toCoachMessageText(result.answer)
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
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFE7E1] text-[#FF7E67]">
              <Bot className="h-5 w-5" />
            </span>
            RAG health coach
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="min-h-64 space-y-4 rounded-3xl border border-[#F0EDE9] bg-[#FAF8F5] p-4">
            {messages.length === 0 ? (
              <div className="max-w-[86%] rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-sm leading-6 text-muted-foreground shadow-[0_8px_24px_rgb(0,0,0,0.05)]">
                Ask about recent eating patterns, emotional triggers, activity, or
                expected weight movement.
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={cn(
                    "max-w-[88%] px-4 py-3 text-sm leading-6",
                    message.role === "user"
                      ? "ml-auto rounded-2xl rounded-br-sm bg-[#FF7E67] text-white shadow-[0_10px_24px_rgba(255,126,103,0.24)]"
                      : "rounded-2xl rounded-bl-sm bg-white text-foreground shadow-[0_8px_24px_rgb(0,0,0,0.05)]"
                  )}
                >
                  {message.role === "assistant" ? (
                    <CoachAnswer content={message.content} />
                  ) : (
                    toCoachMessageText(message.content)
                  )}
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
          <CardTitle className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DDF8F6] text-[#247A74]">
              <Bot className="h-5 w-5" />
            </span>
            Retrieved context
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {retrievedDocuments.length === 0 ? (
            <p className="text-muted-foreground">No context retrieved yet.</p>
          ) : (
            retrievedDocuments.map((document) => (
              <div key={document.id} className="rounded-2xl border border-[#F0EDE9] bg-white p-3 shadow-[0_8px_24px_rgb(0,0,0,0.04)]">
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

function CoachAnswer({ content }: { content: string }) {
  const lines = normalizeCoachAnswer(content)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return (
      <p className="leading-7 text-muted-foreground">
        답변을 표시할 수 없습니다. 질문을 다시 보내 주세요.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        const heading = getHeadingText(line);
        const bullet = getBulletText(line);

        if (heading) {
          return (
            <div
              key={`${line}-${index}`}
              className="mt-2 inline-flex rounded-full bg-[#FFE7E1] px-3 py-1 text-sm font-semibold text-[#C2412D]"
            >
              {heading}
            </div>
          );
        }

        if (bullet) {
          return (
            <div
              key={`${line}-${index}`}
              className="flex gap-2 rounded-2xl bg-[#FAF8F5] px-3 py-2"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF7E67]" />
              <p className="leading-7">{renderInlineMarkdown(bullet)}</p>
            </div>
          );
        }

        return (
          <p key={`${line}-${index}`} className="leading-7">
            {renderInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
}

function normalizeCoachAnswer(content: string) {
  return toCoachMessageText(content)
    .replace(/\r\n/g, "\n")
    .replace(/\s*(#{2,3}\s+[^\n]+)/g, "\n$1\n")
    .replace(/\s*(\*\*\d+\.\s*[^*]+?\*\*)/g, "\n$1\n")
    .replace(/\s+\*\s+/g, "\n- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toCoachMessageText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getHeadingText(line: string) {
  const markdownHeading = line.match(/^#{2,3}\s+(.+)$/);

  if (markdownHeading) {
    return stripMarkdown(markdownHeading[1]);
  }

  const boldHeading = line.match(/^\*\*(\d+\.\s*.+?)\*\*$/);

  return boldHeading ? stripMarkdown(boldHeading[1]) : null;
}

function getBulletText(line: string) {
  const bullet = line.match(/^[-*]\s+(.+)$/);
  return bullet ? bullet[1] : null;
}

function renderInlineMarkdown(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-[#302E2B]">
          {stripMarkdown(part)}
        </strong>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function stripMarkdown(text: string) {
  return text.replace(/\*\*/g, "").trim();
}
