import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/local/database.dart';
import '../data/models/models.dart';
import '../data/sync_repository.dart';
import 'config/app_config.dart';
import 'network/api_client.dart';
import 'network/token_store.dart';

// --- Infrastructure ------------------------------------------------------------

final Provider<AppDatabase> databaseProvider = Provider<AppDatabase>((Ref ref) {
  final AppDatabase db = AppDatabase();
  ref.onDispose(db.close);
  return db;
});

final Provider<TokenStore> tokenStoreProvider = Provider<TokenStore>((Ref ref) => TokenStore());

final Provider<ApiClient> apiClientProvider = Provider<ApiClient>((Ref ref) {
  final ApiClient client = ApiClient(ref.watch(tokenStoreProvider));
  client.onSessionExpired = () {
    ref.read(authControllerProvider.notifier).handleSessionExpired();
  };
  return client;
});

final Provider<SyncRepository> syncRepositoryProvider = Provider<SyncRepository>((Ref ref) {
  return SyncRepository(ref.watch(databaseProvider), ref.watch(apiClientProvider));
});

// --- Connectivité ----------------------------------------------------------------

/// État du réseau.
///
/// `connectivity_plus` indique la présence d'une interface, pas l'accès
/// effectif au serveur : un terminal peut être associé au Wi-Fi de l'entrepôt
/// sans joindre l'API. On s'en sert donc comme d'un déclencheur de tentative,
/// jamais comme d'une garantie.
final StreamProvider<bool> connectivityProvider = StreamProvider<bool>((Ref ref) {
  return Connectivity().onConnectivityChanged.map(
        (List<ConnectivityResult> results) =>
            results.any((ConnectivityResult r) => r != ConnectivityResult.none),
      );
});

// --- Authentification -------------------------------------------------------------

class AuthState {
  const AuthState({
    this.user,
    this.isLoading = false,
    this.error,
    this.initializing = true,
  });

  final UserProfile? user;
  final bool isLoading;
  final String? error;
  final bool initializing;

  bool get isAuthenticated => user != null;

  AuthState copyWith({
    UserProfile? user,
    bool? isLoading,
    String? error,
    bool? initializing,
    bool clearUser = false,
    bool clearError = false,
  }) {
    return AuthState(
      user: clearUser ? null : (user ?? this.user),
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      initializing: initializing ?? this.initializing,
    );
  }
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._ref) : super(const AuthState()) {
    unawaited(_restore());
  }

  final Ref _ref;

  ApiClient get _api => _ref.read(apiClientProvider);
  TokenStore get _tokens => _ref.read(tokenStoreProvider);

  /// Reprise de session au démarrage.
  ///
  /// L'adresse du serveur est restaurée en premier : sans elle, l'appel
  /// suivant partirait vers la mauvaise machine.
  Future<void> _restore() async {
    final String? savedUrl = await _tokens.readServerUrl();
    if (savedUrl != null && savedUrl.isNotEmpty) {
      _api.baseUrl = savedUrl;
    }

    final String? token = await _tokens.readAccessToken();
    if (token == null) {
      state = state.copyWith(initializing: false);
      return;
    }

    try {
      final Map<String, dynamic> profile = await _api.get<Map<String, dynamic>>('/auth/me');
      state = AuthState(user: UserProfile.fromJson(profile), initializing: false);
    } on ApiException catch (error) {
      // Hors réseau, on conserve la session : l'opérateur doit pouvoir
      // continuer à compter en mode avion. Seul un refus explicite du serveur
      // déconnecte.
      if (error.isNetworkFailure) {
        state = state.copyWith(initializing: false);
        return;
      }

      await _tokens.clear();
      state = const AuthState(initializing: false);
    }
  }

  Future<bool> login({
    required String serverUrl,
    required String login,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);

    _api.baseUrl = serverUrl;

    try {
      final Map<String, dynamic> response = await _api.post<Map<String, dynamic>>(
        '/auth/login',
        body: <String, String>{'login': login, 'password': password},
      );

      await _tokens.save(
        accessToken: response['accessToken'] as String,
        refreshToken: response['refreshToken'] as String,
      );
      await _tokens.saveServerUrl(_api.baseUrl);

      state = AuthState(
        user: UserProfile.fromJson(response['user'] as Map<String, dynamic>),
        initializing: false,
      );
      return true;
    } on ApiException catch (error) {
      state = state.copyWith(isLoading: false, error: error.message);
      return false;
    }
  }

  Future<void> logout() async {
    final int pending = await _pendingCount();

    // Déconnexion refusée si du travail reste à transmettre : vider le coffre
    // couperait l'accès au serveur et la file deviendrait inexploitable.
    if (pending > 0) {
      state = state.copyWith(
        error: '$pending comptage(s) non transmis. Synchronisez avant de vous déconnecter.',
      );
      return;
    }

    try {
      final String? refreshToken = await _tokens.readRefreshToken();
      if (refreshToken != null) {
        await _api.post<dynamic>(
          '/auth/logout',
          body: <String, String>{'refreshToken': refreshToken},
        );
      }
    } on ApiException {
      // Une déconnexion ne doit jamais échouer côté client.
    }

    await _tokens.clear();
    await _ref.read(databaseProvider).delete(_ref.read(databaseProvider).cachedItems).go();
    await _ref.read(databaseProvider).delete(_ref.read(databaseProvider).cachedLists).go();

    state = const AuthState(initializing: false);
  }

  /// Déconnexion forcée : la file d'attente est conservée.
  void handleSessionExpired() {
    state = const AuthState(
      initializing: false,
      error: 'Session expirée. Reconnectez-vous ; vos comptages sont conservés.',
    );
  }

  void clearError() => state = state.copyWith(clearError: true);

  Future<int> _pendingCount() async {
    final AppDatabase db = _ref.read(databaseProvider);
    final List<PendingCount> rows =
        await (db.select(db.pendingCounts)..where((t) => t.state.equals('PENDING'))).get();
    return rows.length;
  }
}

