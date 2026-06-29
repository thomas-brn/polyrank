# Système ELO et statistiques - PolyRank

Ce document décrit comment l'Elo et les statistiques sont calculés. Le modèle est repris du Google Sheet "Classement ELO Champish" (FifaChamp), reverse-engineered depuis l'export Excel (1992 matchs, 164 joueurs). Le global et le 1v1 ont été reproduits à l'identique (erreur nulle sur les 75 joueurs classés) ; le 2v2 par duo suit le modèle Elo standard "duo = joueur" (à ~9 points près des valeurs du sheet, écart assumé, cf. section 2.3).

> Source de vérité du calcul : la fonction Postgres `recompute_ratings` (voir `supabase/migrations/`). Ce doc en est la spec fonctionnelle. Les explications utilisateur dans l'app (`src/components/elo/`) en sont le résumé pédagogique.

---

## 1. Principe général

L'Elo est un système de classement qui mesure le niveau relatif des joueurs. **Tous les Elos démarrent à 1000 points.** À chaque match, des points s'échangent entre les deux camps : battre une équipe plus forte rapporte davantage que de battre une équipe plus faible.

Le moteur est **identique pour FifaChamp et CoinCoin** (même formule, mêmes paramètres par défaut). Seuls changent le jeu de statistiques associé (section 7) et, à terme, des réglages comme le facteur K.

| Paramètre     | Valeur (défaut)    |
| ------------- | ------------------ |
| Elo de départ | **1000**           |
| Facteur K     | **40**             |
| Diviseur      | **400** (standard) |

À chaque match validé, le système applique **trois étapes** pour déterminer combien de points s'échangent entre les deux camps. La formule est identique à chaque fois ; seul le **niveau N** du camp change selon le classement visé (global, 1v1 ou 2v2).

### Étape 1 : le niveau de chaque camp (N)

Cette étape a lieu à chaque match, mais le calcul du niveau diffère selon le mode : 1v1, 2v2 ou asymétrique (1v2 / 2v1).

**Match 1v1 :**

| Niveau | Camp A | Camp B |
| --- | --- | --- |
| Global | Elo global du joueur 1 | Elo global du joueur 2 |
| 1v1 | Elo 1v1 du joueur 1 | Elo 1v1 du joueur 2 |

**Match 2v2 :**

| Niveau | Camp A | Camp B |
| --- | --- | --- |
| Global | Moyenne des Elos globaux des joueurs 1 et 2 | Moyenne des Elos globaux des joueurs 3 et 4 |
| 2v2 | Elo du duo 1 et 2 | Elo du duo 3 et 4 |

**Match asymétrique (1v2 ou 2v1) :**

| Camp | Niveau (global uniquement) |
| --- | --- |
| Camp à 1 joueur | Elo global de ce joueur |
| Camp à 2 joueurs | Moyenne des Elos globaux des deux joueurs de ce camp |

Le delta de l'**Elo global** s'applique **en entier à chaque membre** de l'équipe en 2v2 (pas divisé par deux). Les deux coéquipiers gagnent ou perdent donc le même nombre de points sur leur Elo global.

> ⚠️ La moyenne des Elos individuels sert **uniquement** à estimer la force d'une équipe pour le calcul du delta sur l'Elo **global**. Ce n'est **pas** la valeur de l'Elo 2v2 d'un duo, qui est un compteur totalement distinct (voir section 2.3).

### Étape 2 : probabilité de victoire

D'après le niveau des deux camps, le système calcule les probabilités de victoire de chaque camp **pour chaque Elo impacté par le match** :

```
p_A = 1 / (1 + 10^((N_B - N_A) / 400))
p_B = 1 - p_A
```

