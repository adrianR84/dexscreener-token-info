// ==UserScript==
// @name         DexScreener Token Info
// @match        https://dexscreener.com/*
// @grant        GM_setClipboard
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_addStyle
// @grant       GM_xmlhttpRequest
// @grant       GM_registerMenuCommand
// @connect     *
// @var          text   pcApiUrl   Project Checker URL    https://api.projectchecker.io
// @var          text   pcApiUrl2  Project Checker URL 2
// @var          checkbox pcApiUrlEnabled  Enable URL 1
// @var          checkbox pcApiUrl2Enabled Enable URL 2
// @var          text   pcApiKey   Project Checker API Key
// ==/UserScript==

GM_addStyle(`
  .pc-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;align-items:center;justify-content:center;}
  .pc-dashboard{background:#1a1a2e;color:#fff;padding:24px;border-radius:12px;min-width:480px;max-width:560px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.5);font-size:14px;}
  .pc-dashboard h2{margin:0 0 16px;font-size:18px;}
  .pc-dashboard label{display:block;font-size:13px;margin-bottom:4px;color:#aaa;}
  .pc-dashboard .url-row{display:flex;align-items:center;gap:8px;margin-bottom:14px;}
  .pc-dashboard .url-row label{margin-bottom:0;white-space:nowrap;flex:none;}
  .pc-dashboard .url-row input[type=checkbox]{flex:none;width:auto;}
  .pc-dashboard .url-row input[type=text]{flex:1;padding:8px;background:#111;border:1px solid #333;color:#fff;border-radius:4px;box-sizing:border-box;}
  .pc-dashboard .url-row input[type=text]:disabled{opacity:0.4;}
  .pc-dashboard input[type=text],.pc-dashboard input[type=password]{width:100%;padding:8px;margin-bottom:14px;background:#111;border:1px solid #333;color:#fff;border-radius:4px;box-sizing:border-box;}
  .pc-dashboard input:focus{outline:none;border-color:#7af;}
  .pc-dashboard .btn-row{display:flex;gap:8px;}
  .pc-dashboard button{flex:1;padding:8px;cursor:pointer;border-radius:6px;font-size:13px;border:none;}
  .pc-save{background:#7af;color:#000;}
  .pc-cancel{background:#333;color:#fff;}
`);

const chain = location.pathname.split('/')[1];

