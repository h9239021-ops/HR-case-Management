/* ============================================================
   사업장 사건관리 대시보드 — app.js
   ============================================================ */

const STATUS_ORDER = ["접수", "조사중", "보고서작성", "위원회개최", "징계확정", "종결"];
const STATUS_BADGE = {
  "접수": "badge-gray", "쟁점정리": "badge-blue", "조사중": "badge-yellow",
  "보고서작성": "badge-orange", "위원회개최": "badge-purple", "징계확정": "badge-green", "종결": "badge-gray"
};
const TYPE_LABEL = { bullying: "직장 내 괴롭힘", sexual_harassment: "직장 내 성희롱", misconduct: "비위행위" };
const TYPE_BADGE = { bullying: "badge-orange", sexual_harassment: "badge-pink", misconduct: "badge-red" };
const ROLE_OPTIONS = ["신고인", "피신고인", "참고인", "목격자"];

let sb = null;
let session = null;
let apiKey = localStorage.getItem("cms_api_key") || "";
let model = localStorage.getItem("cms_model") || "claude-sonnet-4-5-20250929";

let currentTab = "summary";
let invSubTab = "harassment"; // harassment | misconduct
let invSelectedCaseId = null;
let reportSelectedCaseId = null;
let committeeSelectedCaseId = null;
let notifySelectedCaseId = null;

let casesCache = []; // full case rows, refreshed on demand

/* ---------------------------------------------------------- */
/* boot                                                        */
/* ---------------------------------------------------------- */
window.addEventListener("DOMContentLoaded", init);

async function init() {
  if (!window.SUPABASE_URL || window.SUPABASE_URL.includes("YOUR-PROJECT")) {
    document.body.innerHTML = "<p style='padding:40px;font-family:sans-serif'>config.js에 Supabase 프로젝트 URL/키를 먼저 입력해주세요.</p>";
    return;
  }
  sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  document.getElementById("loginBtn").addEventListener("click", doLogin);
  document.getElementById("logoutBtn").addEventListener("click", doLogout);
  document.getElementById("settingsBtn").addEventListener("click", openSettings);
  document.getElementById("settingsCancel").addEventListener("click", closeSettings);
  document.getElementById("settingsSave").addEventListener("click", saveSettings);
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
  document.getElementById("loginPassword").addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });

  const { data } = await sb.auth.getSession();
  session = data.session;
  if (session) showApp(); else showLogin();
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.add("hidden"), 2600);
}

/* ---------------------------------------------------------- */
/* auth                                                         */
/* ---------------------------------------------------------- */
async function doLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errEl = document.getElementById("loginError");
  errEl.textContent = "";
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { errEl.textContent = "로그인 실패: " + error.message; return; }
  session = data.session;
  showApp();
}

async function doLogout() {
  await sb.auth.signOut();
  session = null;
  showLogin();
}

function showLogin() {
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("app").classList.add("hidden");
}

function showApp() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("userEmail").textContent = session.user.email;
  switchTab("summary");
}

/* ---------------------------------------------------------- */
/* settings                                                     */
/* ---------------------------------------------------------- */
function openSettings() {
  document.getElementById("apiKeyInput").value = apiKey;
  document.getElementById("modelInput").value = model;
  document.getElementById("settingsModal").classList.remove("hidden");
}
function closeSettings() { document.getElementById("settingsModal").classList.add("hidden"); }
function saveSettings() {
  apiKey = document.getElementById("apiKeyInput").value.trim();
  model = document.getElementById("modelInput").value.trim() || model;
  localStorage.setItem("cms_api_key", apiKey);
  localStorage.setItem("cms_model", model);
  closeSettings();
  showToast("설정 저장됨");
}

/* ---------------------------------------------------------- */
/* tabs                                                         */
/* ---------------------------------------------------------- */
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  render();
}

async function render() {
  const el = document.getElementById("tabContent");
  el.innerHTML = "<p class='muted'>불러오는 중…</p>";
  await refreshCases();
  if (currentTab === "summary") renderSummary(el);
  else if (currentTab === "investigation") renderInvestigation(el);
  else if (currentTab === "report") renderReport(el);
  else if (currentTab === "committee") renderCommittee(el);
  else if (currentTab === "notify") renderNotify(el);
}

async function refreshCases() {
  const { data, error } = await sb.from("hr_case_cases").select("*").order("created_at", { ascending: false });
  if (error) { showToast("불러오기 실패: " + error.message); casesCache = []; return; }
  casesCache = data || [];
}

/* ============================================================
   1. 요약 탭
   ============================================================ */
function renderSummary(el) {
  const total = casesCache.length;
  const harassmentAck = casesCache.filter(c => c.case_category === "harassment" && c.acknowledgment).length;
  const openCases = casesCache.filter(c => c.status !== "종결").length;
  const closedCases = casesCache.filter(c => c.status === "종결").length;

  const rows = casesCache.map(c => `
    <tr class="clickable" onclick="openCaseDetail('${c.id}')">
      <td>${escapeHtml(c.case_name)}</td>
      <td><span class="badge ${TYPE_BADGE[c.case_type] || "badge-gray"}">${TYPE_LABEL[c.case_type] || c.case_type}</span></td>
      <td>${escapeHtml(c.department || "-")}</td>
      <td><span class="badge ${STATUS_BADGE[c.status] || "badge-gray"}">${c.status}</span></td>
      <td>${escapeHtml(c.acknowledgment ? truncate(c.acknowledgment, 20) : "-")}</td>
      <td>${escapeHtml(c.final_discipline || "-")}</td>
      <td>${fmtDate(c.created_at)}</td>
    </tr>`).join("");

  el.innerHTML = `
    <div class="stat-row">
      <div class="stat-card"><div class="num">${total}</div><div class="lbl">전체 사건</div></div>
      <div class="stat-card"><div class="num">${openCases}</div><div class="lbl">진행중</div></div>
      <div class="stat-card"><div class="num">${closedCases}</div><div class="lbl">종결</div></div>
      <div class="stat-card"><div class="num">${harassmentAck}</div><div class="lbl">괴롭힘·성희롱 인정여부 판단완료</div></div>
    </div>
    <div class="panel">
      <h3>전체 사건 목록 (클릭하면 상세보기)</h3>
      ${total === 0 ? "<p class='case-list-empty'>등록된 사건이 없습니다. '비위행위 조사' 탭에서 새 사건을 등록하세요.</p>" : `
      <table class="data-table">
        <thead><tr><th>사건명</th><th>유형</th><th>부서</th><th>진행상태</th><th>인정여부/사실관계</th><th>징계결과</th><th>등록일</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`}
    </div>
  `;
}

