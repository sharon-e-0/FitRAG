# FitRAG PRD

## 1. Product Overview

FitRAG는 사용자의 식사 텍스트, 식사 이미지, 감정 상태, 식사 상황, 체중 기록, 목표 체중을 통합하여 개인화 건강 코칭과 체중 예측을 제공하는 AI 건강 관리 웹 애플리케이션이다.

현재 제품은 Next.js 기반 웹앱으로 구현되어 있으며, Supabase Auth/Database/Storage와 Gemini API를 사용한다.

## 2. Goals

- 식사 이미지를 업로드하거나 음식명을 입력하면 AI가 칼로리와 영양소를 분석한다.
- AI 분석 결과를 사용자가 저장 전에 확인하고 수정할 수 있게 한다.
- 검증된 식사 기록만 개인 RAG 문서로 전환하여 코칭 품질을 높인다.
- 감정/상황 태그와 식사 기록을 연결하여 식습관 패턴을 확인한다.
- 체중, 키, 목표 체중을 기반으로 7일/30일 체중 변화를 예측한다.
- 모바일과 데스크톱에서 사용할 수 있는 밝고 친근한 헬스케어 UI를 제공한다.

## 3. Target Users

- 매일 식사 기록을 간단히 남기고 싶은 사용자
- 음식 사진만으로 대략적인 영양 정보를 확인하고 싶은 사용자
- 감정과 식습관의 관계를 알고 싶은 사용자
- 목표 체중까지의 변화를 예측하고 싶은 사용자
- 자신의 식사 기록을 기반으로 AI 코칭을 받고 싶은 사용자

## 4. Core User Flows

### 4.1 Google Login

1. 사용자는 `/login`에서 Google 로그인을 선택한다.
2. Supabase Auth가 Google OAuth를 처리한다.
3. `/auth/callback`에서 OAuth code를 세션으로 교환한다.
4. 인증 성공 후 사용자는 `/dashboard` 등 보호 페이지에 접근한다.
5. OAuth code가 실수로 `/`로 들어온 경우에도 `/auth/callback`으로 전달되어 세션 교환을 시도한다.

### 4.2 Meal Analysis And Save

1. 사용자는 `/meals/new`에서 식사 유형, 시간, 감정, 상황, 메모를 입력한다.
2. 음식명을 텍스트로 입력하거나 이미지를 업로드한다.
3. 사용자는 `AI 분석 및 확인` 버튼을 누른다.
4. `/api/meals/analyze`가 Gemini 2.5 Flash 분석을 시도한다.
5. 분석 결과가 화면 하단 Input 필드로 표시된다.
6. 사용자는 음식명, 칼로리, 탄수화물, 단백질, 지방, 당, 나트륨을 직접 수정할 수 있다.
7. 결과가 fallback이면 경고 배지가 표시된다.
8. 사용자가 `최종 저장`을 누를 때만 `/api/meals`가 호출되어 DB에 저장된다.

### 4.3 Image Upload

1. 사용자는 JPEG/PNG/WEBP/HEIC/HEIF 이미지를 선택한다.
2. 클라이언트에서 HEIC/HEIF는 JPEG로 변환된다.
3. 큰 이미지는 브라우저에서 압축된다.
4. 저장 시 Supabase Storage의 `meal_images` 버킷에 업로드된다.
5. 공개 URL이 `food_records.image_url`에 저장된다.
6. Dashboard 식사 목록에 썸네일이 표시된다.

### 4.4 Dashboard

Dashboard는 다음 정보를 제공한다.

- 오늘의 식단 및 최근 식사 목록
- 실제 저장된 식사 분석 결과 기반 칼로리 요약 차트
- 실제 저장된 식사 분석 결과 기반 영양소 차트
- 감정 분석 리포트
- RAG 임베딩 상태 카드와 새로고침 버튼
- 최근 임베딩 실패 로그
- AI 코치 채팅 진입점
- 체중 예측 그래프

### 4.5 RAG Health Coach

1. 사용자는 `/coach`에서 질문을 입력한다.
2. 시스템은 질문을 text-embedding-004로 임베딩한다.
3. pgvector similarity search로 관련 `rag_documents`를 검색한다.
4. Top K 문서를 Gemini 프롬프트에 포함한다.
5. Gemini가 구조화된 한국어 코칭 답변을 생성한다.
6. pgvector 검색 결과가 없으면 최근 식사 기록 fallback 컨텍스트를 사용한다.
7. Gemini 답변 실패 시 rule-based fallback 답변을 제공한다.

### 4.6 Profile And Weight Prediction

1. 사용자는 `/profile` 또는 `/prediction`에서 키, 나이, 성별, 현재 체중, 목표 체중을 입력한다.
2. 프로필 정보는 `user_profiles`에 저장된다.
3. 현재 체중은 `weight_logs`에 저장된다.
4. 사용자는 Health Connect 모바일 연동 전까지 오늘 운동으로 소모한 칼로리를 수동 입력한다.
5. 수동 운동 칼로리는 `health_connect_daily_summaries`에 오늘 날짜 기준으로 upsert된다.
6. 예측 엔진은 BMR, 활동계수 기반 TDEE, 수동 운동 소모 칼로리, 에너지 수지를 계산한다.
7. 7일/30일 예측 체중과 목표 체중 도달 예상일을 표시한다.

