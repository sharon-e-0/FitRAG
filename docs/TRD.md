# FitRAG TRD

## 1. Technical Overview

FitRAG는 Next.js 14 App Router 기반 풀스택 웹 애플리케이션이다. 프론트엔드는 React, TypeScript, TailwindCSS, shadcn 스타일 컴포넌트, Recharts를 사용하며, 백엔드는 Next.js Route Handler로 구성되어 있다. 데이터 저장은 Supabase PostgreSQL/Storage/Auth를 사용하고, RAG 검색은 pgvector와 Gemini text-embedding-004를 사용한다.

## 2. Tech Stack

### Frontend

- Next.js 14 App Router
- React 18
- TypeScript
- TailwindCSS
- shadcn 스타일 UI 컴포넌트
- Recharts
- lucide-react
- browser-image-compression
- heic2any

### Backend

- Next.js Route Handlers
- Supabase SSR/Auth
- Supabase Storage
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

## 3. Folder Structure

```txt
app/
  api/
    auth/logout/
    health/
    meals/
    meals/analyze/
    profile/
    rag/coach/
    rag/food-records/embed/
    rag/food-records/re-embed/
    rag/search/
    rag/status/
    weight-logs/
  auth/callback/
  coach/
  dashboard/
  login/
  meals/new/
  prediction/
  profile/

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

## 4. Authentication Architecture

### Files

- `app/login/page.tsx`
- `components/auth/login-button.tsx`
- `components/auth/logout-button.tsx`
- `app/auth/callback/route.ts`
- `app/api/auth/logout/route.ts`
- `app/page.tsx`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/middleware.ts`
- `middleware.ts`

### Flow

```txt
LoginButton
  -> supabase.auth.signInWithOAuth("google")
  -> Google OAuth
  -> /auth/callback?code=...
  -> exchangeCodeForSession()
  -> Supabase session cookie set
  -> redirect to next path
```

`app/page.tsx`는 OAuth provider가 실수로 `/?code=...`로 redirect하는 경우를 보완하기 위해 code를 `/auth/callback`으로 전달한다.

Middleware는 보호 경로 접근 시 Supabase server client의 `getUser()`로 실제 세션을 확인한다.

### Protected Paths

- `/dashboard`
- `/meals`
- `/coach`
- `/prediction`
- `/profile`

## 5. Meal Analysis And Save Architecture

### Files

- `components/meals/meal-form.tsx`
- `app/api/meals/analyze/route.ts`
- `app/api/meals/route.ts`
- `lib/ai/food-analysis.ts`
- `lib/ai/food-analysis-fallback.ts`
- `lib/validation/food-analysis.ts`
- `lib/validation/meals.ts`
- `types/food-analysis.ts`
- `types/database.ts`

### Flow

```txt
MealForm
  -> user enters meal text and/or image
  -> client normalizes image
  -> AI 분석 및 확인
  -> POST /api/meals/analyze
    -> Gemini 2.5 Flash
    -> fallback estimate if Gemini fails
  -> editable analysis result rendered in form
  -> 최종 저장
  -> POST /api/meals
    -> upload image to Supabase Storage meal_images
    -> insert food_records
    -> insert food_analysis_results
    -> fire-and-forget POST /api/rag/food-records/embed
```

### Image Handling

- JPEG/PNG/WEBP는 그대로 사용하거나 크기가 크면 압축한다.
- HEIC/HEIF는 클라이언트에서 `heic2any`를 사용해 JPEG로 변환한다.
- 큰 이미지는 `browser-image-compression`으로 압축한다.
- 서버 저장 시 `meal_images/{user_id}/{food_record_id}-{timestamp}.{ext}` 형태로 업로드한다.
- Supabase Storage public URL을 `food_records.image_url`에 저장한다.

## 6. Food Analysis

### Gemini Result

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

### Fallback Result

Gemini 호출 실패, timeout, rate limit, invalid content 등의 상황에서는 fallback 추정치를 반환한다.

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

Fallback 결과는 UI에서 경고 배지로 표시되며, 사용자가 최종 저장 전에 수치를 수정할 수 있다.

## 7. Database And Storage

### Core Tables

- `user_profiles`
- `food_records`
- `food_analysis_results`
- `emotion_tags`
- `context_tags`
- `health_connect_daily_summaries`
- `weight_logs`
- `weight_predictions`
- `rag_documents`
- `embedding_failure_logs`
- `chat_sessions`
- `chat_messages`

### Important Columns

- `food_records.emotion`
- `food_records.context`
- `food_records.image_url`
- `food_analysis_results.analysis_source`
- `rag_documents.embedding vector(768)`
- `embedding_failure_logs.failure_reason`

### Storage

- Bucket: `meal_images`
- Purpose: 식사 이미지 원본 또는 변환/압축 이미지 보관
- DB reference: `food_records.image_url`

## 8. RAG Architecture

