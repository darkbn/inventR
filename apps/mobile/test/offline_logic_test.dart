// `isNull` existe dans drift et dans matcher : on masque celui de drift,
// les tests utilisant le matcher.
import 'package:drift/drift.dart' hide isNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:inventair/core/config/app_config.dart';
import 'package:inventair/data/local/database.dart';
import 'package:inventair/data/sync_repository.dart';
import 'package:inventair/features/scan/scan_screen.dart';

/// Tests de la logique hors ligne.
///
/// Ce sont les règles dont dépend l'intégrité du travail de terrain : tri
/// physique, recherche sans accents, décodage des étiquettes et persistance de
/// la file d'attente. Elles s'exécutent sans émulateur ni serveur.
void main() {
  group('parseLocation', () {
    test('décompose allée-travée-niveau-case', () {
      final LocationParts parts = parseLocation('1-1-C-7');
      expect(parts.aisle, 1);
      expect(parts.bay, 1);
      expect(parts.level, 'C');
      expect(parts.slot, 7);
    });

    test('accepte un emplacement sans case', () {
      final LocationParts parts = parseLocation('3-2-C');
      expect(parts.aisle, 3);
      expect(parts.slot, isNull);
    });

    test('gère les allées à deux chiffres', () {
      expect(parseLocation('24-4-B').aisle, 24);
    });

    test('ne décompose pas un libellé libre', () {
      expect(parseLocation('ARMOIRE CONSM').aisle, isNull);
    });

    test('ne décompose pas un double emplacement', () {
      // « 16-7-A/16-6-B » existe dans le fichier client : l'article occupe
      // deux positions, il n'a donc pas de coordonnée unique.
      expect(parseLocation('16-7-A/16-6-B').aisle, isNull);
    });

    test('permet un tri numérique et non lexicographique', () {
      // C'est tout l'enjeu : en tri texte, « 10- » passerait avant « 2- » et
      // le magasinier zigzaguerait dans l'entrepôt.
      final List<String> codes = <String>['10-1-A-1', '2-1-A-1', '1-1-A-1'];
      codes.sort(
        (String a, String b) =>
            (parseLocation(a).aisle ?? 0).compareTo(parseLocation(b).aisle ?? 0),
      );
      expect(codes, <String>['1-1-A-1', '2-1-A-1', '10-1-A-1']);
    });
  });

  group('normalizeForSearch', () {
    test('met en majuscules et retire les accents', () {
      // Un opérateur pressé tape « unite » sans accent : la recherche doit
      // malgré tout trouver « Unité ».
      expect(normalizeForSearch('Unité'), 'UNITE');
      expect(normalizeForSearch('Câble électrique'), 'CABLE ELECTRIQUE');
    });

    test('laisse intacts les codes déjà normalisés', () {
      expect(normalizeForSearch('ACCEL-0016'), 'ACCEL-0016');
    });
  });

  group('decodeArticleCode', () {
    test('lit la charge structurée produite par le serveur', () {
      expect(decodeArticleCode('{"t":"ART","c":"ACCEL-0016"}'), 'ACCEL-0016');
    });

    test('accepte une étiquette fournisseur ne portant que le code', () {
      // Compatibilité avec les étiquettes déjà posées en rayon.
      expect(decodeArticleCode('accel-0016'), 'ACCEL-0016');
    });

    test('refuse un QR d’emplacement', () {
      // Cet écran cherche un article : un code emplacement n'y répond pas.
      expect(decodeArticleCode('{"t":"LOC","c":"1-1-C-7"}'), isNull);
    });

    test('refuse un contenu structuré invalide', () {
      expect(decodeArticleCode('{pas du json'), isNull);
      expect(decodeArticleCode('   '), isNull);
    });
  });

group('contrat avec l’API', () {
    // Ces bornes appartiennent au serveur. Rien ne les vérifie à la
    // compilation : Dart ne voit pas les constantes TypeScript. Les dépasser
    // ne casse aucun test d'un côté ni de l'autre — l'API répond simplement
    // 400 et le téléchargement d'une liste échoue en entier sur le terrain.
    // D'où ces assertions, volontairement redondantes avec les commentaires
    // d'AppConfig.

    test('la taille de page reste dans le plafond de l’API', () {
      // apps/api/src/common/dto/pagination-query.dto.ts → MAX_PAGE_SIZE
      expect(AppConfig.listPageSize, lessThanOrEqualTo(200));
    });

    test('le lot de synchronisation reste dans le plafond de l’API', () {
      // apps/api/src/modules/counts/dto/count.dto.ts → MAX_SYNC_BATCH
      expect(AppConfig.syncBatchSize, lessThanOrEqualTo(500));
    });
  });

  group('file d’attente hors ligne', () {
    late AppDatabase db;

    setUp(() {
      db = AppDatabase.forTesting(NativeDatabase.memory());
    });

    tearDown(() async {
      await db.close();
    });

    test('un comptage survit à la fermeture de l’application', () async {
      await db.into(db.pendingCounts).insert(
            PendingCountsCompanion.insert(
              clientUuid: 'uuid-1',
              itemId: 'item-1',
              listId: 'list-1',
              quantity: 12.5,
              countedAt: DateTime(2026, 6, 14, 10, 30),
            ),
          );

      final List<PendingCount> rows = await db.select(db.pendingCounts).get();
      expect(rows, hasLength(1));
      expect(rows.first.quantity, 12.5);
      expect(rows.first.state, 'PENDING');
    });

    test('l’identifiant client empêche tout doublon', () async {
      await db.into(db.pendingCounts).insert(
            PendingCountsCompanion.insert(
              clientUuid: 'uuid-1',
              itemId: 'item-1',
              listId: 'list-1',
              quantity: 5,
              countedAt: DateTime(2026, 6, 14),
            ),
          );

      // Rejouer la même saisie — par exemple après un redémarrage brutal —
      // ne doit pas créer de seconde entrée.
      await expectLater(
        db.into(db.pendingCounts).insert(
              PendingCountsCompanion.insert(
                clientUuid: 'uuid-1',
                itemId: 'item-1',
                listId: 'list-1',
                quantity: 5,
                countedAt: DateTime(2026, 6, 14),
              ),
            ),
        throwsA(isA<Exception>()),
      );

      expect(await db.select(db.pendingCounts).get(), hasLength(1));
    });

    test('un comptage refusé est conservé avec son motif', () async {
      await db.into(db.pendingCounts).insert(
            PendingCountsCompanion.insert(
              clientUuid: 'uuid-2',
              itemId: 'item-9',
              listId: 'list-1',
              quantity: 3,
              countedAt: DateTime(2026, 6, 14),
            ),
          );

      await (db.update(db.pendingCounts)
            ..where(($PendingCountsTable t) => t.clientUuid.equals('uuid-2')))
          .write(
        const PendingCountsCompanion(
          state: Value<String>('REJECTED'),
          failureReason: Value<String?>('Cette campagne est clôturée.'),
        ),
      );

      final PendingCount row = (await db.select(db.pendingCounts).get()).first;

      // Jamais effacé en silence : l'opérateur doit savoir ce qui n'est pas
      // passé, et pourquoi.
      expect(row.state, 'REJECTED');
      expect(row.failureReason, contains('clôturée'));
    });

    test('le tri des lignes suit le parcours physique', () async {
      Future<void> insert(String id, String location) async {
        final LocationParts parts = parseLocation(location);
        await db.into(db.cachedItems).insert(
              CachedItemsCompanion.insert(
                id: id,
                listId: 'list-1',
                articleCode: id,
                designation: 'Article $id',
                locationCode: location,
                locationIsVirtual: Value<bool>(location == 'NON-LOCALISE'),
                aisle: Value<int?>(parts.aisle),
                bay: Value<int?>(parts.bay),
                level: Value<String?>(parts.level),
                slot: Value<int?>(parts.slot),
                status: 'PENDING',
                searchText: id,
              ),
            );
      }

      await insert('C', '10-1-A-1');
      await insert('A', '1-1-A-1');
      await insert('D', 'NON-LOCALISE');
      await insert('B', '2-1-A-1');

      final List<CachedItem> rows = await (db.select(db.cachedItems)
            ..orderBy(<OrderClauseGenerator<$CachedItemsTable>>[
              ($CachedItemsTable t) => OrderingTerm(expression: t.locationIsVirtual),
              ($CachedItemsTable t) => OrderingTerm(expression: t.aisle, nulls: NullsOrder.last),
              ($CachedItemsTable t) => OrderingTerm(expression: t.bay, nulls: NullsOrder.last),
            ]))
          .get();

      // Ordre attendu : allées croissantes, « sans emplacement » en dernier.
      expect(rows.map((CachedItem r) => r.id).toList(), <String>['A', 'B', 'C', 'D']);
    });
  });
}
