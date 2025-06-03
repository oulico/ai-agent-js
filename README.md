# AI Agent Practice

OpenAI Function Calling을 활용한 AI 에이전트 학습 프로젝트입니다.

## 목표

- OpenAI Function Calling 구현 및 활용
- 실무에 적용 가능한 AI 에이전트 패턴 학습
- 에러 핸들링 및 최적화 기법 습득

## 학습 진행 상황

**Phase 1: 기초**
- [x] OpenAI API 기본 사용법
- [x] Function Calling 구현
- [x] 기본 에러 해결

**Phase 2: 심화** (진행중)
- [ ] 다중 함수 호출
- [ ] 스트리밍 구현
- [ ] 고급 에러 핸들링

**Phase 3: 실무 적용**
- [ ] RAG 시스템 연동
- [ ] 메모리 관리
- [ ] 성능 최적화

## 구현된 기능

- 기본 채팅 인터페이스
- 사용자 정보 조회 함수
- Function Calling 4단계 플로우

## 사용법

```bash
npm install
cp .env.example .env
# .env 파일에 OPENAI_API_KEY 설정
node src/index.js
