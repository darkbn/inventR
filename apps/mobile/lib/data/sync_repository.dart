import 'dart:async';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../core/config/app_config.dart';
import '../core/network/api_client.dart';
import 'local/database.dart';
import 'models/models.dart';

/// État de la file d'attente, affiché en permanence dans l'application.
class SyncStatus {
  const SyncStatus({
    required this.pending,
    required this.rejected,
    required this.isSyncing,
    required this.isOnline,
    this.lastSyncAt,
    this.lastError,
  });

  final int pending;
  final int rejected;
  final bool isSyncing;
  final bool isOnline;
  final DateTime? lastSyncAt;
  final String? lastError;

  bool get hasWork => pending > 0;
  bool get isClean => pending == 0 && rejected == 0;
}

const Uuid _uuid = Uuid();

/// Accès aux données, en ligne comme hors ligne.
///
/// Principe directeur : **un comptage saisi ne doit jamais être perdu**. Il est
/// écrit en base locale avant toute tentative réseau, et n'est retiré de la
/// file qu'après accusé de réception explicite du serveur.
class SyncRepository {
  SyncRepository(this._db, this._api);

  final AppDatabase _db;
  final ApiClient _api;

  // --- Listes ------------------------------------------------------------------

  /// Listes attribuées, lues depuis le cache local.
  Stream<List<CachedList>> watchLists() {
    return (_db.select(_db.cachedLists)
          ..orderBy(<OrderClauseGenerator<$CachedListsTable>>[
            (t) => OrderingTerm(expression: t.campaignCode),
            (t) => OrderingTerm(expression: t.code),
          ]))
        .watch();
  }

  /// Récupère les listes depuis le serveur et les met en cache.
  Future<void> refreshLists() async {
    final List<dynamic> raw = await _api.get<List<dynamic>>('/my/lists');
    final List<AssignedList> lists =
        raw.map((dynamic e) => AssignedList.fromJson(e as Map<String, dynamic>)).toList();

    await _db.batch((Batch batch) {
      for (final AssignedList list in lists) {
        batch.insert(
          _db.cachedLists,
          CachedListsCompanion.insert(
            id: list.id,
            code: list.code,
            name: list.name,
            status: list.status,
            campaignId: list.campaignId,
            campaignCode: list.campaignCode,
            campaignName: list.campaignName,
            campaignStatus: list.campaignStatus,
            methodCode: list.methodCode,
            totalItems: Value<int>(list.totalItems),
            countedItems: Value<int>(list.countedItems),
          ),
          onConflict: DoUpdate(
            (_) => CachedListsCompanion(
              code: Value<String>(list.code),
              name: Value<String>(list.name),
              status: Value<String>(list.status),
              campaignStatus: Value<String>(list.campaignStatus),
              totalItems: Value<int>(list.totalItems),
              countedItems: Value<int>(list.countedItems),
            ),
          ),
        );
      }
    });

    // Une liste retirée à l'opérateur disparaît du cache : il ne doit pas
    // continuer à compter sur un périmètre qu'on lui a repris.
    final Set<String> keptIds = lists.map((AssignedList l) => l.id).toSet();
    final List<CachedList> cached = await _db.select(_db.cachedLists).get();
    for (final CachedList entry in cached) {
      if (!keptIds.contains(entry.id)) {
        await (_db.delete(_db.cachedLists)..where((t) => t.id.equals(entry.id))).go();
        await (_db.delete(_db.cachedItems)..where((t) => t.listId.equals(entry.id))).go();
      }
    }
  }

  // --- Lignes ------------------------------------------------------------------

