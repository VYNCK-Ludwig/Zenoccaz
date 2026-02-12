# Migration Supabase - Ajout colonne reward_type

## 🔧 Problème résolu
Correction de l'erreur "Erreur lors de la mise à jour du parrainage" causée par la colonne manquante `reward_type`.

## 📋 Étapes pour appliquer la migration

### 1. Se connecter à Supabase
- Aller sur https://supabase.com
- Se connecter à votre projet (zxnnzpzujmjzhnfqndle)

### 2. Ouvrir l'éditeur SQL
- Dans le menu de gauche, cliquer sur **SQL Editor**
- Cliquer sur **New Query**

### 3. Exécuter la migration
- Copier le contenu du fichier `supabase-migration-reward-type.sql`
- Coller dans l'éditeur SQL
- Cliquer sur **Run** (ou Ctrl+Entrée)

### 4. Vérifier
Vous devriez voir le message : 
```
Migration terminée: colonne reward_type ajoutée à la table parrainages
```

## ✅ Après la migration
- La colonne `reward_type` sera ajoutée à la table `parrainages`
- Les parrainages existants auront `reward_type = 'bon_125'` par défaut
- Vous pourrez maintenant ajouter/modifier/supprimer des parrainages avec le type de récompense

## 🎯 Fonctionnalités activées
- ✅ Ajout de parrainage avec choix de récompense (Bon 125€ ou Vidange 75€)
- ✅ Modification de parrainage (changement de statut, récompense, etc.)
- ✅ Suppression de parrainage
- ✅ Affichage du type de récompense dans le tableau
