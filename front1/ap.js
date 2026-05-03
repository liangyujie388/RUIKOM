// ap.js（合并版：把你发的两段拼成一份完整可运行的文件）
// 说明：保留顶部导航切换 + 场景模拟 + 风险研判 + 举报 + 知识库 + 右下角AI抽屉

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  function on(id, event, handler) {
    const el = $(id);
    if (!el) {
      console.warn(`[bind skipped] #${id} not found`);
      return;
    }
    el.addEventListener(event, handler);
  }

  // -------- Tabs (top menu) --------
  const panels = {
    home: $("tab-home"), // hero 区域（只是滚动用）
    scene: $("tab-scene"),
    judge: $("tab-judge"),
    report: $("tab-report"),
    kb: $("tab-kb"),
  };

  function showPanel(key) {
    // home：滚到顶部，不切换 workbench 面板
    if (key === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      document.querySelectorAll(".menu__item").forEach((b) => b.classList.remove("is-active"));
      document.querySelector('.menu__item[data-tab="home"]')?.classList.add("is-active");
      return;
    }

    // 激活菜单
    document.querySelectorAll(".menu__item").forEach((b) => b.classList.remove("is-active"));
    document.querySelector(`.menu__item[data-tab="${key}"]`)?.classList.add("is-active");

    // 切换面板
    document.querySelectorAll(".workbench .panel").forEach((p) => p.classList.remove("is-show"));
    panels[key]?.classList.add("is-show");

    // 滚到工作台
    document.querySelector(".workbench")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // 顶部菜单点击
  document.querySelectorAll(".menu__item").forEach((btn) => {
    btn.addEventListener("click", () => showPanel(btn.dataset.tab));
  });

  // 其他带 data-tab 的按钮也可以导航（例如 Banner 区“开始场景模拟/立即研判”）
  document.querySelectorAll('[data-tab]:not(.menu__item)').forEach((btn) => {
    btn.addEventListener("click", () => showPanel(btn.dataset.tab));
  });

  // -------- Scenario stories --------
  const storyTitle = $("storyTitle");
  const storyBody = $("storyBody");

  const stories = {
    刷单返利: `【剧情】你在群里看到“轻松兼职日赚300”，对方先让你做小任务返你20元，随后要求你垫付更大金额才能“解冻返利”。
对方话术：‘这是系统流程，不做就会影响信誉分。’
目标：识别“先小利诱导大额投入/解冻费/保证金”等风险点。`,
    游戏交易: `【剧情】你在二手平台看到低价皮肤，对方让你加QQ并发来“担保交易链接”，要求你在外站付款。
对方话术：‘平台手续费太高，走链接更安全。’
目标：识别“跳转外部链接/诱导私下交易/仿冒担保平台”等风险点。`,
    冒充公检法: `【剧情】电话自称“公安/检察院”，称你涉嫌洗钱，要求你下载会议软件并屏幕共享，随后让你把钱转入“安全账户”。
对方话术：‘这是保密案件，不能告诉家人。’
目标：识别“安全账户/恐吓威胁/要求保密/屏幕共享”等风险点。`,
  };

  document.querySelectorAll(".scenario").forEach((card) => {
    card.addEventListener("click", () => {
      const s = card.dataset.scenario;
      if (storyTitle) storyTitle.textContent = `当前场景：${s}`;
      if (storyBody) storyBody.textContent = stories[s] || "暂无剧情";
    });
  });

  on("copyStoryBtn", "click", async () => {
    await copyText(storyBody?.textContent || "");
    openAi(); // 复制后顺便打开右下角AI
  });

  // -------- Judge (simple rules demo) --------
  const urlInput = $("urlInput");
  const textInput = $("textInput");
  const riskBadge = $("riskBadge");
  const signalsEl = $("signals");
  const adviceEl = $("advice");

  const rules = [
    { score: 35, hit: (u, t) => /安全账户|转入.*账户|涉案|洗钱|保密案件|公检法/.test(t), msg: "疑似“冒充公检法/安全账户”话术" },
    { score: 25, hit: (u, t) => /刷单|返利|垫付|解冻|保证金|任务单/.test(t), msg: "疑似“刷单返利/垫付解冻”话术" },
    { score: 20, hit: (u, t) => /验证码|不要告诉别人|10分钟|立即|否则影响征信|冻结/.test(t), msg: "存在“紧迫威胁/验证码”诱导特征" },
    { score: 20, hit: (u, t) => /屏幕共享|远程协助|会议软件/.test(t), msg: "存在“屏幕共享/远程控制”风险" },
    { score: 15, hit: (u, t) => /(http|https):\/\/\S+/.test(t) || /(http|https):\/\/\S+/.test(u), msg: "包含外部链接，需核验来源与域名" },
    { score: 15, hit: (u) => /t\.cn|bit\.ly|tinyurl|dwz|short/.test(u), msg: "疑似短链，可能隐藏真实跳转" },
    { score: 10, hit: (u) => /verify|login|secure|bank|pay/i.test(u), msg: "URL 含敏感诱导词（verify/login/bank/pay）" },
  ];

  function calcRisk(total) {
    if (total >= 55) return { level: "HIGH", cls: "risk--high" };
    if (total >= 30) return { level: "MID", cls: "risk--mid" };
    return { level: "LOW", cls: "risk--low" };
  }

  function buildAdvice(level) {
    const base =
      "建议：不要点击链接/不要转账/不要透露验证码；通过官方 App 或官方客服电话自行核验；保存证据（截图、链接、账号）并及时举报。";
    if (level === "HIGH")
      return `风险较高。${base}\n如已输入验证码/转账/安装软件：立即联系银行/平台止付，修改密码，关闭免密，必要时报警。`;
    if (level === "MID")
      return `存在明显可疑点。${base}\n建议把完整对话与链接发给 AI 进一步分析诈骗特征与应对步骤。`;
    return `当前未发现强特征，但仍建议谨慎核验来源。${base}`;
  }

  on("runJudgeBtn", "click", () => {
    const u = (urlInput?.value || "").trim();
    const t = (textInput?.value || "").trim();

    let total = 0;
    const hits = [];
    rules.forEach((r) => {
      if (r.hit(u, t)) {
        total += r.score;
        hits.push(r.msg);
      }
    });

    const r = calcRisk(total);

    if (riskBadge) {
      riskBadge.textContent = r.level;
      riskBadge.className = `risk ${r.cls}`;
    }
    if (signalsEl) {
      signalsEl.innerHTML = hits.length
        ? hits.map((x) => `<li>${escapeHtml(x)}</li>`).join("")
        : "<li>未命中明显规则（建议仍进行官方渠道核验）</li>";
    }
    if (adviceEl) adviceEl.textContent = buildAdvice(r.level);
  });

  on("fillDemoBtn", "click", () => {
    if (urlInput) urlInput.value = "http://xxbank-verify.com";
    if (textInput)
      textInput.value =
        "【XX银行】10分钟内核验否则影响征信。请点击链接进行身份验证，并输入短信验证码。";
  });

  on("copyAdviceBtn", "click", async () => {
    const risk = (riskBadge?.textContent || "").trim();
    const signals = Array.from(signalsEl?.querySelectorAll("li") || [])
      .map((li) => (li.textContent || "").trim())
      .filter(Boolean);
    const advice = (adviceEl?.textContent || "").trim();

    const text = [
      risk ? `【风险等级】${risk}` : "",
      signals.length ? `【命中信号】\n${signals.map((s) => `- ${s}`).join("\n")}` : "",
      advice ? `【劝阻建议】\n${advice}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    if (!text) return alert("暂无可复制内容，请先开始研判。 ");
    await copyText(text);
  });

  on("openAiBtnFromJudge", "click", () => openAi());

  // -------- Report (local storage demo) --------
  const reportLog = $("reportLog");

  on("submitReportBtn", "click", () => {
    const type = $("reportType")?.value;
    const evidence = ($("reportEvidence")?.value || "").trim();
    if (!evidence) return alert("请填写证据内容（链接/账号/群号/聊天记录等）");

    const item = { type, evidence, time: new Date().toISOString() };
    const key = "anti_fraud_reports";
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    list.unshift(item);
    localStorage.setItem(key, JSON.stringify(list));
    alert("已提交（本地保存）。后续可对接后端实现真实举报。");
  });

  on("viewReportsBtn", "click", () => {
    const key = "anti_fraud_reports";
    const list = JSON.parse(localStorage.getItem(key) || "[]");

    if (!reportLog) return;
    reportLog.classList.toggle("is-hidden");
    reportLog.textContent = list.length
      ? list.map((x, i) => `#${i + 1} [${x.time}] (${x.type})\n${x.evidence}\n`).join("\n")
      : "暂无本地举报记录。";
  });

  // -------- KB (static demo) --------
  const kbData = [
    { q: "刷单返利有什么典型特征？", a: "先小额返利获取信任，再诱导大额垫付；常见借口：解冻、保证金、刷流水。" },
    { q: "什么是“安全账户”？", a: "公检法不会要求转入所谓安全账户；这是典型诈骗话术。" },
    { q: "验证码可以给对方吗？", a: "任何验证码都不要透露；验证码=账户操作授权。" },
    { q: "收到可疑链接怎么办？", a: "不点击；通过官方 App/官网手动输入地址核验；保存证据并举报。" },
  ];

  const kbList = $("kbList");
  const kbSearch = $("kbSearch");

  function renderKb(keyword = "") {
    if (!kbList) return;
    const k = keyword.trim();
    const rows = kbData.filter((x) => !k || (x.q + x.a).includes(k));
    kbList.innerHTML = rows
      .map(
        (x) => `
        <div class="kb__item">
          <div class="kb__q">${escapeHtml(x.q)}</div>
          <div class="kb__a">${escapeHtml(x.a)}</div>
        </div>`
      )
      .join("");
  }
  renderKb();
  kbSearch?.addEventListener("input", () => renderKb(kbSearch.value));

  // -------- AI Drawer --------
  const aiFab = $("aiFab");
  const aiDrawer = $("aiDrawer");
  const backdrop = $("backdrop");
  const defaultBotPlaceholder = "请输入您要判别的内容(支持文本, 图片, 视频)";

  const isPlaceholderTarget = (node) => {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
    const element = node;
    return (
      element.matches?.('input[type="text"], textarea') ||
      element.querySelector?.('input[type="text"], textarea')
    );
  };
  function applyBotPlaceholderToNode(node, placeholder) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE || !placeholder) return;
    const element = node;
    if (element.matches?.('input[type="text"], textarea')) {
      if (element.placeholder !== placeholder) element.placeholder = placeholder;
    }
    element.querySelectorAll?.('input[type="text"], textarea').forEach((el) => {
      if (el.placeholder !== placeholder) el.placeholder = placeholder;
    });
  }

  function syncBotPlaceholderText(placeholder) {
    if (!placeholder) return;
    document.querySelectorAll("[data-bot-placeholder-text]").forEach((el) => {
      el.textContent = placeholder;
    });
  }

  function openAi() {
    aiDrawer?.classList.add("is-open");
    backdrop?.classList.add("is-show");
    aiDrawer?.setAttribute("aria-hidden", "false");
    backdrop?.setAttribute("aria-hidden", "false");
  }

  function closeAi() {
    aiDrawer?.classList.remove("is-open");
    backdrop?.classList.remove("is-show");
    aiDrawer?.setAttribute("aria-hidden", "true");
    backdrop?.setAttribute("aria-hidden", "true");
  }

  aiFab?.addEventListener("click", openAi);
  on("closeAiBtn", "click", closeAi);
  backdrop?.addEventListener("click", closeAi);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAi();
  });
  if (aiDrawer) {
    const botPlaceholder = aiDrawer.dataset.botPlaceholder || defaultBotPlaceholder;
    syncBotPlaceholderText(botPlaceholder);
    applyBotPlaceholderToNode(aiDrawer, botPlaceholder);
    const pendingNodes = new Set();
    let rafId = null;
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (isPlaceholderTarget(node)) pendingNodes.add(node);
        });
      });
      if (pendingNodes.size && rafId === null) {
        // Batch placeholder updates to avoid repeated DOM work during mutation bursts.
        rafId = requestAnimationFrame(() => {
          pendingNodes.forEach((node) => applyBotPlaceholderToNode(node, botPlaceholder));
          pendingNodes.clear();
          rafId = null;
        });
      }
    });
    observer.observe(aiDrawer, { childList: true, subtree: true });
    const disconnectObserver = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      pendingNodes.clear();
      observer.disconnect();
    };
    window.addEventListener("pagehide", disconnectObserver, { once: true });
    window.addEventListener("beforeunload", disconnectObserver, { once: true });
  }

  on("copyContextBtn", "click", async () => {
    const ctx = [
      "【当前场景】" + (storyTitle?.textContent || ""),
      storyBody?.textContent || "",
      "【可疑URL】" + (urlInput?.value || ""),
      "【可疑文本】" + (textInput?.value || ""),
      "【我希望你做】请识别诈骗特征，给出风险等级与应对步骤，并生成劝阻话术与举报建议。",
    ].join("\n\n");
    await copyText(ctx);
  });

  // 额外：如果你想在别的地方调用 openAi，可用 window.__openAi()
  window.__openAi = openAi;
});

// ---------- Utils ----------
async function copyText(text) {
  const content = String(text || "");
  if (!content.trim()) return;

  // 优先使用 Clipboard API（需要 HTTPS 或 localhost）
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(content);
      alert("已复制，可直接粘贴给 AI。");
      return;
    }
  } catch {
    // fallthrough
  }

  // 降级方案：execCommand（兼容 file:// 或权限受限场景）
  try {
    const ta = document.createElement("textarea");
    ta.value = content;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);

    const ok = document.execCommand("copy");
    document.body.removeChild(ta);

    if (ok) alert("已复制，可直接粘贴给 AI。");
    else alert("复制失败：浏览器限制。请手动复制。");
  } catch {
    alert("复制失败：浏览器限制。请手动复制。");
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