## 5. Functional Requirements

### 5.1 Authentication

- Google OAuth 로그인을 제공해야 한다.
- Supabase 세션 쿠키를 유지해야 한다.
- 보호 페이지는 인증된 사용자만 접근해야 한다.
- 미인증 사용자는 `/login?next=...`로 이동해야 한다.
- 로그아웃을 제공해야 한다.

### 5.2 Meal Records

- 식사 유형, 식사 시간, 감정, 상황, 메모를 입력할 수 있어야 한다.
- 텍스트 음식명 또는 식사 이미지를 입력할 수 있어야 한다.
- 저장 전 AI 분석 결과를 확인하고 수정할 수 있어야 한다.
- 최종 저장 전에는 DB insert가 발생하지 않아야 한다.
- 저장된 이미지는 Supabase Storage에 보관하고 URL을 DB에 저장해야 한다.

### 5.3 Food Analysis

- Gemini 2.5 Flash 기반 이미지/텍스트 분석을 지원해야 한다.
- 분석 결과는 calories, carbs, protein, fat, sugar, sodium, food_name을 포함해야 한다.
- Gemini 실패 시 fallback 추정치를 반환해야 한다.
- fallback 결과는 사용자 확인을 유도해야 한다.
- fallback 분석 결과는 RAG 임베딩 대상에서 제외해야 한다.

### 5.4 RAG

- 검증된 Gemini 분석 식사 기록을 자연어 문서로 변환해야 한다.
- content에는 날짜, 식사 유형, 음식명, 칼로리, 탄수화물, 단백질, 지방, 감정, 상황, 메모를 포함해야 한다.
- text-embedding-004 임베딩을 생성해야 한다.
- pgvector에 저장하고 유사도 검색을 제공해야 한다.
- 특정 food_record_id 배열을 받아 재임베딩할 수 있어야 한다.
- 임베딩 실패 원인과 로그를 저장해야 한다.

### 5.5 Dashboard

- `/api/meals` 결과를 기반으로 최근 식사 목록과 차트를 렌더링해야 한다.
- `image_url`이 있으면 썸네일을 표시해야 한다.
- RAG 상태를 `/api/rag/status`로 새로고침할 수 있어야 한다.
- 감정/상황 태그를 컬러풀한 뱃지로 표시해야 한다.
- 체중 예측 차트는 저장된 프로필, 최신 체중, 오늘 수동 운동 칼로리를 반영해야 한다.

### 5.6 Weight Prediction

- 사용자 프로필과 체중 기록을 저장해야 한다.
- 오늘 운동 소모 칼로리를 수동 입력하고 저장할 수 있어야 한다.
- 수동 운동 칼로리는 Health Connect 대체 데이터로 `health_connect_daily_summaries`에 저장해야 한다.
- BMR/TDEE/에너지 수지를 계산해야 하며 TDEE에는 수동 운동 소모 칼로리가 반드시 포함되어야 한다.
- 7일/30일 체중 예측을 제공해야 한다.
- 목표 체중 도달 예상일을 계산해야 한다.

## 6. Non-Functional Requirements

- Next.js 14 App Router를 사용한다.
- TypeScript를 사용한다.
- TailwindCSS와 shadcn 스타일 컴포넌트를 사용한다.
- Supabase PostgreSQL, Storage, Auth를 사용한다.
- pgvector를 사용한다.
- Zod로 API 입력을 검증한다.
- AI API 실패 시 사용자 흐름이 완전히 막히지 않아야 한다.
- RLS 정책과 서버 측 인증 검증을 고려해야 한다.
- 모바일 반응형 UI를 제공해야 한다.

## 7. Current Limitations

- Health Connect SDK 실기기 연동은 아직 구현되지 않았다.
- Health Connect 실기기 연동 전까지 활동 소모 칼로리는 수동 입력으로 대체한다.
- 다중 음식 분리 분석은 단일 통합 영양 추정으로 처리된다.
- fallback 영양 추정값은 정확한 분석값이 아니므로 사용자 확인이 필요하다.
- Google OAuth는 모바일 앱 내부 브라우저/WebView에서 차단될 수 있으며 Chrome/Safari 사용이 필요하다.

## 8. Success Criteria

- 사용자가 Google 로그인 후 Dashboard에 접근할 수 있다.
- 텍스트 또는 이미지 식사를 분석하고, 결과를 확인/수정한 뒤 저장할 수 있다.
- 저장된 이미지가 Dashboard에 썸네일로 표시된다.
- Gemini 분석 식사 기록은 RAG 문서로 임베딩된다.
- fallback 분석 식사는 RAG 문서 오염 방지를 위해 임베딩되지 않는다.
- AI 코치가 개인 식사 기록 기반 답변을 제공한다.
- 사용자가 프로필과 체중 기록을 저장하고 체중 예측을 확인할 수 있다.
