/// Modèles de données échangés avec l'API.
///
/// Écrits à la main plutôt que générés : la surface est réduite, et un
/// générateur ajouterait une étape de compilation pour peu de bénéfice.
library;

/// Profil de l'utilisateur connecté.
class UserProfile {
  const UserProfile({
    required this.id,
    required this.username,
    required this.fullName,
    required this.role,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
        id: json['id'] as String,
        username: json['username'] as String,
        fullName: json['fullName'] as String,
        role: json['role'] as String,
      );

  final String id;
  final String username;
  final String fullName;
  final String role;
}

/// Liste attribuée à l'opérateur, telle que renvoyée par `/my/lists`.
class AssignedList {
  const AssignedList({
    required this.id,
    required this.code,
    required this.name,
    required this.status,
    required this.campaignId,
    required this.campaignCode,
    required this.campaignName,
    required this.campaignStatus,
    required this.methodCode,
    required this.totalItems,
    required this.countedItems,
  });

  factory AssignedList.fromJson(Map<String, dynamic> json) => AssignedList(
        id: json['id'] as String,
        code: json['code'] as String,
        name: json['name'] as String,
        status: json['status'] as String,
        campaignId: json['campaignId'] as String,
        campaignCode: json['campaignCode'] as String,
        campaignName: json['campaignName'] as String,
        campaignStatus: json['campaignStatus'] as String,
        methodCode: json['methodCode'] as String,
        totalItems: json['totalItems'] as int,
        countedItems: json['countedItems'] as int,
      );

  final String id;
  final String code;
  final String name;
  final String status;
  final String campaignId;
  final String campaignCode;
  final String campaignName;
  final String campaignStatus;
  final String methodCode;
  final int totalItems;
  final int countedItems;

  int get remainingItems => totalItems - countedItems < 0 ? 0 : totalItems - countedItems;

  double get progress => totalItems == 0 ? 0 : countedItems / totalItems;
}

/// Ligne d'inventaire renvoyée par l'API.
class RemoteItem {
  const RemoteItem({
    required this.id,
    required this.listId,
    required this.articleCode,
    required this.designation,
    required this.unit,
    required this.brand,
    required this.manufacturerRef,
    required this.locationCode,
    required this.locationIsVirtual,
    required this.finalQty,
    required this.status,
    required this.countCount,
    required this.countedByMe,
    required this.myLastQuantity,
    required this.expectedCountNumber,
    required this.isManual,
  });

  factory RemoteItem.fromJson(Map<String, dynamic> json) {
    final Map<String, dynamic> article = json['article'] as Map<String, dynamic>;
    final Map<String, dynamic> location = json['location'] as Map<String, dynamic>;

    return RemoteItem(
      id: json['id'] as String,
      listId: json['listId'] as String,
      articleCode: article['code'] as String,
      designation: article['designation'] as String,
      unit: article['unit'] as String? ?? 'Unité',
      brand: article['brand'] as String?,
      manufacturerRef: article['manufacturerRef'] as String?,
      locationCode: location['code'] as String,
      locationIsVirtual: location['isVirtual'] as bool? ?? false,
      // `theoreticalQty` et `finalQty` sont nuls dans les réponses faites à un
      // opérateur : l'API les retire. On ne les lit donc pas.
      finalQty: (json['finalQty'] as num?)?.toDouble(),
      status: json['status'] as String,
      countCount: json['countCount'] as int? ?? 0,
      countedByMe: json['countedByMe'] as bool? ?? false,
      myLastQuantity: (json['myLastQuantity'] as num?)?.toDouble(),
      expectedCountNumber: json['expectedCountNumber'] as int?,
      isManual: json['isManual'] as bool? ?? false,
    );
  }

  final String id;
  final String listId;
  final String articleCode;
  final String designation;
  final String unit;
  final String? brand;
  final String? manufacturerRef;
  final String locationCode;
  final bool locationIsVirtual;
  final double? finalQty;
  final String status;
  final int countCount;
  final bool countedByMe;
  final double? myLastQuantity;

  /// Rang du prochain comptage attendu, `null` si la ligne est résolue.
  final int? expectedCountNumber;

  /// Ligne ajoutée sur le terrain, absente du fichier importé.
  final bool isManual;
}

/// Résultat d'une synchronisation, ligne par ligne.
class SyncOutcome {
  const SyncOutcome({
    required this.clientUuid,
    required this.outcome,
    required this.reason,
  });

  factory SyncOutcome.fromJson(Map<String, dynamic> json) => SyncOutcome(
        clientUuid: json['clientUuid'] as String,
        outcome: json['outcome'] as String,
        reason: json['reason'] as String?,
      );

  final String clientUuid;

  /// `created`, `duplicate` ou `rejected`.
  final String outcome;
  final String? reason;

  /// Le serveur connaît désormais ce comptage : la file locale peut l'oublier.
  bool get isAcknowledged => outcome == 'created' || outcome == 'duplicate';
}
