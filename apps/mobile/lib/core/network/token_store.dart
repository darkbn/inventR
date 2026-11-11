import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Conservation des jetons dans le coffre du système.
///
/// `flutter_secure_storage` s'appuie sur le Keystore Android : les jetons sont
/// chiffrés au repos et ne sont pas lisibles par une autre application, ni par
/// une sauvegarde ADB. Indispensable sur un terminal partagé entre plusieurs
/// équipes.
class TokenStore {
  TokenStore([FlutterSecureStorage? storage])
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            );

  final FlutterSecureStorage _storage;

  static const String _accessKey = 'access_token';
  static const String _refreshKey = 'refresh_token';
  static const String _serverKey = 'server_url';

  Future<String?> readAccessToken() => _storage.read(key: _accessKey);

  Future<String?> readRefreshToken() => _storage.read(key: _refreshKey);

  Future<void> save({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: _accessKey, value: accessToken);
    await _storage.write(key: _refreshKey, value: refreshToken);
  }

  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }

  /// L'adresse du serveur survit à la déconnexion : la ressaisir à chaque
  /// changement d'équipe serait une perte de temps en entrepôt.
  Future<String?> readServerUrl() => _storage.read(key: _serverKey);

  Future<void> saveServerUrl(String url) => _storage.write(key: _serverKey, value: url);
}
