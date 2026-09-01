-- ============================================================
-- 사업장 사건관리 대시보드 — Supabase 테이블 추가 스크립트
-- 기존 연차정산 프로그램이 쓰는 테이블은 전혀 건드리지 않습니다.
-- (이름 충돌 방지를 위해 전부 hr_case_ 접두어 사용)
--
-- 사용법: Supabase 대시보드 → SQL Editor → New query →
--        이 파일 전체를 붙여넣고 Run
-- ============================================================

-- 1. 사건 마스터 테이블
create table if not exists hr_case_cases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,

  case_name text not null,
  case_category text not null check (case_category in ('harassment','misconduct')), -- 조사 탭 구분
  case_type text not null check (case_type in ('bullying','sexual_harassment','misconduct')), -- 요약 통계용 세부유형
  department text,
  status text not null default '접수', -- 접수/쟁점정리/조사중/보고서작성/위원회개최/징계확정/종결

  -- 2-1. 직장 내 괴롭힘·성희롱 조사 입력
  reporter text,
  report_date date,
  report_content text,

  -- 2-2. 비위행위 조사 입력
  incident_date date,
  incident_content text,
  additional_investigation_need text,

  -- 조사계획 (AI 생성 → 수정 → 수락)
  plan_accepted boolean not null default false,

  -- 3. 조사결과보고서
  report_draft text,
  report_confirmed boolean not null default false,
  acknowledgment text,       -- 괴롭힘/성희롱: 인정여부 / 비위행위: 사실관계 확정
  discipline_review text,    -- 공통: 징계수준 검토의견

  -- 4. 인사위원회
  committee_date timestamptz,
  committee_location text,
  committee_members text,
  committee_notice_text text,
  attendance_notice_text text,
  resolution_text text,      -- 심의·의결서

  -- 5. 결과통보
  email_reporter_draft text,
  email_accused_draft text,
  result_notice_text text,
  final_discipline text
);

-- 2. 조사대상자 테이블
create table if not exists hr_case_subjects (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references hr_case_cases(id) on delete cascade,
  order_index int not null default 0,
  name text,
  role text,              -- 신고인/피신고인/참고인/목격자
  investigation_date date,
  memo text
);

-- 3. 대상자별 질문지 테이블
create table if not exists hr_case_questions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references hr_case_cases(id) on delete cascade,
  subject_id uuid not null references hr_case_subjects(id) on delete cascade,
  order_index int not null default 0,
  question text,
  intent text,
  answer_summary text
);

-- updated_at 자동 갱신
create or replace function hr_case_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_hr_case_cases_updated_at on hr_case_cases;
create trigger trg_hr_case_cases_updated_at
  before update on hr_case_cases
  for each row execute function hr_case_set_updated_at();

-- ============================================================
-- 보안: 로그인한 팀원만 접근 가능 (비로그인 접근 전면 차단)
-- 민감한 조사 데이터라 anon(비로그인) 키로는 아무것도 못 하게 막습니다.
-- ============================================================
alter table hr_case_cases enable row level security;
alter table hr_case_subjects enable row level security;
alter table hr_case_questions enable row level security;

drop policy if exists "authenticated_all_cases" on hr_case_cases;
create policy "authenticated_all_cases" on hr_case_cases
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_all_subjects" on hr_case_subjects;
create policy "authenticated_all_subjects" on hr_case_subjects
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_all_questions" on hr_case_questions;
create policy "authenticated_all_questions" on hr_case_questions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- 담당자/조사자 수기입력 (2026-08 추가)
-- ============================================================
alter table hr_case_cases add column if not exists owner_name text;
alter table hr_case_cases add column if not exists investigators text;

-- ============================================================
-- 사전 면담 + 다중 피신고인 + 조사대상자 조사일시(시간)/장소 + 첨부파일 (2026-09 추가)
-- ============================================================
alter table hr_case_cases add column if not exists accused text; -- 피신고인 여러 명, 쉼표로 구분
alter table hr_case_cases add column if not exists pre_interview_interviewer text;
alter table hr_case_cases add column if not exists pre_interview_interviewee text;
alter table hr_case_cases add column if not exists pre_interview_date date;
alter table hr_case_cases add column if not exists pre_interview_location text;
alter table hr_case_cases add column if not exists pre_interview_content text;

alter table hr_case_subjects add column if not exists investigation_time text;
alter table hr_case_subjects add column if not exists location text;

-- 4. 첨부파일 (사건정보/사전면담/녹취록/조사일지/증빙자료 공용)
create table if not exists hr_case_attachments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references hr_case_cases(id) on delete cascade,
  subject_id uuid references hr_case_subjects(id) on delete cascade,
  section text not null check (section in ('case_info','pre_interview','transcript','investigation_log','evidence')),
  file_name text not null,
  storage_path text not null,
  uploaded_by text,
  uploaded_at timestamptz not null default now()
);
alter table hr_case_attachments enable row level security;
drop policy if exists "authenticated_all_attachments" on hr_case_attachments;
create policy "authenticated_all_attachments" on hr_case_attachments
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 첨부파일 실제 저장용 Storage 버킷 (비공개 — 서명된 URL로만 열람)
insert into storage.buckets (id, name, public)
values ('case-files', 'case-files', false)
on conflict (id) do nothing;

drop policy if exists "authenticated_case_files_all" on storage.objects;
create policy "authenticated_case_files_all" on storage.objects
  for all using (bucket_id = 'case-files' and auth.role() = 'authenticated')
  with check (bucket_id = 'case-files' and auth.role() = 'authenticated');
