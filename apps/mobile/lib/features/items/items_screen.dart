import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../data/local/database.dart';
import '../../data/sync_repository.dart';
import '../../widgets/sync_badge.dart';
import '../counting/count_entry_sheet.dart';
import '../scan/scan_screen.dart';
import 'add_item_sheet.dart';

/// Écran de comptage d'une liste.
///
/// Disposition pensée pour le terrain : la recherche et les filtres en haut,
/// la liste occupant tout le reste, et l'emplacement comme information la plus
/// saillante de chaque ligne — c'est lui qui guide le déplacement.
class ItemsScreen extends ConsumerStatefulWidget {
  const ItemsScreen({required this.list, super.key});

  final CachedList list;

  @override
  ConsumerState<ItemsScreen> createState() => _ItemsScreenState();
}

class _ItemsScreenState extends ConsumerState<ItemsScreen> {
  final TextEditingController _search = TextEditingController();
  ItemFilter _filter = ItemFilter.remaining;
  String _query = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _openAddItem() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (BuildContext context) => AddItemSheet(listId: widget.list.id),
    );
  }

  Future<void> _openScanner() async {
    final String? code = await Navigator.of(context).push<String>(
      MaterialPageRoute<String>(builder: (_) => const ScanScreen()),
    );

    if (code == null || !mounted) return;

    final CachedItem? item =
        await ref.read(syncRepositoryProvider).findByArticleCode(widget.list.id, code);

    if (!mounted) return;

    if (item == null) {
      // Le code est lisible mais absent de la liste : le signaler clairement
      // évite que l'opérateur croie à une panne du scanner.
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('L’article $code ne figure pas dans cette liste.'),
          backgroundColor: AppTheme.shortage,
          duration: const Duration(seconds: 4),
        ),
      );
      return;
    }

    await _openCountSheet(item);
  }

  Future<void> _openCountSheet(CachedItem item) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => CountEntrySheet(item: item),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final AsyncValue<List<CachedItem>> items = ref.watch(
      itemsProvider(
        ItemQuery(listId: widget.list.id, search: _query, filter: _filter),
      ),
    );

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(widget.list.name, style: theme.textTheme.titleMedium),
            Text(
              widget.list.campaignCode,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
        actions: <Widget>[
          // Ajout d'un article absent du fichier : action secondaire, mais qui
          // doit rester atteignable depuis la liste où le constat est fait.
          IconButton(
            tooltip: 'Ajouter un article absent de la liste',
            icon: const Icon(Icons.add_box_outlined),
            onPressed: _openAddItem,
          ),
          const SyncBadge(),
        ],
      ),

      body: Column(
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
            child: TextField(
              controller: _search,
              textInputAction: TextInputAction.search,
              onChanged: (String value) => setState(() => _query = value),
              decoration: InputDecoration(
                hintText: 'Code, désignation, emplacement, marque…',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _query.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.clear),
                        tooltip: 'Effacer',
                        onPressed: () {
                          _search.clear();
                          setState(() => _query = '');
                        },
                      ),
              ),
            ),
          ),
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: <Widget>[
                _FilterChip(
                  label: 'Restantes',
                  selected: _filter == ItemFilter.remaining,
                  onSelected: () => setState(() => _filter = ItemFilter.remaining),
                ),
                _FilterChip(
                  label: 'Comptées',
                  selected: _filter == ItemFilter.counted,
                  onSelected: () => setState(() => _filter = ItemFilter.counted),
                ),
                _FilterChip(
                  label: 'Non trouvées',
                  selected: _filter == ItemFilter.notFound,
                  onSelected: () => setState(() => _filter = ItemFilter.notFound),
                ),
                _FilterChip(
                  label: 'Toutes',
                  selected: _filter == ItemFilter.all,
                  onSelected: () => setState(() => _filter = ItemFilter.all),
                ),
              ],
            ),
          ),
          const Divider(height: 16),
          Expanded(
            child: items.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (Object error, _) => Center(child: Text('Erreur : $error')),
              data: (List<CachedItem> rows) {
                if (rows.isEmpty) return _EmptyResult(filter: _filter, query: _query);

                return ListView.separated(
                  padding: const EdgeInsets.only(bottom: 96),
                  itemCount: rows.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (BuildContext context, int index) => _ItemTile(
                    item: rows[index],
                    onTap: () => _openCountSheet(rows[index]),
                  ),
                );
              },
            ),
          ),
        ],
      ),

      // Le scan est l'action principale sur le terrain : bouton large, en bas
      // à droite, atteignable au pouce d'une seule main.
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openScanner,
        icon: const Icon(Icons.qr_code_scanner, size: 28),
        label: const Text('Scanner', style: TextStyle(fontSize: 17)),
        extendedPadding: const EdgeInsets.symmetric(horizontal: 24),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  final String label;
  final bool selected;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onSelected(),
      ),
    );
  }
}

