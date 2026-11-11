# Flutter et plugins : les classes appelées par réflexion depuis le moteur ne
# doivent pas être renommées.
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# mobile_scanner s'appuie sur ML Kit, dont certaines classes sont résolues
# dynamiquement.
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**

# SQLite natif utilisé par Drift.
-keep class org.sqlite.** { *; }

# Réduit le bruit : ces références optionnelles n'existent pas sur Android.
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**

# Le moteur Flutter référence Play Core pour les « deferred components » —
# le téléchargement de modules à la demande depuis le Play Store. InventAir
# est distribuée en APK autonome et n'embarque donc pas cette bibliothèque :
# R8 signalerait sinon ces classes comme manquantes et refuserait de produire
# l'APK. Les ignorer est sans effet à l'exécution, le code qui les utilise
# n'étant jamais atteint.
-dontwarn com.google.android.play.core.**
-dontwarn io.flutter.embedding.engine.deferredcomponents.**
-dontwarn io.flutter.embedding.android.FlutterPlayStoreSplitApplication
