# hood-web.com

Site vitrine de HOOD, publié automatiquement par GitHub Pages à chaque envoi sur la branche `main`.

- `index.html` : page d'accueil
- `maquette.html` : questionnaire « Montrez-moi mon site », avec aperçu en direct, affinage, choix du nom de domaine et du titulaire, paiement (Stripe en mode essai tant que le paiement réel n'est pas branché)
- `espace.html` : espace client (mon site en cours, mes factures), connexion par lien magique
- `compte.js` : comptes clients, branchés sur la base Supabase de HOOD depuis le 12 nov. 2026 : le projet est enregistré dès que le visiteur donne son email. La base et ses fonctions sont dans le dépôt Swoo22/Hood
- `modeles/` : les modèles de sites d'Aymeric et leur catalogue (`catalogue.json`). Ce sont des exemples : dans le questionnaire, leurs avis, notes, prix, horaires, téléphone et années sont remplacés par des cases « à compléter » (jamais publiés tels quels). Non indexés (robots.txt)
- `cgv.html` : conditions générales de vente (version provisoire) ; `cgv-provisoire.html` et `donnees.html` renvoient vers `/cgv` et vers les mentions légales
- `mentions-legales.html`, `merci.html` (retour de paiement), `affiner.html` (prototype), `styles.css`, `script.js`
- `favicon.svg`, `og-image.png` (image de partage), `robots.txt`, `sitemap.xml`
- `CNAME` : nom de domaine du site (hood-web.com)

Retour arrière : chaque version est gardée dans l'historique du dépôt.
