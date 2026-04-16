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

try {
  const learnedPath = path.join(__dirname, 'learned-diagnostics.json');
  if (fs.existsSync(learnedPath)) {
    const data = fs.readFileSync(learnedPath, 'utf-8');
    LEARNED_DIAGNOSTICS = JSON.parse(data);
    console.log('Charge ' + LEARNED_DIAGNOSTICS.length + ' diagnostics appris');
  }
} catch (e) {
  console.warn('Impossible de charger learned-diagnostics.json:', e.message);
  LEARNED_DIAGNOSTICS = [];
}

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static('.'));

const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();
if (!GROQ_API_KEY) { console.error('GROQ_API_KEY manquante'); process.exit(1); }

// ─────────────────────────────────────────────────────────
// HELPERS HTTP
// ─────────────────────────────────────────────────────────

function httpPost(hostname, urlPath, headers, body) {
  return new Promise(function(resolve, reject) {
    const bodyStr = JSON.stringify(body);
    const req = https.request({
      hostname: hostname,
      path: urlPath,
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) }, headers),
    }, function(res) {
      let data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode < 200 || res.statusCode >= 300) {
            const err = new Error('HTTP ' + res.statusCode);
            err.details = parsed;
            return reject(err);
          }
          resolve(parsed);
        } catch (e) {
          reject(new Error('JSON parse error: ' + data.substring(0, 200)));
        }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function callGroq(messages, maxTokens) {
  maxTokens = maxTokens || 1024;
  return httpPost('api.groq.com', '/openai/v1/chat/completions',
    { Authorization: 'Bearer ' + GROQ_API_KEY },
    { model: 'llama-3.3-70b-versatile', messages: messages, max_tokens: maxTokens, temperature: 0.7 }
  );
}

function getSerpApiKey() {
  return (process.env.SERPAPI_KEY || process.env['SERPAPI-KEY'] || '').trim();
}

