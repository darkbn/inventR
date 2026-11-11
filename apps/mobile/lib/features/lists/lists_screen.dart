import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/local/database.dart';
import '../../widgets/sync_badge.dart';
import '../counting/history_screen.dart';
import '../items/items_screen.dart';

/// Écran d'accueil : les listes attribuées à l'opérateur.
class ListsScreen extends ConsumerStatefulWidget {
  const ListsScreen({super.key});

  @override
  ConsumerState<ListsScreen> createState() => _ListsScreenState();
}

class _ListsScreenState extends ConsumerState<ListsScreen> {
  bool _refreshing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Rafraîchissement au lancement, sans bloquer l'affichage : le cache
    // local est montré immédiatement, les données fraîches le remplacent.
    WidgetsBinding.instance.addPostFrameCallback((_) => _refresh());
  }

  Future<void> _refresh() async {
    setState(() {
      _refreshing = true;
      _error = null;
    });

    try {
      await ref.read(syncRepositoryProvider).refreshLists();
      await ref.read(syncControllerProvider.notifier).sync();
    } on Object catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final AsyncValue<List<CachedList>> lists = ref.watch(listsProvider);
    final AuthState auth = ref.watch(authControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes listes'),
        actions: <Widget>[
          const SyncBadge(),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            onSelected: _onMenuSelected,
            itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
              PopupMenuItem<String>(
                enabled: false,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      auth.user?.fullName ?? '',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    Text(
                      auth.user?.username ?? '',
                      style: const TextStyle(fontSize: 13, color: Colors.grey),
                    ),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem<String>(
                value: 'history',
                child: ListTile(
                  leading: Icon(Icons.history),
                  title: Text('Mes comptages'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const PopupMenuItem<String>(
                value: 'logout',
                child: ListTile(
                  leading: Icon(Icons.logout),
                  title: Text('Se déconnecter'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: lists.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (Object error, _) => _Message(
            icon: Icons.error_outline,
            title: 'Impossible de charger vos listes',
            detail: error.toString(),
            onRetry: _refresh,
          ),
          data: (List<CachedList> rows) {
            if (rows.isEmpty) {
              return _Message(
                icon: Icons.inbox_outlined,
                title: 'Aucune liste attribuée',
                detail: _error ??
                    'Votre superviseur doit vous attribuer une liste sur une '
                        'campagne ouverte. Tirez vers le bas pour actualiser.',
                onRetry: _refresh,
              );
            }

            return ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: rows.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (BuildContext context, int index) =>
                  _ListCard(list: rows[index], refreshing: _refreshing),
            );
          },
        ),
      ),
    );
  }

  Future<void> _onMenuSelected(String value) async {
    switch (value) {
      case 'history':
        await Navigator.of(context).push<void>(
          MaterialPageRoute<void>(builder: (_) => const HistoryScreen()),
        );
      case 'logout':
        await ref.read(authControllerProvider.notifier).logout();
        final String? error = ref.read(authControllerProvider).error;
        if (error != null && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(error), duration: const Duration(seconds: 6)),
          );
        }
    }
  }
}

class _ListCard extends ConsumerStatefulWidget {
  const _ListCard({required this.list, required this.refreshing});

  final CachedList list;
  final bool refreshing;

  @override
  ConsumerState<_ListCard> createState() => _ListCardState();
}

class _ListCardState extends ConsumerState<_ListCard> {
  bool _downloading = false;
  int _received = 0;
  int _total = 0;

  /// Les lignes doivent être téléchargées avant de pouvoir compter hors
  /// réseau : c'est ce qui rend le mode avion utilisable en fond d'allée.
  Future<void> _download() async {
    setState(() {
      _downloading = true;
      _received = 0;
      _total = widget.list.totalItems;
    });

    try {
      await ref.read(syncRepositoryProvider).downloadItems(
        widget.list.id,
        onProgress: (int received, int total) {
          if (mounted) {
            setState(() {
              _received = received;
              _total = total;
            });
          }
        },
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$_received ligne(s) disponibles hors ligne.')),
        );
      }
    } on Object catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Téléchargement impossible : $error')),
        );
      }
    } finally {
      if (mounted) setState(() => _downloading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final CachedList list = widget.list;
    final bool isCached = list.syncedAt != null;
    final double progress = list.totalItems == 0 ? 0 : list.countedItems / list.totalItems;

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: isCached
            ? () => Navigator.of(context).push<void>(
                  MaterialPageRoute<void>(
                    builder: (_) => ItemsScreen(list: list),
                  ),
                )
            : _downloading
                ? null
                : _download,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(list.name, style: theme.textTheme.titleMedium),
                        const SizedBox(height: 2),
                        Text(
                          '${list.campaignCode} · ${list.code}',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (list.methodCode == 'METHOD_2')
                    const Tooltip(
                      message: 'Double comptage : deux opérateurs différents doivent '
                          'compter chaque article.',
                      child: Chip(
                        avatar: Icon(Icons.groups_outlined, size: 18),
                        label: Text('Double'),
                        visualDensity: VisualDensity.compact,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              if (_downloading) ...<Widget>[
                LinearProgressIndicator(
                  value: _total == 0 ? null : _received / _total,
                ),
                const SizedBox(height: 8),
                Text(
                  'Téléchargement : $_received / $_total lignes',
                  style: theme.textTheme.bodyMedium,
                ),
              ] else if (!isCached) ...<Widget>[
                Row(
                  children: <Widget>[
                    Icon(
                      Icons.download_for_offline_outlined,
                      size: 20,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Touchez pour télécharger les ${list.totalItems} lignes '
                        'et compter hors réseau.',
                        style: theme.textTheme.bodyMedium,
                      ),
                    ),
                  ],
                ),
              ] else ...<Widget>[
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(value: progress, minHeight: 8),
                ),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: <Widget>[
                    Text(
                      '${list.countedItems} / ${list.totalItems} traitées',
                      style: theme.textTheme.bodyMedium,
                    ),
                    Text(
                      '${list.remainingItems} restantes',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: list.remainingItems == 0 ? theme.colorScheme.primary : null,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

extension on CachedList {
  int get remainingItems {
    final int left = totalItems - countedItems;
    return left < 0 ? 0 : left;
  }
}

class _Message extends StatelessWidget {
  const _Message({
    required this.icon,
    required this.title,
    required this.detail,
    required this.onRetry,
  });

  final IconData icon;
  final String title;
  final String detail;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(32),
      children: <Widget>[
        const SizedBox(height: 64),
        Icon(icon, size: 56, color: theme.colorScheme.onSurfaceVariant),
        const SizedBox(height: 16),
        Text(title, textAlign: TextAlign.center, style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        Text(
          detail,
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 24),
        OutlinedButton.icon(
          onPressed: onRetry,
          icon: const Icon(Icons.refresh),
          label: const Text('Actualiser'),
        ),
      ],
    );
  }
}