/// Ligne de la liste de comptage.
///
/// L'emplacement est en tête et en gras : c'est le seul critère qui dicte le
/// déplacement du magasinier. Viennent ensuite le code article puis la
/// désignation, dans cet ordre de priorité.
class _ItemTile extends StatelessWidget {
  const _ItemTile({required this.item, required this.onTap});

  final CachedItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final bool isNotFound = item.status == 'NOT_FOUND';

    return InkWell(
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(minHeight: AppTheme.touchTarget + 16),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: <Widget>[
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    item.locationIsVirtual ? 'Sans emplacement' : item.locationCode,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      fontSize: 19,
                      color: item.locationIsVirtual
                          ? theme.colorScheme.onSurfaceVariant
                          : theme.colorScheme.onSurface,
                      fontStyle: item.locationIsVirtual ? FontStyle.italic : FontStyle.normal,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    item.articleCode,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  Text(
                    item.designation,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            _StatusIndicator(item: item, isNotFound: isNotFound),
          ],
        ),
      ),
    );
  }
}

class _StatusIndicator extends StatelessWidget {
  const _StatusIndicator({required this.item, required this.isNotFound});

  final CachedItem item;
  final bool isNotFound;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    if (isNotFound) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: <Widget>[
          const Icon(Icons.search_off, color: AppTheme.warning, size: 28),
          Text(
            'Non trouvé',
            style: theme.textTheme.bodySmall?.copyWith(color: AppTheme.warning),
          ),
        ],
      );
    }

    if (item.countedByMe) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: <Widget>[
          const Icon(Icons.check_circle, color: AppTheme.surplus, size: 28),
          Text(
            _format(item.myLastQuantity ?? 0),
            style: theme.textTheme.titleMedium?.copyWith(
              color: AppTheme.surplus,
              fontWeight: FontWeight.w700,
              fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
            ),
          ),
        ],
      );
    }

    // La quantité théorique n'est plus affichée — ni même transmise au
    // terminal. À la place, on indique quel passage est attendu : c'est
    // l'information dont l'opérateur a besoin, et elle n'oriente pas sa saisie.
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: <Widget>[
        Icon(
          Icons.radio_button_unchecked,
          color: theme.colorScheme.outline,
          size: 28,
        ),
        const SizedBox(height: 2),
        if ((item.expectedCountNumber ?? 1) > 1)
          Text(
            '${item.expectedCountNumber}e comptage',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.tertiary,
              fontWeight: FontWeight.w600,
            ),
          )
        else
          Text(
            'À compter',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
      ],
    );
  }

  /// Supprime les décimales inutiles : « 12 » plutôt que « 12.0 ».
  static String _format(double value) {
    if (value == value.roundToDouble()) return value.toInt().toString();
    return value.toString().replaceAll('.', ',');
  }
}

class _EmptyResult extends StatelessWidget {
  const _EmptyResult({required this.filter, required this.query});

  final ItemFilter filter;
  final String query;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    final (IconData icon, String message) = switch (filter) {
      _ when query.isNotEmpty => (
          Icons.search_off,
          'Aucun article ne correspond à « $query » dans cette liste.',
        ),
      ItemFilter.remaining => (
          Icons.task_alt,
          'Tout est compté. Vérifiez l’état de synchronisation avant de quitter.',
        ),
      ItemFilter.counted => (Icons.inbox_outlined, 'Vous n’avez encore rien compté.'),
      ItemFilter.notFound => (
          Icons.inbox_outlined,
          'Aucun article déclaré introuvable.',
        ),
      ItemFilter.all => (Icons.inbox_outlined, 'Cette liste est vide.'),
    };

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Icon(icon, size: 56, color: theme.colorScheme.onSurfaceVariant),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