  /// Télécharge l'intégralité des lignes d'une liste, page par page.
  ///
  /// Une liste peut compter près de 8 000 lignes : on les récupère par paquets
  /// pour ne pas saturer la mémoire d'un terminal d'entrée de gamme, et pour
  /// qu'une coupure réseau n'annule pas tout le travail déjà reçu.
  Future<int> downloadItems(
    String listId, {
    void Function(int received, int total)? onProgress,
  }) async {
    int page = 1;
    int total = 0;
    int received = 0;

    await (_db.delete(_db.cachedItems)..where((t) => t.listId.equals(listId))).go();

    while (true) {
      final Map<String, dynamic> response = await _api.get<Map<String, dynamic>>(
        '/lists/$listId/items',
        query: <String, dynamic>{'page': page, 'limit': AppConfig.listPageSize},
      );

      final List<dynamic> rows = response['data'] as List<dynamic>;
      final Map<String, dynamic> meta = response['meta'] as Map<String, dynamic>;
      total = meta['total'] as int;

      if (rows.isEmpty) break;

      final List<RemoteItem> items =
          rows.map((dynamic e) => RemoteItem.fromJson(e as Map<String, dynamic>)).toList();

      await _db.batch((Batch batch) {
        for (final RemoteItem item in items) {
          final LocationParts parts = parseLocation(item.locationCode);

          batch.insert(
            _db.cachedItems,
            CachedItemsCompanion.insert(
              id: item.id,
              listId: item.listId,
              articleCode: item.articleCode,
              designation: item.designation,
              unit: Value<String>(item.unit),
              brand: Value<String?>(item.brand),
              manufacturerRef: Value<String?>(item.manufacturerRef),
              locationCode: item.locationCode,
              locationIsVirtual: Value<bool>(item.locationIsVirtual),
              aisle: Value<int?>(parts.aisle),
              bay: Value<int?>(parts.bay),
              level: Value<String?>(parts.level),
              slot: Value<int?>(parts.slot),
              finalQty: Value<double?>(item.finalQty),
              status: item.status,
              expectedCountNumber: Value<int?>(item.expectedCountNumber),
              isManual: Value<bool>(item.isManual),
              countedByMe: Value<bool>(item.countedByMe),
              myLastQuantity: Value<double?>(item.myLastQuantity),
              countCount: Value<int>(item.countCount),
              searchText: buildSearchText(item),
            ),
            mode: InsertMode.insertOrReplace,
          );
        }
      });

      received += items.length;
      onProgress?.call(received, total);

      if (received >= total) break;
      page += 1;
    }

    await (_db.update(_db.cachedLists)..where((t) => t.id.equals(listId))).write(
      CachedListsCompanion(syncedAt: Value<DateTime>(DateTime.now())),
    );

    return received;
  }

  /// Lignes d'une liste, triées dans l'ordre physique de parcours.
  Stream<List<CachedItem>> watchItems(
    String listId, {
    String search = '',
    ItemFilter filter = ItemFilter.all,
  }) {
    final SimpleSelectStatement<$CachedItemsTable, CachedItem> query = _db.select(_db.cachedItems)
      ..where((t) => t.listId.equals(listId));

    if (search.trim().isNotEmpty) {
      final String needle = '%${normalizeForSearch(search)}%';
      query.where((t) => t.searchText.like(needle));
    }

    switch (filter) {
      case ItemFilter.remaining:
        query.where((t) => t.countedByMe.equals(false) & t.status.equals('NOT_FOUND').not());
      case ItemFilter.counted:
        query.where((t) => t.countedByMe.equals(true));
      case ItemFilter.notFound:
        query.where((t) => t.status.equals('NOT_FOUND'));
      case ItemFilter.all:
        break;
    }

    // Emplacement d'abord, dans l'ordre où l'on marche dans l'entrepôt ; les
    // emplacements non structurés suivent, et « sans emplacement » ferme la
    // marche. Désignation en dernier critère.
    query.orderBy(<OrderClauseGenerator<$CachedItemsTable>>[
      (t) => OrderingTerm(expression: t.locationIsVirtual),
      (t) => OrderingTerm(expression: t.aisle, nulls: NullsOrder.last),
      (t) => OrderingTerm(expression: t.bay, nulls: NullsOrder.last),
      (t) => OrderingTerm(expression: t.level, nulls: NullsOrder.last),
      (t) => OrderingTerm(expression: t.slot, nulls: NullsOrder.last),
      (t) => OrderingTerm(expression: t.locationCode),
      (t) => OrderingTerm(expression: t.designation),
    ]);

    return query.watch();
  }

