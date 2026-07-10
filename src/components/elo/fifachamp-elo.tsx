import { KaTeXFormula } from "@/components/katex-formula";

function Var({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <code className="mt-0.5 shrink-0 font-mono text-sm font-bold text-brand-700">{name}</code>
      <p className="text-sm leading-relaxed text-slate-600">{children}</p>
    </div>
  );
}

function ExampleCard({
  title,
  rows,
  result,
}: {
  title: string;
  rows: { label: string; value: string }[];
  result: { winner: string; loser: string };
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <div className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-4 text-sm">
            <span className="text-slate-500">{r.label}</span>
            <span className="font-mono font-medium text-slate-800">{r.value}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 pt-3 text-sm">
        <span className="font-semibold text-green-600">{result.winner}</span>
        <span className="font-semibold text-red-500">{result.loser}</span>
      </div>
    </div>
  );
}

export function FifaChampElo() {
  return (
    <div className="flex flex-col gap-8">

      {/* C'est quoi */}
      <section className="flex flex-col gap-2">
        <h3 className="font-semibold text-slate-800">C&apos;est quoi l&apos;Elo ?</h3>
        <p className="text-sm leading-relaxed text-slate-600">
          L&apos;Elo est un système de classement qui mesure le niveau relatif des joueurs.
          Tous les Elos démarrent à <strong>1000 points</strong>. À chaque match, des points
          s&apos;échangent entre les deux équipes : battre une équipe plus forte rapporte
          davantage que de battre une équipe plus faible.
        </p>
      </section>

      {/* 4 classements */}
      <section className="flex flex-col gap-3">
        <h3 className="font-semibold text-slate-800">Les 4 classements FifaChamp</h3>
        <p className="text-sm text-slate-600">
          Il existe 4 classements différents : le 1v1 et le 2v2 sont indépendants.
          L&apos;Elo global est alimenté par tous les matchs ; le classement Villes en est dérivé.
        </p>
        <div className="flex flex-col gap-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-medium text-slate-800">Elo global</p>
            <p className="mt-1 text-sm text-slate-500">
              Classement alimenté par tous les matchs (1v1, 2v2, asymétriques). C&apos;est
              l&apos;Elo principal, le plus représentatif du niveau général d&apos;un joueur.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-medium text-slate-800">Elo 1v1</p>
            <p className="mt-1 text-sm text-slate-500">
              Classement alimenté uniquement par les matchs strictement 1 contre 1. Compteur indépendant
              de l&apos;Elo global : mesure le niveau tête-à-tête pur, sans effet coéquipier.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-medium text-slate-800">Elo 2v2</p>
            <p className="mt-1 text-sm text-slate-500">
              Classement alimenté uniquement par les matchs strictement 2 contre 2. L&apos;entité notée est la <strong>paire</strong>, pas le joueur seul. Chaque duo
              a son propre Elo (départ à 1000) totalement indépendant des Elos individuels.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-medium text-slate-800">Elo Villes</p>
            <p className="mt-1 text-sm text-slate-500">
              Classement des villes : somme pondérée des 5 meilleurs Elos globaux, des 5 meilleurs
              Elos 1v1 et des 5 meilleurs duos de la ville. Recalculé à partir des classements
              joueurs et duos, sans modifier les Elos individuels.
            </p>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Les matchs asymétriques (1v2 ou 2v1) font bouger l&apos;Elo global des joueurs concernés
            (et donc le classement Villes), mais pas les Elos 1v1 ou 2v2.
          </p>
        </div>
      </section>

      {/* Calcul en fin de match */}
      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-slate-800">Comment est calculé l&apos;Elo en fin de match ?</h3>
          <p className="text-sm leading-relaxed text-slate-600">
            À chaque match validé, le système applique trois étapes pour déterminer combien de
            points s&apos;échangent entre les deux camps. La formule est identique à chaque fois ;
            seul le <strong>niveau N</strong> du camp change selon le classement visé.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <h4 className="font-semibold text-slate-800">Étape 1 : le niveau de chaque camp</h4>
          <div className="text-sm text-slate-600 space-y-3">
            <p>
              Cette étape a lieu <span className="font-semibold">à chaque match</span>, mais le calcul du niveau diffère selon le mode&nbsp;: 1v1, 2v2 ou asymétrique (1v2/2v1).
            </p>

            <div>
              <span className="font-semibold">Pour un match 1v1, on calcule :</span>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>
                  <span className="font-medium text-slate-800">Le niveau global du camp A</span>
                  <span> = Elo global du joueur 1</span>
                </li>
                <li>
                  <span className="font-medium text-slate-800">Le niveau global du camp B</span>
                  <span> = Elo global du joueur 2</span>
                </li>
                <li>
                  <span className="font-medium text-slate-800">Le niveau 1v1 du camp A</span>
                  <span> = Elo 1v1 du joueur 1</span>
                </li>
                <li>
                  <span className="font-medium text-slate-800">Le niveau 1v1 du camp B</span>
                  <span> = Elo 1v1 du joueur 2</span>
                </li>
              </ul>
            </div>

            <div>
              <span className="font-semibold">Pour un match 2v2, on calcule :</span>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>
                  <span className="font-medium text-slate-800">Le niveau global du camp A</span>
                  <span> = Moyenne des Elos globaux des deux joueurs 1 et 2</span>
                </li>
                <li>
                  <span className="font-medium text-slate-800">Le niveau global du camp B</span>
                  <span> = Moyenne des Elos globaux des deux joueurs 3 et 4</span>
                </li>
                <li>
                  <span className="font-medium text-slate-800">Le niveau 2v2 du camp A</span>
                  <span> = Elo du duo 1 et 2</span>
                </li>
                <li>
                  <span className="font-medium text-slate-800">Le niveau 2v2 du camp B</span>
                  <span> = Elo du duo 3 et 4</span>
                </li>
              </ul>
            </div>

            <div>
              <span className="font-semibold">Pour un match asymétrique (1v2 ou 2v1), on calcule :</span>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>
                  <span className="font-medium text-slate-800">Le niveau du camp à 1 joueur</span>
                  <span> = Elo global de ce joueur</span>
                </li>
                <li>
                  <span className="font-medium text-slate-800">Le niveau du camp à 2 joueurs</span>
                  <span> = Moyenne des Elos globaux des deux joueurs de ce camp</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h4 className="font-semibold text-slate-800">Étape 2 : probabilité de victoire</h4>
        <p className="text-sm leading-relaxed text-slate-600">
          D&apos;après le niveau des deux camps, le système calcule les probabilités de victoire
          de chaque camp pour chaque Elo impacté par le match :
        </p>
        <KaTeXFormula formula="p_A = \dfrac{1}{1 + 10^{(N_B - N_A)\,/\,400}}" />
        <KaTeXFormula formula="p_B = 1 - p_A" />
        <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4">
          <Var name="p_A">
            La probabilité estimée que le camp A gagne. Entre 0 et 1 ; à niveau égal,
            p_A = 0,5.
          </Var>
          <Var name="p_B">
            La probabilité estimée que le camp B gagne. Elle se déduit directement de p_A :
            les deux camps se partagent 100 % des chances, donc p_B = 1 − p_A.
          </Var>
          <Var name="N_A">
            Le niveau du camp A (selon le calcul de l&apos;étape 1).
          </Var>
          <Var name="N_B">
            Le niveau du camp B (selon le calcul de l&apos;étape 1).
          </Var>
          <Var name="400">
            Le diviseur qui convertit l&apos;écart de niveau en probabilité de victoire.
            Même constante que dans le système Elo des échecs, son rôle est de fixer <strong>à combien de points d&apos;écart correspond
            une vraie différence de force</strong>. Plus ce nombre serait élevé, moins les écarts d&apos;Elo
            pèseraient dans la formule.
          </Var>
        </div>
        </div>

        <div className="flex flex-col gap-4">
          <h4 className="font-semibold text-slate-800">Étape 3 : points échangés</h4>
        <p className="text-sm leading-relaxed text-slate-600">
          En fonction du résultat, on prend la probabilité du camp gagnant pour calculer
          combien de points s&apos;échangent :
        </p>
        <KaTeXFormula formula="\Delta = K \times (1 - p_{\text{vainqueur}})" />
        <KaTeXFormula formula="\begin{cases} Elo_{\text{vainqueur}} \mathrel{+}= \Delta \\ Elo_{\text{perdant}} \mathrel{-}= \Delta \end{cases}" />
        <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4">
          <Var name="Δ">
            Ce sont les points échangés à la fin du match. Le vainqueur les gagne, le perdant
            les perd pour que le jeu soit à somme nulle.
          </Var>
          <Var name="K = 40">
            C&apos;est le <strong>facteur d&apos;échelle</strong>{" "}du match : il fixe l&apos;amplitude
            des gains et des pertes. Plus le facteur K est élevé, plus les points échangés sont importants et rendent le classement plus sensible aux surprises.
          </Var>
          <Var name="1 − p_vainqueur">
            L&apos;écart entre ce qui s&apos;est passé (1 = victoire) et ce qui était prévu pour
            le vainqueur. Plus la victoire était inattendue, plus cet écart est grand, donc plus
            le gagnant empoche de points.
          </Var>
        </div>
        </div>
      </section>

      {/* Exemples */}
      <section className="flex flex-col gap-3">
        <h3 className="font-semibold text-slate-800">Exemples</h3>
        <div className="flex flex-col gap-3">
          <ExampleCard
            title="Deux joueurs à égalité : A (1000) vs B (1000)"
            rows={[
              { label: "Probabilité de victoire de A", value: "p_A = 0,50" },
              { label: "Delta (A ou B gagne)", value: "40 × (1 − 0,5) = 20" },
            ]}
            result={{ winner: "Gagnant : 1000 → 1020 (+20)", loser: "Perdant : 1000 → 980 (−20)" }}
          />
          <ExampleCard
            title="A (1300) bat B (1000) : le favori l'emporte"
            rows={[
              { label: "Probabilité de victoire de A", value: "p_A ≈ 0,85" },
              { label: "Delta", value: "40 × (1 − p_A) ≈ 6" },
            ]}
            result={{ winner: "A : 1300 → 1306 (+6)", loser: "B : 1000 → 994 (−6)" }}
          />
          <ExampleCard
            title="A (1000) bat B (1300) : surprise, l'outsider l'emporte"
            rows={[
              { label: "Probabilité de victoire de A", value: "p_A ≈ 0,15" },
              { label: "Delta", value: "40 × (1 − p_A) ≈ 34" },
            ]}
            result={{ winner: "A : 1000 → 1034 (+34)", loser: "B : 1300 → 1266 (−34)" }}
          />
        </div>
      </section>

    </div>
  );
}