function openCaseDetail(caseId) {
  const c = casesCache.find(x => x.id === caseId);
  if (!c) return;
  const box = document.getElementById("caseModalContent");
  box.innerHTML = `
    <h2>${escapeHtml(c.case_name)}</h2>
    <p><span class="badge ${TYPE_BADGE[c.case_type]}">${TYPE_LABEL[c.case_type]}</span>
       <span class="badge ${STATUS_BADGE[c.status]}">${c.status}</span></p>

    <div class="section-title">기본 정보</div>
    <p><b>부서:</b> ${escapeHtml(c.department || "-")}</p>
    ${c.case_category === "harassment" ? `
      <p><b>신고인:</b> ${escapeHtml(c.reporter || "-")} / <b>신고일자:</b> ${c.report_date || "-"}</p>
      <p><b>신고내용:</b><br>${nl2br(escapeHtml(c.report_content || "-"))}</p>
    ` : `
      <p><b>비위행위 발생일:</b> ${c.incident_date || "-"}</p>
      <p><b>비위행위 내용:</b><br>${nl2br(escapeHtml(c.incident_content || "-"))}</p>
      <p><b>추가조사 필요성:</b><br>${nl2br(escapeHtml(c.additional_investigation_need || "-"))}</p>
    `}

    <div class="section-title">조사결과</div>
    <p><b>인정여부/사실관계:</b><br>${nl2br(escapeHtml(c.acknowledgment || "-"))}</p>
    <p><b>징계수준 검토의견:</b><br>${nl2br(escapeHtml(c.discipline_review || "-"))}</p>

    <div class="section-title">인사위원회 · 결과통보</div>
    <p><b>개최일시:</b> ${c.committee_date ? new Date(c.committee_date).toLocaleString("ko-KR") : "-"} / <b>장소:</b> ${escapeHtml(c.committee_location || "-")}</p>
    <p><b>심의·의결 결과:</b><br>${nl2br(escapeHtml(c.resolution_text || "-"))}</p>
    <p><b>최종 징계결과:</b> ${escapeHtml(c.final_discipline || "-")}</p>

    <div class="section-title">진행상태 수정</div>
    <select id="statusOverride">${STATUS_ORDER.map(s => `<option value="${s}" ${s === c.status ? "selected" : ""}>${s}</option>`).join("")}</select>
    <div class="modal-actions">
      <button class="btn btn-danger" onclick="deleteCase('${c.id}')">사건 삭제</button>
      <button class="btn btn-ghost" onclick="closeCaseModal()">닫기</button>
      <button class="btn btn-primary" onclick="saveStatusOverride('${c.id}')">저장</button>
    </div>
  `;
  document.getElementById("caseModal").classList.remove("hidden");
}
function closeCaseModal() { document.getElementById("caseModal").classList.add("hidden"); }
async function saveStatusOverride(caseId) {
  const status = document.getElementById("statusOverride").value;
  await sb.from("hr_case_cases").update({ status }).eq("id", caseId);
  closeCaseModal();
  render();
}
async function deleteCase(caseId) {
  if (!confirm("이 사건과 관련 조사대상자/질문지 데이터를 모두 삭제합니다. 계속할까요?")) return;
  await sb.from("hr_case_cases").delete().eq("id", caseId);
  closeCaseModal();
  render();
}

/* ============================================================
   2. 비위행위 조사 탭
   ============================================================ */
function renderInvestigation(el) {
  el.innerHTML = `
    <div class="subtabs">
      <button class="subtab-btn ${invSubTab === "harassment" ? "active" : ""}" onclick="setInvSubTab('harassment')">직장 내 괴롭힘·성희롱 조사</button>
      <button class="subtab-btn ${invSubTab === "misconduct" ? "active" : ""}" onclick="setInvSubTab('misconduct')">비위행위 조사 (그 외)</button>
    </div>
    <div style="display:flex; gap:20px; align-items:flex-start;">
      <div class="panel" style="width:300px; flex-shrink:0;">
        <h3>사건 목록</h3>
        <div id="invCaseList"></div>
        <button class="btn btn-primary" style="width:100%; margin-top:10px;" onclick="openNewCaseForm()">+ 새 사건 등록</button>
        <div id="newCaseForm" class="hidden" style="margin-top:14px;"></div>
      </div>
      <div class="panel" style="flex:1;" id="invDetailPanel">
        <p class="muted">왼쪽에서 사건을 선택하거나 새로 등록하세요.</p>
      </div>
    </div>
  `;
  renderInvCaseList();
  if (invSelectedCaseId) renderInvDetail();
}

function setInvSubTab(t) { invSubTab = t; invSelectedCaseId = null; renderInvestigation(document.getElementById("tabContent")); }

function renderInvCaseList() {
  const listEl = document.getElementById("invCaseList");
  const list = casesCache.filter(c => c.case_category === invSubTab).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  if (list.length === 0) { listEl.innerHTML = "<p class='case-list-empty'>사건 없음</p>"; return; }
  listEl.innerHTML = list.map(c => `
    <div class="btn ${invSelectedCaseId === c.id ? "btn-primary" : ""}" style="width:100%; text-align:left; margin-bottom:6px; display:block;" onclick="selectInvCase('${c.id}')">
      ${escapeHtml(c.case_name)} <br><span class="small ${invSelectedCaseId === c.id ? "" : "muted"}">${fmtDate(c.created_at)} · ${c.plan_accepted ? "✅확정" : "작성중"}</span>
    </div>`).join("");
}

