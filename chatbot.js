/**
 * Chatbot Widget - ZENOCCAZ
 * Gère l'interface et la communication avec le serveur de chat
 */

class ChatBot {
  constructor() {
    this.messages = [];
    this.isOpen = false;
    this.isLoading = false;
    // Détecte automatiquement le serveur API
    // En local : http://localhost:3000/api/chat
    // En prod (Render) : https://zenoccaz.onrender.com/api/chat
    const apiBaseUrl = this.detectApiBaseUrl();
    
    this.apiUrl = `${apiBaseUrl}/api/chat`;
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
    };
    
    this.init();
  }

  detectApiBaseUrl() {
    // Toujours utiliser Render pour l'API
    console.log('🌐 API URL: https://zenoccaz.onrender.com');
    return 'https://zenoccaz.onrender.com';
  }

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.resetConversation();
  }

  cacheDOM() {
    this.chatWidget = document.getElementById('chat-widget');
    this.chatBtn = document.getElementById('chat-toggle-btn');
    this.chatBox = document.getElementById('chat-box');
    this.chatMessages = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    this.chatSend = document.getElementById('chat-send-btn');
    this.chatClose = document.getElementById('chat-close-btn');
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

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

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
              ${msg.options
                .map((opt) => `
                  <button class="chat-option" data-chat-value="${this.escapeHTML(opt.value)}" data-chat-label="${this.escapeHTML(opt.label)}">${this.escapeHTML(opt.label)}</button>
                `)
                .join('')}
            </div>`
          : '';

        return `
          <div class="chat-message ${msg.sender}">
            ${bubble}
            ${buttons}
          </div>
        `;
      })
      .join('');
    
    // Auto-scroll vers le bas
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  async sendMessage() {
    const text = this.chatInput?.value.trim();
    
    if (!text) return;

    // Ajouter le message de l'utilisateur
    this.addMessage(text, 'user');
    if (this.chatInput) this.chatInput.value = '';

    if (this.pendingTextHandler) {
      const handler = this.pendingTextHandler;
      this.pendingTextHandler = null;
      handler(text);
      return;
    }

    // Si on est en mode AI chat, appeler l'IA
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
    this.addMessage(
      `Salut, je suis l'assistant ZenOccaz. Comment puis-je t'aider aujourd'hui ?`,
      'bot'
    );
    this.showMainChoices();
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

  startSellFlow() {
    this.state = { mode: 'sell', step: 0, answers: {} };
    this.askText('Quel est le modèle et l’année du véhicule ?', (text) => {
      this.state.answers.model = text;
      this.updateChatLead(this.state.answers);
      this.askText('Quel est le kilométrage approximatif ?', (km) => {
        this.state.answers.km = km;
        this.updateChatLead(this.state.answers);
        this.addButtons(
          'Quel est l’état général ?',
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
                'Tu veux vendre rapidement ou tu n’es pas pressé ?',
                [
                  { label: 'Vendre rapidement', value: 'rapide' },
                  { label: 'Pas pressé', value: 'pas_presse' },
                ],
                (speed, speedLabel) => {
                  this.state.answers.urgence = speedLabel;
                  this.updateChatLead(this.state.answers);
                  this.addMessage(
                    'Je peux te donner une estimation réaliste du prix et t’expliquer comment ZenOccaz s’occupe de tout pour toi.\nTu veux qu’on avance ensemble ?',
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
                        this.addMessage('Tu peux m’envoyer quelques photos ici si tu veux, ça m’aidera à affiner.', 'bot');
                        this.offerContact();
                        return;
                      }
                      this.addMessage('ZenOccaz s’occupe de l’estimation, des annonces, des visites et des démarches. Tu restes tranquille, on gère.', 'bot');
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
                { label: 'J’ai le temps', value: 'temps' },
              ],
              (value, label) => {
                this.state.answers.urgence = label;
                this.addMessage(
                  'Je peux te proposer une recherche personnalisée et t’éviter les arnaques.\nTu veux que je t’aide à trouver le bon véhicule ?',
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
                    this.addMessage('On sélectionne pour toi, on vérifie l’historique, on sécurise la transaction. Simple et clair.', 'bot');
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

  startFaqFlow() {
    this.state = { mode: 'faq', step: 0, answers: {} };
    this.askText('Pose ta question.', (text) => {
      this.state.answers.question = text;
      this.updateChatLead(this.state.answers);
      const answer = this.matchFaq(text);
      if (answer) {
        this.addMessage(answer, 'bot');
        this.offerContact();
      } else {
        this.addMessage('Je peux te mettre en contact direct avec Ludo si tu veux. Tu préfères un appel ou un message ?', 'bot');
        this.addButtons(
          'Choisis :',
          [
            { label: 'Appel', value: 'call' },
            { label: 'Message', value: 'message' },
          ],
          () => this.offerContact()
        );
      }
    });
  }

  matchFaq(text) {
    const q = text.toLowerCase();
    if (q.includes('fonction') || q.includes('zenoccaz')) {
      return 'ZenOccaz te guide de A à Z : estimation, annonces, visites et démarches. Tu gagnes du temps et tu évites les pièges.';
    }
    if (q.includes('frais') || q.includes('prix') || q.includes('tarif')) {
      return 'Les frais dépendent du service. On te donne un tarif clair avant de démarrer.';
    }
    if (q.includes('document')) {
      return 'On te demande les documents classiques : carte grise, pièce d’identité, contrôle technique si besoin.';
    }
    if (q.includes('vente')) {
      return 'On estime, on publie, on filtre les acheteurs et on sécurise la vente. Tu restes tranquille.';
    }
    if (q.includes('achat')) {
      return 'On cherche selon tes critères, on vérifie le véhicule et on sécurise la transaction.';
    }
    if (q.includes('delai') || q.includes('délai')) {
      return 'Les délais varient selon le véhicule, mais on va vite dès que ton dossier est complet.';
    }
    if (q.includes('secur') || q.includes('sécur') || q.includes('garantie')) {
      return 'On sécurise chaque étape et on évite les arnaques. C’est notre priorité.';
    }
    return null;
  }

  startAIChatMode() {
    this.state = { mode: 'ai_chat', step: 0, answers: {}, conversation: [] };
    this.addMessage(
      `Parfait ! Pose-moi toutes tes questions sur les véhicules, l'achat, la vente, ou n'importe quoi d'autre. Je suis là pour t'aider ! 🚗`,
      'bot'
    );
  }

  async handleAIChat(userMessage) {
    this.setLoading(true);

    // Sauvegarder le message dans l'historique
    if (!this.state.conversation) this.state.conversation = [];
    this.state.conversation.push({ role: 'user', content: userMessage });

    try {
      // Déterminer le sujet de la conversation si pas encore défini
      if (!this.state.chatSubject) {
        this.state.chatSubject = userMessage.substring(0, 100);
      }

      const systemPrompt = `Tu es l'assistant virtuel de ZENOCCAZ, un garage et service d'achat/vente de véhicules d'occasion.

CONTEXTE ZENOCCAZ :
- Garage situé en France spécialisé dans les véhicules d'occasion
- Services : achat de véhicules, vente de véhicules, estimation, préparation administrative, garantie, conseils
- Le gérant s'appelle Ludo
- Tu aides les clients à vendre leur véhicule (estimation, annonce, filtrage acheteurs)
- Tu aides les clients à acheter (recherche selon critères, vérification, sécurisation)
- Tu évites les arnaques et sécurises les transactions

TON RÔLE :
- Réponds en français de manière amicale et professionnelle
- Sois concis (2-3 phrases max par réponse)
- Utilise un ton conversationnel et accessible
- Si le client a besoin d'aide concrète, propose de laisser ses coordonnées pour être rappelé
- Si tu détectes une intention d'achat ou vente, propose d'être mis en contact avec l'équipe
- Réponds aux questions sur les services, tarifs, délais, process

QUAND PROPOSER LE CONTACT :
- Le client veut vendre ou acheter un véhicule
- Le client a une question complexe nécessitant un expert
- Le client exprime un besoin urgent
- Le client demande un devis ou tarif précis

FORMAT DE RÉPONSE :
- Réponds d'abord à la question
- Ensuite, SI APPROPRIÉ, propose : "Je peux te mettre en contact avec Ludo si tu veux avancer. Tu veux qu'il te rappelle ?"`;

      // Créer un AbortController avec timeout de 60 secondes (Render peut être très lent au démarrage en free tier)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      let response;
      try {
        console.log('📤 Envoi du message vers:', this.apiUrl);
        response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            systemPrompt,
            conversationHistory: this.state.conversation.slice(-6), // Garder les 6 derniers messages pour le contexte
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        console.log('✅ Réponse reçue du serveur:', response.status);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('❌ Fetch error:', fetchError?.message);
        console.error('   Type:', fetchError?.name);
        console.error('   URL tentée:', this.apiUrl);
        throw fetchError;
      }

      if (!response.ok) {
        throw new Error(`API error ${response.status}`);
      }

      const data = await response.json();
      
      if (data.response) {
        this.state.conversation.push({ role: 'assistant', content: data.response });
        this.addMessage(data.response, 'bot');

        // Mettre à jour Supabase avec la conversation
        this.updateChatLead({ 
          ai_conversation_topic: this.state.chatSubject,
          last_message: userMessage,
          last_response: data.response,
          conversation_length: this.state.conversation.length,
          full_conversation: this.state.conversation.map(m => `${m.role === 'user' ? 'Client' : 'IA'}: ${m.content}`).join('\n')
        });

        // Détecter si l'IA propose un contact et afficher les boutons
        if (this.shouldOfferContact(data.response)) {
          setTimeout(() => this.offerContactButtons(), 1000);
        }
      } else {
        this.addMessage(`Désolé, j'ai un souci technique. Réessaye ou laisse-moi tes coordonnées pour qu'on te rappelle.`, 'bot');
      }
    } catch (error) {
      console.error('❌ Erreur API chat:', error?.message || error);
      console.error('   Stack:', error?.stack);
      this.addMessage(`Oups, connexion perdue. Laisse-moi ton email ou numéro si tu veux qu'on te recontacte.`, 'bot');
      setTimeout(() => this.offerContactButtons(), 1000);
    } finally {
      this.setLoading(false);
    }
  }

  shouldOfferContact(response) {
    const lowerResponse = response.toLowerCase();
    return lowerResponse.includes('rappelle') || 
           lowerResponse.includes('contact') || 
           lowerResponse.includes('ludo') ||
           lowerResponse.includes('coordonnées');
  }

  offerContactButtons() {
    this.addButtons(
      `Tu veux qu'on te recontacte ?`,
      [
        { label: 'Oui, rappelle-moi', value: 'yes_contact' },
        { label: 'Non, continuer à discuter', value: 'no_contact' },
      ],
      (value) => {
        if (value === 'yes_contact') {
          this.offerContact();
        } else {
          this.addMessage(`Pas de souci ! Continue à me poser tes questions. 😊`, 'bot');
        }
      }
    );
  }

  offerContact() {
    this.addMessage('Tu veux qu’on passe à l’action ?', 'bot');
    this.addButtons(
      'Choisis une option :',
      [
        { label: 'Prendre un rendez-vous', value: 'rdv' },
        { label: 'Être rappelé', value: 'callback' },
        { label: 'Envoyer un message WhatsApp', value: 'whatsapp' },
        { label: 'Laisser mon email', value: 'email' },
      ],
      (value) => {
        this.updateChatLead({ contact_choice: value });
        if (value === 'email') {
          this.askText('Ok, donne ton email.', (email) => {
            this.updateChatLead({ email });
            this.addMessage('Merci. L’équipe revient vers toi rapidement.', 'bot');
          });
          return;
        }
        if (value === 'callback') {
          this.askText('Super. Laisse ton numéro et le meilleur créneau.', (text) => {
            console.log('📞 Texte callback reçu:', text);
            console.log('📞 Longueur:', text.length);
            console.log('📞 JSON.stringify:', JSON.stringify({ callback_info: text }));
            this.updateChatLead({ callback_info: text });
            this.addMessage('Parfait. On te rappelle vite.', 'bot');
          });
          return;
        }
        if (value === 'whatsapp') {
          this.askText('Ok. Donne ton numéro WhatsApp.', (text) => {
            this.updateChatLead({ whatsapp: text });
            this.addMessage('Merci. On te contacte sur WhatsApp.', 'bot');
          });
          return;
        }
        this.askText('Parfait. Donne ton nom et ton créneau préféré.', (text) => {
          this.updateChatLead({ rdv_info: text });
          this.addMessage('C’est noté. On confirme vite le rendez-vous.', 'bot');
        });
      }
    );
  }

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
        {
          id: leadId,
          session_id: this.sessionId,
          choice,
          payload,
        }
      ]);
      
      if (error) {
        console.error('❌ Erreur insertion chat_leads:', error);
      } else {
        console.log('✅ Chat lead créé:', leadId);
      }
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
      console.log('💾 updateChatLead payload avant Supabase:', JSON.stringify(payload));
      this.state.answers = payload;
      const { error, count } = await client
        .from('chat_leads')
        .update({ payload })
        .eq('session_id', this.sessionId);

      if (error) {
        console.error('❌ Erreur update chat_leads:', error);
      } else {
        console.log('✅ Update OK - rows affectées:', count);
      }

      if (!error && count === 0) {
        const choice = this.state.mode || this.pendingLeadChoice || 'faq';
        const leadId = Date.now();
        this.currentLeadId = leadId;
        
        console.log('💾 Insert fallback - payload:', JSON.stringify(payload));
        const insertResult = await client.from('chat_leads').insert([
          {
            id: leadId,
            session_id: this.sessionId,
            choice,
            payload,
          }
        ]);
        if (insertResult.error) {
          console.error('❌ Erreur insertion chat_leads (fallback):', insertResult.error);
        } else {
          console.log('✅ Chat lead créé (fallback):', leadId);
        }
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
    if (this.chatInput) {
      this.chatInput.disabled = isLoading;
    }
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
}

// Initialiser le chatbot au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  new ChatBot();
});
