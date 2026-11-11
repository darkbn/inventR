# InventAir — application Android

Saisie d'inventaire sur le terrain. Fonctionne **hors réseau** : les comptages
sont enregistrés sur le terminal et transmis dès que la connexion revient.

## Prérequis

| Outil | Version | Installation |
|---|---|---|
| Flutter | 3.47.7 | archive portable, voir ci-dessous |
| Android SDK | API 36, build-tools 36.0.0 | `cmdline-tools` |
| NDK | 28.2.13676358 | voir « NDK » plus bas |
| JDK | 17 | Temurin ou équivalent |

Les versions de Gradle (8.14.3), d'AGP (8.11.1) et de Kotlin (2.2.20) sont
figées dans `android/settings.gradle.kts` et le wrapper. Flutter refuse de
compiler en deçà de ses planchers et les relève à chaque version : si la
compilation s'arrête sur un message « lower than Flutter's minimum supported
version », c'est le numéro indiqué qu'il faut reporter dans ces fichiers.

Il n'existe pas de paquet winget officiel pour Flutter : l'installation se fait
par archive, ce qui a l'avantage d'être confiné à un dossier et désinstallable
par simple suppression.

```powershell
# Flutter
Invoke-WebRequest `
  'https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.47.7-stable.zip' `
  -OutFile flutter.zip
Expand-Archive flutter.zip -DestinationPath C:\dev

# Android command-line tools (curl est nettement plus rapide qu'Invoke-WebRequest)
curl -L -o clt.zip `
  'https://dl.google.com/android/repository/commandlinetools-win-16111833_latest.zip'
# Décompresser dans C:\dev\android-sdk\cmdline-tools\latest
#   (le dossier doit impérativement s'appeler « latest »)

C:\dev\android-sdk\cmdline-tools\latest\bin\sdkmanager.bat `
  --sdk_root=C:\dev\android-sdk `
  "platform-tools" "build-tools;36.0.0" "platforms;android-36"

C:\dev\flutter\bin\flutter.bat config --android-sdk C:\dev\android-sdk
C:\dev\flutter\bin\flutter.bat doctor
```

### NDK

Le plugin Gradle de Flutter impose une version de NDK exacte (`flutter.ndkVersion`),
que `sqlite3_flutter_libs` — la base locale Drift — utilise réellement pour
compiler SQLite.

```powershell
C:\devndroid-sdk\cmdline-tools\latestin\sdkmanager.bat `
  --sdk_root=C:\devndroid-sdk "ndk;28.2.13676358"
```

Sur les versions récentes des `cmdline-tools`, `sdkmanager` n'est plus qu'un
alias vers la nouvelle CLI `android`, qui peut marquer le paquet comme installé
sans jamais déposer les fichiers. Vérifier donc systématiquement :

```powershell
Get-Content C:\devndroid-sdk
dk8.2.13676358\source.properties
# doit afficher  Pkg.Revision = 28.2.13676358
```

En cas d'échec, l'archive officielle fait aussi bien — c'est celle que le
gestionnaire télécharge :

```powershell
curl -L -o ndk.zip https://dl.google.com/android/repository/android-ndk-r28c-windows.zip
Expand-Archive ndk.zip -DestinationPath $env:TEMP
dkx
Move-Item $env:TEMP
dkxndroid-ndk-r28c C:\devndroid-sdk
dk8.2.13676358
```

`android/local.properties` doit pointer vers les deux SDK :

```properties
sdk.dir=C:\\dev\\android-sdk
flutter.sdk=C:\\dev\\flutter
```

## Développement

```bash
flutter pub get
dart run build_runner build      # génère le code Drift (database.g.dart)
flutter analyze                  # doit afficher « No issues found! »
flutter test                     # 16 tests de la logique hors ligne
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1
```

`10.0.2.2` est l'alias de la machine hôte vu depuis l'émulateur Android. Sur un
téléphone physique, utilisez l'adresse IP du poste sur le réseau local.

## Signature

Les secrets ne sont jamais versionnés. Générer un magasin de clés :

```bash
keytool -genkeypair -v \
  -keystore android/keystore/inventair-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias inventair
```

Puis copier `android/key.properties.example` en `android/key.properties` et y
renseigner les mots de passe. En l'absence de ce fichier, la compilation
retombe sur la clé de debug : on obtient un APK installable, simplement non
signé pour la production.

## Compilation de l'APK

```bash
flutter build apk --release \
  --dart-define=API_BASE_URL=http://192.168.1.100:3000/api/v1
```

L'APK est produit dans `build/app/outputs/flutter-apk/app-release.apk`
(≈ 71 Mo : trois architectures, moteur Flutter et ML Kit).

L'adresse injectée au build n'est qu'une **valeur par défaut** : elle reste
modifiable depuis l'écran de connexion, sans reconstruire l'application. C'est
indispensable, l'IP du serveur changeant d'un site à l'autre.

