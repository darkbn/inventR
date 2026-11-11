import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/network/api_client.dart';
import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';

/// Historique des comptages de l'utilisateur.
///
/// Les données viennent du serveur : il s'agit de consulter ce qui a été
/// effectivement enregistré, par opposition à l'écran de synchronisation qui
/// montre ce qui reste à transmettre.
class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  List<Map<String, dynamic>>? _entries;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final List<dynamic> response = await ref
          .read(apiClientProvider)
          .get<List<dynamic>>('/my/counts', query: <String, dynamic>{'limit': 100});

      if (!mounted) return;
      setState(() {
        _entries = response.map((dynamic e) => e as Map<String, dynamic>).toList();
        _loading = false;
      });
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.message;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Mes comptages')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: Builder(
          builder: (BuildContext context) {
            if (_loading) {
              return const Center(child: CircularProgressIndicator());
            }

            if (_error != null) {
              return ListView(
                padding: const EdgeInsets.all(32),
                children: <Widget>[
                  const SizedBox(height: 64),
                  Icon(
                    Icons.cloud_off,
                    size: 56,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Historique indisponible',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    // L'historique vient du serveur : hors réseau, il n'est pas
                    // consultable, à la différence de la liste de comptage.
                    '$_error\n\nCet écran nécessite une connexion au serveur.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              );
            }

            final List<Map<String, dynamic>> entries = _entries ?? <Map<String, dynamic>>[];

            if (entries.isEmpty) {
              return ListView(
                padding: const EdgeInsets.all(32),
                children: <Widget>[
                  const SizedBox(height: 64),
                  Icon(
                    Icons.history,
                    size: 56,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Aucun comptage enregistré',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.titleMedium,
                  ),
                ],
              );
            }

            return ListView.separated(
              itemCount: entries.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (BuildContext context, int index) {
                final Map<String, dynamic> entry = entries[index];
                final bool cancelled = entry['status'] == 'CANCELLED';
                final DateTime countedAt = DateTime.parse(entry['countedAt'] as String).toLocal();

                return ListTile(
                  leading: Icon(
                    cancelled ? Icons.cancel_outlined : Icons.check_circle_outline,
                    color: cancelled ? theme.colorScheme.outline : AppTheme.surplus,
                    size: 28,
                  ),
                  title: Text(
                    'Quantité ${_format((entry['quantity'] as num).toDouble())}',
                    style: theme.textTheme.titleMedium?.copyWith(
                      decoration: cancelled ? TextDecoration.lineThrough : null,
                      color: cancelled ? theme.colorScheme.outline : null,
                    ),
                  ),
                  subtitle: Text(
                    DateFormat('dd/MM/yyyy à HH:mm', 'fr_FR').format(countedAt),
                  ),
                  trailing: cancelled
                      ? Text(
                          'Annulé',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.outline,
                          ),
                        )
                      : null,
                );
              },
            );
          },
        ),
      ),
    );
  }

  static String _format(double value) {
    if (value == value.roundToDouble()) return value.toInt().toString();
    return value.toString().replaceAll('.', ',');
  }
}
