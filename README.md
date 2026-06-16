[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

# 🧬 SportsIn — L'Avantage du Terrain

**Par Ryad MESSAOUDI**

**SportsIn** est un jeu de conquête sportive en territoire urbain inspiré des jeux en réalité augmentée (type Ingress ou Pokémon Go), centré sur la **pratique sportive réelle**.

Cette feature, **L'Avantage du Terrain**, identifie automatiquement l'ADN de chaque arène via l'API **Google Places** et applique un système de bonus contextuel qui influence le résultat des matchs et la conquête des territoires.

📄 **Documentation technique complète** : [docs/FEATURE_7_RECAP.md](docs/FEATURE_7_RECAP.md)
🎤 **Présentation** : [Releases](https://github.com/ryad1602/SportsIn/releases) (la diapositive 8 contient une démo de la feature)

---

## 🧬 ADN des Arènes

Chaque arène possède un **type DNA** identifié automatiquement via l'API **Google Places** (Nearby Search) à partir de son environnement réel :

| Type | Environnement | Bonus temporel |
|---|---|---|
| 🌊 **ABYSSE** | Bords d'eau, lacs, ports, plages | +5% la nuit (20h–6h) |
| 🏛️ **OLYMPE** | Stades, musées, monuments iconiques | +5% en journée (10h–20h) |
| 🌿 **EDEN** | Parcs, forêts, réserves naturelles | +5% le matin (6h–12h) |
| 🚉 **NEXUS** | Gares, métros, zones logistiques | +5% aux heures de pointe |
| ⚪ **NEUTRE** | Aucun signal détecté | Aucun bonus |

**Comment ça marche techniquement :**
- Un algorithme de scoring analyse les lieux environnants (types Google Places + indices dans les noms) et pondère chaque candidat selon sa distance et sa pertinence.
- En cas d'échec de l'API, le système ne simule jamais une donnée : il retourne `NEUTRE` avec une trace explicite de la cause.

**Système de bonus contextuel cumulé**, appliqué directement au score d'un match (`score final = score brut × (1 + bonus total)`) :
- **Bonus géo** (+20%) — le type de terrain de l'arène
- **Bonus temporel** (+5%) — selon l'heure de la session
- **Synergie d'Aura** (+10%) — si l'équipe a développé une Aura compatible
- **Affinité d'équipe** (±10%) — bonus si l'équipe est alignée avec le terrain, malus si opposée
- **Terrain Mastery** (+20%) — maîtrise acquise par la domination répétée d'une arène

**Garde-fou de conquête** : une équipe qui gagne un match sur un terrain qui lui est défavorable (moins de bonus que l'adversaire) remporte la victoire et ses XP, mais **ne capture pas l'arène** — le terrain protège naturellement l'équipe la mieux alignée avec son ADN.

**Aura d'équipe** : en capturant 7 arènes **distinctes** du même type DNA parmi ses 10 dernières conquêtes, une équipe développe l'Aura correspondante, activant la synergie de +10% sur tout terrain de ce type.

---

## 🚀 Démarrage Rapide

### Backend (terminal 1)

```bash
./gradlew :app:bootRun
```

Démarre le serveur Spring Boot sur le port **8080** (API REST + base SQLite initialisée automatiquement).

### Frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Démarre le frontend React sur **http://localhost:5173**.

---

## 🛠 Architecture Technique

*   **Backend (Java/Spring)** : logique métier (classification DNA, calcul des bonus, règles de victoire/capture).
*   **API REST** : `/api/context/...` expose les bonus contextuels et la classification des arènes.
*   **Frontend (React)** : carte interactive et affichage des bonus en temps réel.

---

## 👥 Crédits

**Ryad MESSAOUDI**