### Files

- `app/api/rag/food-records/embed/route.ts`
- `app/api/rag/food-records/re-embed/route.ts`
- `app/api/rag/search/route.ts`
- `app/api/rag/coach/route.ts`
- `app/api/rag/status/route.ts`
- `lib/ai/embedding.ts`
- `lib/repositories/rag-document-repository.ts`
- `lib/services/food-record-embedding-service.ts`
- `lib/services/rag-search-service.ts`
- `lib/services/retrieval-service.ts`
- `lib/services/health-coach-chat-service.ts`
- `lib/services/embedding-failure-log-service.ts`
- `lib/rag/health-coach-prompt.ts`

### Embedding Flow

```txt
food_record_id
  -> fetch food_records + food_analysis_results
  -> exclude analysis_source = fallback
  -> build strict natural language content
  -> Gemini text-embedding-004
  -> upsert rag_documents
```

### Content Format

```txt
2026-06-04 저녁 식사.
스트레스 상태에서 야식으로 비빔밥을 섭취.
총 650kcal.
탄수화물 85g.
단백질 25g.
지방 15g.
사용자 메모: 야근 후 허기가 심했음.
```

### Re-embedding

`POST /api/rag/food-records/re-embed`는 `food_record_ids` 배열을 받아 기존 `rag_documents`를 삭제한 뒤 동일 포맷으로 다시 content와 embedding을 생성한다.

### RAG Status

`GET /api/rag/status` 반환값:

```json
{
  "total_documents": 100,
  "embedded_documents": 92,
  "missing_embeddings": 8,
  "embedding_rate": 92,
  "recent_50": {
    "embedded_documents": 47,
    "missing_embeddings": 3
  }
}
```

## 9. Coach Architecture

### Flow

```txt
Question
  -> create query embedding
  -> pgvector match_rag_documents RPC
  -> Top K context
  -> Gemini health coach prompt
  -> structured Korean markdown answer
  -> chat_sessions/chat_messages save
```

### Fallback

- pgvector 검색 실패 또는 결과 없음: 최근 food_records 기반 fallback context 사용
- Gemini 답변 실패: rule-based fallback answer 사용

Frontend는 답변을 섹션/불릿 형태로 렌더링해 긴 텍스트를 읽기 쉽게 표시한다.

## 10. Dashboard Architecture

### Files

- `app/dashboard/page.tsx`
- `app/dashboard/dashboard-client.tsx`

### Data Sources

- `/api/meals`
- `/api/rag/status`

### Data Mapping

- 최근 7일 `food_analysis_results.calories`를 Recharts BarChart 데이터로 변환한다.
- 탄수화물/단백질/지방 합계를 Pie 또는 Bar 데이터로 변환한다.
- `image_url`이 있으면 Next.js `Image`로 썸네일을 렌더링한다.
- RAG 상태 카드의 새로고침 버튼이 `/api/rag/status`를 다시 호출한다.

## 11. Profile And Weight Prediction

### Files

- `app/profile/page.tsx`
- `app/prediction/page.tsx`
- `components/prediction/prediction-client.tsx`
- `app/api/profile/route.ts`
- `app/api/weight-logs/route.ts`
- `lib/prediction/weight.ts`
- `lib/prediction/weight.test.ts`
- `lib/validation/user-profile.ts`
- `lib/validation/weight-logs.ts`

### Calculation

- BMR
- TDEE
- Daily energy balance
- Daily weight delta
- 7-day forecast
- 30-day forecast
- Target weight ETA

### Persistence

- `user_profiles`: height, age, gender, target weight
- `weight_logs`: current weight over time

## 12. API Summary

| API | Method | Purpose |
| --- | --- | --- |
| `/api/health` | GET | service health check |
| `/api/meals` | GET | list user meal records |
| `/api/meals` | POST | save confirmed meal and analysis |
| `/api/meals/analyze` | POST | analyze meal before saving |
| `/api/profile` | GET/POST | load and save user profile |
| `/api/weight-logs` | GET/POST | load and save weight logs |
| `/api/rag/food-records/embed` | POST | embed food records |
| `/api/rag/food-records/re-embed` | POST | delete and recreate embeddings |
| `/api/rag/search` | POST | pgvector similarity search |
| `/api/rag/coach` | POST | RAG health coach answer |
| `/api/rag/status` | GET | embedding status diagnostics |
| `/api/auth/logout` | POST | logout |

## 13. Testing

Unit tests are implemented for the weight prediction engine.

```bash
npm test -- --run
```

Build verification:

```bash
npm run build
```

## 14. Deployment Notes

- GitHub repository: `sharon-e-0/FitRAG`
- Production URL: `https://fit-rag.vercel.app`
- Required Vercel environment variables include Supabase URL, Supabase anon key, Gemini API key, and app URL.
- Supabase redirect URL must include `https://fit-rag.vercel.app/auth/callback`.
