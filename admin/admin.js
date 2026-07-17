"use strict";

const STORAGE_KEY = "jmqb_admin_v1";
const PAGE_SIZE = 12;

const DEFAULT_KNOWLEDGE = [
  { grade: 7, chapter: "有理数", name: "正数和负数", keywords: ["正数", "负数", "相反意义"] },
  { grade: 7, chapter: "有理数", name: "数轴", keywords: ["数轴", "原点", "单位长度"] },
  { grade: 7, chapter: "有理数", name: "绝对值", keywords: ["绝对值", "|x|"] },
  { grade: 7, chapter: "整式的加减", name: "合并同类项", keywords: ["同类项", "合并同类项"] },
  { grade: 7, chapter: "一元一次方程", name: "解一元一次方程", keywords: ["一元一次方程", "移项", "去分母"] },
  { grade: 7, chapter: "几何图形初步", name: "线段与角", keywords: ["线段", "射线", "角", "余角", "补角"] },

  { grade: 8, chapter: "三角形", name: "三角形内角和", keywords: ["三角形", "内角和", "外角"] },
  { grade: 8, chapter: "全等三角形", name: "全等三角形判定", keywords: ["全等", "SSS", "SAS", "ASA", "AAS"] },
  { grade: 8, chapter: "轴对称", name: "轴对称与等腰三角形", keywords: ["轴对称", "等腰三角形", "垂直平分线"] },
  { grade: 8, chapter: "整式乘法与因式分解", name: "因式分解", keywords: ["因式分解", "提公因式", "平方差", "完全平方"] },
  { grade: 8, chapter: "分式", name: "分式方程", keywords: ["分式方程", "增根", "最简公分母"] },
  { grade: 8, chapter: "一次函数", name: "一次函数图象与性质", keywords: ["一次函数", "正比例函数", "斜率", "y=kx+b"] },

  { grade: 9, chapter: "一元二次方程", name: "一元二次方程的概念", keywords: ["一元二次方程", "一般形式", "二次项系数"] },
  { grade: 9, chapter: "一元二次方程", name: "直接开平方法", keywords: ["直接开平方法", "开平方", "平方根"] },
  { grade: 9, chapter: "一元二次方程", name: "配方法", keywords: ["配方法", "配方"] },
  { grade: 9, chapter: "一元二次方程", name: "公式法", keywords: ["求根公式", "公式法"] },
  { grade: 9, chapter: "一元二次方程", name: "因式分解法", keywords: ["因式分解法", "两式乘积为0"] },
  { grade: 9, chapter: "一元二次方程", name: "根的判别式", keywords: ["判别式", "实数根", "两个不相等的实数根", "Δ", "delta"] },
  { grade: 9, chapter: "一元二次方程", name: "根与系数的关系", keywords: ["根与系数", "韦达", "两根之和", "两根之积", "x₁+x₂", "x1+x2"] },
  { grade: 9, chapter: "一元二次方程", name: "一元二次方程的应用", keywords: ["增长率", "面积", "利润", "列一元二次方程"] },
  { grade: 9, chapter: "二次函数", name: "二次函数图象与性质", keywords: ["二次函数", "抛物线", "顶点", "对称轴", "y=ax²"] },
  { grade: 9, chapter: "相似", name: "相似三角形", keywords: ["相似三角形", "相似比", "对应边成比例"] },
  { grade: 9, chapter: "圆", name: "圆的基本性质", keywords: ["圆周角", "圆心角", "切线", "弦"] },
  { grade: 9, chapter: "概率初步", name: "概率计算", keywords: ["概率", "随机事件", "树状图", "列表法"] }
];

const DEFAULT_STATE = () => ({
  version: 1,
  questions: [],
  knowledge: structuredClone(DEFAULT_KNOWLEDGE),
  imports: [],
  settings: { autoPublishHighConfidence: false }
});

let state = loadState();
let pendingFiles = [];
let activeKnowledgeGrade = 7;
let reviewPage = 1;
let questionPage = 1;
const selectedReview = new Set();
const selectedQuestions = new Set();

const STATUS_LABELS = {
  published: "已发布",
  review: "待审核",
  draft: "草稿",
  offline: "已下架"
};
const DIFFICULTY_LABELS = { 1: "入门", 2: "基础", 3: "中等", 4: "较难", 5: "挑战" };

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE();
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE(),
      ...parsed,
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      knowledge: Array.isArray(parsed.knowledge) && parsed.knowledge.length ? parsed.knowledge : structuredClone(DEFAULT_KNOWLEDGE),
      imports: Array.isArray(parsed.imports) ? parsed.imports : []
    };
  } catch (error) {
    console.error("题库状态读取失败", error);
    return DEFAULT_STATE();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateAllViews();
}

