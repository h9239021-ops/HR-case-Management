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

// 직장 내 괴롭힘 판단 시 매번 동일하게 인용되는 법률/매뉴얼 기준 — AI가 매번 새로 쓰지 않고
// 고정 문구로 삽입한다 (정확성·일관성 확보, 토큰 절약).
const LEGAL_STANDARD_HARASSMENT = `
직장 내 괴롭힘 판단 기준(관련 법률)

기본적으로 아래 근로기준법의 내용과 취지, 고용노동부의 매뉴얼, 민간공익단체 직장갑질119의 매뉴얼, 판례를 토대로 직장 내 괴롭힘 여부에 대해 판단함.

(1) 근로기준법

제76조의2(직장 내 괴롭힘의 금지)
사용자 또는 근로자는 직장에서의 지위 또는 관계 등의 우위를 이용하여 업무상 적정범위를 넘어 다른 근로자에게 신체적·정신적 고통을 주거나 근무환경을 악화시키는 행위(이하 "직장 내 괴롭힘"이라 한다)를 하여서는 아니된다.

제76조의3(직장 내 괴롭힘 발생 시 조치)
① 누구든지 직장 내 괴롭힘 발생 사실을 알게 된 경우 그 사실을 사용자에게 신고할 수 있다.
② 사용자는 제1항에 따른 신고를 접수하거나 직장 내 괴롭힘 발생 사실을 인지한 경우에는 지체 없이 당사자 등을 대상으로 사실 확인을 위하여 객관적으로 조사를 실시하여야 한다.
③ 사용자는 제2항에 따른 조사 기간 동안 직장 내 괴롭힘과 관련하여 피해를 입은 근로자 또는 피해를 입었다고 주장하는 근로자(이하 "피해근로자등"이라 한다)를 보호하기 위하여 필요한 경우 해당 피해근로자등에 대하여 근무장소의 변경, 유급휴가 명령 등 적절한 조치를 하여야 한다. 이 경우 사용자는 피해근로자 등의 의사에 반하는 조치를 하여서는 아니 된다.
④ 사용자는 제2항에 따른 조사 결과 직장 내 괴롭힘 발생 사실이 확인된 때에는 피해근로자가 요청하면 근무장소의 변경, 배치전환, 유급휴가 명령 등 적절한 조치를 한다.
⑤ 사용자는 제2항에 따른 조사 결과 직장 내 괴롭힘 발생 사실이 확인된 때에는 지체 없이 행위자에 대하여 징계, 근무장소의 변경 등 필요한 조치를 하여야 한다. 이 경우 사용자는 징계 등의 조치를 하기 전에 그 조치에 대하여 피해근로자의 의견을 들어야 한다.
⑥ 사용자는 직장 내 괴롭힘 발생 사실을 신고한 근로자 및 피해근로자등에게 해고나 그 밖의 불리한 처우를 하여서는 아니 된다.
⑦ 제2항에 따라 직장 내 괴롭힘 발생 사실을 조사한 사람, 조사 내용을 보고받은 사람 및 그 밖에 조사 과정에 참여한 사람은 해당 조사 과정에서 알게 된 비밀을 피해근로자등의 의사에 반하여 다른 사람에게 누설하여서는 아니 된다. 다만, 조사와 관련된 내용을 사용자에게 보고하거나 관계 기관의 요청에 따라 필요한 정보를 제공하는 경우는 제외한다.

(2) 고용노동부 직장 내 괴롭힘 예방·대응 매뉴얼

1. 직장 내 괴롭힘의 판단
(1) 법상 직장 내 괴롭힘의 개념은 사용자 또는 근로자가 직장에서의 지위 또는 관계 등의 우위를 이용하여 업무상 적정범위를 넘어 다른 근로자에게 신체적·정신적 고통을 주거나 근무환경을 악화시키는 행위를 말함.
(2) 이러한 직장 내 괴롭힘에 해당하는지는 당사자의 관계, 행위가 행해진 장소 및 상황, 행위에 대한 피해자의 명시적 또는 추정적인 반응의 내용, 행위의 내용 및 정도, 행위가 일회적 또는 단기간의 것인지 또는 계속적인 것인지 여부 등의 구체적인 사정을 참작하여 종합적으로 판단하되,
(3) 객관적으로 피해자와 같은 처지에 있는 일반적이고도 평균적인 사람의 입장에서 신체적·정신적 고통 또는 근무환경 악화가 발생할 수 있는 행위가 있고, 그로 인하여 신체적·정신적 고통 또는 근무환경의 악화라는 결과가 발생하였음이 인정되어야 함.

2. 직장 내 괴롭힘의 주요 판단기준

(1) 행위자 측면
- 사용자뿐 아니라 근로자도 법상 직장 내 괴롭힘의 행위자가 될 수 있음
- 원칙적으로 한 직장에서의 사용자-근로자 사이, 근로자-근로자 사이에 발생한 경우에 적용될 것

(2) 행위 측면 — 아래 세 가지 핵심 요소를 모두 충족해야 함. 행위가 발생한 장소는 반드시 사업장 내일 필요가 없으며 사내 메신저, SNS 등 온라인에서 발생한 경우에도 직장 내 괴롭힘에 해당할 수 있음.

1) 직장에서의 지위 또는 관계 등의 우위를 이용할 것
- '지위의 우위'란 기본적으로 지휘명령 관계에서 상위에 있는 경우를 의미하나, 직접적인 지휘명령 관계에 놓여있지 않더라도 회사 내 직위·직급 체계상 상위에 있음을 이용하였다면 지위의 우위성을 인정할 수 있음.
- '관계의 우위'란 ① 개인 對 집단과 같은 수적 측면, ② 나이·학벌·성별·출신 지역·인종 등 인적 속성, ③ 근속연수·전문지식 등 업무역량, ④ 노조·직장협의회 등 근로자 조직의 구성원 여부, ⑤ 감사·인사부서 등 업무의 직장 내 영향력, ⑥ 정규직 여부 등에 있어 상대방이 저항 또는 거절하기 어려울 개연성이 높은 상태로 인정되는 경우를 의미하며, 사업장 내 통상적인 사회적 평가를 토대로 판단하되, 행위자-피해자 간에 이를 달리 평가해야 할 특별한 사정이 있는지도 함께 확인해야 함.
- 행위자가 문제되는 행위를 하면서 피해자와의 관계에서의 위와 같은 우위성을 '이용'해야 법상 직장 내 괴롭힘에 해당함.

2) 업무상 적정범위를 넘을 것
- 업무상 적정범위를 넘는 행위는 ① 그 행위가 사회 통념에 비추어 볼 때 업무상 필요성이 인정되지 않거나, ② 업무상 필요성은 인정되더라도 그 행위 양태가 사회 통념에 비추어 볼 때 상당하지 않다고 인정되는 행위를 말함.
- 업무상 필요성이 인정되지 않는 경우 예시: 반복적으로 개인적인 심부름을 시키는 등 인간관계에서 용인될 수 있는 부탁의 수준을 넘어 행해지는 사적 용무 지시
- 행위의 양태가 사회통념상 상당하지 않은 경우 예시: 지속·반복적인 폭언·욕설을 수반한 업무지시, 집단 따돌림, 업무수행과정에서의 의도적 무시·배제
- 다만, 사용자가 모든 직장 내 인간관계상 갈등상황에 대하여 근로기준법에 따른 조치를 취해야 하는 것은 아니므로, 문제된 행위가 업무관련성이 있는 상황에서 발생한 것이어야 함. 여기서의 업무관련성은 '포괄적인 업무관련성'을 의미하므로, 직접적인 업무수행 중에 발생한 경우가 아니더라도 업무수행에 편승하여 이루어졌거나, 업무수행을 빙자하여 발생한 경우에도 인정 가능함 (다만 휴게시설·운동시설 이용 중 발생하는 순수한 사적 분쟁은 업무관련성이 인정되기 어려움).

3) 신체적·정신적 고통을 주거나 근무환경을 악화시키는 행위일 것
- 행위자가 피해자에게 신체적·정신적 고통을 주거나 근무환경을 악화시킬 의도를 가지고 문제된 행위를 한 것이 아니더라도 그 행위로 신체적·정신적 고통을 받았거나 근무환경이 악화되었다면 인정될 수 있음.
- '근무환경 악화'란 그 행위로 인하여 피해자가 능력을 발휘하는 데 간과할 수 없을 정도의 지장이 발생하는 것을 의미하며, 업무공간을 통상적이지 않은 곳으로 지정하는 등 인사권의 행사범위에는 해당할 수 있더라도 사실적으로 근로자가 업무를 수행하는 데 적절한 환경 조성이 아닌 경우 근무환경이 악화된 것으로 볼 수 있음.

3. 직장 내 괴롭힘 행위 예시
정당한 이유 없이 업무 능력이나 성과를 인정하지 않거나 조롱함 / 정당한 이유 없이 훈련·승진·보상·일상적인 대우 등에서 차별함 / 특정 근로자에게만 모두가 꺼리는 힘든 업무를 반복적으로 부여함 / 허드렛일만 시키거나 일을 거의 주지 않음 / 정당한 이유 없이 업무 관련 중요 정보제공이나 의사결정 과정에서 배제시킴 / 정당한 이유 없이 휴가·병가·복지혜택 등을 쓰지 못하도록 압력 행사 / 특정 근로자의 일하거나 휴식하는 모습만을 지나치게 감시 / 사적 심부름 등을 지속·반복적으로 지시 / 정당한 이유 없이 부서이동 또는 퇴사를 강요함 / 개인사에 대한 뒷담화나 소문을 퍼뜨림 / 신체적인 위협이나 폭력을 가함 / 욕설이나 위협적인 말을 함 / 다른 사람들 앞이나 온라인상에서 모욕감을 주는 언행을 함 / 의사와 상관없이 음주·흡연·회식 참여를 강요함 / 집단 따돌림 / 업무에 필요한 주요 비품을 주지 않거나 인터넷·사내 네트워크 접속을 차단함

(3) 직장갑질119 직장 내 괴롭힘 대응 매뉴얼 — 유형과 사례

(1) 신체적 괴롭힘: 폭행(신체에 대하여 폭행하거나 협박하는 행위), 위협(물건이나 서류 등을 던지려고 하거나 던지는 행위)
(2) 언어적 괴롭힘: 폭언(욕설이나 폭언 등 위협적인 언행), 모욕(다른 직원들 앞 또는 온라인상에서 모욕감을 주는 행위), 협박(업무상 불이익을 주겠다며 겁박), 비하(외모·연령·학력·성별을 이유로 모멸감을 주거나 특정인과 비교)
(3) 업무적 괴롭힘: 무시(합리적 이유 없이 업무능력·성과를 인정하지 않거나 무시), 전가(본인 업무를 부하 직원에게 반복적으로 전가), 차별(훈련·승진·보상·일상적 대우에서 차별), 잡일(합리적 이유 없이 일을 주지 않거나 허드렛일을 시킴), 배제(업무 관련 정보·논의에서 배제하거나 무시), 차단(합리적 이유 없이 비품 미제공·사내 인트라넷 접속 차단), 반성(적정범위를 넘거나 차별적으로 경위서·시말서·반성문·일일업무보고를 쓰게 함), 태움(업무를 가르치며 학습능력 부족 등을 이유로 괴롭힘), 감시(일하거나 휴식하는 모습을 감시), 야근(불필요한 추가 근무 강요), SNS(업무시간 외 전화·온라인으로 업무 지시), 회식(회식·음주·흡연 또는 금연 강요)
(4) 업무외 괴롭힘: 후원(특정 종교·단체 후원 요구), 공연(원치 않는 장기자랑·경연대회 요구), 행사(체육행사·단합대회 등 비업무적 행사 강요), 심부름(업무와 무관한 개인 심부름 지시), 간섭(생활방식·가정생활 등 사적 영역에 과도하게 개입)
(5) 집단적 괴롭힘: 따돌림(상사나 다수 직원이 특정 직원과 대화하지 않거나 따돌림), 소문(근거 없는 비방·소문·누명 생산 또는 확산)
`.trim();

