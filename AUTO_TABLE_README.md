# 🛠️ Utilitaire Auto-Table pour Supabase

## 📦 Installation

Node.js n'est pas installé. Vous avez deux options :

### Option A : Installer Node.js (recommandé)
1. Téléchargez Node.js : https://nodejs.org/
2. Installez la version LTS
3. Redémarrez VS Code
4. Puis exécutez :
```bash
npm install
node auto-table.js vehicles '{"make":"Peugeot","model":"208","year":"2020","price":15000}'
```

### Option B : Créer les tables manuellement (plus simple)
1. Ouvrez Supabase SQL Editor : https://supabase.com/dashboard/project/zxnnzpzujmjzhnfqndle/sql
2. Copiez tout le contenu de `supabase-schema.sql`
3. Collez dans l'éditeur SQL
4. Cliquez sur "Run"

---

## 📚 Utilisation de l'utilitaire (une fois Node.js installé)

### Usage basique
```bash
node auto-table.js <nom_table> '<json_objet>'
```

### Exemples

#### Créer/insérer un véhicule
```bash
node auto-table.js vehicles '{"make":"Peugeot","model":"208","year":"2020","price":15000,"description":"Belle voiture"}'
```

#### Créer/insérer un contact
```bash
node auto-table.js contacts '{"name":"Jean Dupont","email":"jean@example.com","phone":"0612345678"}'
```

#### Créer/insérer une pièce
```bash
node auto-table.js pieces '{"name":"Filtre à huile","reference":"FO-2020","price":25.99,"stock":50}'
```

### Initialiser toutes les tables
```bash
node setup-database.js
```

---

## 🎯 Ce que fait l'utilitaire

1. **Vérifie** si la table existe dans Supabase
2. **Crée** automatiquement la table si elle n'existe pas
   - Détecte les types de colonnes depuis les valeurs JSON
   - Ajoute automatiquement `id` (bigint) et `created_at` (timestamptz)
3. **Configure** les policies RLS pour autoriser les opérations
4. **Insère** les données dans la table

---

## 🔍 Détection automatique des types

L'utilitaire détecte automatiquement les types SQL :

| Type JavaScript | Type SQL |
|----------------|----------|
| `number` (entier) | `bigint` |
| `number` (décimal) | `numeric` |
| `string` | `text` |
| `boolean` | `boolean` |
| `Array` | `text[]` |
| `Date` / ISO string | `timestamptz` |
| `Object` | `jsonb` |

---

## ⚠️ Limitations

- L'utilitaire ne peut **pas** exécuter du SQL brut via la clé `anon`
- Si la création automatique échoue, le SQL sera affiché pour exécution manuelle
- Pour production, utilisez la méthode manuelle avec `supabase-schema.sql`

---

## 💡 Solution alternative (sans Node.js)

Utilisez simplement le fichier `supabase-schema.sql` existant :

1. Ouvrez : https://supabase.com/dashboard/project/zxnnzpzujmjzhnfqndle/sql
2. Cliquez "New query"
3. Copiez-collez **tout** `supabase-schema.sql`
4. Exécutez (Run)

C'est la méthode la plus fiable ! ✅

---

## 📝 Utilisation programmatique

```javascript
import { autoTable } from './auto-table.js';

await autoTable('vehicles', {
  make: 'Renault',
  model: 'Clio',
  year: '2021',
  price: 12000,
  description: 'Excellente condition'
});
```

---

## 🔗 Liens utiles

- **SQL Editor Supabase** : https://supabase.com/dashboard/project/zxnnzpzujmjzhnfqndle/sql
- **Table Editor** : https://supabase.com/dashboard/project/zxnnzpzujmjzhnfqndle/editor
- **Storage** : https://supabase.com/dashboard/project/zxnnzpzujmjzhnfqndle/storage/buckets