final StateNotifierProvider<AuthController, AuthState> authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>(
  (Ref ref) => AuthController(ref),
);

// --- Synchronisation -----------------------------------------------------------------

/// Nombre de comptages en attente d'envoi.
final StreamProvider<int> pendingCountProvider = StreamProvider<int>((Ref ref) {
  return ref.watch(syncRepositoryProvider).watchPendingCount();
});

/// Pilote la synchronisation automatique.
///
/// Deux déclencheurs : le retour du réseau et un battement périodique. Le
/// second couvre le cas, fréquent en entrepôt, d'une interface Wi-Fi associée
/// mais sans route utilisable — la connectivité ne change alors jamais d'état.
class SyncController extends StateNotifier<SyncStatus> {
  /// État initial : rien en attente, réseau supposé disponible jusqu'à preuve
  /// du contraire.
  static const SyncStatus _idle = SyncStatus(
    pending: 0,
    rejected: 0,
    isSyncing: false,
    isOnline: true,
  );

  SyncController(this._ref) : super(_idle) {
    _timer = Timer.periodic(AppConfig.syncInterval, (_) => unawaited(sync()));
  }

  final Ref _ref;
  Timer? _timer;

  Future<void> sync({bool manual = false}) async {
    if (state.isSyncing) return;

    final SyncRepository repository = _ref.read(syncRepositoryProvider);
    state = SyncStatus(
      pending: state.pending,
      rejected: state.rejected,
      isSyncing: true,
      isOnline: state.isOnline,
      lastSyncAt: state.lastSyncAt,
    );

    final SyncReport report = await repository.synchronize();
    final int rejected = await repository.rejectedCount();

    state = SyncStatus(
      pending: report.failed,
      rejected: rejected,
      isSyncing: false,
      isOnline: !report.hasFailed,
      lastSyncAt: report.hasFailed ? state.lastSyncAt : DateTime.now(),
      lastError: report.error,
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}

final StateNotifierProvider<SyncController, SyncStatus> syncControllerProvider =
    StateNotifierProvider<SyncController, SyncStatus>(
  (Ref ref) {
    final SyncController controller = SyncController(ref);

    // Le retour du réseau déclenche immédiatement un envoi.
    ref.listen<AsyncValue<bool>>(connectivityProvider, (
      AsyncValue<bool>? previous,
      AsyncValue<bool> next,
    ) {
      final bool wasOffline = previous?.valueOrNull == false;
      final bool isOnline = next.valueOrNull == true;
      if (wasOffline && isOnline) unawaited(controller.sync());
    });

    return controller;
  },
);

// --- Données -------------------------------------------------------------------------

final StreamProvider<List<CachedList>> listsProvider = StreamProvider<List<CachedList>>((Ref ref) {
  return ref.watch(syncRepositoryProvider).watchLists();
});

final StreamProvider<List<PendingCount>> pendingCountsProvider =
    StreamProvider<List<PendingCount>>((Ref ref) {
  return ref.watch(syncRepositoryProvider).watchPending();
});

/// Critères d'affichage d'une liste de comptage.
class ItemQuery {
  const ItemQuery({
    required this.listId,
    this.search = '',
    this.filter = ItemFilter.all,
  });

  final String listId;
  final String search;
  final ItemFilter filter;

  @override
  bool operator ==(Object other) =>
      other is ItemQuery &&
      other.listId == listId &&
      other.search == search &&
      other.filter == filter;

  @override
  int get hashCode => Object.hash(listId, search, filter);
}

final StreamProviderFamily<List<CachedItem>, ItemQuery> itemsProvider =
    StreamProvider.family<List<CachedItem>, ItemQuery>((Ref ref, ItemQuery query) {
  return ref.watch(syncRepositoryProvider).watchItems(
        query.listId,
        search: query.search,
        filter: query.filter,
      );
});
