import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/providers.dart';
import '../core/theme/app_theme.dart';
import '../data/sync_repository.dart';
import '../features/sync/sync_screen.dart';

/// Indicateur de synchronisation, présent dans toutes les barres de titre.
///
/// C'est le repère de confiance de l'opérateur : il doit pouvoir vérifier d'un
/// coup d'œil que son travail est parti, sans ouvrir d'écran. Un comptage non
/// transmis n'existe que sur ce terminal — l'information ne doit jamais être
/// enfouie dans un menu.
class SyncBadge extends ConsumerWidget {
  const SyncBadge({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<int> pending = ref.watch(pendingCountProvider);
    final SyncStatus status = ref.watch(syncControllerProvider);
    final AsyncValue<bool> online = ref.watch(connectivityProvider);

    final int waiting = pending.valueOrNull ?? 0;
    final bool isOffline = online.valueOrNull == false;

    final (Color background, Color foreground, IconData icon, String label) = _appearance(
      waiting: waiting,
      rejected: status.rejected,
      isSyncing: status.isSyncing,
      isOffline: isOffline,
    );

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Semantics(
        label: 'État de synchronisation : $label',
        button: true,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () => Navigator.of(context).push<void>(
            MaterialPageRoute<void>(builder: (_) => const SyncScreen()),
          ),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: background,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                if (status.isSyncing)
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(foreground),
                    ),
                  )
                else
                  Icon(icon, size: 18, color: foreground),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: TextStyle(
                    color: foreground,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Quatre états, hiérarchisés par gravité : un rejet prime sur une attente,
  /// qui prime sur l'absence de réseau.
  (Color, Color, IconData, String) _appearance({
    required int waiting,
    required int rejected,
    required bool isSyncing,
    required bool isOffline,
  }) {
    if (rejected > 0) {
      return (
        AppTheme.shortageSoft,
        AppTheme.shortage,
        Icons.error_outline,
        '$rejected refusé${rejected > 1 ? 's' : ''}',
      );
    }

    if (waiting > 0) {
      return (
        AppTheme.warningSoft,
        AppTheme.warning,
        isOffline ? Icons.cloud_off : Icons.cloud_upload_outlined,
        '$waiting en attente',
      );
    }

    if (isOffline) {
      return (
        const Color(0xFFEEEEEE),
        const Color(0xFF616161),
        Icons.cloud_off,
        'Hors ligne',
      );
    }

    return (
      AppTheme.surplusSoft,
      AppTheme.surplus,
      Icons.cloud_done_outlined,
      'À jour',
    );
  }
}