function uid(prefix = "Q") {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().slice(0, 6);
  return `${prefix}-${date}-${random}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function toast(message, type = "success") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  $("#toastRegion").append(el);
  window.setTimeout(() => el.remove(), 3600);
}

function switchView(viewName) {
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${viewName}`));
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === viewName));
  const active = $(`#view-${viewName}`);
  if (active) {
    $("#pageTitle").textContent = active.dataset.title || "题库管理";
    $("#pageSubtitle").textContent = active.dataset.subtitle || "";
  }
  $("#sidebar").classList.remove("open");
  if (viewName === "review") renderReviewTable();
  if (viewName === "questions") renderQuestionTable();
  if (viewName === "knowledge") renderKnowledgeTree();
  if (viewName === "settings") renderStorageInfo();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function normalizeGrade(value, text = "") {
  const combined = `${value ?? ""} ${text}`;
  if (/九年级|初三|\b9\b/.test(combined)) return 9;
  if (/八年级|初二|\b8\b/.test(combined)) return 8;
  if (/七年级|初一|\b7\b/.test(combined)) return 7;
  return Number($("#defaultGrade")?.value) || 9;
}

function normalizeDifficulty(value, text = "") {
  if (typeof value === "number") return Math.min(5, Math.max(1, Math.round(value)));
  const combined = `${value ?? ""} ${text}`;
  if (/挑战|压轴|竞赛|拔高|五星|5级/.test(combined)) return 5;
  if (/较难|困难|综合|四星|4级/.test(combined)) return 4;
  if (/中等|三星|3级/.test(combined)) return 3;
  if (/基础|二星|2级/.test(combined)) return 2;
  if (/入门|简单|一星|1级/.test(combined)) return 1;
  return inferDifficultyByText(text);
}

function inferDifficultyByText(text = "") {
  let score = 1;
  const value = String(text);
  if (value.length > 90) score += 1;
  if (/(参数|取值范围|证明|分类讨论|综合|存在|恰好|至少|至多)/.test(value)) score += 1;
  if (/(函数|几何|勾股|判别式).*(根与系数|方程)|根与系数.*(函数|几何|勾股|判别式)/.test(value)) score += 1;
  if (value.length > 220 || /(压轴|最值|动点|新定义)/.test(value)) score += 1;
  return Math.min(5, score);
}

function normalizeQuestionType(value, item = {}) {
  const combined = `${value ?? ""} ${item.answer_type ?? ""} ${item.stem ?? item.question_display ?? ""}`;
  if (/证明/.test(combined)) return "证明题";
  const options = [item.option_a, item.option_b, item.option_c, item.option_d].filter(Boolean);
  if (/选择/.test(combined) || options.length >= 2 || Array.isArray(item.options) && item.options.length >= 2) return "选择题";
  if (/填空|数值|区间|表达式|选项/.test(combined)) return "填空题";
  return "解答题";
}

function textFromItem(item) {
  return [
    item.question_display, item.stem, item.content, item.title, item.question,
    item.question_latex, item.knowledge, item.knowledge_points, item.tags,
    item.category, item.chapter, item.analysis
  ].filter(Boolean).join(" ");
}

function analyzeClassification(item, explicitGrade) {
  const text = textFromItem(item);
  const grade = explicitGrade || normalizeGrade(item.grade, text);
  const candidates = state.knowledge
    .filter((node) => node.grade === grade)
    .map((node) => {
      let hits = 0;
      const hitKeywords = [];
      for (const keyword of node.keywords || []) {
        if (keyword && text.toLowerCase().includes(String(keyword).toLowerCase())) {
          hits += keyword.length >= 4 ? 2 : 1;
          hitKeywords.push(keyword);
        }
      }
      if (item.chapter && String(item.chapter).includes(node.chapter)) hits += 4;
      if (item.knowledge && String(item.knowledge).includes(node.name)) hits += 5;
      if (item.category && String(item.category).includes(node.name)) hits += 4;
      return { node, hits, hitKeywords };
    })
    .sort((a, b) => b.hits - a.hits);

  const best = candidates[0];
  const explicitChapter = item.chapter && String(item.chapter).trim();
  const explicitKnowledge = splitList(item.knowledge_points || item.knowledge || item.tags || "");

  const chapter = explicitChapter || (best?.hits > 0 ? best.node.chapter : "待确认章节");
  const knowledgePoints = explicitKnowledge.length
    ? explicitKnowledge.slice(0, 8)
    : best?.hits > 0 ? [best.node.name] : ["待确认知识点"];

  let confidence = 0.48;
  if (explicitChapter) confidence += 0.27;
  if (explicitKnowledge.length) confidence += 0.20;
  if (best?.hits >= 5) confidence += 0.27;
  else if (best?.hits >= 2) confidence += 0.16;
  else if (best?.hits >= 1) confidence += 0.08;

  return {
    chapter,
    knowledgePoints,
    confidence: Math.min(0.99, confidence),
    matchedKeywords: best?.hitKeywords || []
  };
}

function splitList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "")
    .split(/[，,；;、|]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);
}

function mapOptions(item) {
  if (Array.isArray(item.options)) {
    const result = {};
    item.options.forEach((option, index) => {
      const key = ["A", "B", "C", "D"][index];
      if (key) result[key] = String(option).replace(new RegExp(`^${key}[.、：:]?\\s*`, "i"), "");
    });
    return result;
  }
  if (item.options && typeof item.options === "object") return item.options;
  return {
    A: item.option_a || item["选项A"] || "",
    B: item.option_b || item["选项B"] || "",
    C: item.option_c || item["选项C"] || "",
    D: item.option_d || item["选项D"] || ""
  };
}