  /// Recherche d'un article par code exact — chemin emprunté après un scan.
  Future<CachedItem?> findByArticleCode(String listId, String code) {
    return (_db.select(_db.cachedItems)
          ..where((t) => t.listId.equals(listId) & t.articleCode.equals(code.toUpperCase()))
          ..limit(1))
        .getSingleOrNull();
  }

  // --- Comptages ----------------------------------------------------------------

  /// Enregistre un comptage **localement**, puis tente de l'envoyer.
  ///
  /// L'écriture locale est volontairement faite en premier et attendue : si
  /// l'application est tuée dans la seconde qui suit, le comptage est déjà
  /// durable. L'envoi réseau, lui, peut échouer sans conséquence.
  Future<void> recordCount({
    required CachedItem item,
    required double quantity,
    String? note,
  }) async {
    final String clientUuid = _uuid.v4();
    final DateTime countedAt = DateTime.now();

    await _db.into(_db.pendingCounts).insert(
          PendingCountsCompanion.insert(
            clientUuid: clientUuid,
            itemId: item.id,
            listId: item.listId,
            quantity: quantity,
            countedAt: countedAt,
            note: Value<String?>(note),
          ),
        );

    // Retour visuel immédiat : la ligne apparaît comptée avant même que le
    // serveur ne l'ait reçue.
    await (_db.update(_db.cachedItems)..where((t) => t.id.equals(item.id))).write(
      CachedItemsCompanion(
        countedByMe: const Value<bool>(true),
        myLastQuantity: Value<double>(quantity),
        countCount: Value<int>(item.countCount + 1),
      ),
    );

    unawaited(synchronize());
  }

  /// Ajoute une ligne pour un article absent du fichier importé.
  ///
  /// **Exige le réseau**, contrairement au comptage. Une ligne créée hors
  /// ligne n'aurait pas d'identifiant serveur : impossible d'y rattacher un
  /// comptage, et impossible de la dédoublonner si deux opérateurs ajoutent le
  /// même article depuis deux terminaux. Mieux vaut un refus explicite qu'une
  /// ligne fantôme qui se révélerait inutilisable à la synchronisation.
  ///
  /// La ligne est renvoyée puis insérée dans le cache local, afin qu'elle soit
  /// immédiatement comptable sans attendre un rechargement complet de la liste.
  Future<CachedItem> addManualItem({
    required String listId,
    required String articleCode,
    String? designation,
    String? locationCode,
    String? unit,
  }) async {
    final Map<String, dynamic> response = await _api.post<Map<String, dynamic>>(
      '/lists/$listId/items',
      body: <String, dynamic>{
        'articleCode': articleCode,
        if (designation != null && designation.trim().isNotEmpty)
          'designation': designation.trim(),
        if (locationCode != null && locationCode.trim().isNotEmpty)
          'locationCode': locationCode.trim(),
        if (unit != null && unit.trim().isNotEmpty) 'unit': unit.trim(),
      },
    );

    final RemoteItem item = RemoteItem.fromJson(response);
    final LocationParts parts = parseLocation(item.locationCode);

    await _db.into(_db.cachedItems).insert(
          CachedItemsCompanion.insert(
            id: item.id,
            listId: item.listId,
            articleCode: item.articleCode,
            designation: item.designation,
            unit: Value<String>(item.unit),
            brand: Value<String?>(item.brand),
            manufacturerRef: Value<String?>(item.manufacturerRef),
            locationCode: item.locationCode,
            locationIsVirtual: Value<bool>(item.locationIsVirtual),
            aisle: Value<int?>(parts.aisle),
            bay: Value<int?>(parts.bay),
            level: Value<String?>(parts.level),
            slot: Value<int?>(parts.slot),
            finalQty: Value<double?>(item.finalQty),
            status: item.status,
            expectedCountNumber: Value<int?>(item.expectedCountNumber),
            isManual: Value<bool>(item.isManual),
            countedByMe: Value<bool>(item.countedByMe),
            myLastQuantity: Value<double?>(item.myLastQuantity),
            countCount: Value<int>(item.countCount),
            searchText: buildSearchText(item),
          ),
          mode: InsertMode.insertOrReplace,
        );

    return (_db.select(_db.cachedItems)..where((t) => t.id.equals(item.id))).getSingle();
  }