// "본 사건에서 해당 여부 판단" 섹션 앞에 매번 동일하게 들어가는 도입부(3요건 요지) — 고정.
const ACK_INTRO_HARASSMENT = `앞서 살펴본 바와 같이, 근로기준법상 직장 내 괴롭힘 해당 여부는
1. 직장에서의 지위 또는 관계 등의 우위를 이용한 행위여야 하고
2. 업무상 적정범위를 넘는 행위여야 하며
3. 그로 인해 피해자에게 신체적·정신적 고통을 주거나 근무환경을 악화시키는 행위여야 함

위 기준에 따라 쟁점별로 검토한 결과는 다음과 같음.
`;

let sb = null;
let session = null;
let apiKey = localStorage.getItem("cms_api_key") || "";
let model = localStorage.getItem("cms_model") || "claude-sonnet-4-5-20250929";

let currentTab = "summary";
let invSubTab = "bullying"; // bullying | sexual_harassment | misconduct
let invSelectedCaseId = null;
let reportSelectedCaseId = null;
let committeeSelectedCaseId = null;
let notifySelectedCaseId = null;
let summaryExpandedOwner = null;
let ncSelectedType = null; // 새 사건 등록 팝업에서 선택된 유형 (bullying|sexual_harassment|misconduct)
let preInterviewExpanded = false; // 사전 면담 섹션 접기/펼치기 (사건 바뀌면 초기화)
let pendingReflectFile = null; // "파일 내용을 본문에 반영하시겠습니까?" 팝업 대기 중인 File 객체

const NC_TYPE_OPTIONS = [
  { value: "bullying", label: "직장 내 괴롭힘" },
  { value: "sexual_harassment", label: "직장 내 성희롱" },
  { value: "misconduct", label: "비위행위 (그 외)" }
];

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
// 담당자는 로그인 계정과 무관하게 자유 입력. "이혜린, 전현주" / "메인: 이혜린 / 서브: 전현주" 등
// 어떤 식으로 적어도, 담당자별 현황 집계 시에는 이름 단위로 쪼개서 각자 앞으로 카운트한다.
function parseOwnerNames(ownerText) {
  if (!ownerText) return [];
  return ownerText
    .replace(/메인\s*[:：]/g, "").replace(/서브\s*[:：]/g, "")
    .split(/[,\/\n]/)
    .map(s => s.trim())
    .filter(Boolean);
}

