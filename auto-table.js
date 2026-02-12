#!/usr/bin/env node
/**
 * Utilitaire Node.js pour auto-créer des tables Supabase
 * Usage: node auto-table.js <table_name> <json_data>
 * Exemple: node auto-table.js vehicles '{"make":"Peugeot","model":"208","year":"2020","price":15000}'
 */

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Détermine le type SQL à partir d'une valeur JavaScript
 */
function inferSQLType(value) {
  if (value === null || value === undefined) return 'text';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'bigint' : 'numeric';
  }
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'text[]';
  if (value instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return 'timestamptz';
  }
  if (typeof value === 'object') return 'jsonb';
  return 'text';
}

/**
 * Vérifie si une table existe dans Supabase
 */
async function tableExists(tableName) {
  try {
    const { data, error } = await supabase.rpc('table_exists', { 
      table_name: tableName 
    });
    
    if (error) {
      // Fallback: essayer de sélectionner depuis la table
      const { error: selectError } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);
      
      return !selectError || !selectError.message.includes('does not exist');
    }
    
    return data === true;
  } catch (err) {
    // Méthode alternative via information_schema
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .single();
    
    return !!data && !error;
  }
}

/**
 * Crée une table dans Supabase avec les colonnes adaptées
 */
async function createTable(tableName, dataObject) {
  console.log(`📋 Création de la table "${tableName}"...`);
  
  const columns = Object.entries(dataObject).map(([key, value]) => {
    const sqlType = inferSQLType(value);
    return `${key} ${sqlType}`;
  });
  
  // Ajouter les colonnes système
  columns.unshift('id bigint PRIMARY KEY');
  columns.push('created_at timestamptz DEFAULT now()');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS public.${tableName} (
      ${columns.join(',\n      ')}
    );
  `;
  
  console.log('🔧 SQL:', createTableSQL);
  
  try {
    // Utiliser l'API REST pour exécuter du SQL brut
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ query: createTableSQL })
    });
    
    if (!response.ok) {
      console.error('❌ Erreur création table:', await response.text());
      console.log('\n💡 Solution : Exécutez manuellement ce SQL dans Supabase SQL Editor:');
      console.log(createTableSQL);
      return false;
    }
    
    console.log('✅ Table créée avec succès');
    
    // Créer une policy RLS permissive
    const rlsSQL = `
      ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Allow all operations on ${tableName}" 
      ON ${tableName} FOR ALL TO anon 
      USING (true) 
      WITH CHECK (true);
    `;
    
    const rlsResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ query: rlsSQL })
    });
    
    if (rlsResponse.ok) {
      console.log('🔒 Policies RLS créées');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('\n💡 Solution : Exécutez manuellement ce SQL dans Supabase SQL Editor:');
    console.log(createTableSQL);
    return false;
  }
}

/**
 * Insère des données dans une table
 */
async function insertData(tableName, dataObject) {
  console.log(`📝 Insertion dans "${tableName}"...`);
  
  // Ajouter un ID et timestamp si non présents
  const record = {
    id: dataObject.id || Date.now(),
    ...dataObject,
    created_at: dataObject.created_at || new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from(tableName)
    .insert([record])
    .select();
  
  if (error) {
    console.error('❌ Erreur insertion:', error.message);
    return null;
  }
  
  console.log('✅ Données insérées:', data);
  return data;
}

/**
 * Fonction principale
 */
async function main(tableName, dataObject) {
  console.log('\n🚀 Auto-Table Supabase\n');
  console.log('Table:', tableName);
  console.log('Données:', dataObject);
  console.log('\n' + '─'.repeat(50) + '\n');
  
  // Étape 1: Vérifier si la table existe
  const exists = await tableExists(tableName);
  console.log(`🔍 Table "${tableName}" existe:`, exists ? '✅' : '❌');
  
  // Étape 2: Créer la table si nécessaire
  if (!exists) {
    const created = await createTable(tableName, dataObject);
    if (!created) {
      console.log('\n⚠️  La table doit être créée manuellement dans Supabase.');
      console.log('Allez sur: https://supabase.com/dashboard/project/zxnnzpzujmjzhnfqndle/sql');
      process.exit(1);
    }
    
    // Attendre un peu que la table soit bien créée
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Étape 3: Insérer les données
  const result = await insertData(tableName, dataObject);
  
  if (result) {
    console.log('\n✨ Opération terminée avec succès !');
  } else {
    console.log('\n❌ Échec de l\'insertion');
    process.exit(1);
  }
}

// CLI: Lire les arguments
if (import.meta.url === `file://${process.argv[1]}`) {
  const tableName = process.argv[2];
  const jsonData = process.argv[3];
  
  if (!tableName || !jsonData) {
    console.error('Usage: node auto-table.js <table_name> <json_data>');
    console.error('Exemple: node auto-table.js vehicles \'{"make":"Peugeot","model":"208","year":"2020","price":15000}\'');
    process.exit(1);
  }
  
  try {
    const dataObject = JSON.parse(jsonData);
    await main(tableName, dataObject);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

// Export pour utilisation programmatique
export { tableExists, createTable, insertData, main as autoTable };
