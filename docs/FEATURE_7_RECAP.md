# Feature 7 : L'Avantage du Terrain

**Auteur : Ryad MESSAOUDI**

## 1. Vue d'ensemble

La Feature 7 ajoute un **systeme d'ADN de terrain** au projet SportsIn. Chaque arene est classee automatiquement via l'API **Google Places** selon son environnement reel, ce qui genere des bonus/malus contextuels qui influencent le score des matchs et la conquete des territoires.

### Objectifs
- Classification automatique du type DNA d'une arene (ABYSSE / OLYMPE / EDEN / NEXUS / NEUTRE)
- Systeme de bonus cumule (geo, temporel, aura, affinite, mastery)
- Garde-fou de conquete : les bonus seuls ne peuvent jamais retourner un match domine, ni capturer un terrain defavorable
- Mode strict : aucune donnee simulee en cas d'echec de l'API

---

## 2. Architecture & Design Patterns

```
GooglePlacesService   → appel HTTP + algorithme de scoring/classification
ContextService        → orchestration : classification, bonus, aura, mastery
TerrainMasteryService → activation/expiration du bonus de maitrise
TerrainType (enum)    → regles de bonus geo/temporel par type DNA
ContextInfluenceModifier → s'insere dans la chaine InfluenceCalculator (ordre 30)
SessionService         → applique les bonus au score et arbitre victoire/capture
```

### Chain of Responsibility (Modifier Chain)
`ContextInfluenceModifier` s'insere dans `InfluenceCalculator` apres `RouteInfluenceModifier` (10) et `PerkInfluenceModifier` (20), a l'ordre **30**.

### Principes SOLID
- **Single Responsibility** : classification (GooglePlacesService), orchestration des bonus (ContextService), mastery (TerrainMasteryService) sont separes
- **Open/Closed** : ajouter un nouveau type DNA = ajouter une valeur a l'enum `TerrainType` + ses regles de bonus

---

## 3. Classification DNA des arenes

### Appel API
`GooglePlacesService.callNearbyPlacesInspection()` interroge l'unique endpoint utilise dans tout le projet :
```
GET https://maps.googleapis.com/maps/api/place/nearbysearch/json
    ?location={lat},{lng}&radius=1000&key={apiKey}
```

