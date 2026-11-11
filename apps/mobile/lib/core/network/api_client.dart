import 'dart:async';

import 'package:dio/dio.dart';

import '../config/app_config.dart';
import 'token_store.dart';

/// Erreur applicative, débarrassée des détails de Dio.
class ApiException implements Exception {
  ApiException(this.message, {this.statusCode, this.code});

  final String message;
  final int? statusCode;
  final String? code;

  /// Le serveur était-il injoignable ? Détermine si l'action peut être
  /// rejouée plus tard ou si elle doit être signalée comme définitivement
  /// refusée.
  bool get isNetworkFailure => statusCode == null;

  @override
  String toString() => message;
}

/// Client HTTP de l'application.
///
/// Gère l'ajout du jeton, le rafraîchissement automatique et la traduction des
/// erreurs en messages lisibles. L'adresse du serveur est modifiable à chaud :
/// elle change d'un site à l'autre.
class ApiClient {
  ApiClient(this._tokenStore) {
    _dio = Dio(
      BaseOptions(
        connectTimeout: AppConfig.connectTimeout,
        receiveTimeout: AppConfig.receiveTimeout,
        headers: <String, String>{'Content-Type': 'application/json'},
        // On traite nous-mêmes tous les codes : Dio ne doit pas lever
        // d'exception avant que l'intercepteur ait pu tenter un
        // rafraîchissement.
        validateStatus: (int? status) => status != null && status < 500,
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: _onRequest,
        onResponse: _onResponse,
      ),
    );
  }

  final TokenStore _tokenStore;
  late final Dio _dio;

  String _baseUrl = AppConfig.defaultApiBaseUrl;

  String get baseUrl => _baseUrl;

  set baseUrl(String value) {
    _baseUrl = _normalize(value);
    _dio.options.baseUrl = _baseUrl;
  }

  /// Un seul rafraîchissement à la fois : plusieurs requêtes peuvent échouer
  /// simultanément, et des rafraîchissements concurrents déclencheraient la
  /// détection de rejeu côté serveur, invalidant toutes les sessions.
  Future<bool>? _refreshing;

  /// Appelé lorsque la session est définitivement perdue.
  void Function()? onSessionExpired;

  Future<void> _onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    options.baseUrl = _baseUrl;

    final String? token = await _tokenStore.readAccessToken();
    if (token != null && !options.path.contains('/auth/login')) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    handler.next(options);
  }

  Future<void> _onResponse(
    Response<dynamic> response,
    ResponseInterceptorHandler handler,
  ) async {
    final bool isAuthRoute = response.requestOptions.path.contains('/auth/');
    final bool alreadyRetried = response.requestOptions.extra['retried'] == true;

    if (response.statusCode != 401 || isAuthRoute || alreadyRetried) {
      handler.next(response);
      return;
    }

    final bool refreshed = await _refreshTokens();
    if (!refreshed) {
      onSessionExpired?.call();
      handler.next(response);
      return;
    }

    try {
      final RequestOptions retry = response.requestOptions
        ..extra['retried'] = true
        ..headers['Authorization'] = 'Bearer ${await _tokenStore.readAccessToken()}';

      final Response<dynamic> replay = await _dio.fetch<dynamic>(retry);
      handler.resolve(replay);
    } catch (_) {
      handler.next(response);
    }
  }

  Future<bool> _refreshTokens() {
    return _refreshing ??= _performRefresh().whenComplete(() {
      _refreshing = null;
    });
  }

  Future<bool> _performRefresh() async {
    final String? refreshToken = await _tokenStore.readRefreshToken();
    if (refreshToken == null) return false;

    try {
      // Instance distincte : celle-ci ne doit pas repasser par les
      // intercepteurs, sous peine de boucle.
      final Dio plain = Dio(BaseOptions(baseUrl: _baseUrl));
      final Response<Map<String, dynamic>> response = await plain.post<Map<String, dynamic>>(
        '/auth/refresh',
        data: <String, String>{'refreshToken': refreshToken},
      );

      final Map<String, dynamic>? body = response.data;
      if (body == null) return false;

      await _tokenStore.save(
        accessToken: body['accessToken'] as String,
        refreshToken: body['refreshToken'] as String,
      );
      return true;
    } catch (_) {
      await _tokenStore.clear();
      return false;
    }
  }

  // --- Verbes ------------------------------------------------------------------

  Future<T> get<T>(String path, {Map<String, dynamic>? query}) async {
    final Response<dynamic> response =
        await _send(() => _dio.get<dynamic>(path, queryParameters: query));
    return response.data as T;
  }

  Future<T> post<T>(String path, {Object? body}) async {
    final Response<dynamic> response = await _send(() => _dio.post<dynamic>(path, data: body));
    return response.data as T;
  }

  Future<T> patch<T>(String path, {Object? body}) async {
    final Response<dynamic> response = await _send(() => _dio.patch<dynamic>(path, data: body));
    return response.data as T;
  }

  /// Exécute une requête et transforme tout échec en [ApiException].
  Future<Response<dynamic>> _send(
    Future<Response<dynamic>> Function() request,
  ) async {
    try {
      final Response<dynamic> response = await request();

      final int status = response.statusCode ?? 0;
      if (status >= 200 && status < 300) return response;

      throw ApiException(
        _messageFrom(response.data) ?? _defaultMessage(status),
        statusCode: status,
        code: _codeFrom(response.data),
      );
    } on DioException catch (error) {
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout ||
          error.type == DioExceptionType.sendTimeout) {
        throw ApiException('Le serveur met trop de temps à répondre.');
      }

      throw ApiException(
        'Serveur injoignable. Vérifiez le réseau et l’adresse du serveur.',
      );
    }
  }

  static String? _messageFrom(dynamic data) {
    if (data is Map<String, dynamic> && data['message'] is String) {
      return data['message'] as String;
    }
    return null;
  }

  static String? _codeFrom(dynamic data) {
    if (data is Map<String, dynamic> && data['code'] is String) {
      return data['code'] as String;
    }
    return null;
  }

  static String _defaultMessage(int status) {
    switch (status) {
      case 401:
        return 'Session expirée. Reconnectez-vous.';
      case 403:
        return 'Vous n’avez pas les droits nécessaires.';
      case 404:
        return 'Ressource introuvable.';
      case 409:
        return 'Opération impossible dans l’état actuel.';
      case 429:
        return 'Trop de requêtes. Patientez quelques instants.';
      default:
        return 'Une erreur est survenue ($status).';
    }
  }

  /// Tolère les adresses saisies à la main : espaces, barre finale, préfixe
  /// d'API omis.
  static String _normalize(String raw) {
    String url = raw.trim();
    if (url.isEmpty) return AppConfig.defaultApiBaseUrl;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://$url';
    }
    while (url.endsWith('/')) {
      url = url.substring(0, url.length - 1);
    }
    if (!url.contains('/api/')) {
      url = '$url/api/v1';
    }

    return url;
  }
}