function httpGet(hostname, urlPath) {
  return new Promise(function(resolve, reject) {
    const req = https.request({ hostname: hostname, path: urlPath, method: 'GET' }, function(res) {
      let data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────
// RECHERCHE WEB
// ─────────────────────────────────────────────────────────

async function searchWeb(query) {
  const key = getSerpApiKey();
  if (!key) { console.warn('SERPAPI_KEY manquante'); return null; }
  console.log('SERPAPI_KEY found:', key.substring(0, 8) + '...');
  try {
    const encoded = encodeURIComponent(query);
    const result = await httpGet('serpapi.com', '/search.json?q=' + encoded + '&hl=fr&gl=fr&api_key=' + key + '&num=3');
    if (!result || !result.organic_results) return null;
    const snippets = result.organic_results.slice(0, 3).map(function(r) {
      return (r.title ? r.title + ' : ' : '') + (r.snippet || '');
    }).filter(Boolean).join(' | ');
    console.log('SerpApi resultat:', snippets.substring(0, 150));
    return snippets || null;
  } catch (e) {
    console.warn('searchWeb echoue:', e.message);
    return null;
  }
}

async function searchBuyLinks(query) {
  const key = getSerpApiKey();
  if (!key) return null;
  try {
    const ref = extractPartRef(query);
    const searchQuery = ref
      ? ref + ' piece detachee auto oscaro autodoc mister-auto ebay leboncoin amazon'
      : query + ' acheter piece auto oscaro autodoc mister-auto ebay';
    const encoded = encodeURIComponent(searchQuery);
    const result = await httpGet('serpapi.com', '/search.json?q=' + encoded + '&hl=fr&gl=fr&api_key=' + key + '&num=8');
    if (!result || !result.organic_results) return null;
    const links = result.organic_results.slice(0, 4).map(function(r) {
      return '- ' + r.title + ' : ' + r.link;
    }).filter(Boolean).join('\n');
    console.log('Liens achat trouves:', links.substring(0, 200));
    return links || null;
  } catch(e) {
    console.warn('searchBuyLinks echoue:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// DETECTION TYPE DE QUESTION
// ─────────────────────────────────────────────────────────

function extractPartRef(message) {
  // Format "MARQUE - REF" ou "MARQUE REF" ex: "MAPCO - 95930", "BOSCH AR 801 S"
  const brandRef = message.match(/([A-Z]{2,})\s*[-]?\s*([A-Z0-9][\sA-Z0-9]{2,})/i);
  if (brandRef) return (brandRef[1] + ' ' + brandRef[2]).trim();
  // Référence numérique seule 4+ chiffres
  const numRef = message.match(/\b\d{4,}\b/);
  if (numRef) return numRef[0];
  // Référence alphanumérique 5+ caractères
  const alphaRef = message.match(/\b[a-z0-9]{5,}[a-z0-9\-]*\b/i);
  return alphaRef ? alphaRef[0].trim() : null;
}

function isKnowledgeQuestion(message) {
  const lower = message.toLowerCase();
  if (extractPartRef(message)) return true;
  const patterns = [
    "a quoi sert", "c est quoi", "quest ce que", "comment fonctionne",
    "explique", "kesako", "role de", "fonction de", "definition",
    "ca sert a quoi", "a quoi ca sert", "reference", "capteur",
    "vanne", "module", "calculateur", "boitier", "relais", "fusible",
    "sonde", "debimetre", "injecteur", "numero de serie", "correspond a"
  ];
  return patterns.some(function(p) { return lower.includes(p); });
}

function isBuyQuestion(message) {
  const lower = message.toLowerCase();
  const patterns = [
    "trouver", "acheter", "commander", "ou trouver", "ou acheter",
    "prix de", "combien coute", "trouver une", "acheter une",
    "piece neuve", "piece occasion", "ou la trouver", "ou la commander",
    "trouve moi", "cherche moi"
  ];
  return patterns.some(function(p) { return lower.includes(p); });
}

function buildSearchQuery(message) {
  const ref = extractPartRef(message);
  if (ref) return '"' + ref + '" piece auto';
  return message + ' automobile';
}

function isDiagnosticQuestion(message) {
  const lower = message.toLowerCase();
  const patterns = [
    'ne demarre pas', 'ne marche pas', 'ne fonctionne pas', 'ne s allume pas',
    'panne', 'probleme', 'bruit', 'voyant', 'fuite', 'fumee', 'claque',
    'grille', 'hs', 'mort', 'ne repond pas', 'chauffe', 'surchauffe',
    'pompe', 'injection', 'vp37', 'vp44', 'purge', 'amorce', 'amorçage',
    'court circuit', 'fusible', 'relais', 'capteur', 'sonde', 'debimetre',
    'calculateur', 'turbo', 'embrayage', 'boite', 'differentiel', 'amortisseur',
    'frein', 'disque', 'plaquette', 'roulement', 'distribution', 'courroie',
    'comment faire', 'comment changer', 'comment remplacer', 'comment purger',
    'comment regler', 'comment brancher', 'quelle difference', 'quel est le role'
  ];
  return patterns.some(function(p) { return lower.includes(p); });
}

function buildDiagnosticSearchQuery(message, vehicleInfo) {
  vehicleInfo = vehicleInfo || {};

  // Extraire les mots clés techniques du message (pièce, symptôme, action)
  const tech = message.replace(/[^a-zA-Z0-9àâéèêëîïôùûüç\s]/g, ' ').trim();

  // Détecter si le message mentionne explicitement une pièce avec référence constructeur
  // Si oui → chercher sur la pièce seule, pas sur le véhicule (évite Fiat + VP37 qui est une pompe VW)
  const partRefs = ['VP37','VP44','VE','Lucas','Delphi','Bosch','Denso','Siemens','Pierburg','Valeo','Wabco','Hella'];
  const hasBrandedPart = partRefs.some(function(ref) { return message.toUpperCase().includes(ref); });

  if (hasBrandedPart) {
    // Chercher sur la pièce référencée seule — sans le véhicule
    return tech + ' diagnostic technique réparation';
  }

  // Sinon combiner véhicule + symptôme
  const vehicle = [vehicleInfo.brand, vehicleInfo.model, vehicleInfo.year].filter(Boolean).join(' ');
  return (vehicle ? vehicle + ' ' : '') + tech + ' panne diagnostic';
}

// ─────────────────────────────────────────────────────────
// APPRENTISSAGE
// ─────────────────────────────────────────────────────────

function saveLearningFeedback(symptom, diagnosis, fuelType, vehicleInfo) {
  vehicleInfo = vehicleInfo || {};
  const existing = LEARNED_DIAGNOSTICS.find(function(d) {
    return d.symptom.toLowerCase() === symptom.toLowerCase() && d.diagnosis.toLowerCase() === diagnosis.toLowerCase();
  });
  if (existing) {
    existing.validation_count = (existing.validation_count || 1) + 1;
    existing.confidence_score = Math.min(10, existing.validation_count);
    existing.updated_at = new Date().toISOString();
    console.log('Diagnostic renforce: "' + symptom + '" -> "' + diagnosis + '" (' + existing.confidence_score + '/10)');
  } else {
    LEARNED_DIAGNOSTICS.push({
      id: Date.now(),
      created_at: new Date().toISOString(),
      symptom: symptom,
      diagnosis: diagnosis,
      fuel_type: fuelType,
      vehicle_brand: vehicleInfo.brand,
      vehicle_model: vehicleInfo.model,
      vehicle_year: vehicleInfo.year,
      validation_count: 1,
      confidence_score: 1
    });
    console.log('Nouveau diagnostic appris: "' + symptom + '" -> "' + diagnosis + '"');
  }
  try {
    fs.writeFileSync(path.join(__dirname, 'learned-diagnostics.json'), JSON.stringify(LEARNED_DIAGNOSTICS, null, 2));
  } catch (e) {
    console.error('Erreur sauvegarde:', e.message);
  }
}

// ─────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────

app.get('/api/ping', function(req, res) { res.json({ status: 'ok' }); });

// ─────────────────────────────────────────────────────────
// PROFIL TECHNIQUE VEHICULE
// ─────────────────────────────────────────────────────────
app.post('/api/vehicle-profile', async function(req, res) {
  try {
    const { brand, model, year, engine, fuelType } = req.body;
    if (!brand && !model) return res.json({ profile: null });

    const vehicle = [brand, model, year, engine, fuelType].filter(Boolean).join(' ');
    const query = vehicle + ' fiche technique pompe injection turbo distribution alternateur démarreur';

    console.log('Recherche profil véhicule:', query);
    const searchResult = await searchWeb(query);

    if (!searchResult) return res.json({ profile: null });

    // Demander à l'IA de structurer les infos techniques
    const messages = [
      { role: 'system', content: `Tu es une base de données automobile technique. 
À partir des infos web fournies, extrais UNIQUEMENT les informations techniques certaines sur ce véhicule.
Réponds en JSON avec ce format exact (null si inconnu) :
{
  "injection": "type et marque de pompe/système injection",
  "turbo": "référence turbo si diesel",
  "distribution": "courroie ou chaîne, intervalle km",
  "carburant": "diesel/essence/hybride",
  "moteur": "cylindrée, puissance, code moteur",
  "points_faibles": ["liste des points faibles connus sur ce véhicule"],
  "pieces_surveillance": ["pièces à surveiller en priorité"]
}
Ne mets que ce dont tu es certain. null sinon.` },
      { role: 'user', content: 'Véhicule: ' + vehicle + '\n\nInfos web:\n' + searchResult }
    ];

    const data = await callGroq(messages, 600);
    const raw = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';

    // Parser le JSON
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const profile = JSON.parse(jsonMatch[0]);
        console.log('Profil véhicule construit:', JSON.stringify(profile).substring(0, 200));
        return res.json({ profile, vehicle });
      } catch(e) {}
    }
    res.json({ profile: null, raw });
  } catch(e) {
    console.error('vehicle-profile error:', e.message);
    res.json({ profile: null });
  }
});
app.get('/health', function(req, res) { res.json({ status: 'OK', timestamp: new Date().toISOString() }); });

app.post('/api/chat', async function(req, res) {
  try {
    const message = req.body.message;
    const systemPrompt = req.body.systemPrompt;
    const conversationHistory = req.body.conversationHistory;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message requis' });
    }
    if (message === '__ping__') return res.json({ response: 'pong' });

    const messages = [];
    const defaultSystem = 'Tu es un assistant virtuel de ZENOCCAZ et un mecanicien expert automobile. Tu diagnostiques comme un vrai mecano : tu fais tester avant d\'acheter quoi que ce soit. Tu proposes toujours l\'etape la plus simple et gratuite en premier.';
    messages.push({ role: 'system', content: systemPrompt || defaultSystem });

    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      conversationHistory.forEach(function(msg) {
        if (msg.role && msg.content) messages.push({ role: msg.role, content: msg.content });
      });
    } else {
      messages.push({ role: 'user', content: message });
    }

    // Infos véhicule depuis le body (mode diagnostic)
    const vehicleInfo = req.body.vehicleInfo || {};
    const isDiagMode = req.body.diagMode === true;

    // Recherche web selon le type de question
    if (isBuyQuestion(message)) {
      console.log('Question achat detectee, recherche liens...');
      const buyLinks = await searchBuyLinks(message);
      if (buyLinks && messages[0] && messages[0].role === 'system') {
        messages[0].content += '\n\nLIENS ACHAT TROUVES SUR LE WEB (presente ces 4 liens a l\'utilisateur avec le nom du site et l\'URL complete pour qu\'il puisse acheter la piece) :\n' + buyLinks;
        console.log('Liens achat injectes');
      }
    } else if (isDiagMode || isDiagnosticQuestion(message)) {
      console.log('Question diagnostic detectee, recherche web technique...');
      const diagQuery = buildDiagnosticSearchQuery(message, vehicleInfo);
      const searchResult = await searchWeb(diagQuery);
      if (searchResult && messages[0] && messages[0].role === 'system') {
        messages[0].content += '\n\nINFORMATIONS TECHNIQUES TROUVEES SUR LE WEB — utilise ces infos pour enrichir ta réponse et éviter toute erreur technique. Si ces infos contredisent ce que tu pensais, fie-toi aux infos web :\n' + searchResult;
        console.log('Contexte diagnostic web injecte:', searchResult.substring(0, 150));
      }
    } else if (isKnowledgeQuestion(message)) {
      console.log('Question de connaissance detectee, recherche web...');
      const searchResult = await searchWeb(buildSearchQuery(message));
      if (searchResult && messages[0] && messages[0].role === 'system') {
        messages[0].content += '\n\nINFO TROUVEE SUR LE WEB - UTILISE CES INFORMATIONS OBLIGATOIREMENT pour repondre. Ne dis JAMAIS que tu ne peux pas trouver si ces infos sont presentes :\n' + searchResult + '\n\nTu DOIS utiliser ces informations pour repondre directement sans dire de verifier ailleurs.';
        console.log('Contexte web injecte:', searchResult.substring(0, 100));
      }
    }

    const data = await callGroq(messages, 1024);
    const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || 'Desole, pas de reponse.';
    res.json({ response: reply });

  } catch (error) {
    console.error('/api/chat error:', error && error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error && error.message });
  }
});

app.post('/api/analyze-photo', async function(req, res) {
  try {
    const base64 = req.body.base64;
    const mediaType = req.body.mediaType;
    const context = req.body.context || '';

    if (!base64) return res.status(400).json({ error: 'Image base64 requise' });
    console.log('Analyse photo - contexte: "' + context.substring(0, 50) + '"');

    const systemPrompt = 'Tu es un mecanicien expert automobile qui analyse des photos de pieces de vehicules.\n'
      + 'Tu examines chaque detail avec l\'oeil d\'un professionnel.\n'
      + 'Tu regardes : etat des durites (fissures, fuites, ecrasement), soufflets (dechirures, graisse projetee),\n'
      + 'connexions electriques (oxydation, fils abimes), courroies (usure, craquelures),\n'
      + 'joints (fuites), niveaux visibles, corrosion, usure generale.\n'
      + (context ? 'Contexte du probleme signale par le client : ' + context + '\n' : '')
      + '\nFORMAT OBLIGATOIRE :\n'
      + 'Ce que je vois : [description precise de tout ce qui est visible]\n'
      + 'Etat general : [bon / moyen / mauvais / critique]\n'
      + 'Problemes detectes : [liste precise, meme les petits details]\n'
      + 'Ce qui semble OK : [ce qui a l\'air en bon etat]\n'
      + 'Recommandation : [action a faire, du plus urgent au moins urgent]\n'
      + 'Cout estime : [fourchette realiste ou "rien a faire"]';

    const imageUrl = 'data:' + (mediaType || 'image/jpeg') + ';base64,' + base64;

    const data = await httpPost('api.groq.com', '/openai/v1/chat/completions',
      { Authorization: 'Bearer ' + GROQ_API_KEY },
      {
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: systemPrompt + '\n\nAnalyse cette photo comme un mecanicien expert et dis-moi tout ce que tu vois.' }
          ]
        }],
        max_tokens: 1024,
        temperature: 0.3
      }
    );

    const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || 'Impossible d\'analyser la photo.';
    console.log('Analyse photo OK:', reply.substring(0, 80) + '...');
    res.json({ response: reply });

  } catch (error) {
    console.error('/api/analyze-photo error:', error && error.message);
    res.status(500).json({ error: 'Analyse photo indisponible', details: error && error.message });
  }
});

