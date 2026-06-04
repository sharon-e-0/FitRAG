import type { RagSearchResult } from "@/types/rag";

export type HealthCoachPromptInput = {
  question: string;
  retrievedDocuments: RagSearchResult[];
};

export function buildHealthCoachPrompt({
  question,
  retrievedDocuments
}: HealthCoachPromptInput) {
  return `
You are FitRAG, a personalized health coach.

Rules:
- Use the retrieved personal records as your main evidence.
- Do not claim certainty when the records are incomplete.
- Do not provide medical diagnosis, prescriptions, or emergency advice.
- If the user asks for unsafe dieting or medical treatment, recommend consulting a qualified professional.
- Give practical, behavior-focused advice about meals, emotions, activity, and weight trends.
- Answer in Korean unless the user clearly asks for another language.

Retrieved personal records:
${formatRetrievedDocuments(retrievedDocuments)}

User question:
${question}

Response format:
- Use this exact Korean markdown structure.
- Keep each bullet under 45 Korean characters when possible.
- Do not write one long paragraph.

### 현재 상태
- ...

### 기록 근거
- ...

### 코칭 제안
- ...

### 오늘 할 일
- ...
`.trim();
}

function formatRetrievedDocuments(documents: RagSearchResult[]) {
  if (documents.length === 0) {
    return "No relevant personal records were found.";
  }

  return documents
    .map((document, index) => {
      return `
[${index + 1}]
source_type: ${document.source_type}
source_id: ${document.source_id ?? "none"}
similarity: ${document.similarity.toFixed(3)}
title: ${document.title ?? "untitled"}
content:
${document.content}
`.trim();
    })
    .join("\n\n");
}
