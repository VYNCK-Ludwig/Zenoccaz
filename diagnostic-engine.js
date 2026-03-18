/**
 * DiagnosticEngine v3 - ZENOCCAZ
 * 
 * PHILOSOPHIE :
 * - Plus de base statique détaillée à maintenir
 * - Claude connaît déjà la mécanique auto → on lui fait confiance
 * - Ce fichier ne stocke QUE les retours terrain des vrais clients
 * - Ces retours sont injectés dans le prompt pour prioriser les bons diagnostics
 */

class DiagnosticEngine {
  constructor() {
    this.STORAGE_KEY = 'zenoccaz_terrain_v3';
    this.feedback = this.load();
    console.log(`🧠 DiagnosticEngine v3 — ${this.countTotal()} retours terrain chargés`);
  }

  // ─────────────────────────────────────────────────────────
  // STRUCTURE DES DONNÉES
  // feedback = {
  //   "bruit en virage": {
  //     confirmed: ["soufflet de cardan déchiré", "roulement de roue"],
  //     rejected:  ["filtre à gazole"],
  //     lastSeen:  "2026-03-10"
  //   },
  //   ...
  // }
  // ─────────────────────────────────────────────────────────

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('❌ Erreur chargement terrain:', e);
      return {};
    }
  }

  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.feedback));
    } catch (e) {
      console.error('❌ Erreur sauvegarde terrain:', e);
    }
  }

  // ─────────────────────────────────────────────────────────
  // APPRENTISSAGE
  // ─────────────────────────────────────────────────────────

  /**
   * Enregistre un diagnostic confirmé par un client
   */
  confirm(symptomText, diagnosisName) {
    if (!symptomText || !diagnosisName) return;
    const key = this.normalize(symptomText);

    if (!this.feedback[key]) {
      this.feedback[key] = { confirmed: [], rejected: [], lastSeen: null };
    }

    const entry = this.feedback[key];

    // Incrémenter ou ajouter
    const existing = entry.confirmed.find(d => d.name === diagnosisName);
    if (existing) {
      existing.count++;
    } else {
      entry.confirmed.push({ name: diagnosisName, count: 1 });
    }

    // Trier par count décroissant
    entry.confirmed.sort((a, b) => b.count - a.count);
    entry.lastSeen = new Date().toISOString().split('T')[0];

    this.save();
    console.log(`✅ Confirmé: "${diagnosisName}" pour "${key}" (${existing ? existing.count : 1}x)`);
  }

  /**
   * Enregistre un diagnostic rejeté (mauvaise piste)
   */
  reject(symptomText, diagnosisName) {
    if (!symptomText || !diagnosisName) return;
    const key = this.normalize(symptomText);

    if (!this.feedback[key]) {
      this.feedback[key] = { confirmed: [], rejected: [], lastSeen: null };
    }

    const entry = this.feedback[key];
    const existing = entry.rejected.find(d => d.name === diagnosisName);
    if (existing) {
      existing.count++;
    } else {
      entry.rejected.push({ name: diagnosisName, count: 1 });
    }

    this.save();
    console.log(`❌ Rejeté: "${diagnosisName}" pour "${key}"`);
  }

  // ─────────────────────────────────────────────────────────
  // GÉNÉRATION DU CONTEXTE POUR LE PROMPT
  // ─────────────────────────────────────────────────────────

  /**
   * Trouve les entrées terrain qui correspondent au message
   * et génère un bloc de contexte à injecter dans le prompt Claude
   */
  getContextForPrompt(userMessage) {
    if (Object.keys(this.feedback).length === 0) return '';

    const msgLower = userMessage.toLowerCase();
    const matches = [];

    for (const [key, data] of Object.entries(this.feedback)) {
      // Score de similarité simple basé sur les mots communs
      const keyWords = key.split(' ').filter(w => w.length > 3);
      const matchCount = keyWords.filter(w => msgLower.includes(w)).length;
      if (matchCount > 0 && data.confirmed.length > 0) {
        matches.push({ key, data, score: matchCount });
      }
    }

    if (matches.length === 0) return '';

    // Trier par pertinence
    matches.sort((a, b) => b.score - a.score);
    const top = matches.slice(0, 3);

    let context = `\n\n📊 RETOURS TERRAIN ZENOCCAZ (vrais clients) :\n`;
    context += `Ces diagnostics ont été CONFIRMÉS par nos clients pour des symptômes similaires :\n`;

    for (const { key, data } of top) {
      const topConfirmed = data.confirmed.slice(0, 3);
      if (topConfirmed.length === 0) continue;

      context += `\nSymptôme similaire : "${key}"\n`;
      for (const d of topConfirmed) {
        context += `  ✅ "${d.name}" — confirmé ${d.count} fois\n`;
      }

      if (data.rejected.length > 0) {
        const topRejected = data.rejected.slice(0, 2);
        context += `  ❌ À éviter : ${topRejected.map(d => `"${d.name}"`).join(', ')}\n`;
      }
    }

    context += `\nUtilise ces retours pour PRIORISER tes suggestions, mais reste libre de proposer autre chose si le contexte est différent.`;
    return context;
  }

  // ─────────────────────────────────────────────────────────
  // UTILITAIRES
  // ─────────────────────────────────────────────────────────

  normalize(text) {
    return text.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .substring(0, 60);
  }

  countTotal() {
    let total = 0;
    for (const entry of Object.values(this.feedback)) {
      total += entry.confirmed.reduce((s, d) => s + d.count, 0);
    }
    return total;
  }

  getStats() {
    return {
      symptomsCatalogued: Object.keys(this.feedback).length,
      totalConfirmations: this.countTotal(),
      topSymptoms: Object.entries(this.feedback)
        .sort((a, b) => b[1].confirmed.reduce((s,d) => s+d.count,0) - a[1].confirmed.reduce((s,d) => s+d.count,0))
        .slice(0, 5)
        .map(([key, data]) => ({
          symptom: key,
          topDiagnosis: data.confirmed[0]?.name || 'aucun',
          count: data.confirmed[0]?.count || 0
        }))
    };
  }

  /**
   * Export JSON de toute la base (pour backup ou debug)
   */
  export() {
    return JSON.stringify(this.feedback, null, 2);
  }

  /**
   * Import JSON (pour restaurer ou partager entre appareils)
   */
  import(jsonString) {
    try {
      this.feedback = JSON.parse(jsonString);
      this.save();
      console.log('✅ Base importée:', Object.keys(this.feedback).length, 'symptômes');
      return true;
    } catch (e) {
      console.error('❌ Erreur import:', e);
      return false;
    }
  }
}

window.DiagnosticEngine = DiagnosticEngine;