app.post('/api/save-diagnosis', function(req, res) {
  try {
    const symptom = req.body.symptom;
    const diagnosis = req.body.diagnosis;
    const fuelType = req.body.fuelType;
    const vehicleInfo = req.body.vehicleInfo;
    if (!symptom || !diagnosis) return res.status(400).json({ error: 'symptom et diagnosis requis' });
    saveLearningFeedback(symptom, diagnosis, fuelType, vehicleInfo || {});
    res.json({ success: true, totalLearned: LEARNED_DIAGNOSTICS.length });
  } catch (error) {
    res.status(500).json({ error: 'Erreur', details: error && error.message });
  }
});

app.get('/api/learned-diagnostics', function(req, res) {
  try {
    const symptom = req.query.symptom;
    const fuelType = req.query.fuelType;
    if (symptom) {
      const lower = symptom.toLowerCase();
      const filtered = LEARNED_DIAGNOSTICS.filter(function(d) {
        return d.symptom.toLowerCase().includes(lower) && (!fuelType || !d.fuel_type || d.fuel_type === fuelType);
      }).sort(function(a, b) { return b.confidence_score - a.confidence_score; });
      return res.json({ count: filtered.length, diagnostics: filtered });
    }
    res.json({
      count: LEARNED_DIAGNOSTICS.length,
      diagnostics: LEARNED_DIAGNOSTICS.sort(function(a, b) { return b.confidence_score - a.confidence_score; })
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur', details: error && error.message });
  }
});

// ─────────────────────────────────────────────────────────
// ESTIMATION REPRISE — Recherche prix marché réel
// ─────────────────────────────────────────────────────────

app.post('/api/estimation-reprise', async function(req, res) {
  try {
    const { marque, modele, annee, km, carburant, boite, etat, motorisation, finition, ch } = req.body;

    if (!marque || !modele || !annee || !km) {
      return res.status(400).json({ error: 'marque, modele, annee, km requis' });
    }

    console.log('Estimation reprise:', marque, modele, annee, km + 'km');

    // Construire la requête de recherche ciblée sur les sites de vente auto français
    const kmInt = parseInt(km);
    const kmApprox = Math.round(kmInt / 10000) * 10000;
    const finitionStr = finition ? finition + ' ' : '';
    const motStr = motorisation ? motorisation + ' ' : '';
    // Requêtes multiples pour avoir des prix réels dans les snippets
    const searchQuery = `${marque} ${modele} ${annee} ${finitionStr}${motStr}occasion prix €`;

    // Recherche SerpAPI
    let searchResults = null;
    const key = getSerpApiKey();
    if (key) {
      try {
        const encoded = encodeURIComponent(searchQuery);
        const result = await httpGet('serpapi.com',
          '/search.json?q=' + encoded + '&hl=fr&gl=fr&api_key=' + key + '&num=8'
        );
        if (result && result.organic_results) {
          searchResults = result.organic_results.slice(0, 6).map(function(r) {
            return (r.title || '') + ' | ' + (r.snippet || '') + ' | ' + (r.link || '');
          }).join('\n');
          console.log('Résultats recherche:', searchResults.substring(0, 300));
        }
      } catch(e) {
        console.warn('SerpAPI estimation echoue:', e.message);
      }
    }

    // Demander à Groq d'analyser les résultats et estimer le prix
    const vehicleDesc = [
      marque, modele, annee,
      km + ' km',
      carburant || '',
      boite || '',
      motorisation || '',
      finition || '',
      ch ? ch + ' ch' : '',
      etat ? 'état: ' + etat : ''
    ].filter(Boolean).join(', ');

    const systemPrompt = `Tu es un expert en cote automobile française avec accès aux données de marché réelles.
Ta mission : estimer le PRIX DE VENTE réaliste de ce véhicule tel qu'il serait vendu sur LeBonCoin ou La Centrale AUJOURD'HUI.

MÉTHODE OBLIGATOIRE :
1. Analyse les annonces présentes dans les résultats web fournis
2. Extrait les prix RÉELS mentionnés dans ces annonces (cherche les chiffres suivis de € ou euros)
3. Calcule la médiane de ces prix réels
4. Ajuste selon le kilométrage EXACT du véhicule à estimer vs les annonces de référence :
   - Chaque 10 000 km de moins = +1.5% sur le prix médian
   - Chaque 10 000 km de plus = -1.5% sur le prix médian
5. Ajuste selon l'état : excellent=+5%, tres_bon=0%, bon=-5%, correct=-20%, a_reparer=-60%

IMPORTANT : 
- Si tu vois des prix dans les résultats web, BASE-TOI OBLIGATOIREMENT sur ces prix réels
- Ne jamais inventer des prix si des annonces réelles sont disponibles
- Le prix de reprise = prix de vente estimé - 12%
- prix_marche_min et prix_marche_max = fourchette de VENTE (ce qu'un particulier demanderait)
- est_min, est_max, est_moy = prix de REPRISE par le garage (12% de moins)

Réponds UNIQUEMENT avec un JSON valide, aucun texte avant ou après :
{
  "est_min": <reprise minimum entier>,
  "est_max": <reprise maximum entier>,
  "est_moy": <reprise médiane entier>,
  "prix_marche_min": <vente particulier minimum>,
  "prix_marche_max": <vente particulier maximum>,
  "nb_annonces_ref": <nombre de prix réels trouvés dans les résultats>,
  "explication": "<cite les prix réels que tu as trouvés dans les annonces et comment tu es arrivé à cette estimation>"
}`;

    const userMsg = searchResults
      ? `VÉHICULE À ESTIMER : ${vehicleDesc}
KILOMÉTRAGE EXACT : ${kmInt.toLocaleString('fr-FR')} km (c'est un critère MAJEUR pour le prix)

ANNONCES TROUVÉES SUR LE MARCHÉ (extrait les prix € que tu vois dans ces résultats) :
${searchResults}

CONSIGNE : 
1. Liste les prix réels que tu vois dans ces annonces
2. Compare le kilométrage de ces annonces avec ${kmInt.toLocaleString('fr-FR')} km
3. Ajuste le prix en conséquence
4. Déduis 12% pour obtenir le prix de reprise garage
Réponds en JSON uniquement.`
      : `VÉHICULE À ESTIMER : ${vehicleDesc}
KILOMÉTRAGE EXACT : ${kmInt.toLocaleString('fr-FR')} km

Aucune annonce trouvée. Donne une estimation réaliste basée sur ta connaissance du marché français actuel pour ce véhicule exact. Le kilométrage est un facteur MAJEUR. Réponds en JSON uniquement.`;

    const data = await callGroq([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMsg }
    ], 600);

    const raw = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    console.log('Groq estimation raw:', raw.substring(0, 200));

    // Parser le JSON
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const estimation = JSON.parse(jsonMatch[0]);
        // Arrondir à 50€
        estimation.est_min = Math.round((estimation.est_min || 0) / 50) * 50;
        estimation.est_max = Math.round((estimation.est_max || 0) / 50) * 50;
        estimation.est_moy = Math.round((estimation.est_moy || 0) / 50) * 50;
        estimation.prix_marche_min = Math.round((estimation.prix_marche_min || 0) / 50) * 50;
        estimation.prix_marche_max = Math.round((estimation.prix_marche_max || 0) / 50) * 50;
        estimation.source = searchResults ? 'web' : 'ia';
        console.log('Estimation OK:', JSON.stringify(estimation));
        return res.json({ success: true, estimation });
      } catch(e) {
        console.error('Parse JSON estimation failed:', e.message, raw.substring(0, 200));
      }
    }

    // Fallback si parsing échoue
    res.json({ success: false, error: 'Parsing estimation échoué', raw });

  } catch(e) {
    console.error('/api/estimation-reprise error:', e.message);
    res.status(500).json({ error: 'Erreur serveur', details: e.message });
  }
});

// ─────────────────────────────────────────────────────────
// DEMARRAGE
// ─────────────────────────────────────────────────────────

app.listen(PORT, HOST, function() {
  console.log('Serveur demarre sur port ' + PORT);
  console.log('   Chat (Groq)    : POST /api/chat');
  console.log('   Photo (LLaVA)  : POST /api/analyze-photo');
  console.log('   Save diagnosis : POST /api/save-diagnosis');
  console.log('   Ping keep-alive: GET  /api/ping');
  console.log('   SerpApi web    : ' + (getSerpApiKey() ? 'OK - ' + getSerpApiKey().substring(0, 8) + '...' : 'CLE MANQUANTE'));
});