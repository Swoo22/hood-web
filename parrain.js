/* Lien de parrainage (HOO-212, décision d'Aymeric du 28 nov. 2026).
   Un visiteur qui arrive par un lien du type hood-web.com/?ref=CODE (sur n'importe quelle page)
   garde ce code 30 jours dans son navigateur. Le questionnaire l'enregistre avec ses réponses,
   donc avec la commande au moment du paiement : on sait qui a parrainé.
   - Le code ne change JAMAIS le prix (290 €, fixé côté serveur).
   - Format accepté : 3 à 20 lettres ou chiffres, mis en majuscules. Tout le reste est ignoré.
   - Un nouveau lien ?ref remplace l'ancien ; ?ref= (vide) n'efface rien.
   Utilisation : window.HOOD_PARRAIN() renvoie le code gardé, ou "". */
(function () {
  "use strict";
  var MEMO = "hood_ref", DUREE = 30 * 24 * 3600 * 1000;
  function lire() { try { var v = JSON.parse(localStorage.getItem(MEMO) || "null"); return v && v.fin > Date.now() && /^[A-Z0-9]{3,20}$/.test(v.code) ? v.code : ""; } catch (e) { return ""; } }
  try {
    var code = (new URLSearchParams(location.search).get("ref") || "").trim().toUpperCase();
    if (/^[A-Z0-9]{3,20}$/.test(code)) localStorage.setItem(MEMO, JSON.stringify({ code: code, fin: Date.now() + DUREE }));
  } catch (e) { /* navigateur sans stockage : pas de parrainage, rien d'autre ne change */ }
  window.HOOD_PARRAIN = lire;
})();