function normalizeItem(item, batch) {
  const text = textFromItem(item);
  const grade = normalizeGrade(item.grade || item["年级"], text);
  const classification = analyzeClassification(item, grade);
  const questionType = normalizeQuestionType(item.question_type || item.type || item["题型"], item);
  const difficulty = normalizeDifficulty(item.difficulty || item["难度"], text);
  const options = mapOptions(item);
  const now = new Date().toISOString();
  const stem = item.question_display || item.stem || item.question || item.content || item["题干"] || item.title || "待补充题干";
  const confidence = {
    overall: Number((classification.confidence * 0.58 + (stem !== "待补充题干" ? 0.22 : 0) + ((item.answer_display || item.answer || item["答案"]) ? 0.20 : 0)).toFixed(2)),
    grade: item.grade ? 0.98 : 0.72,
    chapter: Number(classification.confidence.toFixed(2)),
    knowledge: Number(classification.confidence.toFixed(2)),
    type: questionType === "解答题" && !item.question_type ? 0.72 : 0.92,
    difficulty: item.difficulty ? 0.90 : 0.65
  };
  const existingId = item.item_id || item.id || item.question_id || item["题目ID"];
  const status = item.status || (state.settings.autoPublishHighConfidence && confidence.overall >= 0.95 ? "published" : "review");

  return {
    id: existingId ? String(existingId) : uid("MATH"),
    groupId: String(item.group_id || item.groupId || ""),
    subject: item.subject || item["学科"] || "数学",
    grade,
    semester: item.semester || item["学期"] || $("#defaultSemester")?.value || "",
    textbookVersion: item.textbookVersion || item.textbook_version || item["教材版本"] || $("#textbookVersion")?.value || "通用版",
    chapter: classification.chapter,
    category: item.category || item["题型分类"] || classification.knowledgePoints[0],
    knowledgePoints: classification.knowledgePoints,
    questionType,
    difficulty,
    stem: String(stem),
    stemLatex: String(item.question_latex || item.stemLatex || item.latex || item["题干（LaTeX）"] || ""),
    options,
    answer: String(item.answer_display || item.answer || item.correct_answer || item["答案"] || "待补充答案"),
    answerLatex: String(item.answer_latex || item.answerLatex || item["答案（LaTeX）"] || ""),
    normalizedAnswer: String(item.answer_normalized || item.normalizedAnswer || item["标准化答案"] || ""),
    answerType: String(item.answer_type || item.answerType || ""),
    analysis: String(item.analysis || item.explanation || item["解析"] || ""),
    method: String(item.method || item["核心方法"] || ""),
    source: String(item.source_info || item.source || item["来源"] || batch.name || ""),
    sourcePages: String(item.pages || item["页码"] || ""),
    tags: splitList(item.tags || ""),
    status: STATUS_LABELS[status] ? status : "review",
    confidence,
    duplicateOf: "",
    importBatchId: batch.id,
    importBatchName: batch.name,
    createdAt: item.createdAt || now,
    updatedAt: now
  };
}

function detectDuplicates(items, existing) {
  const fingerprint = (text) => String(text || "").toLowerCase().replace(/\s+/g, "").replace(/[，。、“”‘’；：,.!?！？;:()（）\[\]]/g, "").slice(0, 220);
  const map = new Map();
  [...existing, ...items].forEach((item) => {
    const key = fingerprint(item.stem);
    if (!key) return;
    if (!map.has(key)) map.set(key, item.id);
    else if (item.id !== map.get(key)) item.duplicateOf = map.get(key);
  });
}

function extractItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.questions)) return payload.questions;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.groups && Array.isArray(payload.groups)) {
    return payload.groups.flatMap((group) => {
      if (!Array.isArray(group.subquestions)) return [group];
      return group.subquestions.map((sub, index) => ({
        ...group,
        ...sub,
        item_id: `${group.id || uid("GROUP")}-${String(index + 1).padStart(2, "0")}`,
        question_display: `${group.stem_display || group.stem || ""}\n${sub.display || sub.stem || ""}`,
        answer_display: sub.answer_display || sub.answer,
        analysis: sub.analysis || group.analysis
      }));
    });
  }
  return [payload];
}

async function parseFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (ext === "json") return extractItems(JSON.parse(await file.text()));
  if (["xlsx", "xls", "csv"].includes(ext)) {
    if (!window.XLSX) throw new Error("Excel解析组件未加载，请刷新页面后重试。");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
  }
  throw new Error(`暂不支持 ${ext} 文件`);
}

function parsePastedText(value) {
  const text = value.trim();
  if (!text) return [];
  try { return extractItems(JSON.parse(text)); } catch { /* pure text below */ }
  return text.split(/\n\s*\n+/).map((block) => ({ question_display: block.trim() })).filter((item) => item.question_display);
}