function openNewCaseForm() {
  const box = document.getElementById("newCaseForm");
  box.classList.remove("hidden");
  if (invSubTab === "harassment") {
    box.innerHTML = `
      <label>사건명</label><input id="ncName" placeholder="예: OO팀 괴롭힘 신고 건" />
      <label>세부유형</label>
      <select id="ncType"><option value="bullying">직장 내 괴롭힘</option><option value="sexual_harassment">직장 내 성희롱</option></select>
      <label>부서/사업장</label><input id="ncDept" />
      <label>신고인</label><input id="ncReporter" />
      <label>신고일자</label><input id="ncReportDate" type="date" />
      <label>신고내용</label><textarea id="ncReportContent" placeholder="신고 접수된 내용을 최대한 상세히 입력하세요"></textarea>
      <button class="btn btn-primary" style="width:100%" onclick="createHarassmentCase()">등록</button>
    `;
  } else {
    box.innerHTML = `
      <label>사건명</label><input id="ncName" placeholder="예: 회계팀 법인카드 사적유용 건" />
      <label>부서/사업장</label><input id="ncDept" />
      <label>비위행위 발생일</label><input id="ncIncidentDate" type="date" />
      <label>비위행위 내용</label><textarea id="ncIncidentContent" placeholder="확인된 비위행위 내용을 최대한 상세히 입력하세요"></textarea>
      <button class="btn btn-primary" style="width:100%" onclick="createMisconductCase()">등록</button>
    `;
  }
}

async function createHarassmentCase() {
  const payload = {
    case_name: document.getElementById("ncName").value.trim() || "이름없는 사건",
    case_category: "harassment",
    case_type: document.getElementById("ncType").value,
    department: document.getElementById("ncDept").value.trim(),
    reporter: document.getElementById("ncReporter").value.trim(),
    report_date: document.getElementById("ncReportDate").value || null,
    report_content: document.getElementById("ncReportContent").value.trim(),
    status: "접수",
    created_by: session.user.email
  };
  const { data, error } = await sb.from("hr_case_cases").insert(payload).select().single();
  if (error) { showToast("등록 실패: " + error.message); return; }
  await refreshCases();
  invSelectedCaseId = data.id;
  renderInvestigation(document.getElementById("tabContent"));
}
async function createMisconductCase() {
  const payload = {
    case_name: document.getElementById("ncName").value.trim() || "이름없는 사건",
    case_category: "misconduct",
    case_type: "misconduct",
    department: document.getElementById("ncDept").value.trim(),
    incident_date: document.getElementById("ncIncidentDate").value || null,
    incident_content: document.getElementById("ncIncidentContent").value.trim(),
    status: "접수",
    created_by: session.user.email
  };
  const { data, error } = await sb.from("hr_case_cases").insert(payload).select().single();
  if (error) { showToast("등록 실패: " + error.message); return; }
  await refreshCases();
  invSelectedCaseId = data.id;
  renderInvestigation(document.getElementById("tabContent"));
}

function selectInvCase(id) { invSelectedCaseId = id; renderInvestigation(document.getElementById("tabContent")); }

async function renderInvDetail() {
  const panel = document.getElementById("invDetailPanel");
  const c = casesCache.find(x => x.id === invSelectedCaseId);
  if (!c) { panel.innerHTML = "<p class='muted'>사건을 선택하세요.</p>"; return; }

  const { data: subjects } = await sb.from("hr_case_subjects").select("*").eq("case_id", c.id).order("order_index");
  const subjectIds = (subjects || []).map(s => s.id);
  let questions = [];
  if (subjectIds.length) {
    const { data: qs } = await sb.from("hr_case_questions").select("*").in("subject_id", subjectIds).order("order_index");
    questions = qs || [];
  }

  const inputFieldsHtml = c.case_category === "harassment" ? `
    <label>신고인</label><input id="edReporter" value="${escAttr(c.reporter)}" onchange="saveCaseField('${c.id}','reporter',this.value)" />
    <label>신고일자</label><input id="edReportDate" type="date" value="${c.report_date || ""}" onchange="saveCaseField('${c.id}','report_date',this.value)" />
    <label>신고내용</label><textarea onchange="saveCaseField('${c.id}','report_content',this.value)">${escapeHtml(c.report_content || "")}</textarea>
  ` : `
    <label>비위행위 발생일</label><input type="date" value="${c.incident_date || ""}" onchange="saveCaseField('${c.id}','incident_date',this.value)" />
    <label>비위행위 내용</label><textarea onchange="saveCaseField('${c.id}','incident_content',this.value)">${escapeHtml(c.incident_content || "")}</textarea>
    ${c.additional_investigation_need !== null && c.additional_investigation_need !== undefined && subjects.length ? `
      <label>추가조사 필요성 (AI 생성)</label><textarea onchange="saveCaseField('${c.id}','additional_investigation_need',this.value)">${escapeHtml(c.additional_investigation_need || "")}</textarea>
    ` : ""}
  `;

  const subjectsHtml = (subjects || []).map(s => {
    const qs = questions.filter(q => q.subject_id === s.id);
    return `
      <div class="subject-row">
        <div class="subject-row-head">
          <input style="width:140px; margin:0;" value="${escAttr(s.name)}" onchange="saveSubjectField('${s.id}','name',this.value)" />
          <select style="width:110px; margin:0;" onchange="saveSubjectField('${s.id}','role',this.value)">
            ${ROLE_OPTIONS.map(r => `<option ${r === s.role ? "selected" : ""}>${r}</option>`).join("")}
          </select>
          <input type="date" style="width:150px; margin:0;" value="${s.investigation_date || ""}" onchange="saveSubjectField('${s.id}','investigation_date',this.value)" />
          <button class="btn btn-sm btn-danger" onclick="deleteSubject('${s.id}')">삭제</button>
        </div>
        <textarea placeholder="비고" style="min-height:40px;" onchange="saveSubjectField('${s.id}','memo',this.value)">${escapeHtml(s.memo || "")}</textarea>
        <div class="small muted" style="margin:6px 0 4px;">질문지</div>
        ${qs.map(q => `
          <div class="q-item">
            <textarea onchange="saveQuestionField('${q.id}','question',this.value)">${escapeHtml(q.question || "")}</textarea>
            <button class="btn btn-sm btn-danger" onclick="deleteQuestion('${q.id}')">✕</button>
          </div>`).join("")}
        <button class="btn btn-sm" onclick="addQuestion('${s.id}','${c.id}')">+ 질문 추가</button>
      </div>`;
  }).join("");

  panel.innerHTML = `
    <div class="section-title">사건 정보</div>
    ${inputFieldsHtml}

    <div class="section-title">조사대상자 · 질문지 ${c.plan_accepted ? "<span class='badge badge-green'>확정됨</span>" : ""}</div>
    ${(!subjects || subjects.length === 0) ? `
      <button class="btn btn-primary" id="genPlanBtn" onclick="generatePlan('${c.id}')">🪄 AI로 조사계획 생성</button>
      <span id="genPlanStatus"></span>
    ` : `
      ${subjectsHtml}
      <button class="btn btn-sm" onclick="addSubject('${c.id}')">+ 조사대상자 추가</button>
      <div class="action-bar">
        ${!c.plan_accepted ? `<button class="btn" onclick="generatePlan('${c.id}')">🔄 AI로 다시 생성</button>` : ""}
        <button class="btn" onclick="exportPlanExcel('${c.id}')">📊 엑셀 다운로드</button>
        ${c.plan_accepted
          ? `<button class="btn" onclick="setPlanAccepted('${c.id}', false)">수정하기 (잠금 해제)</button>`
          : `<button class="btn btn-primary" onclick="setPlanAccepted('${c.id}', true)">✅ 수락 (확정)</button>`}
      </div>
    `}
  `;
}

