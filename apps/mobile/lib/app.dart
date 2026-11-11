import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/config/app_config.dart';
import 'core/providers.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/login_screen.dart';
import 'features/lists/lists_screen.dart';

class InventAirApp extends ConsumerWidget {
  const InventAirApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AuthState auth = ref.watch(authControllerProvider);

    return MaterialApp(
      title: AppConfig.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      // Le thème suit le réglage du terminal : certains entrepôts travaillent
      // de nuit, et le mode sombre y est nettement plus confortable.
      themeMode: ThemeMode.system,
      home: _resolveHome(auth),
    );
  }

  Widget _resolveHome(AuthState auth) {
    if (auth.initializing) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return auth.isAuthenticated ? const ListsScreen() : const LoginScreen();
  }
}
