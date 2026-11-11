import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _login = TextEditingController();
  final TextEditingController _password = TextEditingController();
  final TextEditingController _server = TextEditingController();

  bool _obscure = true;
  bool _serverVisible = false;

  @override
  void initState() {
    super.initState();
    _restoreServerUrl();
  }

  /// L'adresse du serveur est préremplie avec la dernière utilisée : la
  /// ressaisir à chaque prise de poste serait une perte de temps.
  Future<void> _restoreServerUrl() async {
    final String? saved = await ref.read(tokenStoreProvider).readServerUrl();
    if (!mounted) return;
    _server.text = saved ?? ref.read(apiClientProvider).baseUrl;
  }

  @override
  void dispose() {
    _login.dispose();
    _password.dispose();
    _server.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    FocusScope.of(context).unfocus();

    final bool success = await ref.read(authControllerProvider.notifier).login(
          serverUrl: _server.text,
          login: _login.text,
          password: _password.text,
        );

    if (!success && mounted) {
      // Le mot de passe est effacé mais pas l'identifiant : une erreur de
      // frappe porte presque toujours sur le mot de passe.
      _password.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    final AuthState auth = ref.watch(authControllerProvider);
    final ThemeData theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    Icon(
                      Icons.inventory_2_outlined,
                      size: 64,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'InventAir',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Saisie d’inventaire en entrepôt',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 32),

                    if (auth.error != null) ...<Widget>[
                      _ErrorBanner(
                        message: auth.error!,
                        onDismiss: () => ref.read(authControllerProvider.notifier).clearError(),
                      ),
                      const SizedBox(height: 16),
                    ],

                    TextFormField(
                      controller: _login,
                      autocorrect: false,
                      enableSuggestions: false,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Identifiant',
                        hintText: 'k.benali',
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                      validator: (String? value) => (value == null || value.trim().isEmpty)
                          ? 'Saisissez votre identifiant.'
                          : null,
                    ),
                    const SizedBox(height: 16),

                    TextFormField(
                      controller: _password,
                      obscureText: _obscure,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => _submit(),
                      decoration: InputDecoration(
                        labelText: 'Mot de passe',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                          ),
                          tooltip: _obscure ? 'Afficher' : 'Masquer',
                          onPressed: () => setState(() => _obscure = !_obscure),
                        ),
                      ),
                      validator: (String? value) =>
                          (value == null || value.length < 8) ? 'Au moins 8 caractères.' : null,
                    ),
                    const SizedBox(height: 16),

                    // L'adresse du serveur est repliée par défaut : l'opérateur
                    // n'y touche jamais, l'encadrement parfois.
                    if (_serverVisible) ...<Widget>[
                      TextFormField(
                        controller: _server,
                        keyboardType: TextInputType.url,
                        autocorrect: false,
                        decoration: const InputDecoration(
                          labelText: 'Adresse du serveur',
                          hintText: '192.168.1.20:3000',
                          prefixIcon: Icon(Icons.dns_outlined),
                          helperText: 'Modifiable sans réinstaller l’application.',
                          helperMaxLines: 2,
                        ),
                        validator: (String? value) => (value == null || value.trim().isEmpty)
                            ? 'Saisissez l’adresse du serveur.'
                            : null,
                      ),
                      const SizedBox(height: 16),
                    ] else
                      Align(
                        alignment: Alignment.centerLeft,
                        child: TextButton.icon(
                          onPressed: () => setState(() => _serverVisible = true),
                          icon: const Icon(Icons.settings_outlined, size: 20),
                          label: Text('Serveur : ${_shortServer()}'),
                        ),
                      ),

                    const SizedBox(height: 8),
                    FilledButton.icon(
                      onPressed: auth.isLoading ? null : _submit,
                      icon: auth.isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.login),
                      label: Text(auth.isLoading ? 'Connexion…' : 'Se connecter'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _shortServer() {
    final String url = _server.text;
    if (url.isEmpty) return 'non défini';
    return url.replaceFirst(RegExp(r'^https?://'), '').replaceFirst('/api/v1', '');
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message, required this.onDismiss});

  final String message;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(Icons.error_outline, color: theme.colorScheme.onErrorContainer),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: TextStyle(color: theme.colorScheme.onErrorContainer),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 20),
            onPressed: onDismiss,
            tooltip: 'Fermer',
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }
}
