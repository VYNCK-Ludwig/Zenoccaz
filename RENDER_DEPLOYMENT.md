# 🚀 Guide de Déploiement sur Render

## Étapes de déploiement

### 1️⃣ Préparer votre repository GitHub
- Poussez votre code sur GitHub (incluez le `Procfile` et `render.yaml`)
- Assurez-vous que `server.js` est votre point d'entrée

### 2️⃣ Créer un service Web sur Render
1. Allez sur [render.com](https://render.com)
2. Connectez-vous ou créez un compte
3. Cliquez sur **"New +"** → **"Web Service"**
4. Sélectionnez votre repository GitHub
5. Configurez :
   - **Name** : `zenoccaz-chatbot` (ou votre choix)
   - **Environment** : `Node`
   - **Build Command** : `npm install`
   - **Start Command** : `node server.js`
   - **Plan** : Free (ou payant si besoin)

### 3️⃣ Ajouter les variables d'environnement
1. Dans les paramètres du service, allez à **"Environment"**
2. Ajoutez :
   ```
   GROQ_API_KEY = [votre clé API Groq]
   NODE_ENV = production
   ```
3. **Ne commitez JAMAIS le .env** sur GitHub (il est ignoré par `.gitignore`)

### 4️⃣ Déployer
1. Cliquez sur **"Deploy"**
2. Attendez que le build se termine
3. Vous recevrez une URL comme : `https://zenoccaz-chatbot.onrender.com`

### 5️⃣ Tester le chatbot
- L'URL de votre serveur API : `https://zenoccaz-chatbot.onrender.com/api/chat`
- Le chatbot se connectera automatiquement ! ✅

## 📋 Checklist avant déploiement

- ✅ `Procfile` existe à la racine
- ✅ `server.js` écoute sur `process.env.PORT`
- ✅ `chatbot.js` utilise `window.location` pour l'API
- ✅ `package.json` a un script `"start": "node server.js"`
- ✅ Variables d'env dans le dashboard Render
- ✅ Code pushé sur GitHub

## 🔄 Notes importantes

### Port dynamique (Render attribue dynamiquement)
- ✅ Fait : `const PORT = process.env.PORT || 3000;`
- ✅ Fait : `app.listen(PORT, '0.0.0.0', ...)`

### URL de l'API (détection automatique)
- ✅ En local : `http://localhost:3000/api/chat`
- ✅ En prod : Utilise l'URL actuellement affichée

### Pas de fichier .env sur Render
- Toutes les variables doivent être dans le dashboard Render
- Le fichier `.env` local reste juste pour dev

## 🆘 Dépannage

**Problème : "Internal server error" au chat**
- Vérifiez que `GROQ_API_KEY` est bien configurée dans Render
- Vérifiez les logs dans le dashboard Render

**Problème : Erreur de connexion à l'API**
- L'URL de base doit être identique au domaine Render
- Attendez quelques secondes après le déploiement

**Logs en direct**
- Dashboard Render → "Logs" pour voir les messages de votre serveur
