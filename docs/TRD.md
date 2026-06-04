# FitRAG TRD

## 1. 기술 개요

FitRAG는 Next.js 14 App Router 기반 풀스택 애플리케이션이다. 프론트엔드, Route Handler 백엔드, Supabase PostgreSQL, pgvector, Gemini API를 사용한다.

## 2. 기술 스택

### Frontend

- Next.js 14 App Router
- React 18
- TypeScript
- TailwindCSS
- shadcn 스타일 UI 컴포넌트
- Recharts
- lucide-react

### Backend

- Next.js Route Handlers
- Supabase SSR/Auth
- Zod validation

### Database

- Supabase PostgreSQL
- pgvector
- RLS

### AI

- Gemini 2.5 Flash
- Gemini text-embedding-004
- Rule/fallback 기반 음식 영양 추정
- Rule 기반 체중 예측 엔진

## 3. 주요 폴더 구조

```txt
app/
  api/
    auth/logout/
    health/
    meals/
    meals/analyze/
    rag/coach/
    rag/food-records/embed/
    rag/search/
    rag/status/
  auth/callback/
  coach/
  dashboard/
  login/
  meals/new/
  prediction/

components/
  auth/
  coach/
  layout/
  meals/
  prediction/
  ui/

lib/
  ai/
  prediction/
  rag/
  repositories/
  services/
  supabase/
  validation/

types/
docs/
```

## 4. 인증 구조

### 관련 파일

- `app/login/page.tsx`
- `components/auth/login-button.tsx`
- `components/auth/logout-button.tsx`
- `app/auth/callback/route.ts`
- `app/api/auth/logout/route.ts`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/middleware.ts`
- `middleware.ts`

### 동작

1. 클라이언트에서 Supabase OAuth 로그인 요청을 보낸다.
2. Google OAuth 성공 후 `/auth/callback`으로 돌아온다.
3. callback route가 Supabase 세션 쿠키를 설정한다.
4. middleware는 보호 경로 접근 시 세션을 검사한다.
5. API Route Handler는 `getAuthenticatedUser`로 사용자 인증을 재검증한다.

### 보호 경로

- `/dashboard`
- `/meals`
- `/coach`
- `/prediction`

## 5. 식사 저장 구조

### 관련 파일

- `components/meals/meal-form.tsx`
- `app/api/meals/route.ts`
- `app/api/meals/analyze/route.ts`
- `lib/validation/meals.ts`
- `lib/validation/food-analysis.ts`
- `types/database.ts`
- `types/food-analysis.ts`

### 저장 흐름

```txt
MealForm
  -> runMealAnalysis()
    -> /api/meals/analyze
      -> Gemini analyzeFood()
      -> 실패 시 estimateFoodAnalysisFallback()
  -> /api/meals
    -> food_records insert
    -> food_analysis_results insert
  -> /api/rag/food-records/embed fire-and-forget
  -> /dashboard 이동
```

### 지원 이미지 형식

- JPEG
- PNG
- WEBP

### 클라이언트 이미지 처리

- 최대 선택 크기: 12MB
- JPEG/PNG/WEBP가 4MB 초과 시 1600px 기준으로 JPEG 압축
- HEIC/HEIF는 미지원

## 6. 음식 분석 구조

### Gemini 분석

관련 파일:

- `lib/ai/food-analysis.ts`
- `app/api/meals/analyze/route.ts`

입력:

- 텍스트 음식명
- 이미지 base64 + MIME type

출력:

```json
{
  "calories": 650,
  "carbs": 88,
  "protein": 24,
  "fat": 20,
  "sugar": 9,
  "sodium": 980,
  "food_name": "비빔밥",
  "analysis_source": "gemini"
}
```

### fallback 분석

관련 파일:

- `lib/ai/food-analysis-fallback.ts`

Gemini 실패 시 API는 500으로 막지 않고 추정 결과를 반환한다.

```json
{
  "calories": 600,
  "carbs": 72,
  "protein": 24,
  "fat": 22,
  "sugar": 8,
  "sodium": 850,
  "food_name": "업로드한 식사 이미지",
  "analysis_source": "fallback",
  "warning": "Gemini analysis failed, so FitRAG saved an estimated nutrition result."
}
```

## 7. RAG 구조

### 관련 파일

- `app/api/rag/food-records/embed/route.ts`
- `app/api/rag/search/route.ts`
- `app/api/rag/coach/route.ts`
- `app/api/rag/status/route.ts`
- `lib/ai/embedding.ts`
- `lib/repositories/rag-document-repository.ts`
- `lib/services/food-record-embedding-service.ts`
- `lib/services/rag-search-service.ts`
- `lib/services/retrieval-service.ts`
- `lib/services/health-coach-chat-service.ts`
- `lib/rag/health-coach-prompt.ts`
- `lib/services/embedding-failure-log-service.ts`

### food_records 임베딩 흐름

```txt
식사 저장 성공
  -> /api/rag/food-records/embed 호출
  -> food_records + food_analysis_results 조회
  -> 자연어 content 생성
  -> text-embedding-004 호출
  -> rag_documents upsert
