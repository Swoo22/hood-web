/* Comptes clients HOOD (11 Nov. 2026).
   Tant que url et cle sont vides, la fonction est éteinte : le questionnaire
   marche comme avant, sans champ email ni enregistrement.
   url : adresse du projet Supabase HOOD (https://xxxx.supabase.co)
   cle : clé publique « publishable » du projet (faite pour être dans une page web).
   Mise en service et retour arrière : dépôt Swoo22/Hood, docs/comptes-clients.md. */
window.HOOD_COMPTE = { url: "", cle: "" };

(function () {
  const C = window.HOOD_COMPTE;
  C.actif = !!(C.url && C.cle);
  const LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.js";
  const CLE_JETON = "hood_jeton";
  let client = null, chargement = null;

  function charger() {
    if (!C.actif) return Promise.resolve(null);
    if (client) return Promise.resolve(client);
    if (!chargement) chargement = new Promise((ok, ko) => {
      const s = document.createElement("script");
      s.src = LIB; s.async = true;
      s.onload = () => {
        client = window.supabase.createClient(C.url, C.cle, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" }
        });
        ok(client);
      };
      s.onerror = () => { chargement = null; ko(new Error("Supabase injoignable")); };
      document.head.appendChild(s);
    });
    return chargement;
  }
  const lire = k => { try { return localStorage.getItem(k) } catch (e) { return null } };
  const ecrire = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch (e) {} };
  C.emailValide = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || "").trim());
  C.jeton = () => lire(CLE_JETON);

  /* Le visiteur donne son email : projet enregistré, puis lien magique. */
  C.commencer = async function (email, etat, etape) {
    const sb = await charger(); if (!sb) return { ok: false };
    const r = await sb.rpc("hood_projet_commencer", { p_email: email, p_reponses: etat, p_etape: etape });
    if (r.error || !r.data) return { ok: false };
    ecrire(CLE_JETON, r.data);
    const l = await sb.auth.signInWithOtp({
      email, options: { shouldCreateUser: true, emailRedirectTo: location.origin + "/espace.html" }
    });
    return { ok: true, mail: !l.error };
  };

  /* Sauvegarde d'une étape : par le jeton du navigateur, sinon par le compte connecté. */
  let projetConnecte = null;
  C.enregistrer = async function (etat, etape) {
    const sb = await charger(); if (!sb) return false;
    const j = lire(CLE_JETON);
    if (j) {
      const r = await sb.rpc("hood_projet_enregistrer", { p_jeton: j, p_reponses: etat, p_etape: etape });
      if (!r.error && r.data) return true;
    }
    if (projetConnecte) {
      const r = await sb.rpc("hood_projet_enregistrer_connecte", { p_projet: projetConnecte, p_reponses: etat, p_etape: etape });
      return !r.error && !!r.data;
    }
    return false;
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
    if (r.data.projet && r.data.projet.statut === "en_cours") projetConnecte = r.data.projet.id;
    return r.data;
  };

  /* Lien magique pour un client qui revient (pas de nouveau compte ici). */
  C.recevoirLien = async function (email) {
    const sb = await charger(); if (!sb) return false;
    const r = await sb.auth.signInWithOtp({
      email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + "/espace.html" }
    });
    return !r.error;
  };

  C.deconnecter = async function () {
    const sb = await charger(); if (!sb) return;
    await sb.auth.signOut(); ecrire(CLE_JETON, null); projetConnecte = null;
  };

  /* Prêt à l'emploi quand Supabase a lu le lien magique dans l'adresse. */
  C.pret = () => charger().then(sb => sb ? sb.auth.getSession() : null).catch(() => null);
})();
