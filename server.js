/**
 * Chatbot Widget - ZENOCCAZ
 * v2.0 — Avec moteur de diagnostic évolutif intégré
 * 
 * NOUVEAUTÉS:
 * - DiagnosticEngine injecte les diagnostics terrain dans le prompt Claude
 * - Apprentissage local (localStorage) + distant (serveur)
 * - Score de confiance évolutif par retours clients
 * - Détection automatique du carburant pour affiner les suggestions
 */

class ChatBot {
  constructor() {
    this.messages = [];
    this.isOpen = false;
    this.isLoading = false;

    const apiBaseUrl = this.detectApiBaseUrl();
    this.apiUrl = `${apiBaseUrl}/api/chat`;
    this.apiSaveDiagnosisUrl = `${apiBaseUrl}/api/save-diagnosis`;

    this.pendingTextHandler = null;
    this.pendingButtonsHandler = null;
    this.sessionId = this.createSessionId();
    this.pendingLeadChoice = null;
    this.pendingLeadPayload = null;
    this.supabaseRetryTimer = null;

    this.state = {
      mode: null,
      step: 0,
      answers: {},
      currentSymptom: null,
      currentDiagnosis: null,
      vehicleInfo: { brand: null, model: null, year: null, fuelType: null }
    };

    // Récupérer le client connecté si disponible
    this.currentClient = this.getConnectedClient();
    this.conversationId = null; // ID de la conversation en cours dans Supabase
    if (this.currentClient) {
      console.log(`👤 Client connecté: ${this.currentClient.name} (id: ${this.currentClient.id})`);
    }

    // Récupérer le client connecté si disponible
    try {
      const stored = localStorage.getItem('clientData');
      this.clientData = stored ? JSON.parse(stored) : null;
      if (this.clientData) {
        console.log('👤 Client connecté:', this.clientData.name, '— conversations sauvegardées');
      }
    } catch(e) {
      this.clientData = null;
    }

    this.conversationId = null; // ID Supabase de la conversation en cours

    // Récupérer le client connecté depuis localStorage
    this.connectedClient = this.getConnectedClient();
    if (this.connectedClient) {
      console.log(`👤 Client connecté: ${this.connectedClient.name} (${this.connectedClient.email})`);
    }

    // ✅ NOUVEAU : Initialiser le moteur de diagnostic évolutif
    if (window.DiagnosticEngine) {
      this.diagEngine = new window.DiagnosticEngine();
      const stats = this.diagEngine.getStats();
      console.log(`🧠 DiagnosticEngine v3 prêt: ${stats.symptomsCatalogued} symptômes, ${stats.totalConfirmations} confirmations terrain`);
    } else {
      console.warn('⚠️ DiagnosticEngine non chargé. Charger diagnostic-engine.js avant chatbot.js');
      this.diagEngine = null;
    }

    // Récupérer le client connecté depuis localStorage
    this.currentClient = this.getConnectedClient();
    this.currentConversationId = null;
    this.saveTimer = null;

    this.init();
  }