async function saveCaseField(caseId, field, value) {
  await sb.from("hr_case_cases").update({ [field]: value }).eq("id", caseId);
  await refreshCases();
}
async function saveSubjectField(subjectId, field, value) {
  await sb.from("hr_case_subjects").update({ [field]: value }).eq("id", subjectId);
}
async function saveQuestionField(questionId, field, value) {
  await sb.from("hr_case_questions").update({ [field]: value }).eq("id", questionId);
}
async function deleteSubject(subjectId) {
  if (!confirm("이 대상자와 관련 질문지를 삭제할까요?")) return;
  await sb.from("hr_case_subjects").delete().eq("id", subjectId);
  renderInvDetail();
}
async function deleteQuestion(questionId) {
  await sb.from("hr_case_questions").delete().eq("id", questionId);
  renderInvDetail();
}
async function addSubject(caseId) {
  await sb.from("hr_case_subjects").insert({ case_id: caseId, name: "이름 입력", role: "참고인", order_index: 999 });
  renderInvDetail();
}
async function addQuestion(subjectId, caseId) {
  await sb.from("hr_case_questions").insert({ case_id: caseId, subject_id: subjectId, question: "", order_index: 999 });
  renderInvDetail();
}
async function setPlanAccepted(caseId, val) {
  await sb.from("hr_case_cases").update({ plan_accepted: val, status: val ? "조사중" : "조사중" }).eq("id", caseId);
  await refreshCases();
  renderInvDetail();
}

async function generatePlan(caseId) {
  if (!requireApiKey()) return;
  const c = casesCache.find(x => x.id === caseId);
  const statusEl = document.getElementById("genPlanStatus");
  const btn = document.getElementById("genPlanBtn");
  if (btn) btn.disabled = true;
  if (statusEl) statusEl.innerHTML = "<span class='loading-dot'></span>";
  showToast("AI가 조사계획을 만드는 중입니다…");

  try {
    const isHarassment = c.case_category === "harassment";
    const sys = `당신은 한국 노동법(근로기준법, 남녀고용평등법)에 정통한 사내 인사팀 조사관입니다. 주어진 사건 정보를 바탕으로 조사 계획을 세웁니다. 반드시 JSON 객체 하나만 출력하고, 다른 설명 텍스트는 절대 출력하지 마세요.`;
    const userMsg = isHarassment ? `
사건명: ${c.case_name}
유형: ${TYPE_LABEL[c.case_type]}
부서: ${c.department || "미상"}
신고인: ${c.reporter || "미상"}
신고일자: ${c.report_date || "미상"}
신고내용: ${c.report_content || "(내용 없음)"}

위 신고내용을 바탕으로 아래 JSON 스키마로 조사계획을 작성하세요.
신고인은 반드시 조사대상자에 role="신고인"으로 포함하고, 피신고인은 신고내용에서 특정 가능하면 이름을 채우고 불가능하면 "(성명 확인 필요)"로 표기하세요. 목격자/참고인은 신고내용에서 언급된 인물이 있으면 포함하세요.
각 대상자별 질문은 3~6개, 사실관계 확인에 실제로 필요한 구체적 질문으로 작성하세요.

{"subjects":[{"name":"","role":"신고인|피신고인|참고인|목격자","investigation_date":"","memo":"","questions":[{"question":"","intent":""}]}]}
` : `
사건명: ${c.case_name}
부서: ${c.department || "미상"}
비위행위 발생일: ${c.incident_date || "미상"}
비위행위 내용: ${c.incident_content || "(내용 없음)"}

위 내용을 바탕으로 아래 JSON 스키마로 조사계획을 작성하세요. additional_investigation_need에는 현재 확인된 사실관계만으로 부족한 부분과 추가로 확인해야 할 사항을 서술하세요. 조사대상자는 관련자(행위자, 참고인, 목격자 등)를 포함하고, 이름을 알 수 없으면 "(성명 확인 필요)"로 표기하세요.

{"additional_investigation_need":"","subjects":[{"name":"","role":"피신고인|참고인|목격자","investigation_date":"","memo":"","questions":[{"question":"","intent":""}]}]}
`;
    const raw = await callClaude(sys, userMsg);
    const plan = extractJSON(raw);

    // clear existing subjects/questions then insert fresh
    const { data: oldSubjects } = await sb.from("hr_case_subjects").select("id").eq("case_id", caseId);
    if (oldSubjects && oldSubjects.length) {
      await sb.from("hr_case_subjects").delete().eq("case_id", caseId); // cascade deletes questions
    }

    let idx = 0;
    for (const s of (plan.subjects || [])) {
      const { data: newSub, error } = await sb.from("hr_case_subjects").insert({
        case_id: caseId, order_index: idx++, name: s.name || "", role: s.role || "참고인",
        investigation_date: s.investigation_date || null, memo: s.memo || ""
      }).select().single();
      if (error) continue;
      let qidx = 0;
      for (const q of (s.questions || [])) {
        await sb.from("hr_case_questions").insert({
          case_id: caseId, subject_id: newSub.id, order_index: qidx++,
          question: q.question || "", intent: q.intent || ""
        });
      }
    }
    if (!isHarassment) {
      await sb.from("hr_case_cases").update({ additional_investigation_need: plan.additional_investigation_need || "" }).eq("id", caseId);
    }
    await sb.from("hr_case_cases").update({ status: "조사중" }).eq("id", caseId);
    await refreshCases();
    showToast("조사계획 생성 완료");
  } catch (e) {
    showToast("생성 실패: " + e.message);
  } finally {
    renderInvDetail();
  }
}

