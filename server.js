import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let LEARNED_DIAGNOSTICS = [];

// Charger les diagnostics appris
try {
  const learnedPath = path.join(__dirname, 'learned-diagnostics.json');
  if (fs.existsSync(learnedPath)) {
    const data = fs.readFileSync(learnedPath, 'utf-8');
    LEARNED_DIAGNOSTICS = JSON.parse(data);
    console.log(`✅ Chargé ${LEARNED_DIAGNOSTICS.length} diagnostics appris`);
  }
} catch (e) {
  console.warn('⚠️ Impossible de charger learned-diagnostics.json:', e.message);
  LEARNED_DIAGNOSTICS = [];
}

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true })); // 20mb pour les images base64
app.use(express.static('.'));

const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY non trouvée dans .env');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────
// HELPERS HTTP
// ─────────────────────────────────────────────────────────

function httpPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = https.request(
      {
        hostname,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode < 200 || res.statusCode >= 300) {
              const err = new Error(`HTTP ${res.statusCode}`);
              err.details = parsed;
              return reject(err);
            }
            resolve(parsed);
          } catch (e) {
            reject(new Error('JSON parse error: ' + data.substring(0, 200)));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function callGroq(messages, maxTokens = 1024) {
  return httpPost(
    'api.groq.com',
    '/openai/v1/chat/completions',
    { Authorization: `Bearer ${GROQ_API_KEY}` },
    {
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }
  );
}

// Recherche web via SerpApi (Google Search)
async function searchWeb(query) {
  const SERPAPI_KEY = process.env.SERPAPI_KEY || '';
  if (!SERPAPI_KEY) { console.warn('SERPAPI_KEY manquante'); return null; }

  try {
    const encoded = encodeURIComponent(query + ' automobile');
    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'serpapi.com',
        path: `/search.json?q=${encoded}&hl=fr&gl=fr&api_key=${SERPAPI_KEY}&num=3`,
        method: 'GET',
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
        });
      });
      req.on('error', reject);
      req.end();
    });

    if (!result || !result.organic_results) return null;

    // Extraire les snippets des 3 premiers résultats
    const snippets = result.organic_results
      .slice(0, 3)
      .map(r => r.snippet || r.title)
      .filter(Boolean)
      .join(' | ');

    console.log('🔍 SerpApi résultat:', snippets.substring(0, 150));
    return snippets || null;
  } catch (e) {
    console.warn('Recherche SerpApi echouee:', e.message);
    return null;
  }
}

// Détecte si c'est une question de connaissance nécessitant une recherche
function isKnowledgeQuestion(message) {
  const lower = message.toLowerCase();
  const patterns = [
    "a quoi sert", "c est quoi", "quest ce que", "comment fonctionne",
    "explique", "kesako", "role de", "fonction de", "definition",
    "ca sert a quoi", "a quoi ca sert", "reference", "piece",
    "capteur", "vanne", "module", "calculateur",
    "boitier", "relais", "fusible", "sonde", "debimetre", "injecteur"
  ];
  return patterns.some(function(p) { return lower.includes(p); });
}


// ─────────────────────────────────────────────────────────
// APPRENTISSAGE
// ─────────────────────────────────────────────────────────

function saveLearningFeedback(symptom, diagnosis, fuelType, vehicleInfo = {}) {
  const existing = LEARNED_DIAGNOSTICS.find(
    d => d.symptom.toLowerCase() === symptom.toLowerCase() &&
         d.diagnosis.toLowerCase() === diagnosis.toLowerCase()
  );

  if (existing) {
    existing.validation_count = (existing.validation_count || 1) + 1;
    existing.confidence_score = Math.min(10, existing.validation_count);
    existing.updated_at = new Date().toISOString();
    console.log(`📈 Diagnostic renforcé: "${symptom}" → "${diagnosis}" (${existing.confidence_score}/10)`);
  } else {
    LEARNED_DIAGNOSTICS.push({
      id: Date.now(),
      created_at: new Date().toISOString(),
      symptom,
      diagnosis,
      fuel_type: fuelType,
      vehicle_brand: vehicleInfo.brand,
      vehicle_model: vehicleInfo.model,
      vehicle_year: vehicleInfo.year,
      validation_count: 1,
      confidence_score: 1
    });
    console.log(`✅ Nouveau diagnostic appris: "${symptom}" → "${diagnosis}"`);
  }

  try {
    fs.writeFileSync(
      path.join(__dirname, 'learned-diagnostics.json'),
      JSON.stringify(LEARNED_DIAGNOSTICS, null, 2)
    );
  } catch (e) {
    console.error('❌ Erreur sauvegarde:', e.message);
  }
}

// ─────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────

// Ping keep-alive (répond 200 sans consommer de tokens)
app.get('/api/ping', (req, res) => res.json({ status: 'ok' }));
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

