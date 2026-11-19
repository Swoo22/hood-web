"""Test automatique du questionnaire (demandé par Aymeric, 19 Nov. 2026).

Pour chacun des métiers du questionnaire, deux passages :
  1. « email neuf » : rien dans le navigateur ;
  2. « email déjà utilisé » : un ancien site d'un AUTRE métier est gardé dans le
     navigateur, et la base le renvoie en retard (8 secondes).
À l'aperçu (étape 6), le métier coché et le modèle affiché doivent être ceux
choisis pendant la visite. Le test échoue (code de sortie 1) au premier écart.

Aucune donnée n'est envoyée : les appels à la base sont simulés dans la page
(window.HOOD_COMPTE), et Supabase et Turnstile sont coupés.

Lancer :  python3 -m http.server 8765 &  puis  python3 tests/parcours_metiers.py
Variables : HOOD_URL (défaut http://localhost:8765/maquette.html),
            CHROME (chemin d'un Chrome déjà installé, facultatif),
            HOOD_METIERS (liste d'identifiants séparés par des virgules, facultatif).
"""
import asyncio
import os
import sys

from playwright.async_api import async_playwright

URL = os.environ.get("HOOD_URL", "http://localhost:8765/maquette.html")

SIMULATION = """
([ancien]) => {
  const C = window.HOOD_COMPTE;
  C.commencer = async (e) => ({ ok: true, mail: false, essai: C.estEssai(e) });
  C.enregistrer = async () => "ok";
  C.deposerPhoto = async (f, s) => ({ fichier: s + "-test.jpg" });
  C.lireLocal = async () => {
    if (!ancien) return null;
    await new Promise(r => setTimeout(r, 8000));
    const champs = { nom: "Ancien commerce", ville: "Nantes" };
    champs["m-" + ancien] = true;
    return { statut: "en_cours", etape: 6, reponses: { champs }, email: "essais+ancien@hood-web.com" };
  };
}
"""


async def un_passage(navigateur, metier, ancien):
    ctx = await navigateur.new_context(viewport={"width": 1280, "height": 900})
    page = await ctx.new_page()
    erreurs = []
    page.on("pageerror", lambda e: erreurs.append(str(e)))
    await page.route("**/*supabase.co/**", lambda r: r.abort())
    await page.route("**/challenges.cloudflare.com/**", lambda r: r.abort())
    await page.goto(URL, wait_until="domcontentloaded")
    await page.evaluate(SIMULATION, [ancien])
    secteur = await page.evaluate(f"document.getElementById('m-{metier}').closest('.fam').dataset.fam")
    await page.select_option("#secteur", secteur)
    await page.click(f"#m-{metier} + span")
    await page.click("#next")
    await page.fill("#email", f"essais+ci-{metier}@hood-web.com")
    await page.fill("#nom", "Commerce Test")
    await page.fill("#ville", "Lyon")
    for _ in range(4):  # entreprise, services, modèle, options
        await page.click("#next")
        await page.wait_for_timeout(250)
    modeles = await page.evaluate("window.__hood.modeles()")
    await page.wait_for_timeout(9000 if ancien else 500)  # l'ancien site arrive en retard
    m = await page.evaluate("window.__hood.metier()")
    t = await page.evaluate("window.__hood.modele()")
    e = await page.evaluate("window.__hood.etape()")
    await ctx.close()
    pb = []
    if m != metier:
        pb.append(f"métier {m!r} au lieu de {metier!r}")
    if t not in modeles:
        pb.append(f"modèle {t!r} hors des modèles du métier")
    if e != 6:
        pb.append(f"étape {e} au lieu de 6 (aperçu)")
    if erreurs:
        pb.append("erreur JavaScript : " + erreurs[0])
    return pb


async def main():
    async with async_playwright() as p:
        options = {"args": ["--no-sandbox"]}
        if os.environ.get("CHROME"):
            options["executable_path"] = os.environ["CHROME"]
        navigateur = await p.chromium.launch(**options)
        page = await navigateur.new_page()
        await page.goto(URL, wait_until="domcontentloaded")
        metiers = await page.evaluate(
            "[...document.querySelectorAll('input[name=metier]')].map(i=>i.value).filter(v=>v!=='autre')")
        await page.close()
        if os.environ.get("HOOD_METIERS"):
            metiers = [m for m in metiers if m in os.environ["HOOD_METIERS"].split(",")]
        echecs = 0
        for i, metier in enumerate(metiers):
            autre = metiers[(i + 1) % len(metiers)]
            for nom, ancien in (("email neuf", None), ("email déjà utilisé", autre)):
                pb = await un_passage(navigateur, metier, ancien)
                print(("OK    " if not pb else "ECHEC ") + f"{metier} ({nom})" + ("" if not pb else " : " + " ; ".join(pb)), flush=True)
                echecs += bool(pb)
        await navigateur.close()
        print(f"== {len(metiers)} métiers, {2 * len(metiers)} passages, {echecs} échec(s)")
        sys.exit(1 if echecs else 0)


asyncio.run(main())
