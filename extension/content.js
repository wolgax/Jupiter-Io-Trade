// ===== Config =====
const BLOCK_WIDTH = 420;
const BLOCK_HEIGHT = 600;
const SELL_MINT = 'So11111111111111111111111111111111111111112';

// ===== Helpers =====
function isMemePage(url = window.location.href) {
  try {
    const u = new URL(url);

    // axiom.trade
    if (u.hostname === 'axiom.trade' && /^\/meme\/[^/?#]+/.test(u.pathname)) {
      return true;
    }

    // gmgn.ai
    if (u.hostname === 'gmgn.ai' && /^\/sol\/token\/[A-Za-z0-9]{32,44}/.test(u.pathname)) {
      return true;
    }

    // padre.gg
    if (u.hostname.endsWith('padre.gg')) {
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}

function removeWidget() {
  const existing = document.getElementById('DraggableBlock');
  if (existing) existing.remove();
  window.__WidgetCA = null;
}

function ensureWidgetForCA(ca) {
  if (!ca) return;

  const existing = document.getElementById('DraggableBlock');
  const targetSrc =
    chrome.runtime.getURL('widget.html') + `?token=${encodeURIComponent(ca)}`;

  if (existing) {
    if (existing.dataset.tokenCa === ca) return;
    existing.dataset.tokenCa = ca;
    existing.querySelector('iframe').src = targetSrc;
    window.__WidgetCA = ca;
    return;
  }

  const savedState = JSON.parse(localStorage.getItem('DraggableBlockState') || '{}');

  const block = document.createElement('div');
  block.id = 'DraggableBlock';
  block.dataset.tokenCa = ca;
  block.style.position = 'fixed';
  block.style.top = savedState.top || '80px';
  block.style.left = savedState.left || '80px';
  block.style.width = savedState.width || '300px';
  block.style.height = savedState.height || '600px';
  block.style.background = '#0b0e13';
  block.style.border = '1px solid #0b0e13';
  block.style.borderRadius = '10px';
  block.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
  block.style.zIndex = '2147483646';
  block.style.overflow = 'hidden';
  block.style.display = 'flex';
  block.style.flexDirection = 'column';
  block.style.resize = 'both';
  block.style.minWidth = '298px';
  block.style.minHeight = '500px';

  const header = document.createElement('div');
  header.style.background = '#0b0e13';
  header.style.height = '40px';
  header.style.padding = '4px 8px';
  header.style.fontSize = '13px';
  header.style.fontWeight = 'bold';
  header.style.display = 'flex';
  header.style.justifyContent = 'flex-end';
  header.style.alignItems = 'center';
  header.style.cursor = 'grab';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.border = 'none';
  closeBtn.style.background = 'transparent';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '16px';
  closeBtn.style.color = '#e8f9ff';
  closeBtn.style.fontWeight = 'bold';
  closeBtn.onclick = () => removeWidget();

  closeBtn.addEventListener('mousedown', (e) => e.stopPropagation());

  header.appendChild(closeBtn);

  const iframe = document.createElement('iframe');
  iframe.src = targetSrc;
  iframe.style.border = 'none';
  iframe.style.width = '100%';

  const adjustIframeSize = () => {
    const headerHeight = header.offsetHeight;
    iframe.style.height = block.clientHeight - headerHeight + 'px';
  };

  const resizeObserver = new ResizeObserver(() => {
    adjustIframeSize();
    saveWidgetState(block);
  });
  resizeObserver.observe(block);

  block.appendChild(header);
  block.appendChild(iframe);
  document.body.appendChild(block);

  const draggie = new Draggabilly(block, {
    handle: header,
    containment: window,
  });
  draggie.on('dragEnd', () => saveWidgetState(block));

  adjustIframeSize();
  window.__WidgetCA = ca;
}

function saveWidgetState(block) {
  const state = {
    top: block.style.top,
    left: block.style.left,
    width: block.style.width,
    height: block.style.height,
  };
  localStorage.setItem('DraggableBlockState', JSON.stringify(state));
}

// ===== CA Extractor =====
function extractCAOnce() {
  const host = window.location.host;

  if (host.includes('gmgn.ai')) {
    const m = window.location.pathname.match(/^\/sol\/token\/([A-Za-z0-9]{32,44})/);
    if (m && m[1]) return m[1];
    return null;
  }

  if (host.includes('axiom.trade')) {
    const solscanLink =
      document.querySelector('a[href*="solscan.io/account/"]') ||
      document.querySelector('a[href*="solscan.io/token/"]');
    if (solscanLink) {
      const tokenMatch = solscanLink.href.match(/(account|token)\/([A-Za-z0-9]{32,44})/);
      if (tokenMatch && tokenMatch[2]) return tokenMatch[2];
    }

    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
      if (button.textContent.includes('...')) {
        const possibleAddress = button.textContent.match(/[A-Za-z0-9]{32,44}/);
        if (possibleAddress) return possibleAddress[0];
      }
    }

    const metaTags = document.querySelectorAll('meta');
    for (const tag of metaTags) {
      if (tag.content && tag.content.match(/[A-Za-z0-9]{32,44}/)) {
        const address = tag.content.match(/[A-Za-z0-9]{32,44}/)[0];
        if (address.length >= 32) return address;
      }
    }
  }

  if (host.includes('padre.gg')) {
    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
      const match = button.textContent.match(/[A-Za-z0-9]{32,44}/);
      if (match) return match[0];
    }
    const spans = document.querySelectorAll('span');
    for (const span of spans) {
      const match = span.textContent.match(/[A-Za-z0-9]{32,44}/);
      if (match) return match[0];
    }
    const links = document.querySelectorAll('a[href]');
    for (const link of links) {
      const match = link.href.match(/[A-Za-z0-9]{32,44}/);
      if (match) return match[0];
    }
  }

  return null;
}

async function findCAWithRetries({ tries = 24, delayMs = 250 } = {}) {
  for (let i = 0; i < tries; i++) {
    const ca = extractCAOnce();
    if (ca) return ca;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

(function hookHistory() {
  const pushState = history.pushState;
  const replaceState = history.replaceState;
  history.pushState = function () {
    const ret = pushState.apply(this, arguments);
    window.dispatchEvent(new Event('locationchange'));
    return ret;
  };
  history.replaceState = function () {
    const ret = replaceState.apply(this, arguments);
    window.dispatchEvent(new Event('locationchange'));
    return ret;
  };
  window.addEventListener('popstate', () => {
    window.dispatchEvent(new Event('locationchange'));
  });
})();

let handlingChange = false;
let lastCA = null;

async function handleRouteChange() {
  if (handlingChange) return;
  handlingChange = true;
  try {
    if (!isMemePage()) {
      removeWidget();
      return;
    }
    const ca = await findCAWithRetries();
    if (!ca) return;
    if (ca === lastCA) {
      ensureWidgetForCA(ca);
      return;
    }
    lastCA = ca;
    ensureWidgetForCA(ca);
  } finally {
    handlingChange = false;
  }
}

window.addEventListener('locationchange', handleRouteChange);
document.addEventListener('readystatechange', () => {
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    handleRouteChange();
  }
});

setInterval(() => {
  const urlNow = window.__LastUrl || '';
  if (urlNow !== location.href) {
    window.__LastUrl = location.href;
    window.dispatchEvent(new Event('locationchange'));
  }
}, 500);

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.cmd === 'toggleWidget') {
    if (!isMemePage()) return;
    const existing = document.getElementById('DraggableBlock');
    if (existing) {
      removeWidget();
    } else {
      handleRouteChange();
    }
  }
});

window.__LastUrl = location.href;
handleRouteChange();