### Algorithme de scoring (`classifyWithScores`)
Pour chaque lieu retourne par Google Places :
1. **Proximite** : score degressif sur le rayon, boost x2 si le lieu est a moins de 80m (probablement l'arene elle-meme)
2. **Pass 1 — types Google Places** : chaque type a un poids fixe (`typeWeight()`), ex. `stadium`=5.0, `river`=4.5, `park`=4.0
3. **Pass 2 — analyse du nom** : pour les lieux proches (<400m) et non commerciaux, regex par type DNA (priorite OLYMPE > ABYSSE > NEXUS > EDEN)
4. **Decision finale** : le type avec le score le plus eleve l'emporte, sous reserve d'un score minimal (`MIN_TOP_SCORE`) et d'un ecart suffisant avec le 2e (`MIN_SCORE_MARGIN`)

### Mode strict
Si la cle API est absente ou que l'appel echoue (timeout, erreur HTTP, statut Google en erreur), le systeme retourne **NEUTRE** avec une raison explicite — jamais de simulation. Un fallback `classifyByName()` (regex pures, sans appel reseau) est utilise si l'API echoue mais que le nom de l'arene est exploitable.

### Types DNA

| Type | Environnement | Bonus geo | Bonus temporel |
|---|---|---|---|
| ABYSSE | Bords d'eau, lacs, ports, plages | +20% | +5% la nuit (20h-6h) |
| OLYMPE | Stades, musees, monuments iconiques | +20% | +5% en journee (10h-20h) |
| EDEN | Parcs, forets, reserves naturelles | +20% | +5% le matin (6h-12h) |
| NEXUS | Gares, metros, zones logistiques | +20% | +5% aux heures de pointe (7h-9h, 17h-19h) |
| NEUTRE | Aucun signal detecte | 0% | 0% |

`TerrainType.getOpposite()` : ABYSSE <-> NEXUS, OLYMPE <-> EDEN.

---

## 4. Systeme de bonus contextuel

Calcule dans `ContextService.buildContextBonus()`, applique au score final :
```
score final = score brut x (1 + bonus total)
```

| Bonus | Valeur | Condition |
|---|---|---|
| Geo | +20% | Terrain != NEUTRE |
| Temporel | +5% | Heure courante dans la fenetre du type |
| Synergie d'Aura | +10% | L'aura active de l'equipe == type DNA du terrain |
| Affinite d'equipe | +10% / -10% | Affinite == terrain (bonus) ou == terrain oppose (malus) |
| Terrain Mastery | +20% | Mastery actif sur ce type DNA precis |

### Aura d'equipe
`computeAuraFromHistory()` : sur les 10 dernieres arenes **distinctes** capturees, si 7+ partagent le meme `dnaType`, l'aura de ce type s'active. Recalculee a chaque capture (`updateTeamAura`) et resynchronisee au demarrage (`@PostConstruct cleanStaleAuras()`).

### Terrain Mastery
`TerrainMasteryService.checkAndActivateMastery()` : si 5+ captures du meme type parmi les 10 dernieres, active le mastery pour **6h** (`MASTERY_DURATION_MS`), stocke en JSON sur `Equipe.terrainMasteryJson`, expire automatiquement a la lecture.

---

## 5. Garde-fous de victoire et de capture

Dans `SessionService.processSessionCompletion()` :

1. **`resolveEffectiveWinner()`** : si l'equipe leader au score **brut** a un ecart >= 2 points (`RAW_DOMINANCE_THRESHOLD`) et n'est pas l'equipe gagnante apres bonus, le score brut l'emporte — les bonus seuls ne peuvent pas renverser une domination nette.
2. **`canCaptureArena()`** : un vainqueur dont le modifier contextuel est **inferieur** a celui du perdant (terrain qui ne lui est pas favorable) garde ses XP de victoire mais **ne capture pas l'arene**. Comparaison stricte des modifiers, sans marge ni seuil de buts.

---

## 6. Endpoints API REST (`ContextController`)

| Endpoint | Description |
|---|---|
| `GET /api/context/arene/{areneId}?teamId=` | Bonus contextuels actifs pour l'equipe sur cette arene |
| `POST /api/context/arene/{areneId}/identify` | Force l'identification du terrain via Google Places |
| `GET /api/context/arene/{areneId}/surroundings` | Lieux Google Places bruts autour de l'arene (debug) |
| `GET /api/context/arene/{areneId}/classification-debug` | Detail des scores de classification |
| `GET /api/context/team/{teamId}/aura` | Aura actuelle, historique, progression |
| `POST /api/context/arenes/identify-all?force=` | Identifie toutes les arenes (ou seulement celles sans type) |
| `GET /api/context/diagnostic` | Teste l'API Google Places sur un point connu (Parc des Princes) |
| `GET /api/context/api-metrics` | Metriques d'usage de l'API Google Places |

---

## 7. Fichiers crees

| Fichier | Description |
|---|---|
| `model/TerrainType.java` | Enum DNA — bonus geo/temporel, opposes |
| `services/GooglePlacesService.java` | Appel API, scoring, classification |
| `services/ContextService.java` | Orchestration des bonus, aura, mastery |
| `services/TerrainMasteryService.java` | Activation/expiration du Terrain Mastery |
| `services/ContextInfluenceModifier.java` | Modificateur d'influence (chaine) |
| `services/APIMetricsService.java` | Metriques d'usage de l'API Google Places |
| `controller/ContextController.java` | Endpoints REST `/api/context/*` |
| `dto/ContextBonusDTO.java` | DTO des bonus contextuels |
| `dto/TerrainMasteryDTO.java` | DTO du Terrain Mastery |

## 8. Fichiers modifies

| Fichier | Modification |
|---|---|
| `services/SessionService.java` | Application des bonus au score, garde-fous victoire/capture |
| `services/TerritoryService.java` | Declenche classification + mise a jour de l'aura apres capture |
| `model/Arene.java` | Champs `dnaType`, `dnaConfidence`, `dnaPlacesCount`, `dnaEvidence` |
| `model/user/Equipe.java` | Champs `captureHistory`, `currentAura`, `affinityType`, `terrainMasteryJson` |
| `resources/schema.sql` / `data.sql` | Colonnes DNA + donnees initiales |
| `resources/application.properties` | Cle `google.places.api.key` |

---

## 9. Diagramme de flux

```
Capture d'une arene (fin de match)
     |
     v
SessionService.applyContextBonusesToScores()
     |
     +--> ContextService.computeContextModifier(teamId, areneId)
     |        |
     |        +--> resolveTerrain() -> dnaType deja classe (ou re-classification si corrompu)
     |        +--> bonus geo + temporel + aura + affinite + mastery
     |
     v
score final = score brut x (1 + bonus total)
     |
     v
resolveEffectiveWinner()  -> garde-fou domination brute (>= 2 pts)
     |
     v
canCaptureArena()  -> garde-fou terrain oppose
     |
     v
TerritoryService.updateTerritoryControl()
     |
     +--> ContextService.identifyAndSaveArenaType()   (si jamais classee)
     +--> ContextService.updateTeamAura()              -> recalcule l'aura
              +--> TerrainMasteryService.checkAndActivateMastery()
```

---

## 10. Comment ajouter un nouveau type DNA

1. Ajouter la valeur a l'enum `TerrainType` avec ses regles `getGeoScoreBonus()`, `getTimeBonus()`, `getOpposite()`.
2. Ajouter les types Google Places et patterns de noms correspondants dans `GooglePlacesService` (`XXX_TYPES`, `XXX_NAME_PATTERN`, `typeWeight()`, `mapTypeToTerrain()`).
3. Aucune autre modification necessaire : `ContextService.buildContextBonus()` et les garde-fous de `SessionService` operent sur `TerrainType` de maniere generique.
