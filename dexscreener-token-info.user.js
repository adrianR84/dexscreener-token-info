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
// @var          text   pcApiKey   Project Checker API Key
// ==/UserScript==

GM_addStyle(`
  .pc-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;align-items:center;justify-content:center;}
  .pc-dashboard{background:#1a1a2e;color:#fff;padding:24px;border-radius:12px;min-width:320px;max-width:400px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.5);}
  .pc-dashboard h2{margin:0 0 16px;font-size:16px;}
  .pc-dashboard label{display:block;font-size:12px;margin-bottom:4px;color:#aaa;}
  .pc-dashboard input{width:100%;padding:8px;margin-bottom:14px;background:#111;border:1px solid #333;color:#fff;border-radius:4px;box-sizing:border-box;}
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

  overlay.innerHTML = `
    <div class="pc-dashboard">
      <h2>Project Checker Settings</h2>
      <label>Project Checker API Key</label>
      <input type="password" id="pc-api-key" value="${savedKey}" placeholder="API Key">
      <label>Project Checker URL</label>
      <input type="text" id="pc-api-url" value="${savedUrl}" placeholder="https://api.projectchecker.io">
      <div class="btn-row">
        <button class="pc-cancel" id="pc-cancel">Cancel</button>
        <button class="pc-save" id="pc-save">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('pc-cancel').onclick = () => overlay.remove();
  document.getElementById('pc-save').onclick = () => {
    GM_setValue('pcApiKey', document.getElementById('pc-api-key').value);
    GM_setValue('pcApiUrl', document.getElementById('pc-api-url').value);
    overlay.remove();
  };
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
};

GM_registerMenuCommand('Open Project Checker Dashboard', openDashboard);

const showPanel = (info) => {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;top:10px;right:10px;background:#1a1a2e;color:#fff;padding:14px;border-radius:8px;z-index:9999;font-size:13px;min-width:220px;max-width:400px;box-shadow:0 4px 20px rgba(0,0,0,0.4);';
  const close = document.createElement('button');
  close.textContent = '✕';
  close.style.cssText = 'position:absolute;top:6px;right:8px;background:none;border:none;color:#fff;cursor:pointer;font-size:14px;';
  close.onclick = () => wrap.remove();
  const pre = document.createElement('pre');
  pre.style.cssText = 'margin:0;line-height:1.5;overflow:auto;cursor:pointer;';
  pre.textContent = JSON.stringify(info, null, 2);
  const respDiv = document.createElement('div');
  respDiv.style.cssText = 'margin-top:8px;font-size:11px;word-break:break-all;';
  pre.onclick = () => {
    GM_setClipboard(JSON.stringify(info));
    respDiv.textContent = '✅ Copied to clipboard!';
  };
  wrap.appendChild(close);
  wrap.appendChild(pre);
  wrap.appendChild(respDiv);
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add token to Project Checker';
  addBtn.style.cssText = 'display:block;width:calc(100% - 16px);margin:10px 0 0 0;padding:6px;cursor:pointer;font-size:12px;border-radius:4px;background:#333;border:1px solid #555;color:#fff;';

  addBtn.onclick = () => {
    const apiKey = GM_getValue('pcApiKey', '');
    const apiUrl = GM_getValue('pcApiUrl', '');
    if (!apiKey || !apiUrl) { openDashboard(); return; }
    addBtn.textContent = 'Sending...';
    addBtn.disabled = true;
    fetch(`${apiUrl}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(info),
    }).then(r => r.json()).then(res => {
      respDiv.textContent = JSON.stringify(res);
      if (res?.created?.length) {
        addBtn.textContent = '✅ Added!';
        setTimeout(() => wrap.remove(), 1000);
      } else if (res?.errors?.length) {
        addBtn.textContent = '❌ ' + res.errors[0].error;
        setTimeout(() => { addBtn.textContent = 'Add token to Project Checker'; addBtn.disabled = false; }, 3000);
      } else {
        addBtn.textContent = '❌ Failed';
        setTimeout(() => { addBtn.textContent = 'Add token to Project Checker'; addBtn.disabled = false; }, 2000);
      }
    }).catch(() => {
      addBtn.textContent = '❌ Failed';
      setTimeout(() => { addBtn.textContent = 'Add token to Project Checker'; addBtn.disabled = false; }, 2000);
    });
  };
  wrap.appendChild(addBtn);
  document.body.appendChild(wrap);
};

let injected = false;

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
  btn.textContent = '📋 Token Info';
  btn.id = 'dex-copy-btn';
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;padding:6px 12px;cursor:pointer;font-size:13px;border-radius:6px;background:#222;border:1px solid #444;color:#fff;';
  btn.onclick = () => {
    fetch(apiUrl).then(r => r.json()).then(data => {
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
