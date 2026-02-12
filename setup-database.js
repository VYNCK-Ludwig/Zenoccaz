#!/usr/bin/env node
/**
 * Script pour initialiser automatiquement toutes les tables Supabase
 * Usage: node setup-database.js
 */

import { autoTable } from './auto-table.js';

async function setupAllTables() {
  console.log('🚀 Configuration automatique de la base de données Supabase\n');
  
  // Données de test pour chaque table
  const tables = [
    {
      name: 'vehicles',
      data: {
        make: 'Peugeot',
        model: '208',
        year: '2020',
        price: 15000,
        description: 'Véhicule de démonstration',
        image: null
      }
    },
    {
      name: 'contacts',
      data: {
        name: 'Jean Dupont',
        first_name: 'Jean',
        last_name: 'Dupont',
        email: 'jean.dupont@example.com',
        phone: '+33612345678',
        address: '123 rue de Paris',
        plates: ['AB-123-CD']
      }
    },
    {
      name: 'pieces',
      data: {
        name: 'Filtre à huile',
        reference: 'FO-2020-P',
        price: 25.99,
        stock: 50
      }
    },
    {
      name: 'parrainages',
      data: {
        parrain: 'Marie Martin',
        parrain_email: 'marie@example.com',
        filleul: 'Paul Durand',
        status: 'Actif',
        commission: 50
      }
    },
    {
      name: 'finances',
      data: {
        description: 'Vente véhicule Peugeot 208',
        type: 'revenue',
        amount: 15000,
        category: 'vehicle'
      }
    },
    {
      name: 'events',
      data: {
        client: 'Sophie Bernard',
        vehicle: 'Peugeot 208 2020',
        price: 15000,
        status: 'Complétée'
      }
    },
    {
      name: 'tasks',
      data: {
        title: 'Révision annuelle',
        description: 'Effectuer la révision complète du véhicule',
        priority: 'Haute',
        status: 'À faire',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    },
    {
      name: 'zenscan_requests',
      data: {
        contact_id: null,
        services: ['Diagnostic complet', 'Contrôle freins'],
        breakdown: 'Diagnostic: 50€, Freins: 30€',
        total: '80',
        dest: 'diagnostic'
      }
    }
  ];
  
  let success = 0;
  let failed = 0;
  
  for (const table of tables) {
    console.log(`\n${'═'.repeat(60)}`);
    try {
      await autoTable(table.name, table.data);
      success++;
    } catch (error) {
      console.error(`❌ Erreur pour ${table.name}:`, error.message);
      failed++;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`\n📊 Résumé:`);
  console.log(`   ✅ Réussi: ${success}`);
  console.log(`   ❌ Échoué: ${failed}`);
  console.log(`   📝 Total: ${tables.length}\n`);
  
  if (failed > 0) {
    console.log('⚠️  Certaines tables n\'ont pas pu être créées automatiquement.');
    console.log('💡 Exécutez manuellement le fichier supabase-schema.sql dans Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/zxnnzpzujmjzhnfqndle/sql\n');
  }
}

setupAllTables().catch(console.error);
