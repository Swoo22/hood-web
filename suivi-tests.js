/* Suivi des tests utilisateurs (demande d'Aymeric, 25 Nov. 2026).
   Enregistre la visite (souris, clics, défilement) et les étapes du parcours dans PostHog,
   serveurs en Europe, UNIQUEMENT pour les testeurs prévenus, arrivés par un lien du type
   hood-web.com/maquette?test=1&testeur=T03. Les vrais visiteurs ne chargent rien.
   - Le mode test est gardé 7 jours dans ce navigateur (il survit au passage par Stripe).
     ?test=0 l'arrête et efface le code testeur.
   - Tous les champs de saisie sont masqués (on voit qu'on tape, jamais ce qu'on tape),
     ainsi que les textes qui affichent l'email, l'entreprise titulaire ou le compte.
   - Aucun nom de testeur : seulement un code (T01, T02…).
   - CLE vide = rien n'est chargé, même en mode test. La clé PostHog « phc_… » est une clé
     publique de navigateur, faite pour être visible dans le code (ce n'est pas un secret).
   Utilisation dans les pages : window.HOOD_SUIVI("nom_evenement", {propriétés}). */
(function () {
  "use strict";
  var CLE = "phc_uGaP6jghmPfqUbtLoU5PZB7LjHYYm55fXsw7tk3Rm5Le";                                  /* clé du projet PostHog (phc_…), à renseigner */
  var HOTE = "https://eu.i.posthog.com";         /* serveurs PostHog en Europe (Francfort) */
  var SCRIPT = "https://eu-assets.i.posthog.com/static/array.full.js";
  var MEMO = "hood_test", DUREE = 7 * 24 * 3600 * 1000;
  var file = [];
  window.HOOD_SUIVI = function (nom, props) { file.push([nom, props || {}]); };

  function lire() { try { var v = JSON.parse(localStorage.getItem(MEMO) || "null"); return v && v.fin > Date.now() ? v : null; } catch (e) { return null; } }
  function ecrire(v) { try { v ? localStorage.setItem(MEMO, JSON.stringify(v)) : localStorage.removeItem(MEMO); } catch (e) {} }

  var q = new URLSearchParams(location.search);
  if (q.get("test") === "0") { ecrire(null); }
  else if (q.get("test") === "1") {
    var code = (q.get("testeur") || "").toUpperCase();
    ecrire({ testeur: /^T\d{1,3}$/.test(code) ? code : "T00", fin: Date.now() + DUREE });
  }
  var t = lire();
  if (!t || !CLE) { window.HOOD_SUIVI = function () {}; return; }

  var MASQUE = "#tit-ok,#tit-res,#tit-contact,#bonjour,#factures,[data-masque]";
  var s = document.createElement("script");
  s.async = true; s.crossOrigin = "anonymous"; s.src = SCRIPT;
  s.onload = function () {
    var ph = window.posthog; if (!ph || !ph.init) return;
    ph.init(CLE, {
      api_host: HOTE,
      ui_host: "https://eu.posthog.com",
      person_profiles: "identified_only",
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      /* l'identifiant de paiement Stripe n'est pas envoyé (retour sur /merci) */
      sanitize_properties: function (pr) { ["$current_url", "$referrer"].forEach(function (k) { if (typeof pr[k] === "string") pr[k] = pr[k].replace(/session_id=[^&#]+/, "session_id=…"); }); return pr; },
      disable_session_recording: false,
      mask_all_element_attributes: true,
      session_recording: { maskAllInputs: true, maskTextSelector: MASQUE },
      loaded: function (p) {
        p.identify(t.testeur);
        p.register({ testeur: t.testeur, mode: "test_utilisateur" });
        window.HOOD_SUIVI = function (nom, props) { p.capture(nom, props || {}); };
        file.forEach(function (e) { p.capture(e[0], e[1]); }); file = [];
        /* Messages d'erreur affichés au testeur (textes du site, jamais ses saisies) */
        var err = document.getElementById("err");
        if (err && window.MutationObserver) new MutationObserver(function () {
          var m = (err.textContent || "").trim(); if (m) p.capture("message_erreur", { message: m.slice(0, 200) });
        }).observe(err, { childList: true, characterData: true, subtree: true });
      }
    });
  };
  document.head.appendChild(s);
})();
