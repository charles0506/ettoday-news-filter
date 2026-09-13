// ==UserScript==
// @name         ETtoday 新聞列表過濾器
// @namespace    https://github.com/charles0506
// @version      2.1.0
// @description  在 ETtoday 新聞總覽頁隱藏不想看的分類（例如遊戲）與關鍵字。過濾列嵌在頁面分類選單下方，可收合，不遮擋內容
// @author       charles0506
// @match        https://www.ettoday.net/news/news-list*
// @match        https://ettoday.net/news/news-list*
// @downloadURL  https://raw.githubusercontent.com/charles0506/ettoday-news-filter/main/ettoday-news-filter.user.js
// @updateURL    https://raw.githubusercontent.com/charles0506/ettoday-news-filter/main/ettoday-news-filter.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const KEY_CATS = 'ettoday_hidden_cats';
  const KEY_WORDS = 'ettoday_block_words';
  const KEY_FOLD = 'ettoday_bar_folded';

  const store = {
    get(k, d) {
      try {
        if (typeof GM_getValue === 'function') return GM_getValue(k, d);
      } catch (e) { /* fall through */ }
      try {
        const v = localStorage.getItem(k);
        return v === null ? d : JSON.parse(v);
      } catch (e) { return d; }
    },
    set(k, v) {
      try {
        if (typeof GM_setValue === 'function') { GM_setValue(k, v); return; }
      } catch (e) { /* fall through */ }
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ }
    }
  };

  // 舊版（v1）浮動面板殘留就清掉
  const legacy = document.getElementById('etf-panel');
  if (legacy) legacy.remove();

  let hiddenCats = new Set(store.get(KEY_CATS, []));
  let blockWords = store.get(KEY_WORDS, []);
  let folded = store.get(KEY_FOLD, false);

  const ITEM_SELECTOR = '.part_list_2 h3';
  const cats = new Set(hiddenCats);

  const catOf = it => {
    const t = it.querySelector('em.tag');
    return t ? t.textContent.trim() : '';
  };
  const titleOf = it => {
    const a = it.querySelector('a');
    return a ? a.textContent.trim() : it.textContent.trim();
  };

  function shouldHide(it) {
    const c = catOf(it);
    if (c && hiddenCats.has(c)) return true;
    if (blockWords.length) {
      const t = titleOf(it);
      for (const w of blockWords) if (w && t.includes(w)) return true;
    }
    return false;
  }

  // ---------- 樣式 ----------
  const style = document.createElement('style');
  style.textContent = `
  #etf-bar{--etf-blue:#2f6fb2;margin:10px 0 6px;border:1px solid #e6e9ee;border-radius:8px;background:#fff;
    font:13px/1.7 "Microsoft JhengHei","Noto Sans TC",sans-serif;color:#3d4552;overflow:hidden}
  #etf-bar .etf-top{display:flex;align-items:center;gap:8px;padding:7px 12px;background:#f7f9fb;
    border-bottom:1px solid #eef1f5;cursor:pointer;user-select:none}
  #etf-bar.folded .etf-top{border-bottom:none}
  #etf-bar .etf-title{font-weight:700;color:var(--etf-blue);letter-spacing:.5px}
  #etf-bar .etf-title::before{content:"⛃";margin-right:5px;font-weight:400;opacity:.65}
  #etf-bar .etf-sum{color:#8b93a0;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #etf-bar .etf-count{margin-left:auto;color:#8b93a0;font-size:12px;white-space:nowrap}
  #etf-bar .etf-caret{color:#a7aeb9;font-size:11px;transition:transform .15s}
  #etf-bar.folded .etf-caret{transform:rotate(-90deg)}
  #etf-bar .etf-main{padding:10px 12px 11px}
  #etf-bar.folded .etf-main{display:none}
  #etf-chips{display:flex;flex-wrap:wrap;gap:6px}
  #etf-bar .etf-chip{padding:2px 11px;border:1px solid transparent;border-radius:999px;background:#f0f3f7;
    color:#4a5464;cursor:pointer;user-select:none;white-space:nowrap;font-size:12.5px;transition:background .12s,color .12s}
  #etf-bar .etf-chip:hover{background:#e3ebf5;color:var(--etf-blue)}
  #etf-bar .etf-chip.off{background:#fff;border:1px dashed #d3d9e0;color:#b3bac4;text-decoration:line-through}
  #etf-bar .etf-chip.off:hover{border-color:var(--etf-blue);color:#8fa6bf}
  #etf-bar .etf-kw{display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:9px;border-top:1px dashed #eef1f5}
  #etf-bar .etf-kw label{color:#8b93a0;font-size:12px;white-space:nowrap}
  #etf-bar input[type=text]{flex:1;min-width:140px;padding:3px 9px;border:1px solid #e0e5ea;border-radius:5px;
    background:#fbfcfd;font:12.5px/1.7 inherit;color:#3d4552;outline:none}
  #etf-bar input[type=text]:focus{border-color:#b9cee4;background:#fff}
  #etf-bar .etf-btn{padding:3px 12px;border:1px solid #e0e5ea;border-radius:5px;background:#fff;color:#5a6472;
    cursor:pointer;font:12.5px/1.7 inherit;transition:all .12s}
  #etf-bar .etf-btn:hover{border-color:var(--etf-blue);color:var(--etf-blue)}
  #etf-bar .etf-btn.primary{background:var(--etf-blue);border-color:var(--etf-blue);color:#fff}
  #etf-bar .etf-btn.primary:hover{background:#265d98;color:#fff}
  `;
  document.head.appendChild(style);

  const bar = document.createElement('div');
  bar.id = 'etf-bar';
  if (folded) bar.classList.add('folded');
  bar.innerHTML = `
    <div class="etf-top">
      <span class="etf-title">新聞過濾</span>
      <span class="etf-sum" id="etf-sum"></span>
      <span class="etf-count" id="etf-count"></span>
      <span class="etf-caret">▼</span>
    </div>
    <div class="etf-main">
      <div id="etf-chips"></div>
      <div class="etf-kw">
        <label>關鍵字</label>
        <input type="text" id="etf-words" placeholder="逗號或空白分隔，例：快訊 獨家">
        <button class="etf-btn primary" id="etf-apply">套用</button>
        <button class="etf-btn" id="etf-reset">清除</button>
      </div>
    </div>`;

  const anchor = document.querySelector('.part_menu_2') || document.querySelector('.part_list_2');
  anchor.parentNode.insertBefore(bar, anchor.nextSibling);

  const chipBox = bar.querySelector('#etf-chips');
  const countEl = bar.querySelector('#etf-count');
  const sumEl = bar.querySelector('#etf-sum');
  const wordsEl = bar.querySelector('#etf-words');
  wordsEl.value = blockWords.join(' ');

  bar.querySelector('.etf-top').addEventListener('click', () => {
    folded = !folded;
    bar.classList.toggle('folded', folded);
    store.set(KEY_FOLD, folded);
  });

  function renderChips() {
    const names = [...cats].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
    chipBox.innerHTML = names.map(n =>
      `<span class="etf-chip${hiddenCats.has(n) ? ' off' : ''}" data-cat="${n}" title="點擊切換顯示／隱藏">${n}</span>`
    ).join('');
  }

  chipBox.addEventListener('click', e => {
    const chip = e.target.closest('.etf-chip');
    if (!chip) return;
    const c = chip.dataset.cat;
    if (hiddenCats.has(c)) hiddenCats.delete(c); else hiddenCats.add(c);
    store.set(KEY_CATS, [...hiddenCats]);
    chip.classList.toggle('off');
    applyFilter();
  });

  bar.querySelector('#etf-apply').addEventListener('click', () => {
    blockWords = wordsEl.value.split(/[\s,，、]+/).map(s => s.trim()).filter(Boolean);
    store.set(KEY_WORDS, blockWords);
    applyFilter();
  });
  wordsEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); bar.querySelector('#etf-apply').click(); }
  });
  bar.querySelector('#etf-reset').addEventListener('click', () => {
    hiddenCats.clear();
    blockWords = [];
    store.set(KEY_CATS, []);
    store.set(KEY_WORDS, []);
    wordsEl.value = '';
    renderChips();
    applyFilter();
  });

  // ---------- 過濾 ----------
  function applyFilter() {
    const items = document.querySelectorAll(ITEM_SELECTOR);
    let hidden = 0, newCat = false;
    items.forEach(it => {
      const c = catOf(it);
      if (c && !cats.has(c)) { cats.add(c); newCat = true; }
      const h = shouldHide(it);
      it.style.display = h ? 'none' : '';
      if (h) hidden++;
    });
    if (newCat) renderChips();

    const rules = [...hiddenCats, ...blockWords];
    sumEl.textContent = rules.length ? '· ' + rules.join('、') : '· 未設定';
    countEl.textContent = hidden ? `已隱藏 ${hidden} / ${items.length} 則` : `共 ${items.length} 則`;
  }

  renderChips();
  applyFilter();

  // 無限捲動／換頁後新增的項目也要過濾
  const list = document.querySelector('.part_list_2');
  if (list) {
    let pending = null;
    new MutationObserver(() => {
      clearTimeout(pending);
      pending = setTimeout(applyFilter, 120);
    }).observe(list, { childList: true, subtree: true });
  }
})();