const openDashboard = () => {
  const overlay = document.createElement('div');
  overlay.className = 'pc-overlay';

  const savedKey = GM_getValue('pcApiKey', '');
  const savedUrl = GM_getValue('pcApiUrl', '');
  const savedUrl2 = GM_getValue('pcApiUrl2', '');
  const savedEnabled = GM_getValue('pcApiUrlEnabled', true);
  const savedEnabled2 = GM_getValue('pcApiUrl2Enabled', false);

  overlay.innerHTML = `
    <div class="pc-dashboard">
      <h2>Project Checker Settings</h2>
      <label>Project Checker API Key</label>
      <div class="url-row">
        <input type="password" id="pc-api-key" value="${savedKey}" placeholder="API Key">
      </div>
      <div class="url-row">
        <input type="checkbox" id="pc-url-enabled" ${savedEnabled ? 'checked' : ''}>
        <label for="pc-url-enabled">Enabled</label>
        <input type="text" id="pc-api-url" value="${savedUrl}" placeholder="https://api.projectchecker.io">
      </div>
      <div class="url-row">
        <input type="checkbox" id="pc-url2-enabled" ${savedEnabled2 ? 'checked' : ''}>
        <label for="pc-url2-enabled">Enabled</label>
        <input type="text" id="pc-api-url2" value="${savedUrl2}" placeholder="https://api.projectchecker.io">
      </div>
      <div class="btn-row">
        <button class="pc-cancel" id="pc-cancel">Cancel</button>
        <button class="pc-save" id="pc-save">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const updateUrlState = () => {
    document.getElementById('pc-api-url').disabled = !document.getElementById('pc-url-enabled').checked;
    document.getElementById('pc-api-url2').disabled = !document.getElementById('pc-url2-enabled').checked;
  };
  document.getElementById('pc-url-enabled').addEventListener('change', updateUrlState);
  document.getElementById('pc-url2-enabled').addEventListener('change', updateUrlState);
  updateUrlState();

  document.getElementById('pc-cancel').onclick = () => overlay.remove();
  document.getElementById('pc-save').onclick = () => {
    GM_setValue('pcApiKey', document.getElementById('pc-api-key').value);
    GM_setValue('pcApiUrl', document.getElementById('pc-api-url').value);
    GM_setValue('pcApiUrl2', document.getElementById('pc-api-url2').value);
    GM_setValue('pcApiUrlEnabled', document.getElementById('pc-url-enabled').checked);
    GM_setValue('pcApiUrl2Enabled', document.getElementById('pc-url2-enabled').checked);
    overlay.remove();
  };
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
};

GM_registerMenuCommand('Open Project Checker Dashboard', openDashboard);

const safeJson = (text) => {
  if (!text) return null;
  const i = text.lastIndexOf('}');
  if (i > 0) text = text.slice(0, i + 1);
  try { return JSON.parse(text); } catch { return null; }
};

const buildUrls = () => {
  const urls = [];
  if (GM_getValue('pcApiUrlEnabled', true)) urls.push(GM_getValue('pcApiUrl', '').replace(/\/$/, ''));
  if (GM_getValue('pcApiUrl2Enabled', false)) urls.push(GM_getValue('pcApiUrl2', '').replace(/\/$/, ''));
  return urls.filter(u => u);
};

const gmFetch = (url, opts) => new Promise((resolve, reject) => {
  GM_xmlhttpRequest({
    method: opts.method,
    url,
    headers: opts.headers,
    data: opts.body,
    onload: (r) => resolve({ ok: r.status >= 200 && r.status < 300, status: r.status, text: r.responseText || '' }),
    onerror: () => reject(new Error('Network error')),
    ontimeout: () => reject(new Error('Timeout')),
  });
});

const showPanel = (info) => {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;bottom:65px;right:20px;background:#1a1a2e;color:#fff;padding:14px;border-radius:8px;border:2px solid #fff;z-index:9998;font-size:13px;min-width:220px;max-width:400px;box-shadow:0 4px 20px rgba(0,0,0,0.4);';
  wrap.innerHTML = `
    <button id="pc-close" style="position:absolute;top:6px;right:8px;background:none;border:none;color:#fff;cursor:pointer;font-size:14px;font-weight:800;">✕</button>
    <pre id="pc-json" style="margin:0;line-height:1.5;overflow:auto;cursor:pointer;"></pre>
    <div id="pc-resp" style="margin-top:8px;font-size:11px;word-break:break-all;"></div>
    <div id="pc-btns" style="display:flex;gap:8px;margin-top:10px;">
      <button id="pc-add" style="flex:1;padding:6px;cursor:pointer;font-size:12px;border-radius:4px;background:#352;border:1px solid #463;color:#fff;">Add</button>
      <button id="pc-remove" style="flex:1;padding:6px;cursor:pointer;font-size:12px;border-radius:4px;background:#522;border:1px solid #633;color:#fff;">Remove</button>
    </div>
  `;
  document.body.appendChild(wrap);

  const respDiv = document.getElementById('pc-resp');
  const jsonPre = document.getElementById('pc-json');
  const addBtn = document.getElementById('pc-add');
  const removeBtn = document.getElementById('pc-remove');

  jsonPre.textContent = JSON.stringify(info, null, 2);
  jsonPre.onclick = () => { GM_setClipboard(JSON.stringify(info)); respDiv.textContent = '✅ Copied!'; };
  document.getElementById('pc-close').onclick = () => wrap.remove();

  const doReq = (path, method, body) => {
    const apiKey = GM_getValue('pcApiKey', '');
    const urls = buildUrls();
    if (!apiKey || !urls.length) { openDashboard(); return; }
    return Promise.all(urls.map(url =>
      gmFetch(`${url}/api/v1/${path}`, { method, headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body })
        .then(r => { if (!r.ok) return { error: `HTTP ${r.status}` }; return safeJson(r.text) || { error: 'Bad JSON' }; })
    ));
  };

  removeBtn.onclick = () => {
    removeBtn.textContent = 'Removing...';
    removeBtn.disabled = true;
    doReq('projects/remove', 'DELETE', JSON.stringify({ contractAddress: info.contractAddress, chainId: info.chainId, symbol: info.symbol }))
      .then(results => {
        respDiv.textContent = JSON.stringify(results);
        if (results.every(r => r?.ok)) {
          removeBtn.textContent = '✅ Removed!';
          setTimeout(() => wrap.remove(), 1000);
        } else {
          const err = results.find(r => r?.error)?.error || 'Failed';
          removeBtn.textContent = '❌ ' + err;
          setTimeout(() => { removeBtn.textContent = 'Remove'; removeBtn.disabled = false; }, 3000);
        }
      }).catch(err => { respDiv.textContent = err.message; removeBtn.textContent = '❌ Failed'; removeBtn.disabled = false; });
  };

  addBtn.onclick = () => {
    addBtn.textContent = 'Sending...';
    addBtn.disabled = true;
    doReq('projects/import', 'POST', JSON.stringify(info))
      .then(results => {
        respDiv.textContent = JSON.stringify(results);
        if (results.some(r => r?.created?.length)) {
          addBtn.textContent = '✅ Added!';
          setTimeout(() => wrap.remove(), 1000);
        } else {
          const err = results.find(r => r?.errors?.length)?.errors[0].error || 'Failed';
          addBtn.textContent = '❌ ' + err;
          setTimeout(() => { addBtn.textContent = 'Add'; addBtn.disabled = false; }, 3000);
        }
      }).catch(err => { respDiv.textContent = err.message; addBtn.textContent = '❌ Failed'; addBtn.disabled = false; });
  };
};

let injected = false;
let lastPath = location.pathname;
setInterval(() => {
  if (location.pathname !== lastPath) {
    injected = false;
    lastPath = location.pathname;
  }
}, 500);

const tryInject = () => {
  if (injected) return;
  const els = document.querySelectorAll('.chakra-stack .custom-i33gp9');
  if (!els[1]) return;

  const title = els[1].querySelector('span')?.title;
  if (!title) return;
  injected = true;

  const apiUrl = `https://api.dexscreener.com/token-pairs/v1/${chain}/${title}`;

  // Settings gear button
  const settingsBtn = document.createElement('button');
  settingsBtn.textContent = '⚙️';
  settingsBtn.style.cssText = 'position:fixed;bottom:20px;right:90px;z-index:9999;padding:6px 10px;cursor:pointer;font-size:14px;border-radius:6px;background:#222;border:1px solid #444;color:#fff;';
  settingsBtn.onclick = openDashboard;
  document.body.appendChild(settingsBtn);

  const btn = document.createElement('button');
  btn.textContent = '📋 Project Checker';
  btn.id = 'dex-copy-btn';
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;padding:6px 12px;cursor:pointer;font-size:13px;border-radius:6px;background:#222;border:1px solid #444;color:#fff;';
  btn.onclick = () => {
    GM_xmlhttpRequest({
      method: 'GET',
      url: apiUrl,
      onload: (r) => {
        let data;
        try { data = JSON.parse(r.responseText); } catch { data = null; }
        const p = Array.isArray(data) ? data[0] : data?.data?.[0];
        const socials = (p?.info?.socials || []);
        const twitterUrl = socials.find(s => s.type === 'twitter')?.url;
        const telegramUrl = socials.find(s => s.type === 'telegram')?.url;
        showPanel({
          name: p?.baseToken?.name,
          symbol: p?.baseToken?.symbol,
          contractAddress: p?.baseToken?.address,
          chainId: chain,
          website: p?.info?.websites?.[0]?.url,
          twitter: twitterUrl,
          telegram: telegramUrl,
        });
        GM_setClipboard(title);
      },
    });
  };
  document.body.appendChild(btn);
};

const observer = new MutationObserver(() => {
  tryInject();
});
observer.observe(document.body, { childList: true, subtree: true });
tryInject();

// Hotkey to open dashboard
document.addEventListener('keydown', (e) => {
  if (e.shiftKey && e.key === 'S') openDashboard();
});