async function exportPlanExcel(caseId) {
  const c = casesCache.find(x => x.id === caseId);
  const { data: subjects } = await sb.from("hr_case_subjects").select("*").eq("case_id", caseId).order("order_index");
  const subjectIds = (subjects || []).map(s => s.id);
  let questions = [];
  if (subjectIds.length) {
    const { data: qs } = await sb.from("hr_case_questions").select("*").in("subject_id", subjectIds).order("order_index");
    questions = qs || [];
  }
  const subjWs = XLSX.utils.aoa_to_sheet([
    ["이름", "역할", "조사일자", "비고"],
    ...(subjects || []).map(s => [s.name, s.role, s.investigation_date || "", s.memo || ""])
  ]);
  const qRows = [["대상자명", "역할", "질문", "질문의도", "답변요약"]];
  (subjects || []).forEach(s => {
    questions.filter(q => q.subject_id === s.id).forEach(q => {
      qRows.push([s.name, s.role, q.question || "", q.intent || "", q.answer_summary || ""]);
    });
  });
  const qWs = XLSX.utils.aoa_to_sheet(qRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, subjWs, "조사대상자");
  XLSX.utils.book_append_sheet(wb, qWs, "질문지");
  XLSX.writeFile(wb, `${c.case_name}_조사계획.xlsx`);
}

/* ============================================================
   3. 조사 결과 탭
   ============================================================ */
function renderReport(el) {
  const list = casesCache.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  el.innerHTML = `
    <div style="display:flex; gap:20px; align-items:flex-start;">
      <div class="panel" style="width:300px; flex-shrink:0;">
        <h3>사건 목록</h3>
        <div>${list.map(c => `
          <div class="btn ${reportSelectedCaseId === c.id ? "btn-primary" : ""}" style="width:100%; text-align:left; margin-bottom:6px; display:block;" onclick="selectReportCase('${c.id}')">
            ${escapeHtml(c.case_name)}<br><span class="small ${reportSelectedCaseId === c.id ? "" : "muted"}">${c.report_confirmed ? "✅확정" : (c.report_draft ? "작성중" : "미작성")}</span>
          </div>`).join("") || "<p class='case-list-empty'>사건 없음</p>"}
        </div>
      </div>
      <div class="panel" style="flex:1;" id="reportDetailPanel">
        <p class="muted">왼쪽에서 사건을 선택하세요.</p>
      </div>
    </div>
  `;
  if (reportSelectedCaseId) renderReportDetail();
}
function selectReportCase(id) { reportSelectedCaseId = id; renderReport(document.getElementById("tabContent")); }

async function renderReportDetail() {
  const panel = document.getElementById("reportDetailPanel");
  const c = casesCache.find(x => x.id === reportSelectedCaseId);
  if (!c) return;
  const ackLabel = c.case_category === "harassment" ? "인정여부" : "사실관계 확정";

  panel.innerHTML = `
    <div class="section-title">${escapeHtml(c.case_name)} — 조사결과보고서</div>
    ${!c.report_draft ? `
      <p class="muted">조사대상자/질문지 확정 후 보고서를 생성하세요. (미확정이어도 생성은 가능합니다)</p>
      <button class="btn btn-primary" id="genReportBtn" onclick="generateReport('${c.id}')">🪄 AI로 조사결과보고서 작성</button>
    ` : `
      <label>보고서 본문 ${c.report_confirmed ? "<span class='badge badge-green'>확정됨</span>" : ""}</label>
      <textarea id="reportDraftInput" style="min-height:320px;" ${c.report_confirmed ? "disabled" : ""} onchange="saveCaseField('${c.id}','report_draft',this.value)">${escapeHtml(c.report_draft || "")}</textarea>

      <label>${ackLabel}</label>
      <textarea ${c.report_confirmed ? "disabled" : ""} onchange="saveCaseField('${c.id}','acknowledgment',this.value)">${escapeHtml(c.acknowledgment || "")}</textarea>

      <label>징계수준 검토의견 (공통)</label>
      <textarea ${c.report_confirmed ? "disabled" : ""} onchange="saveCaseField('${c.id}','discipline_review',this.value)">${escapeHtml(c.discipline_review || "")}</textarea>

      <div class="action-bar">
        ${!c.report_confirmed ? `<button class="btn" onclick="generateReport('${c.id}')">🔄 AI로 다시 생성</button>` : ""}
        <button class="btn" onclick="exportReportWord('${c.id}')">📄 Word로 내보내기</button>
        ${c.report_confirmed
          ? `<button class="btn" onclick="setReportConfirmed('${c.id}', false)">수정하기 (확정 해제)</button>`
          : `<button class="btn btn-primary" onclick="setReportConfirmed('${c.id}', true)">✅ 확정</button>`}
      </div>
    `}
  `;
}

