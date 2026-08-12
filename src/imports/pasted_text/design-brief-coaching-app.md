Brief de design — Application de coaching pour clubs d'athlétisme
Version mobile + web, direction "Liquid Glass premium" inspirée Strava
1. Positionnement produit
Plateforme qui centralise l'entraînement d'un club d'athlétisme : les coachs créent et publient des séances par groupe de niveau, les athlètes suivent leurs allures et leurs données, et coachs/athlètes communiquent au même endroit — sur mobile ET sur ordinateur.

Cible : clubs affiliés FFA, coachs indépendants, sections entreprise/université.
Différenciateur : spécialisation athlétisme (allures par %VMA, séances qualifiées) + expérience premium que ne proposent pas les outils généralistes (SportEasy, Hexfit).

2. Direction artistique
Inspirations à combiner
Apple / Liquid Glass (iOS 26-27, HIG 2026) : matière translucide, dynamique, qui reflète et réfracte le contenu ; utilisée pour créer de la hiérarchie et de la profondeur sans surcharger visuellement.

Strava : lisibilité des données de performance, hiérarchie forte des chiffres, cartes de contenu épurées, usage du orange comme signature.

Règles Liquid Glass à respecter (issues des guidelines Apple 2026)
Le verre appartient à la couche de navigation, jamais à la couche de contenu. Utiliser Liquid Glass pour : barres de navigation, tab bar, toolbars flottantes, sheets, popovers, menus, boutons d'action flottants.

Ne jamais appliquer le verre à : listes, cartes de données, tableaux, fonds plein écran, zones qui scrollent.

Ne jamais empiler deux effets de verre l'un sur l'autre (glass on glass) — ça crée un rendu flou et illisible.

Utiliser un conteneur unique (GlassEffectContainer) quand plusieurs éléments de verre coexistent, pour une transition fluide entre eux.