function renderSummary(el) {
  const total = casesCache.length;
  const openCases = casesCache.filter(c => c.status !== "종결").length;
  const closedCases = casesCache.filter(c => c.status === "종결").length;

  const typeCounts = { bullying: 0, sexual_harassment: 0, misconduct: 0 };
  casesCache.forEach(c => { if (typeCounts[c.case_type] !== undefined) typeCounts[c.case_type]++; });

  // 담당자별 그룹핑 — owner_name(수기입력) 기준. 한 사건에 여러 명이 적혀 있으면 각자에게 모두 집계.
  const byOwner = {};
  casesCache.forEach(c => {
    const names = parseOwnerNames(c.owner_name);
    const keys = names.length ? names : ["(담당자 미입력)"];
    keys.forEach(key => (byOwner[key] || (byOwner[key] = [])).push(c));
  });
  const ownerKeys = Object.keys(byOwner).sort((a, b) => byOwner[b].length - byOwner[a].length);

  const rows = casesCache.map(c => `
    <tr class="clickable" onclick="openCaseDetail('${c.id}')">
      <td>${escapeHtml(c.case_name)}</td>
      <td><span class="badge ${TYPE_BADGE[c.case_type] || "badge-gray"}">${TYPE_LABEL[c.case_type] || c.case_type}</span></td>
      <td>${escapeHtml(c.department || "-")}</td>
      <td>${escapeHtml(c.owner_name || "-")}</td>
      <td><span class="badge ${STATUS_BADGE[c.status] || "badge-gray"}">${c.status}</span></td>
      <td>${escapeHtml(c.final_discipline || "-")}</td>
      <td>${fmtDate(c.created_at)}</td>
    </tr>`).join("");

  const ownerRows = ownerKeys.map(owner => {
    const list = byOwner[owner];
    const openN = list.filter(c => c.status !== "종결").length;
    const closedN = list.filter(c => c.status === "종결").length;
    const isExpanded = summaryExpandedOwner === owner;
    const ownerArg = encodeURIComponent(owner);
    const caseChips = list.map(c =>
      `<span class="badge ${STATUS_BADGE[c.status] || "badge-gray"}" style="cursor:pointer; margin:2px 4px 2px 0;" onclick="event.stopPropagation(); openCaseDetail('${c.id}')" title="${escAttr(c.status)}">${escapeHtml(truncate(c.case_name, 14))}</span>`
    ).join("");
    const mainRow = `
      <tr class="clickable" onclick="toggleOwnerExpand(decodeURIComponent('${ownerArg}'))">
        <td>${isExpanded ? "▼" : "▶"} ${escapeHtml(owner)}</td>
        <td>${list.length}건 (진행중 ${openN} · 종결 ${closedN})</td>
      </tr>`;
    const detailRow = isExpanded ? `
      <tr>
        <td colspan="2" style="background:#f9fafb;">${caseChips}</td>
      </tr>` : "";
    return mainRow + detailRow;
  }).join("");

  el.innerHTML = `
    <div class="stat-row">
      <div class="stat-card"><div class="num">${total}</div><div class="lbl">전체 사건</div></div>
      <div class="stat-card"><div class="num">${openCases}</div><div class="lbl">진행중</div></div>
      <div class="stat-card"><div class="num">${closedCases}</div><div class="lbl">종결</div></div>
    </div>
    <div class="stat-row">
      <div class="stat-card"><div class="num">${typeCounts.bullying}</div><div class="lbl">직장 내 괴롭힘</div></div>
      <div class="stat-card"><div class="num">${typeCounts.sexual_harassment}</div><div class="lbl">직장 내 성희롱</div></div>
      <div class="stat-card"><div class="num">${typeCounts.misconduct}</div><div class="lbl">기타 비위행위</div></div>
    </div>

    <div class="panel">
      <h3>담당자별 현황</h3>
      <p class="muted small">담당자를 클릭하면 담당 사건 목록이 펼쳐집니다.</p>
      ${ownerKeys.length === 0 ? "<p class='case-list-empty'>등록된 사건이 없습니다.</p>" : `
      <table class="data-table">
        <thead><tr><th>담당자</th><th>건수</th></tr></thead>
        <tbody>${ownerRows}</tbody>
      </table>`}
    </div>

    <div class="panel">
      <h3>전체 사건 목록 (클릭하면 상세보기)</h3>
      ${total === 0 ? "<p class='case-list-empty'>등록된 사건이 없습니다. '비위행위 조사' 탭에서 새 사건을 등록하세요.</p>" : `
      <table class="data-table">
        <thead><tr><th>사건명</th><th>유형</th><th>부서</th><th>담당자</th><th>진행상태</th><th>징계결과</th><th>등록일</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`}
    </div>
  `;
}

function toggleOwnerExpand(owner) {
  summaryExpandedOwner = (summaryExpandedOwner === owner) ? null : owner;
  renderSummary(document.getElementById("tabContent"));
}