Pour un fichier deux fois plus léger, produire un APK par architecture. Les
terminaux vendus depuis 2019 sont en `arm64-v8a` ; `armeabi-v7a` couvre les
terminaux durcis plus anciens encore en service.

```bash
flutter build apk --release --split-per-abi
```

### Vérifier l'APK avant distribution

```bash
# Signature : doit afficher « Verifies » et le certificat InventAir,
# PAS « CN=Android Debug »
C:\devndroid-sdkuild-tools.0.0pksigner.bat verify --print-certs   build/app/outputs/flutter-apk/app-release.apk

# Manifeste : paquet, versions, permissions
C:\devndroid-sdkuild-tools.0.0apt2.exe dump badging   build/app/outputs/flutter-apk/app-release.apk
```

Attendu : `com.kepler.inventair`, `versionCode='1'`, `versionName='1.0.0'`,
`minSdkVersion:'24'`, `targetSdkVersion:'36'`, et exactement trois permissions
déclarées — `CAMERA`, `INTERNET`, `ACCESS_NETWORK_STATE`.

## Installation sur un terminal

```bash
# Activer le débogage USB sur le téléphone, puis :
C:\dev\android-sdk\platform-tools\adb.exe install -r \
  build/app/outputs/flutter-apk/app-release.apk
```

Ou transférer le fichier APK et l'ouvrir depuis le gestionnaire de fichiers,
après avoir autorisé l'installation depuis des sources inconnues.

## Architecture

```
lib/
├─ core/
│  ├─ config/      adresse de l'API, tailles de lot, délais
│  ├─ network/     client Dio, rafraîchissement de jeton, coffre à jetons
│  ├─ theme/       thème adapté à l'entrepôt (grandes cibles tactiles)
│  └─ providers.dart   état global Riverpod
├─ data/
│  ├─ local/       base SQLite (Drift) : lignes, listes, file d'attente
│  ├─ models/      modèles d'échange avec l'API
│  └─ sync_repository.dart   accès aux données, en ligne comme hors ligne
├─ features/
│  ├─ auth/        connexion, adresse du serveur
│  ├─ lists/       mes listes attribuées, téléchargement hors ligne
│  ├─ items/       liste de comptage, recherche, filtres
│  ├─ counting/    saisie de quantité, historique
│  ├─ scan/        lecture de QR code
│  └─ sync/        état de la file d'attente
└─ widgets/        indicateur de synchronisation
```

## Fonctionnement hors ligne

| Étape | Comportement |
|---|---|
| Téléchargement d'une liste | page par page, jusqu'à ~8 000 lignes, stockées en SQLite |
| Saisie d'un comptage | écrit **localement d'abord**, avec un UUID v4 généré sur le terminal |
| Retour du réseau | envoi automatique par lots de 200, plus un battement toutes les 2 minutes |
| Accusé de réception | seul un `created` ou `duplicate` retire l'entrée de la file |
| Refus du serveur | conservé, affiché avec son motif, réessayable ou abandonnable |

L'UUID client est la clé d'idempotence : un comptage rejoué après une coupure
n'est jamais enregistré deux fois côté serveur.

**Un comptage n'est jamais supprimé par l'application elle-même.** L'abandon
d'une saisie refusée exige une confirmation explicite de l'utilisateur.

## Choix d'interface, et pourquoi

- **Pavé numérique intégré** plutôt que le clavier système : touches de 64 px,
  utilisables avec des gants de manutention, disposition identique sur tous les
  terminaux.
- **Emplacement en tête de chaque ligne, en gras** : c'est lui qui dicte le
  déplacement du magasinier, pas le code article.
- **Tri physique numérique** (allée, travée, niveau, case) : en tri texte,
  « 10- » passerait avant « 2- » et le parcours zigzaguerait.
- **Quantité théorique masquée par défaut**, révélable d'un geste : l'afficher
  d'emblée induit le comptage.
- **Indicateur de synchronisation en permanence dans la barre de titre** : un
  comptage non transmis n'existe que sur ce terminal, l'information ne doit pas
  être enfouie dans un menu.
- **Déconnexion refusée s'il reste des comptages à transmettre** : effacer les
  jetons couperait l'accès au serveur et rendrait la file inexploitable.

## Permissions

| Permission | Usage |
|---|---|
| `CAMERA` | lecture des QR codes, uniquement |
| `INTERNET` | appels à l'API |
| `ACCESS_NETWORK_STATE` | détection du retour de réseau |

La caméra est déclarée `required="false"` : l'application s'installe sur un
terminal sans caméra et reste utilisable par la recherche textuelle.

Sauvegarde cloud et transfert d'appareil sont **désactivés** : la base contient
des comptages non transmis et le coffre contient les jetons de session.

## Réseau en clair

Le trafic HTTP non chiffré n'est autorisé que vers les plages d'adresses
privées (10/8, 172.16/12, 192.168/16, localhost) — le cas d'un serveur hébergé
sur le réseau de l'entrepôt. Partout ailleurs, HTTPS est obligatoire. Voir
`android/app/src/main/res/xml/network_security_config.xml`.