  /// Comptages en attente d'envoi.
  Stream<List<PendingCount>> watchPending() {
    return (_db.select(_db.pendingCounts)
          ..where((t) => t.state.isNotValue('SENT'))
          ..orderBy(<OrderClauseGenerator<$PendingCountsTable>>[
            (t) => OrderingTerm(expression: t.countedAt, mode: OrderingMode.desc),
          ]))
        .watch();
  }

  Stream<int> watchPendingCount() {
    final Expression<int> count = _db.pendingCounts.clientUuid.count();
    final JoinedSelectStatement<HasResultSet, dynamic> query = _db.selectOnly(_db.pendingCounts)
      ..addColumns(<Expression<Object>>[count])
      ..where(_db.pendingCounts.state.equals('PENDING'));

    return query.watchSingle().map((TypedResult row) => row.read(count) ?? 0);
  }

  /// Envoie la file d'attente au serveur.
  ///
  /// Chaque comptage est traité indépendamment côté serveur : une ligne
  /// refusée — article retiré de la liste, campagne clôturée entre-temps — ne
  /// doit pas bloquer les autres, sinon la file resterait coincée.
  Future<SyncReport> synchronize() async {
    final List<PendingCount> queue = await (_db.select(_db.pendingCounts)
          ..where((t) => t.state.equals('PENDING'))
          ..limit(AppConfig.syncBatchSize))
        .get();

    if (queue.isEmpty) {
      return const SyncReport(sent: 0, rejected: 0, failed: 0);
    }

    try {
      final Map<String, dynamic> response = await _api.post<Map<String, dynamic>>(
        '/counts/sync',
        body: <String, dynamic>{
          'counts': queue
              .map(
                (PendingCount c) => <String, dynamic>{
                  'itemId': c.itemId,
                  'quantity': c.quantity,
                  'clientUuid': c.clientUuid,
                  'countedAt': c.countedAt.toUtc().toIso8601String(),
                  'source': 'MOBILE',
                  if (c.note != null) 'note': c.note,
                },
              )
              .toList(),
        },
      );

      final List<SyncOutcome> results = (response['results'] as List<dynamic>)
          .map((dynamic e) => SyncOutcome.fromJson(e as Map<String, dynamic>))
          .toList();

      int sent = 0;
      int rejected = 0;

      for (final SyncOutcome result in results) {
        if (result.isAcknowledged) {
          // Accusé de réception : le comptage est en sécurité côté serveur.
          await (_db.delete(_db.pendingCounts)
                ..where((t) => t.clientUuid.equals(result.clientUuid)))
              .go();
          sent += 1;
        } else {
          // Refus définitif : conservé et signalé, jamais effacé en silence.
          await (_db.update(_db.pendingCounts)
                ..where((t) => t.clientUuid.equals(result.clientUuid)))
              .write(
            PendingCountsCompanion(
              state: const Value<String>('REJECTED'),
              failureReason: Value<String?>(result.reason),
              lastAttemptAt: Value<DateTime>(DateTime.now()),
            ),
          );
          rejected += 1;
        }
      }

      return SyncReport(sent: sent, rejected: rejected, failed: 0);
    } on ApiException catch (error) {
      // Échec réseau : la file reste intacte et sera réessayée. On incrémente
      // seulement le compteur de tentatives, utile au diagnostic.
      for (final PendingCount entry in queue) {
        await (_db.update(_db.pendingCounts)..where((t) => t.clientUuid.equals(entry.clientUuid)))
            .write(
          PendingCountsCompanion(
            attempts: Value<int>(entry.attempts + 1),
            lastAttemptAt: Value<DateTime>(DateTime.now()),
          ),
        );
      }

      return SyncReport(
        sent: 0,
        rejected: 0,
        failed: queue.length,
        error: error.message,
      );
    }
  }

