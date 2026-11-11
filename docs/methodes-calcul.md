# Méthodes de calcul d'inventaire

Ce document fait foi pour le calcul des quantités finales et des écarts. Toutes les
règles décrites ici sont implémentées dans un unique service,
`apps/api/src/common/inventory-calculation/inventory-calculation.service.ts`, et
couvertes par des tests unitaires.

## Vocabulaire

| Terme | Définition |
|---|---|
| **Ligne d'inventaire** | Un triplet (liste, article, emplacement). Unité élémentaire de comptage. |
| **Quantité théorique** (`T`) | Quantité attendue, issue du fichier importé. |
| **Comptage** | Une saisie d'un utilisateur sur une ligne, à un instant donné. |
| **Comptages valides** (`C`) | Les comptages de la ligne dont le statut est `VALID` (un comptage annulé est exclu de tout calcul). |
| **Quantité finale** (`F`) | Quantité retenue à l'issue du calcul. `NULL` tant que la ligne n'est pas résolue. |

### Statuts d'une ligne

| Statut | Signification |
|---|---|
| `PENDING` | Jamais comptée — **pas encore traitée**, ce qui n'est pas la même chose qu'absente du stock |
| `COUNTED` | Comptée (Méthode 1) |
| `AWAITING_SECOND_COUNT` | Méthodes 2 et 3 : un second comptage est attendu, **bloque la clôture** |
| `AWAITING_THIRD_COUNT` | Méthode 3 : un troisième comptage est attendu, **bloque la clôture** |
| `UNDER_INVESTIGATION` | Méthode 3 : trois comptages n'ont pas confirmé le théorique, **bloque la clôture** — seule l'enquête du superviseur la résout |
| `DISCREPANCY` | Méthode 2 : avis divergents, **bloque la clôture** |
| `CONFIRMED` | Avis concordants, départagés, arbitrés ou tranchés par enquête |
| `NOT_FOUND` | Déclarée introuvable par un opérateur |

La distinction `PENDING` / `NOT_FOUND` est importante : pendant la campagne, une
ligne jamais comptée reste simplement à traiter. Ce n'est qu'**à la clôture** que
les deux statuts convergent et reçoivent la quantité 0.

Une méthode est identifiée par un **code** stocké en base (`inventory_methods.code`).
Ajouter une méthode consiste à insérer une ligne dans cette table et à enregistrer
une stratégie correspondante dans le service : **aucune migration de schéma n'est
nécessaire**.

---

## Méthode 1 — Somme cumulative (`METHOD_1`)

### Principe

Chaque comptage est considéré comme une **saisie partielle** : une zone, un
opérateur, un passage. Les comptages s'additionnent au lieu de se remplacer.

### Règle

```
F = Σ quantité(c) pour tout c ∈ C

si |C| = 0  →  statut PENDING,  F reste NULL   (mis à 0 à la clôture)
si |C| ≥ 1  →  statut COUNTED,  F = somme
```

### Quand l'utiliser

Grands périmètres découpés par zone, où plusieurs magasiniers couvrent chacun une
partie distincte du même article (par exemple un article stocké sur trois allées).

### Exemple

| Comptage | Opérateur | Quantité |
|---|---|---|
| 1 | Karim | 12 |
| 2 | Yacine | 8 |
| 3 | Karim | 5 |

`F = 12 + 8 + 5 = 25`. Pour `T = 30` : écart `= −5` (manque de 5).

### Point d'attention

Un même périmètre compté deux fois par erreur produit un doublon arithmétique.
Cette méthode suppose un découpage rigoureux des zones. Si ce n'est pas garanti,
utiliser la Méthode 2.

---

## Méthode 2 — Double comptage contradictoire (`METHOD_2`)

### Principe

Au moins deux comptages **indépendants**, réalisés par des **utilisateurs
différents**, doivent concorder pour que la quantité soit retenue. C'est le
comptage contradictoire classique de l'inventaire physique.

### Règle

On ne retient que le **dernier comptage de chaque utilisateur** :