function openCaseDetail(caseId) {
  const c = casesCache.find(x => x.id === caseId);
  if (!c) return;
  const box = document.getElementById("caseModalContent");
  box.innerHTML = `
    <h2>${escapeHtml(c.case_name)}</h2>
    <p><span class="badge ${TYPE_BADGE[c.case_type]}">${TYPE_LABEL[c.case_type]}</span>
       <span class="badge ${STATUS_BADGE[c.status]}">${c.status}</span></p>

    <div class="action-bar" style="justify-content:flex-start; margin-top:0; margin-bottom:14px;">
      <button class="btn" onclick="goToCaseInTab('${c.id}','investigation')">🔎 비위행위 조사 바로가기</button>
      <button class="btn" onclick="goToCaseInTab('${c.id}','report')">📄 조사결과보고서 바로가기</button>
      <button class="btn" onclick="downloadAllCaseFiles('${c.id}')">📦 관련 자료 전체 다운로드</button>
    </div>

    <div class="section-title">기본 정보</div>
    <p><b>담당자:</b> ${escapeHtml(c.owner_name || "-")} / <b>부서:</b> ${escapeHtml(c.department || "-")}</p>
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

function goToCaseInTab(caseId, tab) {
  const c = casesCache.find(x => x.id === caseId);
  closeCaseModal();
  if (tab === "investigation") {
    invSubTab = (c && c.case_type) || "misconduct";
    invSelectedCaseId = caseId;
    preInterviewExpanded = false;
  } else if (tab === "report") {
    reportSelectedCaseId = caseId;
  }
  switchTab(tab);
}

// 사건 하나와 관련된 현재까지의 자료(조사계획 엑셀 + 조사결과보고서)를 zip 하나로 묶어 다운로드.
// 증빙자료/조사일지는 아직 별도 저장 기능이 없어 포함되지 않음 — 추가되면 여기에 같이 넣으면 됨.
async function downloadAllCaseFiles(caseId) {
  const c = casesCache.find(x => x.id === caseId);
  if (!c) return;
  showToast("자료를 모으는 중입니다…");
  try {
    const zip = new JSZip();
    let fileCount = 0;

    const { data: subjects } = await sb.from("hr_case_subjects").select("*").eq("case_id", caseId).order("order_index");
    const subjectIds = (subjects || []).map(s => s.id);
    let questions = [];
    if (subjectIds.length) {
      const { data: qs } = await sb.from("hr_case_questions").select("*").in("subject_id", subjectIds).order("order_index");
      questions = qs || [];
    }
    if (subjects && subjects.length) {
      const wbBuf = buildPlanWorkbookArrayBuffer(subjects, questions);
      zip.file(`${c.case_name}_조사계획.xlsx`, wbBuf);
      fileCount++;
    }

    if (c.report_draft) {
      const ackLabel = c.case_category === "harassment" ? "본 사건에서 직장 내 괴롭힘 해당 여부 판단" : "사실관계 확정";
      const text = `${c.report_draft || ""}\n\n■ ${ackLabel}\n${c.acknowledgment || ""}\n\n■ 조사 결과에 따른 조치 의견\n${c.discipline_review || ""}`;
      zip.file(`${c.case_name}_조사결과보고서.doc`, buildWordDocBlob("조사결과보고서 — " + c.case_name, text));
      fileCount++;
    }

    if (fileCount === 0) {
      showToast("아직 다운로드할 자료가 없습니다 (조사계획/보고서를 먼저 생성하세요)");
      return;
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${c.case_name}_전체자료.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast(`${fileCount}개 파일을 묶어 다운로드했습니다. (증빙자료·조사일지는 추후 기능 추가 예정)`);
  } catch (e) {
    showToast("다운로드 실패: " + e.message);
  }
}
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
    <div class="subtabs" style="justify-content:space-between; align-items:center;">
      <div style="display:flex; gap:6px;">
        ${NC_TYPE_OPTIONS.map(o => `
          <button class="subtab-btn ${invSubTab === o.value ? "active" : ""}" onclick="setInvSubTab('${o.value}')">${o.label} 조사</button>
        `).join("")}
      </div>
      <button class="btn btn-primary" onclick="openNewCaseModal()">+ 새 사건 등록</button>
    </div>
    <div style="display:flex; gap:20px; align-items:flex-start;">
      <div class="panel" style="width:300px; flex-shrink:0;">
        <h3>사건 목록</h3>
        <div id="invCaseList"></div>
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
  const list = casesCache.filter(c => c.case_type === invSubTab).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  if (list.length === 0) { listEl.innerHTML = "<p class='case-list-empty'>사건 없음</p>"; return; }
  listEl.innerHTML = list.map(c => `
    <div class="btn ${invSelectedCaseId === c.id ? "btn-primary" : ""}" style="width:100%; text-align:left; margin-bottom:6px; display:block;" onclick="selectInvCase('${c.id}')">
      ${escapeHtml(c.case_name)} <br><span class="small ${invSelectedCaseId === c.id ? "" : "muted"}">${fmtDate(c.created_at)} · ${c.plan_accepted ? "✅확정" : "작성중"}</span>
    </div>`).join("");
}

function selectInvCase(id) { invSelectedCaseId = id; preInterviewExpanded = false; renderInvestigation(document.getElementById("tabContent")); }

/* ---------------------------------------------------------- */
/* 새 사건 등록 팝업 — 신고/접수 내용을 적으면 AI가 유형을 추천, 직접 수정도 가능 */
/* ---------------------------------------------------------- */
function ncToggleHtml() {
  return NC_TYPE_OPTIONS.map(o => `
    <div class="btn nc-type-opt ${ncSelectedType === o.value ? "btn-primary" : ""}" data-nc-type="${o.value}"
         style="width:100%; text-align:left; margin-bottom:6px; display:block;" onclick="selectNcType('${o.value}')">
      ${ncSelectedType === o.value ? "● " : "○ "}${o.label}
    </div>`).join("");
}

function openNewCaseModal() {
  ncSelectedType = null;
  const box = document.getElementById("caseModalContent");
  box.innerHTML = `
    <h2>새 사건 등록</h2>
    <label>사건명</label><input id="ncName" placeholder="예: OO팀 신고 건" />
    <label>부서/사업장</label><input id="ncDept" />
    <label>신고 내용 및 접수 내용 상세</label>
    <textarea id="ncContent" style="min-height:160px;" placeholder="신고 또는 접수된 내용을 최대한 상세히 입력하세요. 이 내용을 바탕으로 AI가 사건 유형을 추천합니다."></textarea>

    <div style="margin:4px 0 12px;">
      <button class="btn" id="ncClassifyBtn" onclick="classifyNewCase()">🪄 AI로 유형 분류 추천받기</button>
      <span id="ncClassifyStatus" class="small muted"></span>
    </div>
    <div id="ncClassifyReason" class="small muted" style="margin-bottom:10px;"></div>

    <label>사건 유형 선택 (AI 추천 결과를 직접 수정할 수 있습니다)</label>
    <div id="ncTypeToggle">${ncToggleHtml()}</div>

    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeCaseModal()">취소</button>
      <button class="btn btn-primary" onclick="submitNewCase()">등록</button>
    </div>
  `;
  document.getElementById("caseModal").classList.remove("hidden");
}

function selectNcType(val) {
  ncSelectedType = val;
  document.getElementById("ncTypeToggle").innerHTML = ncToggleHtml();
}

async function classifyNewCase() {
  if (!requireApiKey()) return;
  const content = document.getElementById("ncContent").value.trim();
  if (!content) { showToast("신고/접수 내용을 먼저 입력해주세요"); return; }
  const btn = document.getElementById("ncClassifyBtn");
  const statusEl = document.getElementById("ncClassifyStatus");
  btn.disabled = true;
  statusEl.innerHTML = "<span class='loading-dot'></span>";
  try {
    const sys = `당신은 한국 노동법(근로기준법, 남녀고용평등법)에 정통한 사내 인사팀 조사관입니다. 신고/접수 내용을 읽고 아래 세 유형 중 하나로 분류하세요.
- bullying: 직장 내 괴롭힘 (지위·관계의 우위를 이용해 업무상 적정범위를 넘는 신체적·정신적 고통, 근무환경 악화 등)
- sexual_harassment: 직장 내 성희롱 (성적 언동 등으로 인한 성적 굴욕감·혐오감, 성적 요구에 대한 불응을 이유로 한 불이익 등)
- misconduct: 그 외 일반 비위행위 (횡령·유용, 규정 위반, 근태 문제 등 성희롱·괴롭힘에 해당하지 않는 사안)
반드시 JSON 객체 하나만 출력하세요.`;
    const userMsg = `신고/접수 내용:\n${content}\n\n{"recommended":"bullying|sexual_harassment|misconduct 중 하나","reason":"분류 이유를 2~3문장으로"}`;
    const raw = await callClaude(sys, userMsg);
    const result = extractJSON(raw);
    if (["bullying", "sexual_harassment", "misconduct"].includes(result.recommended)) {
      ncSelectedType = result.recommended;
      document.getElementById("ncTypeToggle").innerHTML = ncToggleHtml();
      document.getElementById("ncClassifyReason").innerHTML = `🪄 AI 추천 이유: ${escapeHtml(result.reason || "")}`;
    }
  } catch (e) {
    showToast("분류 추천 실패: " + e.message);
  } finally {
    btn.disabled = false;
    statusEl.innerHTML = "";
  }
}

async function submitNewCase() {
  if (!ncSelectedType) { showToast("사건 유형을 선택해주세요 (AI 추천을 받거나 직접 선택)"); return; }
  const name = document.getElementById("ncName").value.trim() || "이름없는 사건";
  const dept = document.getElementById("ncDept").value.trim();
  const content = document.getElementById("ncContent").value.trim();
  const isHarassment = ncSelectedType !== "misconduct";

  const payload = {
    case_name: name,
    case_category: isHarassment ? "harassment" : "misconduct",
    case_type: ncSelectedType,
    department: dept,
    status: "접수",
    created_by: session.user.email,
    ...(isHarassment ? { report_content: content } : { incident_content: content })
  };
  const { data, error } = await sb.from("hr_case_cases").insert(payload).select().single();
  if (error) { showToast("등록 실패: " + error.message); return; }
  await refreshCases();
  invSubTab = ncSelectedType;
  invSelectedCaseId = data.id;
  closeCaseModal();
  renderInvestigation(document.getElementById("tabContent"));
}

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
  const { data: attachments } = await sb.from("hr_case_attachments").select("*").eq("case_id", c.id).order("uploaded_at");
  const caseInfoAttachments = (attachments || []).filter(a => a.section === "case_info");
  const preInterviewAttachments = (attachments || []).filter(a => a.section === "pre_interview");
  const subjectFileAttachments = (attachments || []).filter(a => ["transcript", "investigation_log", "evidence"].includes(a.section));

  const ownerHtml = `
    <label>담당자 (로그인 계정과 무관하게 직접 입력 — 메인/서브 여러 명이면 쉼표로 구분)</label>
    <input value="${escAttr(c.owner_name)}" placeholder="예: 이혜린, 전현주" onchange="saveCaseField('${c.id}','owner_name',this.value)" />
  `;

  const investigatorsHtml = `
    <label>조사자 (한 줄에 한 명, 보고서 상단에 그대로 표기됩니다)</label>
    <textarea style="min-height:70px;" placeholder="예: 커넥트웨이브 HQ 경영지원본부 HR지원실 HRM팀 홍길동" onchange="saveCaseField('${c.id}','investigators',this.value)">${escapeHtml(c.investigators || "")}</textarea>
  `;

  const isHarassment = c.case_category === "harassment";

  // ---- 직장 내 괴롭힘 · 성희롱: 사건정보(파일첨부 포함) + 사전면담(접기/펼치기) ----
  const caseInfoHtml = `
    <div class="section-title">사건 정보</div>
    ${ownerHtml}
    <label>신고인</label><input value="${escAttr(c.reporter)}" onchange="saveCaseField('${c.id}','reporter',this.value)" />
    <label style="display:flex; justify-content:space-between; align-items:center;">
      <span>피신고인</span>
      <button type="button" class="btn btn-sm" onclick="addAccusedInput('${c.id}')">+ 피신고인 추가</button>
    </label>
    ${accusedInputsHtml(c.id, c.accused)}
    <label>신고일자</label><input type="date" value="${c.report_date || ""}" onchange="saveCaseField('${c.id}','report_date',this.value)" />
    <label>신고내용</label><textarea onchange="saveCaseField('${c.id}','report_content',this.value)">${escapeHtml(c.report_content || "")}</textarea>
    <div style="margin:-4px 0 10px;">
      <button type="button" class="btn btn-sm" onclick="attachFileFlow('${c.id}','case_info','report_content')">📎 파일 첨부</button>
    </div>
    ${attachmentListHtml(caseInfoAttachments)}
  `;

  const preInterviewHtml = `
    <div class="section-title collapsible-title" onclick="togglePreInterview()">사전 면담 ${preInterviewExpanded ? "▼" : "▶"} <span class="small muted">(선택 사항 — 클릭해서 펼치기/접기)</span></div>
    ${preInterviewExpanded ? `
      <label>면담자</label><input value="${escAttr(c.pre_interview_interviewer)}" onchange="saveCaseField('${c.id}','pre_interview_interviewer',this.value)" />
      <label>피면담자</label><input value="${escAttr(c.pre_interview_interviewee)}" onchange="saveCaseField('${c.id}','pre_interview_interviewee',this.value)" />
      <label>면담일자</label><input type="date" value="${c.pre_interview_date || ""}" onchange="saveCaseField('${c.id}','pre_interview_date',this.value)" />
      <label>면담장소</label><input value="${escAttr(c.pre_interview_location)}" onchange="saveCaseField('${c.id}','pre_interview_location',this.value)" />
      <label>면담내용</label><textarea onchange="saveCaseField('${c.id}','pre_interview_content',this.value)">${escapeHtml(c.pre_interview_content || "")}</textarea>
      <div style="margin:-4px 0 10px;">
        <button type="button" class="btn btn-sm" onclick="attachFileFlow('${c.id}','pre_interview','pre_interview_content')">📎 파일 첨부</button>
      </div>
      <label>증빙자료</label>
      ${attachmentListHtml(preInterviewAttachments)}
    ` : ""}
  `;

  // ---- 그 외 비위행위: 기존 방식 그대로 ----
  const inputFieldsHtml = !isHarassment ? `
    <div class="section-title">사건 정보</div>
    ${ownerHtml}
    <label>비위행위 발생일</label><input type="date" value="${c.incident_date || ""}" onchange="saveCaseField('${c.id}','incident_date',this.value)" />
    <label>비위행위 내용</label><textarea onchange="saveCaseField('${c.id}','incident_content',this.value)">${escapeHtml(c.incident_content || "")}</textarea>
    ${c.additional_investigation_need !== null && c.additional_investigation_need !== undefined && subjects.length ? `
      <label>추가조사 필요성 (AI 생성)</label><textarea onchange="saveCaseField('${c.id}','additional_investigation_need',this.value)">${escapeHtml(c.additional_investigation_need || "")}</textarea>
    ` : ""}
  ` : "";

  const subjectsHtml = (subjects || []).map(s => {
    const qs = questions.filter(q => q.subject_id === s.id);
    return `
      <div class="subject-row">
        <div class="subject-row-head">
          <input style="width:130px; margin:0;" placeholder="이름" value="${escAttr(s.name)}" onchange="saveSubjectField('${s.id}','name',this.value)" />
          <select style="width:100px; margin:0;" onchange="saveSubjectField('${s.id}','role',this.value)">
            ${ROLE_OPTIONS.map(r => `<option ${r === s.role ? "selected" : ""}>${r}</option>`).join("")}
          </select>
          <input type="date" style="width:145px; margin:0;" value="${s.investigation_date || ""}" onchange="saveSubjectField('${s.id}','investigation_date',this.value)" />
          <input type="time" style="width:105px; margin:0;" value="${s.investigation_time || ""}" onchange="saveSubjectField('${s.id}','investigation_time',this.value)" />
          <input style="width:130px; margin:0;" placeholder="조사 장소" value="${escAttr(s.location)}" onchange="saveSubjectField('${s.id}','location',this.value)" />
          <button class="btn btn-sm btn-danger" onclick="deleteSubject('${s.id}')">삭제</button>
        </div>
        <textarea placeholder="비고" style="min-height:40px;" onchange="saveSubjectField('${s.id}','memo',this.value)">${escapeHtml(s.memo || "")}</textarea>
        <div class="small muted" style="margin:6px 0 4px;">질문지 · 답변 요약</div>
        ${qs.map(q => `
          <div class="q-item">
            <textarea placeholder="질문" onchange="saveQuestionField('${q.id}','question',this.value)">${escapeHtml(q.question || "")}</textarea>
            <button class="btn btn-sm btn-danger" onclick="deleteQuestion('${q.id}')">✕</button>
          </div>
          <textarea class="small" style="min-height:36px; margin-top:-4px;" placeholder="답변 요약" onchange="saveQuestionField('${q.id}','answer_summary',this.value)">${escapeHtml(q.answer_summary || "")}</textarea>`).join("")}
        <button class="btn btn-sm" onclick="addQuestion('${s.id}','${c.id}')">+ 질문 추가</button>
      </div>`;
  }).join("");

  panel.innerHTML = `
    ${isHarassment ? (caseInfoHtml + preInterviewHtml + investigatorsHtml) : (inputFieldsHtml + investigatorsHtml)}

    <div class="section-title" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <span>조사대상자 · 질문지 ${c.plan_accepted ? "<span class='badge badge-green'>확정됨</span>" : ""}</span>
      ${subjects && subjects.length ? `<button type="button" class="btn btn-sm" onclick="openSubjectAttachModal('${c.id}')">📎 파일 첨부</button>` : ""}
    </div>
    ${(!subjects || subjects.length === 0) ? `
      <button class="btn btn-primary" id="genPlanBtn" onclick="generatePlan('${c.id}')">🪄 AI로 조사계획 생성</button>
      <span id="genPlanStatus"></span>
    ` : `
      ${subjectsHtml}
      <button class="btn btn-sm" onclick="addSubject('${c.id}')">+ 조사대상자 추가</button>
      <div class="action-bar">
        ${!c.plan_accepted ? `<button class="btn" onclick="generatePlan('${c.id}')">🔄 AI로 다시 생성</button>` : ""}
        <button class="btn" onclick="exportPlanExcel('${c.id}')">📊 엑셀 다운로드</button>
        <button class="btn" onclick="openSubjectExportModal('${c.id}')">🖨️ 출력 (Word)</button>
        ${c.plan_accepted
          ? `<button class="btn" onclick="setPlanAccepted('${c.id}', false)">수정하기 (잠금 해제)</button>`
          : `<button class="btn btn-primary" onclick="setPlanAccepted('${c.id}', true)">✅ 수락 (확정)</button>`}
      </div>
      <div class="small muted" style="margin:14px 0 4px;">첨부목록 (녹취록 · 조사일지 · 증빙자료)</div>
      ${attachmentListHtml(subjectFileAttachments, a => attachmentSubjectLabel(a, subjects))}
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
피신고인(기재됨): ${c.accused || "미상"}
신고일자: ${c.report_date || "미상"}
신고내용: ${c.report_content || "(내용 없음)"}
${c.pre_interview_content ? `
사전 면담 정보:
- 면담자: ${c.pre_interview_interviewer || "미상"} / 피면담자: ${c.pre_interview_interviewee || "미상"} / 면담일자: ${c.pre_interview_date || "미상"} / 면담장소: ${c.pre_interview_location || "미상"}
- 면담내용: ${c.pre_interview_content}
` : ""}
위 신고내용(및 사전 면담 정보가 있다면 함께)을 바탕으로 아래 JSON 스키마로 조사계획을 작성하세요.
신고인은 반드시 조사대상자에 role="신고인"으로 포함하고, 피신고인이 기재되어 있으면 그 이름 그대로 각각 role="피신고인"으로 포함하세요(기재된 피신고인이 없고 신고내용에서 특정 가능하면 이름을 채우고, 특정도 불가능하면 "(성명 확인 필요)"로 표기). 목격자/참고인은 신고내용·사전면담에서 언급된 인물이 있으면 포함하세요.
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

// 조사계획(조사대상자+질문지) 워크북을 만들어 ArrayBuffer로 반환 — 단독 다운로드와 zip 묶음 다운로드에서 공용으로 사용.
function buildPlanWorkbookArrayBuffer(subjects, questions) {
  const subjWs = XLSX.utils.aoa_to_sheet([
    ["이름", "역할", "조사일자", "비고"],
    ...(subjects || []).map(s => [s.name, s.role, s.investigation_date || "", s.memo || ""])
  ]);
  const qRows = [["대상자명", "역할", "질문", "질문의도", "답변요약"]];
  (subjects || []).forEach(s => {
    (questions || []).filter(q => q.subject_id === s.id).forEach(q => {
      qRows.push([s.name, s.role, q.question || "", q.intent || "", q.answer_summary || ""]);
    });
  });
  const qWs = XLSX.utils.aoa_to_sheet(qRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, subjWs, "조사대상자");
  XLSX.utils.book_append_sheet(wb, qWs, "질문지");
  return XLSX.write(wb, { bookType: "xlsx", type: "array" });
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

// 조사자/조사대상자·일정은 AI가 지어내지 않고, 앱에 실제로 입력된 값 그대로 조립한다.
function buildInvestigatorsBlock(c) {
  const names = (c.investigators || "").split("\n").map(s => s.trim()).filter(Boolean);
  return "조사자\n\n" + (names.length ? names.map(n => `- ${n}`).join("\n") : "(조사자 미입력 — 사건 화면에서 입력해주세요)");
}
function buildScheduleBlock(subjects) {
  const byRole = {};
  ROLE_OPTIONS.forEach(r => byRole[r] = []);
  (subjects || []).forEach(s => { (byRole[s.role] || (byRole[s.role] = [])).push(s); });
  const rosterLines = ROLE_OPTIONS
    .filter(r => byRole[r] && byRole[r].length)
    .map(r => `- ${r}: ${byRole[r].map(s => s.name || "(성명 미입력)").join(", ")}`);
  const scheduleLines = (subjects || [])
    .filter(s => s.investigation_date)
    .map(s => `- ${s.investigation_date}  ${s.name || "(성명 미입력)"} (${s.role})`);
  return "조사 방법 및 일정\n\n" +
    "조사대상자\n" + (rosterLines.join("\n") || "(등록된 조사대상자 없음)") + "\n\n" +
    "조사 일정\n" + (scheduleLines.join("\n") || "(조사일 기록 없음)");
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
    const sys = `당신은 한국 노동법에 정통한 사내 인사팀 조사관입니다. 실제 회사에서 쓰는 "직장 내 괴롭힘/비위행위 사건 조사 보고서" 양식과 격식있는 문어체를 따라 조사결과보고서 초안을 작성합니다.
매우 중요: 제공된 사실관계(사건 설명, 대상자별 질문/답변)에 없는 날짜·발언·정황·참고인 진술은 절대로 지어내지 마세요. 근거가 부족한 부분은 "(추가 확인 필요)"라고 명시하세요. 반드시 JSON 객체 하나만 출력하고 다른 설명 텍스트는 출력하지 마세요.`;

    const schemaNote = isHarassment
      ? `issue_sections는 신고 내용에서 확인되는 쟁점(문제행위)별로 나누어, 각 쟁점마다 "1) 주요쟁점 2) 관련 진술·정황(참고인 답변 인용 포함) 3) 소결"의 흐름으로 작성하세요. 근거가 있는 내용만 쓰고, 참고인이 실제로 언급하지 않은 진술은 인용하지 마세요.
acknowledgment는 위 쟁점 각각에 대해 "(1) 지위·관계의 우위 존재 여부, (2) 업무상 적정범위를 넘는 행위인지, (3) 신체적·정신적 고통/근무환경 악화 여부"의 틀로 검토의견을 서술하세요 (법 조문·매뉴얼 원문은 이미 별도로 첨부되므로 반복해서 쓰지 마세요).`
      : `issue_sections는 확인된 비위행위 유형/사안별로 나누어, 각 사안마다 "1) 주요쟁점 2) 관련 진술·정황(참고인 답변 인용 포함) 3) 소결"의 흐름으로 작성하세요. 근거가 있는 내용만 쓰고, 참고인이 실제로 언급하지 않은 진술은 인용하지 마세요.
acknowledgment는 사안별로 확인된 사실관계를 명확히 확정하여 서술하세요.`;

    const userMsg = `
사건명: ${c.case_name}
유형: ${TYPE_LABEL[c.case_type]}
${isHarassment ? `신고인: ${c.reporter}\n신고일자: ${c.report_date || ""}\n신고내용: ${c.report_content}` : `비위행위 발생일: ${c.incident_date}\n비위행위 내용: ${c.incident_content}\n추가조사필요성: ${c.additional_investigation_need || ""}`}

조사대상자 및 진행 내용(이름/역할/조사일/비고/질문·답변):
${factsBlock || "(등록된 조사대상자/답변 없음)"}

아래 JSON 스키마로 작성하세요.
case_overview는 "당사자 관계"와 "사건의 경위"를 하나의 흐름으로 서술하세요 (당사자 각자의 역할·관계, 신고/인지 경위, 조사 착수까지의 경과 순).
${schemaNote}
discipline_review는 사실관계에 따른 징계수준 검토의견(참작사유 포함)을 서술하세요. 사내 규정 조항 번호는 알 수 없으므로 지어내지 말고 "취업규칙/상벌규정 등 관련 규정에 따라"와 같이 일반적으로 표현하세요.

{"case_overview":"", "issue_sections":[{"title":"","content":""}], "acknowledgment":"", "discipline_review":""}
`;
    const raw = await callClaude(sys, userMsg);
    const result = extractJSON(raw);

    const issueSections = Array.isArray(result.issue_sections) ? result.issue_sections : [];
    const issueText = issueSections.map(s => `■ ${s.title || "(제목 없음)"}\n\n${s.content || ""}`).join("\n\n\n");

    const reportDraft = [
      buildInvestigatorsBlock(c),
      buildScheduleBlock(subjects),
      "당사자 관계 및 사건의 경위\n\n" + (result.case_overview || ""),
      issueText,
      isHarassment ? LEGAL_STANDARD_HARASSMENT : ""
    ].filter(Boolean).join("\n\n\n");

    const acknowledgment = (isHarassment ? ACK_INTRO_HARASSMENT + "\n" : "") + (result.acknowledgment || "");

    await sb.from("hr_case_cases").update({
      report_draft: reportDraft,
      acknowledgment,
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
  const ackLabel = c.case_category === "harassment" ? "본 사건에서 직장 내 괴롭힘 해당 여부 판단" : "사실관계 확정";
  const text = `${c.report_draft || ""}\n\n■ ${ackLabel}\n${c.acknowledgment || ""}\n\n■ 조사 결과에 따른 조치 의견\n${c.discipline_review || ""}`;
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

// fileBlock: 첨부파일을 텍스트로 뽑을 수 없을 때(예: PDF) 원본을 그대로 AI에 보내기 위한
// Claude API document 콘텐츠 블록. 있으면 userPrompt 텍스트와 함께 보냄.
async function callClaude(systemPrompt, userPrompt, fileBlock) {
  const content = fileBlock ? [fileBlock, { type: "text", text: userPrompt }] : userPrompt;
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
      max_tokens: 16000,
      system: systemPrompt,
      messages: [{ role: "user", content }]
    })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`API 오류 (${res.status}): ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = (data.content || []).map(b => b.text || "").join("");
  if (data.stop_reason === "max_tokens") {
    throw new Error("AI 응답이 너무 길어 중간에 잘렸습니다. 사건 내용을 조금 줄여서 다시 시도해보세요.");
  }
  return text;
}

function extractJSON(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    console.error("AI 원본 응답(JSON 아님):", text);
    throw new Error("AI 응답에서 JSON을 찾을 수 없습니다. (개발자 도구 콘솔에 원본 응답을 출력했습니다)");
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    console.error("AI 원본 응답(JSON 파싱 실패):", text);
    throw new Error("AI 응답을 해석하지 못했습니다. 다시 시도해보세요. (콘솔에 원본 응답 출력됨)");
  }
}

