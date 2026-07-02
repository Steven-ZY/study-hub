/* Study Hub shared enhancements: nav bar, TOC, back-to-top, tab memory, theme toggle.
   Self-contained, framework-free. Injected at end of <body> on every page. */
(function () {
  "use strict";

  // --- resolve site root relative to current page depth (pages/<a>/<b>.html -> ../../) ---
  function siteRoot() {
    var p = location.pathname;
    var idx = p.indexOf("/pages/");
    if (idx === -1) return "./"; // already at root (index.html)
    var after = p.slice(idx + 7); // part after /pages/
    var depth = after.split("/").length; // folder(s) + file
    return "../".repeat(depth);
  }
  var ROOT = siteRoot();
  var isHome = location.pathname.indexOf("/pages/") === -1;

  var pageTitle = (document.querySelector("h1") && document.querySelector("h1").textContent.trim()) ||
    document.title || "Study Hub";

  // --- theme ---
  var THEME_KEY = "studyhub-theme";
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    var btn = document.getElementById("sh-theme-btn");
    if (btn) btn.textContent = t === "light" ? "🌙" : "☀️";
  }
  var savedTheme = "dark";
  try { savedTheme = localStorage.getItem(THEME_KEY) || "dark"; } catch (e) {}

  // --- inject shared CSS ---
  var css = `
  :root[data-theme="light"]{--bg:#f5f6fa;--surface:#ffffff;--surface2:#eef1f7;--border:#d5dae6;--text:#1a1d2e;--dim:#5a6577;}
  #sh-nav{position:sticky;top:0;z-index:1000;display:flex;align-items:center;gap:12px;
    padding:10px 18px;background:rgba(26,29,46,0.92);backdrop-filter:blur(8px);
    border-bottom:1px solid var(--border,#2d3348);font-size:0.9em;}
  :root[data-theme="light"] #sh-nav{background:rgba(255,255,255,0.92);}
  #sh-nav a.sh-logo{font-weight:700;color:var(--accent,#60a5fa);text-decoration:none;white-space:nowrap;}
  #sh-nav .sh-crumb{color:var(--dim,#94a3b8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;}
  #sh-nav .sh-crumb b{color:var(--text,#e2e8f0);}
  #sh-nav button{background:var(--surface2,#252940);color:var(--text,#e2e8f0);border:1px solid var(--border,#2d3348);
    border-radius:7px;padding:5px 11px;cursor:pointer;font-size:0.9em;white-space:nowrap;}
  #sh-nav button:hover{border-color:var(--accent,#60a5fa);}
  #sh-toc{position:fixed;right:14px;top:70px;z-index:900;max-width:210px;max-height:70vh;overflow:auto;
    background:var(--surface,#1a1d2e);border:1px solid var(--border,#2d3348);border-radius:10px;padding:10px 12px;
    font-size:0.8em;box-shadow:0 6px 24px rgba(0,0,0,0.3);}
  #sh-toc .sh-toc-title{color:var(--dim,#94a3b8);font-size:0.9em;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;}
  #sh-toc a{display:block;color:var(--dim,#94a3b8);text-decoration:none;padding:3px 6px;border-radius:5px;line-height:1.4;}
  #sh-toc a:hover{background:var(--surface2,#252940);color:var(--accent,#60a5fa);}
  #sh-toc a.sh-h3{padding-left:16px;font-size:0.95em;}
  #sh-toc-toggle{position:fixed;right:14px;top:70px;z-index:901;display:none;background:var(--surface,#1a1d2e);
    border:1px solid var(--border,#2d3348);color:var(--accent,#60a5fa);border-radius:8px;padding:6px 10px;cursor:pointer;font-size:0.85em;}
  #sh-top{position:fixed;right:18px;bottom:22px;z-index:900;width:42px;height:42px;border-radius:50%;
    background:var(--accent,#60a5fa);color:#0f1117;border:none;cursor:pointer;font-size:1.2em;display:none;
    box-shadow:0 4px 16px rgba(0,0,0,0.35);}
  @media(max-width:1400px){#sh-toc{display:none;}#sh-toc-toggle{display:block;} #sh-toc.sh-show{display:block;top:110px;}}
  @media(max-width:768px){#sh-toc,#sh-toc-toggle{display:none;}}
  `;
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // --- nav bar ---
  var nav = document.createElement("div");
  nav.id = "sh-nav";
  var crumb = isHome
    ? '<span class="sh-crumb"><b>Study Hub</b> · 学习总览</span>'
    : '<span class="sh-crumb"><b>' + pageTitle + "</b></span>";
  nav.innerHTML =
    '<a class="sh-logo" href="' + ROOT + 'index.html">📚 Study Hub</a>' +
    crumb +
    '<button id="sh-theme-btn" title="切换深浅色">☀️</button>';
  document.body.insertBefore(nav, document.body.firstChild);
  document.getElementById("sh-theme-btn").addEventListener("click", function () {
    var cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    applyTheme(cur === "light" ? "dark" : "light");
  });
  applyTheme(savedTheme);

  // --- tabs: memory + TOC source ---
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab[data-tab]"));
  var TAB_KEY = "studyhub-tab:" + location.pathname;

  function currentActiveTab() {
    var a = document.querySelector(".tab.active[data-tab]");
    return a ? a.getAttribute("data-tab") : (tabs[0] && tabs[0].getAttribute("data-tab"));
  }

  function buildTOC() {
    var old = document.getElementById("sh-toc");
    if (old) old.remove();
    var oldT = document.getElementById("sh-toc-toggle");
    if (oldT) oldT.remove();

    // find visible panel (active) or whole doc
    var scope = document.querySelector(".panel.active") || document;
    var heads = Array.prototype.slice.call(scope.querySelectorAll("h2, h3"));
    if (heads.length < 2) return;

    var toc = document.createElement("div");
    toc.id = "sh-toc";
    var html = '<div class="sh-toc-title">本页目录</div>';
    heads.forEach(function (h, i) {
      if (!h.id) h.id = "sh-h-" + i;
      var cls = h.tagName === "H3" ? "sh-h3" : "";
      html += '<a class="' + cls + '" href="#' + h.id + '">' + h.textContent.replace(/</g, "&lt;") + "</a>";
    });
    toc.innerHTML = html;
    document.body.appendChild(toc);

    var toggle = document.createElement("button");
    toggle.id = "sh-toc-toggle";
    toggle.textContent = "☰ 目录";
    toggle.addEventListener("click", function () { toc.classList.toggle("sh-show"); });
    document.body.appendChild(toggle);

    toc.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var el = document.getElementById(a.getAttribute("href").slice(1));
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        toc.classList.remove("sh-show");
      });
    });
  }

  if (tabs.length) {
    // restore last tab
    var saved = null;
    try { saved = localStorage.getItem(TAB_KEY); } catch (e) {}
    if (saved) {
      var t = document.querySelector('.tab[data-tab="' + saved + '"]');
      if (t) t.click();
    }
    // hook each tab to save + rebuild TOC
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        try { localStorage.setItem(TAB_KEY, tab.getAttribute("data-tab")); } catch (e) {}
        setTimeout(buildTOC, 30);
      });
    });
  }
  buildTOC();

  // --- full-site search ---
  var SEARCH_INDEX = [
    {t:"Study Hub 首页 / 学习路线", u:"index.html", k:"首页 路线 roadmap 总览 home"},
    {t:"StarVLA 架构交互式学习", u:"pages/starVLA/vla_architecture_explorer.html", k:"starvla vla 架构 backbone action head 新手入门 数据集 dataset libero robotwin simplerenv calvin robocasa 层 layer openpi 全部模型 fast oft groot pi 术语"},
    {t:"OpenPI & StarVLA 代码精读", u:"pages/starVLA/code_walkthrough.html", k:"openpi 代码 π0 pi0 gemma dit 精读 walkthrough flow matching"},
    {t:"Diffusion Policy 学习课", u:"pages/dp/diffusion_policy_learn.html", k:"diffusion policy dp ddpm 去噪 denoise film receding horizon 扩散 视觉运动"},
    {t:"DP·DiT·Flow Matching 三剑客", u:"pages/dp/dp_dit_flowmatching.html", k:"ddpm ddim flow matching dit 三剑客 采样 ode 速度场 adaln 扩散 衍生"},
    {t:"π0.7 精读", u:"pages/papers/pi0.7.html", k:"pi0.7 π0.7 physical intelligence 上下文 元数据 bagel 世界模型 跨本体 组合泛化 coaching 子目标"},
    {t:"VERA 精读", u:"pages/papers/vera.html", k:"vera 视频模型 jacobian idm 雅可比 ibvs 光流 逆动力学 mit 零样本"},
    {t:"世界模型全景", u:"pages/papers/world_models.html", k:"世界模型 world model 显式 隐式 latent 触觉 视触觉 开环 闭环 mpc cem 规划 dreamtac contactworld dynaguide"},
    {t:"VLA 训练与部署实战", u:"pages/vla-practice/vla_train_deploy.html", k:"训练 部署 损失 loss 微调 finetune lora 协同训练 co-training 知识隔离 ki tokenization fast dct rtc 实时 推理加速 ddim 采样 server client 归一化 动作表示 chunking 部署"},
    {t:"Qwen-RobotManip 精读", u:"pages/papers/qwen_robotmanip.html", k:"qwen robotmanip 对齐 alignment 规模化 scale ood human-to-robot h2r camera-frame eef canonical 80维 robotwin-if robotwin-xe 跨本体 in-context 数据清洗 qwen team"},
    {t:"DynaGuide 仓库分析", u:"pages/DynaGuide/index.html", k:"dynaguide 引导 dynamics guidance"},
    {t:"VLMGuide 对比 / OOD", u:"pages/VLMGuide/VLMGuide_对比网页.html", k:"vlmguide ood 引导 竞品 注意力"},
    {t:"VLS 分析", u:"pages/vls/vls_analysis.html", k:"vls 引导 sigmoid"}
  ];
  var searchWrap = document.createElement("span");
  searchWrap.style.cssText = "position:relative;";
  searchWrap.innerHTML =
    '<input id="sh-search" placeholder="🔍 搜索页面…" autocomplete="off" ' +
    'style="background:var(--surface2,#252940);color:var(--text,#e2e8f0);border:1px solid var(--border,#2d3348);' +
    'border-radius:7px;padding:5px 10px;font-size:0.9em;width:150px;outline:none;">' +
    '<div id="sh-results" style="display:none;position:absolute;top:34px;right:0;min-width:240px;max-height:60vh;overflow:auto;' +
    'background:var(--surface,#1a1d2e);border:1px solid var(--border,#2d3348);border-radius:9px;box-shadow:0 8px 28px rgba(0,0,0,0.4);z-index:1100;"></div>';
  // insert before theme button
  var themeBtn = document.getElementById("sh-theme-btn");
  nav.insertBefore(searchWrap, themeBtn);
  var inp = document.getElementById("sh-search");
  var res = document.getElementById("sh-results");
  function runSearch() {
    var q = inp.value.trim().toLowerCase();
    if (!q) { res.style.display = "none"; return; }
    var hits = SEARCH_INDEX.filter(function (x) {
      return (x.t + " " + x.k).toLowerCase().indexOf(q) !== -1;
    });
    if (!hits.length) { res.innerHTML = '<div style="padding:10px 12px;color:var(--dim,#94a3b8);font-size:0.85em">无匹配</div>'; res.style.display = "block"; return; }
    res.innerHTML = hits.map(function (x) {
      return '<a href="' + ROOT + x.u + '" style="display:block;padding:9px 12px;color:var(--text,#e2e8f0);text-decoration:none;border-bottom:1px solid var(--border,#2d3348);font-size:0.86em">' + x.t + "</a>";
    }).join("");
    res.style.display = "block";
  }
  inp.addEventListener("input", runSearch);
  inp.addEventListener("focus", runSearch);
  document.addEventListener("click", function (e) {
    if (!searchWrap.contains(e.target)) res.style.display = "none";
  });

  // --- back to top ---
  var top = document.createElement("button");
  top.id = "sh-top";
  top.textContent = "↑";
  top.title = "返回顶部";
  top.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  document.body.appendChild(top);
  window.addEventListener("scroll", function () {
    top.style.display = window.scrollY > 400 ? "block" : "none";
  });
})();
