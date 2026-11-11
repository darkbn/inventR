/// Configuration de l'application.
///
/// L'adresse de l'API est injectée à la compilation
/// (`--dart-define=API_BASE_URL=…`) **et** modifiable depuis l'écran de
/// connexion. Figer l'adresse dans l'APK obligerait à reconstruire à chaque
/// changement d'IP ou de site — inacceptable pour un déploiement en entrepôt.
class AppConfig {
  const AppConfig._();

  /// Adresse par défaut, utilisée au premier lancement.
  static const String defaultApiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api/v1',
  );

  /// Nom affiché de l'application.
  static const String appName = 'InventAir';

  /// Durée au-delà de laquelle une requête est abandonnée.
  /// Généreuse : le Wi-Fi d'entrepôt est souvent médiocre en fond d'allée.
  static const Duration connectTimeout = Duration(seconds: 20);
  static const Duration receiveTimeout = Duration(seconds: 60);

  /// Nombre de comptages envoyés par lot de synchronisation.
  /// Aligné sur la limite acceptée par l'API.
  static const int syncBatchSize = 200;

  /// Délai entre deux tentatives de synchronisation automatique.
  static const Duration syncInterval = Duration(minutes: 2);

  /// Nombre de lignes chargées par page lors de la mise en cache d'une liste.
  ///
  /// **Ne pas dépasser 200** : c'est le plafond que l'API impose à toutes ses
  /// routes paginées (`MAX_PAGE_SIZE`). Au-delà, elle répond 400 et le
  /// téléchargement d'une liste échoue entièrement. Une liste de 8 000 lignes
  /// demande donc une quarantaine de requêtes, ce que la reprise page par page
  /// rend sans conséquence en cas de coupure.
  static const int listPageSize = 200;
}
