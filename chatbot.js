/**
 * Chatbot Widget - ZENOCCAZ v3.0
 */

class ChatBot {
  constructor() {
    this.messages = [];
    this.isOpen = false;
    this.isLoading = false;
    this._waitingForLogin = false;

    const apiBase = 'https://zenoccaz.onrender.com';
    this.apiUrl = `${apiBase}/api/chat`;
    this.apiSaveDiagnosisUrl = `${apiBase}/api/save-diagnosis`;
    this.apiPhotoUrl = `${apiBase}/api/analyze-photo`;

    this.sessionId = this.createSessionId();
    this.pendingTextHandler = null;
    this.pendingButtonsHandler = null;
    this.pendingLeadChoice = null;
    this.pendingLeadPayload = null;
    this.supabaseRetryTimer = null;

    this.state = {
      mode: null, step: 0, answers: {}, conversation: [],
      chatSubject: null, currentSymptom: null, currentDiagnosis: null,
      vehicleInfo: { brand: null, model: null, year: null, fuelType: null }
    };

    this.connectedClient = this.getConnectedClient();
    if (this.connectedClient) console.log('Client:', this.connectedClient.name);

    if (window.DiagnosticEngine) {
      this.diagEngine = new window.DiagnosticEngine();
      const s = this.diagEngine.getStats();
      console.log('DiagnosticEngine v3:', s.symptomsCatalogued, 'symptomes,', s.totalConfirmations, 'confirmations');
    } else {
      this.diagEngine = null;
    }

    this.init();
  }

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.injectPhotoButton();
    this.watchLoginState();
    if (this.connectedClient) this.updateChatHeader(this.connectedClient);
    this.resetConversation();
  }

  cacheDOM() {
    this.chatWidget   = document.getElementById('chat-widget');
    this.chatBtn      = document.getElementById('chat-toggle-btn');
    this.chatBox      = document.getElementById('chat-box');
    this.chatMessages = document.getElementById('chat-messages');
    this.chatInput    = document.getElementById('chat-input');
    this.chatSend     = document.getElementById('chat-send-btn');
    this.chatClose    = document.getElementById('chat-close-btn');
  }

  bindEvents() {
    this.chatBtn?.addEventListener('click', () => this.toggle());
    this.chatClose?.addEventListener('click', () => this.close());
    this.chatSend?.addEventListener('click', () => this.sendMessage());
    this.chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
    });
    this.chatMessages?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-chat-value]');
      if (!btn || !this.pendingButtonsHandler) return;
      const value = btn.getAttribute('data-chat-value');
      const label = btn.getAttribute('data-chat-label') || value;
      this.addMessage(label, 'user');
      const handler = this.pendingButtonsHandler;
      this.pendingButtonsHandler = null;
      handler(value, label);
    });
  }

  injectPhotoButton() {
    if (document.getElementById('chat-photo-btn')) return;
    const sendBtn = document.getElementById('chat-send-btn');
    if (!sendBtn) return;

    const btn = document.createElement('button');
    btn.id = 'chat-photo-btn';
    btn.title = 'Envoyer des photos pour analyse';
    btn.innerHTML = '📷';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    fileInput.id = 'chat-photo-input';
    document.body.appendChild(fileInput);

    btn.addEventListener('click', () => {
      if (this.state.mode !== 'ai_chat') {
        this.state.mode = 'ai_chat';
        if (!this.state.conversation) this.state.conversation = [];
        if (!this.state.vehicleInfo) this.state.vehicleInfo = { brand: null, model: null, year: null, fuelType: null };
      }
      fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;
      fileInput.value = '';
      if (files.length === 1) {
        this.addMessage('Photo envoyee : ' + files[0].name, 'user');
        await this.analyzePhoto(files[0], this.state.chatSubject || '');
      } else {
        this.addMessage(files.length + ' photos envoyees - analyse en cours...', 'user');
        for (let i = 0; i < files.length; i++) {
          this.addMessage('Analyse ' + (i+1) + '/' + files.length + ' : ' + files[i].name, 'bot');
          await this.analyzePhoto(files[i], this.state.chatSubject || '');
        }
      }
    });

    sendBtn.parentNode.insertBefore(btn, sendBtn);
  }

  watchLoginState() {
    window.addEventListener('clientLogin', (e) => {
      const c = e.detail;
      this.connectedClient = c;
      this.updateChatHeader(c);
      this.resetChatState();
      if (this._waitingForLogin) {
        this._waitingForLogin = false;
        const prenom = c.name ? c.name.split(' ')[0] : '';
        this.state = { mode: 'ai_chat', step: 0, answers: {}, conversation: [], chatSubject: null, vehicleInfo: { brand: null, model: null, year: null, fuelType: null } };
        this.addMessage('Parfait ' + prenom + ' ! Dites-moi ce que je peux faire pour vous.', 'bot');
      } else {
        this.startFlow();
      }
    });

    window.addEventListener('clientLogout', () => {
      this.connectedClient = null;
      this.updateChatHeader(null);
      this.resetChatState();
      this.startFlow();
    });

    let lastId = this.connectedClient ? this.connectedClient.id : null;
    setInterval(() => {
      const current = this.getConnectedClient();
      const currentId = current ? current.id : null;
      if (currentId !== lastId) {
        lastId = currentId;
        this.connectedClient = current;
        this.updateChatHeader(current);
        this.resetChatState();
        this.startFlow();
      }
    }, 2000);
  }

  getConnectedClient() {
    try { return JSON.parse(localStorage.getItem('clientData') || 'null'); } catch (e) { return null; }
  }

  updateChatHeader(client) {
    const el = document.getElementById('chat-client-name');
    if (el) {
      if (client && client.name) { el.textContent = client.name; el.style.display = 'block'; }
      else { el.textContent = ''; el.style.display = 'none'; }
    }
    this.injectResizeButton();
  }

  injectResizeButton() {
    if (document.getElementById('chat-resize-btn')) return;
    const closeBtn = document.getElementById('chat-close-btn');
    if (!closeBtn) return;

    const btn = document.createElement('button');
    btn.id = 'chat-resize-btn';
    btn.title = 'Agrandir';
    btn.innerHTML = '⛶';
    btn.addEventListener('click', () => this.toggleFullscreen());

    let btnGroup = document.getElementById('chat-btn-group');
    if (!btnGroup) {
      btnGroup = document.createElement('div');
      btnGroup.id = 'chat-btn-group';
      btnGroup.style.cssText = 'display:flex;align-items:center;gap:6px;';
      closeBtn.parentNode.replaceChild(btnGroup, closeBtn);
      btnGroup.appendChild(btn);
      btnGroup.appendChild(closeBtn);
    }
  }

  toggleFullscreen() {
    const btn = document.getElementById('chat-resize-btn');
    const widget = this.chatWidget;
    if (!widget) return;
    if (widget.classList.contains('ai-fullscreen-total')) {
      widget.classList.remove('ai-fullscreen-total');
      widget.classList.remove('ai-fullscreen');
      if (btn) { btn.innerHTML = '⛶'; btn.title = 'Agrandir'; }
    } else if (widget.classList.contains('ai-fullscreen')) {
      widget.classList.add('ai-fullscreen-total');
      if (btn) { btn.innerHTML = '🗗'; btn.title = 'Reduire'; }
    } else {
      this.enableFullscreen();
      if (btn) { btn.innerHTML = '⛶'; btn.title = 'Plein ecran'; }
    }
  }

  enableFullscreen() {
    if (this.chatWidget) this.chatWidget.classList.add('ai-fullscreen');
    const btn = document.getElementById('chat-resize-btn');
    if (btn) { btn.innerHTML = '⛶'; btn.title = 'Plein ecran'; }
  }

  disableFullscreen() {
    if (this.chatWidget) {
      this.chatWidget.classList.remove('ai-fullscreen');
      this.chatWidget.classList.remove('ai-fullscreen-total');
    }
    const btn = document.getElementById('chat-resize-btn');
    if (btn) { btn.innerHTML = '⛶'; btn.title = 'Agrandir'; }
  }

  toggle() { this.isOpen ? this.close() : this.open(); }

  open() {
    this.isOpen = true;
    this.chatWidget && this.chatWidget.classList.remove('closed');
    if (this.chatInput) setTimeout(() => this.chatInput.focus(), 100);
  }

  close() {
    this.isOpen = false;
    this.chatWidget && this.chatWidget.classList.add('closed');
    this.disableFullscreen();
  }

  resetConversation() {
    this.messages = [];
    this.renderMessages();
    this.startFlow();
  }

  resetChatState() {
    this.messages = [];
    this.pendingTextHandler = null;
    this.pendingButtonsHandler = null;
    this.state = { mode: null, step: 0, answers: {}, conversation: [], chatSubject: null, vehicleInfo: { brand: null, model: null, year: null, fuelType: null } };
    this.disableFullscreen();
    this.renderMessages();
  }

  startFlow() {
    this.connectedClient = this.getConnectedClient();
    const client = this.connectedClient;
    if (client) {
      const prenom = client.name ? client.name.split(' ')[0] : 'toi';
      this.addMessage('Bonjour ' + prenom + ' ! Ravi de te retrouver. Comment puis-je t\'aider ?', 'bot');
      this.offerResumeConversation().then(hasConv => { if (!hasConv) this.showMainChoices(); });
    } else {
      this.addMessage('Salut ! Je suis l\'assistant ZenOccaz. Comment puis-je t\'aider ?', 'bot');
      this.showMainChoices();
    }
  }

  showMainChoices() {
    this.addButtons('Choisis une option :', [
      { label: "🔧 Diagnostic Mecano IA", value: 'diagnostic' },
      { label: 'Vendre un vehicule (rapide)', value: 'sell' },
      { label: 'Acheter un vehicule (rapide)', value: 'buy' },
    ], (value) => {
      this.logChatChoice(value);
      if (value === 'diagnostic') return this.startDiagnosticMode();
      if (value === 'sell') return this.startSellFlow();
      if (value === 'buy') return this.startBuyFlow();
    });
  }

  promptLoginForAI() {
    if (this.getConnectedClient()) return this.startAIChatMode();
    this.addButtons("Pour retrouver vos conversations, connectez-vous ! C'est gratuit.", [
      { label: 'Se connecter / Creer un compte', value: 'login' },
      { label: 'Continuer sans compte', value: 'no_login' },
    ], (value) => {
      if (value === 'no_login') return this.startAIChatMode();
      if (typeof window.openLoginModal === 'function') {
        this._waitingForLogin = true;
        window.openLoginModal();
        this.addMessage('Connectez-vous, le chat demarrera automatiquement !', 'bot');
      } else {
        setTimeout(() => this.startAIChatMode(), 2000);
      }
    });
  }

  startAIChatMode() {
    this.state = { mode: 'ai_chat', step: 0, answers: {}, conversation: [], chatSubject: null, vehicleInfo: { brand: null, model: null, year: null, fuelType: null } };
    const clientData = this.getConnectedClient();
    if (clientData) {
      this.offerResumeConversation().then(hasConv => {
        if (!hasConv) this.addMessage('Parfait ! Posez-moi vos questions sur les pannes, l\'achat ou la vente. Je suis la pour vous aider !', 'bot');
      });
    } else {
      this.addMessage('Parfait ! Posez-moi vos questions sur les pannes, l\'achat ou la vente. Je suis la pour vous aider !', 'bot');
    }
  }

  addMessage(text, sender, meta) {
    meta = meta || {};
    this.messages.push({ text: text, sender: sender || 'user', timestamp: new Date(), ...meta });
    this.renderMessages();
  }

  parseMarkdown(text) {
    return text
      .replace(/^## (.+)$/gm, '<h3 style="margin:14px 0 8px;font-size:15px;color:#86efac;font-weight:700;">$1</h3>')
      .replace(/^### (.+)$/gm, '<h4 style="margin:12px 0 6px;font-size:14px;color:#93c5fd;">$1</h4>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^[-•] (.+)$/gm, '<li style="margin:4px 0;padding-left:4px;">$1</li>')
      .replace(/^(\d+)[.)]\s+(.+)$/gm, '<div style="display:flex;gap:8px;margin:8px 0;"><span style="color:#10b981;font-weight:700;min-width:20px;">$1)</span><span>$2</span></div>')
      .replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, function(m) { return '<ul style="margin:8px 0;padding-left:16px;list-style:disc;">' + m + '</ul>'; })
      .replace(/→/g, '<span style="color:#10b981;">→</span>')
      .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:12px 0;">')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  renderMessages() {
    if (!this.chatMessages) return;
    this.chatMessages.innerHTML = this.messages.map(function(msg) {
      const content = msg.sender === 'bot' ? this.parseMarkdown(msg.text) : this.escapeHTML(msg.text);
      const bubble = '<div class="chat-bubble">' + content + '</div>';
      const buttons = msg.type === 'buttons' && Array.isArray(msg.options)
        ? '<div class="chat-buttons">' + msg.options.map(opt =>
            '<button class="chat-option" data-chat-value="' + this.escapeHTML(opt.value) + '" data-chat-label="' + this.escapeHTML(opt.label) + '">' + this.escapeHTML(opt.label) + '</button>'
          ).join('') + '</div>'
        : '';
      return '<div class="chat-message ' + msg.sender + '">' + bubble + buttons + '</div>';
    }.bind(this)).join('');
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  escapeHTML(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  addButtons(text, options, handler) {
    this.pendingButtonsHandler = handler;
    this.addMessage(text, 'bot', { type: 'buttons', options: options });
  }

  askText(question, handler) {
    this.pendingTextHandler = handler;
    this.addMessage(question, 'bot');
  }

  async sendMessage() {
    const text = this.chatInput ? this.chatInput.value.trim() : '';
    if (!text) return;
    this.addMessage(text, 'user');
    if (this.chatInput) this.chatInput.value = '';
    if (this.pendingTextHandler) {
      const h = this.pendingTextHandler;
      this.pendingTextHandler = null;
      h(text);
      return;
    }
    if (this.state.mode === 'ai_chat') return this.handleAIChat(text);
    if (this.state.mode === 'diagnostic') return this.handleDiagnosticMessage(text, false);
    this.addMessage('Choisis une option pour commencer.', 'bot');
    this.showMainChoices();
  }

  async handleAIChat(userMessage) {
    // Mode diagnostic — rediriger AVANT tout le reste
    if (this.state.mode === 'diagnostic') {
      if (this.pendingTextHandler) {
        const h = this.pendingTextHandler;
        this.pendingTextHandler = null;
        h(userMessage);
      } else {
        this.handleDiagnosticMessage(userMessage, false);
      }
      return;
    }

    this.setLoading(true);
    if (!this.state.conversation) this.state.conversation = [];
    this.state.conversation.push({ role: 'user', content: userMessage });

    if (!this.state.chatSubject) {
      this.state.chatSubject = userMessage.substring(0, 50);
      this.generateConversationTitle(userMessage);
    }

    this.updateFuelTypeFromMessage(userMessage);
    await this.detectAndSaveClientFeedback(userMessage);

    this.addMessage('En train de reflechir...', 'bot');
    const waitIdx = this.messages.length - 1;
    const upd = function(t) { if (this.messages[waitIdx]) { this.messages[waitIdx].text = t; this.renderMessages(); } }.bind(this);
    const t1 = setTimeout(function() { upd('Connexion au serveur...'); }, 4000);
    const t2 = setTimeout(function() { upd('Le serveur demarre...'); }, 12000);
    const t3 = setTimeout(function() { upd('Encore quelques secondes...'); }, 25000);
    const clearT = function() { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };

    const self = this;
    const fetchWithRetry = async function(body, retries) {
      retries = retries || 2;
      for (let i = 0; i <= retries; i++) {
        try {
          const ctrl = new AbortController();
          const tid = setTimeout(function() { ctrl.abort(); }, 55000);
          const res = await fetch(self.apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
          clearTimeout(tid);
          if (res.ok) return res;
          throw new Error('HTTP ' + res.status);
        } catch (err) {
          if (i < retries) { upd('Reconnexion (tentative ' + (i+2) + ')...'); await new Promise(function(r) { setTimeout(r, 3000); }); }
          else throw err;
        }
      }
    };

    try {
      const terrainContext = this.diagEngine ? this.diagEngine.getContextForPrompt(userMessage) : '';
      const systemPrompt = this.buildSystemPrompt(terrainContext);

      const res = await fetchWithRetry({
        message: userMessage,
        systemPrompt: systemPrompt,
        conversationHistory: this.state.conversation,
      });

      clearT();
      this.messages.splice(waitIdx, 1);
      const data = await res.json();

      if (data.response) {
        this.state.conversation.push({ role: 'assistant', content: data.response });
        this.addMessage(data.response, 'bot');
        this.updateChatLead({ last_message: userMessage, last_response: data.response, conversation_length: this.state.conversation.length });
        this.saveConversation();

        const detectedDiag = this.extractDiagnosisFromResponse(data.response, userMessage);
        if (detectedDiag) {
          this.state.currentSymptom = userMessage;
          this.state.currentDiagnosis = detectedDiag;
          setTimeout(function() { self.proposeRecordDiagnosis(userMessage, detectedDiag); }, 2500);
        }

        if (this.shouldOfferContact(data.response)) {
          setTimeout(function() { self.offerContactButtons(); }, 1000);
        }
      } else {
        this.messages.splice(waitIdx, 1);
        this.addMessage('Desole, souci technique. Reessaie dans quelques instants.', 'bot');
      }
    } catch (err) {
      clearT();
      console.error('Chat error:', err.message);
      if (this.messages[waitIdx]) { this.messages[waitIdx].text = 'Le serveur ne repond pas. Reessaie dans 1 minute.'; this.renderMessages(); }
      const self2 = this;
      setTimeout(function() { self2.offerContactButtons(); }, 1200);
    } finally {
      this.setLoading(false);
    }
  }

  buildSystemPrompt(terrainContext) {
    terrainContext = terrainContext || '';
    return 'Tu es un expert automobile polyvalent pour ZENOCCAZ. Tu reponds differemment selon le TYPE de question.\n' + terrainContext + '\n\nREGLE ANTI-HALLUCINATION ABSOLUE :\nSi tu n\'es PAS CERTAIN a 100% d\'une information technique precise (numero de broche exact, valeur electrique, reference piece specifique) → dis-le : "Je ne suis pas certain de ce detail precis, verifie dans le manuel de ton vehicule ou sur un forum specialise (TechAuto, Autodata, forums marque).\nNe jamais inventer des numeros de broches, valeurs de tension ou references techniques non certaines.\n\nDETECTE D\'ABORD LE TYPE DE QUESTION :\n\nTYPE 1 — QUESTION DE CONNAISSANCE ("c\'est quoi", "a quoi sert", "comment fonctionne", "explique")\nReponds DIRECTEMENT avec ce que tu sais avec certitude. Si un detail est incertain, dis-le.\nFormat : explication directe structuree.\n\nTYPE 2 — DIAGNOSTIC DE PANNE ("ca marche pas", "bruit", "probleme", "voyant", "ne demarre pas")\nStructure OBLIGATOIRE :\n\n[RECHERCHE] Ce qu\'il faut verifier en premier\n\n**1) [Cause probable] — [explication courte]**\n- [detail concret]\n- [comment verifier gratuitement]\n- [resultat si positif]\n\n---\n\n**2) [Cause probable] — [explication courte]**\n- [detail concret]\n- [comment verifier gratuitement]\n\n---\n\n[BOUSSOLE] Pour avancer : j\'ai besoin d\'un detail\n→ [UNE SEULE question precise]\n\nTYPE 3 — ACHAT/VENTE : pose les questions necessaires\nTYPE 4 — CONSEIL URGENCE : donne un avis direct avec niveau d\'urgence\n\nREGLES :\n- TYPE 1 : jamais de verifications, juste l\'explication\n- TYPE 2 : toujours 2-3 causes avant de poser une question\n- Cardan = graisse soufflet, jamais huile\n- Triangle = rotules + silent-blocs, aucun liquide\n\nAPPRENTISSAGE : quand resolu, "C\'etait bien [diagnostic] ?" puis stop.';
  }

  async generateConversationTitle(userMessage) {
    try {
      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          systemPrompt: 'Genere UN titre de 3 a 6 mots en francais qui resume ce que dit le client. Ne fais AUCUNE supposition ou diagnostic. Resume uniquement ce que le client a dit. Reponds UNIQUEMENT avec le titre, sans guillemets.',
          conversationHistory: [{ role: 'user', content: userMessage }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.response) {
          const titre = data.response.trim().replace(/^["']|["']$/g, '').replace(/[.!?]$/, '');
          if (titre.length > 2 && titre.length < 60) {
            this.state.chatSubject = titre;
            console.log('Titre:', titre);
          }
        }
      }
    } catch (e) { console.warn('Titre auto echoue:', e.message); }
  }

  updateFuelTypeFromMessage(text) {
    const l = text.toLowerCase();
    if ((l.includes('diesel') || l.includes('gazole')) && this.state.vehicleInfo.fuelType !== 'diesel') this.state.vehicleInfo.fuelType = 'diesel';
    else if ((l.includes('essence') || l.includes('sp95')) && this.state.vehicleInfo.fuelType !== 'essence') this.state.vehicleInfo.fuelType = 'essence';
  }

  extractDiagnosisFromResponse(response, symptom) {
    if (!response) return null;
    const m1 = response.match(/PROBABLE\s*:\s*([^\n.!?]{5,60})/i);
    if (m1) return m1[1].trim();
    const m2 = response.match(/etait-ce bien\s+([^?]{5,60})\s+qui posait/i);
    if (m2) return m2[1].trim();
    return null;
  }

  async detectAndSaveClientFeedback(msg) {
    const patterns = [/c[''']etait\s+(?:finalement\s+)?(.+?)(?:[!.?]|$)/i, /ca\s+venait\s+de\s+(.+?)(?:[!.?]|$)/i];
    for (const p of patterns) {
      const m = msg.toLowerCase().match(p);
      if (m && m[1] && m[1].length > 2 && m[1].length < 100) {
        const diag = m[1].trim();
        let symptom = this.state.chatSubject || 'Probleme vehicule';
        for (let i = this.state.conversation.length - 2; i >= 0; i--) {
          if (this.state.conversation[i].role === 'user') { symptom = this.state.conversation[i].content; break; }
        }
        if (this.diagEngine) this.diagEngine.confirm(symptom, diag);
        this.saveDiagnosisFeedback(symptom, diag, this.state.vehicleInfo.fuelType);
        return;
      }
    }
  }

  proposeRecordDiagnosis(symptom, diagnosis) {
    this.state.currentSymptom = symptom;
    this.state.currentDiagnosis = diagnosis;
    const self = this;
    this.addButtons('Etait-ce bien "' + diagnosis + '" qui posait probleme ?', [
      { label: 'Oui, c\'etait ca !', value: 'yes_confirm' },
      { label: 'Non, autre chose', value: 'no_confirm' },
    ], function(value) {
      if (value === 'yes_confirm') {
        if (self.diagEngine) { self.diagEngine.confirm(symptom, diagnosis); }
        self.saveDiagnosisFeedback(symptom, diagnosis, self.state.vehicleInfo.fuelType);
      } else {
        if (self.diagEngine) self.diagEngine.reject(symptom, diagnosis);
        self.addMessage('Pas de souci ! Tu as trouve ce que c\'etait ?', 'bot');
        self.addButtons('Ou en es-tu ?', [
          { label: 'J\'ai trouve le probleme', value: 'found' },
          { label: 'Je cherche encore', value: 'still_searching' },
        ], function(choice) {
          if (choice === 'found') {
            self.askText('Super ! C\'etait quoi exactement ?', function(correction) {
              if (self.diagEngine) self.diagEngine.confirm(symptom, correction);
              self.saveDiagnosisFeedback(symptom, correction, self.state.vehicleInfo.fuelType);
            });
          } else {
            self.addButtons('On continue comment ?', [
              { label: 'Etape suivante', value: 'next_step' },
              { label: 'Envoyer une photo', value: 'send_photo' },
            ], function(next) {
              if (next === 'send_photo') {
                self.offerPhotoAnalysis(self.state.chatSubject || symptom);
              } else {
                self.addMessage('OK, passons a l\'etape suivante.', 'bot');
                self.handleAIChat('Toutes les verifications precedentes sont OK. Quelle est la prochaine etape a tester ?');
              }
            });
          }
        });
      }
    });
  }


  // ─────────────────────────────────────────────
  // MODE DIAGNOSTIC MECANO IA
  // ─────────────────────────────────────────────

  startDiagnosticMode() {
    this.state = {
      mode: 'diagnostic',
      step: 0,
      diagLevel: 1,
      answers: {},
      conversation: [],
      chatSubject: null,
      currentSymptom: null,
      currentDiagnosis: null,
      vehicleInfo: { brand: null, model: null, year: null, km: null, fuelType: null }
    };
    this.enableFullscreen();
    const self = this;

    this.addMessage('🔧 Mode Diagnostic activé. Je suis ton mécano IA.', 'bot');
    this.addMessage('Je vais te guider étape par étape, du plus simple au plus complexe. Suis bien les étapes — ça évite les fausses pistes et les dépenses inutiles.', 'bot');

    // Demander le véhicule en premier
    this.askText('Commence par me dire : quel véhicule tu as ? (marque, modèle, année et km)', async function(vehicleText) {
      self.parsVehicleInfo(vehicleText);
      self.state.chatSubject = vehicleText;

      // Charger le profil technique du véhicule depuis le serveur
      self.addMessage('Recherche du profil technique de ton véhicule...', 'bot');
      const waitProfile = self.messages.length - 1;
      try {
        const profileRes = await fetch(self.apiUrl.replace('/api/chat', '/api/vehicle-profile'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(self.state.vehicleInfo)
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.profile) {
            self.state.vehicleProfile = profileData.profile;
            const p = profileData.profile;
            let summary = '✅ Véhicule identifié !';
            if (p.injection) summary += ' · Injection: ' + p.injection;
            if (p.turbo) summary += ' · Turbo: ' + p.turbo;
            if (p.distribution) summary += ' · Distribution: ' + p.distribution;
            if (self.messages[waitProfile]) { self.messages[waitProfile].text = summary; self.renderMessages(); }
          } else {
            if (self.messages[waitProfile]) { self.messages[waitProfile].text = '✅ Véhicule noté — ' + vehicleText; self.renderMessages(); }
          }
        }
      } catch(e) {
        if (self.messages[waitProfile]) { self.messages[waitProfile].text = '✅ Véhicule noté — ' + vehicleText; self.renderMessages(); }
      }

      self.addMessage('Et quel est le problème exactement ? Décris-moi ce que tu constates.', 'bot');
      self.pendingTextHandler = function(symptom) {
        self.state.currentSymptom = symptom;
        self.state.conversation.push({ role: 'user', content: 'Véhicule: ' + vehicleText + '. Problème: ' + symptom });
        self.handleDiagnosticMessage(symptom, true);
      };
    });
  }

  parsVehicleInfo(text) {
    const t = text.toLowerCase();
    const brands = ['renault','peugeot','citroen','volkswagen','vw','audi','bmw','mercedes','ford','toyota','opel','nissan','fiat','seat','skoda','honda','hyundai','kia','dacia','volvo','mazda','mini','jeep','land rover','porsche','alfa romeo'];
    for (const b of brands) {
      if (t.includes(b)) { this.state.vehicleInfo.brand = b; break; }
    }
    const kmMatch = text.match(/(\d[\d\s]*)\s*(?:km|kilometres?)/i);
    if (kmMatch) this.state.vehicleInfo.km = kmMatch[1].replace(/\s/g,'');
    const yearMatch = text.match(/(19[89]\d|20[012]\d)/);
    if (yearMatch) this.state.vehicleInfo.year = yearMatch[1];
    if (t.includes('diesel') || t.includes('gazole')) this.state.vehicleInfo.fuelType = 'diesel';
    else if (t.includes('essence')) this.state.vehicleInfo.fuelType = 'essence';
    else if (t.includes('hybrid')) this.state.vehicleInfo.fuelType = 'hybride';
    else if (t.includes('electr')) this.state.vehicleInfo.fuelType = 'electrique';
  }

  async handleDiagnosticMessage(userMessage, isFirstSymptom) {
    if (!userMessage || !userMessage.trim()) return;
    if (this.isLoading) return;
    this.setLoading(true);

    if (!isFirstSymptom) {
      this.state.conversation.push({ role: 'user', content: userMessage });
      if (!this.state.chatSubject) {
        this.state.chatSubject = userMessage.substring(0, 50);
        this.generateConversationTitle(userMessage);
      }
      this.updateFuelTypeFromMessage(userMessage);
    }

    // Détecter montée de niveau
    const lowerMsg = userMessage.toLowerCase();
    const levelUpKeywords = ['ok c est bon', 'verifie', 'c est fait', 'rien a signaler', 'normal', 'pas de probleme', 'ok niveau', 'fait le test', 'j ai fait'];
    const shouldLevelUp = levelUpKeywords.some(k => lowerMsg.includes(k));
    if (shouldLevelUp && this.state.diagLevel < 3) {
      this.state.diagLevel++;
    }

    this.addDiagLevelIndicator();
    this.addMessage('Analyse en cours...', 'bot');
    const waitIdx = this.messages.length - 1;
    const upd = (t) => { if (this.messages[waitIdx]) { this.messages[waitIdx].text = t; this.renderMessages(); } };
    const t1 = setTimeout(() => upd('Connexion au serveur...'), 4000);
    const t2 = setTimeout(() => upd('Le serveur démarre...'), 12000);
    const clearT = () => { clearTimeout(t1); clearTimeout(t2); };

    try {
      const systemPrompt = this.buildDiagnosticSystemPrompt();
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 55000);
      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          systemPrompt: systemPrompt,
          conversationHistory: this.state.conversation,
          vehicleInfo: this.state.vehicleInfo,
          diagMode: true,
        }),
        signal: ctrl.signal
      });
      clearTimeout(tid);
      clearT();
      this.messages.splice(waitIdx, 1);

      if (res.ok) {
        const data = await res.json();
        if (data.response) {
          this.state.conversation.push({ role: 'assistant', content: data.response });
          this.addMessage(data.response, 'bot');
          this.saveConversation();
          this.updateChatLead({ last_message: userMessage, last_response: data.response });

          // Détecter si résolution trouvée
          const isResolved = data.response.toLowerCase().includes('c\'etait bien') ||
                             data.response.toLowerCase().includes('probleme resolu') ||
                             data.response.toLowerCase().includes('cause identifiee');
          if (isResolved) {
            this.state.diagLevel = 1;
          }

          // Proposer étape suivante ou photo
          const self = this;
          if (data.response.toLowerCase().includes('niveau 3') || this.state.diagLevel === 3) {
            setTimeout(() => {
              self.addButtons('On est au niveau avancé. Tu veux :', [
                { label: '📸 Envoyer une photo', value: 'photo' },
                { label: '🔧 ZenScan — diagnostic pro', value: 'zenscan' },
                { label: 'Continuer le diagnostic', value: 'continue' },
              ], (v) => {
                if (v === 'photo') self.offerPhotoAnalysis(self.state.currentSymptom);
                else if (v === 'zenscan') {
                  self.addMessage('Le ZenScan c\'est notre diagnostic électronique professionnel sur place. On branche l\'outil, on lit tous les défauts, on te donne un rapport complet.', 'bot');
                  self.offerContact();
                }
                else self.setDiagnosticInput();
              });
            }, 1500);
          } else {
            self.setDiagnosticInput();
          }
        }
      } else {
        this.messages.splice(waitIdx, 1);
        this.addMessage('Souci technique, réessaie.', 'bot');
      }
    } catch (err) {
      clearT();
      if (this.messages[waitIdx]) { this.messages[waitIdx].text = 'Serveur injoignable. Réessaie dans 1 min.'; this.renderMessages(); }
    } finally {
      this.setLoading(false);
    }
  }

  setDiagnosticInput() {
    // Rebrancher le handler texte pour continuer le diagnostic
    const self = this;
    this.pendingTextHandler = function(msg) {
      self.handleDiagnosticMessage(msg, false);
    };
  }


  addReduceButton() {
    // Retirer un éventuel bouton existant
    const existing = document.getElementById('diag-reduce-btn');
    if (existing) existing.remove();

    const btn = document.createElement('button');
    btn.id = 'diag-reduce-btn';
    btn.innerHTML = '⊡ Réduire la fenêtre';
    btn.style.cssText = [
      'position:absolute', 'top:10px', 'right:50px',
      'padding:5px 12px', 'border-radius:8px',
      'background:rgba(255,255,255,0.08)',
      'border:1px solid rgba(255,255,255,0.15)',
      'color:rgba(255,255,255,0.6)', 'font-size:11px',
      'font-weight:600', 'cursor:pointer', 'font-family:inherit',
      'transition:all .2s', 'z-index:10'
    ].join(';');
    btn.onmouseenter = () => { btn.style.background = 'rgba(255,255,255,0.15)'; btn.style.color = '#fff'; };
    btn.onmouseleave = () => { btn.style.background = 'rgba(255,255,255,0.08)'; btn.style.color = 'rgba(255,255,255,0.6)'; };
    btn.onclick = () => {
      this.disableFullscreen();
      btn.remove();
      // Ajouter bouton pour re-agrandir
      this.addExpandButton();
    };

    const chatBox = document.getElementById('chat-box');
    if (chatBox) {
      chatBox.style.position = 'relative';
      chatBox.appendChild(btn);
    }
  }

  addExpandButton() {
    const existing = document.getElementById('diag-expand-btn');
    if (existing) existing.remove();

    const btn = document.createElement('button');
    btn.id = 'diag-expand-btn';
    btn.innerHTML = '⛶ Plein écran';
    btn.style.cssText = [
      'position:absolute', 'top:10px', 'right:50px',
      'padding:5px 12px', 'border-radius:8px',
      'background:rgba(16,185,129,0.15)',
      'border:1px solid rgba(16,185,129,0.3)',
      'color:#10b981', 'font-size:11px',
      'font-weight:600', 'cursor:pointer', 'font-family:inherit',
      'transition:all .2s', 'z-index:10'
    ].join(';');
    btn.onmouseenter = () => { btn.style.background = 'rgba(16,185,129,0.25)'; };
    btn.onmouseleave = () => { btn.style.background = 'rgba(16,185,129,0.15)'; };
    btn.onclick = () => {
      this.enableFullscreen();
      btn.remove();
      this.addReduceButton();
    };

    const chatBox = document.getElementById('chat-box');
    if (chatBox) chatBox.appendChild(btn);
  }

  addDiagLevelIndicator() {
    const level = this.state.diagLevel || 1;
    const labels = ['', '🟢 Niveau 1 — Vérifications simples', '🟡 Niveau 2 — Contrôles accessibles', '🔴 Niveau 3 — Diagnostic avancé'];
    const colors = ['', 'rgba(16,185,129,0.15)', 'rgba(245,158,11,0.15)', 'rgba(239,68,68,0.15)'];
    const borderColors = ['', '#10b981', '#f59e0b', '#ef4444'];

    const indicator = document.createElement('div');
    indicator.style.cssText = [
      'display:flex', 'align-items:center', 'gap:8px',
      'padding:7px 14px', 'border-radius:10px', 'margin:6px 0',
      'background:' + colors[level],
      'border:1px solid ' + borderColors[level],
      'font-size:12px', 'font-weight:700', 'color:' + borderColors[level],
      'font-family:inherit', 'letter-spacing:.3px'
    ].join(';');
    indicator.textContent = labels[level];
    if (this.chatMessages) { this.chatMessages.appendChild(indicator); this.chatMessages.scrollTop = this.chatMessages.scrollHeight; }
  }

  buildDiagnosticSystemPrompt() {
    const v = this.state.vehicleInfo;
    const p = this.state.vehicleProfile || {};
    const vehicleContext = [
      v.brand ? 'Marque: ' + v.brand : '',
      v.model ? 'Modèle: ' + v.model : '',
      v.year  ? 'Année: ' + v.year   : '',
      v.km    ? 'Km: ' + v.km        : '',
      v.fuelType ? 'Carburant: ' + v.fuelType : '',
      v.engine ? 'Moteur: ' + v.engine : '',
      p.injection ? 'Système injection: ' + p.injection : '',
      p.turbo ? 'Turbo: ' + p.turbo : '',
      p.distribution ? 'Distribution: ' + p.distribution : '',
      p.points_faibles && p.points_faibles.length ? 'Points faibles connus: ' + p.points_faibles.join(', ') : '',
      p.pieces_surveillance && p.pieces_surveillance.length ? 'Pièces à surveiller: ' + p.pieces_surveillance.join(', ') : '',
    ].filter(Boolean).join('\n');

    const level = this.state.diagLevel || 1;
    const levelInstructions = level === 1
      ? 'Tu es au NIVEAU 1. Propose UNIQUEMENT des vérifications sans outil, sans démontage : niveaux liquides, fusibles, connexions, voyants, bruits caractéristiques, comportement à froid/chaud. Maximum 2-3 vérifications par réponse.'
      : level === 2
      ? 'Tu es au NIVEAU 2. Les vérifications simples sont OK. Propose des contrôles accessibles avec outillage basique : multimètre, pince ampèremétrique, pressions, capteurs accessibles. Explique comment faire concrètement.'
      : 'Tu es au NIVEAU 3. Les contrôles basiques sont OK. Aborde les diagnostics avancés : injection, calculateur, distribution, mécanique interne. Sois précis sur les symptômes distinctifs. Recommande un ZenScan si nécessaire.';

    return `Tu es Marco, mécanicien-ingénieur automobile avec 25 ans de terrain. Tu penses à voix haute, tu raisonnes en direct avec le client, comme si vous étiez tous les deux sous le capot.

${vehicleContext ? '🚗 Véhicule: ' + vehicleContext : ''}

TON STYLE — CE QUI TE DIFFÉRENCIE D'UN CHATBOT LAMBDA :
Tu ne proposes pas juste des tests. Tu RÉFLÉCHIS à voix haute. Tu dis ce que TU penses vraiment.
Exemple : "Attends, si la pompe tourne mais t'as pas de débit, l'impeller peut tourner dans le vide — ça arrive souvent sur ce type de pompe quand la turbine se désolidarise de l'axe. Avant de changer la pompe, vérifie..."
Tu anticipes les pièges, tu parles des cas que tu as déjà vus, tu donnes ton avis personnel sur ce qui est probable.

COMMENT TU FONCTIONNES :
1. **Tu analyses d'abord** ce qui s'est passé mécaniquement/électriquement — cause à effet, physique du problème.
2. **Tu classes par probabilité** — la cause la plus probable d'abord, toujours. Jamais les fusibles avant l'ampoule si c'est une ampoule qui a claké.
3. **Tu anticipes les pièges** — "attention, même si X fonctionne, ça ne veut pas dire que Y est bon car..."
4. **Tu ne laisses rien de côté** — si une pièce peut être HS même en tournant, tu le dis.
5. **Maximum 2 vérifications** par réponse, pas plus. On avance pas à pas.
6. **Une seule question** à la fin pour avancer.

FORMAT DE RÉPONSE :
→ D'abord ton analyse : ce qui s'est probablement passé, pourquoi, le mécanisme physique.
→ Ensuite 1-2 vérifications concrètes classées par probabilité.
→ Pour chaque vérification :
  **🔍 [Ce qu'on vérifie] — [Pourquoi c'est la cause la plus probable]**
  → Geste concret : [1 phrase précise]
  → Si c'est ça : [ce que tu verras/mesureras]
  → Piège à éviter : [ce qui peut induire en erreur]
→ Termine par UNE question précise.

RÈGLES NON NÉGOCIABLES :
- ANTI-HALLUCINATION ABSOLUE : si tu n'es pas certain à 100% d'un détail technique précis, tu dis "je ne suis pas certain, vérifie dans la doc ou sur un forum spécialisé". Tu ne combles JAMAIS un vide de connaissance par une approximation.
- Tu ne sautes jamais une étape même si le client pense connaître la cause.
- Tu parles vrai : "j'ai vu ça des dizaines de fois", "méfie-toi de...", "c'est con mais vérifie d'abord..."
- Ton niveau de détail technique s'adapte au client.
- ${levelInstructions}

CONNAISSANCES TECHNIQUES SPÉCIFIQUES — POMPES INJECTION DIESEL :
VP37/VP44 (pompes rotatives Bosch) : L'amorçage se fait par DÉPRESSION, pas par remplissage. Il n'y a pas de réservoir interne à remplir. Procédure correcte : 1) Remplir le filtre à gasoil (c'est lui qui alimente la pompe). 2) Desserrer légèrement les tuyaux HP pour purger l'air. 3) Amorçage par dépression : poire d'amorçage sur le circuit basse pression OU tours de démarreur répétés. 4) L'électrovanne sur la VP37 est une vanne ON/OFF, pas une pompe — ne pas confondre. Sans purge de l'air dans les HP, le moteur ne démarrera jamais même si la pompe est bonne.

PRINCIPE GÉNÉRAL DIESEL : Un diesel qui ne démarre pas après remplacement de pompe = air dans le circuit haute pression. Toujours purger les HP avant de conclure que la pompe est défectueuse.`;
  }

  startSellFlow() {
    this.state = { mode: 'sell', step: 0, answers: {}, conversation: [], chatSubject: null, vehicleInfo: { brand: null, model: null, year: null, fuelType: null } };
    const self = this;
    this.askText('Quel est le modele et l\'annee du vehicule ?', function(text) {
      self.state.answers.model = text; self.updateChatLead(self.state.answers);
      self.askText('Quel est le kilometrage approximatif ?', function(km) {
        self.state.answers.km = km; self.updateChatLead(self.state.answers);
        self.addButtons('Quel est l\'etat general ?', [
          { label: 'Tres bon', value: 'tres_bon' }, { label: 'Bon', value: 'bon' },
          { label: 'Moyen', value: 'moyen' }, { label: 'A revoir', value: 'a_revoir' },
        ], function(value, label) {
          self.state.answers.etat = label; self.updateChatLead(self.state.answers);
          self.askText('Ou se trouve le vehicule ?', function(lieu) {
            self.state.answers.lieu = lieu; self.updateChatLead(self.state.answers);
            self.addButtons('Tu veux vendre rapidement ?', [
              { label: 'Vendre rapidement', value: 'rapide' }, { label: 'Pas presse', value: 'pas_presse' },
            ], function(speed, speedLabel) {
              self.state.answers.urgence = speedLabel; self.updateChatLead(self.state.answers);
              self.addMessage('Je peux te donner une estimation. Tu veux qu\'on avance ?', 'bot');
              self.addButtons('Choisis :', [
                { label: 'Oui, je veux une estimation', value: 'estimation' },
                { label: 'Comment ca marche ?', value: 'how' },
              ], function(choice) {
                if (choice === 'estimation') self.addMessage('Tu peux m\'envoyer des photos, ca m\'aidera !', 'bot');
                else self.addMessage('ZenOccaz gere estimation, annonces, visites et demarches.', 'bot');
                self.offerContact();
              });
            });
          });
        });
      });
    });
  }

  startBuyFlow() {
    this.state = { mode: 'buy', step: 0, answers: {}, conversation: [], chatSubject: null, vehicleInfo: { brand: null, model: null, year: null, fuelType: null } };
    const self = this;
    this.askText('Quel type de vehicule tu cherches ?', function(text) {
      self.state.answers.type = text; self.updateChatLead(self.state.answers);
      self.askText('Quel budget ?', function(budget) {
        self.state.answers.budget = budget; self.updateChatLead(self.state.answers);
        self.askText('Kilometrage maximum ?', function(km) {
          self.state.answers.km = km; self.updateChatLead(self.state.answers);
          self.askText('Options importantes ?', function(options) {
            self.state.answers.options = options; self.updateChatLead(self.state.answers);
            self.addButtons('Tu veux acheter rapidement ?', [
              { label: 'Acheter rapidement', value: 'rapide' }, { label: 'J\'ai le temps', value: 'temps' },
            ], function(value, label) {
              self.state.answers.urgence = label;
              self.addMessage('Je peux te proposer une recherche et t\'eviter les arnaques. On y va ?', 'bot');
              self.addButtons('Choisis :', [
                { label: 'Oui, aide-moi', value: 'help' }, { label: 'Comment ca marche ?', value: 'how' },
              ], function(choice) {
                if (choice !== 'help') self.addMessage('On selectionne, verifie l\'historique et securise.', 'bot');
                self.offerContact();
              });
            });
          });
        });
      });
    });
  }

  shouldOfferContact(r) {
    const l = r.toLowerCase();
    return l.includes('rappelle') || l.includes('ludo') || l.includes('coordonnees');
  }

  offerContactButtons() {
    const self = this;
    this.addButtons('Tu veux qu\'on te recontacte ?', [
      { label: 'Oui, rappelle-moi', value: 'yes' }, { label: 'Non, continuer', value: 'no' },
    ], function(v) {
      if (v === 'yes') self.offerContact();
      else self.addMessage('Pas de souci ! Continue a me poser tes questions.', 'bot');
    });
  }

  offerContact() {
    const self = this;
    this.addMessage('Tu veux qu\'on passe a l\'action ?', 'bot');
    this.addButtons('Choisis :', [
      { label: 'Prendre un rendez-vous', value: 'rdv' },
      { label: 'Etre rappele', value: 'callback' },
      { label: 'Laisser mon email', value: 'email' },
    ], function(value) {
      self.updateChatLead({ contact_choice: value });
      if (value === 'email') {
        self.askText('Ok, donne ton email.', function(email) { self.updateChatLead({ email: email }); self.addMessage('Merci. L\'equipe revient rapidement.', 'bot'); });
        return;
      }
      if (value === 'callback') {
        self.askText('Ton nom ?', function(nom) {
          self.updateChatLead({ callback_nom: nom });
          self.askText('Ton numero ?', function(tel) {
            self.updateChatLead({ callback_tel: tel });
            self.askText('Quel creneau ? (ex: lundi matin)', function(date) {
              self.updateChatLead({ callback_date: date });
              self.addMessage('Parfait ' + nom + ', on te rappelle au ' + tel + ' (' + date + '). A bientot !', 'bot');
            });
          });
        });
        return;
      }
      self.askText('Ton nom et creneau prefere ?', function(text) { self.updateChatLead({ rdv_info: text }); self.addMessage('C\'est note. On confirme vite le rendez-vous.', 'bot'); });
    });
  }

  offerPhotoAnalysis(context) {
    context = context || '';
    const self = this;
    this.addMessage('Je peux analyser une photo. Envoie une photo de la zone concernee.', 'bot');
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.style.display = 'none';
    document.body.appendChild(input);
    this.addButtons('Tu veux envoyer une photo ?', [
      { label: 'Envoyer une photo', value: 'send_photo' }, { label: 'Non merci', value: 'no_photo' },
    ], function(value) {
      if (value === 'no_photo') { document.body.removeChild(input); self.offerContact(); return; }
      input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        document.body.removeChild(input);
        self.addMessage('Photo envoyee : ' + file.name, 'user');
        self.analyzePhoto(file, context);
      };
      input.click();
    });
  }

  compressImage(file, maxSize, quality) {
    maxSize = maxSize || 800; quality = quality || 0.7;
    return new Promise(function(resolve, reject) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else { w = Math.round(w * maxSize / h); h = maxSize; }
          }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve({ base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' });
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async analyzePhoto(file, context) {
    context = context || '';
    this.setLoading(true);
    this.addMessage('Analyse en cours...', 'bot');
    const waitIdx = this.messages.length - 1;
    try {
      const compressed = await this.compressImage(file, 800, 0.7);
      const res = await fetch(this.apiPhotoUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base64: compressed.base64, mediaType: compressed.mediaType, context: context }) });
      this.messages.splice(waitIdx, 1);
      if (res.ok) {
        const data = await res.json();
        if (data.response) { this.addMessage(data.response, 'bot'); if (this.state.conversation) this.state.conversation.push({ role: 'assistant', content: data.response }); }
      } else {
        this.addMessage('Je n\'ai pas pu analyser la photo. Decris-moi ce que tu vois.', 'bot');
      }
    } catch (e) {
      if (this.messages[waitIdx]) { this.messages[waitIdx].text = 'Erreur analyse.'; this.renderMessages(); }
    } finally {
      this.setLoading(false);
    }
  }

  createSessionId() {
    return (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : 'sess_' + Date.now() + '_' + Math.random().toString(16).slice(2, 10);
  }

  getSupabaseClient() { return window.supabase || (window.supabaseClient && window.supabaseClient.supabase) || null; }

  async saveConversation() {
    if (!this.connectedClient || !this.state.conversation || !this.state.conversation.length) return;
    const sb = this.getSupabaseClient();
    if (!sb) return;
    try {
      await sb.from('conversations').upsert([{
        client_id: this.connectedClient.id, session_id: this.sessionId,
        messages: this.state.conversation, sujet: this.state.chatSubject || 'Conversation IA',
        updated_at: new Date().toISOString()
      }], { onConflict: 'session_id' });
    } catch (e) { console.error('saveConversation:', e); }
  }

  async loadAllConversations() {
    if (!this.connectedClient) return [];
    const sb = this.getSupabaseClient();
    if (!sb) return [];
    try {
      const result = await sb.from('conversations').select('*').eq('client_id', this.connectedClient.id).order('updated_at', { ascending: false }).limit(5);
      return (result.data || []).filter(function(c) { return c.messages && c.messages.length > 0; });
    } catch (e) { return []; }
  }

  resumeConversation(conv) {
    this.state.mode = 'ai_chat';
    this.state.conversation = conv.messages;
    this.state.chatSubject = conv.sujet;
    this.sessionId = conv.session_id;
    this.state.vehicleInfo = { brand: null, model: null, year: null, fuelType: null };
    this.enableFullscreen();
    this.messages = [];
    conv.messages.slice(-4).forEach(function(m) { this.addMessage(m.content, m.role === 'user' ? 'user' : 'bot'); }.bind(this));
    this.addMessage('Conversation reprise ! Continue ou tu t\'etais arrete.', 'bot');
  }

  async offerResumeConversation() {
    const convs = await this.loadAllConversations();
    if (!convs.length) return false;
    const self = this;
    if (convs.length === 1) {
      const conv = convs[0];
      const date = new Date(conv.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
      this.addButtons('Tu as une conversation du ' + date + ' sur "' + conv.sujet + '". La reprendre ?', [
        { label: 'Reprendre', value: 'resume_0' }, { label: 'Nouvelle conversation', value: 'new' },
      ], function(value) {
        if (value === 'resume_0') self.resumeConversation(conv);
        else self.showMainChoices();
      });
    } else {
      this.addMessage('Tu as plusieurs conversations. Laquelle veux-tu reprendre ?', 'bot');
      const options = convs.map(function(conv, i) {
        const date = new Date(conv.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        const label = date + ' — ' + (conv.sujet || 'Discussion').substring(0, 35);
        return { label: label, value: 'resume_' + i };
      });
      options.push({ label: 'Nouvelle conversation', value: 'new' });
      this.addButtons('Choisis :', options, function(value) {
        if (value === 'new') { self.showMainChoices(); return; }
        const idx = parseInt(value.replace('resume_', ''));
        if (!isNaN(idx) && convs[idx]) self.resumeConversation(convs[idx]);
      });
    }
    return true;
  }

  async logChatChoice(choice) {
    const sb = this.getSupabaseClient();
    if (!sb) { this.pendingLeadChoice = choice; this.scheduleSupabaseRetry(); return; }
    try { await sb.from('chat_leads').insert([{ id: Date.now(), session_id: this.sessionId, choice: choice, payload: Object.assign({}, this.state.answers) }]); } catch (e) {}
  }

  async updateChatLead(extra) {
    const sb = this.getSupabaseClient();
    if (!sb) { this.pendingLeadPayload = Object.assign({}, this.state.answers, extra); this.scheduleSupabaseRetry(); return; }
    try {
      const payload = Object.assign({}, this.state.answers, extra);
      this.state.answers = payload;
      const result = await sb.from('chat_leads').update({ payload: payload }).eq('session_id', this.sessionId);
      if (!result.error && result.count === 0) {
        await sb.from('chat_leads').insert([{ id: Date.now(), session_id: this.sessionId, choice: this.state.mode || 'chat', payload: payload }]);
      }
    } catch (e) {}
  }

  async saveDiagnosisFeedback(symptom, diagnosis, fuelType) {
    if (!symptom || !diagnosis) return;
    try {
      const res = await fetch(this.apiSaveDiagnosisUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ symptom: symptom, diagnosis: diagnosis, fuelType: fuelType || null, vehicleInfo: this.state.vehicleInfo }) });
      if (res.ok) this.addMessage('Diagnostic note pour aider les prochains clients.', 'bot');
    } catch (e) {}
  }

  setLoading(isLoading) {
    this.isLoading = isLoading;
    if (this.chatSend) { this.chatSend.disabled = isLoading; this.chatSend.textContent = isLoading ? '...' : '➤'; }
    if (this.chatInput) this.chatInput.disabled = isLoading;
    const photoBtn = document.getElementById('chat-photo-btn');
    if (photoBtn) photoBtn.disabled = isLoading;
  }

  scheduleSupabaseRetry() {
    if (this.supabaseRetryTimer) return;
    const self = this;
    this.supabaseRetryTimer = setInterval(function() {
      const sb = self.getSupabaseClient();
      if (!sb) return;
      clearInterval(self.supabaseRetryTimer);
      self.supabaseRetryTimer = null;
      if (self.pendingLeadChoice) { const c = self.pendingLeadChoice; self.pendingLeadChoice = null; self.logChatChoice(c); }
      if (self.pendingLeadPayload) { const p = self.pendingLeadPayload; self.pendingLeadPayload = null; self.updateChatLead(p); }
    }, 1000);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  window.chatBotInstance = new ChatBot();
});