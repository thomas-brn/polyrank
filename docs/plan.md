# Plan projet — PolyRank

Site de saisie des résultats de matchs et leaderboards pour élèves ingénieurs

**5 phases · 21 tâches · ~8 semaines**

---

## Phase 1 — Cadrage & architecture (~1 semaine)

### Définir les rôles utilisateurs
Élève joueur, capitaine d'équipe, admin (prof ou bureau des sports). Quelles permissions pour chaque rôle.  
`UX` `Fonctionnel`

### Lister les sports et formats de matchs
Football, basket, ping-pong… chaque sport a des règles de score différentes (sets, points, mi-temps).  
`Fonctionnel`

### Choisir la stack technique
Frontend (React, Vue…), backend (Node, Django…), base de données (PostgreSQL, Firebase…), hébergement.  
`Technique`

### Définir la structure des pages du site
Accueil → Leaderboards → Saisie de match → Profil → Admin. Arborescence et navigation.  
`UX`

---

## Phase 2 — Authentification des élèves (~1 semaine)

### Choisir la méthode d'authentification
- **Option A — SSO :** connexion via l'ENT ou compte Microsoft/Google académique (recommandé, zéro gestion de mots de passe).
- **Option B — Inscription manuelle :** l'admin crée les comptes, l'élève reçoit un email d'invitation.
- **Option C — Code promo :** un code secret permet l'inscription (simple mais moins sécurisé).

`Sécurité` `Backend`

### Profil élève
Nom, promo/classe, sports pratiqués, photo. Lié à ses matchs joués et son classement.  
`BDD` `Frontend`

### Gestion des sessions & sécurité
Tokens JWT ou sessions serveur. Déconnexion automatique. Protection des routes privées.  
`Sécurité` `Backend`

---

## Phase 3 — Saisie & validation des matchs (~2 semaines)

### Formulaire de saisie d'un match
Sport, date, équipe A vs équipe B, score, lieu. Adapté selon le sport (sets pour tennis, mi-temps pour foot…).  
`Frontend` `UX`

### Système de validation du score
Le résultat doit être confirmé par les deux équipes (ou par un admin) avant d'être comptabilisé. Évite les faux scores.  
`Fonctionnel` `Backend`

### Notifications de confirmation
Email ou notification in-app envoyé à l'équipe adverse pour valider le score soumis.  
`Backend`

### Modification & contestation d'un score
Que se passe-t-il si le score est incorrect ? Fenêtre de temps pour contester, rôle de l'admin en arbitre.  
`Fonctionnel`

### Historique des matchs
Page listant tous les matchs passés, filtrables par sport, date, équipe ou joueur.  
`Frontend` `BDD`

---

## Phase 4 — Leaderboards & statistiques (~2 semaines)

### Définir les métriques de classement
Points par victoire/défaite/nul, ratio victoires, système Elo… À définir par sport. Décision clé qui impacte tout le reste.  
`Fonctionnel` `BDD`

### Leaderboard général (toutes classes)
Classement global par sport, avec pagination, avatars et évolution (↑↓) par rapport à la semaine précédente.  
`Frontend`

### Classement par promo / classe
Filtre permettant de voir uniquement les élèves d'une même promo. Utile pour les compétitions inter-promos.  
`Frontend` `BDD`

### Page profil & stats personnelles
Historique de matchs d'un joueur, win rate, sports joués, progression du classement dans le temps.  
`Frontend`

### Mise à jour en temps réel (optionnel)
Websockets ou polling pour que les leaderboards se rafraîchissent automatiquement après un nouveau résultat.  
`Backend` `Bonus`

---

## Phase 5 — Administration & déploiement (~2 semaines)

### Interface admin
Gérer les utilisateurs, valider/supprimer des matchs litigieux, créer des saisons ou tournois, exporter les données.  
`Frontend` `Backend`

### Responsive mobile
Les élèves saisiront les scores depuis leur téléphone juste après un match. L'UI doit être utilisable sur mobile.  
`Frontend` `UX`

### Sécurité & anti-triche
Rate limiting sur l'API, validation côté serveur de tous les scores, logs d'activité pour détecter les abus.  
`Sécurité` `Backend`

### Déploiement & nom de domaine
Héberger le site (Vercel, Railway, VPS…), configurer un domaine type polyrank.fr, HTTPS.  
`DevOps`

### Tests & bêta avec un groupe pilote
Faire tester par une promo avant le lancement général. Recueillir les retours, corriger les bugs critiques.  
`QA`