  detectApiBaseUrl() {
    console.log('🌐 API URL: https://zenoccaz.onrender.com');
    return 'https://zenoccaz.onrender.com';
  }

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.resetConversation();
    this.watchLoginState();
  }

  // Surveille connexion/déconnexion via événements custom + polling localStorage
  watchLoginState() {
    // Écouter l'événement de connexion (déclenché par client-account.html)
    window.addEventListener('clientLogin', (e) => {
      const clientData = e.detail;
      console.log('👤 Connexion détectée via event:', clientData.name);
      this.connectedClient = clientData;
      this.resetChatState();
      this.startFlow();
    });

    // Écouter l'événement de déconnexion
    window.addEventListener('clientLogout', () => {
      console.log('👤 Déconnexion détectée');
      this.connectedClient = null;
      this.resetChatState();
      this.startFlow();
    });

    // Polling de secours toutes les 2s (si modal sur autre page)
    let lastClientId = this.connectedClient?.id || null;
    setInterval(() => {
      const current = this.getConnectedClient();
      const currentId = current?.id || null;
      if (currentId !== lastClientId) {
        lastClientId = currentId;
        this.connectedClient = current;
        this.resetChatState();
        this.startFlow();
        console.log('👤 Changement connexion détecté (polling):', currentId ? current.name : 'déconnecté');
      }
    }, 2000);
  }

  resetChatState() {
    this.messages = [];
    this.pendingTextHandler = null;
    this.pendingButtonsHandler = null;
    this.state = { mode: null, step: 0, answers: {}, vehicleInfo: { brand: null, model: null, year: null, fuelType: null } };
    this.renderMessages();
  }

  cacheDOM() {
    this.chatWidget = document.getElementById('chat-widget');
    this.chatBtn = document.getElementById('chat-toggle-btn');
    this.chatBox = document.getElementById('chat-box');
    this.chatMessages = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    this.chatSend = document.getElementById('chat-send-btn');
    this.chatClose = document.getElementById('chat-close-btn');
    // Injecter le bouton photo dynamiquement à côté du bouton envoyer
    this.injectPhotoButton();
  }

  injectPhotoButton() {
    // Éviter les doublons
    if (document.getElementById('chat-photo-btn')) return;

    const sendBtn = document.getElementById('chat-send-btn');
    if (!sendBtn) return;

    // Créer le bouton photo
    const photoBtn = document.createElement('button');
    photoBtn.id = 'chat-photo-btn';
    photoBtn.title = 'Envoyer une photo pour analyse';
    photoBtn.innerHTML = '📷';
    photoBtn.style.cssText = `
      background: #2a9d8f;
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      font-size: 18px;
      cursor: pointer;
      margin-right: 6px;
      transition: background 0.2s;
      flex-shrink: 0;
    `;
    photoBtn.addEventListener('mouseenter', () => photoBtn.style.background = '#21867a');
    photoBtn.addEventListener('mouseleave', () => photoBtn.style.background = '#2a9d8f');

    // Input file caché
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.id = 'chat-photo-input';
    document.body.appendChild(fileInput);

    photoBtn.addEventListener('click', () => {
      if (this.state.mode !== 'ai_chat') {
        this.addMessage("Lance d'abord une discussion avec l'IA pour envoyer une photo.", "bot");
        return;
      }
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      fileInput.value = ''; // Reset pour permettre le même fichier
      this.addMessage('📷 Photo envoyée : ' + file.name, 'user');
      this.analyzePhoto(file, this.state.chatSubject || '');
    });

    // Insérer AVANT le bouton envoyer
    sendBtn.parentNode.insertBefore(photoBtn, sendBtn);
    this.chatPhoto = photoBtn;
  }

  bindEvents() {
    if (this.chatBtn) this.chatBtn.addEventListener('click', () => this.toggle());
    if (this.chatClose) this.chatClose.addEventListener('click', () => this.close());
    if (this.chatSend) this.chatSend.addEventListener('click', () => this.sendMessage());
    if (this.chatInput) {
      this.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }
    if (this.chatMessages) {
      this.chatMessages.addEventListener('click', (e) => {
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
  }

  toggle() { this.isOpen ? this.close() : this.open(); }

  open() {
    this.isOpen = true;
    if (this.chatWidget) this.chatWidget.classList.remove('closed');
    if (this.chatInput) setTimeout(() => this.chatInput.focus(), 100);
  }

  close() {
    this.isOpen = false;
    if (this.chatWidget) this.chatWidget.classList.add('closed');
  }

  addMessage(text, sender = 'user', meta = {}) {
    const msg = { text, sender, timestamp: new Date(), ...meta };
    this.messages.push(msg);
    this.renderMessages();
  }

  renderMessages() {
    if (!this.chatMessages) return;

    this.chatMessages.innerHTML = this.messages
      .map((msg) => {
        const bubble = `<div class="chat-bubble">${this.escapeHTML(msg.text)}</div>`;
        const buttons = msg.type === 'buttons' && Array.isArray(msg.options)
          ? `<div class="chat-buttons">
              ${msg.options.map((opt) => `
                <button class="chat-option" data-chat-value="${this.escapeHTML(opt.value)}" data-chat-label="${this.escapeHTML(opt.label)}">${this.escapeHTML(opt.label)}</button>
              `).join('')}
            </div>`
          : '';
        return `<div class="chat-message ${msg.sender}">${bubble}${buttons}</div>`;
      })
      .join('');

    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  async sendMessage() {
    const text = this.chatInput?.value.trim();
    if (!text) return;

    this.addMessage(text, 'user');
    if (this.chatInput) this.chatInput.value = '';

    if (this.pendingTextHandler) {
      const handler = this.pendingTextHandler;
      this.pendingTextHandler = null;
      handler(text);
      return;
    }

    if (this.state.mode === 'ai_chat') {
      return this.handleAIChat(text);
    }

    this.addMessage('Choisis une option pour commencer.', 'bot');
    this.showMainChoices();
  }

  resetConversation() {
    this.messages = [];
    this.renderMessages();
    this.startFlow();
  }

  escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  startFlow() {
    if (this.connectedClient) {
      // Client connecté : proposer de reprendre
      this.addMessage(
        `Salut ${this.connectedClient.name} ! Je suis l'assistant ZenOccaz. Comment puis-je t'aider ?`,
        'bot'
      );
      this.offerResumeConversation().then(hasConv => {
        if (!hasConv) this.showMainChoices();
      });
    } else {
      this.addMessage(
        `Salut, je suis l'assistant ZenOccaz. Comment puis-je t'aider aujourd'hui ?`,
        'bot'
      );
      this.showMainChoices();
    }
  }

  showMainChoices() {
    this.addButtons(
      'Choisis une option :',
      [
        { label: 'Discuter avec l\'IA', value: 'ai_chat' },
        { label: 'Vendre un véhicule (rapide)', value: 'sell' },
        { label: 'Acheter un véhicule (rapide)', value: 'buy' },
      ],
      (value) => {
        this.logChatChoice(value);
        if (value === 'ai_chat') return this.startAIChatMode();
        if (value === 'sell') return this.startSellFlow();
        if (value === 'buy') return this.startBuyFlow();
      }
    );
  }

  addButtons(text, options, handler) {
    this.pendingButtonsHandler = handler;
    this.addMessage(text, 'bot', { type: 'buttons', options });
  }

  askText(question, handler) {
    this.pendingTextHandler = handler;
    this.addMessage(question, 'bot');
  }

  // ─────────────────────────────────────────────────────────
  // MODE IA — Cœur du chatbot
  // ─────────────────────────────────────────────────────────

  startAIChatMode() {
    this.state = { mode: 'ai_chat', step: 0, answers: {}, conversation: [], vehicleInfo: { brand: null, model: null, year: null, fuelType: null } };

    // Vérifier si un client est connecté et charger sa dernière conversation
    const clientData = this.getConnectedClient();
    if (clientData) {
      this.addMessage(`Bonjour ${clientData.name} ! Je recherche votre dernière conversation... 🔍`, 'bot');
      this.loadLastConversation(clientData.id);
    } else {
      this.addMessage(
        `Parfait ! Pose-moi toutes tes questions sur les véhicules, l'achat, la vente, ou n'importe quoi d'autre. Je suis là pour t'aider ! 🚗`,
        'bot'
      );
    }
  }

  // Récupère le client connecté depuis localStorage
  getConnectedClient() {
    try {
      const raw = localStorage.getItem('clientData');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // Charge la dernière conversation du client depuis Supabase
  async loadLastConversation(clientId) {
    const client = this.getSupabaseClient();
    if (!client) {
      this.addMessage(`Parfait ! Pose-moi toutes tes questions. Je suis là pour t'aider ! 🚗`, 'bot');
      return;
    }

    try {
      const { data, error } = await client
        .from('conversations')
        .select('*')
        .eq('client_id', clientId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        // Pas de conversation précédente
        this.addMessage(`Parfait ! Pose-moi toutes tes questions sur les véhicules. Je suis là pour t'aider ! 🚗`, 'bot');
        return;
      }

      const messages = data.messages || [];
      const daysSince = Math.floor((Date.now() - new Date(data.updated_at)) / (1000 * 60 * 60 * 24));
      const when = daysSince === 0 ? "aujourd'hui" : daysSince === 1 ? "hier" : `il y a ${daysSince} jours`;

      this.addMessage(`J'ai retrouvé votre dernière conversation (${when}) sur : "${data.sujet || 'votre véhicule'}". Vous souhaitez continuer ou démarrer un nouveau sujet ?`, 'bot');

      this.addButtons(
        'Que souhaitez-vous faire ?',
        [
          { label: '🔄 Continuer la conversation', value: 'continue' },
          { label: '🆕 Nouveau sujet', value: 'new' },
        ],
        (choice) => {
          if (choice === 'continue') {
            // Restaurer l'historique
            this.state.conversation = messages;
            this.state.conversationId = data.id;
            this.state.chatSubject = data.sujet;

            // Réafficher les derniers messages (max 4)
            const lastMsgs = messages.slice(-4);
            lastMsgs.forEach(m => {
              this.addMessage(m.content, m.role === 'user' ? 'user' : 'bot');
            });
            this.addMessage('Je me souviens de tout ! Continuez... 💬', 'bot');
          } else {
            this.state.conversationId = null;
            this.addMessage('Parfait, nouveau sujet ! De quoi avez-vous besoin ? 🚗', 'bot');
          }
        }
      );

    } catch (e) {
      console.error('❌ Erreur chargement conversation:', e);
      this.addMessage(`Parfait ! Pose-moi toutes tes questions. Je suis là pour t'aider ! 🚗`, 'bot');
    }
  }

  // Sauvegarde la conversation en cours dans Supabase
  async saveConversation() {
    const clientData = this.getConnectedClient();
    if (!clientData) return; // Pas connecté, pas de sauvegarde

    const supabase = this.getSupabaseClient();
    if (!supabase) return;

    if (!this.state.conversation || this.state.conversation.length === 0) return;

    try {
      const payload = {
        client_id: clientData.id,
        session_id: this.sessionId,
        messages: this.state.conversation,
        sujet: this.state.chatSubject || 'Discussion',
        updated_at: new Date().toISOString()
      };

      if (this.state.conversationId) {
        // Mettre à jour la conversation existante
        await supabase
          .from('conversations')
          .update(payload)
          .eq('id', this.state.conversationId);
      } else {
        // Créer une nouvelle conversation
        const { data, error } = await supabase
          .from('conversations')
          .insert([{ ...payload, created_at: new Date().toISOString() }])
          .select('id')
          .single();

        if (!error && data) {
          this.state.conversationId = data.id;
          console.log('💾 Conversation créée:', data.id);
        }
      }
    } catch (e) {
      console.error('❌ Erreur sauvegarde conversation:', e);
    }
  }

  async handleAIChat(userMessage) {
    this.setLoading(true);

    if (!this.state.conversation) this.state.conversation = [];
    this.state.conversation.push({ role: 'user', content: userMessage });

    await this.detectAndSaveClientFeedback(userMessage);
    this.updateFuelTypeFromMessage(userMessage);

    // Messages d attente progressifs
    this.addMessage('⏳ Je réfléchis...', 'bot');
    let waitingIndex = this.messages.length - 1;

    const updateWaiting = (text) => {
      if (this.messages[waitingIndex]) {
        this.messages[waitingIndex].text = text;
        this.renderMessages();
      }
    };

    const t1 = setTimeout(() => updateWaiting('⏳ Je me connecte au serveur...'), 4000);
    const t2 = setTimeout(() => updateWaiting('🔄 Le serveur démarre, encore quelques secondes...'), 12000);
    const t3 = setTimeout(() => updateWaiting('☕ Ça prend plus longtemps que prévu, merci de patienter...'), 25000);
    const clearTimers = () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };

    const fetchWithRetry = async (body, retries = 2) => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 55000);
          const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (response.ok) return response;
          throw new Error(`HTTP ${response.status}`);
        } catch (err) {
          console.warn(`Tentative ${attempt + 1} echouee:`, err.message);
          if (attempt < retries) {
            updateWaiting(`🔄 Reconnexion en cours (tentative ${attempt + 2})...`);
            await new Promise(r => setTimeout(r, 3000));
          } else {
            throw err;
          }
        }
      }
    };

    try {
      if (!this.state.chatSubject) {
        this.state.chatSubject = userMessage.substring(0, 100);
      }

      const terrainContext = this.diagEngine
        ? this.diagEngine.getContextForPrompt(userMessage)
        : '';

      const systemPrompt = this.buildSystemPrompt(terrainContext);
      if (terrainContext) console.log('🧠 Contexte terrain injecté');

      const response = await fetchWithRetry({
        message: userMessage,
        systemPrompt,
        conversationHistory: this.state.conversation,
      });

      clearTimers();
      this.messages.splice(waitingIndex, 1);

      const data = await response.json();

      if (data.response) {
        this.state.conversation.push({ role: 'assistant', content: data.response });
        this.addMessage(data.response, 'bot');

        this.updateChatLead({
          ai_conversation_topic: this.state.chatSubject,
          last_message: userMessage,
          last_response: data.response,
          conversation_length: this.state.conversation.length,
          full_conversation: this.state.conversation
            .map(m => `${m.role === 'user' ? 'Client' : 'IA'}: ${m.content}`)
            .join('\n')
        });

        // Sauvegarder dans le compte client si connecté
        this.saveConversation();

        const detectedDiag = this.extractDiagnosisFromResponse(data.response, userMessage);
        if (detectedDiag) {
          this.state.currentSymptom = userMessage;
          this.state.currentDiagnosis = detectedDiag;
          setTimeout(() => this.proposeRecordDiagnosis(userMessage, detectedDiag), 2500);
        }

        // Sauvegarder la conversation si client connecté
        this.saveConversation();

        if (this.shouldOfferContact(data.response)) {
          setTimeout(() => this.offerContactButtons(), 1000);
        }
      } else {
        this.messages.splice(waitingIndex, 1);
        this.addMessage(`Désolé, j'ai un souci technique. Réessaye dans quelques instants.`, 'bot');
      }
    } catch (error) {
      clearTimers();
      console.error('❌ Erreur API chat:', error?.message || error);
      if (this.messages[waitingIndex]) {
        this.messages[waitingIndex].text = `😕 Le serveur ne répond pas. Réessaie dans 1 minute ou laisse ton numéro, on te rappelle.`;
        this.renderMessages();
      }
      setTimeout(() => this.offerContactButtons(), 1200);
    } finally {
      this.setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────
  // CONSTRUCTION DU PROMPT SYSTÈME
  // ─────────────────────────────────────────────────────────

  buildSystemPrompt(terrainContext = '') {
    return `Tu es un mecanicien expert automobile de haut niveau qui travaille pour ZENOCCAZ.
Tu diagnostiques comme un vrai mecano de garage : tu fais TESTER avant d'acheter quoi que ce soit.
${terrainContext}

PRINCIPE FONDAMENTAL — LE VRAI MECANO NE COMMANDE PAS DE PIECES AVANT D'AVOIR TESTE :
Avant de dire "changer X", tu proposes toujours un TEST MANUEL pour confirmer le diagnostic.
Ces tests coutent 0 euro et prennent 2 minutes. C'est comme ca que les vrais mecaniciens travaillent.

HIERARCHIE STRICTE — UNE ETAPE A LA FOIS :
Tu proposes UNE SEULE etape. Tu attends le retour du client. Tu passes a la suivante seulement si ca ne regle pas le probleme.

ORDRE OBLIGATOIRE :
1. TEST VISUEL ou MANUEL gratuit (0 euro)
2. TEST DE DECONNEXION ou BYPASS (0 euro, confirme ou infirme un composant)
3. Piece bon marche si test confirme (5-50 euros)
4. Piece moyenne si etapes precedentes eliminées (50-200 euros)
5. Piece couteuse en dernier recours UNIQUEMENT (200 euros+)

TESTS DE DECONNEXION ET BYPASS (comme un vrai mecano) :
Ces tests permettent de confirmer qu'un composant est defaillant AVANT de l'acheter :

DEBIMETRE MASSE D'AIR (MAF) :
Test : debrancher le connecteur electrique du debimetre (boitier sur le tuyau d'admission apres le filtre a air)
Si le moteur tourne MIEUX ou pareil apres debranchement = debimetre defaillant a remplacer (50-150 euros)
Si le moteur tourne MOINS BIEN = debimetre OK, chercher ailleurs

CAPTEUR DE SURALIMENTATION / PRESSION TURBO :
Test : debrancher le capteur MAP/boost (petit capteur sur le collecteur d'admission)
Si amelioration = capteur HS (20-60 euros)
Si pas de changement = capteur OK

VANNE N75 (regulation turbo diesel) :
Test bypass : debrancher la durite de depression de la N75 et la brancher DIRECTEMENT sur le bocal de vide (en shuntant la vanne)
Si le turbo monte correctement en pression = N75 defaillante (30-80 euros)
Si pas de changement = chercher cote wastegate, durites de suralimentation ou turbo lui-meme

VANNE EGR :
Test : debrancher le connecteur electrique de la vanne EGR
Si ralenti s'ameliore et fumee diminue = EGR encrassee (nettoyage 0 euro ou remplacement 80-200 euros)
Si pas de changement = EGR OK, chercher ailleurs

SONDE LAMBDA / CAPTEUR O2 :
Test : debrancher la sonde (sur le collecteur echappement avant catalyseur)
Si voyant moteur s'allume mais comportement moteur change = sonde HS (40-120 euros)

ACTUATEUR TURBO / WASTEGATE :
Test : sur turbo a geometrie variable, debrancher la durite pneumatique de l'actuateur
Si le turbo monte plus fort = actuateur ou wastegate bloquee
Test manuel : actionner a la main la tirette de l'actuateur, elle doit se deplacer librement

CAPTEUR PAPILLON / TPS :
Test : couper contact, debrancher le connecteur, remettre contact
Si le regime ralenti change = capteur HS

POMPE A CARBURANT :
Test : ecouter a l'ouverture du contact (sans demarrer) — on doit entendre un leger bourdonnement 2-3 secondes
Silence total = pompe HS ou fusible pompe a verifier

ALTERNATEUR :
Test gratuit : moteur tourne, mesurer tension batterie avec multimetre
12.4V = batterie seule (alternateur ne charge pas)
13.8-14.4V = alternateur OK
Sous 13V moteur tourne = alternateur HS

THERMOSTAT :
Test : moteur froid, laisser chauffer. Toucher le gros tuyau du radiateur
S'il chauffe tres vite (moins de 3 min) = thermostat bloque ouvert (moteur chauffe jamais a bonne temp)
S'il reste froid longtemps puis chauffe d'un coup = normal
S'il ne chauffe jamais = thermostat bloque ferme (surchauffe)

REGLES TECHNIQUES ABSOLUES :
- Cardan : GRAISSE dans soufflet caoutchouc. JAMAIS d'huile.
- Triangle : rotules + silent-blocs. AUCUN liquide.
- Direction electrique : pas de liquide de direction.
- Ne jamais proposer diagnostic moteur pour probleme electrique (vitre, verrou, clim).

EXEMPLES DE RAISONNEMENT CORRECT :

Client : "perte de puissance diesel"
Etape 1 (gratuit) : "Ouvre le capot et regarde le filtre a air — il est dans une boite plastique noire sur le cote. Il est sale ?"
→ Si oui : "Change-le, ca coutait surement ca (15-25 euros)."
→ Si non : passer etape 2
Etape 2 (gratuit, test debranchement) : "Debranche le connecteur du debimetre de masse d'air (boitier cylindrique sur le tuyau apres le filtre). Lance le moteur. Il tourne mieux ?"
→ Si oui : "Debimetre defaillant, a remplacer (50-150 euros)."
→ Si non : passer etape 3
Etape 3 (gratuit, bypass N75) : "Repere la vanne N75 (petite vanne electromagnetique avec durites de depression). Debranche la petite durite et branche-la directement sur le bocal de vide en shuntant la vanne. Accelere. Le turbo monte ?"
→ Si oui : "N75 HS, piece a 30-80 euros."
→ Si non : durites de suralimentation a inspecter, puis turbo en dernier recours.

FORMAT STRICT :
Etape [N] — [nom du test] (cout : [prix]) :
  Comment faire : [explication precise, comme si tu expliques a un ami]
  Si [resultat positif] : [diagnostic confirme + cout reel de la piece]
  Si [resultat negatif] : dis-moi, on passe a l'etape suivante.

APPRENTISSAGE : une fois resolu, demander juste "C'etait bien [diagnostic] ?" puis stop.`;
  }


  // ─────────────────────────────────────────────────────────
  // DÉTECTION DU CARBURANT DANS LES MESSAGES
  // ─────────────────────────────────────────────────────────

  updateFuelTypeFromMessage(text) {
    const lower = text.toLowerCase();
    if (lower.includes('diesel') || lower.includes('gazole') || lower.includes('gasoil')) {
      if (this.state.vehicleInfo.fuelType !== 'diesel') {
        this.state.vehicleInfo.fuelType = 'diesel';
        console.log('⛽ Carburant détecté: diesel');
      }
    } else if (lower.includes('essence') || lower.includes('sans plomb') || lower.includes('sp95') || lower.includes('sp98')) {
      if (this.state.vehicleInfo.fuelType !== 'essence') {
        this.state.vehicleInfo.fuelType = 'essence';
        console.log('⛽ Carburant détecté: essence');
      }
    } else if (lower.includes('hybride') || lower.includes('électrique')) {
      if (!this.state.vehicleInfo.fuelType) {
        this.state.vehicleInfo.fuelType = 'hybride';
        console.log('⛽ Carburant détecté: hybride/électrique');
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  // EXTRACTION DU DIAGNOSTIC DEPUIS LA RÉPONSE IA
  // ─────────────────────────────────────────────────────────

  /**
   * Tente d'extraire le nom du diagnostic suggéré par Claude
   * depuis sa réponse (cherche les patterns "PROBABLE:" ou "était-ce bien X")
   */
  extractDiagnosisFromResponse(response, symptom) {
    if (!response) return null;

    // Pattern 1: "📍 PROBABLE: [diagnostic]"
    const probableMatch = response.match(/PROBABLE\s*:\s*([^\n.!?]{5,60})/i);
    if (probableMatch) return probableMatch[1].trim();

    // Pattern 2: "Était-ce bien X qui posait problème ?"
    const wasItMatch = response.match(/était-ce bien\s+([^?]{5,60})\s+qui posait/i);
    if (wasItMatch) return wasItMatch[1].trim();

    // Pattern 3: supprimé (v2 obsolète)

    return null;
  }

  // ─────────────────────────────────────────────────────────
  // APPRENTISSAGE : CONFIRMATIONS / REFUS
  // ─────────────────────────────────────────────────────────

  /**
   * Propose d'enregistrer le diagnostic si c'était le bon
   */
  proposeRecordDiagnosis(symptom, diagnosis) {
    this.state.currentSymptom = symptom;
    this.state.currentDiagnosis = diagnosis;

    this.addButtons(
      `Était-ce bien "${diagnosis}" qui posait problème ?`,
      [
        { label: '✅ Oui, c\'était ça !', value: 'yes_confirm' },
        { label: '❌ Non, autre chose', value: 'no_confirm' },
      ],
      (value) => {
        if (value === 'yes_confirm') {
          // Apprentissage local immédiat
          if (this.diagEngine) {
            this.diagEngine.confirm(symptom, diagnosis);
            const stats = this.diagEngine.getStats();
            console.log(`📊 Stats après apprentissage:`, stats);
          }
          // Envoi vers le serveur
          this.saveDiagnosisFeedback(symptom, diagnosis, this.state.vehicleInfo.fuelType);
        } else {
          // Refus → pénaliser ce diagnostic
          if (this.diagEngine) {
            this.diagEngine.reject(symptom, diagnosis);
          }
          this.addMessage('Pas de souci ! Tu as trouvé ce que c\'était, ou tu cherches encore ?', 'bot');
          this.addButtons(
            'Où en es-tu ?',
            [
              { label: 'J\'ai trouvé le problème', value: 'found' },
              { label: 'Je cherche encore', value: 'still_searching' },
            ],
            (choice) => {
              if (choice === 'found') {
                this.askText('Super ! C\'était quoi exactement ?', (correction) => {
                  // Enregistrer le vrai diagnostic
                  if (this.diagEngine) {
                    this.diagEngine.confirm(symptom, correction);
                  }
                  this.saveDiagnosisFeedback(symptom, correction, this.state.vehicleInfo.fuelType);
                });
              } else {
                // Proposer photo ou continuer
                this.addButtons(
                  'On continue comment ?',
                  [
                    { label: 'Etape suivante', value: 'next_step' },
                    { label: 'Envoyer une photo', value: 'send_photo' },
                  ],
                  (next) => {
                    if (next === 'send_photo') {
                      this.offerPhotoAnalysis(this.state.chatSubject || symptom);
                    } else {
                      this.addMessage('OK, passons a l\'etape suivante.', 'bot');
                      this.handleAIChat('Toutes les verifications precedentes sont OK. Quelle est la prochaine etape a tester ?');
                    }
                  }
                );
              }
            }
          );
        }
      }
    );
  }

  /**
   * Détecte auto les retours clients dans les messages (c'était..., finalement c'était...)
   */
  async detectAndSaveClientFeedback(userMessage) {
    const msg = userMessage.toLowerCase().trim();
    const correctionPatterns = [
      /c[''ʼ]était\s+(?:finalement\s+)?(.+?)(?:[!.?]|$)/i,
      /oui\s+c[''ʼ]était\s+(?:finalement\s+)?(.+?)(?:[!.?]|$)/i,
      /c\s+était\s+(?:finalement\s+)?(.+?)(?:[!.?]|$)/i,
      /finalement\s+c[''ʼ]était\s+(.+?)(?:[!.?]|$)/i,
      /ça\s+venait\s+de\s+(.+?)(?:[!.?]|$)/i,
      /le\s+problème\s+(?:c\'était|était)\s+(.+?)(?:[!.?]|$)/i,
      /c[''ʼ]était\s+(?:la|le|l[''ʼ])\s+(.+?)(?:[!.?]|$)/i,
    ];

    for (const pattern of correctionPatterns) {
      const match = msg.match(pattern);
      if (match && match[1]) {
        const diagnosis = match[1].trim();
        if (diagnosis.length > 2 && diagnosis.length < 100) {
          console.log(`🧠 Diagnostic détecté dans message: "${diagnosis}"`);

          let symptom = this.state.chatSubject || 'Problème véhicule';
          for (let i = this.state.conversation.length - 2; i >= 0; i--) {
            if (this.state.conversation[i].role === 'user') {
              symptom = this.state.conversation[i].content;
              break;
            }
          }

          // ✅ Apprentissage local immédiat
          if (this.diagEngine) {
            this.diagEngine.confirm(symptom, diagnosis);
          }

          // Envoi serveur
          this.saveDiagnosisFeedback(symptom, diagnosis, this.state.vehicleInfo.fuelType);
          return;
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  // FLOWS VENTE / ACHAT (inchangés)
  // ─────────────────────────────────────────────────────────

  startSellFlow() {
    this.state = { mode: 'sell', step: 0, answers: {} };
    this.askText('Quel est le modèle et l\'année du véhicule ?', (text) => {
      this.state.answers.model = text;
      this.updateChatLead(this.state.answers);
      this.askText('Quel est le kilométrage approximatif ?', (km) => {
        this.state.answers.km = km;
        this.updateChatLead(this.state.answers);
        this.addButtons(
          'Quel est l\'état général ?',
          [
            { label: 'Très bon', value: 'tres_bon' },
            { label: 'Bon', value: 'bon' },
            { label: 'Moyen', value: 'moyen' },
            { label: 'À revoir', value: 'a_revoir' },
          ],
          (value, label) => {
            this.state.answers.etat = label;
            this.updateChatLead(this.state.answers);
            this.askText('Où se trouve le véhicule ?', (lieu) => {
              this.state.answers.lieu = lieu;
              this.updateChatLead(this.state.answers);
              this.addButtons(
                'Tu veux vendre rapidement ou tu n\'es pas pressé ?',
                [
                  { label: 'Vendre rapidement', value: 'rapide' },
                  { label: 'Pas pressé', value: 'pas_presse' },
                ],
                (speed, speedLabel) => {
                  this.state.answers.urgence = speedLabel;
                  this.updateChatLead(this.state.answers);
                  this.addMessage(
                    'Je peux te donner une estimation réaliste du prix et t\'expliquer comment ZenOccaz s\'occupe de tout pour toi.\nTu veux qu\'on avance ensemble ?',
                    'bot'
                  );
                  this.addButtons(
                    'Choisis :',
                    [
                      { label: 'Oui, je veux une estimation', value: 'estimation' },
                      { label: 'Je veux comprendre comment ça marche', value: 'how' },
                    ],
                    (choice) => {
                      if (choice === 'estimation') {
                        this.addMessage('Tu peux m\'envoyer quelques photos ici si tu veux, ça m\'aidera à affiner.', 'bot');
                        this.offerContact();
                        return;
                      }
                      this.addMessage('ZenOccaz s\'occupe de l\'estimation, des annonces, des visites et des démarches. Tu restes tranquille, on gère.', 'bot');
                      this.offerContact();
                    }
                  );
                }
              );
            });
          }
        );
      });
    });
  }

  startBuyFlow() {
    this.state = { mode: 'buy', step: 0, answers: {} };
    this.askText('Quel type de véhicule tu cherches ?', (text) => {
      this.state.answers.type = text;
      this.updateChatLead(this.state.answers);
      this.askText('Quel budget tu veux mettre ?', (budget) => {
        this.state.answers.budget = budget;
        this.updateChatLead(this.state.answers);
        this.askText('Quel kilométrage maximum ?', (km) => {
          this.state.answers.km = km;
          this.updateChatLead(this.state.answers);
          this.askText('Quelles options sont importantes pour toi ?', (options) => {
            this.state.answers.options = options;
            this.updateChatLead(this.state.answers);
            this.addButtons(
              'Tu veux acheter rapidement ou tu as le temps ?',
              [
                { label: 'Acheter rapidement', value: 'rapide' },
                { label: 'J\'ai le temps', value: 'temps' },
              ],
              (value, label) => {
                this.state.answers.urgence = label;
                this.addMessage(
                  'Je peux te proposer une recherche personnalisée et t\'éviter les arnaques.\nTu veux que je t\'aide à trouver le bon véhicule ?',
                  'bot'
                );
                this.addButtons(
                  'Choisis :',
                  [
                    { label: 'Oui, aide-moi', value: 'help' },
                    { label: 'Explique-moi comment ça marche', value: 'how' },
                  ],
                  (choice) => {
                    if (choice === 'help') {
                      this.offerContact();
                      return;
                    }
                    this.addMessage('On sélectionne pour toi, on vérifie l\'historique, on sécurise la transaction. Simple et clair.', 'bot');
                    this.offerContact();
                  }
                );
              }
            );
          });
        });
      });
    });
  }

  // ─────────────────────────────────────────────────────────
  // CONTACT & UTILS
  // ─────────────────────────────────────────────────────────

  shouldOfferContact(response) {
    const lower = response.toLowerCase();
    return lower.includes('rappelle') || lower.includes('contact') ||
      lower.includes('ludo') || lower.includes('coordonnées');
  }

  offerContactButtons() {
    this.addButtons(
      `Tu veux qu'on te recontacte ?`,
      [
        { label: 'Oui, rappelle-moi', value: 'yes_contact' },
        { label: 'Non, continuer', value: 'no_contact' },
      ],
      (value) => {
        if (value === 'yes_contact') this.offerContact();
        else this.addMessage(`Pas de souci ! Continue à me poser tes questions. 😊`, 'bot');
      }
    );
  }

  // ─────────────────────────────────────────────────────────
  // ANALYSE PHOTO
  // ─────────────────────────────────────────────────────────

  offerPhotoAnalysis(context = '') {
    this.addMessage(`Je peux analyser une photo pour t'aider. Envoie-moi une photo de la zone concernee (durites, soufflets, moteur...) et je te dis ce que je vois comme mecano.`, 'bot');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    this.addButtons(
      'Tu veux envoyer une photo ?',
      [
        { label: 'Envoyer une photo', value: 'send_photo' },
        { label: 'Non merci', value: 'no_photo' },
      ],
      (value) => {
        if (value === 'no_photo') {
          document.body.removeChild(input);
          this.offerContact();
          return;
        }
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          document.body.removeChild(input);
          this.addMessage('Photo envoyee : ' + file.name, 'user');
          this.analyzePhoto(file, context);
        };
        input.click();
      }
    );
  }

  compressImage(file, maxSize = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          // Redimensionner si trop grand
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else { w = Math.round(w * maxSize / h); h = maxSize; }
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const base64 = dataUrl.split(',')[1];
          console.log(`📸 Image compressée: ${w}x${h}, ~${Math.round(base64.length/1024)}KB`);
          resolve({ base64, mediaType: 'image/jpeg' });
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async analyzePhoto(file, context = '') {
    this.setLoading(true);
    this.addMessage('Analyse de la photo en cours...', 'bot');
    const waitingIndex = this.messages.length - 1;
    try {
      // Compresser l'image avant envoi (max 800px, qualité 0.7)
      const { base64, mediaType } = await this.compressImage(file, 800, 0.7);
      const systemPrompt = `Tu es un mecanicien expert automobile qui analyse des photos de pieces de vehicules.
Tu examines chaque detail avec l'oeil d'un professionnel : etat des durites, soufflets, fuites, corrosion, usure, fissures, connexions, etc.
${context ? 'Contexte du probleme : ' + context : ''}
FORMAT OBLIGATOIRE :
Ce que je vois : [description precise de tout ce qui est visible]
Etat general : [bon / moyen / mauvais / critique]
Problemes detectes : [ce qui ne va pas, meme detail]
Recommandation : [action a faire, du plus urgent au moins urgent]
Cout estime : [fourchette realiste]`;
      // Appel dédié analyse photo (Claude Vision côté serveur)
      const photoUrl = this.apiUrl.replace('/api/chat', '/api/analyze-photo');
      const response = await fetch(photoUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mediaType, context }),
      });
      this.messages.splice(waitingIndex, 1);
      if (response.ok) {
        const data = await response.json();
        if (data.response) {
          this.addMessage(data.response, 'bot');
          this.state.conversation.push({ role: 'assistant', content: data.response });
        }
      } else {
        this.addMessage("Je n'ai pas pu analyser la photo. Décris-moi ce que tu vois.", "bot");
      }
    } catch (e) {
      console.error('Erreur analyse photo:', e);
      if (this.messages[waitingIndex]) {
        this.messages[waitingIndex].text = 'Erreur analyse. Decris-moi ce que tu vois.';
        this.renderMessages();
      }
    } finally {
      this.setLoading(false);
    }
  }

  offerContact() {
    this.addMessage('Tu veux qu\'on passe à l\'action ?', 'bot');
    this.addButtons(
      'Choisis une option :',
      [
        { label: 'Prendre un rendez-vous', value: 'rdv' },
        { label: 'Être rappelé', value: 'callback' },
        { label: 'Laisser mon email', value: 'email' },
      ],
      (value) => {
        this.updateChatLead({ contact_choice: value });
        if (value === 'email') {
          this.askText('Ok, donne ton email.', (email) => {
            this.updateChatLead({ email });
            this.addMessage('Merci. L\'équipe revient vers toi rapidement.', 'bot');
          });
          return;
        }
        if (value === 'callback') {
          this.askText('D\'accord ! Quel est ton nom de famille ?', (nom) => {
            this.updateChatLead({ callback_nom: nom });
            this.addMessage(`Merci ${nom} !`, 'bot');
            this.askText('Quel est ton numéro de téléphone ?', (tel) => {
              this.updateChatLead({ callback_tel: tel });
              this.askText('Quel jour et créneau te conviennent le mieux ? (ex: lundi matin, mercredi 14h...)', (date) => {
                this.updateChatLead({ callback_date: date, callback_info: `${nom} - ${tel} - ${date}` });
                this.addMessage(`Parfait ${nom}, on te rappelle au ${tel} (${date}). À très vite ! 👋`, 'bot');
              });
            });
          });
          return;
        }
        this.askText('Parfait. Donne ton nom et ton créneau préféré.', (text) => {
          this.updateChatLead({ rdv_info: text });
          this.addMessage('C\'est noté. On confirme vite le rendez-vous.', 'bot');
        });
      }
    );
  }

  async saveDiagnosisFeedback(symptom, diagnosis, fuelType = null) {
    if (!symptom || !diagnosis) return;
    try {
      console.log(`📚 Envoi diagnostic serveur: "${symptom}" → "${diagnosis}"`);
      const response = await fetch(this.apiSaveDiagnosisUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptom,
          diagnosis,
          fuelType,
          vehicleInfo: this.state.vehicleInfo
        })
      });
      if (response.ok) {
        console.log(`✅ Diagnostic enregistré côté serveur`);
        this.addMessage(`✅ Merci ! J'ai noté ce diagnostic pour aider les prochains clients.`, 'bot');
      }
    } catch (e) {
      // Silencieux — l'apprentissage local a déjà été fait
      console.warn('⚠️ Serveur diagnostic inaccessible (apprentissage local OK):', e.message);
    }
  }

  // ─────────────────────────────────────────────────────────
  // SUPABASE
  // ─────────────────────────────────────────────────────────

  createSessionId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return `sess_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  }

  getSupabaseClient() {
    return window.supabase || (window.supabaseClient && window.supabaseClient.supabase) || null;
  }

  async logChatChoice(choice) {
    const client = this.getSupabaseClient();
    if (!client) {
      this.pendingLeadChoice = choice;
      this.scheduleSupabaseRetry();
      return;
    }
    try {
      const payload = { ...this.state.answers };
      const leadId = Date.now();
      this.currentLeadId = leadId;
      const { error } = await client.from('chat_leads').insert([
        { id: leadId, session_id: this.sessionId, choice, payload }
      ]);
      if (error) console.error('❌ Erreur insertion chat_leads:', error);
      else console.log('✅ Chat lead créé:', leadId);
    } catch (e) {
      console.error('❌ Exception logChatChoice:', e);
    }
  }

  async updateChatLead(extra) {
    const client = this.getSupabaseClient();
    if (!client) {
      this.pendingLeadPayload = { ...this.state.answers, ...extra };
      this.scheduleSupabaseRetry();
      return;
    }
    try {
      const payload = { ...this.state.answers, ...extra };
      this.state.answers = payload;
      const { error, count } = await client
        .from('chat_leads')
        .update({ payload })
        .eq('session_id', this.sessionId);
      if (error) console.error('❌ Erreur update chat_leads:', error);
      if (!error && count === 0) {
        const choice = this.state.mode || this.pendingLeadChoice || 'faq';
        const leadId = Date.now();
        this.currentLeadId = leadId;
        const insertResult = await client.from('chat_leads').insert([
          { id: leadId, session_id: this.sessionId, choice, payload }
        ]);
        if (insertResult.error) console.error('❌ Erreur insertion fallback:', insertResult.error);
      }
    } catch (e) {
      console.error('❌ Exception updateChatLead:', e);
    }
  }

  setLoading(isLoading) {
    this.isLoading = isLoading;
    if (this.chatSend) {
      this.chatSend.disabled = isLoading;
      this.chatSend.textContent = isLoading ? '...' : '➤';
    }
    if (this.chatInput) this.chatInput.disabled = isLoading;
    // Désactiver aussi le bouton photo pendant le chargement
    const photoBtn = document.getElementById('chat-photo-btn');
    if (photoBtn) photoBtn.disabled = isLoading;
  }

  scheduleSupabaseRetry() {
    if (this.supabaseRetryTimer) return;
    this.supabaseRetryTimer = window.setInterval(() => {
      const client = this.getSupabaseClient();
      if (!client) return;
      window.clearInterval(this.supabaseRetryTimer);
      this.supabaseRetryTimer = null;
      if (this.pendingLeadChoice) {
        const choice = this.pendingLeadChoice;
        this.pendingLeadChoice = null;
        this.logChatChoice(choice);
      }
      if (this.pendingLeadPayload) {
        const payload = this.pendingLeadPayload;
        this.pendingLeadPayload = null;
        this.updateChatLead(payload);
      }
    }, 1000);
  }

  // ─────────────────────────────────────────────────────────
  // GESTION DES CONVERSATIONS CLIENT
  // ─────────────────────────────────────────────────────────

  getConnectedClient() {
    try {
      const raw = localStorage.getItem('clientData');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Sauvegarde la conversation en cours dans Supabase
   * Appelé après chaque échange IA
   */
  async saveConversation() {
    if (!this.connectedClient || !this.state.conversation || this.state.conversation.length === 0) return;
    const client = this.getSupabaseClient();
    if (!client) return;

    try {
      const payload = {
        client_id: this.connectedClient.id,
        session_id: this.sessionId,
        messages: this.state.conversation,
        sujet: this.state.chatSubject || 'Conversation IA',
        updated_at: new Date().toISOString()
      };

      // Upsert : créer ou mettre à jour selon session_id
      const { error } = await client
        .from('conversations')
        .upsert([payload], { onConflict: 'session_id' });

      if (error) console.error('❌ Erreur sauvegarde conversation:', error);
      else console.log('💾 Conversation sauvegardée');
    } catch (e) {
      console.error('❌ Exception saveConversation:', e);
    }
  }

  /**
   * Charge la dernière conversation du client connecté
   */
  async loadLastConversation() {
    if (!this.connectedClient) return null;
    const client = this.getSupabaseClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('conversations')
        .select('*')
        .eq('client_id', this.connectedClient.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  /**
   * Propose au client connecté de reprendre sa dernière conversation
   */
  async offerResumeConversation() {
    const last = await this.loadLastConversation();
    if (!last || !last.messages || last.messages.length === 0) return;

    const date = new Date(last.updated_at).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });

    this.addButtons(
      `👋 Bonjour ${this.connectedClient.name} ! Tu as une conversation du ${date} sur "${last.sujet}". Tu veux la reprendre ?`,
      [
        { label: '🔄 Reprendre', value: 'resume' },
        { label: '✨ Nouvelle conversation', value: 'new' },
      ],
      (value) => {
        if (value === 'resume') {
          // Restaurer l'état
          this.state.mode = 'ai_chat';
          this.state.conversation = last.messages;
          this.state.chatSubject = last.sujet;
          this.sessionId = last.session_id;
          this.state.vehicleInfo = { brand: null, model: null, year: null, fuelType: null };

          // Afficher les anciens messages
          this.messages = [];
          for (const msg of last.messages) {
            this.addMessage(msg.content, msg.role === 'user' ? 'user' : 'bot');
          }
          this.addMessage("Conversation reprise ! Continue où tu t'étais arrêté. 👍", "bot");
        } else {
          this.showMainChoices();
        }
      }
    );
  }
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', () => {
  // ⚠️ diagnostic-engine.js doit être chargé AVANT chatbot.js dans le HTML
  // <script src="diagnostic-engine.js"></script>
  // <script src="chatbot.js"></script>
  new ChatBot();
});
