/**
 * Keep-alive ZENOCCAZ v3
 * - Réveille le serveur dès le chargement de la page
 * - Bloque l'input le temps du réveil
 * - Considère 400 comme un succès (serveur vivant)
 */

(function () {
  const API_URL = 'https://zenoccaz.onrender.com/api/chat';
  const INTERVAL_MS = 14 * 60 * 1000;

  function setInputState(ready) {
    const input = document.getElementById('chat-input');
    const btn = document.getElementById('chat-send-btn');
    if (!input || !btn) return;
    if (ready) {
      input.disabled = false;
      input.placeholder = 'Votre question...';
      btn.disabled = false;
    } else {
      input.disabled = true;
      input.placeholder = '⏳ Connexion en cours...';
      btn.disabled = true;
    }
  }

  function showStatusMessage(text) {
    const messages = document.getElementById('chat-messages');
    if (!messages) return;
    let el = document.getElementById('server-status-msg');
    if (!el) {
      el = document.createElement('div');
      el.id = 'server-status-msg';
      el.style.cssText = 'text-align:center;font-size:12px;color:#888;padding:6px 12px;font-style:italic;';
      messages.appendChild(el);
    }
    el.textContent = text;
    messages.scrollTop = messages.scrollHeight;
  }

  function removeStatusMessage() {
    const el = document.getElementById('server-status-msg');
    if (el) el.remove();
  }

  function unblock() {
    setInputState(true);
    removeStatusMessage();
    console.log('🟢 Serveur prêt');
  }

  async function wakeServer() {
    const waitForDOM = setInterval(() => {
      const input = document.getElementById('chat-input');
      if (!input) return;
      clearInterval(waitForDOM);
      setInputState(false);
      showStatusMessage('⏳ Connexion au serveur...');
    }, 100);

    const t1 = setTimeout(() => showStatusMessage('🔄 Démarrage du serveur...'), 8000);
    const t2 = setTimeout(() => showStatusMessage('☕ Encore quelques secondes...'), 20000);
    // Sécurité : débloquer après 60s quoi qu'il arrive
    const t3 = setTimeout(() => unblock(), 60000);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '__ping__', systemPrompt: '', conversationHistory: [] }),
      });

      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);

      // 200 OU 400 = serveur vivant et réveillé ✅
      if (response.status === 200 || response.status === 400 || response.status === 422) {
        unblock();
      } else {
        // Autre erreur HTTP mais serveur répond quand même
        unblock();
      }
    } catch (e) {
      // Erreur réseau réelle (serveur vraiment HS)
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      unblock(); // On débloque quand même, le chatbot gère ses propres retries
      console.warn('⚠️ Ping échoué:', e.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wakeServer);
  } else {
    wakeServer();
  }

  // Garder éveillé toutes les 14 min
  setInterval(() => {
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '__ping__', systemPrompt: '', conversationHistory: [] }),
    }).catch(() => {});
  }, INTERVAL_MS);

})();