async function importQuestions(rawItems, sourceName) {
  if (!rawItems.length) throw new Error("没有读取到可导入的题目。请检查文件内容。");
  const batch = {
    id: uid("BATCH"),
    name: $("#bankName").value.trim() || sourceName || `题库导入 ${new Date().toLocaleDateString("zh-CN")}`,
    sourceName: sourceName || "直接粘贴",
    total: rawItems.length,
    success: 0,
    added: 0,
    updated: 0,
    status: "processing",
    createdAt: new Date().toISOString()
  };
  const normalized = rawItems.map((item) => normalizeItem(item, batch));
  detectDuplicates(normalized, state.questions);

  for (const incoming of normalized) {
    const existingIndex = state.questions.findIndex((item) => item.id === incoming.id);
    if (existingIndex >= 0) {
      const existing = state.questions[existingIndex];
      state.questions[existingIndex] = {
        ...existing,
        ...incoming,
        createdAt: existing.createdAt || incoming.createdAt,
        status: "review",
        updatedAt: new Date().toISOString()
      };
      batch.updated += 1;
    } else {
      state.questions.push(incoming);
      batch.added += 1;
    }
  }

  batch.success = batch.added + batch.updated;
  batch.status = "completed";
  state.imports.unshift(batch);
  state.imports = state.imports.slice(0, 50);
  saveState();
  return batch.success;
}

