# Aura — règles de design

Ce document est la source de vérité visuelle. Il s'applique à tous les projets
qui utilisent Aura, y compris quand un écran est écrit à la main.

---

## 1. Intention

Chaque app doit avoir **une** personnalité, pas trois.

Choisir une direction et s'y tenir :

| Direction | Mots-clés | Quand |
|---|---|---|
| **Paper / editorial** | chaleureux, calme, typographie forte, peu d'ombres | lecture, journal, finances |
| **Precision / instrument** | dense, contrasté, chiffres tabulaires, teal | dashboard, automobile, sport |
| **Soft / lifestyle** | rond, lumineux, photos, micro-motion | bien-être, food, social |

Aura fournit les tokens ; la direction se choisit **avant** de coder.

---

## 2. Typographie

- Deux familles maximum : une display (`Bricolage Grotesque` par défaut) et une
  UI (`Inter Tight`).
- La display ne sert qu'aux titres, aux chiffres clés et aux gros labels.
- Le corps reste à 15 px minimum sur mobile.
- Tracking négatif sur les gros titres (`-0.03em`), jamais sur le corps.
- `text-wrap: balance` sur les titres, `pretty` sur les paragraphes.
- Chiffres : `font-variant-numeric: tabular-nums` (classe `.aura-num`).

Interdits :
- Serif italique en hero « pour faire éditorial ».
- Trois tailles de titre dans la même section.
- Texte gris clair sur fond clair (contraste < 4,5:1).

---

## 3. Couleur

- **Un** accent. Il porte l'action, l'état actif et la donnée clé.
- Le fond n'est jamais blanc pur : `--aura-bg` est légèrement teinté.
- Les surfaces sont empilées : `bg` → `surface` → `surface-2`.
- Les états ont chacun un fond `-soft` et une couleur pleine.
- En sombre, l'accent s'éclaircit et le texte de bouton devient sombre.

Interdits :
- Dégradé violet → rose générique.
- Accent utilisé pour 5 éléments différents.
- Glassmorphism sur une carte de contenu (réservé aux barres et overlays).

---

## 4. Espacement & formes

- Échelle de 4 px. Les écrans utilisent 16 ou 20 px de marge latérale.
- Rayons : 12 (petit), 16 (champ), 22 (carte), 28 (héro/sheet), full (bouton).
- Ombres diffuses, jamais noires dures. Une seule élévation visible par écran.
- Les cartes ont une bordure 1 px `--aura-line` : c'est elle qui structure,
  pas l'ombre.

---

## 5. Layout mobile

- Largeur de contenu : 448 px max, centrée sur desktop dans un cadre.
- Barre haute : 56–64 px + safe area.
- Tab bar : 62–68 px + safe area, 5 onglets max, CTA central autorisé.
- Une seule signature visuelle par barre : ici une capsule pleine qui glisse
  sous l'onglet actif. Pas de verre + anneau + halo empilés.
- CTA central : squircle 40 px qui dépasse de 6 px au-dessus de la barre, même
  ligne de libellé que les autres onglets, libellé en accent.
- Une action primaire par écran. Le reste est secondaire ou tertiaire.
- Le scroll est vertical ; l'horizontal est réservé aux chips/carrousels.

---

## 6. Mouvement

- Durées : 120 ms (feedback), 200 ms (contrôle), 320 ms (transition),
  520 ms (entrée de page).
- Courbe par défaut : `cubic-bezier(0.22, 1, 0.36, 1)`.
- Ressort pour les éléments tactiles : `cubic-bezier(0.34, 1.46, 0.64, 1)`.
- Une animation doit expliquer un changement d'état, pas décorer.
- `prefers-reduced-motion` : tout tombe à 0,001 ms.

Interdits :
- Fade-in au scroll sur chaque section.
- Parallaxe sur mobile.
- Animation infinie qui distrait de la tâche.

---

## 7. Densité & hiérarchie

Un écran doit répondre à trois questions dans cet ordre :

1. **Où suis-je ?** (titre, contexte, navigation)
2. **Quel est le chiffre / l'état important ?** (héro ou stat)
3. **Que puis-je faire ?** (action primaire, puis secondaire)

Si tout est important, rien ne l'est. Maximum :
- 1 héro
- 3 stats
- 1 action primaire
- 5 onglets

---

## 8. Anti-patterns « AI slop »

À ne pas produire :

- Dégradé violet/rose, glow néon, particules.
- « Hero » avec eyebrow + titre + sous-titre + 2 CTA + logos clients.
- Cartes imbriquées dans des cartes.
- Glassmorphism partout, y compris sur du texte.
- Icônes emoji à la place d'un vrai set.
- Ombres noires 0 0 0 / 0.5.
- Trois polices, dont un serif italic.
- Textes génériques (« Transformez votre expérience »).
- Sections numérotées 01/02/03 sans contenu réel.
- Tableaux qui débordent sur mobile.

---

## 9. Cas d'école : Drivly

Direction : **Precision / instrument**, avec une touche chaleureuse.

- Accent : teal automobile, mais assombri pour le texte (`accent-strong`).
- Display : Bricolage Grotesque pour les montants et les mois.
- UI : Inter Tight pour le corps.
- Héro unique : le mois en cours (dépenses, distance, consommation).
- Timeline verticale : rail fin, points colorés par type d'événement.
- Tab bar : capsule pleine qui glisse sous l'onglet actif, CTA surélevé.
- La couleur orange reste réservée aux pleins / alertes.

Ce fichier doit être mis à jour quand une règle change.
