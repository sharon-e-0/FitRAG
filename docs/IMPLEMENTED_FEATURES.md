# FitRAG Implemented Features

## 1. Summary

FitRAG는 현재 Google OAuth 로그인, 식사 이미지/텍스트 분석, 사용자 확인 후 저장, Supabase Storage 이미지 저장, RAG 건강 코치, RAG 상태 진단, 프로필/체중 기록, 체중 예측, Dashboard 시각화를 제공한다.

## 2. Authentication

### Implemented

- Supabase Auth 기반 Google OAuth 로그인
- OAuth callback 처리
- `/`로 들어온 OAuth code 보정 처리
- 세션 쿠키 유지
- Supabase `getUser()` 기반 middleware 보호
- 로그아웃 API와 버튼
- API Route Handler 인증 검증

### Routes

- `/login`
- `/auth/callback`
- `/api/auth/logout`
- `/dashboard`
- `/meals/new`
- `/coach`
- `/prediction`
- `/profile`

## 3. Meal Registration

### Implemented

- 식사 유형 선택
- 식사 시간 입력
- 감정 선택
- 상황 선택
- 텍스트 식사 기록 입력
- 이미지 업로드
- HEIC/HEIF 클라이언트 변환
- 이미지 압축
- AI 분석 및 확인 단계
- 분석 결과 Input 필드 수정
- fallback 결과 경고 배지 표시
- 최종 저장 단계에서만 DB insert
- 저장 후 Dashboard 이동
- 저장된 과거 식사 기록 수정 모달
- 과거 식사 수정 후 RAG 재임베딩 순차 처리

### Supported Image Inputs

- JPEG
- PNG
- WEBP
- HEIC
- HEIF

## 4. Food Analysis

### Gemini Analysis

Gemini 2.5 Flash를 사용하여 텍스트 또는 이미지 기반 영양소를 분석한다.

Output:

- food_name
- calories
- carbs
- protein
- fat
- sugar
- sodium
- analysis_source

### Fallback Analysis

Gemini 분석 실패 시 fallback 추정값을 반환한다.

Fallback 특징:

- 저장 흐름이 막히지 않음
- `analysis_source: fallback`
- UI 경고 배지 표시
- 사용자 수동 수정 가능
- RAG 임베딩 대상에서는 제외
- 과거 fallback 기록을 사용자가 수정하면 `analysis_source: user_edit`으로 전환되어 RAG 임베딩 대상에 포함

## 5. Data Storage

### food_records

Stored fields include:

- user_id
- input_type
- meal_type
- emotion
- context
- raw_text
- image_url
- memo
- eaten_at

### food_analysis_results

Stored fields include:

- food_record_id
- user_id
- food_name
- calories
- carbohydrate_g
- protein_g
- fat_g
- sugar_g
- sodium_mg
- confidence_score
- analysis_source
- raw_ai_response

### Supabase Storage

- Bucket: `meal_images`
- Uploaded meal image public URL is saved to `food_records.image_url`.

## 6. Dashboard

### Implemented

- 저장된 식사 목록 조회
- 저장된 식사 카드 수정 버튼
- Edit Meal Dialog
- 음식명/칼로리/탄수화물/단백질/지방/당/나트륨/감정/상황/메모 수정
- 식사 이미지 썸네일 표시
- 분석된 칼로리 표시
- 분석 전 식사는 `Pending analysis` 표시
- 최근 7일 실제 식사 기록 기반 칼로리 차트
- 실제 식사 분석 결과 기반 영양소 차트
- RAG 임베딩 상태 카드
- RAG 상태 새로고침 버튼
- 최근 임베딩 실패 로그 표시
- 체중 예측 그래프
- 가입 경과일 기반 일평균 섭취 칼로리 계산
- 감정 분석 리포트
- AI 코치 채팅 UI
- 파스텔/비비드 헬스케어 테마

## 7. RAG Pipeline

### Implemented

- 식사 기록 기반 RAG 문서 생성
- 자연어 content 생성
- Gemini text-embedding-004 임베딩 생성
- Supabase pgvector 저장
- similarity search API
- RAG 코치 API
- fallback 분석 결과 임베딩 제외
- user_edit 분석 결과 RAG 임베딩 포함
- food_record_id 배열 기반 재임베딩 API
- 검색 실패 시 최근 식사 기록 fallback context
- Gemini 답변 실패 시 rule-based fallback
- RAG 상태 점검 API
- 임베딩 실패 로그 저장

