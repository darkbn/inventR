import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../data/local/database.dart';
import '../../data/sync_repository.dart';

/// État détaillé de la synchronisation.
///
/// Écran de confiance : l'opérateur doit pouvoir constater que son travail est
/// parti, et comprendre précisément ce qui bloque le cas échéant.
class SyncScreen extends ConsumerWidget {
  const SyncScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<List<PendingCount>> queue = ref.watch(pendingCountsProvider);
    final SyncStatus status = ref.watch(syncControllerProvider);
    final AsyncValue<bool> online = ref.watch(connectivityProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Synchronisation')),
      body: Column(
        children: <Widget>[
          _Summary(
            status: status,
            isOnline: online.valueOrNull ?? true,
            onSync: () => ref.read(syncControllerProvider.notifier).sync(manual: true),
          ),
          const Divider(height: 1),
          Expanded(
            child: queue.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (Object error, _) => Center(child: Text('Erreur : $error')),
              data: (List<PendingCount> rows) {
                if (rows.isEmpty) return const _AllSent();

                return ListView.separated(
                  itemCount: rows.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (BuildContext context, int index) => _QueueTile(entry: rows[index]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary({
    required this.status,
    required this.isOnline,
    required this.onSync,
  });

  final SyncStatus status;
  final bool isOnline;
  final Future<void> Function() onSync;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            children: <Widget>[
              Icon(
                isOnline ? Icons.wifi : Icons.wifi_off,
                color: isOnline ? AppTheme.surplus : theme.colorScheme.outline,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  isOnline ? 'Réseau disponible' : 'Hors réseau',
                  style: theme.textTheme.titleMedium,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            status.lastSyncAt == null
                ? 'Aucune synchronisation depuis le lancement.'
                : 'Dernière synchronisation : '
                    '${DateFormat('dd/MM/yyyy à HH:mm', 'fr_FR').format(status.lastSyncAt!)}',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          if (status.lastError != null) ...<Widget>[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.warningSoft,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: <Widget>[
                  const Icon(Icons.info_outline, size: 20, color: AppTheme.warning),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      status.lastError!,
                      style: const TextStyle(fontSize: 14),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: status.isSyncing ? null : onSync,
            icon: status.isSyncing
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.sync),
            label: Text(
              status.isSyncing ? 'Synchronisation…' : 'Synchroniser maintenant',
            ),
          ),
        ],
      ),
    );
  }
}

class _QueueTile extends ConsumerWidget {
  const _QueueTile({required this.entry});

  final PendingCount entry;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ThemeData theme = Theme.of(context);
    final bool rejected = entry.state == 'REJECTED';

    return ListTile(
      leading: Icon(
        rejected ? Icons.error_outline : Icons.schedule,
        color: rejected ? AppTheme.shortage : AppTheme.warning,
        size: 28,
      ),
      title: Text(
        'Quantité ${_format(entry.quantity)}',
        style: theme.textTheme.titleMedium,
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            DateFormat('dd/MM à HH:mm', 'fr_FR').format(entry.countedAt),
            style: theme.textTheme.bodySmall,
          ),
          if (rejected && entry.failureReason != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                entry.failureReason!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppTheme.shortage,
                ),
              ),
            )
          else if (entry.attempts > 0)
            Text(
              '${entry.attempts} tentative(s) d’envoi',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
        ],
      ),
      trailing: rejected
          ? PopupMenuButton<String>(
              onSelected: (String value) async {
                final SyncRepository repository = ref.read(syncRepositoryProvider);
                if (value == 'retry') {
                  await repository.retry(entry.clientUuid);
                  await ref.read(syncControllerProvider.notifier).sync(manual: true);
                } else {
                  await _confirmDiscard(context, repository);
                }
              },
              itemBuilder: (_) => const <PopupMenuEntry<String>>[
                PopupMenuItem<String>(value: 'retry', child: Text('Réessayer')),
                PopupMenuItem<String>(value: 'discard', child: Text('Abandonner')),
              ],
            )
          : null,
    );
  }

  /// L'abandon d'un comptage est une perte de données : il exige une
  /// confirmation explicite, l'application ne supprime jamais de saisie seule.
  Future<void> _confirmDiscard(
    BuildContext context,
    SyncRepository repository,
  ) async {
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext dialogContext) => AlertDialog(
        title: const Text('Abandonner ce comptage ?'),
        content: const Text(
          'La saisie sera définitivement supprimée de ce terminal et ne sera '
          'jamais transmise au serveur.',
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppTheme.shortage),
            child: const Text('Abandonner'),
          ),
        ],
      ),
    );

    if (confirmed ?? false) {
      await repository.discard(entry.clientUuid);
    }
  }

  static String _format(double value) {
    if (value == value.roundToDouble()) return value.toInt().toString();
    return value.toString().replaceAll('.', ',');
  }
}

class _AllSent extends StatelessWidget {
  const _AllSent();

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Icon(Icons.cloud_done_outlined, size: 64, color: AppTheme.surplus),
            const SizedBox(height: 16),
            Text('Tout est transmis', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              'Aucun comptage en attente. Vous pouvez quitter l’application '
              'sans rien perdre.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
