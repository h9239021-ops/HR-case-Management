# 사업장 사건관리 대시보드

비위행위 / 직장 내 괴롭힘 / 직장 내 성희롱 사건을 접수부터 조사, 보고서, 인사위원회, 결과통보까지 관리하는 팀 공용 대시보드입니다.
GitHub Pages(화면) + Supabase(데이터베이스, 실시간 공유) + Claude API(AI 초안 생성) 조합으로 동작합니다.

## 1. Supabase 설정

1. 기존 연차정산 프로그램이 쓰는 Supabase 프로젝트를 그대로 사용합니다.
2. Supabase 대시보드 → **SQL Editor** → 새 쿼리에 `supabase_schema.sql` 내용을 붙여넣고 Run
   (기존 테이블은 건드리지 않고 `hr_case_` 접두어 테이블 3개만 추가됩니다)
3. Supabase 대시보드 → **Authentication → Providers**에서 Email 로그인이 켜져있는지 확인
4. **Authentication → Users → Add user**에서 팀원별 계정을 직접 만들어주세요 (이메일+임시비밀번호). 회원가입 화면은 따로 없고, 관리자가 만들어준 계정으로만 로그인됩니다.
5. **Project Settings → API**에서 `Project URL`과 `anon public` 키를 확인하세요.

## 2. 코드 설정

`config.js` 파일을 열어 아래 두 값을 채워주세요.

```js
window.SUPABASE_URL = "https://xxxx.supabase.co";
window.SUPABASE_ANON_KEY = "eyJ...";
```

`anon public` 키는 공개되어도 안전한 키입니다 (실제 데이터 보호는 Supabase의 Row Level Security가 담당하며, 로그인하지 않으면 아무것도 조회/수정할 수 없게 막아두었습니다).

## 3. GitHub Pages 배포

1. 새 GitHub 저장소를 만들고 이 폴더의 파일 전체(`index.html`, `style.css`, `app.js`, `config.js`)를 업로드
2. 저장소 **Settings → Pages**에서 브랜치를 `main`(또는 사용 중인 브랜치), 폴더를 `/ (root)`로 설정 후 저장
3. 몇 분 뒤 `https://<계정명>.github.io/<저장소명>/`으로 접속 가능

> ⚠️ 조사 내용에 실명·민감정보가 포함되므로, 저장소는 반드시 **Private**로 만드세요. (Private 저장소의 GitHub Pages 공개범위는 요금제에 따라 다르니, Organization 설정에서 "Pages visibility"를 확인해주세요.)

## 4. 앱 사용법

1. 배포된 URL 접속 → Supabase에서 만들어준 이메일/비밀번호로 로그인
2. 우측 상단 **⚙️ 설정**에서 본인의 **Claude API 키**와 **모델명**을 입력 (브라우저에만 저장되며, AI 호출 비용은 이 키로 청구됩니다)
3. **비위행위 조사** 탭에서 사건 등록 → AI로 조사계획 생성 → 수정 → 수락
4. **조사 결과** 탭에서 보고서 작성 → 확정 → Word 다운로드
5. **인사위원회 개최** 탭에서 공문/출석통지서 생성 → Word 다운로드
6. **결과 통보** 탭에서 최종 징계결과 입력 → 메일·통보서 생성 → 사건 종결 처리
7. **요약** 탭에서 전체 사건 누적 현황 확인 (클릭 시 상세보기)

## 참고 / 한계

- Word 다운로드는 실제 `.docx`가 아니라 Word에서 정상적으로 열리는 `.doc`(HTML 기반) 파일입니다. 여는 경고가 뜰 수 있으나 내용은 정상입니다.
- Claude API 모델명은 시간이 지나면 바뀔 수 있어 최신값을 [Anthropic 문서](https://docs.claude.com)에서 확인해 설정에 입력해주세요.
- 이 앱은 브라우저에서 Anthropic API를 직접 호출합니다(`anthropic-dangerous-direct-browser-access` 헤더 사용). API 키는 각자 브라우저에만 저장되고 서버로 전송되지 않습니다.
- 팀원 계정 추가/삭제, 비밀번호 재설정은 Supabase Authentication 화면에서 관리자가 직접 처리합니다.
