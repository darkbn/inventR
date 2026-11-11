import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../data/local/database.dart';

/// Saisie de la quantité comptée.
///
/// Pavé numérique intégré plutôt que le clavier système : les touches y sont
/// trois fois plus grandes, utilisables avec des gants de manutention, et la
/// disposition ne change pas d'un terminal à l'autre.
class CountEntrySheet extends ConsumerStatefulWidget {
  const CountEntrySheet({required this.item, super.key});

  final CachedItem item;

  @override
  ConsumerState<CountEntrySheet> createState() => _CountEntrySheetState();
}

class _CountEntrySheetState extends ConsumerState<CountEntrySheet> {
  String _input = '';
  bool _saving = false;

  double? get _quantity {
    if (_input.isEmpty) return null;
    return double.tryParse(_input.replaceAll(',', '.'));
  }

  void _press(String key) {
    unawaited(HapticFeedback.selectionClick());

    setState(() {
      switch (key) {
        case '⌫':
          if (_input.isNotEmpty) _input = _input.substring(0, _input.length - 1);
        case ',':
          // Une seule virgule, et jamais en première position.
          if (_input.isNotEmpty && !_input.contains(',')) _input += ',';
        default:
          // Garde-fou : au-delà, il s'agit presque sûrement d'une erreur de
          // frappe plutôt que d'un stock réel.
          if (_input.replaceAll(',', '').length < 9) _input += key;
      }
    });
  }

  Future<void> _save() async {
    final double? quantity = _quantity;
    if (quantity == null || quantity < 0) return;

    setState(() => _saving = true);

    try {
      await ref.read(syncRepositoryProvider).recordCount(
            item: widget.item,
            quantity: quantity,
          );

      if (!mounted) return;
      await HapticFeedback.mediumImpact();
      if (!mounted) return;
      Navigator.of(context).pop();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${widget.item.articleCode} : ${_format(quantity)} enregistré.',
          ),
          duration: const Duration(seconds: 2),
          backgroundColor: AppTheme.surplus,
        ),
      );
      return;
    } on Object catch (error) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Enregistrement impossible : $error')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final CachedItem item = widget.item;

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.outlineVariant,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Rappel de l'article : l'opérateur doit pouvoir vérifier qu'il
              // compte bien la bonne référence avant de saisir.
              Text(
                item.locationIsVirtual ? 'Sans emplacement' : item.locationCode,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 2),
              Text(item.articleCode, style: theme.textTheme.titleMedium),
              Text(
                item.designation,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),

              const SizedBox(height: 16),
              _Context(item: item),
              const SizedBox(height: 16),

              Container(
                height: 76,
                alignment: Alignment.centerRight,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: <Widget>[
                    Text(
                      _input.isEmpty ? '0' : _input,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontSize: 44,
                        fontWeight: FontWeight.w700,
                        color: _input.isEmpty
                            ? theme.colorScheme.onSurfaceVariant
                            : theme.colorScheme.onSurface,
                        fontFeatures: const <FontFeature>[
                          FontFeature.tabularFigures(),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(item.unit, style: theme.textTheme.titleMedium),
                  ],
                ),
              ),

              const SizedBox(height: 16),
              _Keypad(onPressed: _press),
              const SizedBox(height: 16),

              FilledButton.icon(
                // Verrouillé si l'opérateur a déjà compté cette ligne : le
                // serveur refuserait la saisie, autant le dire avant la frappe
                // plutôt qu'après.
                onPressed: (_quantity == null || _saving || item.countedByMe) ? null : _save,
                icon: _saving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.check, size: 26),
                label: const Text('Valider le comptage'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(64),
                  textStyle: const TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),

              const SizedBox(height: 8),
              Text(
                item.countedByMe
                    ? 'Cet article vous est déjà compté. Seul un superviseur '
                        'peut annuler votre saisie pour en permettre une nouvelle.'
                    : 'Le comptage est enregistré sur le terminal immédiatement, '
                        'puis transmis dès que le réseau le permet.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static String _format(double value) {
    if (value == value.roundToDouble()) return value.toInt().toString();
    return value.toString().replaceAll('.', ',');
  }
}

/// Informations de contexte.
///
/// La quantité théorique n'y figure plus, et le terminal ne la reçoit même
/// plus du serveur : la connaître avant de compter oriente la saisie vers une
/// confirmation du stock attendu plutôt que vers une observation.
///
/// Deux situations y sont signalées, parce qu'elles changent ce que
/// l'opérateur doit faire :
///
/// — **Ligne déjà comptée par lui.** La saisie est refusée. Avant, un second
///   scan ajoutait silencieusement sa quantité à la précédente ; c'est le
///   défaut relevé en recette.
///
/// — **Passage attendu au-delà du premier.** Un collègue est déjà passé. Sa
///   quantité n'est volontairement pas montrée : un comptage de contrôle qui
///   connaît le précédent n'en est plus un.
class _Context extends StatelessWidget {
  const _Context({required this.item});

  final CachedItem item;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    if (item.countedByMe) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppTheme.shortage.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.shortage.withValues(alpha: 0.4)),
        ),
        child: Row(
          children: <Widget>[
            const Icon(Icons.lock_outline, size: 22, color: AppTheme.shortage),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    'Article déjà compté : '
                    '${_CountEntrySheetState._format(item.myLastQuantity ?? 0)} '
                    '${item.unit}',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppTheme.shortage,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Une seconde saisie n’est pas autorisée. Signalez l’erreur '
                    'à votre superviseur : lui seul peut annuler le comptage.',
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    final int expected = item.expectedCountNumber ?? 1;

    if (expected <= 1) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: <Widget>[
            Icon(
              Icons.inventory_2_outlined,
              size: 20,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                item.isManual
                    ? 'Article ajouté sur le terrain, absent du fichier importé.'
                    : 'Comptez la quantité réellement présente à cet emplacement.',
                style: theme.textTheme.bodySmall,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.tertiaryContainer.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: <Widget>[
          Icon(Icons.repeat, size: 22, color: theme.colorScheme.tertiary),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  '${expected}e comptage',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: theme.colorScheme.tertiary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Cette ligne a déjà été comptée par un autre opérateur. '
                  'Comptez sans tenir compte du passage précédent : sa valeur '
                  'ne vous est pas montrée pour cette raison.',
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Pavé numérique. Touches de 64 px de haut, bien au-delà des 48 px
/// recommandés : l'objectif est une frappe fiable avec des gants.
class _Keypad extends StatelessWidget {
  const _Keypad({required this.onPressed});

  final void Function(String key) onPressed;

  static const List<List<String>> _keys = <List<String>>[
    <String>['1', '2', '3'],
    <String>['4', '5', '6'],
    <String>['7', '8', '9'],
    <String>[',', '0', '⌫'],
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      children: _keys
          .map(
            (List<String> row) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: row
                    .map(
                      (String key) => Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: _Key(label: key, onPressed: () => onPressed(key)),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
          )
          .toList(),
    );
  }
}

class _Key extends StatelessWidget {
  const _Key({required this.label, required this.onPressed});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final bool isBackspace = label == '⌫';

    return SizedBox(
      height: 64,
      child: Material(
        color: isBackspace
            ? theme.colorScheme.errorContainer
            : theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onPressed,
          child: Center(
            child: isBackspace
                ? Icon(
                    Icons.backspace_outlined,
                    size: 26,
                    color: theme.colorScheme.onErrorContainer,
                  )
                : Text(
                    label,
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontSize: 28,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}