function renderDashboard() {
  const total = state.questions.length;
  const counts = Object.fromEntries(Object.keys(STATUS_LABELS).map((key) => [key, state.questions.filter((q) => q.status === key).length]));
  const knowledgeCount = new Set(state.questions.flatMap((q) => q.knowledgePoints || [])).size;
  $("#statTotal").textContent = total;
  $("#statPublished").textContent = counts.published;
  $("#statReview").textContent = counts.review;
  $("#statKnowledge").textContent = knowledgeCount;
  $("#reviewBadge").textContent = counts.review;

  const statusConfig = [
    ["published", "green"], ["review", "amber"], ["draft", "gray"], ["offline", "gray"]
  ];
  $("#statusBars").innerHTML = statusConfig.map(([key, color]) => {
    const percent = total ? Math.round(counts[key] / total * 100) : 0;
    return `<div><div class="bar-item-header"><span>${STATUS_LABELS[key]}</span><span>${counts[key]} 道 · ${percent}%</span></div><div class="progress ${color}"><span style="width:${percent}%"></span></div></div>`;
  }).join("");

  const chapterCounts = Object.entries(state.questions.reduce((acc, item) => {
    const key = item.chapter || "未分类章节";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 7);
  $("#chapterStats").classList.toggle("empty-state", !chapterCounts.length);
  $("#chapterStats").innerHTML = chapterCounts.length ? chapterCounts.map(([chapter, count]) => `<div class="list-row"><div><strong>${escapeHtml(chapter)}</strong><small>${state.questions.filter((q) => q.chapter === chapter && q.status === "published").length} 道已发布</small></div><span class="count-pill">${count}</span></div>`).join("") : "暂无数据";

  $("#recentImports").classList.toggle("empty-state", !state.imports.length);
  $("#recentImports").innerHTML = state.imports.length ? state.imports.slice(0, 6).map((item) => `<div class="recent-item"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.sourceName || "")} · ${formatDate(item.createdAt)}</small></div><span class="count-pill">${item.success || item.total || 0}</span></div>`).join("") : "暂无导入记录";
}

function confidenceBand(value) {
  if (value < 0.7) return "low";
  if (value < 0.9) return "medium";
  return "high";
}

function filterReviewQuestions() {
  const search = $("#reviewSearch").value.trim().toLowerCase();
  const band = $("#reviewConfidence").value;
  const grade = Number($("#reviewGrade").value) || null;
  return state.questions.filter((item) => {
    if (item.status !== "review") return false;
    const haystack = `${item.stem} ${item.chapter} ${(item.knowledgePoints || []).join(" ")} ${item.source}`.toLowerCase();
    if (search && !haystack.includes(search)) return false;
    if (grade && item.grade !== grade) return false;
    if (band && confidenceBand(item.confidence?.overall || 0) !== band) return false;
    return true;
  });
}

function renderReviewTable() {
  const filtered = filterReviewQuestions();
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  reviewPage = Math.min(reviewPage, pages);
  const pageItems = filtered.slice((reviewPage - 1) * PAGE_SIZE, reviewPage * PAGE_SIZE);
  $("#reviewTableBody").innerHTML = pageItems.map((item) => reviewRow(item)).join("");
  $("#reviewEmpty").classList.toggle("hidden", filtered.length > 0);
  renderPagination($("#reviewPagination"), reviewPage, pages, (page) => { reviewPage = page; renderReviewTable(); });
  updateReviewSelection();
  renderMath($("#reviewTableBody"));
}

function reviewRow(item) {
  const confidence = item.confidence?.overall || 0;
  return `<tr>
    <td class="checkbox-cell"><input class="row-check review-check" type="checkbox" data-id="${escapeHtml(item.id)}" ${selectedReview.has(item.id) ? "checked" : ""}></td>
    <td class="question-cell"><strong>${escapeHtml(item.id)}</strong><div class="question-preview">${escapeHtml(item.stem)}</div>${item.duplicateOf ? `<div class="meta-line" style="color:var(--red)">疑似重复：${escapeHtml(item.duplicateOf)}</div>` : `<div class="meta-line">${escapeHtml(item.source || "未填写来源")}</div>`}</td>
    <td>${item.grade}年级<br><span class="meta-line">${escapeHtml(item.semester || "未指定学期")}</span></td>
    <td><strong>${escapeHtml(item.chapter)}</strong><div class="tag-list">${(item.knowledgePoints || []).slice(0, 3).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div></td>
    <td>${escapeHtml(item.questionType)}</td>
    <td><span class="difficulty"><span class="difficulty-dot"></span>${item.difficulty} ${DIFFICULTY_LABELS[item.difficulty]}</span></td>
    <td><div class="confidence ${confidenceBand(confidence)}"><strong>${Math.round(confidence * 100)}%</strong><div class="progress"><span style="width:${confidence * 100}%"></span></div></div></td>
    <td><div class="row-actions"><button class="link-button" data-edit-question="${escapeHtml(item.id)}">审核</button><button class="link-button" data-publish-question="${escapeHtml(item.id)}">发布</button></div></td>
  </tr>`;
}

function filterAllQuestions() {
  const search = $("#questionSearch").value.trim().toLowerCase();
  const grade = Number($("#questionGrade").value) || null;
  const type = $("#questionType").value;
  const difficulty = Number($("#questionDifficulty").value) || null;
  const status = $("#questionStatus").value;
  return state.questions.filter((item) => {
    const haystack = `${item.id} ${item.stem} ${item.chapter} ${item.category} ${(item.knowledgePoints || []).join(" ")} ${item.source}`.toLowerCase();
    if (search && !haystack.includes(search)) return false;
    if (grade && item.grade !== grade) return false;
    if (type && item.questionType !== type) return false;
    if (difficulty && item.difficulty !== difficulty) return false;
    if (status && item.status !== status) return false;
    return true;
  }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function renderQuestionTable() {
  const filtered = filterAllQuestions();
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  questionPage = Math.min(questionPage, pages);
  const pageItems = filtered.slice((questionPage - 1) * PAGE_SIZE, questionPage * PAGE_SIZE);
  $("#questionResultCount").textContent = `共 ${filtered.length} 道题`;
  $("#questionTableBody").innerHTML = pageItems.map((item) => questionRow(item)).join("");
  $("#questionEmpty").classList.toggle("hidden", filtered.length > 0);
  renderPagination($("#questionPagination"), questionPage, pages, (page) => { questionPage = page; renderQuestionTable(); });
  updateQuestionSelection();
  renderMath($("#questionTableBody"));
}

function questionRow(item) {
  return `<tr>
    <td class="checkbox-cell"><input class="row-check question-check" type="checkbox" data-id="${escapeHtml(item.id)}" ${selectedQuestions.has(item.id) ? "checked" : ""}></td>
    <td class="question-cell"><strong>${escapeHtml(item.id)}</strong><div class="question-preview">${escapeHtml(item.stem)}</div><div class="meta-line">${escapeHtml(item.source || "未填写来源")}</div></td>
    <td><strong>${item.grade}年级 · ${escapeHtml(item.chapter)}</strong><div class="tag-list">${(item.knowledgePoints || []).slice(0, 3).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div></td>
    <td>${escapeHtml(item.questionType)}</td>
    <td>${item.difficulty} ${DIFFICULTY_LABELS[item.difficulty]}</td>
    <td><span class="status ${item.status}">${STATUS_LABELS[item.status]}</span></td>
    <td>${formatDate(item.updatedAt)}</td>
    <td><div class="row-actions"><button class="link-button" data-edit-question="${escapeHtml(item.id)}">编辑</button><button class="link-button" data-toggle-question="${escapeHtml(item.id)}">${item.status === "published" ? "下架" : "发布"}</button><button class="link-button danger-link" data-delete-question="${escapeHtml(item.id)}">删除</button></div></td>
  </tr>`;
}

function renderPagination(container, current, pages, onPage) {
  if (pages <= 1) { container.innerHTML = ""; return; }
  const buttons = [];
  buttons.push(`<button ${current === 1 ? "disabled" : ""} data-page="${current - 1}">‹</button>`);
  const start = Math.max(1, current - 2);
  const end = Math.min(pages, current + 2);
  for (let page = start; page <= end; page += 1) buttons.push(`<button class="${page === current ? "active" : ""}" data-page="${page}">${page}</button>`);
  buttons.push(`<button ${current === pages ? "disabled" : ""} data-page="${current + 1}">›</button>`);
  container.innerHTML = buttons.join("");
  container.onclick = (event) => {
    const button = event.target.closest("button[data-page]");
    if (!button || button.disabled) return;
    onPage(Number(button.dataset.page));
  };
}

function updateReviewSelection() {
  $("#reviewSelectionCount").textContent = `已选择 ${selectedReview.size} 道`;
  const checks = $$(".review-check");
  $("#reviewSelectAll").checked = checks.length > 0 && checks.every((check) => check.checked);
}

function updateQuestionSelection() {
  $("#questionSelectionCount").textContent = `已选择 ${selectedQuestions.size} 道`;
  const checks = $$(".question-check");
  $("#questionSelectAll").checked = checks.length > 0 && checks.every((check) => check.checked);
}

function renderKnowledgeTree() {
  $$("[data-grade-tab]").forEach((tab) => tab.classList.toggle("active", Number(tab.dataset.gradeTab) === activeKnowledgeGrade));
  const nodes = state.knowledge.filter((node) => node.grade === activeKnowledgeGrade);
  const chapters = nodes.reduce((acc, node) => {
    (acc[node.chapter] ||= []).push(node);
    return acc;
  }, {});
  $("#knowledgeTree").innerHTML = Object.keys(chapters).length ? Object.entries(chapters).map(([chapter, items]) => {
    const questionCount = state.questions.filter((q) => q.grade === activeKnowledgeGrade && q.chapter === chapter).length;
    return `<div class="chapter-block"><div class="chapter-title"><span>${escapeHtml(chapter)}</span><span>${items.length} 个知识点 · ${questionCount} 道题</span></div><div class="knowledge-items">${items.map((item) => {
      const count = state.questions.filter((q) => (q.knowledgePoints || []).includes(item.name)).length;
      return `<div class="knowledge-item"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml((item.keywords || []).join("、") || "未设置关键词")}</small></div><span class="count-pill">${count}</span></div>`;
    }).join("")}</div></div>`;
  }).join("") : `<div class="table-empty">该年级还没有知识点目录。</div>`;

  $("#ruleSummary").innerHTML = `
    <div class="rule-row"><span>目录知识点</span><strong>${state.knowledge.length}</strong></div>
    <div class="rule-row"><span>关键词总数</span><strong>${state.knowledge.reduce((sum, item) => sum + (item.keywords || []).length, 0)}</strong></div>
    <div class="rule-row"><span>待确认章节</span><strong>${state.questions.filter((q) => q.chapter === "待确认章节").length}</strong></div>
    <div class="rule-row"><span>待确认知识点</span><strong>${state.questions.filter((q) => (q.knowledgePoints || []).includes("待确认知识点")).length}</strong></div>`;
}

function renderStorageInfo() {
  const raw = JSON.stringify(state);
  $("#storageQuestionCount").textContent = state.questions.length;
  $("#storageUsage").textContent = `${(new Blob([raw]).size / 1024).toFixed(1)} KB`;
}

function updateAllViews() {
  renderDashboard();
  if ($("#view-review").classList.contains("active")) renderReviewTable();
  if ($("#view-questions").classList.contains("active")) renderQuestionTable();
  if ($("#view-knowledge").classList.contains("active")) renderKnowledgeTree();
  if ($("#view-settings").classList.contains("active")) renderStorageInfo();
}

function renderMath(root = document.body) {
  if (!window.renderMathInElement || !root) return;
  try {
    renderMathInElement(root, {
      delimiters: [
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
        { left: "$$", right: "$$", display: true }
      ],
      throwOnError: false
    });
  } catch (error) { console.warn("公式渲染失败", error); }
}

function openQuestionEditor(id) {
  const item = state.questions.find((question) => question.id === id);
  if (!item) return;
  $("#editId").value = item.id;
  $("#modalQuestionId").textContent = item.id;
  $("#editGrade").value = item.grade;
  $("#editSemester").value = item.semester || "";
  $("#editType").value = item.questionType;
  $("#editDifficulty").value = item.difficulty;
  $("#editChapter").value = item.chapter || "";
  $("#editCategory").value = item.category || "";
  $("#editKnowledge").value = (item.knowledgePoints || []).join(", ");
  $("#editStem").value = item.stem || "";
  $("#editLatex").value = item.stemLatex || "";
  $("#editOptionA").value = item.options?.A || "";
  $("#editOptionB").value = item.options?.B || "";
  $("#editOptionC").value = item.options?.C || "";
  $("#editOptionD").value = item.options?.D || "";
  $("#editAnswer").value = item.answer || "";
  $("#editNormalizedAnswer").value = item.normalizedAnswer || "";
  $("#editAnalysis").value = item.analysis || "";
  $("#editMethod").value = item.method || "";
  $("#editSource").value = item.source || "";
  $("#editStatus").value = item.status || "review";
  $("#questionDialog").showModal();
}

function saveQuestionFromForm() {
  const id = $("#editId").value;
  const item = state.questions.find((question) => question.id === id);
  if (!item) return;
  Object.assign(item, {
    grade: Number($("#editGrade").value),
    semester: $("#editSemester").value,
    questionType: $("#editType").value,
    difficulty: Number($("#editDifficulty").value),
    chapter: $("#editChapter").value.trim(),
    category: $("#editCategory").value.trim(),
    knowledgePoints: splitList($("#editKnowledge").value),
    stem: $("#editStem").value.trim(),
    stemLatex: $("#editLatex").value.trim(),
    options: { A: $("#editOptionA").value.trim(), B: $("#editOptionB").value.trim(), C: $("#editOptionC").value.trim(), D: $("#editOptionD").value.trim() },
    answer: $("#editAnswer").value.trim(),
    normalizedAnswer: $("#editNormalizedAnswer").value.trim(),
    analysis: $("#editAnalysis").value.trim(),
    method: $("#editMethod").value.trim(),
    source: $("#editSource").value.trim(),
    status: $("#editStatus").value,
    updatedAt: new Date().toISOString()
  });
  item.confidence = { ...item.confidence, overall: 1, chapter: 1, knowledge: 1, difficulty: 1, type: 1 };
  saveState();
  toast("题目已保存");
}

function setQuestionStatus(ids, status) {
  let count = 0;
  state.questions.forEach((item) => {
    if (ids.includes(item.id)) {
      item.status = status;
      item.updatedAt = new Date().toISOString();
      count += 1;
    }
  });
  saveState();
  return count;
}

function reanalyzeQuestions(ids) {
  state.questions.forEach((item) => {
    if (!ids.includes(item.id)) return;
    const classification = analyzeClassification(item, item.grade);
    item.chapter = classification.chapter;
    item.knowledgePoints = classification.knowledgePoints;
    item.category = classification.knowledgePoints[0];
    item.questionType = normalizeQuestionType(item.questionType, item);
    item.difficulty = normalizeDifficulty("", item.stem);
    item.confidence = { ...item.confidence, overall: classification.confidence, chapter: classification.confidence, knowledge: classification.confidence, difficulty: 0.65 };
    item.updatedAt = new Date().toISOString();
  });
  saveState();
}

function deleteQuestions(ids) {
  state.questions = state.questions.filter((item) => !ids.includes(item.id));
  ids.forEach((id) => { selectedReview.delete(id); selectedQuestions.delete(id); });
  saveState();
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportBackup() {
  downloadJson({ metadata: { app: "junior-math-question-bank-admin", exportedAt: new Date().toISOString(), version: 1 }, ...state }, `junior-math-question-bank-backup-${new Date().toISOString().slice(0,10)}.json`);
  toast("完整备份已导出");
}

function renderSelectedFiles() {
  $("#selectedFiles").innerHTML = pendingFiles.map((file) => `<div class="selected-file"><span>${escapeHtml(file.name)}</span><small>${(file.size / 1024).toFixed(1)} KB</small></div>`).join("");
}

async function runImport() {
  const pasted = $("#pasteInput").value;
  if (!pendingFiles.length && !pasted.trim()) { toast("请先选择文件或粘贴题目内容", "warning"); return; }
  state.settings.autoPublishHighConfidence = $("#autoPublishHighConfidence").checked;
  let totalImported = 0;
  try {
    for (const file of pendingFiles) {
      const items = await parseFile(file);
      totalImported += await importQuestions(items, file.name);
    }
    const pastedItems = parsePastedText(pasted);
    if (pastedItems.length) totalImported += await importQuestions(pastedItems, "直接粘贴");
    pendingFiles = [];
    $("#pasteInput").value = "";
    renderSelectedFiles();
    toast(`成功导入并分析 ${totalImported} 道题`);
    switchView("review");
  } catch (error) {
    console.error(error);
    toast(error.message || "题库导入失败", "error");
  }
}

async function loadDemoData() {
  try {
    const response = await fetch("../data/vieta-theorem.json", { cache: "no-store" });
    if (!response.ok) throw new Error("无法读取示例题库，请确认 data/vieta-theorem.json 已上传。 ");
    const payload = await response.json();
    const count = await importQuestions(extractItems(payload), payload.metadata?.title || "一元二次方程示例题库");
    toast(`示例题库已载入，共 ${count} 道题`);
    switchView("review");
  } catch (error) {
    toast(error.message, "error");
  }
}

function bindEvents() {
  $$(".nav-item").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
  $$('[data-go-view]').forEach((button) => button.addEventListener("click", () => switchView(button.dataset.goView)));
  $("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  $("#quickExport").addEventListener("click", exportBackup);

  $("#chooseFile").addEventListener("click", () => $("#fileInput").click());
  $("#dropZone").addEventListener("click", (event) => { if (!event.target.closest("button")) $("#fileInput").click(); });
  $("#fileInput").addEventListener("change", (event) => { pendingFiles = [...pendingFiles, ...Array.from(event.target.files)]; renderSelectedFiles(); event.target.value = ""; });
  ["dragenter", "dragover"].forEach((name) => $("#dropZone").addEventListener(name, (event) => { event.preventDefault(); $("#dropZone").classList.add("dragover"); }));
  ["dragleave", "drop"].forEach((name) => $("#dropZone").addEventListener(name, (event) => { event.preventDefault(); $("#dropZone").classList.remove("dragover"); }));
  $("#dropZone").addEventListener("drop", (event) => { pendingFiles = [...pendingFiles, ...Array.from(event.dataTransfer.files)]; renderSelectedFiles(); });
  $("#startImport").addEventListener("click", runImport);
  $("#loadDemo").addEventListener("click", loadDemoData);

  ["reviewSearch", "reviewConfidence", "reviewGrade"].forEach((id) => $("#" + id).addEventListener("input", () => { reviewPage = 1; renderReviewTable(); }));
  ["questionSearch", "questionGrade", "questionType", "questionDifficulty", "questionStatus"].forEach((id) => $("#" + id).addEventListener("input", () => { questionPage = 1; renderQuestionTable(); }));

  $("#reviewTableBody").addEventListener("change", (event) => {
    const check = event.target.closest(".review-check");
    if (!check) return;
    check.checked ? selectedReview.add(check.dataset.id) : selectedReview.delete(check.dataset.id);
    updateReviewSelection();
  });
  $("#questionTableBody").addEventListener("change", (event) => {
    const check = event.target.closest(".question-check");
    if (!check) return;
    check.checked ? selectedQuestions.add(check.dataset.id) : selectedQuestions.delete(check.dataset.id);
    updateQuestionSelection();
  });
  $("#reviewSelectAll").addEventListener("change", (event) => {
    $$(".review-check").forEach((check) => { check.checked = event.target.checked; event.target.checked ? selectedReview.add(check.dataset.id) : selectedReview.delete(check.dataset.id); });
    updateReviewSelection();
  });
  $("#questionSelectAll").addEventListener("change", (event) => {
    $$(".question-check").forEach((check) => { check.checked = event.target.checked; event.target.checked ? selectedQuestions.add(check.dataset.id) : selectedQuestions.delete(check.dataset.id); });
    updateQuestionSelection();
  });

  document.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-edit-question]");
    if (edit) openQuestionEditor(edit.dataset.editQuestion);
    const publish = event.target.closest("[data-publish-question]");
    if (publish) { setQuestionStatus([publish.dataset.publishQuestion], "published"); toast("题目已发布"); }
    const toggle = event.target.closest("[data-toggle-question]");
    if (toggle) {
      const item = state.questions.find((q) => q.id === toggle.dataset.toggleQuestion);
      if (item) { setQuestionStatus([item.id], item.status === "published" ? "offline" : "published"); toast(item.status === "published" ? "题目已下架" : "题目已发布"); }
    }
    const del = event.target.closest("[data-delete-question]");
    if (del && confirm("确定删除这道题吗？此操作无法撤销。")) { deleteQuestions([del.dataset.deleteQuestion]); toast("题目已删除", "warning"); }
  });

  $$('[data-bulk-action]').forEach((button) => button.addEventListener("click", () => {
    const ids = [...selectedReview];
    if (!ids.length) { toast("请先选择待审核题目", "warning"); return; }
    if (button.dataset.bulkAction === "reanalyze") { reanalyzeQuestions(ids); toast(`已重新分析 ${ids.length} 道题`); }
    if (button.dataset.bulkAction === "draft") { setQuestionStatus(ids, "draft"); toast(`${ids.length} 道题已存为草稿`); }
    if (button.dataset.bulkAction === "publish") { setQuestionStatus(ids, "published"); toast(`${ids.length} 道题已审核发布`); }
    selectedReview.clear();
    renderReviewTable();
  }));

  $$('[data-question-bulk]').forEach((button) => button.addEventListener("click", () => {
    const ids = [...selectedQuestions];
    if (!ids.length) { toast("请先选择题目", "warning"); return; }
    const action = button.dataset.questionBulk;
    if (action === "export") downloadJson(state.questions.filter((q) => ids.includes(q.id)), `selected-questions-${new Date().toISOString().slice(0,10)}.json`);
    if (action === "publish") { setQuestionStatus(ids, "published"); toast(`${ids.length} 道题已发布`); }
    if (action === "offline") { setQuestionStatus(ids, "offline"); toast(`${ids.length} 道题已下架`, "warning"); }
    if (action === "delete" && confirm(`确定删除选中的 ${ids.length} 道题吗？`)) { deleteQuestions(ids); toast(`${ids.length} 道题已删除`, "warning"); }
    selectedQuestions.clear();
    renderQuestionTable();
  }));

  $("#questionForm").addEventListener("submit", (event) => { event.preventDefault(); saveQuestionFromForm(); $("#questionDialog").close(); });

  $$("[data-grade-tab]").forEach((tab) => tab.addEventListener("click", () => { activeKnowledgeGrade = Number(tab.dataset.gradeTab); renderKnowledgeTree(); }));
  $("#addKnowledge").addEventListener("click", () => { $("#newKnowledgeGrade").value = activeKnowledgeGrade; $("#knowledgeDialog").showModal(); });
  $("#knowledgeForm").addEventListener("submit", (event) => {
    event.preventDefault();
    state.knowledge.push({
      grade: Number($("#newKnowledgeGrade").value),
      chapter: $("#newKnowledgeChapter").value.trim(),
      name: $("#newKnowledgeName").value.trim(),
      keywords: splitList($("#newKnowledgeKeywords").value)
    });
    saveState();
    $("#knowledgeDialog").close();
    $("#knowledgeForm").reset();
    toast("知识点已新增");
  });

  $("#exportAll").addEventListener("click", exportBackup);
  $("#restoreBackup").addEventListener("click", () => $("#restoreInput").click());
  $("#restoreInput").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const restored = payload.questions ? payload : payload.state;
      if (!restored || !Array.isArray(restored.questions)) throw new Error("这不是有效的后台备份文件");
      if (!confirm(`备份中有 ${restored.questions.length} 道题，恢复会覆盖当前数据，确定继续吗？`)) return;
      state = { ...DEFAULT_STATE(), ...restored };
      saveState();
      toast("备份恢复成功");
    } catch (error) { toast(error.message, "error"); }
    event.target.value = "";
  });
  $("#clearAll").addEventListener("click", () => {
    if (!confirm("确定清空当前浏览器中的全部题库数据吗？此操作无法撤销。")) return;
    state = DEFAULT_STATE();
    localStorage.removeItem(STORAGE_KEY);
    selectedReview.clear(); selectedQuestions.clear();
    saveState();
    toast("本地题库已清空", "warning");
  });
}

function init() {
  bindEvents();
  $("#autoPublishHighConfidence").checked = Boolean(state.settings.autoPublishHighConfidence);
  updateAllViews();
  renderSelectedFiles();
  renderMath(document.body);
}

init();