/* ============================================================
   첨부파일 (Supabase Storage 'case-files' 버킷, 비공개 — 서명 URL로만 열람)
   ============================================================ */
const ATTACH_BUCKET = "case-files";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function uploadCaseFile(caseId, section, subjectId, file) {
  const safeName = file.name.replace(/[^\w.\-가-힣 ]/g, "_");
  const path = `${caseId}/${section}/${Date.now()}_${safeName}`;
  const { error: upErr } = await sb.storage.from(ATTACH_BUCKET).upload(path, file);
  if (upErr) throw new Error("업로드 실패: " + upErr.message + " (Supabase에 'case-files' Storage 버킷이 없다면 관리자에게 SQL 실행을 요청하세요)");
  const { data, error } = await sb.from("hr_case_attachments").insert({
    case_id: caseId, subject_id: subjectId || null, section,
    file_name: file.name, storage_path: path, uploaded_by: (session && session.user && session.user.email) || ""
  }).select().single();
  if (error) throw new Error("첨부파일 기록 실패: " + error.message);
  return data;
}

async function openAttachmentUrl(storagePath) {
  const { data, error } = await sb.storage.from(ATTACH_BUCKET).createSignedUrl(storagePath, 300);
  if (error) { showToast("파일 열기 실패: " + error.message); return; }
  window.open(data.signedUrl, "_blank");
}