/**
 * POST /api/chat — Chat principal via Groq (Llama)
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, systemPrompt, conversationHistory } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message requis' });
    }

    // Ignorer les pings
    if (message === '__ping__') {
      return res.json({ response: 'pong' });
    }

    const messages = [];

    // System prompt
    const defaultSystem = `Tu es un assistant virtuel de ZENOCCAZ et un mecanicien expert automobile.
Tu diagnostiques comme un vrai mecano : tu fais tester avant d'acheter quoi que ce soit.
Tu proposes toujours l'etape la plus simple et gratuite en premier.
Tu ne mentionnes JAMAIS turbo, injecteur ou pieces couteuses tant que les verifications gratuites n'ont pas ete faites.`;

    messages.push({ role: 'system', content: systemPrompt || defaultSystem });

    // Historique
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        if (msg.role && msg.content) {
          messages.push({ role: msg.role, content: msg.content });
        }
      });
    } else {
      messages.push({ role: 'user', content: message });
    }

    // Si question de connaissance → enrichir avec recherche web
    let webContext = '';
    if (isKnowledgeQuestion(message)) {
      console.log('🔍 Question de connaissance détectée, recherche web...');
      const searchResult = await searchWeb(message);
      if (searchResult) {
        webContext = '\n\nINFO TROUVEE SUR LE WEB (utilise ces infos pour repondre avec precision) :\n' + searchResult;
        // Enrichir le system prompt avec le contexte web
        if (messages[0] && messages[0].role === 'system') {
          messages[0].content += webContext;
        }
        console.log('✅ Contexte web injecté:', searchResult.substring(0, 100));
      }
    }

    const data = await callGroq(messages, 1024);
    const reply = data.choices?.[0]?.message?.content || 'Désolé, pas de réponse.';

    res.json({ response: reply });

  } catch (error) {
    console.error('❌ /api/chat error:', error?.message);
    res.status(500).json({ error: 'Erreur serveur', details: error?.message });
  }
});

/**
 * POST /api/analyze-photo — Analyse photo via Groq LLaVA (vision, gratuit)
 * Body: { base64: string, mediaType: string, context: string }
 */
app.post('/api/analyze-photo', async (req, res) => {
  try {
    const { base64, mediaType, context } = req.body;

    if (!base64) {
      return res.status(400).json({ error: 'Image base64 requise' });
    }

    console.log(`📸 Analyse photo LLaVA - contexte: "${(context || '').substring(0, 50)}"`);

    const systemPrompt = `Tu es un mecanicien expert automobile qui analyse des photos de pieces de vehicules.
Tu examines chaque detail avec l oeil d un professionnel.
Tu regardes : etat des durites (fissures, fuites, ecrasement), soufflets (dechirures, graisse projetee),
connexions electriques (oxydation, fils abimes), courroies (usure, craquelures),
joints (fuites), niveaux visibles, corrosion, usure generale.
${context ? 'Contexte du probleme signale par le client : ' + context : ''}

FORMAT OBLIGATOIRE :
Ce que je vois : [description precise de tout ce qui est visible]
Etat general : [bon / moyen / mauvais / critique]
Problemes detectes : [liste precise, meme les petits details]
Ce qui semble OK : [ce qui a l air en bon etat]
Recommandation : [action a faire, du plus urgent au moins urgent]
Cout estime : [fourchette realiste ou "rien a faire"]`;

    const imageUrl = `data:${mediaType || 'image/jpeg'};base64,${base64}`;

    const data = await httpPost(
      'api.groq.com',
      '/openai/v1/chat/completions',
      { Authorization: `Bearer ${GROQ_API_KEY}` },
      {
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl } },
              {
                type: 'text',
                text: systemPrompt + '\n\nAnalyse cette photo comme un mecanicien expert et dis-moi tout ce que tu vois.'
              }
            ]
          }
        ],
        max_tokens: 1024,
        temperature: 0.3
      }
    );

    const reply = data.choices?.[0]?.message?.content || 'Impossible d analyser la photo.';
    console.log('✅ Analyse photo OK:', reply.substring(0, 80) + '...');
    res.json({ response: reply });

  } catch (error) {
    console.error('❌ /api/analyze-photo error:', error?.message);
    res.status(500).json({
      error: 'Analyse photo indisponible',
      details: error?.message
    });
  }
});


/**
 * POST /api/save-diagnosis — Enregistre un diagnostic appris
 */
app.post('/api/save-diagnosis', (req, res) => {
  try {
    const { symptom, diagnosis, fuelType, vehicleInfo } = req.body;
    if (!symptom || !diagnosis) {
      return res.status(400).json({ error: 'symptom et diagnosis requis' });
    }
    saveLearningFeedback(symptom, diagnosis, fuelType, vehicleInfo || {});
    res.json({ success: true, totalLearned: LEARNED_DIAGNOSTICS.length });
  } catch (error) {
    res.status(500).json({ error: 'Erreur', details: error?.message });
  }
});

/**
 * GET /api/learned-diagnostics — Liste les diagnostics appris
 */
app.get('/api/learned-diagnostics', (req, res) => {
  try {
    const { symptom, fuelType } = req.query;
    if (symptom) {
      const lower = symptom.toLowerCase();
      const filtered = LEARNED_DIAGNOSTICS.filter(d =>
        d.symptom.toLowerCase().includes(lower) &&
        (!fuelType || !d.fuel_type || d.fuel_type === fuelType)
      ).sort((a, b) => b.confidence_score - a.confidence_score);
      return res.json({ count: filtered.length, diagnostics: filtered });
    }
    res.json({
      count: LEARNED_DIAGNOSTICS.length,
      diagnostics: LEARNED_DIAGNOSTICS.sort((a, b) => b.confidence_score - a.confidence_score)
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur', details: error?.message });
  }
});

// ─────────────────────────────────────────────────────────
// DÉMARRAGE
// ─────────────────────────────────────────────────────────

app.listen(PORT, HOST, () => {
  const isDev = (process.env.NODE_ENV || 'development') !== 'production';
  console.log(`✅ Serveur démarré sur port ${PORT}`);
  console.log(`   Chat (Groq)    : POST /api/chat`);
  console.log(`   Photo (LLaVA)  : POST /api/analyze-photo ✅`);
  console.log(`   Save diagnosis : POST /api/save-diagnosis`);
  console.log(`   Ping keep-alive: GET  /api/ping`);
});