- **N_A**, **N_B** : le niveau du camp A et du camp B (selon le calcul de l'étape 1, pour le classement en cours de mise à jour).
- **p_A** : la probabilité estimée que le camp A gagne. Entre 0 et 1 ; à niveau égal, `p_A = 0,5`.
- **p_B** : la probabilité estimée que le camp B gagne. Les deux camps se partagent 100 % des chances.
- **400** : le diviseur qui convertit l'écart de niveau en probabilité de victoire. Même constante que dans le système Elo des échecs ; son rôle est de fixer **à combien de points d'écart correspond une vraie différence de force**. Plus ce nombre serait élevé, moins les écarts d'Elo pèseraient dans la formule.

Repères : à Elo égal (`N_A = N_B`), `p_A = 0,5`. Si A a 400 points de plus que B, `p_A ≈ 0,91`.

### Étape 3 : points échangés

En fonction du résultat, on prend la probabilité du **camp gagnant** pour calculer combien de points s'échangent :

```
Δ = K × (1 - p_vainqueur)
vainqueur : Elo += Δ
perdant   : Elo -= Δ
```

- **Δ** : les points échangés à la fin du match. Le vainqueur les gagne, le perdant les perd (jeu à somme nulle).
- **K** (= 40 par défaut) : le **facteur d'échelle** du match. Il fixe l'amplitude des gains et des pertes. Plus K est élevé, plus les points échangés sont importants et le classement est sensible aux surprises. K peut diverger entre jeux à l'avenir (ex. CoinCoin).
- `1 - p_vainqueur` : l'écart entre ce qui s'est passé (1 = victoire) et ce qui était prévu pour le vainqueur. Plus la victoire était inattendue, plus cet écart est grand.

**Exemples chiffrés (K = 40) :**

- Deux joueurs à 1000. `p_A = 0,5`, `Δ = 40 × (1 - 0,5) =` **20**. Le gagnant passe à 1020, le perdant à 980.
- Un favori à 1300 bat un joueur à 1000. `p_A ≈ 0,85`, `Δ ≈` **6** seulement (il était censé gagner).
- Le joueur à 1000 crée la surprise et bat le favori à 1300. `p_A ≈ 0,15`, `Δ ≈` **34**. L'outsider rafle gros, le favori chute d'autant.

Conséquences (voulues) :

- Battre un adversaire bien plus faible rapporte peu ; perdre contre lui coûte beaucoup.
- À Elo égal (1000 vs 1000), une victoire vaut exactement **+20 / -20** (K/2).

**Seul le résultat victoire / défaite compte.** Le score chiffré (buts, etc.) n'influence **pas** l'Elo : gagner 5-0 ou 1-0 donne le même nombre de points. Les scores et stats détaillées servent uniquement aux statistiques de profil.

---

## 2. Les 4 classements Elo (par jeu)

Chaque jeu dispose de **4 classements** : le 1v1 et le 2v2 sont des compteurs **indépendants**. L'Elo global est alimenté par **tous** les matchs ; le classement **Villes** en est **dérivé** (il ne modifie aucun Elo individuel).

| Classement | Alimenté par                             | Entité notée          |
| ---------- | ---------------------------------------- | --------------------- |
| **Global** | tous les matchs (1v1, 2v2, asymétriques) | le joueur             |
| **1v1**    | uniquement les matchs 1 contre 1         | le joueur             |
| **2v2**    | uniquement les matchs 2 contre 2         | le **duo** (la paire) |
| **Villes** | dérivé des classements ci-dessus         | l'école / la ville    |

Les matchs asymétriques (1v2 ou 2v1) font bouger l'**Elo global** des joueurs concernés (et donc le classement Villes), mais **pas** les Elos 1v1 ou 2v2.

### Global

Classement alimenté par tous les matchs. C'est l'Elo principal, le plus représentatif du niveau général d'un joueur. Recalculé à chaque match du joueur, quel que soit le format. En équipe de 2, la force du camp est la moyenne des Elos globaux des deux joueurs (voir étape 1).

### 1v1

Classement alimenté uniquement par les matchs strictement 1 contre 1. Compteur indépendant de l'Elo global : mesure le niveau tête-à-tête pur, sans effet coéquipier. Les matchs 2v2 ou asymétriques sont ignorés pour ce classement.

### 2v2 (par duo)

Classement alimenté uniquement par les matchs strictement 2 contre 2. L'entité notée est la **paire**, pas le joueur seul. Chaque duo a son propre Elo (départ à 1000) totalement indépendant des Elos individuels. Le duo est traité **exactement comme un joueur** : il gagne ou perd des points selon la même formule (étapes 1 à 3), où `N` est l'Elo du duo et `N_adverse` celui du duo d'en face.

**Ce n'est PAS la moyenne des deux joueurs.** Vérifié sur les données du sheet : le duo *Sauvage* (Elo global **1622**) et *cRRasseux* (**1260**) a une moyenne de **1441**, alors que son Elo 2v2 officiel est **1220,79**. L'Elo 2v2 d'un duo mesure la performance de la **paire en tant qu'unité**.

Dans le classement joueur, on affiche le **meilleur duo** du joueur (le duo où il a le plus haut Elo). Un classement des duos est aussi disponible (équivalent de l'onglet "Stats 2v2" du sheet).

> **Niveau de confiance.** Le global et le 1v1 sont reproduits à l'identique (erreur 0 sur les 75 joueurs classés). Pour le 2v2 par duo, ce modèle "duo = joueur" s'écarte d'environ 9 points en moyenne des valeurs du sheet (le script d'origine calcule le delta du duo autrement, subtilité non extractible de l'export Excel). C'est volontaire : "duo = joueur" est le modèle Elo standard, le plus propre et le plus simple à maintenir, et on l'assume pour PolyRank. Pour un import 100 % identique des duos plus tard, il faudrait récupérer le script Apps Script du Google Sheet.

### Villes

Classement des villes (écoles) : **somme pondérée** des 5 meilleurs Elos globaux, des 5 meilleurs Elos 1v1 et des 5 meilleurs duos de la ville. Recalculé à la volée à partir des classements joueurs et duos existants, **sans modifier les Elos individuels**.

**Algorithme (repris du Google Sheet, onglet "Classement Villes") :**

Pour chaque école, on calcule trois scores partiels :

| Score partiel | Données utilisées | Règle |
| --- | --- | --- |
| `S_global` | Elos globaux de tous les joueurs de l'école | Somme des **5 meilleurs** Elos globaux |
| `S_1v1`    | Elos 1v1 de tous les joueurs de l'école     | Somme des **5 meilleurs** Elos 1v1     |
| `S_2v2`    | Elos 2v2 de tous les duos **dont les deux joueurs sont de la même école** | Somme des **5 meilleurs** Elos de duo |

Le score final est une somme pondérée :

```
Score école = w_global × S_global + w_1v1 × S_1v1 + w_2v2 × S_2v2
```

Les poids actuels sont `w_global = w_1v1 = w_2v2 = 1` (somme brute des trois partiels). Ils sont ajustables dans la constante `WEIGHTS` de `src/app/classement/page.tsx`.

**Règles d'inclusion :**
- Seuls les joueurs ayant joué **au moins 1 match** contribuent (pas de seuil de 5 matchs sur ce classement).
- Pour le 2v2, un duo mixte (deux écoles différentes) est ignoré.
- Les joueurs "Exté" (école externe) sont agrégés ensemble sous le label "Exté".

---

## 3. Matchs asymétriques (1v2 / 2v1)

Un match où un joueur seul affronte un duo (ou l'inverse).

- **Global** : pris en compte normalement (niveaux selon l'étape 1). Le `Δ` est appliqué en entier à chacun (le joueur seul prend tout le delta, chaque membre du duo prend l'opposé). C'est exactement ce que fait le sheet d'origine.
- **1v1** : **non concerné** (ce n'est pas un 1v1).
- **2v2** : **non concerné** (ce n'est pas un duo contre duo).
- **Villes** : impact indirect via la mise à jour de l'Elo global des joueurs concernés.

---

## 4. Invités (joueurs sans compte)

Un participant peut être saisi comme "invité" (nom libre, sans profil lié). Les invités sont **exclus du calcul Elo** :

- Ils ne sont pas notés et n'apparaissent pas dans `rating_history` ni `player_ratings`.
- Seuls les joueurs **tagués avec un compte** (`profile_id` non nul) participent au calcul.
- Si **tous les joueurs d'un côté** sont des invités, le match est ignoré pour l'Elo des deux camps.
- Si un côté mélange joueurs inscrits et invités, la "force" du côté est calculée sur la **moyenne des seuls joueurs inscrits** (les invités sont transparents).

---

## 5. Égalités

Le système d'origine ne connaît pas l'égalité : un vainqueur est toujours désigné (équipe gagnante saisie en premier). Le schéma autorise `winner_side = NUL` ; si on décide un jour de gérer les nuls, la convention standard est `S = 0.5` pour les deux camps (`Δ = K × (0.5 - p_A)`). Tant que les nuls ne sont pas activés produit, ils ne modifient pas l'Elo.

---

## 6. Quand l'Elo est recalculé

> **Flux décidé** : les matchs sont **validés automatiquement** à la saisie (l'Elo est appliqué dès la fin du match). Un adversaire peut **contester** a posteriori, mais une contestation seule ne touche pas l'Elo. Détail complet du flux dans `docs/DECISIONS.md`.

Cycle de vie :

```
VALIDÉ (auto à la création)              -> Elo appliqué immédiatement
  │
  ├─ le créateur modifie son match ──────────────→ recalcul
  └─ un adversaire CONTESTE → CONTESTÉ (Elo inchangé)
        ├─ le créateur accepte → corrige/supprime → recalcul
        └─ le créateur refuse → appel in-app (photo) → mail auto à arbitre@polyrank.fr
              ├─ admin corrige/supprime → recalcul
              └─ admin confirme → aucun changement
```

**Règle d'or : l'Elo ne change que si le match est modifié ou supprimé.** Une contestation, tant qu'elle n'aboutit pas à une correction ou une suppression, laisse l'Elo intact.

Comme l'Elo dépend de l'ordre chronologique des matchs, la fonction `recompute_ratings` fonctionne ainsi :

- **Cas courant** (nouveau match ajouté en fin de file) : mise à jour **incrémentale**, instantanée.
- **Match passé modifié ou supprimé** : **rejeu complet** des matchs validés, triés par `played_at`. Avec quelques milliers de matchs, c'est quasi instantané. C'est la garantie de cohérence : l'état des Elos est toujours le résultat déterministe du rejeu de l'historique.

---

## 7. Par jeu

Le moteur Elo (étapes 1 à 3, 4 classements) est **identique** pour FifaChamp et CoinCoin aujourd'hui. Les jeux diffèrent par leurs statistiques et par la mise en avant de certains classements dans l'UI.

### FifaChamp (`has_score = true`)

Score chiffré par camp. Statistiques détaillées suivies par match et par camp :
buts, cartons rouges, cartons jaunes, sorties sur blessure, retournées, coups francs directs.

Les **4 classements** (global, 1v1, 2v2, Villes) sont tous actifs.

### CoinCoin (`has_score = false`)

Jeu de précision / vitesse alcoolisé, résultat **binaire** (gagnant / perdant, pas de score chiffré ni de stats détaillées pour l'instant).

Analyse : c'est un jeu de skill (la vitesse de boisson surtout, qui sépare bien les niveaux), mais les parties sont très courtes (parfois 4 lancers) et le facteur décisif entre bonnes équipes (le tir) est instable d'un jour à l'autre. Conséquence : un Elo sépare bien les paliers (débutant / régulier / cador) mais classe mal le top entre lui (beaucoup de bruit). Comme le classement est **avant tout pour le fun**, on assume ce côté mouvant, qui est même une source de chambrage.

Design retenu :

- **Même moteur Elo que FifaChamp** (départ 1000, K = 40, formule standard, 4 classements). K = 40 garde un classement vivant, ce qui colle à l'esprit "déconne" ; on pourra baisser K plus tard si c'est trop chaotique (le facteur K du CoinCoin est isolé dans `src/components/elo/coincoin-elo.tsx` pour faciliter ce changement).
- **Les 4 classements** (global, 1v1, 2v2, Villes) seront tous disponibles, comme au FifaChamp.
- **Classement 2v2 en vedette** : la paire est l'entité mise en avant dans l'UI (le CoinCoin se joue surtout en équipe et le niveau dépend beaucoup du coéquipier).
- Pas de marge de victoire (résultat binaire). Stats détaillées extensibles plus tard sans toucher au moteur.

---

## 8. Statistiques de profil

Calculées par jeu, à partir de l'historique des matchs.

**Communes à tous les jeux :**

- Matchs joués, victoires, défaites, **winrate**
- Les Elos (global, 1v1, meilleur 2v2), le **rang** sur chacun, et le classement **Villes** de l'école
- Courbe d'évolution de l'Elo dans le temps (global / 1v1 / 2v2)

**Spécifiques FifaChamp** (moyennes par match) :
buts/match, rouges/match, jaunes/match, blessures/match, retournées/match, CF directs/match,
avec le rang du joueur sur chaque moyenne.

> Note de reproduction fidèle : dans le sheet, les stats détaillées sont enregistrées **par équipe**. En 2v2, **chaque coéquipier est crédité du total de l'équipe** (ex : si l'équipe marque 3 buts, les deux joueurs voient +3 buts). On reproduit ce comportement.

**Filtre anti-comptes-fantômes :** par défaut, on n'affiche au classement que les joueurs ayant joué au moins **N matchs** (5 au classement, 10 à 20 en stats dans le sheet). Seuil paramétrable.

---

## 9. Données de référence (sheet d'origine)

- 1992 matchs du 14/10/2025 au 26/06/2026, 164 joueurs.
- Répartition : 1118 matchs 1v1, 516 en 2v2, 358 asymétriques (2v1 / 1v2).
- Import de cet historique prévu **plus tard** ; le schéma est conçu pour l'accueillir.