async function downloadAttachment(storagePath, fileName) {
  const { data, error } = await sb.storage.from(ATTACH_BUCKET).download(storagePath);
  if (error) { showToast("다운로드 실패: " + error.message); return; }
  downloadBlob(data, fileName);
}

async function deleteAttachment(id, storagePath) {
  if (!confirm("이 첨부파일을 삭제할까요?")) return;
  await sb.storage.from(ATTACH_BUCKET).remove([storagePath]);
  await sb.from("hr_case_attachments").delete().eq("id", id);
  renderInvDetail();
}

// 첨부파일 목록 HTML — labelFn(att) 으로 표기할 이름을 커스터마이즈 가능 (기본은 원본 파일명)
function attachmentListHtml(list, labelFn) {
  if (!list || !list.length) return "<p class='small muted' style='margin-bottom:12px;'>첨부된 파일이 없습니다.</p>";
  return `<ul class="attach-list">${list.map(a => `
    <li>
      <a href="#" onclick="event.preventDefault(); openAttachmentUrl('${a.storage_path}')" title="새 창에서 열기">📎 ${escapeHtml(labelFn ? labelFn(a) : a.file_name)}</a>
      <span style="display:flex; gap:6px; flex-shrink:0;">
        <button type="button" class="btn btn-sm" onclick="downloadAttachment('${a.storage_path}', decodeURIComponent('${encodeURIComponent(a.file_name)}'))">다운로드</button>
        <button type="button" class="btn btn-sm btn-danger" onclick="deleteAttachment('${a.id}','${a.storage_path}')">삭제</button>
      </span>
    </li>`).join("")}</ul>`;
}

