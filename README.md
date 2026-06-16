[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/AlvesMartim/SportsIn/actions/workflows/ci.yml/badge.svg)](https://github.com/AlvesMartim/SportsIn/actions/workflows/ci.yml)
[![Build avec Gradle](https://github.com/AlvesMartim/SportsIn/actions/workflows/ant.yml/badge.svg)](https://github.com/AlvesMartim/SportsIn/actions/workflows/ant.yml)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=AlvesMartim_SportsIn&metric=coverage&token=0451fed156d904596d1f2244ffcc5586244cd67d)](https://sonarcloud.io/summary/new_code?id=AlvesMartim_SportsIn)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=AlvesMartim_SportsIn&metric=alert_status&token=0451fed156d904596d1f2244ffcc5586244cd67d)](https://sonarcloud.io/summary/new_code?id=AlvesMartim_SportsIn)
# 🏃 InSport - Conquête Sportive en Territoire Urbain

**InSport** est un projet innovant s’inspirant de la logique de jeux en réalité augmentée (type Ingress ou Pokémon Go), mais centré sur la **pratique sportive réelle**.

Le jeu se déroule sur une carte de l’Île-de-France, découpée en points d’intérêt sportifs (parcs, city-stades, gymnases). Les joueurs s'affrontent physiquement pour conquérir ces territoires.

---

## 🎯 Concept Général

1.  **Équipes** : Les joueurs rejoignent des équipes.
2.  **Exploration** : Ils se rendent physiquement sur des points d'intérêt (Points).
3.  **Action** : Ils réalisent une session de sport (Foot, Basket, Running, Musculation...).
4.  **Conquête** : Le Backend analyse la performance et attribue de l'influence. Si l'influence est suffisante, l'équipe **contrôle** le point.

> **Innovation : Les Routes Sportives**
> Certains points sont reliés pour former des chemins stratégiques. Contrôler une route offre des bonus (avantages, protection, missions avancées).

---

## 🧬 L'Avantage du Terrain — ADN des Arènes

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

### ⭐ Méthode recommandée (une seule commande)

```bash
./start-dev.sh
```

Cela démarre automatiquement :
- ✅ La base de données SQLite
- ✅ Le backend Spring Boot (Moteur de jeu & API) - Port 8080
- ✅ Le frontend React (Carte & Interface Joueur) - Port 5173

Accès : **http://localhost:5173**

---

## 📚 Documentation

- **[GAME_MECHANICS.md](docs/GAME_MECHANICS.md)** : Détail des règles (Zones, Routes, Calcul d'influence).
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** : Architecture technique (API REST, Moteur de règles).
- **[DATABASE.md](docs/DATABASE.md)** : Modèle de données.
- **[CONNECTION_GUIDE.md](docs/CONNECTION_GUIDE.md)** : Guide d'intégration.

---

## 🛠 Architecture Technique

Le projet respecte une séparation stricte :

*   **Backend (Java/Spring)** : C'est le cœur du système. Il est totalement autonome et contient toute la logique métier (règles sportives, algorithmes de graphes pour les routes, validation des sessions).
*   **API REST** : Expose les données de manière agnostique (utilisable par n'importe quel client).
*   **Frontend (React)** : Interface visuelle pour la carte et les interactions joueurs.

---

## 👥 Crédits

MOREIRA ALVES Martim<br>
ARNAUD Noé<br>
HASHANI Art<br>
MOUMEN MOKHTARY Aya