```

### rag_documents.content 예시

```txt
2026-06-04 저녁 식사.
스트레스 상태에서 야식으로 비빔밥을 섭취.
총 650kcal.
탄수화물 85g.
단백질 25g.
지방 15g.
사용자 메모: 야근 후 허기가 심했음.
```

### 검색 흐름

```txt
사용자 질문
  -> 질문 임베딩 생성
  -> match_rag_documents RPC
  -> Top K 문서 반환
  -> Gemini 코치 프롬프트 구성
  -> 답변 생성
```

### fallback

- pgvector 검색 실패 또는 결과 없음: 최근 food_records를 컨텍스트로 사용
- Gemini 코치 답변 실패: rule 기반 fallback 답변 생성

## 8. Dashboard 구조

### 관련 파일

- `app/dashboard/page.tsx`
- `app/dashboard/dashboard-client.tsx`

### 데이터 소스

- `/api/meals`
- `/api/rag/status`
- 정적 샘플 차트 데이터

### 구현 내용

- 저장된 식사 목록 표시
- `food_analysis_results.calories` 합산 표시
- 분석 결과가 없으면 `Pending analysis`
- RAG 임베딩 상태 카드 표시
- 최근 임베딩 실패 로그 표시
- 칼로리/영양소/체중/감정 차트 표시

## 9. 체중 예측 구조

### 관련 파일

- `lib/prediction/weight.ts`
- `lib/prediction/weight.test.ts`
- `components/prediction/prediction-client.tsx`
- `app/prediction/page.tsx`

### 계산 항목

- BMR
- TDEE
- 일일 에너지 수지
- 일일 체중 변화량
- 7일 예측
- 30일 예측
- 목표 체중 도달 예상일

### 테스트

Vitest 기반 unit test가 작성되어 있다.

```txt
Test Files: 1 passed
Tests: 6 passed
```

## 10. API 목록

### Auth

- `POST /api/auth/logout`
- `GET /auth/callback`

### Health

- `GET /api/health`

### Meals

- `GET /api/meals`
- `POST /api/meals`
- `POST /api/meals/analyze`

### RAG

- `POST /api/rag/food-records/embed`
- `POST /api/rag/search`
- `POST /api/rag/coach`
- `GET /api/rag/status`

## 11. DB 주요 테이블

마이그레이션 파일:

- `migration.sql`
- `migration_embedding_diagnostics.sql`
- `migration_food_record_emotion_context.sql`

주요 테이블:

- `user_profiles`
- `food_records`
- `food_analysis_results`
- `emotion_tags`
- `situation_tags`
- `food_record_emotion_tags`
- `food_record_situation_tags`
- `health_connect_daily_logs`
- `weight_logs`
- `weight_prediction_results`
- `rag_documents`
- `chat_sessions`
- `chat_messages`
- `embedding_failure_logs`

## 12. RLS 정책

각 주요 사용자 데이터 테이블은 Supabase Auth 사용자 ID 기준 owner policy를 갖는다.

기본 원칙:

- 사용자는 자신의 row만 조회 가능
- 사용자는 자신의 row만 생성 가능
- 사용자는 자신의 row만 수정/삭제 가능
- 서버 Route Handler에서도 인증 사용자 ID로 필터링

## 13. 환경 변수

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
```

## 14. 현재 기술적 제한사항

- Vercel 서버 로그는 로컬 CLI 인증이 없어 현재 직접 조회 불가
- 이미지 원본은 Storage에 저장하지 않음
- Health Connect 실제 모바일 SDK 동기화 미구현
- 일부 Dashboard 차트는 샘플 데이터
- `/api/rag/food-records/embed` 호출은 fire-and-forget 구조
- Gemini 실패 시 fallback 저장은 가능하지만 정확도는 낮음

## 15. 검증 명령

```bash
npm run build
npm test -- --run
```