function attachmentSubjectLabel(a, subjects) {
  const subj = (subjects || []).find(s => s.id === a.subject_id);
  const dateStr = (a.uploaded_at || "").slice(0, 10);
  if (a.section === "transcript") return `녹취록_${subj ? subj.name : "미지정"}_${dateStr}`;
  if (a.section === "investigation_log") return `조사일지_${subj ? subj.name : "미지정"}_${dateStr}`;
  return a.file_name;
}

// 첨부파일에서 텍스트를 뽑아낼 수 있으면 문자열을, 없으면(예: pdf/이미지) null을 반환.
async function extractFileText(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".csv")) {
    return await file.text();
  }
  if (name.endsWith(".docx") && typeof mammoth !== "undefined") {
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return result.value || "";
  }
  return null;
}

async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// AI가 읽을 수 있는 형태(추출된 텍스트 or PDF 원본 블록)를 준비. 지원 안 되는 형식이면 null 반환.
async function prepareFileForAi(file) {
  const text = await extractFileText(file);
  if (text !== null) return { promptExtra: text.slice(0, 20000), fileBlock: null };
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const b64 = await fileToBase64(file);
    return { promptExtra: "", fileBlock: { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } } };
  }
  return null; // 지원 안 되는 형식 (txt/docx/pdf만 지원)
}

/* ---- 사건정보 / 사전면담: 파일 첨부 + "본문에 반영할까요?" 팝업 ---- */
function attachFileFlow(caseId, section, targetField) {
  const input = document.createElement("input");
  input.type = "file";
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    showToast("파일 업로드 중…");
    try {
      await uploadCaseFile(caseId, section, null, file);
      showToast("파일이 첨부되었습니다");
      openAiReflectPopup(caseId, section, targetField, file);
    } catch (e) {
      showToast(e.message);
      renderInvDetail();
    }
  };
  input.click();
}

function openAiReflectPopup(caseId, section, targetField, file) {
  pendingReflectFile = file;
  const label = section === "case_info" ? "신고 내용" : "사전 면담 내용";
  const box = document.getElementById("caseModalContent");
  box.innerHTML = `
    <h2>파일 내용을 본문에 반영하시겠습니까?</h2>
    <p class="muted">첨부하신 "${escapeHtml(file.name)}" 파일 내용을 기준으로 AI가 "${label}"을 자동으로 작성합니다. 원치 않으면 "아니오"를 눌러 직접 입력하세요.</p>
    <p class="small muted">(지원 형식: txt, docx, pdf — 그 외 형식은 첨부만 되고 자동 작성은 지원되지 않습니다)</p>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="pendingReflectFile=null; closeCaseModal(); renderInvDetail();">아니오</button>
      <button class="btn btn-primary" id="aiReflectYesBtn" onclick="runAiReflect('${caseId}','${section}','${targetField}')">예</button>
    </div>
  `;
  document.getElementById("caseModal").classList.remove("hidden");
}

async function runAiReflect(caseId, section, targetField) {
  const file = pendingReflectFile;
  if (!file) return;
  if (!requireApiKey()) return;
  const btn = document.getElementById("aiReflectYesBtn");
  if (btn) btn.disabled = true;
  showToast("AI가 파일 내용을 분석하는 중입니다…");
  try {
    const prepared = await prepareFileForAi(file);
    if (!prepared) {
      showToast("이 파일 형식은 AI 자동 인식을 지원하지 않습니다 (txt/docx/pdf만 지원). 파일은 첨부되었으니 직접 입력해주세요.");
      return;
    }
    const label = section === "case_info" ? "신고 내용" : "사전 면담 내용";
    const sys = `당신은 한국 노동법(근로기준법, 남녀고용평등법)에 정통한 사내 인사팀 조사관입니다. 첨부된 자료를 바탕으로 "${label}" 항목에 들어갈 내용을 사실관계 위주로 정리해 작성하세요. 자료에 없는 내용은 절대 추측하거나 지어내지 마세요. 다른 설명 없이 본문 내용만 출력하세요.`;
    const userMsg = `아래는 "${label}"을 작성하기 위한 참고 자료입니다.\n\n${prepared.promptExtra}\n\n위 자료를 바탕으로 "${label}"에 들어갈 내용을 정리해 작성해주세요.`;
    const raw = await callClaude(sys, userMsg, prepared.fileBlock);
    await sb.from("hr_case_cases").update({ [targetField]: raw.trim() }).eq("id", caseId);
    await refreshCases();
    showToast("AI가 내용을 반영했습니다. 확인 후 필요하면 직접 수정하세요.");
  } catch (e) {
    showToast("반영 실패: " + e.message);
  } finally {
    pendingReflectFile = null;
    closeCaseModal();
    renderInvDetail();
  }
}

/* ---- 다중 피신고인 입력 ---- */
function accusedInputsHtml(caseId, accusedText) {
  const names = (accusedText || "").split(",").map(s => s.trim()).filter(Boolean);
  const rows = names.length ? names : [""];
  return `<div id="accusedInputs">${rows.map(n => `
    <div style="display:flex; gap:6px; margin-bottom:6px;">
      <input value="${escAttr(n)}" placeholder="피신고인 이름" oninput="syncAccusedField('${caseId}')" style="margin:0;" />
      <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove(); syncAccusedField('${caseId}')">✕</button>
    </div>`).join("")}</div>`;
}

function addAccusedInput(caseId) {
  const wrap = document.getElementById("accusedInputs");
  if (!wrap) return;
  const div = document.createElement("div");
  div.style.cssText = "display:flex; gap:6px; margin-bottom:6px;";
  div.innerHTML = `<input placeholder="피신고인 이름" oninput="syncAccusedField('${caseId}')" style="margin:0;" />
    <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove(); syncAccusedField('${caseId}')">✕</button>`;
  wrap.appendChild(div);
  div.querySelector("input").focus();
}

let accusedSaveTimer = null;
function syncAccusedField(caseId) {
  const wrap = document.getElementById("accusedInputs");
  if (!wrap) return;
  const names = Array.from(wrap.querySelectorAll("input")).map(i => i.value.trim()).filter(Boolean);
  clearTimeout(accusedSaveTimer);
  accusedSaveTimer = setTimeout(async () => {
    await sb.from("hr_case_cases").update({ accused: names.join(", ") }).eq("id", caseId);
    await refreshCases();
  }, 600);
}

/* ---- 사전 면담 접기/펼치기 ---- */
function togglePreInterview() {
  preInterviewExpanded = !preInterviewExpanded;
  renderInvDetail();
}

