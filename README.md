# FE-Cron - Angular Security Advisories Monitor

Angular 프레임워크의 보안 권고사항(Security Advisories)을 자동으로 모니터링하고 Google Chat으로 알림을 보내는 GitHub Actions 기반 크론 작업입니다.

## 📋 기능

- **자동 모니터링**: 매일 오전 8시(KST)에 Angular 보안 권고사항을 자동으로 확인
- **신규 이슈 감지**: 이전에 확인된 이슈와 비교하여 새로운 보안 권고사항만 감지
- **Google Chat 알림**: 신규 보안 이슈 발견 시 자동으로 Google Chat에 알림 전송
- **이력 관리**: 확인된 권고사항을 저장소에 자동으로 기록

## 🚀 설정 방법

### 1. Google Chat Webhook 설정

1. Google Chat에서 알림을 받을 스페이스(채팅방)를 선택
2. 스페이스 이름 옆 ▼ 클릭 → **앱 및 통합 관리** 선택
3. **Webhook** 검색 및 추가
4. Webhook 이름 입력 (예: "Angular Security Monitor")
5. 생성된 Webhook URL 복사

### 2. GitHub Repository Secret 설정

1. GitHub 저장소의 **Settings** → **Secrets and variables** → **Actions** 이동
2. **New repository secret** 클릭
3. 다음 Secret 추가:
   - Name: `GOOGLE_CHAT_WEBHOOK`
   - Value: 위에서 복사한 Webhook URL

> **💡 참고**: GitHub Secrets는 GitHub Actions에서만 사용됩니다. 로컬 개발 환경에서는 `.env` 파일을 별도로 생성해야 합니다.

### 3. GitHub Actions 권한 설정

1. GitHub 저장소의 **Settings** → **Actions** → **General** 이동
2. **Workflow permissions** 섹션에서:
   - ✅ **Read and write permissions** 선택
   - ✅ **Allow GitHub Actions to create and approve pull requests** 체크

## 📁 프로젝트 구조

```
FE-Cron/
├── .github/
│   └── workflows/
│       └── check-angular-security.yml  # GitHub Actions 워크플로우
├── scripts/
│   └── check-advisories.js             # 보안 권고사항 확인 스크립트
├── data/
│   ├── .gitkeep
│   └── advisories.json                 # 확인된 권고사항 이력 (자동 생성)
├── package.json
├── .gitignore
└── README.md
```

## 🔧 로컬 테스트

### 사전 준비

PNPM 설치 (미설치 시):

```bash
npm install -g pnpm
# 또는
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### 의존성 설치

```bash
pnpm install
```

### 환경변수 설정

**방법 1: `.env` 파일 생성 (추천)**

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가:

```env
GOOGLE_CHAT_WEBHOOK=your-webhook-url-here
```

**방법 2: 터미널에서 직접 설정**

```bash
export GOOGLE_CHAT_WEBHOOK="your-webhook-url-here"
```

**방법 3: 실행 시 직접 전달**

```bash
GOOGLE_CHAT_WEBHOOK="your-webhook-url-here" pnpm check
```

### 스크립트 실행

```bash
pnpm check
```

## ⏰ 실행 일정

- **자동 실행**: 매일 오전 8시 (KST / 한국 시간)
- **수동 실행**: GitHub Actions 탭에서 "Run workflow" 버튼으로 즉시 실행 가능

## 📊 작동 원리

1. **환경 감지**:
   - GitHub Actions 환경: Secret에서 Webhook URL 자동 로드
   - 로컬 환경: `.env` 파일에서 Webhook URL 로드
2. **데이터 수집**: GitHub API를 통해 Angular 저장소의 보안 권고사항 목록 가져오기
3. **신규 이슈 확인**: `data/advisories.json` 파일과 비교하여 새로운 권고사항 식별
4. **알림 전송**: 신규 이슈가 있을 경우 Google Chat으로 알림 전송
   - 이슈 제목 (Summary)
   - 심각도 (Severity): Critical, High, Medium, Low
   - GHSA ID
   - 게시 날짜
   - 상세보기 링크
5. **이력 업데이트**: 확인된 권고사항을 `data/advisories.json` 파일에 저장하고 커밋

## 📝 알림 메시지 예시

Google Chat에 전송되는 메시지 형식:

```
🚨 새로운 Angular 보안 권고사항이 1건 발견되었습니다!

🔴 Cross-site Scripting in Angular
Severity: HIGH
GHSA ID: GHSA-xxxx-yyyy-zzzz
Published: 2026-01-22 오전 8:00:00
[상세보기 버튼]
```

## 🔍 모니터링 대상

- **URL**: https://github.com/angular/angular/security/advisories
- **API Endpoint**: https://api.github.com/repos/angular/angular/security-advisories

## 🛠️ 문제 해결

### 알림이 전송되지 않는 경우

1. `GOOGLE_CHAT_WEBHOOK` Secret이 올바르게 설정되었는지 확인
2. Webhook URL이 유효한지 확인 (브라우저에서 테스트)
3. GitHub Actions 로그에서 오류 메시지 확인

### 워크플로우가 실행되지 않는 경우

1. GitHub Actions가 활성화되어 있는지 확인
2. Workflow 권한이 올바르게 설정되었는지 확인
3. 저장소가 비공개인 경우 Actions 분당 제한 확인

### 수동 실행 방법

1. GitHub 저장소의 **Actions** 탭 이동
2. **Check Angular Security Advisories** 워크플로우 선택
3. **Run workflow** 버튼 클릭

## 📜 라이선스

MIT License

## 👥 기여

이슈 및 Pull Request를 환영합니다!

## 📦 패키지 매니저

이 프로젝트는 **PNPM**을 사용합니다.

### PNPM의 장점

- ⚡ **빠른 설치 속도**: 하드링크를 사용하여 디스크 공간 절약
- 🔒 **엄격한 의존성 관리**: phantom dependencies 방지
- 💾 **디스크 효율성**: 글로벌 저장소 사용으로 중복 방지

### 주요 명령어

```bash
pnpm install          # 의존성 설치 (pnpm-lock.yaml 생성/업데이트)
pnpm check            # 보안 체크 스크립트 실행
pnpm test             # 테스트 실행
```

### 중요 파일

- **`pnpm-lock.yaml`**: 의존성 잠금 파일 (Git에 포함되어야 함)
  - GitHub Actions에서 정확한 버전 재현을 위해 필수
  - `.gitignore`에서 제외되어 있음

---

수정하지 않습니다.
