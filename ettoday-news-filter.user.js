// ==UserScript==
// @name         ETtoday 新聞列表過濾器
// @namespace    https://github.com/charles0506
// @version      2.0.0
// @description  在 ETtoday 新聞總覽頁隱藏不想看的分類（例如遊戲）與關鍵字，過濾列直接嵌在頁面分類選單下方，設定自動記憶
// @author       charles0506
// @match        https://www.ettoday.net/news/news-list*
// @match        https://ettoday.net/news/news-list*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const KEY_CATS = 'ettoday_hidden_cats';
  const KEY_WORDS = 'ettoday_block_words';

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

  let hiddenCats = new Set(store.get(KEY_CATS, []));
  let blockWords = store.get(KEY_WORDS, []);

  const ITEM_SELECTOR = '.part_list_2 h3';
  const cats = new Set(hiddenCats);   // 頁面出現過的分類（含目前被隱藏的）

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

  // ---------- 過濾列（嵌在頁面分類選單下方） ----------
  const style = document.createElement('style');
  style.textContent = `
  #etf-bar{margin:8px 0 4px;padding:8px 10px;border:1px solid #dfe3e8;border-left:4px solid #2b6cb0;
    border-radius:4px;background:#fafbfc;font:13px/1.8 "Microsoft JhengHei",sans-serif;color:#333}
  #etf-bar .etf-line{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
  #etf-bar .etf-label{color:#2b6cb0;font-weight:700;margin-right:2px}
  #etf-bar .etf-chip{padding:1px 9px;border:1px solid #cbd3da;border-radius:11px;background:#fff;
    cursor:pointer;user-select:none;white-space:nowrap;transition:all .12s}
  #etf-bar .etf-chip:hover{border-color:#2b6cb0;color:#2b6cb0}
  #etf-bar .etf-chip.off{background:#e6e9ec;color:#98a0a8;border-color:#d6dade;text-decoration:line-through}
  #etf-bar .etf-sep{width:100%;height:0}
  #etf-bar input[type=text]{flex:1;min-width:150px;padding:2px 7px;border:1px solid #cbd3da;border-radius:3px;font:13px/1.6 inherit}
  #etf-bar .etf-btn{padding:2px 10px;border:1px solid #cbd3da;border-radius:3px;background:#fff;cursor:pointer;font:13px/1.6 inherit}
  #etf-bar .etf-btn:hover{border-color:#2b6cb0;color:#2b6cb0}
  #etf-count{color:#888;margin-left:auto;white-space:nowrap}
  `;
  document.head.appendChild(style);

  const bar = document.createElement('div');
  bar.id = 'etf-bar';
  bar.innerHTML = `
    <div class="etf-line">
      <span class="etf-label">過濾</span>
      <span id="etf-chips" style="display:contents"></span>
      <span id="etf-count"></span>
    </div>
    <div class="etf-sep"></div>
    <div class="etf-line" style="margin-top:6px">
      <span class="etf-label">關鍵字</span>
      <input type="text" id="etf-words" placeholder="以逗號或空白分隔，例：快訊 獨家">
      <button class="etf-btn" id="etf-apply">套用</button>
      <button class="etf-btn" id="etf-reset">重設</button>
    </div>`;

  const anchor = document.querySelector('.part_menu_2') || document.querySelector('.part_list_2');
  anchor.parentNode.insertBefore(bar, anchor.nextSibling);

  const chipBox = bar.querySelector('#etf-chips');
  const countEl = bar.querySelector('#etf-count');
  const wordsEl = bar.querySelector('#etf-words');
  wordsEl.value = blockWords.join(' ');

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
