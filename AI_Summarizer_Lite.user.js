// ==UserScript==
// @name         AI Page Summarizer
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Tóm tắt trang web bằng AI Gemini - Bản Lite không mã hóa
// @author       Minhdz and GG Antigravity
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      generativelanguage.googleapis.com
// ==/UserScript==

(function () {
    'use strict';

    // ──────────────────────────────────────────────
    //  PROMPT GỐC - Lấy từ Extension Summaizzerrr
    // ──────────────────────────────────────────────
    const PROMPTS = {
        detailed: `<TASK>
Summarize the webpage content from <INPUT_CONTENT>. Focus on main points, specific examples, and useful information. __TONE__. Reply in __LANG__
</TASK>

<REQUIREMENTS>
✅ **Visuals**: Use relevant emojis (e.g., 💡, 🚀, ⚠️, 📉) to make the summary visually appealing.
✅ **Content**: Main topics, important points, specific examples/data, steps/instructions.
✅ **Clear separation**: Use headings, bullet points, or paragraphs.
❌ **No Output Tags**: Don't include the <title> or <OUTPUT_STRUCTURE> tags.
❌ **No Redundancy**: Do not repeat information.
❌ **No Plain Blocks**: Avoid long blocks of text without visual breaks (emojis/bullets).
</REQUIREMENTS>

<EXAMPLE>
## 🔑 Key Takeaways
- Key point 1 - concise sentence include emojis for key concepts
- Key point 2 - concise sentence include emojis for key concepts
- Key point 3 - concise sentence include emojis for key concepts

## 📝 Main Content
### Section Title
[Structured summary using bullets, tables, include emojis for key concepts]
</EXAMPLE>

<INPUT_CONTENT>
__CONTENT__
</INPUT_CONTENT>

Reply in __LANG__`,

        standard: `<TASK>
Provide a structured summary (100-300 words) of this webpage content, covering the main points clearly. __TONE__. Reply in __LANG__.
</TASK>

<OUTPUT_FORMAT>
## [Page Topic/Title]
[Brief overview of what the page is about]

## Main Points
- Key point 1 💡
- Key point 2 🚀
- Key point 3 📌
- Additional points if necessary, max 8 total

## Key Takeaways
[Most important conclusions or actionable insights]
</OUTPUT_FORMAT>

<REQUIREMENTS>
✅ **Focused**: Main topics and important points only
✅ **Visuals**: Use relevant emojis (e.g., 💡, 🚀, ⚠️, 📉) to make the summary visually appealing.
✅ **Actionable**: Include practical takeaways when present
❌ **Avoid**: Detailed step-by-step instructions, minor examples
❌ **No**: Excessive sub-sections, lengthy explanations
</REQUIREMENTS>

<INPUT_CONTENT>
__CONTENT__
</INPUT_CONTENT>

Reply in __LANG__`,

        brief: `<TASK>
Provide a concise summary (50-100 words) of this webpage content, focusing only on the most essential information. __TONE__. Reply in __LANG__.
</TASK>

<OUTPUT_FORMAT>
## Main Topic
[1-2 sentences describing what the page is about]

## Key Takeaway
[Single most important point or actionable insight]
</OUTPUT_FORMAT>

<REQUIREMENTS>
✅ **Essential only**: Focus on the core message
✅ **Concise**: 50-100 words maximum
✅ **Clear**: Simple, direct language
❌ **Avoid**: Detailed examples, step-by-step instructions, minor points
</REQUIREMENTS>

<INPUT_CONTENT>
__CONTENT__
</INPUT_CONTENT>

Reply in __LANG__`
    };

    const TONES = {
        professional: 'Use a professional, clear, and neutral tone.',
        casual: 'Use a friendly, conversational, and approachable tone.',
        academic: 'Use an academic, analytical, and precise tone.'
    };

    // ──────────────────────────────────────────────
    //  SETTINGS
    // ──────────────────────────────────────────────
    let apiKey      = GM_getValue('AIS_KEY', '');
    let model       = GM_getValue('AIS_MODEL', 'gemini-2.5-flash');
    let promptType  = GM_getValue('AIS_PROMPT', 'standard');
    let tone        = GM_getValue('AIS_TONE', 'professional');
    let outputLang  = GM_getValue('AIS_LANG', 'Vietnamese');
    let isBusy      = false;

    // ──────────────────────────────────────────────
    //  CSS
    // ──────────────────────────────────────────────
    const CSS = `
        :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; }

        /* FAB - Nút bên phải */
        .fab {
            position: fixed; top: 60%; right: 0;
            transform: translateY(-50%);
            width: 44px; height: 52px;
            background: linear-gradient(160deg, #10b981, #3b82f6);
            border-radius: 14px 0 0 14px;
            display: flex; align-items: center; justify-content: center;
            cursor: grab; box-shadow: -3px 3px 12px rgba(0,0,0,.2);
            z-index: 2147483647; transition: width .18s ease, background .18s ease;
            user-select: none;
        }
        .fab:hover { width: 52px; background: linear-gradient(160deg, #059669, #2563eb); }
        .fab svg { width: 22px; height: 22px; fill: white; pointer-events: none; }

        /* Panel chính */
        .panel {
            position: fixed; top: 60%; right: 58px;
            transform: translateY(-50%);
            width: 360px; max-height: 520px;
            background: #fff; border-radius: 14px;
            box-shadow: 0 10px 40px rgba(0,0,0,.14); border: 1px solid #e2e8f0;
            display: none; flex-direction: column;
            z-index: 2147483646; overflow: hidden;
        }
        .panel.open { display: flex; }

        /* Header panel */
        .panel-header {
            padding: 12px 14px 10px;
            background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
            display: flex; align-items: center; gap: 8px;
        }
        .panel-title { color: #fff; font-weight: 700; font-size: 15px; flex: 1; }
        .panel-header-btn {
            background: rgba(255,255,255,.2); border: none; border-radius: 8px;
            color: #fff; padding: 5px 9px; cursor: pointer; font-size: 13px;
            transition: background .15s;
        }
        .panel-header-btn:hover { background: rgba(255,255,255,.35); }

        /* Body panel */
        .panel-body { padding: 12px 14px; overflow-y: auto; flex: 1; }

        /* Nút Tóm Tắt chính */
        .btn-summarize {
            width: 100%; padding: 11px;
            background: linear-gradient(135deg, #10b981, #3b82f6);
            color: #fff; border: none; border-radius: 9px;
            font-size: 14px; font-weight: 600; cursor: pointer;
            transition: opacity .2s; margin-bottom: 10px;
        }
        .btn-summarize:hover { opacity: .88; }
        .btn-summarize:disabled { opacity: .55; cursor: not-allowed; }

        /* Vùng kết quả */
        .result-box {
            font-size: 13px; line-height: 1.65; color: #1e293b;
            white-space: pre-wrap; display: none;
            border-top: 1px dashed #cbd5e1; padding-top: 10px;
        }
        .result-box.show { display: block; }

        /* Panel Cài đặt (Settings) */
        .settings-panel {
            display: none; flex-direction: column; gap: 10px;
            border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 4px;
        }
        .settings-panel.open { display: flex; }
        .setting-row { display: flex; flex-direction: column; gap: 3px; }
        .setting-row label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .5px; }
        .setting-row input, .setting-row select {
            padding: 7px 9px; border: 1px solid #cbd5e1; border-radius: 7px;
            font-size: 13px; outline: none; width: 100%; box-sizing: border-box;
            transition: border-color .15s;
        }
        .setting-row input:focus, .setting-row select:focus { border-color: #3b82f6; }
        .btn-save {
            padding: 8px; background: #3b82f6; color: #fff; border: none;
            border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer;
        }
        .btn-save:hover { background: #2563eb; }

        /* Heading styling trong result */
        .result-box h2 { font-size: 14px; margin: 10px 0 4px; color: #0f172a; }
        .result-box h3 { font-size: 13px; margin: 8px 0 3px; color: #1e293b; }
    `;

    // ──────────────────────────────────────────────
    //  DOM SETUP
    // ──────────────────────────────────────────────
    const host   = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'closed' });

    const styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    shadow.appendChild(styleEl);

    // FAB
    const fab = document.createElement('div');
    fab.className = 'fab';
    fab.innerHTML = `<svg viewBox="0 0 24 24"><path d="M19 3H5a2 2 0 0 0-2 2v14l4-4h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/></svg>`;
    shadow.appendChild(fab);

    // Panel chính
    const panel = document.createElement('div');
    panel.className = 'panel';
    shadow.appendChild(panel);

    // ──────────────────────────────────────────────
    //  RENDER PANEL
    // ──────────────────────────────────────────────
    function renderPanel() {
        panel.innerHTML = `
            <div class="panel-header">
                <span class="panel-title">✨ AI Summarizer</span>
                <button class="panel-header-btn" id="btn-settings">⚙️</button>
                <button class="panel-header-btn" id="btn-close">✕</button>
            </div>
            <div class="panel-body">
                <button class="btn-summarize" id="btn-go">⚡ Tóm tắt trang này</button>

                <div class="settings-panel" id="settings-panel">
                    <div class="setting-row">
                        <label>Gemini API Key</label>
                        <input type="password" id="s-key" placeholder="AIza..." value="${apiKey}">
                    </div>
                    <div class="setting-row">
                        <label>Model</label>
                        <select id="s-model">
                            <option value="gemini-3-flash-preview" ${model==='gemini-3-flash-preview'?'selected':''}>Gemini 3.0 Flash (Preview)</option>
                            <option value="gemini-3.1-flash-lite-preview" ${model==='gemini-3.1-flash-lite-preview'?'selected':''}>Gemini 3.0 Flash Lite (Preview)</option>
                            <option value="gemini-2.5-flash" ${model==='gemini-2.5-flash'?'selected':''}>Gemini 2.5 Flash ⭐</option>
                            <option value="gemini-2.5-flash-lite" ${model==='gemini-2.5-flash-lite'?'selected':''}>Gemini 2.5 Flash Lite</option>
                            <option value="gemini-2.0-flash" ${model==='gemini-2.0-flash'?'selected':''}>Gemini 2.0 Flash (Ổn định)</option>
                        </select>
                    </div>
                    <div class="setting-row">
                        <label>Kiểu tóm tắt</label>
                        <select id="s-prompt">
                            <option value="standard" ${promptType==='standard'?'selected':''}>Chuẩn — Main Points + Key Takeaways</option>
                            <option value="detailed" ${promptType==='detailed'?'selected':''}>Chi tiết — Key Takeaways + Full Detail</option>
                            <option value="brief" ${promptType==='brief'?'selected':''}>Tóm gọn — Main Topic + 1 Takeaway</option>
                        </select>
                    </div>
                    <div class="setting-row">
                        <label>Văn phong</label>
                        <select id="s-tone">
                            <option value="professional" ${tone==='professional'?'selected':''}>Chuyên nghiệp</option>
                            <option value="casual" ${tone==='casual'?'selected':''}>Thân thiện / Đời thường</option>
                            <option value="academic" ${tone==='academic'?'selected':''}>Học thuật / Phân tích</option>
                        </select>
                    </div>
                    <div class="setting-row">
                        <label>Ngôn ngữ đầu ra</label>
                        <select id="s-lang">
                            <option value="Vietnamese" ${outputLang==='Vietnamese'?'selected':''}>Tiếng Việt</option>
                            <option value="English" ${outputLang==='English'?'selected':''}>English</option>
                            <option value="the same language as the content" ${outputLang==='the same language as the content'?'selected':''}>Tự động (theo trang)</option>
                        </select>
                    </div>
                    <button class="btn-save" id="btn-save">💾 Lưu cài đặt</button>
                </div>

                <div class="result-box" id="result-box"></div>
            </div>
        `;

        // Close
        panel.querySelector('#btn-close').addEventListener('click', () => {
            panel.classList.remove('open');
        });

        // Toggle settings
        const settingsPanel = panel.querySelector('#settings-panel');
        panel.querySelector('#btn-settings').addEventListener('click', () => {
            settingsPanel.classList.toggle('open');
        });

        // Save settings
        panel.querySelector('#btn-save').addEventListener('click', () => {
            apiKey     = panel.querySelector('#s-key').value.trim();
            model      = panel.querySelector('#s-model').value;
            promptType = panel.querySelector('#s-prompt').value;
            tone       = panel.querySelector('#s-tone').value;
            outputLang = panel.querySelector('#s-lang').value;

            GM_setValue('AIS_KEY', apiKey);
            GM_setValue('AIS_MODEL', model);
            GM_setValue('AIS_PROMPT', promptType);
            GM_setValue('AIS_TONE', tone);
            GM_setValue('AIS_LANG', outputLang);

            settingsPanel.classList.remove('open');
            showResult('<i style="color:#10b981">✅ Đã lưu cài đặt!</i>', false);
        });

        // Summarize
        panel.querySelector('#btn-go').addEventListener('click', doSummarize);
    }

    // ──────────────────────────────────────────────
    //  HELPERS
    // ──────────────────────────────────────────────
    function showResult(html, isPreformatted = true) {
        const box = panel.querySelector('#result-box');
        if (!box) return;
        box.innerHTML = html;
        box.classList.add('show');
    }

    function setBusy(busy, label = '') {
        isBusy = busy;
        const btn = panel.querySelector('#btn-go');
        if (!btn) return;
        btn.disabled = busy;
        btn.textContent = busy ? label : '⚡ Tóm tắt trang này';
    }

    // ──────────────────────────────────────────────
    //  EXTRACT TEXT — Site-specific + Generic
    // ──────────────────────────────────────────────

    /** Reddit (new UI) — uses <shreddit-post>, <shreddit-comment> web components */
    function extractReddit() {
        const parts = [];

        // Subreddit name
        const sub = document.querySelector('shreddit-subreddit-header [data-subreddit-name]');
        if (sub) parts.push(`Subreddit: ${sub.getAttribute('data-subreddit-name')}`);

        // Post title — try multiple selectors
        const title = document.querySelector('[slot="title"]')
            || document.querySelector('shreddit-post h1')
            || document.querySelector('h1[id*="post-title"]')
            || document.querySelector('[data-post-click-location="title"]');
        if (title) parts.push(`Title: ${title.textContent.trim()}`);

        // Post body (selftext) — new Reddit puts it in various slots
        const bodySelectors = [
            '[slot="text-body"]',
            '[data-post-click-location="text-body"]',
            'shreddit-post .md',
            'shreddit-post [data-click-id="text"]',
            '.post-content',
            '#t3_post-rtjson-content',
        ];
        for (const sel of bodySelectors) {
            const bodyEl = document.querySelector(sel);
            if (bodyEl && bodyEl.textContent.trim().length > 20) {
                parts.push(`Post Body:\n${bodyEl.textContent.trim()}`);
                break;
            }
        }

        // If it's a link post, grab the outbound URL
        const linkEl = document.querySelector('shreddit-post a[data-post-click-location="link-button"]')
            || document.querySelector('shreddit-post a[target="_blank"][href^="http"]');
        if (linkEl) parts.push(`Link: ${linkEl.href}`);

        // Top comments — grab first 30 for context
        const commentEls = document.querySelectorAll('shreddit-comment');
        const commentTexts = [];
        commentEls.forEach((cEl, i) => {
            if (i >= 30) return;
            // Comment body is usually in a <div> with id containing "-comment-rtjson-content"
            const cBody = cEl.querySelector('[id*="comment-rtjson-content"]')
                || cEl.querySelector('[slot="comment"]')
                || cEl.querySelector('.md');
            if (cBody) {
                const txt = cBody.textContent.trim();
                if (txt.length > 5) commentTexts.push(`- ${txt}`);
            }
        });
        if (commentTexts.length) {
            parts.push(`\nTop Comments (${commentTexts.length}):\n${commentTexts.join('\n')}`);
        }

        return parts.length > 1 ? parts.join('\n\n') : '';
    }

    /** Old Reddit (old.reddit.com) */
    function extractOldReddit() {
        const parts = [];

        const title = document.querySelector('.top-matter .title a.title');
        if (title) parts.push(`Title: ${title.textContent.trim()}`);

        const selftext = document.querySelector('.expando .usertext-body .md');
        if (selftext) parts.push(`Post Body:\n${selftext.textContent.trim()}`);

        const comments = document.querySelectorAll('.comment .md');
        const commentTexts = [];
        comments.forEach((c, i) => {
            if (i >= 30) return;
            const txt = c.textContent.trim();
            if (txt.length > 5) commentTexts.push(`- ${txt}`);
        });
        if (commentTexts.length) {
            parts.push(`\nTop Comments (${commentTexts.length}):\n${commentTexts.join('\n')}`);
        }

        return parts.length > 1 ? parts.join('\n\n') : '';
    }

    /** Generic extractor — tries multiple content containers */
    function extractGeneric() {
        // Priority list of content containers
        const selectors = [
            'article',
            '[role="article"]',
            'main article',
            'main',
            '.post-content',
            '.entry-content',
            '.article-body',
            '#content',
            '.content',
        ];

        let el = null;
        for (const sel of selectors) {
            const candidate = document.querySelector(sel);
            if (candidate && candidate.textContent.trim().length > 100) {
                el = candidate;
                break;
            }
        }

        const clone = (el || document.body).cloneNode(true);
        // Remove non-content elements
        clone.querySelectorAll(
            'script, style, noscript, nav, footer, header, aside, ' +
            '.sidebar, [role="banner"], [role="navigation"], [role="complementary"], ' +
            '.ad, .ads, .advertisement, .social-share, .related-posts, ' +
            '.cookie-banner, .popup, .modal'
        ).forEach(n => n.remove());

        return (clone.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function extractContent() {
        try {
            const hostname = location.hostname;
            let text = '';

            // Reddit — new UI
            if (hostname.includes('reddit.com') && !hostname.startsWith('old.')) {
                text = extractReddit();
            }
            // Reddit — old UI
            else if (hostname.startsWith('old.reddit.com')) {
                text = extractOldReddit();
            }

            // If site-specific extraction failed or returned too little, use generic
            if (!text || text.length < 50) {
                text = extractGeneric();
            }

            return text.substring(0, 30000);
        } catch (e) {
            return document.body.innerText.substring(0, 30000);
        }
    }

    // ──────────────────────────────────────────────
    //  MAIN SUMMARIZE
    // ──────────────────────────────────────────────
    function doSummarize() {
        if (isBusy) return;

        if (!apiKey) {
            panel.querySelector('#settings-panel').classList.add('open');
            showResult('<span style="color:#ef4444">⚠️ Hãy điền API Key Gemini vào phần Cài đặt (⚙️) rồi thử lại.</span>', false);
            return;
        }

        const content = extractContent();
        if (!content) {
            showResult('<span style="color:#ef4444">⚠️ Không tìm được nội dung văn bản trên trang này.</span>', false);
            return;
        }

        setBusy(true, '⏳ AI đang phân tích...');
        showResult('<i style="color:#64748b">Đang xử lý, vui lòng chờ 5-15 giây...</i>', false);

        // Tạo prompt từ template gốc
        const toneStr = TONES[tone] || TONES.professional;
        const template = PROMPTS[promptType] || PROMPTS.standard;
        const finalPrompt = template
            .replace(/__TONE__/g, toneStr)
            .replace(/__LANG__/g, outputLang)
            .replace(/__CONTENT__/g, content);

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        try {
            GM_xmlhttpRequest({
                method: 'POST',
                url: apiUrl,
                headers: { 'Content-Type': 'application/json' },
                timeout: 90000,
                data: JSON.stringify({
                    contents: [{ parts: [{ text: finalPrompt }] }],
                    generationConfig: { temperature: 0.4 }
                }),
                onload(res) {
                    setBusy(false);
                    if (res.status === 200) {
                        try {
                            const json = JSON.parse(res.responseText);
                            const text = json.candidates[0].content.parts[0].text;
                            // Render Markdown cơ bản sang HTML
                            const html = text
                                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/`(.*?)`/g, '<code>$1</code>')
                                .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                                .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                                .replace(/^- (.*$)/gm, '• $1')
                                .replace(/\n/g, '<br>');
                            showResult(html, false);
                        } catch (e) {
                            showResult(`<span style="color:#ef4444">❌ Lỗi giải nén dữ liệu AI: ${e.message}</span>`, false);
                        }
                    } else {
                        let detail = '';
                        try { detail = JSON.parse(res.responseText)?.error?.message || ''; } catch (_) {}
                        showResult(`<span style="color:#ef4444">❌ Lỗi Server Google (${res.status}).<br>${detail || 'Kiểm tra lại API Key hoặc thử đổi Model trong ⚙️ Cài đặt.'}</span>`, false);
                    }
                },
                onerror(err) {
                    setBusy(false);
                    showResult(`<span style="color:#ef4444">❌ Lỗi kết nối mạng. Hãy đảm bảo TamperMonkey đã cấp quyền kết nối đến <b>generativelanguage.googleapis.com</b>.</span>`, false);
                },
                ontimeout() {
                    setBusy(false);
                    showResult('<span style="color:#ef4444">⏱ Quá thời gian chờ (90s). Thử lại hoặc đổi sang model nhẹ hơn.</span>', false);
                }
            });
        } catch (e) {
            setBusy(false);
            showResult(`<span style="color:#ef4444">❌ Lỗi khởi tạo: ${e.message}</span>`, false);
        }
    }

    // ──────────────────────────────────────────────
    //  FAB: KÉO THẢ DỌC + CLICK ĐỂ TOGGLE
    // ──────────────────────────────────────────────
    let dragging = false;
    let dragStartY = 0;
    let fabInitialTop = 0;

    fab.addEventListener('mousedown', (e) => {
        dragging = false;
        dragStartY = e.clientY;
        fabInitialTop = parseFloat(fab.style.top) || window.innerHeight * 0.8;
        fab.style.cursor = 'grabbing';

        const onMove = (mv) => {
            const dy = mv.clientY - dragStartY;
            if (Math.abs(dy) > 5) dragging = true;
            if (dragging) {
                let newTop = fabInitialTop + dy;
                newTop = Math.max(36, Math.min(window.innerHeight - 36, newTop));
                fab.style.transition = 'none';
                panel.style.transition = 'none';
                fab.style.top = newTop + 'px';
                panel.style.top = newTop + 'px';
                fab.style.transform = 'translateY(-50%)';
                panel.style.transform = 'translateY(-50%)';
            }
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            fab.style.cursor = 'grab';
            fab.style.transition = '';
            panel.style.transition = '';
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        e.preventDefault();
    });

    fab.addEventListener('click', () => {
        if (dragging) return;
        const isOpen = panel.classList.contains('open');
        if (!isOpen) {
            renderPanel();
            panel.classList.add('open');
        } else {
            panel.classList.remove('open');
        }
    });

})();