/* ---- 조사대상자·질문지: 파일 첨부(녹취록/조사일지/증빙자료) ---- */
async function openSubjectAttachModal(caseId) {
  const { data: subjects } = await sb.from("hr_case_subjects").select("*").eq("case_id", caseId).order("order_index");
  const box = document.getElementById("caseModalContent");
  box.innerHTML = `
    <h2>파일 첨부</h2>
    <label>파일 종류</label>
    <select id="satType">
      <option value="transcript">녹취록 (AI가 질문지·답변에 대화형식으로 자동 반영)</option>
      <option value="investigation_log">조사일지 (내용 반영 없이 파일 그대로 저장)</option>
      <option value="evidence">증빙자료 (내용 반영 없이 파일 그대로 저장)</option>
    </select>
    <label>관련 조사대상자 (증빙자료는 선택 안 해도 됨)</label>
    <select id="satSubject">
      <option value="">(선택 안 함)</option>
      ${(subjects || []).map(s => `<option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.role || "")})</option>`).join("")}
    </select>
    <label>파일 선택</label>
    <input type="file" id="satFile" />
    <p class="small muted">녹취록 자동 반영은 txt/docx/pdf 형식만 지원됩니다.</p>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeCaseModal()">취소</button>
      <button class="btn btn-primary" onclick="submitSubjectAttach('${caseId}')">업로드</button>
    </div>
  `;
  document.getElementById("caseModal").classList.remove("hidden");
}

async function submitSubjectAttach(caseId) {
  const type = document.getElementById("satType").value;
  const subjectId = document.getElementById("satSubject").value || null;
  const file = document.getElementById("satFile").files[0];
  if (!file) { showToast("파일을 선택해주세요"); return; }
  if (type !== "evidence" && !subjectId) { showToast("녹취록/조사일지는 관련 조사대상자를 선택해야 합니다"); return; }
  showToast("업로드 중…");
  try {
    await uploadCaseFile(caseId, type, subjectId, file);
    if (type === "transcript") {
      closeCaseModal();
      await runTranscriptReflect(caseId, subjectId, file);
    } else {
      showToast("파일이 저장되었습니다");
      closeCaseModal();
      renderInvDetail();
    }
  } catch (e) {
    showToast(e.message);
  }
}

async function runTranscriptReflect(caseId, subjectId, file) {
  if (!requireApiKey()) return;
  showToast("AI가 녹취록에서 질문·답변을 정리하는 중입니다…");
  try {
    const { data: subj } = await sb.from("hr_case_subjects").select("*").eq("id", subjectId).single();
    const { data: existingQs } = await sb.from("hr_case_questions").select("*").eq("subject_id", subjectId).order("order_index");
    const prepared = await prepareFileForAi(file);
    if (!prepared) {
      showToast("이 파일 형식은 AI 자동 인식을 지원하지 않습니다 (txt/docx/pdf만 지원). 파일은 저장되었습니다.");
      renderInvDetail();
      return;
    }
    const existingList = (existingQs || []).map(q => q.question).filter(Boolean);
    const existingHint = existingList.length
      ? `\n\n기존에 준비된 질문 목록(참고용 — 녹취록에 해당 답변이 있으면 반영하고, 없으면 생략해도 됩니다):\n${existingList.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
      : "";
    const sys = `당신은 한국 노동법에 정통한 사내 인사팀 조사관입니다. 면담 녹취록을 읽고 "${subj ? subj.name : ""}"(${subj ? subj.role : ""})에 대한 질문과 답변을 대화형식으로 정리합니다. 녹취록에 없는 내용은 절대 지어내지 마세요. 반드시 JSON 객체 하나만 출력하고 다른 설명은 출력하지 마세요.`;
    const userMsg = `아래는 "${subj ? subj.name : ""}" 조사대상자와의 면담 녹취록입니다.\n\n${prepared.promptExtra}${existingHint}\n\n녹취록 내용을 바탕으로 질문·답변을 정리해 아래 JSON 스키마로 출력하세요. answer_summary는 실제 발언 내용을 대화형식(진술체)으로 정리하세요.\n\n{"qa":[{"question":"","answer_summary":""}]}`;
    const raw = await callClaude(sys, userMsg, prepared.fileBlock);
    const result = extractJSON(raw);
    const qaList = result.qa || [];
    if (!qaList.length) { showToast("녹취록에서 질문·답변을 추출하지 못했습니다."); return; }
    await sb.from("hr_case_questions").delete().eq("subject_id", subjectId);
    let idx = 0;
    for (const qa of qaList) {
      await sb.from("hr_case_questions").insert({
        case_id: caseId, subject_id: subjectId, order_index: idx++,
        question: qa.question || "", answer_summary: qa.answer_summary || ""
      });
    }
    showToast(`녹취록 반영 완료 (${qaList.length}개 문답) — 기존 질문지는 녹취록 내용으로 교체되었습니다. 확인해주세요.`);
  } catch (e) {
    showToast("녹취록 반영 실패: " + e.message);
  } finally {
    renderInvDetail();
  }
}

/* ---- 조사대상자별 질문지 Word 출력 ---- */
function buildSubjectWordBlob(c, s, qs) {
  const header = `사건명: ${c.case_name}\n이름: ${s.name || ""}\n구분: ${s.role || ""}\n조사일시: ${s.investigation_date || ""} ${s.investigation_time || ""}\n조사장소: ${s.location || ""}\n`;
  const qaText = (qs || []).map((q, i) => `${i + 1}. ${q.question || ""}\n   → ${q.answer_summary || "(답변 미기재)"}`).join("\n\n");
  return buildWordDocBlob(`조사일지 — ${s.name || ""}`, header + "\n" + qaText);
}

async function openSubjectExportModal(caseId) {
  const { data: subjects } = await sb.from("hr_case_subjects").select("*").eq("case_id", caseId).order("order_index");
  if (!subjects || !subjects.length) { showToast("조사대상자가 없습니다"); return; }
  const box = document.getElementById("caseModalContent");
  box.innerHTML = `
    <h2>조사대상자별 질문지 출력</h2>
    <p class="muted small">Word 파일로 다운로드할 조사대상자를 선택하세요.</p>
    ${subjects.map(s => `
      <label style="display:flex; align-items:center; gap:8px; font-weight:normal; color:var(--text);">
        <input type="checkbox" class="satExportChk" value="${s.id}" checked style="width:auto; margin:0;" /> ${escapeHtml(s.name)} (${escapeHtml(s.role || "")})
      </label>`).join("")}
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeCaseModal()">취소</button>
      <button class="btn btn-primary" onclick="runSubjectExport('${caseId}')">다운로드</button>
    </div>
  `;
  document.getElementById("caseModal").classList.remove("hidden");
}

async function runSubjectExport(caseId) {
  const c = casesCache.find(x => x.id === caseId);
  const ids = Array.from(document.querySelectorAll(".satExportChk:checked")).map(el => el.value);
  if (!ids.length) { showToast("조사대상자를 1명 이상 선택하세요"); return; }
  closeCaseModal();
  showToast("Word 파일 생성 중…");
  try {
    const { data: subjects } = await sb.from("hr_case_subjects").select("*").in("id", ids);
    const { data: questions } = await sb.from("hr_case_questions").select("*").in("subject_id", ids).order("order_index");
    if (ids.length === 1) {
      const s = subjects[0];
      const blob = buildSubjectWordBlob(c, s, (questions || []).filter(q => q.subject_id === s.id));
      downloadBlob(blob, `${c.case_name}_${s.name}_질문지.doc`);
    } else {
      const zip = new JSZip();
      subjects.forEach(s => {
        const blob = buildSubjectWordBlob(c, s, (questions || []).filter(q => q.subject_id === s.id));
        zip.file(`${c.case_name}_${s.name}_질문지.doc`, blob);
      });
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, `${c.case_name}_조사대상자별_질문지.zip`);
    }
    showToast("다운로드 완료");
  } catch (e) {
    showToast("다운로드 실패: " + e.message);
  }
}

/* ============================================================
   Word export (HTML→.doc 트릭, 실제 Word에서 정상적으로 열립니다)
   ============================================================ */
// .doc(HTML 기반) Blob을 만들어 반환 — 단독 다운로드와 zip 묶음 다운로드에서 공용으로 사용.
function buildWordDocBlob(title, contentText) {
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
  return new Blob(["﻿", html], { type: "application/msword" });
}

function downloadWordDoc(filename, title, contentText) {
  const blob = buildWordDocBlob(title, contentText);
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
