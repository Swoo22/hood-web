/* Comptes clients HOOD (11 Nov. 2026, corrigé après le contrôle de Justine).
   Tant que url et cle sont vides, la fonction est éteinte : le questionnaire
   marche comme avant, sans champ email ni enregistrement.
   url       : adresse du projet Supabase HOOD (https://xxxx.supabase.co)
   cle       : clé publique « publishable » du projet (faite pour être dans une page web)
   turnstile : clé publique du captcha Cloudflare Turnstile (obligatoire avant d'allumer)
   La bibliothèque Supabase est servie par hood-web.com (dossier vendor), pas par un site tiers.
   Mise en service et retour arrière : dépôt Swoo22/Hood, docs/comptes-clients.md. */
window.HOOD_COMPTE = { url: "https://zkufkvquoityqhucgshb.supabase.co", cle: "sb_publishable_RJgC_rtNKrdofg7vZ7P1Mg_A_SNAdmz", turnstile: "0x4AAAAAAF98I59gQzcJ7-IG" };

(function () {
  const C = window.HOOD_COMPTE;
  C.actif = !!(C.url && C.cle);
  const LIB = "vendor/supabase-js-2.118.0.js";
  const CLE_JETON = "hood_jeton", CLE_EMAIL = "hood_jeton_email";
  let client = null, chargement = null;

  function script(src) {
    return new Promise((ok, ko) => {
      const s = document.createElement("script");
      s.src = src; s.async = true; s.onload = ok; s.onerror = () => ko(new Error(src));
      document.head.appendChild(s);
    });
  }
  function charger() {
    if (!C.actif) return Promise.resolve(null);
    if (client) return Promise.resolve(client);
    if (!chargement) chargement = script(LIB).then(() => {
      client = window.supabase.createClient(C.url, C.cle, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" }
      });
      return client;
    }).catch(e => { chargement = null; throw e; });
    return chargement;
  }

  /* Captcha Turnstile : un jeton neuf avant chaque envoi de lien. */
  let tsPret = null, tsBoite = null;
  function captcha() {
    if (!C.turnstile) return Promise.resolve(undefined);
    if (!tsPret) tsPret = script("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit");
    return tsPret.then(() => new Promise((ok, ko) => {
      if (!tsBoite) { tsBoite = document.createElement("div"); tsBoite.style.cssText = "margin:12px 0"; (document.getElementById("captcha") || document.body).appendChild(tsBoite); }
      tsBoite.innerHTML = "";
      window.turnstile.render(tsBoite, {
        sitekey: C.turnstile, appearance: "interaction-only", language: "fr",
        callback: t => ok(t), "error-callback": () => ko(new Error("captcha")), "expired-callback": () => ko(new Error("captcha"))
      });
    }));
  }

  const lire = k => { try { return localStorage.getItem(k) } catch (e) { return null } };
  const ecrire = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch (e) {} };
  const norm = e => String(e || "").trim().toLowerCase();
  C.emailValide = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || "").trim());
  /* Le jeton du navigateur, seulement s'il a été pris pour cette adresse. */
  C.jeton = email => { const j = lire(CLE_JETON); return j && (email === undefined || lire(CLE_EMAIL) === norm(email)) ? j : null; };
  C.oublierJeton = () => { ecrire(CLE_JETON, null); ecrire(CLE_EMAIL, null); };

  async function envoyerLien(sb, email, creer) {
    let jetonCaptcha;
    try { jetonCaptcha = await captcha(); } catch (e) { return false; }
    const r = await sb.auth.signInWithOtp({
      email, options: { shouldCreateUser: creer, emailRedirectTo: location.origin + "/espace.html", captchaToken: jetonCaptcha }
    });
    return !r.error;
  }

  /* Le visiteur donne son email : projet enregistré, puis lien magique. */
  C.commencer = async function (email, etat, etape) {
    const sb = await charger(); if (!sb) return { ok: false };
    const r = await sb.rpc("hood_projet_commencer", { p_email: email, p_reponses: etat, p_etape: etape });
    if (r.error || !r.data) return { ok: false };
    ecrire(CLE_JETON, r.data); ecrire(CLE_EMAIL, norm(email));
    return { ok: true, mail: await envoyerLien(sb, email, true) };
  };

  /* Projet de ce navigateur, relu par le jeton (sans lien magique). */
  C.lireLocal = async function () {
    const sb = await charger(); const j = lire(CLE_JETON);
    if (!sb || !j) return null;
    const r = await sb.rpc("hood_projet_lire", { p_jeton: j });
    if (r.error) return null;
    if (!r.data) { C.oublierJeton(); return null; }
    return Object.assign({ email: lire(CLE_EMAIL) }, r.data);
  };

  /* Sauvegarde d'une étape : par le compte connecté, sinon par le jeton.
     Renvoie "ok", "relier" (le projet a été rattaché à un compte : il faut
     ouvrir le lien du mail) ou "non". */
  let projetConnecte = null;
  C.enregistrer = async function (etat, etape) {
    const sb = await charger(); if (!sb) return "non";
    if (projetConnecte) {
      const r = await sb.rpc("hood_projet_enregistrer_connecte", { p_projet: projetConnecte, p_reponses: etat, p_etape: etape });
      if (!r.error && r.data) return "ok";
    }
    const j = lire(CLE_JETON);
    if (j) {
      const r = await sb.rpc("hood_projet_enregistrer", { p_jeton: j, p_reponses: etat, p_etape: etape });
      if (!r.error && r.data) return "ok";
      if (!r.error) { C.oublierJeton(); return "relier"; }
    }
    return "non";
  };

  C.session = async function () {
    const sb = await charger(); if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session;
  };

  /* Espace client : projet en cours et factures du compte connecté. */
  C.monEspace = async function () {
    const sb = await charger(); if (!sb) return null;
    if (!(await C.session())) return null;
    const r = await sb.rpc("hood_mon_espace");
    if (r.error || !r.data) return null;
    projetConnecte = r.data.projet && r.data.projet.statut === "en_cours" ? r.data.projet.id : null;
    return r.data;
  };

  /* Lien magique pour un client qui revient (pas de nouveau compte ici). */
  C.recevoirLien = async function (email) {
    const sb = await charger(); if (!sb) return false;
    return envoyerLien(sb, email, false);
  };

  /* Lien reçu par mail : il mène à espace.html?token_hash=…&type=email.
     La connexion ne se fait qu'au clic du visiteur sur « Ouvrir mon espace »,
     pour qu'un antivirus de messagerie qui ouvre le lien ne l'use pas. */
  C.verifier = async function (tokenHash, type) {
    const sb = await charger(); if (!sb) return false;
    const r = await sb.auth.verifyOtp({ token_hash: tokenHash, type: type || "email" });
    return !r.error;
  };

  C.deconnecter = async function () {
    const sb = await charger(); if (!sb) return;
    await sb.auth.signOut(); C.oublierJeton(); projetConnecte = null;
  };

  /* Prêt à l'emploi quand Supabase a lu le lien magique dans l'adresse. */
  C.pret = () => charger().then(sb => sb ? sb.auth.getSession() : null).catch(() => null);
})();
