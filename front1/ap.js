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

  // -------- Media Upload & Fraud Detection --------
  const mediaUploadArea = $("mediaUploadArea");
  const mediaFileInput = $("mediaFileInput");
  const mediaResultSection = $("mediaResultSection");
  const mediaPreviewContainer = $("mediaPreviewContainer");
  const mediaRiskBadge = $("mediaRiskBadge");
  const mediaSignalsEl = $("mediaSignals");
  const mediaAdviceEl = $("mediaAdvice");

  // Drag-and-drop on the label area
  if (mediaUploadArea) {
    mediaUploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      mediaUploadArea.classList.add("is-dragover");
    });
    mediaUploadArea.addEventListener("dragleave", () => {
      mediaUploadArea.classList.remove("is-dragover");
    });
    mediaUploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      mediaUploadArea.classList.remove("is-dragover");
      handleMediaFiles(e.dataTransfer?.files);
    });
  }

  mediaFileInput?.addEventListener("change", () => {
    handleMediaFiles(mediaFileInput.files);
  });

  on("copyMediaAnalysisBtn", "click", async () => {
    const risk = (mediaRiskBadge?.textContent || "").trim();
    const signals = Array.from(mediaSignalsEl?.querySelectorAll("li") || [])
      .map((li) => (li.textContent || "").trim())
      .filter(Boolean);
    const advice = (mediaAdviceEl?.textContent || "").trim();
    const text = [
      risk ? `【媒体风险等级】${risk}` : "",
      signals.length ? `【检测信号】\n${signals.map((s) => `- ${s}`).join("\n")}` : "",
      advice ? `【诈骗风险提示】\n${advice}` : "",
      "【我希望你做】请根据以上媒体检测信号，进一步识别诈骗特征，给出应对步骤与举报建议。",
    ]
      .filter(Boolean)
      .join("\n\n");
    if (!text) return alert("暂无可复制内容，请先上传文件。");
    await copyText(text);
  });

  on("clearMediaBtn", "click", () => {
    mediaResultSection?.classList.add("is-hidden");
    if (mediaPreviewContainer) mediaPreviewContainer.innerHTML = "";
    if (mediaFileInput) mediaFileInput.value = "";
    if (mediaRiskBadge) {
      mediaRiskBadge.textContent = "LOW";
      mediaRiskBadge.className = "risk risk--low";
    }
    if (mediaSignalsEl) mediaSignalsEl.innerHTML = "";
    if (mediaAdviceEl) mediaAdviceEl.textContent = "";
  });

  async function handleMediaFiles(files) {
    if (!files || files.length === 0) return;
    if (mediaPreviewContainer) mediaPreviewContainer.innerHTML = "";
    mediaResultSection?.classList.remove("is-hidden");

    const allResults = [];
    for (const file of Array.from(files)) {
      const result = await analyzeMediaFile(file);
      allResults.push(result);
      renderMediaPreview(file, result);
    }

    const totalScore = allResults.reduce((sum, r) => sum + r.score, 0);
    const avgScore = allResults.length > 0 ? totalScore / allResults.length : 0;
    const allSignals = allResults.flatMap((r) => r.signals);
    const uniqueSignals = [...new Set(allSignals)];
    const risk = calcRisk(avgScore);

    if (mediaRiskBadge) {
      mediaRiskBadge.textContent = risk.level;
      mediaRiskBadge.className = `risk ${risk.cls}`;
    }
    if (mediaSignalsEl) {
      mediaSignalsEl.innerHTML = uniqueSignals.length
        ? uniqueSignals.map((s) => `<li>${escapeHtml(s)}</li>`).join("")
        : "<li>未发现明显风险特征</li>";
    }
    if (mediaAdviceEl) {
      mediaAdviceEl.textContent = buildMediaAdvice(risk.level, allResults);
    }
  }

  function renderMediaPreview(file, _result) {
    if (!mediaPreviewContainer) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const wrapper = document.createElement("div");
    wrapper.className = "media-preview-item";

    const url = URL.createObjectURL(file);
    // createObjectURL always returns blob: URLs; guard against unexpected schemes
    if (!url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
      return;
    }
    if (isImage) {
      const img = document.createElement("img");
      img.src = url; // lgtm[js/xss-through-dom] — url is a blob: URL validated above
      img.className = "media-preview__img";
      img.alt = escapeHtml(file.name);
      img.onload = () => URL.revokeObjectURL(url);
      wrapper.appendChild(img);
    } else if (isVideo) {
      const video = document.createElement("video");
      video.src = url; // lgtm[js/xss-through-dom] — url is a blob: URL validated above
      video.className = "media-preview__video";
      video.controls = true;
      video.preload = "metadata";
      wrapper.appendChild(video);
    }

    const info = document.createElement("div");
    info.className = "media-preview__info";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = file.name;
    const sizeSpan = document.createElement("span");
    sizeSpan.textContent = formatFileSize(file.size);
    info.appendChild(nameSpan);
    info.appendChild(sizeSpan);
    wrapper.appendChild(info);
    mediaPreviewContainer.appendChild(wrapper);
  }

  async function analyzeMediaFile(file) {
    const isImage = file.type.startsWith("image/");
    const signals = [];
    let score = 0;

    // Rule 1: File type vs extension mismatch
    const extMatch = file.name.match(/\.(\w+)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : "";
    const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"];
    const videoExts = ["mp4", "mov", "avi", "mkv", "webm"];
    if (file.type.startsWith("image/") && videoExts.includes(ext)) {
      signals.push("文件扩展名与实际类型不符（可能伪装成视频的图片）");
      score += 30;
    } else if (file.type.startsWith("video/") && imageExts.includes(ext)) {
      signals.push("文件扩展名与实际类型不符（可能伪装成图片的视频）");
      score += 30;
    }

    // Rule 2: Suspicious filename keywords
    const fname = file.name.toLowerCase();
    if (/screenshot|截图|屏幕|screen_shot|screenrecord/.test(fname)) {
      signals.push("文件名含截图/录屏标识，可能为聊天截图（常见于伪造转账记录）");
      score += 20;
    }
    if (/转账|汇款|receipt|bank|付款|支付|transfer/.test(fname)) {
      signals.push("文件名含支付/转账关键词，警惕伪造的支付凭证");
      score += 25;
    }
    if (/公安|警察|法院|检察|证件|certificate|official|police/.test(fname)) {
      signals.push("文件名含执法/证件关键词，警惕伪造的官方文件");
      score += 30;
    }
    if (/身份证|护照|passport|id_card|identity|idcard/.test(fname)) {
      signals.push("文件名含证件关键词，警惕身份信息盗用或伪造证件");
      score += 25;
    }
    if (/temp|tmp|unknown|untitled|新建文件|new_file/.test(fname)) {
      signals.push("文件名为临时/无意义名称，可能为批量生成的欺诈素材");
      score += 10;
    }

    // Rule 3: Very recent last-modified time (within 5 minutes)
    const modAge = Date.now() - file.lastModified;
    if (modAge < 5 * 60 * 1000) {
      signals.push("文件修改时间极近（5 分钟内），可能为临时伪造的截图/证明");
      score += 15;
    }

    // Rule 4: Abnormal file size
    if (isImage && file.size < 5 * 1024) {
      signals.push("图片文件极小（< 5 KB），可能为低质量伪造图或异常缩略图");
      score += 10;
    }
    if (isImage && file.size > 50 * 1024 * 1024) {
      signals.push("图片文件异常大（> 50 MB），请核实文件真实性");
      score += 10;
    }

    // Rule 5: Canvas-based image analysis (dimensions & color diversity)
    if (isImage && file.type !== "image/svg+xml") {
      try {
        const imgInfo = await analyzeImageCanvas(file);
        if (imgInfo.width && imgInfo.height) {
          // Common mobile screenshot resolutions
          const mobileRes = [
            [1080, 1920], [1080, 2340], [1080, 2400], [750, 1334],
            [828, 1792], [1170, 2532], [1284, 2778], [720, 1280],
            [1440, 3200], [1440, 3120], [1080, 2160], [1080, 2280],
          ];
          const isMobileShot = mobileRes.some(
            ([w, h]) =>
              (imgInfo.width === w && imgInfo.height === h) ||
              (imgInfo.width === h && imgInfo.height === w)
          );
          if (isMobileShot) {
            signals.push(
              `检测到典型手机截图分辨率（${imgInfo.width}×${imgInfo.height}），可能为聊天/支付截图，请核实内容真实性`
            );
            score += 20;
          }
          // Portrait ratio typical of phone screenshots
          const ratio = imgInfo.height / imgInfo.width;
          if (!isMobileShot && ratio > 1.7 && imgInfo.width < 1400) {
            signals.push("图片比例符合手机截图特征，请核实其内容真实性");
            score += 10;
          }
          // Low color diversity → likely a flat/fake document or screenshot
          if (imgInfo.uniqueColorRatio < 0.008) {
            signals.push("图片色彩多样性极低，可能为截图或 P 图制作的伪造文件");
            score += 15;
          }
        }
      } catch {
        // Ignore canvas errors (e.g., cross-origin or tainted canvas)
      }
    }

    return { score, signals };
  }

  async function analyzeImageCanvas(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          const maxSample = 200;
          const scale = Math.min(
            1,
            maxSample / Math.max(img.naturalWidth, img.naturalHeight)
          );
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.naturalWidth * scale);
          canvas.height = Math.round(img.naturalHeight * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve({ width: img.naturalWidth, height: img.naturalHeight, uniqueColorRatio: 1 });
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          const colorSet = new Set();
          const step = 4; // step over 4 pixels at a time (each pixel = 4 bytes → samples every 16th byte-group)
          for (let i = 0; i < data.length; i += 4 * step) {
            // Quantize to reduce sensor noise
            const r = Math.round(data[i] / 16) * 16;
            const g = Math.round(data[i + 1] / 16) * 16;
            const b = Math.round(data[i + 2] / 16) * 16;
            colorSet.add(`${r},${g},${b}`);
          }
          const totalSamples = data.length / 4 / step;
          resolve({
            width: img.naturalWidth,
            height: img.naturalHeight,
            uniqueColorRatio: colorSet.size / totalSamples,
          });
        } catch {
          resolve({ width: img.naturalWidth, height: img.naturalHeight, uniqueColorRatio: 1 });
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({});
      };
      img.src = url;
    });
  }

  function buildMediaAdvice(level, results) {
    const hasPayment = results.some((r) =>
      r.signals.some((s) => /支付|转账|凭证/.test(s))
    );
    const hasOfficial = results.some((r) =>
      r.signals.some((s) => /执法|官方|证件/.test(s))
    );
    const isScreenshot = results.some((r) =>
      r.signals.some((s) => /截图|手机截图|录屏/.test(s))
    );

    const lines = [];
    if (level === "HIGH") {
      lines.push("⚠️ 高风险：该媒体文件具有多项诈骗典型特征，请高度警惕。");
    } else if (level === "MID") {
      lines.push("⚠️ 中风险：该媒体文件存在可疑特征，请仔细核实来源。");
    } else {
      lines.push("ℹ️ 未发现明显高危特征，但仍建议核实文件来源与真实性。");
    }
    if (hasPayment) {
      lines.push(
        "🔴 发现疑似支付凭证：诈骗分子常伪造转账截图诱导受害者误以为交易已完成。请通过官方 App 或银行短信核实到账，切勿仅凭截图确认收款。"
      );
    }
    if (hasOfficial) {
      lines.push(
        "🔴 发现疑似官方文件：公安/法院/银行不会通过网络发送「证件」要求操作。任何此类文件均应通过官方渠道独立核实。"
      );
    }
    if (isScreenshot) {
      lines.push(
        "🟡 截图内容可被篡改：P 图工具可轻易伪造聊天记录/付款截图。请要求对方提供可独立核实的原始凭证。"
      );
    }
    lines.push(
      "建议：将文件发给家人/朋友一同判断，或拨打全国反诈热线 96110 进行咨询举报。"
    );
    return lines.join("\n");
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

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
