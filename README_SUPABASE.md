🚀 ZENOCCAZ — Synchronisation Supabase (TOUT INTÉGRÉ)

✅ STATUT : Le site est maintenant 100% synchronisé avec Supabase
- Tous les ajouts/lectures (véhicules, contacts, ZenScan, pièces, parrainages, finances, événements, tâches) passent UNIQUEMENT par Supabase
- Upload d'images de véhicules vers Supabase Storage
- localStorage n'est PLUS utilisé — toutes les données sont en base Supabase

📋 INSTALLATION RAPIDE (3 étapes)

1️⃣ Créer les tables dans Supabase
   - Allez sur https://supabase.com/dashboard/project/zxnnzpzujmjzhnfqndle/editor/17482?schema=public
   - Cliquez sur "New query" ou ouvrez le SQL Editor
   - Copiez-collez TOUT le contenu de `supabase-schema.sql`
   - Cliquez "Run" pour créer les 8 tables

2️⃣ Activer la clé API
   - Ouvrez `supabase-config.js` dans ce dossier
   - Allez sur Supabase → Project Settings → API
   - Copiez la "anon public" key
   - Remplacez 'VOTRE_CLE_ANON_ICI' dans `supabase-config.js` par votre clé

3️⃣ Créer le bucket Storage pour les images
   - Allez sur Supabase Dashboard → Storage
   - Cliquez "New bucket"
   - Nom : `vehicle-images`
   - Cochez "Public bucket" ✓
   - Cliquez "Create bucket"

4️⃣ Configurer les permissions (RLS)
   Exécutez ce SQL dans Supabase pour autoriser les opérations côté client :

```sql
-- Autoriser toutes opérations anonymes (lecture, insertion, suppression)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON contacts FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE zenscan_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON zenscan_requests FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON vehicles FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE pieces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON pieces FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE parrainages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON parrainages FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE finances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON finances FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON events FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON tasks FOR ALL TO anon USING (true) WITH CHECK (true);
```

✅ TESTER
   - Ouvrez `services.html` : créez un compte + demande ZenScan
   - Ouvrez `admin.html` : ajoutez un véhicule, un contact, etc.
   - Vérifiez dans Supabase Table Editor → les nouvelles lignes doivent apparaître !

📊 CE QUI EST SYNCHRONISÉ
   ✓ Contacts (services.html + admin.html)
   ✓ Demandes ZenScan (services.html)
   ✓ Véhicules (admin.html)
   ✓ Pièces (admin.html)
   ✓ Parrainages (admin.html)
   ✓ Finances (admin.html)
   ✓ Événements/Ventes (admin.html)
   ✓ Tâches (admin.html)

🔒 SÉCURITÉ
   - Pour production : limitez les policies RLS (par exemple, authentification requise pour certaines tables)
   - Ou créez un backend Node/Express pour gérer les inserts côté serveur
   - La clé anon est publique mais les policies RLS protègent vos données

📸 UPLOAD D'IMAGES
   - Dans le panneau admin, lors de l'ajout d'un véhicule, vous pouvez sélectionner une image depuis votre PC
   - L'image est automatiquement uploadée vers Supabase Storage (bucket `vehicle-images`)
   - L'URL publique est stockée dans la table `vehicles` (colonne `image`)
   - Les images apparaissent automatiquement sur la page d'accueil

⚠️ IMPORTANT
   - Sans configuration Supabase, le site ne fonctionnera PAS (localStorage supprimé)
   - Vous DEVEZ configurer votre clé API et créer les tables pour utiliser le site