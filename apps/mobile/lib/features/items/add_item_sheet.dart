import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../data/local/database.dart';

/// Ajout d'un article absent du fichier importé.
///
/// Cas remonté du terrain : l'article est bien en rayon, mais il ne figure pas
/// dans l'extraction SAP. Sans cet écran, l'opérateur n'avait aucun moyen de le
/// déclarer et l'inventaire passait à côté d'un stock réel.
///
/// Sa quantité théorique est nulle par construction : tout ce qui sera compté
/// ressortira en surplus côté gestionnaire, ce qui est précisément le signal
/// attendu pour créer la fiche dans l'ERP.
class AddItemSheet extends ConsumerStatefulWidget {
  const AddItemSheet({required this.listId, super.key});

  final String listId;

  @override
  ConsumerState<AddItemSheet> createState() => _AddItemSheetState();
}

class _AddItemSheetState extends ConsumerState<AddItemSheet> {
  final TextEditingController _code = TextEditingController();
  final TextEditingController _designation = TextEditingController();
  final TextEditingController _location = TextEditingController();

  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _code.dispose();
    _designation.dispose();
    _location.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final String code = _code.text.trim().toUpperCase();
    if (code.isEmpty) {
      setState(() => _error = 'Le code article est obligatoire.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final CachedItem item = await ref.read(syncRepositoryProvider).addManualItem(
            listId: widget.listId,
            articleCode: code,
            designation: _designation.text,
            locationCode: _location.text,
          );

      if (!mounted) return;
      await HapticFeedback.mediumImpact();
      if (!mounted) return;

      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${item.articleCode} ajouté à la liste. Comptez-le maintenant.',
          ),
          duration: const Duration(seconds: 3),
        ),
      );
    } on Object catch (error) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        // Le message de l'API est explicite (article déjà présent, désignation
        // requise, campagne clôturée) : le relayer tel quel vaut mieux qu'un
        // « échec » générique devant un opérateur en rayon.
        _error = error.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
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

              Text(
                'Ajouter un article',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                'Pour un article trouvé en rayon mais absent de la liste.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),

              const SizedBox(height: 20),
              TextField(
                controller: _code,
                autofocus: true,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(
                  labelText: 'Code article',
                  hintText: 'ACCEL-0016',
                  border: OutlineInputBorder(),
                ),
                style: const TextStyle(fontSize: 18, letterSpacing: 0.5),
              ),

              const SizedBox(height: 14),
              TextField(
                controller: _designation,
                decoration: const InputDecoration(
                  labelText: 'Désignation',
                  helperText: 'Requise si le code est inconnu du référentiel.',
                  helperMaxLines: 2,
                  border: OutlineInputBorder(),
                ),
                style: const TextStyle(fontSize: 17),
              ),

              const SizedBox(height: 14),
              TextField(
                controller: _location,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(
                  labelText: 'Emplacement',
                  hintText: '1-1-C-7',
                  helperText: 'Vide : la ligne ira dans « Sans emplacement ».',
                  helperMaxLines: 2,
                  border: OutlineInputBorder(),
                ),
                style: const TextStyle(fontSize: 17),
              ),

              if (_error != null) ...<Widget>[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.errorContainer,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: <Widget>[
                      Icon(Icons.error_outline, color: theme.colorScheme.onErrorContainer),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _error!,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onErrorContainer,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: _saving ? null : _submit,
                icon: _saving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.add, size: 26),
                label: const Text('Ajouter à la liste'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(60),
                  textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
              ),

              const SizedBox(height: 10),
              Text(
                'Connexion réseau nécessaire : la ligne doit être créée sur le '
                'serveur pour pouvoir être comptée.',
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
}