async function setReportConfirmed(caseId, val) {
  await sb.from("hr_case_cases").update({ report_confirmed: val, status: val ? "위원회개최" : "보고서작성" }).eq("id", caseId);
  await refreshCases();
  renderReportDetail();
}

async function generateReport(caseId) {
  if (!requireApiKey()) return;
  const c = casesCache.find(x => x.id === caseId);
  showToast("AI가 보고서를 작성하는 중입니다…");
  try {
    const { data: subjects } = await sb.from("hr_case_subjects").select("*").eq("case_id", caseId).order("order_index");
    const subjectIds = (subjects || []).map(s => s.id);
    let questions = [];
    if (subjectIds.length) {
      const { data: qs } = await sb.from("hr_case_questions").select("*").in("subject_id", subjectIds).order("order_index");
      questions = qs || [];
    }
    const factsBlock = (subjects || []).map(s => {
      const qs = questions.filter(q => q.subject_id === s.id);
      return `- ${s.name}(${s.role}, 조사일 ${s.investigation_date || "미상"}): ${s.memo || ""}\n` +
        qs.map(q => `   Q. ${q.question}\n   A. ${q.answer_summary || "(답변 미기록)"}`).join("\n");
    }).join("\n");

    const isHarassment = c.case_category === "harassment";
    const sys = `당신은 한국 노동법에 정통한 사내 인사팀 조사관입니다. 조사자료를 종합하여 조사결과보고서를 작성합니다. 반드시 JSON 객체 하나만 출력하세요.`;
    const userMsg = `
사건명: ${c.case_name}
유형: ${TYPE_LABEL[c.case_type]}
${isHarassment ? `신고인: ${c.reporter}\n신고내용: ${c.report_content}` : `비위행위 발생일: ${c.incident_date}\n비위행위 내용: ${c.incident_content}\n추가조사필요성: ${c.additional_investigation_need || ""}`}

조사 진행 내용(대상자별 질문/답변):
${factsBlock || "(등록된 조사대상자/답변 없음)"}

아래 JSON 스키마로 작성하세요. report_draft는 "1. 사건 개요 / 2. 조사 경위 / 3. 조사 내용 / 4. 쟁점별 판단 / 5. 결론 및 의견" 구조의 완결된 보고서 텍스트(줄바꿈으로 문단 구분)로 작성하세요.
${isHarassment ? "acknowledgment는 신고된 행위의 직장 내 괴롭힘/성희롱 인정여부에 대한 판단과 근거를 서술하세요." : "acknowledgment는 확인된 사실관계를 명확히 확정하여 서술하세요."}
discipline_review는 사실관계에 따른 징계수준 검토의견(적용 가능한 취업규칙/상벌규정 조항, 참작사유 포함)을 서술하세요.

{"report_draft":"","acknowledgment":"","discipline_review":""}
`;
    const raw = await callClaude(sys, userMsg);
    const result = extractJSON(raw);
    await sb.from("hr_case_cases").update({
      report_draft: result.report_draft || "",
      acknowledgment: result.acknowledgment || "",
      discipline_review: result.discipline_review || "",
      status: "보고서작성"
    }).eq("id", caseId);
    await refreshCases();
    showToast("보고서 초안 생성 완료");
  } catch (e) {
    showToast("생성 실패: " + e.message);
  } finally {
    renderReportDetail();
  }
}

function exportReportWord(caseId) {
  const c = casesCache.find(x => x.id === caseId);
  const ackLabel = c.case_category === "harassment" ? "인정여부" : "사실관계 확정";
  const text = `${c.report_draft || ""}\n\n■ ${ackLabel}\n${c.acknowledgment || ""}\n\n■ 징계수준 검토의견\n${c.discipline_review || ""}`;
  downloadWordDoc(`${c.case_name}_조사결과보고서`, "조사결과보고서 — " + c.case_name, text);
}

/* ============================================================
   4. 인사위원회 개최 탭
   ============================================================ */
function renderCommittee(el) {
  const list = casesCache.filter(c => c.report_confirmed).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  el.innerHTML = `
    <div style="display:flex; gap:20px; align-items:flex-start;">
      <div class="panel" style="width:300px; flex-shrink:0;">
        <h3>보고서 확정된 사건</h3>
        <div>${list.map(c => `
          <div class="btn ${committeeSelectedCaseId === c.id ? "btn-primary" : ""}" style="width:100%; text-align:left; margin-bottom:6px; display:block;" onclick="selectCommitteeCase('${c.id}')">
            ${escapeHtml(c.case_name)}
          </div>`).join("") || "<p class='case-list-empty'>조사결과 탭에서 보고서를 먼저 확정하세요.</p>"}
        </div>
      </div>
      <div class="panel" style="flex:1;" id="committeeDetailPanel">
        <p class="muted">왼쪽에서 사건을 선택하세요.</p>
      </div>
    </div>
  `;
  if (committeeSelectedCaseId) renderCommitteeDetail();
}
function selectCommitteeCase(id) { committeeSelectedCaseId = id; renderCommittee(document.getElementById("tabContent")); }