Deux variantes : Regular (utilisable partout) et Clear (réservée aux fonds riches en image/média, avec calque d'assombrissement, et contenu au-dessus bold/lumineux).

Le tint (teinte colorée) doit rester rare et réservé aux actions principales.

Contraste minimum 4.5:1, texte vibrant sur le verre, légère bordure pour la lisibilité.

Hiérarchie : Contenu (fond, primaire) → Contrôles en verre (secondaire) → Overlays/vibrance (tertiaire).

Cibles tactiles minimum 44×44 pt.

Traduction concrète pour cette app
Fond de contenu : noir profond/anthracite en mode sombre (cohérent avec ton design actuel), blanc cassé en mode clair — jamais de verre ici.

Tab bar (mobile) : capsule flottante en Liquid Glass, insérée avec une marge par rapport aux bords, contenu qui défile derrière.

Sidebar (web) : équivalent verre translucide sur les côtés, contenu qui scrolle derrière.

Boutons d'action principaux, sheets de séance, messagerie en overlay : verre avec tint jaune moutarde réservé aux CTA (call-to-action) uniquement.

Cartes de données (stats, séances, messages) : jamais de verre — fond plein légèrement plus clair que le fond général, bords arrondis, ombre discrète.

Couleur signature : jaune moutarde (accent), conservé de l'identité actuelle, utilisé avec parcimonie comme le orange chez Strava.

Palette
text

Fond sombre (contenu)     #0E0E0D
Fond clair (contenu)      #F7F5EF
Surface carte sombre      #1B1B19
Surface carte claire      #FFFFFF
Accent principal          #F2C400 (jaune moutarde)
Texte primaire sombre     #FFFFFF
Texte primaire clair      #14140F
Texte secondaire          #9C9A92
Bleu (natation/data)      #5B91D8
Vert (validé/positif)     #5EBA65
Rouge (alerte/courbature) #E4574A
Violet (fatigue)          #7C6FE0
Orange (Strava/intégr.)   #FC5200
Typographie
Police système (SF Pro sur Apple, Inter/Roboto équivalent web) pour la cohérence multi-plateforme.

Chiffres clés : Bold, grande taille, chasse légèrement condensée façon compteur de performance.

Labels : régulier, petite taille, majuscules avec tracking large pour les surtitres ("SÉANCES CETTE SEMAINE").

3. Architecture responsive (mobile + web)
Mobile (iOS/Android)
Navigation basse en tab bar Liquid Glass flottante (Home, Entraînements, Messagerie, Stats).

Écrans en scroll vertical plein écran, cartes empilées.

Actions secondaires dans des sheets qui remontent du bas (glass en arrière-plan du sheet, contenu plein à l'intérieur).

Web (desktop/tablette)
Sidebar gauche fixe en verre translucide : logo, navigation principale (Home, Entraînements, Messagerie, Stats, Groupes [coach], Réglages), sélecteur de club/saison en bas.

Zone de contenu centrale en grille responsive (2-3 colonnes pour les cartes de stats au lieu d'un empilement vertical strict).

Panneau de droite optionnel pour la messagerie (vue "boîte mail" avec liste de conversations à gauche du panneau, conversation ouverte à droite), au lieu d'un plein écran comme sur mobile.

Barre supérieure en verre avec recherche, notifications, avatar.

Les tableaux (temps de passage, repères de course) s'affichent en vraies tables larges sur web, en tableaux scrollables horizontalement sur mobile.

Comportement cohérent entre les deux
Même design system (couleurs, typographie, composants de carte) partout.

Le contenu ne change pas de nature, seulement sa disposition (empilé vs grille, sheet vs panneau latéral).

4. Écrans à designer — Espace Athlète
4.1 Home
Header : logo, nom app, avatar

Salutation + date

Carte résumé semaine : minutes, séances (x/y), km

Carte prochaine échéance : compte à rebours, distance, objectif chrono

Sélecteur de jours (semaine glissante)

Carte séance du jour : détail, statut fait/à faire, bouton "commencer"

Bouton "séance libre" (hors plan)

Bloc "Ma semaine" : progression km/séances, mini graphique

Bloc "Ma saison" : km semaine/saison, VMA, tendances

Bilan de forme du jour : sommeil, motivation, fatigue, courbatures, stress (sliders/cercles)

Graphique évolution de la forme

4.2 Entraînements
Statut intégration Strava + bouton sync

Calendrier mensuel (pastilles de statut)

Détail du jour sélectionné

Bouton ajouter séance

Bloc objectifs & compétitions (onglets, compte à rebours, CRUD)

Bloc entraînement croisé (vélo, natation, gainage) avec historique et graphique

Résumé mensuel multi-discipline

4.3 Messagerie (NOUVEAU — à designer en priorité)
Mobile :

Liste de conversations (coach, groupe, club) avec aperçu dernier message, badge non-lu

Vue conversation individuelle : bulles de message, horodatage, statut lu

Vue conversation de groupe : nom des expéditeurs affiché, distinction visuelle coach vs athlètes

Barre de saisie en bas avec pièce jointe (photo, capture d'activité), envoi de note vocale

Possibilité de réagir/répondre à un message précis (ex. réagir à une séance publiée)

Annonces de club épinglées en haut de la liste (non-effaçables, visuellement distinctes)

Web :

Layout 2 colonnes : liste des conversations à gauche (sidebar secondaire), conversation ouverte à droite

Recherche dans les conversations

Indicateur de présence (en ligne/dernière connexion) optionnel

4.4 Stats
Sélecteur athlète/saison + bascule semaine/mois

Cartes indicateurs clés (km, %, séances)

Graphiques : kilométrage mensuel prévu/réalisé, kilométrage par semaine, poids

Bloc forme (sommeil/courbatures/fatigue) avec onglets et graphique

Donut répartition par discipline

Bloc performance : onglets Allures/Musculation, VMA modifiable, tableau temps de passage, tableau repères de course

Charge d'entraînement (RPE × durée)

Records personnels (CRUD, badge "SB")

4.5 Profil / Réglages
Identité (photo, nom, email, club)

Apparence (clair/sombre)

Sécurité (mot de passe)

Notifications (email, push, granularité par type : messages, séances publiées, rappels de bilan)

Intégrations : Strava, Apple Santé, Google Fit, Coros, Garmin

Fiche FFA (lien athle.fr)

Mises à jour

Feedback

5. Écrans à designer — Espace Coach
5.1 Dashboard coach (Home coach)
Vue d'ensemble de tous les groupes gérés

Par groupe : nombre d'athlètes, taux de complétion des séances de la semaine, alertes de forme (badge rouge si surcharge/fatigue détectée)

Accès rapide : créer une séance, envoyer une annonce

5.2 Gestion des groupes
Liste des groupes de niveau (débutants, confirmés, élite...)

Création/édition de groupe, ajout/retrait d'athlètes

Vue détaillée d'un groupe : liste des athlètes avec statut du jour (fait/pas fait/forme)

5.3 Création de séance
Éditeur de séance : type, contenu, allures par %VMA (calculées automatiquement par athlète du groupe)

Bibliothèque de séances types (dupliquer/adapter)

Assignation à un ou plusieurs groupes

Publication programmée (date/heure)

5.4 Vue athlète (côté coach)
Fiche complète d'un athlète : historique, VMA, forme, blessures, notes privées du coach (non visibles par l'athlète)

Historique de messages avec cet athlète

5.5 Messagerie coach (vue étendue)
Mêmes composants que côté athlète, avec en plus :

Diffusion de message à un groupe entier en un clic

Annonces de club (visibles par tous)

Filtrage par groupe/athlète

5.6 Statistiques de club (agrégées)
Taux d'assiduité global, progression collective, comparatif entre groupes

Export de données (PDF/CSV)

6. Composants du design system à créer dans Figma
Tab bar mobile (Liquid Glass, 4 icônes + état actif tinté jaune)

Sidebar web (Liquid Glass, items de navigation, sélecteur de club)

Carte de données (fond plein, coins arrondis 20-24px, ombre douce)

Carte séance (statut coloré en bordure gauche : vert=fait, jaune=à faire, gris=repos)

Anneau de progression circulaire (2 tailles : petit indicateur, grand hero)

Graphique en aire avec dégradé (courbes de tendance)

Donut chart (répartition disciplines)

Bulle de message (2 variantes : émise/reçue, + variante groupe avec nom expéditeur)

Sheet modal (glass en fond, contenu plein à l'intérieur, poignée de fermeture en haut)

Boutons : primaire (fond jaune plein), secondaire (contour), tertiaire (texte seul)

Badge de statut (non-lu, alerte forme, SB record)

Champ de saisie (texte, nombre avec +/-, date picker)

Avatar (avec état en ligne pour la messagerie)