```
V = { dernier comptage valide, par utilisateur distinct }

|V| = 0                        →  PENDING,               F = NULL
|V| = 1                        →  AWAITING_SECOND_COUNT, F = NULL
|V| ≥ 2 et toutes égales       →  CONFIRMED,             F = cette valeur
|V| ≥ 2 et valeurs divergentes →  DISCREPANCY,           F = NULL
```

### Résolution d'un litige (`DISCREPANCY`)

Deux issues possibles, dans cet ordre de priorité :

1. **Valeur majoritaire stricte.** Un troisième comptage départage : si une valeur
   apparaît strictement plus souvent que toutes les autres, elle est retenue
   (`F = valeur majoritaire`, statut `CONFIRMED`).
2. **Arbitrage du superviseur.** Le superviseur saisit `arbitrated_qty` avec un
   motif. Cette valeur prime sur tout — y compris en Méthode 1, et y compris si
   elle vaut 0 : `F = arbitrated_qty`, statut `CONFIRMED`. L'auteur et
   l'horodatage de l'arbitrage sont enregistrés.

Tant qu'aucune des deux ne s'applique, **la clôture de la campagne est bloquée** et
la ligne apparaît dans le rapport des litiges.

### Quand l'utiliser

Articles à forte valeur, pièces de rechange, tout périmètre où une erreur de
comptage coûte cher.

### Exemples

| Cas | Comptages retenus | Résultat |
|---|---|---|
| Concordance | Karim : 40 · Yacine : 40 | `CONFIRMED`, `F = 40` |
| Attente | Karim : 40 | `AWAITING_SECOND_COUNT`, `F = NULL` |
| Litige | Karim : 40 · Yacine : 37 | `DISCREPANCY`, `F = NULL` |
| Litige départagé | Karim : 40 · Yacine : 37 · Sofiane : 40 | `CONFIRMED`, `F = 40` (majorité stricte) |
| Litige arbitré | Karim : 40 · Yacine : 37, arbitrage superviseur à 38 | `CONFIRMED`, `F = 38` |
| Pas de majorité | Karim : 40 · Yacine : 37 · Sofiane : 35 | `DISCREPANCY` maintenu, arbitrage obligatoire |

### Point d'attention

Deux comptages du **même** utilisateur ne valent qu'un seul comptage : seul son
dernier comptage est conservé. C'est ce qui garantit le caractère contradictoire
de la méthode.

---

## Méthode 3 — Comptages successifs et enquête (`METHOD_3`)

Règle arrêtée avec l'exploitant lors de la recette du 11 novembre 2026, et
appliquée telle quelle.

### Principe

Les comptages sont des **passages successifs** — « comptage 1 », « comptage 2 »,
« comptage 3 » — ordonnés par horodatage, et non par opérateur. La quantité
théorique `T` issue de l'extraction SAP sert de référence de validation : dès
qu'un comptage la confirme, la ligne est close.

### Règle

Soient `C1`, `C2`, `C3` les comptages valides dans l'ordre chronologique.

```
C1 = T                        → OK, quantité retenue = T
sinon C2 = T                  → OK, quantité retenue = T
      C2 = C1                 → OK, quantité retenue = C2
      sinon C3 = T            → OK, quantité retenue = T
            sinon             → ENQUÊTE (4e niveau)
```

| État | Statut | Quantité retenue |
|---|---|---|
| Aucun comptage | `PENDING` | — |
| `C1 ≠ T`, un seul comptage | `AWAITING_SECOND_COUNT` | — |
| `C2 ∉ {T, C1}`, deux comptages | `AWAITING_THIRD_COUNT` | — |
| `C3 ≠ T` | `UNDER_INVESTIGATION` | — |
| Confirmé à l'un des trois passages | `CONFIRMED` | la valeur confirmée |
| Tranché par enquête | `CONFIRMED` | la quantité du superviseur |

### Deux choix à expliciter

**Le théorique fait autorité dès qu'un comptage le confirme.** Un seul passage
suffit alors. Sur le fichier de référence, l'écrasante majorité des lignes sont
justes : exiger systématiquement deux comptages reviendrait à faire recompter
huit mille lignes pour en corriger quelques dizaines.