function renderCommitteeDetail() {
  const panel = document.getElementById("committeeDetailPanel");
  const c = casesCache.find(x => x.id === committeeSelectedCaseId);
  if (!c) return;
  const dt = c.committee_date ? new Date(c.committee_date) : null;
  const dtLocal = dt ? new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";

  panel.innerHTML = `
    <div class="section-title">${escapeHtml(c.case_name)} — 인사위원회 개최 정보</div>
    <div class="grid-2">
      <div><label>개최일시</label><input type="datetime-local" value="${dtLocal}" onchange="saveCaseField('${c.id}','committee_date', new Date(this.value).toISOString())" /></div>
      <div><label>개최장소</label><input value="${escAttr(c.committee_location)}" onchange="saveCaseField('${c.id}','committee_location',this.value)" /></div>
    </div>
    <label>위원 구성</label><input value="${escAttr(c.committee_members)}" placeholder="예: 인사팀장 외 2인" onchange="saveCaseField('${c.id}','committee_members',this.value)" />

    <div class="section-title">개최 공문 / 출석통지서</div>
    ${!c.committee_notice_text ? `
      <button class="btn btn-primary" onclick="generateCommitteeDocs('${c.id}')">🪄 AI로 공문·출석통지서 생성</button>
    ` : `
      <label>인사위원회 개최 공문 (피심의대상자용)</label>
      <textarea style="min-height:180px;" onchange="saveCaseField('${c.id}','committee_notice_text',this.value)">${escapeHtml(c.committee_notice_text || "")}</textarea>
      <button class="btn btn-sm" onclick="downloadWordDoc('${escAttr(c.case_name)}_개최공문','인사위원회 개최 공문', document.querySelectorAll('#committeeDetailPanel textarea')[0].value)">📄 공문 Word 다운로드</button>

      <label style="margin-top:14px;">출석통지서 (신고인/참고인용)</label>
      <textarea style="min-height:150px;" onchange="saveCaseField('${c.id}','attendance_notice_text',this.value)">${escapeHtml(c.attendance_notice_text || "")}</textarea>
      <button class="btn btn-sm" onclick="downloadWordDoc('${escAttr(c.case_name)}_출석통지서','출석통지서', document.querySelectorAll('#committeeDetailPanel textarea')[1].value)">📄 출석통지서 Word 다운로드</button>

      <div class="action-bar" style="justify-content:flex-start;">
        <button class="btn" onclick="generateCommitteeDocs('${c.id}')">🔄 다시 생성</button>
      </div>
    `}

    <div class="section-title">심의 · 의결서</div>
    <textarea placeholder="위원회 개최 후 심의 결과와 의결 내용을 입력하세요" style="min-height:140px;" onchange="saveCaseField('${c.id}','resolution_text',this.value)">${escapeHtml(c.resolution_text || "")}</textarea>
    <button class="btn btn-sm" onclick="downloadWordDoc('${escAttr(c.case_name)}_심의의결서','인사위원회 심의·의결서', document.getElementById('tabContent').querySelectorAll('.section-title')[2].nextElementSibling.value)">📄 의결서 Word 다운로드</button>
  `;
}

async function generateCommitteeDocs(caseId) {
  if (!requireApiKey()) return;
  const c = casesCache.find(x => x.id === caseId);
  if (!c.committee_date || !c.committee_location) { showToast("개최일시/장소를 먼저 입력하세요"); return; }
  showToast("AI가 공문을 작성하는 중입니다…");
  try {
    const sys = `당신은 한국 기업 인사팀 담당자입니다. 사내 공식 문서(인사위원회 개최 공문, 출석통지서)를 격식있는 문어체로 작성합니다. 반드시 JSON 객체 하나만 출력하세요.`;
    const userMsg = `
사건명: ${c.case_name}
유형: ${TYPE_LABEL[c.case_type]}
개최일시: ${new Date(c.committee_date).toLocaleString("ko-KR")}
개최장소: ${c.committee_location}
위원구성: ${c.committee_members || "미정"}
사실관계/인정여부 요지: ${c.acknowledgment || ""}
징계수준 검토의견: ${c.discipline_review || ""}
${c.case_category === "harassment" ? `피신고인 관련자: ${(c.report_content || "").slice(0, 200)}` : ""}

아래 JSON 스키마로 작성하세요. committee_notice_text는 피심의대상자에게 보내는 인사위원회 개최 통보 공문(수신/발신/회부사유/개최일시/장소/심의안건/소명권 안내 포함), attendance_notice_text는 참고인·신고인 등에게 출석을 요청하는 출석통지서로 작성하세요. 회사명은 "㈜OO"로, 담당자 연락처는 "인사팀 (☎ 02-000-0000)"로 표기하세요.

{"committee_notice_text":"","attendance_notice_text":""}
`;
    const raw = await callClaude(sys, userMsg);
    const result = extractJSON(raw);
    await sb.from("hr_case_cases").update({
      committee_notice_text: result.committee_notice_text || "",
      attendance_notice_text: result.attendance_notice_text || "",
      status: "위원회개최"
    }).eq("id", caseId);
    await refreshCases();
    showToast("공문 생성 완료");
  } catch (e) {
    showToast("생성 실패: " + e.message);
  } finally {
    renderCommitteeDetail();
  }
}

/* ============================================================
   5. 결과 통보 탭
   ============================================================ */
function renderNotify(el) {
  const list = casesCache.filter(c => c.report_confirmed).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  el.innerHTML = `
    <div style="display:flex; gap:20px; align-items:flex-start;">
      <div class="panel" style="width:300px; flex-shrink:0;">
        <h3>사건 목록</h3>
        <div>${list.map(c => `
          <div class="btn ${notifySelectedCaseId === c.id ? "btn-primary" : ""}" style="width:100%; text-align:left; margin-bottom:6px; display:block;" onclick="selectNotifyCase('${c.id}')">
            ${escapeHtml(c.case_name)}
          </div>`).join("") || "<p class='case-list-empty'>보고서 확정된 사건이 없습니다.</p>"}
        </div>
      </div>
      <div class="panel" style="flex:1;" id="notifyDetailPanel">
        <p class="muted">왼쪽에서 사건을 선택하세요.</p>
      </div>
    </div>
  `;
  if (notifySelectedCaseId) renderNotifyDetail();
}
function selectNotifyCase(id) { notifySelectedCaseId = id; renderNotify(document.getElementById("tabContent")); }

