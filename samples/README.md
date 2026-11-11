# Fichiers d'exemple

Ce dossier reçoit les extractions d'inventaire servant aux tests d'import. **Son
contenu n'est pas versionné** : il s'agit de données clients réelles — quantités
en stock et prix moyens pondérés — qui n'ont rien à faire dans un dépôt de code,
fût-il privé.

## Fichier de référence

Le test `apps/api/src/modules/imports/parsing/real-file.spec.ts` s'exécute sur :

```
samples/Stocks_14-06-2026.xlsx
```

Il s'agit de l'extraction SAP du magasin de pièces de rechange : 7 961 lignes,
dont 2 329 sans emplacement renseigné, pour une somme théorique de 100 598,09.

**En l'absence de ce fichier, le test se désactive de lui-même** (`describe.skip`)
et la suite reste verte. Rien à faire pour installer le projet ailleurs ; déposez
simplement le fichier ici si vous voulez rejouer cette vérification.

## Format attendu

Les en-têtes reconnus sont décrits dans [`docs/methodes-calcul.md`](../docs/methodes-calcul.md)
et dans le modèle officiel que l'API génère :

```
GET /api/v1/imports/template.xlsx
```

Ce modèle embarque une feuille « Instructions » et les validations Excel : c'est
la référence à remettre à quiconque doit préparer un fichier d'import.
