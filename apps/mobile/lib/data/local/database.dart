import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

part 'database.g.dart';

/// Lignes d'inventaire mises en cache localement.
///
/// Drift — c'est-à-dire SQLite — plutôt qu'un simple stockage clé-valeur : une
/// liste peut compter plusieurs milliers de lignes qu'il faut trier par
/// emplacement, filtrer et rechercher **hors réseau**. Seul un moteur SQL le
/// permet sans tout charger en mémoire.
class CachedItems extends Table {
  TextColumn get id => text()();
  TextColumn get listId => text()();

  TextColumn get articleCode => text()();
  TextColumn get designation => text()();
  TextColumn get unit => text().withDefault(const Constant('Unité'))();
  TextColumn get brand => text().nullable()();
  TextColumn get manufacturerRef => text().nullable()();

  TextColumn get locationCode => text()();
  BoolColumn get locationIsVirtual => boolean().withDefault(const Constant(false))();

  /// Décomposition de l'emplacement, recopiée du serveur : elle permet le tri
  /// physique (allée, travée, niveau, case) en ordre numérique.
  IntColumn get aisle => integer().nullable()();
  IntColumn get bay => integer().nullable()();
  TextColumn get level => text().nullable()();
  IntColumn get slot => integer().nullable()();

  /// La quantité théorique n'est **pas** stockée : le serveur ne la transmet
  /// plus à un opérateur. La conserver ici, même sans l'afficher, suffirait à
  /// la faire ressortir d'une sauvegarde ou d'un terminal égaré.
  RealColumn get finalQty => real().nullable()();
  TextColumn get status => text()();

  /// Rang du prochain comptage attendu (Méthode 3). Permet d'annoncer
  /// « 2e comptage » à l'opérateur au lieu de le laisser deviner pourquoi une
  /// ligne déjà traitée lui revient.
  IntColumn get expectedCountNumber => integer().nullable()();

  /// Ligne ajoutée sur le terrain, absente du fichier importé.
  BoolColumn get isManual => boolean().withDefault(const Constant(false))();

  /// Vrai si l'utilisateur courant a déjà compté cette ligne.
  BoolColumn get countedByMe => boolean().withDefault(const Constant(false))();
  RealColumn get myLastQuantity => real().nullable()();
  IntColumn get countCount => integer().withDefault(const Constant(0))();

  /// Forme sans accents et en majuscules, pour une recherche insensible.
  TextColumn get searchText => text()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// Listes attribuées à l'utilisateur, également mises en cache.
class CachedLists extends Table {
  TextColumn get id => text()();
  TextColumn get code => text()();
  TextColumn get name => text()();
  TextColumn get status => text()();
  TextColumn get campaignId => text()();
  TextColumn get campaignCode => text()();
  TextColumn get campaignName => text()();
  TextColumn get campaignStatus => text()();
  TextColumn get methodCode => text()();
  IntColumn get totalItems => integer().withDefault(const Constant(0))();
  IntColumn get countedItems => integer().withDefault(const Constant(0))();
  DateTimeColumn get syncedAt => dateTime().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// File d'attente des comptages réalisés hors ligne.
///
/// C'est la table la plus critique de l'application : elle contient du travail
/// de terrain qui n'existe nulle part ailleurs tant qu'il n'est pas transmis.
/// Rien n'en est supprimé avant confirmation explicite du serveur.
class PendingCounts extends Table {
  /// UUID v4 généré **avant** l'envoi : clé d'idempotence côté serveur.
  TextColumn get clientUuid => text()();
  TextColumn get itemId => text()();
  TextColumn get listId => text()();

  RealColumn get quantity => real()();
  DateTimeColumn get countedAt => dateTime()();
  TextColumn get note => text().nullable()();

  /// PENDING, SENDING, SENT, REJECTED
  TextColumn get state => text().withDefault(const Constant('PENDING'))();

  /// Motif d'un rejet serveur, affiché à l'utilisateur.
  TextColumn get failureReason => text().nullable()();
  IntColumn get attempts => integer().withDefault(const Constant(0))();
  DateTimeColumn get lastAttemptAt => dateTime().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {clientUuid};
}

@DriftDatabase(tables: [CachedItems, CachedLists, PendingCounts])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_open());

  /// Constructeur de test : base en mémoire, sans fichier.
  AppDatabase.forTesting(super.executor);

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (Migrator m) async {
          await m.createAll();
          // Index indispensables : sans eux, le tri physique d'une liste de
          // 8 000 lignes provoque un balayage complet à chaque défilement.
          await customStatement(
            'CREATE INDEX IF NOT EXISTS idx_items_list_sort '
            'ON cached_items (list_id, location_is_virtual, aisle, bay, level, slot, designation)',
          );
          await customStatement(
            'CREATE INDEX IF NOT EXISTS idx_items_search ON cached_items (list_id, search_text)',
          );
          await customStatement(
            'CREATE INDEX IF NOT EXISTS idx_pending_state ON pending_counts (state, counted_at)',
          );
        },
        onUpgrade: (Migrator m, int from, int to) async {
          if (from < 2) {
            // v2 : la quantité théorique disparaît du terminal, deux colonnes
            // apparaissent. Les lignes et les listes sont un simple cache du
            // serveur : les recréer vides est plus sûr que de bricoler des
            // colonnes, la prochaine synchronisation les repeuple.
            //
            // `pending_counts` n'est **surtout pas** touchée : elle contient
            // les comptages saisis en rayon et pas encore transmis. Les
            // effacer ferait perdre du travail réel, parfois celui d'une
            // journée entière passée hors couverture réseau.
            await m.deleteTable('cached_items');
            await m.deleteTable('cached_lists');
            await m.createTable(cachedItems);
            await m.createTable(cachedLists);

            await customStatement(
              'CREATE INDEX IF NOT EXISTS idx_items_list_sort '
              'ON cached_items (list_id, location_is_virtual, aisle, bay, level, slot, designation)',
            );
            await customStatement(
              'CREATE INDEX IF NOT EXISTS idx_items_search ON cached_items (list_id, search_text)',
            );
          }
        },
      );
}

LazyDatabase _open() {
  return LazyDatabase(() async {
    final Directory directory = await getApplicationDocumentsDirectory();
    final File file = File(p.join(directory.path, 'inventair.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}