**Au 3e passage, la concordance entre comptages ne suffit plus.** Si `C3`
diffère du théorique, deux hypothèses s'opposent depuis le début. Retenir une
majorité à ce stade reviendrait à trancher automatiquement précisément les
lignes sur lesquelles l'exploitant doit poser les yeux. La ligne part donc en
enquête, sans quantité retenue.

### L'enquête — le 4e niveau

Elle n'est pas un comptage de plus : c'est une **décision**, et aucun comptage
supplémentaire ne la remplacera. Un 4e comptage spontané laisse la ligne en
`UNDER_INVESTIGATION`.

- Réservée aux rôles `ADMIN` et `SUPERVISOR`.
- **Motif obligatoire** (`PATCH /items/:id/arbitrate`, champ `note`) : la
  décision engage le résultat de l'inventaire, elle doit porter sa justification.
- La quantité saisie devient la quantité retenue et prime sur tous les comptages.
- L'action est journalisée avec son auteur, sa date et son motif.

### Verrou de recomptage

**Un même opérateur ne peut pas compter deux fois la même ligne.** L'API répond
`409` avec le code `COUNT_ALREADY_RECORDED` et rappelle la quantité déjà saisie.
Seul un superviseur peut annuler le comptage précédent pour rouvrir la saisie.

Ce verrou répond à un défaut constaté sur le terrain : un article scanné deux
fois voyait sa quantité **s'additionner silencieusement**. Le refus est
volontairement sec — laisser l'opérateur corriger lui-même rouvrirait la porte
que l'on ferme, et une correction non tracée est indiscernable d'une erreur.

Le verrou est une propriété de la méthode, pas une règle globale : la Méthode 1
l'autorise, puisque l'addition de saisies partielles est son principe même.

### Quantité théorique et opérateurs

Le théorique n'est **jamais transmis** à un terminal de comptage : l'API le
retire de ses réponses pour le rôle `USER`, de même que la quantité retenue et
l'écart. Un opérateur qui connaît la quantité attendue tend à la confirmer
plutôt qu'à compter, ce qui vide la méthode de son sens. Le masquage est donc
fait côté serveur ; le cacher seulement à l'affichage laisserait la valeur
transiter et subsister sur l'appareil.

### Exemple

Théorique = 30, Pmp = 12,50.

| Passage | Quantité | Statut après |
|---|---|---|
| C1 (Karim) | 28 | `AWAITING_SECOND_COUNT` |
| C2 (Yacine) | 25 | `AWAITING_THIRD_COUNT` |
| C3 (Samir) | 22 | `UNDER_INVESTIGATION` |
| Enquête (superviseur) | 26 — « 4 unités retrouvées en zone de transit » | `CONFIRMED` |

Écart = 26 − 30 = **−4**, valorisé à **−50,00**.

---

## Écarts (communs à toutes les méthodes)

```
écart       = F − T
différence  = |écart|
taux        = écart / T            (NULL si T = 0)
valeur      = écart × prix unitaire
```

| Signe | Interprétation |
|---|---|
| `écart > 0` | **Surplus** : il y a plus en stock que prévu |
| `écart < 0` | **Manque** : il manque de la marchandise |
| `écart = 0` | Conforme |

Le **prix unitaire** utilisé est `inventory_items.unit_price`, c'est-à-dire le Pmp
**figé au moment de l'import**. La valorisation d'une campagne clôturée ne change
donc jamais, même si le prix de l'article évolue ensuite. Les montants ne sont
exposés qu'aux rôles `ADMIN` et `SUPERVISOR`, jamais à l'application mobile.

---

## Clôture de campagne

### Préconditions

1. La campagne est au statut `OPEN` ou `COUNTING`.
2. Aucune ligne n'est en `AWAITING_SECOND_COUNT`.
3. Aucune ligne n'est en `DISCREPANCY` non résolue.
4. Le superviseur a explicitement confirmé la mise à zéro
   (`confirmZeroMissing: true`), après l'avertissement :

   > « Les articles non trouvés seront mis à quantité 0. Voulez-vous continuer ? »

