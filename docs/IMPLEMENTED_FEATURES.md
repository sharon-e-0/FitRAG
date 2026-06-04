# FitRAG Implemented Features

## 1. 현재 구현 완료 기능 요약

FitRAG 프로젝트에서 현재 코드와 배포 기준으로 구현된 기능은 다음과 같다.

## 2. 인증

### 구현 완료

- Supabase Auth 기반 Google OAuth 로그인
- OAuth callback 처리
- 세션 쿠키 유지
- 로그아웃 API
- 로그아웃 버튼
- middleware 기반 보호 라우트
- API Route Handler 인증 검증

### 관련 경로

- `/login`
- `/auth/callback`
- `/api/auth/logout`
- `/dashboard`
- `/meals/new`
- `/coach`
- `/prediction`

## 3. 식사 등록

### 구현 완료

- 식사 유형 선택
- 식사 시간 입력
- 감정 선택
- 상황 선택
- 텍스트 식사 기록 입력
- 이미지 업로드
- 저장 시 자동 영양 분석
- 분석 결과 DB 저장
- 저장 후 Dashboard 이동
- RAG 임베딩 API fire-and-forget 호출

### 지원 이미지

- JPEG
- PNG
- WEBP

### 미지원 이미지

- HEIC
- HEIF

## 4. 음식 분석

### Gemini 분석

Gemini 2.5 Flash를 사용하여 음식명/이미지 기반 영양소를 계산한다.

출력 항목:

- calories
- carbs
- protein
- fat
- sugar
- sodium
- food_name

### fallback 분석

Gemini가 실패해도 사용자가 저장을 못 하는 일이 없도록 fallback 추정값을 반환한다.

fallback 특징:

- 키워드 기반 음식 추정
- 이미지 단독인 경우 일반 식사 추정값 사용
- 결과에 `analysis_source: fallback` 표시
- UI에 `estimated` 배지 표시

## 5. 데이터 저장

### food_records

저장 항목:

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

저장 항목:

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
- raw_ai_response

## 6. Dashboard

### 구현 완료

- 저장된 식사 목록 조회
- 분석된 칼로리 표시
- 분석 전 식사는 `Pending analysis` 표시
- RAG 임베딩 상태 카드
- 최근 임베딩 실패 로그 표시
- 칼로리 요약 차트
- 영양소 차트
- 체중 예측 그래프
- 감정 분석 리포트
- AI 코치 채팅 UI

### 주의

일부 차트는 아직 샘플 데이터 기반이다.

## 7. RAG

### 구현 완료

- 식사 기록 기반 RAG 문서 생성
- 자연어 content 생성
- text-embedding-004 임베딩 생성
- Supabase pgvector 저장
- similarity search API
- RAG 코치 API
- 검색 실패 시 최근 식사 기록 fallback
- Gemini 답변 실패 시 rule-based fallback
- RAG 상태 점검 API
- 임베딩 실패 로그 저장 구조

### rag_documents.content 포함 정보

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

## 8. AI 코치

### 구현 완료

- 사용자 질문 입력
- 질문 임베딩 생성
- pgvector 검색
- Top K 문서 추출
- Gemini 프롬프트 구성
- 답변 생성
- 채팅 세션 저장
- 채팅 메시지 저장

## 9. 체중 예측

### 구현 완료

- BMR 계산
- TDEE 계산
- 에너지 수지 계산
- 누적 칼로리 기반 체중 변화 계산
- 7일 예측
- 30일 예측
- 목표 체중 도달일 계산
- Unit Test 작성

## 10. API 구현 현황

| API | Method | 상태 | 설명 |
| --- | --- | --- | --- |
| `/api/health` | GET | 완료 | 서비스 상태 확인 |
| `/api/meals` | GET | 완료 | 식사 기록 조회 |
| `/api/meals` | POST | 완료 | 식사 및 분석 결과 저장 |
| `/api/meals/analyze` | POST | 완료 | 음식 분석 및 fallback |
| `/api/rag/food-records/embed` | POST | 완료 | 식사 기록 임베딩 |
| `/api/rag/search` | POST | 완료 | pgvector 검색 |
| `/api/rag/coach` | POST | 완료 | RAG 코치 답변 |
| `/api/rag/status` | GET | 완료 | RAG 상태 진단 |
| `/api/auth/logout` | POST | 완료 | 로그아웃 |

## 11. 검증된 항목

### 빌드

```bash
npm run build
```

통과.

### 테스트

```bash
npm test -- --run
```

결과:

```txt
Test Files: 1 passed
Tests: 6 passed
```

### 배포

GitHub main branch push 후 Vercel deployment success 확인.

## 12. 아직 미구현 또는 개선 필요

- Supabase Storage 이미지 원본 저장
- food_records.image_url 실제 저장
- Health Connect SDK 실제 연동
- Dashboard 차트의 실데이터 전환
- 기존 food_records 전체 재임베딩 API
- Gemini 실패 원인에 대한 서버 로그 대시보드
- 이미지 다중 음식 분리 분석
- 음식 분석 결과 수동 수정 UI
- 체중 기록 저장/조회 UI
- 관리자 전용 권한 체계

## 13. 현재 사용자 테스트 시 기대 동작

### 텍스트 저장

```txt
비빔밥, 콜라, 계란후라이
```

저장 시 자동 분석 후 칼로리와 영양소가 저장된다.

### 이미지 저장

JPEG/PNG/WEBP 이미지를 업로드하고 저장하면 Gemini 분석을 먼저 시도한다.

Gemini 실패 시에도 fallback 추정값으로 저장된다.

### Dashboard

저장된 식사와 분석 칼로리가 표시된다.
