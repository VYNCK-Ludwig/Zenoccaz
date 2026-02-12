# 🚀 Guide de configuration Supabase - ZENOCCAZ

## ⚠️ PROBLÈME : Les véhicules n'apparaissent pas ?

Suivez ces étapes dans l'ordre :

---

## 1️⃣ Vérifier la console du navigateur

1. Ouvrez votre site en mode admin : `http://127.0.0.1:5500/admin.html`
2. Appuyez sur **F12** pour ouvrir les DevTools
3. Allez dans l'onglet **Console**
4. Essayez d'ajouter un véhicule
5. Cherchez des erreurs en rouge (comme `relation "public.vehicles" does not exist`)

---

## 2️⃣ Créer les tables Supabase

### Étape A : Aller dans le SQL Editor
1. Ouvrez : https://supabase.com/dashboard/project/zxnnzpzujmjzhnfqndle/sql
2. Cliquez sur **"New query"** ou **"+"**

### Étape B : Copier-coller le schéma complet
1. Ouvrez le fichier `supabase-schema.sql` dans VS Code
2. Sélectionnez **TOUT** le contenu (Ctrl+A)
3. Copiez (Ctrl+C)
4. Collez dans le SQL Editor de Supabase
5. Cliquez sur **"Run"** (ou Ctrl+Enter)

✅ Vous devriez voir : `Success. No rows returned`

---

## 3️⃣ Créer le bucket Storage pour les images

1. Allez sur : https://supabase.com/dashboard/project/zxnnzpzujmjzhnfqndle/storage/buckets
2. Cliquez sur **"New bucket"**
3. Nom du bucket : `vehicle-images`
4. ✅ **Cochez "Public bucket"** (important !)
5. Cliquez sur **"Create bucket"**

---

## 4️⃣ Configurer les permissions (RLS)

Retournez dans le SQL Editor et exécutez ce SQL :

```sql
-- Autoriser toutes opérations anonymes sur vehicles
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on vehicles" 
ON vehicles FOR ALL TO anon 
USING (true) 
WITH CHECK (true);

-- Autoriser toutes opérations anonymes sur contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on contacts" 
ON contacts FOR ALL TO anon 
USING (true) 
WITH CHECK (true);

-- Autoriser toutes opérations anonymes sur zenscan_requests
ALTER TABLE zenscan_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on zenscan_requests" 
ON zenscan_requests FOR ALL TO anon 
USING (true) 
WITH CHECK (true);

-- Autoriser toutes opérations anonymes sur pieces
ALTER TABLE pieces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on pieces" 
ON pieces FOR ALL TO anon 
USING (true) 
WITH CHECK (true);

-- Autoriser toutes opérations anonymes sur parrainages
ALTER TABLE parrainages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on parrainages" 
ON parrainages FOR ALL TO anon 
USING (true) 
WITH CHECK (true);

-- Autoriser toutes opérations anonymes sur finances
ALTER TABLE finances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on finances" 
ON finances FOR ALL TO anon 
USING (true) 
WITH CHECK (true);

-- Autoriser toutes opérations anonymes sur events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on events" 
ON events FOR ALL TO anon 
USING (true) 
WITH CHECK (true);

-- Autoriser toutes opérations anonymes sur tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on tasks" 
ON tasks FOR ALL TO anon 
USING (true) 
WITH CHECK (true);
```

---

## 5️⃣ Tester manuellement dans Supabase

1. Allez dans le **Table Editor** : https://supabase.com/dashboard/project/zxnnzpzujmjzhnfqndle/editor
2. Sélectionnez la table **vehicles** dans la barre latérale
3. Vérifiez si la table existe et si elle a les bonnes colonnes :
   - `id` (bigint)
   - `make` (text)
   - `model` (text)
   - `year` (text)
   - `price` (numeric)
   - `description` (text)
   - `image` (text)
   - `created_at` (timestamptz)

---

## 6️⃣ Insérer un véhicule test manuellement

Dans le SQL Editor, exécutez :

```sql
INSERT INTO vehicles (id, make, model, year, price, description, created_at)
VALUES (1234567890, 'Peugeot', '208', '2020', 15000, 'Véhicule de test', now());
```

Puis rechargez votre page d'accueil : `http://127.0.0.1:5500/index.html`

✅ Le véhicule devrait apparaître !

---

## 7️⃣ Tester l'ajout depuis l'admin

1. Retournez en mode admin : `http://127.0.0.1:5500/admin.html`
2. Essayez d'ajouter un véhicule via le formulaire
3. Vérifiez la console (F12) pour voir s'il y a des erreurs
4. Vérifiez dans Supabase Table Editor si le véhicule a été inséré

---

## 🐛 Débogage : Console JavaScript

Ouvrez la console (F12) et testez manuellement :

```javascript
// Test 1: Vérifier si supabaseClient existe
console.log('supabaseClient:', window.supabaseClient)

// Test 2: Tester une insertion
const testVehicle = {
  id: Date.now(),
  make: 'Renault',
  model: 'Clio',
  year: '2021',
  price: '12000',
  description: 'Test',
  date: new Date().toISOString()
}
await window.supabaseClient.insertVehicle(testVehicle)

// Test 3: Tester une lecture
const result = await window.supabaseClient.fetchVehicles()
console.log('Véhicules:', result)
```

---

## 📞 Si ça ne fonctionne toujours pas

Vérifiez ces points :
- [ ] La clé API est bien configurée dans `supabase-config.js`
- [ ] Les tables existent dans Supabase
- [ ] Les RLS policies sont créées
- [ ] Le bucket Storage `vehicle-images` existe
- [ ] Aucune erreur dans la console du navigateur (F12)
- [ ] Le Live Server de VS Code est bien lancé

---

## ✅ Checklist complète

- [ ] Tables créées (`supabase-schema.sql` exécuté)
- [ ] Bucket Storage `vehicle-images` créé (Public)
- [ ] RLS Policies configurées
- [ ] Test d'insertion manuelle réussi
- [ ] Test d'insertion depuis l'admin réussi
- [ ] Véhicules visibles sur index.html
