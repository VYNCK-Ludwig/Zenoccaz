# ZENOCCAZ — site de démonstration

Site statique minimal pour la vente de véhicules d'occasion. Fournit :

- Page d'accueil affichant les véhicules (`index.html`).
- Mode administrateur caché activable avec `Ctrl + M` (affiche la barre admin et permet ajout/modification/suppression sauvegardés dans `localStorage`).

## Comment lancer localement

Ouvrir `index.html` directement dans le navigateur (mode démo). Pour un serveur local (recommandé) :

PowerShell:

```
python -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Notes d'usage

- Appuyez sur `Ctrl + M` pour activer/désactiver le mode administrateur. Une fenêtre de connexion s'ouvrira.
- Identifiant de démonstration : `ludwig`
- Mot de passe de démonstration : `Kooligan011.`  (le point final fait partie du mot de passe)
- En mode admin vous verrez des boutons `Modifier` et `Supprimer` sur chaque carte, et un bouton `Ajouter un véhicule` dans la barre admin.
- Les modifications restent dans `localStorage` du navigateur (démo). Pour revenir aux données d'origine, supprimez la clé `zenoccaz_vehicles` dans le stockage du navigateur ou videz le stockage local.

## Prochaine étapes possibles

- Ajouter backend pour authentification et persistance réelle.
- Ajouter formulaire d'édition plus riche au lieu de `prompt()`.
