import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'https';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Configuration CORS explicite pour accepter les requêtes depuis tous les domaines
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

app.use(express.json());
app.use(express.static('.'));

const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

// Vérifier que la clé Groq est configurée
if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY non trouvée dans .env');
  process.exit(1);
}

function callGroqChat(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request(
      {
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = null;
          }

          if (res.statusCode < 200 || res.statusCode >= 300) {
            const err = new Error(`Groq API error ${res.statusCode}`);
            err.details = parsed || data;
            return reject(err);
          }

          return resolve(parsed);
        });
      }
    );

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Endpoint GET /health - pour vérifier que le serveur est alive
 */
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

/**
 * Endpoint POST /api/chat
 * Reçoit un message de l'utilisateur et retourne une réponse de Groq
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, systemPrompt, conversationHistory } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message requis et valide' });
    }

    // Construire l'historique des messages
    const messages = [];

    // Ajouter le system prompt (personnalisé ou par défaut)
    const defaultSystemPrompt = `Tu es un assistant IA pour ZENOCCAZ, un spécialiste en vente de véhicules d'occasion premium.
- Réponds en français avec un ton professionnel mais amical
- Aide les visiteurs avec des questions sur les véhicules, les tarifs, les services
- Si tu as des informations sur nos véhicules, utilise-les
- Propose toujours de les mettre en contact avec l'équipe pour plus de détails
- Sois concis (max 3-4 lignes)`;

    messages.push({
      role: 'system',
      content: systemPrompt || defaultSystemPrompt,
    });

    // Ajouter l'historique de conversation si présent
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        if (msg.role && msg.content) {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      });
    } else {
      // Sinon, juste ajouter le message actuel
      messages.push({
        role: 'user',
        content: message,
      });
    }

    // Appel à Groq API
    console.log('📤 Calling Groq API with', messages.length, 'messages');
    const data = await callGroqChat({
      model: 'llama-3.1-8b-instant',
      messages,
      max_tokens: 512,
      temperature: 0.7,
    });
    
    const reply = data.choices?.[0]?.message?.content || 'Désolé, pas de réponse.';
    console.log('📥 Groq API replied:', reply.substring(0, 50) + '...');

    res.json({ response: reply });
  } catch (error) {
    console.error('❌ Erreur serveur:', error?.details || error?.message || error);
    res.status(500).json({ error: 'Erreur serveur', details: error?.message });
  }
});

app.listen(PORT, HOST, () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isDev = nodeEnv !== 'production';
  const displayHost = isDev ? `http://localhost:${PORT}` : `https://zenoccaz.onrender.com`;
  
  console.log(`✅ Serveur démarré sur port ${PORT} (${nodeEnv})`);
  console.log(`   Accessible à: ${displayHost}`);
  console.log(`   Chat API disponible à /api/chat`);
  console.log(`   Health check disponible à /health`);
});
