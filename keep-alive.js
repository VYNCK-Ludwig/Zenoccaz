/**
 * Keep-alive ZENOCCAZ v4
 * - Réveille le serveur dès le chargement de la page
 * - Bloque l'input le temps du réveil
 * - Ping toutes les 10 min (marge confortable avant les 15 min de Render)
 * - Message de statut stylé proprement hors du flux de messages
 */

(function () {
  const API_URL    = 'https://zenoccaz.onrender.com/api/chat';
  const INTERVAL   = 10 * 60 * 1000; // 10 min (Render coupe à 15 min)
  const MAX_WAIT   = 65000;           // sécurité 65s

  /* ── Helpers input ── */
  function setInputState(ready) {
    const input = document.getElementById('chat-input');
    const btn   = document.getElementById('chat-send-btn');
    const photo = document.getElementById('chat-photo-btn');
    if (!input || !btn) return;
    input.disabled       = !ready;
    btn.disabled         = !ready;
    if (photo) photo.disabled = !ready;
    input.placeholder    = ready ? 'Posez votre question...' : '⏳ Connexion en cours...';
  }

  /* ── Bandeau de statut (hors du flux #chat-messages) ── */
  function getStatusBanner() {
    let el = document.getElementById('zc-server-status');
    if (!el) {
      el = document.createElement('div');
      el.id = 'zc-server-status';
      // Inséré juste au-dessus de la zone de saisie, pas dans les messages
      const inputArea = document.querySelector('.chat-input-area');
      if (inputArea) inputArea.parentNode.insertBefore(el, inputArea);
    }
    return el;
  }

  function showStatus(text, color) {
    color = color || '#94a3b8';
    const el = getStatusBanner();
    if (!el) return;
    el.style.cssText = [
      'display:flex', 'align-items:center', 'gap:6px',
      'padding:6px 16px', 'font-size:11px', 'font-weight:500',
      'color:' + color,
      'background:rgba(0,0,0,0.25)',
      'border-top:1px solid rgba(255,255,255,0.05)',
      'font-family:Inter,-apple-system,sans-serif',
      'transition:opacity 0.3s',
    ].join(';');
    el.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:' + color + ';flex-shrink:0;"></span>' + text;
  }

  function removeStatus() {
    const el = document.getElementById('zc-server-status');
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }

  function unblock() {
    setInputState(true);
    removeStatus();
    console.log('🟢 Serveur ZenOccaz prêt');
  }

  /* ── Ping principal au chargement ── */
  async function wakeServer() {
    // Attendre que le DOM soit prêt
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (document.getElementById('chat-input')) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      // Timeout sécurité 5s si DOM jamais prêt
      setTimeout(() => { clearInterval(check); resolve(); }, 5000);
    });

    setInputState(false);
    showStatus('Connexion au serveur...', '#94a3b8');

    const t1 = setTimeout(() => showStatus('Démarrage du serveur...', '#f59e0b'),   8000);
    const t2 = setTimeout(() => showStatus('Encore quelques secondes...', '#f59e0b'), 20000);
    const t3 = setTimeout(() => showStatus('Toujours en cours...', '#f97316'),       40000);
    // Sécurité absolue : débloquer après MAX_WAIT
    const t4 = setTimeout(() => { clearAll(); unblock(); }, MAX_WAIT);

    function clearAll() {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    }

    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), MAX_WAIT - 2000);

      const response = await fetch(API_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: '__ping__', systemPrompt: '', conversationHistory: [] }),
        signal:  ctrl.signal,
      });

      clearTimeout(tid);
      clearAll();

      // Tout code HTTP = serveur vivant (200, 400, 422, 500...)
      showStatus('Connecté ✓', '#10b981');
      setTimeout(unblock, 800);

    } catch (e) {
      clearAll();
      if (e.name === 'AbortError') {
        console.warn('⚠️ Ping timeout — serveur trop lent');
        showStatus('Délai dépassé — réessai possible', '#ef4444');
      } else {
        console.warn('⚠️ Ping échoué:', e.message);
        showStatus('Serveur injoignable — réessai...', '#ef4444');
      }
      // Débloquer quand même, le chatbot gère ses propres retries
      setTimeout(unblock, 1500);
    }
  }

  /* ── Ping silencieux toutes les 10 min ── */
  function silentPing() {
    fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message: '__ping__', systemPrompt: '', conversationHistory: [] }),
    })
      .then(() => console.log('💚 Keep-alive ping OK'))
      .catch(() => console.warn('⚠️ Keep-alive ping échoué'));
  }

  /* ── Init ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wakeServer);
  } else {
    wakeServer();
  }

  setInterval(silentPing, INTERVAL);

})();