  /// Replace un comptage refusé dans la file, après correction de la cause.
  Future<void> retry(String clientUuid) async {
    await (_db.update(_db.pendingCounts)..where((t) => t.clientUuid.equals(clientUuid))).write(
      const PendingCountsCompanion(
        state: Value<String>('PENDING'),
        failureReason: Value<String?>(null),
      ),
    );
  }

  /// Abandonne définitivement un comptage refusé. Action explicite de
  /// l'utilisateur : l'application ne supprime jamais une saisie d'elle-même.
  Future<void> discard(String clientUuid) {
    return (_db.delete(_db.pendingCounts)..where((t) => t.clientUuid.equals(clientUuid))).go();
  }

  Future<int> rejectedCount() async {
    final List<PendingCount> rows =
        await (_db.select(_db.pendingCounts)..where((t) => t.state.equals('REJECTED'))).get();
    return rows.length;
  }
}

class SyncReport {
  const SyncReport({
    required this.sent,
    required this.rejected,
    required this.failed,
    this.error,
  });

  final int sent;
  final int rejected;
  final int failed;
  final String? error;

  bool get hasFailed => failed > 0;
}

enum ItemFilter { all, remaining, counted, notFound }

// --- Utilitaires partagés -------------------------------------------------------

class LocationParts {
  const LocationParts({this.aisle, this.bay, this.level, this.slot});

  final int? aisle;
  final int? bay;
  final String? level;
  final int? slot;
}

final RegExp _structuredLocation = RegExp(r'^(\d{1,3})-(\d{1,3})-([A-Z]{1,2})(?:-(\d{1,4}))?$');

/// Décompose un emplacement « allée-travée-niveau[-case] ».
///
/// Reproduit la règle du serveur : sans décomposition, le tri serait
/// lexicographique et « 10- » passerait avant « 2- », faisant zigzaguer le
/// magasinier dans l'entrepôt.
LocationParts parseLocation(String raw) {
  final String code = raw.trim().toUpperCase();
  if (code.contains('/')) return const LocationParts();

  final RegExpMatch? match = _structuredLocation.firstMatch(code);
  if (match == null) return const LocationParts();

  return LocationParts(
    aisle: int.tryParse(match.group(1)!),
    bay: int.tryParse(match.group(2)!),
    level: match.group(3),
    slot: match.group(4) == null ? null : int.tryParse(match.group(4)!),
  );
}

const Map<String, String> _accents = <String, String>{
  'À': 'A',
  'Â': 'A',
  'Ä': 'A',
  'Á': 'A',
  'Ã': 'A',
  'È': 'E',
  'É': 'E',
  'Ê': 'E',
  'Ë': 'E',
  'Î': 'I',
  'Ï': 'I',
  'Í': 'I',
  'Ô': 'O',
  'Ö': 'O',
  'Ó': 'O',
  'Õ': 'O',
  'Ù': 'U',
  'Û': 'U',
  'Ü': 'U',
  'Ú': 'U',
  'Ç': 'C',
  'Ñ': 'N',
};

/// Forme comparable : majuscules sans accents. Permet de retrouver « unité »
/// en tapant « unite », ce que fait tout opérateur pressé.
String normalizeForSearch(String raw) {
  final StringBuffer buffer = StringBuffer();
  for (final String char in raw.toUpperCase().split('')) {
    buffer.write(_accents[char] ?? char);
  }
  return buffer.toString();
}

/// Index de recherche d'une ligne : les cinq critères utilisés sur le terrain.
String buildSearchText(RemoteItem item) {
  return normalizeForSearch(
    <String>[
      item.articleCode,
      item.designation,
      item.locationCode,
      item.brand ?? '',
      item.manufacturerRef ?? '',
    ].join(' '),
  );
}