function renderNotifyDetail() {
  const panel = document.getElementById("notifyDetailPanel");
  const c = casesCache.find(x => x.id === notifySelectedCaseId);
  if (!c) return;

  panel.innerHTML = `
    <div class="section-title">${escapeHtml(c.case_name)} — 최종 징계결과 입력</div>
    <input value="${escAttr(c.final_discipline)}" placeholder="예: 정직 1개월 / 견책 / 불문 등" onchange="saveCaseField('${c.id}','final_discipline',this.value)" />

    <div class="section-title">결과 통보</div>
    ${!c.result_notice_text ? `
      <button class="btn btn-primary" onclick="generateNotify('${c.id}')" ${c.final_discipline ? "" : "disabled title='최종 징계결과를 먼저 입력하세요'"}>🪄 AI로 메일·통보서 작성</button>
      ${!c.final_discipline ? "<p class='small muted'>최종 징계결과를 먼저 입력해야 생성됩니다.</p>" : ""}
    ` : `
      <label>신고인 통보 메일 초안</label>
      <textarea style="min-height:150px;" onchange="saveCaseField('${c.id}','email_reporter_draft',this.value)">${escapeHtml(c.email_reporter_draft || "")}</textarea>

      <label style="margin-top:12px;">피신고인 통보 메일 초안</label>
      <textarea style="min-height:150px;" onchange="saveCaseField('${c.id}','email_accused_draft',this.value)">${escapeHtml(c.email_accused_draft || "")}</textarea>

      <label style="margin-top:12px;">인사위원회 결과통보서</label>
      <textarea style="min-height:180px;" onchange="saveCaseField('${c.id}','result_notice_text',this.value)">${escapeHtml(c.result_notice_text || "")}</textarea>

      <div class="action-bar" style="justify-content:flex-start;">
        <button class="btn" onclick="generateNotify('${c.id}')">🔄 다시 생성</button>
        <button class="btn" onclick="downloadWordDoc('${escAttr(c.case_name)}_결과통보서','인사위원회 결과통보서', document.getElementById('tabContent').querySelectorAll('textarea')[2].value)">📄 통보서 Word 다운로드</button>
        <button class="btn btn-primary" onclick="setCaseStatus('${c.id}','종결')">사건 종결 처리</button>
      </div>
    `}
  `;
}
async function setCaseStatus(caseId, status) {
  await sb.from("hr_case_cases").update({ status }).eq("id", caseId);
  await refreshCases();
  showToast("사건이 종결 처리되었습니다");
  renderNotifyDetail();
}

async function generateNotify(caseId) {
  if (!requireApiKey()) return;
  const c = casesCache.find(x => x.id === caseId);
  showToast("AI가 통보 문서를 작성하는 중입니다…");
  try {
    const sys = `당신은 한국 기업 인사팀 담당자입니다. 정중하고 명확한 어조로 통보 메일과 공식 통보서를 작성합니다. 반드시 JSON 객체 하나만 출력하세요.`;
    const userMsg = `
사건명: ${c.case_name}
유형: ${TYPE_LABEL[c.case_type]}
인정여부/사실관계: ${c.acknowledgment || ""}
심의·의결 결과: ${c.resolution_text || ""}
최종 징계결과: ${c.final_discipline}

아래 JSON 스키마로 작성하세요. email_reporter_draft는 신고인에게 조사 및 처리 결과를 통보하는 메일 본문(받는사람/제목/본문 포함), email_accused_draft는 피신고인에게 결과를 통보하는 메일 본문, result_notice_text는 공식 "인사위원회 결과통보서" 문서(수신/발신/사건개요/의결결과/징계내용/재심청구 안내 포함, 재심청구는 통보서 수령일로부터 5일 이내 가능하다고 안내)로 작성하세요. 회사명은 "㈜OO"로 표기하세요.

{"email_reporter_draft":"","email_accused_draft":"","result_notice_text":""}
`;
    const raw = await callClaude(sys, userMsg);
    const result = extractJSON(raw);
    await sb.from("hr_case_cases").update({
      email_reporter_draft: result.email_reporter_draft || "",
      email_accused_draft: result.email_accused_draft || "",
      result_notice_text: result.result_notice_text || "",
      status: "징계확정"
    }).eq("id", caseId);
    await refreshCases();
    showToast("통보 문서 생성 완료");
  } catch (e) {
    showToast("생성 실패: " + e.message);
  } finally {
    renderNotifyDetail();
  }
}

/* ============================================================
   Claude API helpers
   ============================================================ */
function requireApiKey() {
  if (!apiKey) { showToast("설정에서 Claude API 키를 먼저 입력하세요"); openSettings(); return false; }
  return true;
}

async function callClaude(systemPrompt, userPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`API 오류 (${res.status}): ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.content || []).map(b => b.text || "").join("");
}

function extractJSON(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI 응답에서 JSON을 찾을 수 없습니다");
  return JSON.parse(text.slice(start, end + 1));
}

/* ============================================================
   Word export (HTML→.doc 트릭, 실제 Word에서 정상적으로 열립니다)
   ============================================================ */
function downloadWordDoc(filename, title, contentText) {
  const bodyHtml = String(contentText || "").split(/\n+/).map(line =>
    `<p style="margin:0 0 10px 0; line-height:1.7;">${escapeHtml(line) || "&nbsp;"}</p>`
  ).join("");
  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  body { font-family:'맑은 고딕', sans-serif; font-size:11pt; }
  h1 { font-size:16pt; text-align:center; margin-bottom:20pt; }
</style></head>
<body><h1>${escapeHtml(title)}</h1>${bodyHtml}</body></html>`;
  const blob = new Blob(["﻿", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".doc") ? filename : filename + ".doc";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ============================================================
   utils
   ============================================================ */
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
function escAttr(s) { return escapeHtml(s).replace(/\n/g, " "); }
function nl2br(s) { return String(s ?? "").replace(/\n/g, "<br>"); }
function truncate(s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n) + "…" : s; }
function fmtDate(d) { if (!d) return "-"; return new Date(d).toLocaleDateString("ko-KR"); }
