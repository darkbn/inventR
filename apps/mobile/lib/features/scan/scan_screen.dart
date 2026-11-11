import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

/// Lecture d'un QR code article.
///
/// Renvoie le code article décodé via `Navigator.pop`, ou `null` si
/// l'utilisateur abandonne.
class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  final MobileScannerController _controller = MobileScannerController(
    formats: const <BarcodeFormat>[BarcodeFormat.qrCode, BarcodeFormat.code128],
    detectionSpeed: DetectionSpeed.noDuplicates,
  );

  bool _handled = false;
  bool _torchOn = false;

  @override
  void dispose() {
    unawaited(_controller.dispose());
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    // Un seul résultat traité : sans ce verrou, la caméra enchaîne les
    // détections et empile les écrans.
    if (_handled) return;

    for (final Barcode barcode in capture.barcodes) {
      final String? raw = barcode.rawValue;
      if (raw == null || raw.trim().isEmpty) continue;

      final String? code = decodeArticleCode(raw);
      if (code == null) continue;

      _handled = true;
      unawaited(HapticFeedback.mediumImpact());
      Navigator.of(context).pop(code);
      return;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Scanner un article'),
        actions: <Widget>[
          IconButton(
            icon: Icon(_torchOn ? Icons.flash_on : Icons.flash_off),
            tooltip: _torchOn ? 'Éteindre la lampe' : 'Allumer la lampe',
            onPressed: () async {
              await _controller.toggleTorch();
              if (mounted) setState(() => _torchOn = !_torchOn);
            },
          ),
        ],
      ),
      body: Stack(
        children: <Widget>[
          MobileScanner(controller: _controller, onDetect: _onDetect),
          const _ScanOverlay(),
          Positioned(
            left: 0,
            right: 0,
            bottom: 40,
            child: Column(
              children: <Widget>[
                const Text(
                  'Visez l’étiquette de l’article',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Les étiquettes fournisseur ne contenant que le code sont acceptées.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.75),
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Cadre de visée : une zone claire au centre sur fond assombri.
class _ScanOverlay extends StatelessWidget {
  const _ScanOverlay();

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Center(
        child: Container(
          width: 260,
          height: 260,
          decoration: BoxDecoration(
            border: Border.all(color: Colors.white, width: 3),
            borderRadius: BorderRadius.circular(20),
          ),
        ),
      ),
    );
  }
}

/// Décode la valeur lue.
///
/// Deux formes sont acceptées, en miroir de ce que produit le serveur :
///   - la charge structurée `{"t":"ART","c":"ACCEL-0016"}` ;
///   - le code brut, pour rester compatible avec les étiquettes fournisseur
///     déjà posées en rayon.
///
/// Un QR d'emplacement (`LOC`) est refusé ici : l'écran cherche un article.
String? decodeArticleCode(String raw) {
  final String text = raw.trim();
  if (text.isEmpty) return null;

  if (text.startsWith('{')) {
    try {
      final Object? decoded = jsonDecode(text);
      if (decoded is Map<String, dynamic>) {
        final Object? type = decoded['t'];
        final Object? code = decoded['c'];
        if (type == 'ART' && code is String && code.trim().isNotEmpty) {
          return code.trim().toUpperCase();
        }
      }
    } on FormatException {
      // Chaîne commençant par « { » sans être du JSON : on la refuse plutôt
      // que de la prendre pour un code article.
    }
    return null;
  }

  return text.toUpperCase();
}