### rag_documents.content Includes

- 날짜
- 식사 유형
- 음식명
- 칼로리
- 탄수화물
- 단백질
- 지방
- 감정
- 상황
- 메모

## 8. AI Coach

### Implemented

- 사용자 질문 입력
- 질문 임베딩 생성
- pgvector Top K 검색
- Gemini 프롬프트 구성
- 구조화된 한국어 답변 생성
- 답변 UI 가독성 개선
- 채팅 세션 저장
- 채팅 메시지 저장

## 9. Profile And Weight Prediction

### Implemented

- 키 입력
- 나이 입력
- 성별 선택
- 현재 체중 입력
- 목표 체중 입력
- 오늘 운동 소모 칼로리 수동 입력
- `user_profiles` 저장
- `weight_logs` 저장
- `health_connect_daily_summaries`에 오늘 활동 칼로리 upsert
- BMR 계산
- 수동 운동 칼로리를 포함한 TDEE 계산
- 최근 7일 총섭취 칼로리 / 가입 경과일 기반 일평균 섭취 칼로리 계산
- 에너지 수지 계산
- 누적 칼로리 기반 체중 변화 계산
- 7일 예측
- 30일 예측
- 목표 체중 도달일 계산
- Dashboard 체중 예측 차트 실데이터 바인딩
- 식사 수정 시 체중 예측 차트 즉시 재계산
- Unit Test 작성

## 10. API Status

| API | Method | Status | Description |
| --- | --- | --- | --- |
| `/api/health` | GET | Done | 서비스 상태 확인 |
| `/api/meals` | GET | Done | 식사 기록 조회 |
| `/api/meals` | POST | Done | 확인된 식사 및 분석 결과 저장 |
| `/api/meals` | PATCH | Done | 저장된 식사 및 영양 분석 수정 |
| `/api/meals/analyze` | POST | Done | 저장 전 음식 분석 및 fallback |
| `/api/profile` | GET/POST | Done | 프로필 조회/저장 |
| `/api/weight-logs` | GET/POST | Done | 체중 기록 및 오늘 운동 칼로리 조회/저장 |
| `/api/rag/food-records/embed` | POST | Done | 식사 기록 임베딩 |
| `/api/rag/food-records/re-embed` | POST | Done | 식사 기록 재임베딩 |
| `/api/rag/search` | POST | Done | pgvector 검색 |
| `/api/rag/coach` | POST | Done | RAG 코치 답변 |
| `/api/rag/status` | GET | Done | RAG 상태 진단 |
| `/api/auth/logout` | POST | Done | 로그아웃 |

## 11. Verified

### Build

```bash
npm run build
```

Passed.

### Unit Test

```bash
npm test -- --run
```

Result:

```txt
Test Files: 1 passed
Tests: 6 passed
```

### Deployment

GitHub `main` branch push 후 Vercel 자동 배포 구조로 운영한다.

## 12. Remaining Work

- Health Connect SDK 실기기 동기화
- Health Connect 실기기 동기화 후 수동 활동 칼로리와 자동 활동 데이터 병합 정책
- 다중 음식 개별 분리 분석
- 관리자 전용 권한 체계
- 더 정교한 영양 DB 기반 fallback
- 비공개 Storage URL 또는 signed URL 전환
- Google OAuth 앱 Production 전환 및 검증 상태 정리

## 13. Expected User Test Behavior

### Text Meal

```txt
비빔밥, 콜라, 계란후라이
```

`AI 분석 및 확인` 후 영양소가 표시되고, 사용자가 수치를 수정한 뒤 `최종 저장`하면 DB에 저장된다.

### Image Meal

JPEG/PNG/WEBP/HEIC 이미지를 업로드하면 클라이언트 변환/압축 후 분석된다. 저장 시 Supabase Storage에 이미지가 저장되고 Dashboard에 썸네일이 표시된다.

### RAG Coach

Gemini 분석으로 저장된 식사 기록은 RAG 문서로 임베딩되어 코치 답변의 근거로 사용된다. fallback 분석 기록은 RAG 오염 방지를 위해 임베딩하지 않는다.
