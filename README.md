# ETtoday 新聞列表過濾器

Firefox / Chrome userscript。在 [ETtoday 新聞總覽](https://www.ettoday.net/news/news-list.htm) 隱藏不想看的新聞分類（例如遊戲）與關鍵字。

![版本](https://img.shields.io/badge/version-2.0.0-blue)

## 安裝

1. 安裝 [Violentmonkey](https://addons.mozilla.org/firefox/addon/violentmonkey/) 或 Tampermonkey
2. 點這裡安裝：[ettoday-news-filter.user.js](https://raw.githubusercontent.com/charles0506/ettoday-news-filter/main/ettoday-news-filter.user.js)

## 功能

- 過濾列直接嵌在頁面原本的分類選單下方，不浮動、不遮內容
- 分類 chip 點一下切換隱藏／顯示（灰底刪除線＝已隱藏）
- 分類清單由目前頁面自動掃出來，新分類會自動出現
- 標題關鍵字黑名單，逗號或空白分隔，Enter 直接套用
- 設定用 `GM_setValue` 記憶（無 GM API 時退回 localStorage）
- MutationObserver 監看清單，換頁／動態載入的新項目照樣過濾
- 右側即時顯示「已隱藏 N / M 則」

## 運作方式

抓 `.part_list_2 h3`，讀每則的 `em.tag` 判斷分類，命中黑名單就 `display:none`。純前端隱藏，不動原站行為。

## 驗證紀錄

2026-09-13 於實際頁面注入測試：18 個分類 chip 自動掃出；點「遊戲」→ 10/100 則隱藏；關鍵字「快訊」另外命中；設定寫入 localStorage 正常。