### Déroulement (une seule transaction)

1. Calcul de `F` pour chaque ligne selon la méthode de la campagne.
2. Les lignes `PENDING` (jamais comptées) **et** `NOT_FOUND` (déclarées
   introuvables) reçoivent `F = 0` et le statut `NOT_FOUND` — **uniquement** à
   cette étape, et uniquement après confirmation.
3. Horodatage `missing_zeroed_at`.
4. Passage au statut `CLOSED`, enregistrement de `closed_at` et `closed_by`.
5. Écriture d'une entrée dans `activity_logs`.

### Irréversibilité

La clôture est définitive. La seule sortie est
`POST /campaigns/:id/reopen`, **réservé au rôle ADMIN**, qui exige un motif écrit
(contrainte `campaigns_reopen_requires_reason` au niveau de la base) et laisse une
trace dans le journal d'activité.

---

## Campagne suivante (second passage)

`POST /campaigns/:id/next-round` crée une nouvelle campagne à partir des résultats
de la précédente :

- `round = round parent + 1`, `parent_campaign_id` renseigné ;
- seules sont reprises les lignes **en écart**, **non trouvées** ou **litigieuses** —
  les lignes conformes ne sont pas recomptées ;
- par défaut, la quantité théorique de la nouvelle ligne est la **quantité finale**
  du passage précédent (on recompte ce qu'on croit maintenant avoir). Une option du
  DTO permet de conserver la quantité théorique d'origine ;
- la méthode de calcul peut être changée : il est courant de passer en Méthode 2
  pour le second passage, afin de fiabiliser les écarts détectés.


---

## Cas particuliers tranchés

| Situation | Règle retenue | Pourquoi |
|---|---|---|
| Article déclaré introuvable **puis** compté par un collègue | Le comptage l'emporte, statut `COUNTED` | Une observation positive et datée prime sur une absence constatée |
| Même opérateur saisissant deux fois en Méthode 2 | Une seule voix, son dernier comptage | Sinon un opérateur « confirmerait » seul une valeur et le comptage cesserait d'être contradictoire |
| Comptage annulé | Exclu de tout calcul, mais conservé en base | Le travail du terrain reste traçable : auteur, date, motif d'annulation |
| Quantité théorique nulle | Taux d'écart `null` | Rapporter un surplus à zéro donnerait une variation infinie |
| Méthode référencée sans implémentation | Erreur explicite | Produire un résultat par défaut fausserait silencieusement un inventaire |

## Implémentation

| Élément | Emplacement |
|---|---|
| Moteur de calcul | `apps/api/src/common/inventory-calculation/inventory-calculation.service.ts` |
| Stratégies par méthode | `apps/api/src/common/inventory-calculation/strategies.ts` |
| Tests unitaires (30 cas) | `inventory-calculation.service.spec.ts` |
| Tests de bout en bout | `apps/api/test/campaign-workflow.e2e-spec.ts` |

### Le calcul reste côté serveur

L'application mobile n'applique **aucune** règle de calcul. Elle transmet des
comptages bruts — quantité, auteur, horodatage — et c'est le serveur qui en
déduit la quantité finale et le statut de la ligne.

Ce choix est délibéré : en Méthode 2, le résultat dépend des saisies des
**autres** opérateurs, qu'un terminal hors réseau ne peut pas connaître.
Calculer localement produirait des statuts faux dès qu'un collègue compte le
même article. Le mobile affiche donc, hors réseau, ce qu'il sait de sa propre
saisie, et le statut définitif lui parvient à la synchronisation suivante.

**Ajouter une méthode** ne demande aucune migration : écrire une classe
implémentant `InventoryMethodStrategy`, l'enregistrer dans
`InventoryCalculationService`, puis insérer une ligne dans `inventory_methods`.
Une méthode présente en base sans stratégie associée est détectée dès la
configuration de la campagne, et non à la clôture.
