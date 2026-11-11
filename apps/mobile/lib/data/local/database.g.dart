// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'database.dart';

// ignore_for_file: type=lint
class $CachedItemsTable extends CachedItems
    with TableInfo<$CachedItemsTable, CachedItem> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CachedItemsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _listIdMeta = const VerificationMeta('listId');
  @override
  late final GeneratedColumn<String> listId = GeneratedColumn<String>(
      'list_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _articleCodeMeta =
      const VerificationMeta('articleCode');
  @override
  late final GeneratedColumn<String> articleCode = GeneratedColumn<String>(
      'article_code', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _designationMeta =
      const VerificationMeta('designation');
  @override
  late final GeneratedColumn<String> designation = GeneratedColumn<String>(
      'designation', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _unitMeta = const VerificationMeta('unit');
  @override
  late final GeneratedColumn<String> unit = GeneratedColumn<String>(
      'unit', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('Unité'));
  static const VerificationMeta _brandMeta = const VerificationMeta('brand');
  @override
  late final GeneratedColumn<String> brand = GeneratedColumn<String>(
      'brand', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _manufacturerRefMeta =
      const VerificationMeta('manufacturerRef');
  @override
  late final GeneratedColumn<String> manufacturerRef = GeneratedColumn<String>(
      'manufacturer_ref', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _locationCodeMeta =
      const VerificationMeta('locationCode');
  @override
  late final GeneratedColumn<String> locationCode = GeneratedColumn<String>(
      'location_code', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _locationIsVirtualMeta =
      const VerificationMeta('locationIsVirtual');
  @override
  late final GeneratedColumn<bool> locationIsVirtual = GeneratedColumn<bool>(
      'location_is_virtual', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("location_is_virtual" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _aisleMeta = const VerificationMeta('aisle');
  @override
  late final GeneratedColumn<int> aisle = GeneratedColumn<int>(
      'aisle', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _bayMeta = const VerificationMeta('bay');
  @override
  late final GeneratedColumn<int> bay = GeneratedColumn<int>(
      'bay', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _levelMeta = const VerificationMeta('level');
  @override
  late final GeneratedColumn<String> level = GeneratedColumn<String>(
      'level', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _slotMeta = const VerificationMeta('slot');
  @override
  late final GeneratedColumn<int> slot = GeneratedColumn<int>(
      'slot', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _finalQtyMeta =
      const VerificationMeta('finalQty');
  @override
  late final GeneratedColumn<double> finalQty = GeneratedColumn<double>(
      'final_qty', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _expectedCountNumberMeta =
      const VerificationMeta('expectedCountNumber');
  @override
  late final GeneratedColumn<int> expectedCountNumber = GeneratedColumn<int>(
      'expected_count_number', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _isManualMeta =
      const VerificationMeta('isManual');
  @override
  late final GeneratedColumn<bool> isManual = GeneratedColumn<bool>(
      'is_manual', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_manual" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _countedByMeMeta =
      const VerificationMeta('countedByMe');
  @override
  late final GeneratedColumn<bool> countedByMe = GeneratedColumn<bool>(
      'counted_by_me', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("counted_by_me" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _myLastQuantityMeta =
      const VerificationMeta('myLastQuantity');
  @override
  late final GeneratedColumn<double> myLastQuantity = GeneratedColumn<double>(
      'my_last_quantity', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _countCountMeta =
      const VerificationMeta('countCount');
  @override
  late final GeneratedColumn<int> countCount = GeneratedColumn<int>(
      'count_count', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _searchTextMeta =
      const VerificationMeta('searchText');
  @override
  late final GeneratedColumn<String> searchText = GeneratedColumn<String>(
      'search_text', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        listId,
        articleCode,
        designation,
        unit,
        brand,
        manufacturerRef,
        locationCode,
        locationIsVirtual,
        aisle,
        bay,
        level,
        slot,
        finalQty,
        status,
        expectedCountNumber,
        isManual,
        countedByMe,
        myLastQuantity,
        countCount,
        searchText
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cached_items';
  @override
  VerificationContext validateIntegrity(Insertable<CachedItem> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('list_id')) {
      context.handle(_listIdMeta,
          listId.isAcceptableOrUnknown(data['list_id']!, _listIdMeta));
    } else if (isInserting) {
      context.missing(_listIdMeta);
    }
    if (data.containsKey('article_code')) {
      context.handle(
          _articleCodeMeta,
          articleCode.isAcceptableOrUnknown(
              data['article_code']!, _articleCodeMeta));
    } else if (isInserting) {
      context.missing(_articleCodeMeta);
    }
    if (data.containsKey('designation')) {
      context.handle(
          _designationMeta,
          designation.isAcceptableOrUnknown(
              data['designation']!, _designationMeta));
    } else if (isInserting) {
      context.missing(_designationMeta);
    }
    if (data.containsKey('unit')) {
      context.handle(
          _unitMeta, unit.isAcceptableOrUnknown(data['unit']!, _unitMeta));
    }
    if (data.containsKey('brand')) {
      context.handle(
          _brandMeta, brand.isAcceptableOrUnknown(data['brand']!, _brandMeta));
    }
    if (data.containsKey('manufacturer_ref')) {
      context.handle(
          _manufacturerRefMeta,
          manufacturerRef.isAcceptableOrUnknown(
              data['manufacturer_ref']!, _manufacturerRefMeta));
    }
    if (data.containsKey('location_code')) {
      context.handle(
          _locationCodeMeta,
          locationCode.isAcceptableOrUnknown(
              data['location_code']!, _locationCodeMeta));
    } else if (isInserting) {
      context.missing(_locationCodeMeta);
    }
    if (data.containsKey('location_is_virtual')) {
      context.handle(
          _locationIsVirtualMeta,
          locationIsVirtual.isAcceptableOrUnknown(
              data['location_is_virtual']!, _locationIsVirtualMeta));
    }
    if (data.containsKey('aisle')) {
      context.handle(
          _aisleMeta, aisle.isAcceptableOrUnknown(data['aisle']!, _aisleMeta));
    }
    if (data.containsKey('bay')) {
      context.handle(
          _bayMeta, bay.isAcceptableOrUnknown(data['bay']!, _bayMeta));
    }
    if (data.containsKey('level')) {
      context.handle(
          _levelMeta, level.isAcceptableOrUnknown(data['level']!, _levelMeta));
    }
    if (data.containsKey('slot')) {
      context.handle(
          _slotMeta, slot.isAcceptableOrUnknown(data['slot']!, _slotMeta));
    }
    if (data.containsKey('final_qty')) {
      context.handle(_finalQtyMeta,
          finalQty.isAcceptableOrUnknown(data['final_qty']!, _finalQtyMeta));
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    } else if (isInserting) {
      context.missing(_statusMeta);
    }
    if (data.containsKey('expected_count_number')) {
      context.handle(
          _expectedCountNumberMeta,
          expectedCountNumber.isAcceptableOrUnknown(
              data['expected_count_number']!, _expectedCountNumberMeta));
    }
    if (data.containsKey('is_manual')) {
      context.handle(_isManualMeta,
          isManual.isAcceptableOrUnknown(data['is_manual']!, _isManualMeta));
    }
    if (data.containsKey('counted_by_me')) {
      context.handle(
          _countedByMeMeta,
          countedByMe.isAcceptableOrUnknown(
              data['counted_by_me']!, _countedByMeMeta));
    }
    if (data.containsKey('my_last_quantity')) {
      context.handle(
          _myLastQuantityMeta,
          myLastQuantity.isAcceptableOrUnknown(
              data['my_last_quantity']!, _myLastQuantityMeta));
    }
    if (data.containsKey('count_count')) {
      context.handle(
          _countCountMeta,
          countCount.isAcceptableOrUnknown(
              data['count_count']!, _countCountMeta));
    }
    if (data.containsKey('search_text')) {
      context.handle(
          _searchTextMeta,
          searchText.isAcceptableOrUnknown(
              data['search_text']!, _searchTextMeta));
    } else if (isInserting) {
      context.missing(_searchTextMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CachedItem map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CachedItem(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      listId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}list_id'])!,
      articleCode: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}article_code'])!,
      designation: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}designation'])!,
      unit: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}unit'])!,
      brand: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}brand']),
      manufacturerRef: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}manufacturer_ref']),
      locationCode: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}location_code'])!,
      locationIsVirtual: attachedDatabase.typeMapping.read(
          DriftSqlType.bool, data['${effectivePrefix}location_is_virtual'])!,
      aisle: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}aisle']),
      bay: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}bay']),
      level: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}level']),
      slot: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}slot']),
      finalQty: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}final_qty']),
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      expectedCountNumber: attachedDatabase.typeMapping.read(
          DriftSqlType.int, data['${effectivePrefix}expected_count_number']),
      isManual: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_manual'])!,
      countedByMe: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}counted_by_me'])!,
      myLastQuantity: attachedDatabase.typeMapping.read(
          DriftSqlType.double, data['${effectivePrefix}my_last_quantity']),
      countCount: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}count_count'])!,
      searchText: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}search_text'])!,
    );
  }

  @override
  $CachedItemsTable createAlias(String alias) {
    return $CachedItemsTable(attachedDatabase, alias);
  }
}

class CachedItem extends DataClass implements Insertable<CachedItem> {
  final String id;
  final String listId;
  final String articleCode;
  final String designation;
  final String unit;
  final String? brand;
  final String? manufacturerRef;
  final String locationCode;
  final bool locationIsVirtual;

  /// Décomposition de l'emplacement, recopiée du serveur : elle permet le tri
  /// physique (allée, travée, niveau, case) en ordre numérique.
  final int? aisle;
  final int? bay;
  final String? level;
  final int? slot;

  /// La quantité théorique n'est **pas** stockée : le serveur ne la transmet
  /// plus à un opérateur. La conserver ici, même sans l'afficher, suffirait à
  /// la faire ressortir d'une sauvegarde ou d'un terminal égaré.
  final double? finalQty;
  final String status;

  /// Rang du prochain comptage attendu (Méthode 3). Permet d'annoncer
  /// « 2e comptage » à l'opérateur au lieu de le laisser deviner pourquoi une
  /// ligne déjà traitée lui revient.
  final int? expectedCountNumber;

  /// Ligne ajoutée sur le terrain, absente du fichier importé.
  final bool isManual;

  /// Vrai si l'utilisateur courant a déjà compté cette ligne.
  final bool countedByMe;
  final double? myLastQuantity;
  final int countCount;

  /// Forme sans accents et en majuscules, pour une recherche insensible.
  final String searchText;
  const CachedItem(
      {required this.id,
      required this.listId,
      required this.articleCode,
      required this.designation,
      required this.unit,
      this.brand,
      this.manufacturerRef,
      required this.locationCode,
      required this.locationIsVirtual,
      this.aisle,
      this.bay,
      this.level,
      this.slot,
      this.finalQty,
      required this.status,
      this.expectedCountNumber,
      required this.isManual,
      required this.countedByMe,
      this.myLastQuantity,
      required this.countCount,
      required this.searchText});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['list_id'] = Variable<String>(listId);
    map['article_code'] = Variable<String>(articleCode);
    map['designation'] = Variable<String>(designation);
    map['unit'] = Variable<String>(unit);
    if (!nullToAbsent || brand != null) {
      map['brand'] = Variable<String>(brand);
    }
    if (!nullToAbsent || manufacturerRef != null) {
      map['manufacturer_ref'] = Variable<String>(manufacturerRef);
    }
    map['location_code'] = Variable<String>(locationCode);
    map['location_is_virtual'] = Variable<bool>(locationIsVirtual);
    if (!nullToAbsent || aisle != null) {
      map['aisle'] = Variable<int>(aisle);
    }
    if (!nullToAbsent || bay != null) {
      map['bay'] = Variable<int>(bay);
    }
    if (!nullToAbsent || level != null) {
      map['level'] = Variable<String>(level);
    }
    if (!nullToAbsent || slot != null) {
      map['slot'] = Variable<int>(slot);
    }
    if (!nullToAbsent || finalQty != null) {
      map['final_qty'] = Variable<double>(finalQty);
    }
    map['status'] = Variable<String>(status);
    if (!nullToAbsent || expectedCountNumber != null) {
      map['expected_count_number'] = Variable<int>(expectedCountNumber);
    }
    map['is_manual'] = Variable<bool>(isManual);
    map['counted_by_me'] = Variable<bool>(countedByMe);
    if (!nullToAbsent || myLastQuantity != null) {
      map['my_last_quantity'] = Variable<double>(myLastQuantity);
    }
    map['count_count'] = Variable<int>(countCount);
    map['search_text'] = Variable<String>(searchText);
    return map;
  }

  CachedItemsCompanion toCompanion(bool nullToAbsent) {
    return CachedItemsCompanion(
      id: Value(id),
      listId: Value(listId),
      articleCode: Value(articleCode),
      designation: Value(designation),
      unit: Value(unit),
      brand:
          brand == null && nullToAbsent ? const Value.absent() : Value(brand),
      manufacturerRef: manufacturerRef == null && nullToAbsent
          ? const Value.absent()
          : Value(manufacturerRef),
      locationCode: Value(locationCode),
      locationIsVirtual: Value(locationIsVirtual),
      aisle:
          aisle == null && nullToAbsent ? const Value.absent() : Value(aisle),
      bay: bay == null && nullToAbsent ? const Value.absent() : Value(bay),
      level:
          level == null && nullToAbsent ? const Value.absent() : Value(level),
      slot: slot == null && nullToAbsent ? const Value.absent() : Value(slot),
      finalQty: finalQty == null && nullToAbsent
          ? const Value.absent()
          : Value(finalQty),
      status: Value(status),
      expectedCountNumber: expectedCountNumber == null && nullToAbsent
          ? const Value.absent()
          : Value(expectedCountNumber),
      isManual: Value(isManual),
      countedByMe: Value(countedByMe),
      myLastQuantity: myLastQuantity == null && nullToAbsent
          ? const Value.absent()
          : Value(myLastQuantity),
      countCount: Value(countCount),
      searchText: Value(searchText),
    );
  }

  factory CachedItem.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CachedItem(
      id: serializer.fromJson<String>(json['id']),
      listId: serializer.fromJson<String>(json['listId']),
      articleCode: serializer.fromJson<String>(json['articleCode']),
      designation: serializer.fromJson<String>(json['designation']),
      unit: serializer.fromJson<String>(json['unit']),
      brand: serializer.fromJson<String?>(json['brand']),
      manufacturerRef: serializer.fromJson<String?>(json['manufacturerRef']),
      locationCode: serializer.fromJson<String>(json['locationCode']),
      locationIsVirtual: serializer.fromJson<bool>(json['locationIsVirtual']),
      aisle: serializer.fromJson<int?>(json['aisle']),
      bay: serializer.fromJson<int?>(json['bay']),
      level: serializer.fromJson<String?>(json['level']),
      slot: serializer.fromJson<int?>(json['slot']),
      finalQty: serializer.fromJson<double?>(json['finalQty']),
      status: serializer.fromJson<String>(json['status']),
      expectedCountNumber:
          serializer.fromJson<int?>(json['expectedCountNumber']),
      isManual: serializer.fromJson<bool>(json['isManual']),
      countedByMe: serializer.fromJson<bool>(json['countedByMe']),
      myLastQuantity: serializer.fromJson<double?>(json['myLastQuantity']),
      countCount: serializer.fromJson<int>(json['countCount']),
      searchText: serializer.fromJson<String>(json['searchText']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'listId': serializer.toJson<String>(listId),
      'articleCode': serializer.toJson<String>(articleCode),
      'designation': serializer.toJson<String>(designation),
      'unit': serializer.toJson<String>(unit),
      'brand': serializer.toJson<String?>(brand),
      'manufacturerRef': serializer.toJson<String?>(manufacturerRef),
      'locationCode': serializer.toJson<String>(locationCode),
      'locationIsVirtual': serializer.toJson<bool>(locationIsVirtual),
      'aisle': serializer.toJson<int?>(aisle),
      'bay': serializer.toJson<int?>(bay),
      'level': serializer.toJson<String?>(level),
      'slot': serializer.toJson<int?>(slot),
      'finalQty': serializer.toJson<double?>(finalQty),
      'status': serializer.toJson<String>(status),
      'expectedCountNumber': serializer.toJson<int?>(expectedCountNumber),
      'isManual': serializer.toJson<bool>(isManual),
      'countedByMe': serializer.toJson<bool>(countedByMe),
      'myLastQuantity': serializer.toJson<double?>(myLastQuantity),
      'countCount': serializer.toJson<int>(countCount),
      'searchText': serializer.toJson<String>(searchText),
    };
  }

  CachedItem copyWith(
          {String? id,
          String? listId,
          String? articleCode,
          String? designation,
          String? unit,
          Value<String?> brand = const Value.absent(),
          Value<String?> manufacturerRef = const Value.absent(),
          String? locationCode,
          bool? locationIsVirtual,
          Value<int?> aisle = const Value.absent(),
          Value<int?> bay = const Value.absent(),
          Value<String?> level = const Value.absent(),
          Value<int?> slot = const Value.absent(),
          Value<double?> finalQty = const Value.absent(),
          String? status,
          Value<int?> expectedCountNumber = const Value.absent(),
          bool? isManual,
          bool? countedByMe,
          Value<double?> myLastQuantity = const Value.absent(),
          int? countCount,
          String? searchText}) =>
      CachedItem(
        id: id ?? this.id,
        listId: listId ?? this.listId,
        articleCode: articleCode ?? this.articleCode,
        designation: designation ?? this.designation,
        unit: unit ?? this.unit,
        brand: brand.present ? brand.value : this.brand,
        manufacturerRef: manufacturerRef.present
            ? manufacturerRef.value
            : this.manufacturerRef,
        locationCode: locationCode ?? this.locationCode,
        locationIsVirtual: locationIsVirtual ?? this.locationIsVirtual,
        aisle: aisle.present ? aisle.value : this.aisle,
        bay: bay.present ? bay.value : this.bay,
        level: level.present ? level.value : this.level,
        slot: slot.present ? slot.value : this.slot,
        finalQty: finalQty.present ? finalQty.value : this.finalQty,
        status: status ?? this.status,
        expectedCountNumber: expectedCountNumber.present
            ? expectedCountNumber.value
            : this.expectedCountNumber,
        isManual: isManual ?? this.isManual,
        countedByMe: countedByMe ?? this.countedByMe,
        myLastQuantity:
            myLastQuantity.present ? myLastQuantity.value : this.myLastQuantity,
        countCount: countCount ?? this.countCount,
        searchText: searchText ?? this.searchText,
      );
  CachedItem copyWithCompanion(CachedItemsCompanion data) {
    return CachedItem(
      id: data.id.present ? data.id.value : this.id,
      listId: data.listId.present ? data.listId.value : this.listId,
      articleCode:
          data.articleCode.present ? data.articleCode.value : this.articleCode,
      designation:
          data.designation.present ? data.designation.value : this.designation,
      unit: data.unit.present ? data.unit.value : this.unit,
      brand: data.brand.present ? data.brand.value : this.brand,
      manufacturerRef: data.manufacturerRef.present
          ? data.manufacturerRef.value
          : this.manufacturerRef,
      locationCode: data.locationCode.present
          ? data.locationCode.value
          : this.locationCode,
      locationIsVirtual: data.locationIsVirtual.present
          ? data.locationIsVirtual.value
          : this.locationIsVirtual,
      aisle: data.aisle.present ? data.aisle.value : this.aisle,
      bay: data.bay.present ? data.bay.value : this.bay,
      level: data.level.present ? data.level.value : this.level,
      slot: data.slot.present ? data.slot.value : this.slot,
      finalQty: data.finalQty.present ? data.finalQty.value : this.finalQty,
      status: data.status.present ? data.status.value : this.status,
      expectedCountNumber: data.expectedCountNumber.present
          ? data.expectedCountNumber.value
          : this.expectedCountNumber,
      isManual: data.isManual.present ? data.isManual.value : this.isManual,
      countedByMe:
          data.countedByMe.present ? data.countedByMe.value : this.countedByMe,
      myLastQuantity: data.myLastQuantity.present
          ? data.myLastQuantity.value
          : this.myLastQuantity,
      countCount:
          data.countCount.present ? data.countCount.value : this.countCount,
      searchText:
          data.searchText.present ? data.searchText.value : this.searchText,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CachedItem(')
          ..write('id: $id, ')
          ..write('listId: $listId, ')
          ..write('articleCode: $articleCode, ')
          ..write('designation: $designation, ')
          ..write('unit: $unit, ')
          ..write('brand: $brand, ')
          ..write('manufacturerRef: $manufacturerRef, ')
          ..write('locationCode: $locationCode, ')
          ..write('locationIsVirtual: $locationIsVirtual, ')
          ..write('aisle: $aisle, ')
          ..write('bay: $bay, ')
          ..write('level: $level, ')
          ..write('slot: $slot, ')
          ..write('finalQty: $finalQty, ')
          ..write('status: $status, ')
          ..write('expectedCountNumber: $expectedCountNumber, ')
          ..write('isManual: $isManual, ')
          ..write('countedByMe: $countedByMe, ')
          ..write('myLastQuantity: $myLastQuantity, ')
          ..write('countCount: $countCount, ')
          ..write('searchText: $searchText')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hashAll([
        id,
        listId,
        articleCode,
        designation,
        unit,
        brand,
        manufacturerRef,
        locationCode,
        locationIsVirtual,
        aisle,
        bay,
        level,
        slot,
        finalQty,
        status,
        expectedCountNumber,
        isManual,
        countedByMe,
        myLastQuantity,
        countCount,
        searchText
      ]);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CachedItem &&
          other.id == this.id &&
          other.listId == this.listId &&
          other.articleCode == this.articleCode &&
          other.designation == this.designation &&
          other.unit == this.unit &&
          other.brand == this.brand &&
          other.manufacturerRef == this.manufacturerRef &&
          other.locationCode == this.locationCode &&
          other.locationIsVirtual == this.locationIsVirtual &&
          other.aisle == this.aisle &&
          other.bay == this.bay &&
          other.level == this.level &&
          other.slot == this.slot &&
          other.finalQty == this.finalQty &&
          other.status == this.status &&
          other.expectedCountNumber == this.expectedCountNumber &&
          other.isManual == this.isManual &&
          other.countedByMe == this.countedByMe &&
          other.myLastQuantity == this.myLastQuantity &&
          other.countCount == this.countCount &&
          other.searchText == this.searchText);
}

class CachedItemsCompanion extends UpdateCompanion<CachedItem> {
  final Value<String> id;
  final Value<String> listId;
  final Value<String> articleCode;
  final Value<String> designation;
  final Value<String> unit;
  final Value<String?> brand;
  final Value<String?> manufacturerRef;
  final Value<String> locationCode;
  final Value<bool> locationIsVirtual;
  final Value<int?> aisle;
  final Value<int?> bay;
  final Value<String?> level;
  final Value<int?> slot;
  final Value<double?> finalQty;
  final Value<String> status;
  final Value<int?> expectedCountNumber;
  final Value<bool> isManual;
  final Value<bool> countedByMe;
  final Value<double?> myLastQuantity;
  final Value<int> countCount;
  final Value<String> searchText;
  final Value<int> rowid;
  const CachedItemsCompanion({
    this.id = const Value.absent(),
    this.listId = const Value.absent(),
    this.articleCode = const Value.absent(),
    this.designation = const Value.absent(),
    this.unit = const Value.absent(),
    this.brand = const Value.absent(),
    this.manufacturerRef = const Value.absent(),
    this.locationCode = const Value.absent(),
    this.locationIsVirtual = const Value.absent(),
    this.aisle = const Value.absent(),
    this.bay = const Value.absent(),
    this.level = const Value.absent(),
    this.slot = const Value.absent(),
    this.finalQty = const Value.absent(),
    this.status = const Value.absent(),
    this.expectedCountNumber = const Value.absent(),
    this.isManual = const Value.absent(),
    this.countedByMe = const Value.absent(),
    this.myLastQuantity = const Value.absent(),
    this.countCount = const Value.absent(),
    this.searchText = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CachedItemsCompanion.insert({
    required String id,
    required String listId,
    required String articleCode,
    required String designation,
    this.unit = const Value.absent(),
    this.brand = const Value.absent(),
    this.manufacturerRef = const Value.absent(),
    required String locationCode,
    this.locationIsVirtual = const Value.absent(),
    this.aisle = const Value.absent(),
    this.bay = const Value.absent(),
    this.level = const Value.absent(),
    this.slot = const Value.absent(),
    this.finalQty = const Value.absent(),
    required String status,
    this.expectedCountNumber = const Value.absent(),
    this.isManual = const Value.absent(),
    this.countedByMe = const Value.absent(),
    this.myLastQuantity = const Value.absent(),
    this.countCount = const Value.absent(),
    required String searchText,
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        listId = Value(listId),
        articleCode = Value(articleCode),
        designation = Value(designation),
        locationCode = Value(locationCode),
        status = Value(status),
        searchText = Value(searchText);
  static Insertable<CachedItem> custom({
    Expression<String>? id,
    Expression<String>? listId,
    Expression<String>? articleCode,
    Expression<String>? designation,
    Expression<String>? unit,
    Expression<String>? brand,
    Expression<String>? manufacturerRef,
    Expression<String>? locationCode,
    Expression<bool>? locationIsVirtual,
    Expression<int>? aisle,
    Expression<int>? bay,
    Expression<String>? level,
    Expression<int>? slot,
    Expression<double>? finalQty,
    Expression<String>? status,
    Expression<int>? expectedCountNumber,
    Expression<bool>? isManual,
    Expression<bool>? countedByMe,
    Expression<double>? myLastQuantity,
    Expression<int>? countCount,
    Expression<String>? searchText,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (listId != null) 'list_id': listId,
      if (articleCode != null) 'article_code': articleCode,
      if (designation != null) 'designation': designation,
      if (unit != null) 'unit': unit,
      if (brand != null) 'brand': brand,
      if (manufacturerRef != null) 'manufacturer_ref': manufacturerRef,
      if (locationCode != null) 'location_code': locationCode,
      if (locationIsVirtual != null) 'location_is_virtual': locationIsVirtual,
      if (aisle != null) 'aisle': aisle,
      if (bay != null) 'bay': bay,
      if (level != null) 'level': level,
      if (slot != null) 'slot': slot,
      if (finalQty != null) 'final_qty': finalQty,
      if (status != null) 'status': status,
      if (expectedCountNumber != null)
        'expected_count_number': expectedCountNumber,
      if (isManual != null) 'is_manual': isManual,
      if (countedByMe != null) 'counted_by_me': countedByMe,
      if (myLastQuantity != null) 'my_last_quantity': myLastQuantity,
      if (countCount != null) 'count_count': countCount,
      if (searchText != null) 'search_text': searchText,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CachedItemsCompanion copyWith(
      {Value<String>? id,
      Value<String>? listId,
      Value<String>? articleCode,
      Value<String>? designation,
      Value<String>? unit,
      Value<String?>? brand,
      Value<String?>? manufacturerRef,
      Value<String>? locationCode,
      Value<bool>? locationIsVirtual,
      Value<int?>? aisle,
      Value<int?>? bay,
      Value<String?>? level,
      Value<int?>? slot,
      Value<double?>? finalQty,
      Value<String>? status,
      Value<int?>? expectedCountNumber,
      Value<bool>? isManual,
      Value<bool>? countedByMe,
      Value<double?>? myLastQuantity,
      Value<int>? countCount,
      Value<String>? searchText,
      Value<int>? rowid}) {
    return CachedItemsCompanion(
      id: id ?? this.id,
      listId: listId ?? this.listId,
      articleCode: articleCode ?? this.articleCode,
      designation: designation ?? this.designation,
      unit: unit ?? this.unit,
      brand: brand ?? this.brand,
      manufacturerRef: manufacturerRef ?? this.manufacturerRef,
      locationCode: locationCode ?? this.locationCode,
      locationIsVirtual: locationIsVirtual ?? this.locationIsVirtual,
      aisle: aisle ?? this.aisle,
      bay: bay ?? this.bay,
      level: level ?? this.level,
      slot: slot ?? this.slot,
      finalQty: finalQty ?? this.finalQty,
      status: status ?? this.status,
      expectedCountNumber: expectedCountNumber ?? this.expectedCountNumber,
      isManual: isManual ?? this.isManual,
      countedByMe: countedByMe ?? this.countedByMe,
      myLastQuantity: myLastQuantity ?? this.myLastQuantity,
      countCount: countCount ?? this.countCount,
      searchText: searchText ?? this.searchText,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (listId.present) {
      map['list_id'] = Variable<String>(listId.value);
    }
    if (articleCode.present) {
      map['article_code'] = Variable<String>(articleCode.value);
    }
    if (designation.present) {
      map['designation'] = Variable<String>(designation.value);
    }
    if (unit.present) {
      map['unit'] = Variable<String>(unit.value);
    }
    if (brand.present) {
      map['brand'] = Variable<String>(brand.value);
    }
    if (manufacturerRef.present) {
      map['manufacturer_ref'] = Variable<String>(manufacturerRef.value);
    }
    if (locationCode.present) {
      map['location_code'] = Variable<String>(locationCode.value);
    }
    if (locationIsVirtual.present) {
      map['location_is_virtual'] = Variable<bool>(locationIsVirtual.value);
    }
    if (aisle.present) {
      map['aisle'] = Variable<int>(aisle.value);
    }
    if (bay.present) {
      map['bay'] = Variable<int>(bay.value);
    }
    if (level.present) {
      map['level'] = Variable<String>(level.value);
    }
    if (slot.present) {
      map['slot'] = Variable<int>(slot.value);
    }
    if (finalQty.present) {
      map['final_qty'] = Variable<double>(finalQty.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (expectedCountNumber.present) {
      map['expected_count_number'] = Variable<int>(expectedCountNumber.value);
    }
    if (isManual.present) {
      map['is_manual'] = Variable<bool>(isManual.value);
    }
    if (countedByMe.present) {
      map['counted_by_me'] = Variable<bool>(countedByMe.value);
    }
    if (myLastQuantity.present) {
      map['my_last_quantity'] = Variable<double>(myLastQuantity.value);
    }
    if (countCount.present) {
      map['count_count'] = Variable<int>(countCount.value);
    }
    if (searchText.present) {
      map['search_text'] = Variable<String>(searchText.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CachedItemsCompanion(')
          ..write('id: $id, ')
          ..write('listId: $listId, ')
          ..write('articleCode: $articleCode, ')
          ..write('designation: $designation, ')
          ..write('unit: $unit, ')
          ..write('brand: $brand, ')
          ..write('manufacturerRef: $manufacturerRef, ')
          ..write('locationCode: $locationCode, ')
          ..write('locationIsVirtual: $locationIsVirtual, ')
          ..write('aisle: $aisle, ')
          ..write('bay: $bay, ')
          ..write('level: $level, ')
          ..write('slot: $slot, ')
          ..write('finalQty: $finalQty, ')
          ..write('status: $status, ')
          ..write('expectedCountNumber: $expectedCountNumber, ')
          ..write('isManual: $isManual, ')
          ..write('countedByMe: $countedByMe, ')
          ..write('myLastQuantity: $myLastQuantity, ')
          ..write('countCount: $countCount, ')
          ..write('searchText: $searchText, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CachedListsTable extends CachedLists
    with TableInfo<$CachedListsTable, CachedList> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CachedListsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _codeMeta = const VerificationMeta('code');
  @override
  late final GeneratedColumn<String> code = GeneratedColumn<String>(
      'code', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
      'name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _campaignIdMeta =
      const VerificationMeta('campaignId');
  @override
  late final GeneratedColumn<String> campaignId = GeneratedColumn<String>(
      'campaign_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _campaignCodeMeta =
      const VerificationMeta('campaignCode');
  @override
  late final GeneratedColumn<String> campaignCode = GeneratedColumn<String>(
      'campaign_code', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _campaignNameMeta =
      const VerificationMeta('campaignName');
  @override
  late final GeneratedColumn<String> campaignName = GeneratedColumn<String>(
      'campaign_name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _campaignStatusMeta =
      const VerificationMeta('campaignStatus');
  @override
  late final GeneratedColumn<String> campaignStatus = GeneratedColumn<String>(
      'campaign_status', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _methodCodeMeta =
      const VerificationMeta('methodCode');
  @override
  late final GeneratedColumn<String> methodCode = GeneratedColumn<String>(
      'method_code', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _totalItemsMeta =
      const VerificationMeta('totalItems');
  @override
  late final GeneratedColumn<int> totalItems = GeneratedColumn<int>(
      'total_items', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _countedItemsMeta =
      const VerificationMeta('countedItems');
  @override
  late final GeneratedColumn<int> countedItems = GeneratedColumn<int>(
      'counted_items', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _syncedAtMeta =
      const VerificationMeta('syncedAt');
  @override
  late final GeneratedColumn<DateTime> syncedAt = GeneratedColumn<DateTime>(
      'synced_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        code,
        name,
        status,
        campaignId,
        campaignCode,
        campaignName,
        campaignStatus,
        methodCode,
        totalItems,
        countedItems,
        syncedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'cached_lists';
  @override
  VerificationContext validateIntegrity(Insertable<CachedList> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('code')) {
      context.handle(
          _codeMeta, code.isAcceptableOrUnknown(data['code']!, _codeMeta));
    } else if (isInserting) {
      context.missing(_codeMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
          _nameMeta, name.isAcceptableOrUnknown(data['name']!, _nameMeta));
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    } else if (isInserting) {
      context.missing(_statusMeta);
    }
    if (data.containsKey('campaign_id')) {
      context.handle(
          _campaignIdMeta,
          campaignId.isAcceptableOrUnknown(
              data['campaign_id']!, _campaignIdMeta));
    } else if (isInserting) {
      context.missing(_campaignIdMeta);
    }
    if (data.containsKey('campaign_code')) {
      context.handle(
          _campaignCodeMeta,
          campaignCode.isAcceptableOrUnknown(
              data['campaign_code']!, _campaignCodeMeta));
    } else if (isInserting) {
      context.missing(_campaignCodeMeta);
    }
    if (data.containsKey('campaign_name')) {
      context.handle(
          _campaignNameMeta,
          campaignName.isAcceptableOrUnknown(
              data['campaign_name']!, _campaignNameMeta));
    } else if (isInserting) {
      context.missing(_campaignNameMeta);
    }
    if (data.containsKey('campaign_status')) {
      context.handle(
          _campaignStatusMeta,
          campaignStatus.isAcceptableOrUnknown(
              data['campaign_status']!, _campaignStatusMeta));
    } else if (isInserting) {
      context.missing(_campaignStatusMeta);
    }
    if (data.containsKey('method_code')) {
      context.handle(
          _methodCodeMeta,
          methodCode.isAcceptableOrUnknown(
              data['method_code']!, _methodCodeMeta));
    } else if (isInserting) {
      context.missing(_methodCodeMeta);
    }
    if (data.containsKey('total_items')) {
      context.handle(
          _totalItemsMeta,
          totalItems.isAcceptableOrUnknown(
              data['total_items']!, _totalItemsMeta));
    }
    if (data.containsKey('counted_items')) {
      context.handle(
          _countedItemsMeta,
          countedItems.isAcceptableOrUnknown(
              data['counted_items']!, _countedItemsMeta));
    }
    if (data.containsKey('synced_at')) {
      context.handle(_syncedAtMeta,
          syncedAt.isAcceptableOrUnknown(data['synced_at']!, _syncedAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CachedList map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CachedList(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      code: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}code'])!,
      name: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      campaignId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}campaign_id'])!,
      campaignCode: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}campaign_code'])!,
      campaignName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}campaign_name'])!,
      campaignStatus: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}campaign_status'])!,
      methodCode: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}method_code'])!,
      totalItems: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}total_items'])!,
      countedItems: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}counted_items'])!,
      syncedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}synced_at']),
    );
  }

  @override
  $CachedListsTable createAlias(String alias) {
    return $CachedListsTable(attachedDatabase, alias);
  }
}

class CachedList extends DataClass implements Insertable<CachedList> {
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
  final DateTime? syncedAt;
  const CachedList(
      {required this.id,
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
      this.syncedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['code'] = Variable<String>(code);
    map['name'] = Variable<String>(name);
    map['status'] = Variable<String>(status);
    map['campaign_id'] = Variable<String>(campaignId);
    map['campaign_code'] = Variable<String>(campaignCode);
    map['campaign_name'] = Variable<String>(campaignName);
    map['campaign_status'] = Variable<String>(campaignStatus);
    map['method_code'] = Variable<String>(methodCode);
    map['total_items'] = Variable<int>(totalItems);
    map['counted_items'] = Variable<int>(countedItems);
    if (!nullToAbsent || syncedAt != null) {
      map['synced_at'] = Variable<DateTime>(syncedAt);
    }
    return map;
  }

  CachedListsCompanion toCompanion(bool nullToAbsent) {
    return CachedListsCompanion(
      id: Value(id),
      code: Value(code),
      name: Value(name),
      status: Value(status),
      campaignId: Value(campaignId),
      campaignCode: Value(campaignCode),
      campaignName: Value(campaignName),
      campaignStatus: Value(campaignStatus),
      methodCode: Value(methodCode),
      totalItems: Value(totalItems),
      countedItems: Value(countedItems),
      syncedAt: syncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(syncedAt),
    );
  }

  factory CachedList.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CachedList(
      id: serializer.fromJson<String>(json['id']),
      code: serializer.fromJson<String>(json['code']),
      name: serializer.fromJson<String>(json['name']),
      status: serializer.fromJson<String>(json['status']),
      campaignId: serializer.fromJson<String>(json['campaignId']),
      campaignCode: serializer.fromJson<String>(json['campaignCode']),
      campaignName: serializer.fromJson<String>(json['campaignName']),
      campaignStatus: serializer.fromJson<String>(json['campaignStatus']),
      methodCode: serializer.fromJson<String>(json['methodCode']),
      totalItems: serializer.fromJson<int>(json['totalItems']),
      countedItems: serializer.fromJson<int>(json['countedItems']),
      syncedAt: serializer.fromJson<DateTime?>(json['syncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'code': serializer.toJson<String>(code),
      'name': serializer.toJson<String>(name),
      'status': serializer.toJson<String>(status),
      'campaignId': serializer.toJson<String>(campaignId),
      'campaignCode': serializer.toJson<String>(campaignCode),
      'campaignName': serializer.toJson<String>(campaignName),
      'campaignStatus': serializer.toJson<String>(campaignStatus),
      'methodCode': serializer.toJson<String>(methodCode),
      'totalItems': serializer.toJson<int>(totalItems),
      'countedItems': serializer.toJson<int>(countedItems),
      'syncedAt': serializer.toJson<DateTime?>(syncedAt),
    };
  }

  CachedList copyWith(
          {String? id,
          String? code,
          String? name,
          String? status,
          String? campaignId,
          String? campaignCode,
          String? campaignName,
          String? campaignStatus,
          String? methodCode,
          int? totalItems,
          int? countedItems,
          Value<DateTime?> syncedAt = const Value.absent()}) =>
      CachedList(
        id: id ?? this.id,
        code: code ?? this.code,
        name: name ?? this.name,
        status: status ?? this.status,
        campaignId: campaignId ?? this.campaignId,
        campaignCode: campaignCode ?? this.campaignCode,
        campaignName: campaignName ?? this.campaignName,
        campaignStatus: campaignStatus ?? this.campaignStatus,
        methodCode: methodCode ?? this.methodCode,
        totalItems: totalItems ?? this.totalItems,
        countedItems: countedItems ?? this.countedItems,
        syncedAt: syncedAt.present ? syncedAt.value : this.syncedAt,
      );
  CachedList copyWithCompanion(CachedListsCompanion data) {
    return CachedList(
      id: data.id.present ? data.id.value : this.id,
      code: data.code.present ? data.code.value : this.code,
      name: data.name.present ? data.name.value : this.name,
      status: data.status.present ? data.status.value : this.status,
      campaignId:
          data.campaignId.present ? data.campaignId.value : this.campaignId,
      campaignCode: data.campaignCode.present
          ? data.campaignCode.value
          : this.campaignCode,
      campaignName: data.campaignName.present
          ? data.campaignName.value
          : this.campaignName,
      campaignStatus: data.campaignStatus.present
          ? data.campaignStatus.value
          : this.campaignStatus,
      methodCode:
          data.methodCode.present ? data.methodCode.value : this.methodCode,
      totalItems:
          data.totalItems.present ? data.totalItems.value : this.totalItems,
      countedItems: data.countedItems.present
          ? data.countedItems.value
          : this.countedItems,
      syncedAt: data.syncedAt.present ? data.syncedAt.value : this.syncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CachedList(')
          ..write('id: $id, ')
          ..write('code: $code, ')
          ..write('name: $name, ')
          ..write('status: $status, ')
          ..write('campaignId: $campaignId, ')
          ..write('campaignCode: $campaignCode, ')
          ..write('campaignName: $campaignName, ')
          ..write('campaignStatus: $campaignStatus, ')
          ..write('methodCode: $methodCode, ')
          ..write('totalItems: $totalItems, ')
          ..write('countedItems: $countedItems, ')
          ..write('syncedAt: $syncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      code,
      name,
      status,
      campaignId,
      campaignCode,
      campaignName,
      campaignStatus,
      methodCode,
      totalItems,
      countedItems,
      syncedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CachedList &&
          other.id == this.id &&
          other.code == this.code &&
          other.name == this.name &&
          other.status == this.status &&
          other.campaignId == this.campaignId &&
          other.campaignCode == this.campaignCode &&
          other.campaignName == this.campaignName &&
          other.campaignStatus == this.campaignStatus &&
          other.methodCode == this.methodCode &&
          other.totalItems == this.totalItems &&
          other.countedItems == this.countedItems &&
          other.syncedAt == this.syncedAt);
}

class CachedListsCompanion extends UpdateCompanion<CachedList> {
  final Value<String> id;
  final Value<String> code;
  final Value<String> name;
  final Value<String> status;
  final Value<String> campaignId;
  final Value<String> campaignCode;
  final Value<String> campaignName;
  final Value<String> campaignStatus;
  final Value<String> methodCode;
  final Value<int> totalItems;
  final Value<int> countedItems;
  final Value<DateTime?> syncedAt;
  final Value<int> rowid;
  const CachedListsCompanion({
    this.id = const Value.absent(),
    this.code = const Value.absent(),
    this.name = const Value.absent(),
    this.status = const Value.absent(),
    this.campaignId = const Value.absent(),
    this.campaignCode = const Value.absent(),
    this.campaignName = const Value.absent(),
    this.campaignStatus = const Value.absent(),
    this.methodCode = const Value.absent(),
    this.totalItems = const Value.absent(),
    this.countedItems = const Value.absent(),
    this.syncedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CachedListsCompanion.insert({
    required String id,
    required String code,
    required String name,
    required String status,
    required String campaignId,
    required String campaignCode,
    required String campaignName,
    required String campaignStatus,
    required String methodCode,
    this.totalItems = const Value.absent(),
    this.countedItems = const Value.absent(),
    this.syncedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        code = Value(code),
        name = Value(name),
        status = Value(status),
        campaignId = Value(campaignId),
        campaignCode = Value(campaignCode),
        campaignName = Value(campaignName),
        campaignStatus = Value(campaignStatus),
        methodCode = Value(methodCode);
  static Insertable<CachedList> custom({
    Expression<String>? id,
    Expression<String>? code,
    Expression<String>? name,
    Expression<String>? status,
    Expression<String>? campaignId,
    Expression<String>? campaignCode,
    Expression<String>? campaignName,
    Expression<String>? campaignStatus,
    Expression<String>? methodCode,
    Expression<int>? totalItems,
    Expression<int>? countedItems,
    Expression<DateTime>? syncedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (code != null) 'code': code,
      if (name != null) 'name': name,
      if (status != null) 'status': status,
      if (campaignId != null) 'campaign_id': campaignId,
      if (campaignCode != null) 'campaign_code': campaignCode,
      if (campaignName != null) 'campaign_name': campaignName,
      if (campaignStatus != null) 'campaign_status': campaignStatus,
      if (methodCode != null) 'method_code': methodCode,
      if (totalItems != null) 'total_items': totalItems,
      if (countedItems != null) 'counted_items': countedItems,
      if (syncedAt != null) 'synced_at': syncedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CachedListsCompanion copyWith(
      {Value<String>? id,
      Value<String>? code,
      Value<String>? name,
      Value<String>? status,
      Value<String>? campaignId,
      Value<String>? campaignCode,
      Value<String>? campaignName,
      Value<String>? campaignStatus,
      Value<String>? methodCode,
      Value<int>? totalItems,
      Value<int>? countedItems,
      Value<DateTime?>? syncedAt,
      Value<int>? rowid}) {
    return CachedListsCompanion(
      id: id ?? this.id,
      code: code ?? this.code,
      name: name ?? this.name,
      status: status ?? this.status,
      campaignId: campaignId ?? this.campaignId,
      campaignCode: campaignCode ?? this.campaignCode,
      campaignName: campaignName ?? this.campaignName,
      campaignStatus: campaignStatus ?? this.campaignStatus,
      methodCode: methodCode ?? this.methodCode,
      totalItems: totalItems ?? this.totalItems,
      countedItems: countedItems ?? this.countedItems,
      syncedAt: syncedAt ?? this.syncedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (code.present) {
      map['code'] = Variable<String>(code.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (campaignId.present) {
      map['campaign_id'] = Variable<String>(campaignId.value);
    }
    if (campaignCode.present) {
      map['campaign_code'] = Variable<String>(campaignCode.value);
    }
    if (campaignName.present) {
      map['campaign_name'] = Variable<String>(campaignName.value);
    }
    if (campaignStatus.present) {
      map['campaign_status'] = Variable<String>(campaignStatus.value);
    }
    if (methodCode.present) {
      map['method_code'] = Variable<String>(methodCode.value);
    }
    if (totalItems.present) {
      map['total_items'] = Variable<int>(totalItems.value);
    }
    if (countedItems.present) {
      map['counted_items'] = Variable<int>(countedItems.value);
    }
    if (syncedAt.present) {
      map['synced_at'] = Variable<DateTime>(syncedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CachedListsCompanion(')
          ..write('id: $id, ')
          ..write('code: $code, ')
          ..write('name: $name, ')
          ..write('status: $status, ')
          ..write('campaignId: $campaignId, ')
          ..write('campaignCode: $campaignCode, ')
          ..write('campaignName: $campaignName, ')
          ..write('campaignStatus: $campaignStatus, ')
          ..write('methodCode: $methodCode, ')
          ..write('totalItems: $totalItems, ')
          ..write('countedItems: $countedItems, ')
          ..write('syncedAt: $syncedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $PendingCountsTable extends PendingCounts
    with TableInfo<$PendingCountsTable, PendingCount> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PendingCountsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _clientUuidMeta =
      const VerificationMeta('clientUuid');
  @override
  late final GeneratedColumn<String> clientUuid = GeneratedColumn<String>(
      'client_uuid', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _itemIdMeta = const VerificationMeta('itemId');
  @override
  late final GeneratedColumn<String> itemId = GeneratedColumn<String>(
      'item_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _listIdMeta = const VerificationMeta('listId');
  @override
  late final GeneratedColumn<String> listId = GeneratedColumn<String>(
      'list_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _quantityMeta =
      const VerificationMeta('quantity');
  @override
  late final GeneratedColumn<double> quantity = GeneratedColumn<double>(
      'quantity', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _countedAtMeta =
      const VerificationMeta('countedAt');
  @override
  late final GeneratedColumn<DateTime> countedAt = GeneratedColumn<DateTime>(
      'counted_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _noteMeta = const VerificationMeta('note');
  @override
  late final GeneratedColumn<String> note = GeneratedColumn<String>(
      'note', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _stateMeta = const VerificationMeta('state');
  @override
  late final GeneratedColumn<String> state = GeneratedColumn<String>(
      'state', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('PENDING'));
  static const VerificationMeta _failureReasonMeta =
      const VerificationMeta('failureReason');
  @override
  late final GeneratedColumn<String> failureReason = GeneratedColumn<String>(
      'failure_reason', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _attemptsMeta =
      const VerificationMeta('attempts');
  @override
  late final GeneratedColumn<int> attempts = GeneratedColumn<int>(
      'attempts', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _lastAttemptAtMeta =
      const VerificationMeta('lastAttemptAt');
  @override
  late final GeneratedColumn<DateTime> lastAttemptAt =
      GeneratedColumn<DateTime>('last_attempt_at', aliasedName, true,
          type: DriftSqlType.dateTime, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        clientUuid,
        itemId,
        listId,
        quantity,
        countedAt,
        note,
        state,
        failureReason,
        attempts,
        lastAttemptAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'pending_counts';
  @override
  VerificationContext validateIntegrity(Insertable<PendingCount> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('client_uuid')) {
      context.handle(
          _clientUuidMeta,
          clientUuid.isAcceptableOrUnknown(
              data['client_uuid']!, _clientUuidMeta));
    } else if (isInserting) {
      context.missing(_clientUuidMeta);
    }
    if (data.containsKey('item_id')) {
      context.handle(_itemIdMeta,
          itemId.isAcceptableOrUnknown(data['item_id']!, _itemIdMeta));
    } else if (isInserting) {
      context.missing(_itemIdMeta);
    }
    if (data.containsKey('list_id')) {
      context.handle(_listIdMeta,
          listId.isAcceptableOrUnknown(data['list_id']!, _listIdMeta));
    } else if (isInserting) {
      context.missing(_listIdMeta);
    }
    if (data.containsKey('quantity')) {
      context.handle(_quantityMeta,
          quantity.isAcceptableOrUnknown(data['quantity']!, _quantityMeta));
    } else if (isInserting) {
      context.missing(_quantityMeta);
    }
    if (data.containsKey('counted_at')) {
      context.handle(_countedAtMeta,
          countedAt.isAcceptableOrUnknown(data['counted_at']!, _countedAtMeta));
    } else if (isInserting) {
      context.missing(_countedAtMeta);
    }
    if (data.containsKey('note')) {
      context.handle(
          _noteMeta, note.isAcceptableOrUnknown(data['note']!, _noteMeta));
    }
    if (data.containsKey('state')) {
      context.handle(
          _stateMeta, state.isAcceptableOrUnknown(data['state']!, _stateMeta));
    }
    if (data.containsKey('failure_reason')) {
      context.handle(
          _failureReasonMeta,
          failureReason.isAcceptableOrUnknown(
              data['failure_reason']!, _failureReasonMeta));
    }
    if (data.containsKey('attempts')) {
      context.handle(_attemptsMeta,
          attempts.isAcceptableOrUnknown(data['attempts']!, _attemptsMeta));
    }
    if (data.containsKey('last_attempt_at')) {
      context.handle(
          _lastAttemptAtMeta,
          lastAttemptAt.isAcceptableOrUnknown(
              data['last_attempt_at']!, _lastAttemptAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {clientUuid};
  @override
  PendingCount map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return PendingCount(
      clientUuid: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}client_uuid'])!,
      itemId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}item_id'])!,
      listId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}list_id'])!,
      quantity: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}quantity'])!,
      countedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}counted_at'])!,
      note: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}note']),
      state: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}state'])!,
      failureReason: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}failure_reason']),
      attempts: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}attempts'])!,
      lastAttemptAt: attachedDatabase.typeMapping.read(
          DriftSqlType.dateTime, data['${effectivePrefix}last_attempt_at']),
    );
  }

  @override
  $PendingCountsTable createAlias(String alias) {
    return $PendingCountsTable(attachedDatabase, alias);
  }
}

class PendingCount extends DataClass implements Insertable<PendingCount> {
  /// UUID v4 généré **avant** l'envoi : clé d'idempotence côté serveur.
  final String clientUuid;
  final String itemId;
  final String listId;
  final double quantity;
  final DateTime countedAt;
  final String? note;

  /// PENDING, SENDING, SENT, REJECTED
  final String state;

  /// Motif d'un rejet serveur, affiché à l'utilisateur.
  final String? failureReason;
  final int attempts;
  final DateTime? lastAttemptAt;
  const PendingCount(
      {required this.clientUuid,
      required this.itemId,
      required this.listId,
      required this.quantity,
      required this.countedAt,
      this.note,
      required this.state,
      this.failureReason,
      required this.attempts,
      this.lastAttemptAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['client_uuid'] = Variable<String>(clientUuid);
    map['item_id'] = Variable<String>(itemId);
    map['list_id'] = Variable<String>(listId);
    map['quantity'] = Variable<double>(quantity);
    map['counted_at'] = Variable<DateTime>(countedAt);
    if (!nullToAbsent || note != null) {
      map['note'] = Variable<String>(note);
    }
    map['state'] = Variable<String>(state);
    if (!nullToAbsent || failureReason != null) {
      map['failure_reason'] = Variable<String>(failureReason);
    }
    map['attempts'] = Variable<int>(attempts);
    if (!nullToAbsent || lastAttemptAt != null) {
      map['last_attempt_at'] = Variable<DateTime>(lastAttemptAt);
    }
    return map;
  }

  PendingCountsCompanion toCompanion(bool nullToAbsent) {
    return PendingCountsCompanion(
      clientUuid: Value(clientUuid),
      itemId: Value(itemId),
      listId: Value(listId),
      quantity: Value(quantity),
      countedAt: Value(countedAt),
      note: note == null && nullToAbsent ? const Value.absent() : Value(note),
      state: Value(state),
      failureReason: failureReason == null && nullToAbsent
          ? const Value.absent()
          : Value(failureReason),
      attempts: Value(attempts),
      lastAttemptAt: lastAttemptAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastAttemptAt),
    );
  }

  factory PendingCount.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return PendingCount(
      clientUuid: serializer.fromJson<String>(json['clientUuid']),
      itemId: serializer.fromJson<String>(json['itemId']),
      listId: serializer.fromJson<String>(json['listId']),
      quantity: serializer.fromJson<double>(json['quantity']),
      countedAt: serializer.fromJson<DateTime>(json['countedAt']),
      note: serializer.fromJson<String?>(json['note']),
      state: serializer.fromJson<String>(json['state']),
      failureReason: serializer.fromJson<String?>(json['failureReason']),
      attempts: serializer.fromJson<int>(json['attempts']),
      lastAttemptAt: serializer.fromJson<DateTime?>(json['lastAttemptAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'clientUuid': serializer.toJson<String>(clientUuid),
      'itemId': serializer.toJson<String>(itemId),
      'listId': serializer.toJson<String>(listId),
      'quantity': serializer.toJson<double>(quantity),
      'countedAt': serializer.toJson<DateTime>(countedAt),
      'note': serializer.toJson<String?>(note),
      'state': serializer.toJson<String>(state),
      'failureReason': serializer.toJson<String?>(failureReason),
      'attempts': serializer.toJson<int>(attempts),
      'lastAttemptAt': serializer.toJson<DateTime?>(lastAttemptAt),
    };
  }

  PendingCount copyWith(
          {String? clientUuid,
          String? itemId,
          String? listId,
          double? quantity,
          DateTime? countedAt,
          Value<String?> note = const Value.absent(),
          String? state,
          Value<String?> failureReason = const Value.absent(),
          int? attempts,
          Value<DateTime?> lastAttemptAt = const Value.absent()}) =>
      PendingCount(
        clientUuid: clientUuid ?? this.clientUuid,
        itemId: itemId ?? this.itemId,
        listId: listId ?? this.listId,
        quantity: quantity ?? this.quantity,
        countedAt: countedAt ?? this.countedAt,
        note: note.present ? note.value : this.note,
        state: state ?? this.state,
        failureReason:
            failureReason.present ? failureReason.value : this.failureReason,
        attempts: attempts ?? this.attempts,
        lastAttemptAt:
            lastAttemptAt.present ? lastAttemptAt.value : this.lastAttemptAt,
      );
  PendingCount copyWithCompanion(PendingCountsCompanion data) {
    return PendingCount(
      clientUuid:
          data.clientUuid.present ? data.clientUuid.value : this.clientUuid,
      itemId: data.itemId.present ? data.itemId.value : this.itemId,
      listId: data.listId.present ? data.listId.value : this.listId,
      quantity: data.quantity.present ? data.quantity.value : this.quantity,
      countedAt: data.countedAt.present ? data.countedAt.value : this.countedAt,
      note: data.note.present ? data.note.value : this.note,
      state: data.state.present ? data.state.value : this.state,
      failureReason: data.failureReason.present
          ? data.failureReason.value
          : this.failureReason,
      attempts: data.attempts.present ? data.attempts.value : this.attempts,
      lastAttemptAt: data.lastAttemptAt.present
          ? data.lastAttemptAt.value
          : this.lastAttemptAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('PendingCount(')
          ..write('clientUuid: $clientUuid, ')
          ..write('itemId: $itemId, ')
          ..write('listId: $listId, ')
          ..write('quantity: $quantity, ')
          ..write('countedAt: $countedAt, ')
          ..write('note: $note, ')
          ..write('state: $state, ')
          ..write('failureReason: $failureReason, ')
          ..write('attempts: $attempts, ')
          ..write('lastAttemptAt: $lastAttemptAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(clientUuid, itemId, listId, quantity,
      countedAt, note, state, failureReason, attempts, lastAttemptAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PendingCount &&
          other.clientUuid == this.clientUuid &&
          other.itemId == this.itemId &&
          other.listId == this.listId &&
          other.quantity == this.quantity &&
          other.countedAt == this.countedAt &&
          other.note == this.note &&
          other.state == this.state &&
          other.failureReason == this.failureReason &&
          other.attempts == this.attempts &&
          other.lastAttemptAt == this.lastAttemptAt);
}

class PendingCountsCompanion extends UpdateCompanion<PendingCount> {
  final Value<String> clientUuid;
  final Value<String> itemId;
  final Value<String> listId;
  final Value<double> quantity;
  final Value<DateTime> countedAt;
  final Value<String?> note;
  final Value<String> state;
  final Value<String?> failureReason;
  final Value<int> attempts;
  final Value<DateTime?> lastAttemptAt;
  final Value<int> rowid;
  const PendingCountsCompanion({
    this.clientUuid = const Value.absent(),
    this.itemId = const Value.absent(),
    this.listId = const Value.absent(),
    this.quantity = const Value.absent(),
    this.countedAt = const Value.absent(),
    this.note = const Value.absent(),
    this.state = const Value.absent(),
    this.failureReason = const Value.absent(),
    this.attempts = const Value.absent(),
    this.lastAttemptAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  PendingCountsCompanion.insert({
    required String clientUuid,
    required String itemId,
    required String listId,
    required double quantity,
    required DateTime countedAt,
    this.note = const Value.absent(),
    this.state = const Value.absent(),
    this.failureReason = const Value.absent(),
    this.attempts = const Value.absent(),
    this.lastAttemptAt = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : clientUuid = Value(clientUuid),
        itemId = Value(itemId),
        listId = Value(listId),
        quantity = Value(quantity),
        countedAt = Value(countedAt);
  static Insertable<PendingCount> custom({
    Expression<String>? clientUuid,
    Expression<String>? itemId,
    Expression<String>? listId,
    Expression<double>? quantity,
    Expression<DateTime>? countedAt,
    Expression<String>? note,
    Expression<String>? state,
    Expression<String>? failureReason,
    Expression<int>? attempts,
    Expression<DateTime>? lastAttemptAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (clientUuid != null) 'client_uuid': clientUuid,
      if (itemId != null) 'item_id': itemId,
      if (listId != null) 'list_id': listId,
      if (quantity != null) 'quantity': quantity,
      if (countedAt != null) 'counted_at': countedAt,
      if (note != null) 'note': note,
      if (state != null) 'state': state,
      if (failureReason != null) 'failure_reason': failureReason,
      if (attempts != null) 'attempts': attempts,
      if (lastAttemptAt != null) 'last_attempt_at': lastAttemptAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  PendingCountsCompanion copyWith(
      {Value<String>? clientUuid,
      Value<String>? itemId,
      Value<String>? listId,
      Value<double>? quantity,
      Value<DateTime>? countedAt,
      Value<String?>? note,
      Value<String>? state,
      Value<String?>? failureReason,
      Value<int>? attempts,
      Value<DateTime?>? lastAttemptAt,
      Value<int>? rowid}) {
    return PendingCountsCompanion(
      clientUuid: clientUuid ?? this.clientUuid,
      itemId: itemId ?? this.itemId,
      listId: listId ?? this.listId,
      quantity: quantity ?? this.quantity,
      countedAt: countedAt ?? this.countedAt,
      note: note ?? this.note,
      state: state ?? this.state,
      failureReason: failureReason ?? this.failureReason,
      attempts: attempts ?? this.attempts,
      lastAttemptAt: lastAttemptAt ?? this.lastAttemptAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (clientUuid.present) {
      map['client_uuid'] = Variable<String>(clientUuid.value);
    }
    if (itemId.present) {
      map['item_id'] = Variable<String>(itemId.value);
    }
    if (listId.present) {
      map['list_id'] = Variable<String>(listId.value);
    }
    if (quantity.present) {
      map['quantity'] = Variable<double>(quantity.value);
    }
    if (countedAt.present) {
      map['counted_at'] = Variable<DateTime>(countedAt.value);
    }
    if (note.present) {
      map['note'] = Variable<String>(note.value);
    }
    if (state.present) {
      map['state'] = Variable<String>(state.value);
    }
    if (failureReason.present) {
      map['failure_reason'] = Variable<String>(failureReason.value);
    }
    if (attempts.present) {
      map['attempts'] = Variable<int>(attempts.value);
    }
    if (lastAttemptAt.present) {
      map['last_attempt_at'] = Variable<DateTime>(lastAttemptAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PendingCountsCompanion(')
          ..write('clientUuid: $clientUuid, ')
          ..write('itemId: $itemId, ')
          ..write('listId: $listId, ')
          ..write('quantity: $quantity, ')
          ..write('countedAt: $countedAt, ')
          ..write('note: $note, ')
          ..write('state: $state, ')
          ..write('failureReason: $failureReason, ')
          ..write('attempts: $attempts, ')
          ..write('lastAttemptAt: $lastAttemptAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $CachedItemsTable cachedItems = $CachedItemsTable(this);
  late final $CachedListsTable cachedLists = $CachedListsTable(this);
  late final $PendingCountsTable pendingCounts = $PendingCountsTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities =>
      [cachedItems, cachedLists, pendingCounts];
}

typedef $$CachedItemsTableCreateCompanionBuilder = CachedItemsCompanion
    Function({
  required String id,
  required String listId,
  required String articleCode,
  required String designation,
  Value<String> unit,
  Value<String?> brand,
  Value<String?> manufacturerRef,
  required String locationCode,
  Value<bool> locationIsVirtual,
  Value<int?> aisle,
  Value<int?> bay,
  Value<String?> level,
  Value<int?> slot,
  Value<double?> finalQty,
  required String status,
  Value<int?> expectedCountNumber,
  Value<bool> isManual,
  Value<bool> countedByMe,
  Value<double?> myLastQuantity,
  Value<int> countCount,
  required String searchText,
  Value<int> rowid,
});
typedef $$CachedItemsTableUpdateCompanionBuilder = CachedItemsCompanion
    Function({
  Value<String> id,
  Value<String> listId,
  Value<String> articleCode,
  Value<String> designation,
  Value<String> unit,
  Value<String?> brand,
  Value<String?> manufacturerRef,
  Value<String> locationCode,
  Value<bool> locationIsVirtual,
  Value<int?> aisle,
  Value<int?> bay,
  Value<String?> level,
  Value<int?> slot,
  Value<double?> finalQty,
  Value<String> status,
  Value<int?> expectedCountNumber,
  Value<bool> isManual,
  Value<bool> countedByMe,
  Value<double?> myLastQuantity,
  Value<int> countCount,
  Value<String> searchText,
  Value<int> rowid,
});

class $$CachedItemsTableFilterComposer
    extends Composer<_$AppDatabase, $CachedItemsTable> {
  $$CachedItemsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get listId => $composableBuilder(
      column: $table.listId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get articleCode => $composableBuilder(
      column: $table.articleCode, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get designation => $composableBuilder(
      column: $table.designation, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get unit => $composableBuilder(
      column: $table.unit, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get brand => $composableBuilder(
      column: $table.brand, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get manufacturerRef => $composableBuilder(
      column: $table.manufacturerRef,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get locationCode => $composableBuilder(
      column: $table.locationCode, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get locationIsVirtual => $composableBuilder(
      column: $table.locationIsVirtual,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get aisle => $composableBuilder(
      column: $table.aisle, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get bay => $composableBuilder(
      column: $table.bay, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get level => $composableBuilder(
      column: $table.level, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get slot => $composableBuilder(
      column: $table.slot, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get finalQty => $composableBuilder(
      column: $table.finalQty, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get expectedCountNumber => $composableBuilder(
      column: $table.expectedCountNumber,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isManual => $composableBuilder(
      column: $table.isManual, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get countedByMe => $composableBuilder(
      column: $table.countedByMe, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get myLastQuantity => $composableBuilder(
      column: $table.myLastQuantity,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get countCount => $composableBuilder(
      column: $table.countCount, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get searchText => $composableBuilder(
      column: $table.searchText, builder: (column) => ColumnFilters(column));
}

class $$CachedItemsTableOrderingComposer
    extends Composer<_$AppDatabase, $CachedItemsTable> {
  $$CachedItemsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get listId => $composableBuilder(
      column: $table.listId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get articleCode => $composableBuilder(
      column: $table.articleCode, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get designation => $composableBuilder(
      column: $table.designation, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get unit => $composableBuilder(
      column: $table.unit, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get brand => $composableBuilder(
      column: $table.brand, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get manufacturerRef => $composableBuilder(
      column: $table.manufacturerRef,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get locationCode => $composableBuilder(
      column: $table.locationCode,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get locationIsVirtual => $composableBuilder(
      column: $table.locationIsVirtual,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get aisle => $composableBuilder(
      column: $table.aisle, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get bay => $composableBuilder(
      column: $table.bay, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get level => $composableBuilder(
      column: $table.level, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get slot => $composableBuilder(
      column: $table.slot, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get finalQty => $composableBuilder(
      column: $table.finalQty, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get expectedCountNumber => $composableBuilder(
      column: $table.expectedCountNumber,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isManual => $composableBuilder(
      column: $table.isManual, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get countedByMe => $composableBuilder(
      column: $table.countedByMe, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get myLastQuantity => $composableBuilder(
      column: $table.myLastQuantity,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get countCount => $composableBuilder(
      column: $table.countCount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get searchText => $composableBuilder(
      column: $table.searchText, builder: (column) => ColumnOrderings(column));
}

class $$CachedItemsTableAnnotationComposer
    extends Composer<_$AppDatabase, $CachedItemsTable> {
  $$CachedItemsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get listId =>
      $composableBuilder(column: $table.listId, builder: (column) => column);

  GeneratedColumn<String> get articleCode => $composableBuilder(
      column: $table.articleCode, builder: (column) => column);

  GeneratedColumn<String> get designation => $composableBuilder(
      column: $table.designation, builder: (column) => column);

  GeneratedColumn<String> get unit =>
      $composableBuilder(column: $table.unit, builder: (column) => column);

  GeneratedColumn<String> get brand =>
      $composableBuilder(column: $table.brand, builder: (column) => column);

  GeneratedColumn<String> get manufacturerRef => $composableBuilder(
      column: $table.manufacturerRef, builder: (column) => column);

  GeneratedColumn<String> get locationCode => $composableBuilder(
      column: $table.locationCode, builder: (column) => column);

  GeneratedColumn<bool> get locationIsVirtual => $composableBuilder(
      column: $table.locationIsVirtual, builder: (column) => column);

  GeneratedColumn<int> get aisle =>
      $composableBuilder(column: $table.aisle, builder: (column) => column);

  GeneratedColumn<int> get bay =>
      $composableBuilder(column: $table.bay, builder: (column) => column);

  GeneratedColumn<String> get level =>
      $composableBuilder(column: $table.level, builder: (column) => column);

  GeneratedColumn<int> get slot =>
      $composableBuilder(column: $table.slot, builder: (column) => column);

  GeneratedColumn<double> get finalQty =>
      $composableBuilder(column: $table.finalQty, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<int> get expectedCountNumber => $composableBuilder(
      column: $table.expectedCountNumber, builder: (column) => column);

  GeneratedColumn<bool> get isManual =>
      $composableBuilder(column: $table.isManual, builder: (column) => column);

  GeneratedColumn<bool> get countedByMe => $composableBuilder(
      column: $table.countedByMe, builder: (column) => column);

  GeneratedColumn<double> get myLastQuantity => $composableBuilder(
      column: $table.myLastQuantity, builder: (column) => column);

  GeneratedColumn<int> get countCount => $composableBuilder(
      column: $table.countCount, builder: (column) => column);

  GeneratedColumn<String> get searchText => $composableBuilder(
      column: $table.searchText, builder: (column) => column);
}

class $$CachedItemsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $CachedItemsTable,
    CachedItem,
    $$CachedItemsTableFilterComposer,
    $$CachedItemsTableOrderingComposer,
    $$CachedItemsTableAnnotationComposer,
    $$CachedItemsTableCreateCompanionBuilder,
    $$CachedItemsTableUpdateCompanionBuilder,
    (CachedItem, BaseReferences<_$AppDatabase, $CachedItemsTable, CachedItem>),
    CachedItem,
    PrefetchHooks Function()> {
  $$CachedItemsTableTableManager(_$AppDatabase db, $CachedItemsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CachedItemsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CachedItemsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CachedItemsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> listId = const Value.absent(),
            Value<String> articleCode = const Value.absent(),
            Value<String> designation = const Value.absent(),
            Value<String> unit = const Value.absent(),
            Value<String?> brand = const Value.absent(),
            Value<String?> manufacturerRef = const Value.absent(),
            Value<String> locationCode = const Value.absent(),
            Value<bool> locationIsVirtual = const Value.absent(),
            Value<int?> aisle = const Value.absent(),
            Value<int?> bay = const Value.absent(),
            Value<String?> level = const Value.absent(),
            Value<int?> slot = const Value.absent(),
            Value<double?> finalQty = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<int?> expectedCountNumber = const Value.absent(),
            Value<bool> isManual = const Value.absent(),
            Value<bool> countedByMe = const Value.absent(),
            Value<double?> myLastQuantity = const Value.absent(),
            Value<int> countCount = const Value.absent(),
            Value<String> searchText = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              CachedItemsCompanion(
            id: id,
            listId: listId,
            articleCode: articleCode,
            designation: designation,
            unit: unit,
            brand: brand,
            manufacturerRef: manufacturerRef,
            locationCode: locationCode,
            locationIsVirtual: locationIsVirtual,
            aisle: aisle,
            bay: bay,
            level: level,
            slot: slot,
            finalQty: finalQty,
            status: status,
            expectedCountNumber: expectedCountNumber,
            isManual: isManual,
            countedByMe: countedByMe,
            myLastQuantity: myLastQuantity,
            countCount: countCount,
            searchText: searchText,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String listId,
            required String articleCode,
            required String designation,
            Value<String> unit = const Value.absent(),
            Value<String?> brand = const Value.absent(),
            Value<String?> manufacturerRef = const Value.absent(),
            required String locationCode,
            Value<bool> locationIsVirtual = const Value.absent(),
            Value<int?> aisle = const Value.absent(),
            Value<int?> bay = const Value.absent(),
            Value<String?> level = const Value.absent(),
            Value<int?> slot = const Value.absent(),
            Value<double?> finalQty = const Value.absent(),
            required String status,
            Value<int?> expectedCountNumber = const Value.absent(),
            Value<bool> isManual = const Value.absent(),
            Value<bool> countedByMe = const Value.absent(),
            Value<double?> myLastQuantity = const Value.absent(),
            Value<int> countCount = const Value.absent(),
            required String searchText,
            Value<int> rowid = const Value.absent(),
          }) =>
              CachedItemsCompanion.insert(
            id: id,
            listId: listId,
            articleCode: articleCode,
            designation: designation,
            unit: unit,
            brand: brand,
            manufacturerRef: manufacturerRef,
            locationCode: locationCode,
            locationIsVirtual: locationIsVirtual,
            aisle: aisle,
            bay: bay,
            level: level,
            slot: slot,
            finalQty: finalQty,
            status: status,
            expectedCountNumber: expectedCountNumber,
            isManual: isManual,
            countedByMe: countedByMe,
            myLastQuantity: myLastQuantity,
            countCount: countCount,
            searchText: searchText,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable<$CachedItemsTable, CachedItem>(table),
                    BaseReferences<_$AppDatabase, $CachedItemsTable,
                        CachedItem>(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$CachedItemsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $CachedItemsTable,
    CachedItem,
    $$CachedItemsTableFilterComposer,
    $$CachedItemsTableOrderingComposer,
    $$CachedItemsTableAnnotationComposer,
    $$CachedItemsTableCreateCompanionBuilder,
    $$CachedItemsTableUpdateCompanionBuilder,
    (CachedItem, BaseReferences<_$AppDatabase, $CachedItemsTable, CachedItem>),
    CachedItem,
    PrefetchHooks Function()>;
typedef $$CachedListsTableCreateCompanionBuilder = CachedListsCompanion
    Function({
  required String id,
  required String code,
  required String name,
  required String status,
  required String campaignId,
  required String campaignCode,
  required String campaignName,
  required String campaignStatus,
  required String methodCode,
  Value<int> totalItems,
  Value<int> countedItems,
  Value<DateTime?> syncedAt,
  Value<int> rowid,
});
typedef $$CachedListsTableUpdateCompanionBuilder = CachedListsCompanion
    Function({
  Value<String> id,
  Value<String> code,
  Value<String> name,
  Value<String> status,
  Value<String> campaignId,
  Value<String> campaignCode,
  Value<String> campaignName,
  Value<String> campaignStatus,
  Value<String> methodCode,
  Value<int> totalItems,
  Value<int> countedItems,
  Value<DateTime?> syncedAt,
  Value<int> rowid,
});

class $$CachedListsTableFilterComposer
    extends Composer<_$AppDatabase, $CachedListsTable> {
  $$CachedListsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get code => $composableBuilder(
      column: $table.code, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get campaignId => $composableBuilder(
      column: $table.campaignId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get campaignCode => $composableBuilder(
      column: $table.campaignCode, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get campaignName => $composableBuilder(
      column: $table.campaignName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get campaignStatus => $composableBuilder(
      column: $table.campaignStatus,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get methodCode => $composableBuilder(
      column: $table.methodCode, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get totalItems => $composableBuilder(
      column: $table.totalItems, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get countedItems => $composableBuilder(
      column: $table.countedItems, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get syncedAt => $composableBuilder(
      column: $table.syncedAt, builder: (column) => ColumnFilters(column));
}

class $$CachedListsTableOrderingComposer
    extends Composer<_$AppDatabase, $CachedListsTable> {
  $$CachedListsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get code => $composableBuilder(
      column: $table.code, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get campaignId => $composableBuilder(
      column: $table.campaignId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get campaignCode => $composableBuilder(
      column: $table.campaignCode,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get campaignName => $composableBuilder(
      column: $table.campaignName,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get campaignStatus => $composableBuilder(
      column: $table.campaignStatus,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get methodCode => $composableBuilder(
      column: $table.methodCode, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get totalItems => $composableBuilder(
      column: $table.totalItems, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get countedItems => $composableBuilder(
      column: $table.countedItems,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get syncedAt => $composableBuilder(
      column: $table.syncedAt, builder: (column) => ColumnOrderings(column));
}

class $$CachedListsTableAnnotationComposer
    extends Composer<_$AppDatabase, $CachedListsTable> {
  $$CachedListsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get code =>
      $composableBuilder(column: $table.code, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get campaignId => $composableBuilder(
      column: $table.campaignId, builder: (column) => column);

  GeneratedColumn<String> get campaignCode => $composableBuilder(
      column: $table.campaignCode, builder: (column) => column);

  GeneratedColumn<String> get campaignName => $composableBuilder(
      column: $table.campaignName, builder: (column) => column);

  GeneratedColumn<String> get campaignStatus => $composableBuilder(
      column: $table.campaignStatus, builder: (column) => column);

  GeneratedColumn<String> get methodCode => $composableBuilder(
      column: $table.methodCode, builder: (column) => column);

  GeneratedColumn<int> get totalItems => $composableBuilder(
      column: $table.totalItems, builder: (column) => column);

  GeneratedColumn<int> get countedItems => $composableBuilder(
      column: $table.countedItems, builder: (column) => column);

  GeneratedColumn<DateTime> get syncedAt =>
      $composableBuilder(column: $table.syncedAt, builder: (column) => column);
}

class $$CachedListsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $CachedListsTable,
    CachedList,
    $$CachedListsTableFilterComposer,
    $$CachedListsTableOrderingComposer,
    $$CachedListsTableAnnotationComposer,
    $$CachedListsTableCreateCompanionBuilder,
    $$CachedListsTableUpdateCompanionBuilder,
    (CachedList, BaseReferences<_$AppDatabase, $CachedListsTable, CachedList>),
    CachedList,
    PrefetchHooks Function()> {
  $$CachedListsTableTableManager(_$AppDatabase db, $CachedListsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CachedListsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CachedListsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CachedListsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> code = const Value.absent(),
            Value<String> name = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<String> campaignId = const Value.absent(),
            Value<String> campaignCode = const Value.absent(),
            Value<String> campaignName = const Value.absent(),
            Value<String> campaignStatus = const Value.absent(),
            Value<String> methodCode = const Value.absent(),
            Value<int> totalItems = const Value.absent(),
            Value<int> countedItems = const Value.absent(),
            Value<DateTime?> syncedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              CachedListsCompanion(
            id: id,
            code: code,
            name: name,
            status: status,
            campaignId: campaignId,
            campaignCode: campaignCode,
            campaignName: campaignName,
            campaignStatus: campaignStatus,
            methodCode: methodCode,
            totalItems: totalItems,
            countedItems: countedItems,
            syncedAt: syncedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String code,
            required String name,
            required String status,
            required String campaignId,
            required String campaignCode,
            required String campaignName,
            required String campaignStatus,
            required String methodCode,
            Value<int> totalItems = const Value.absent(),
            Value<int> countedItems = const Value.absent(),
            Value<DateTime?> syncedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              CachedListsCompanion.insert(
            id: id,
            code: code,
            name: name,
            status: status,
            campaignId: campaignId,
            campaignCode: campaignCode,
            campaignName: campaignName,
            campaignStatus: campaignStatus,
            methodCode: methodCode,
            totalItems: totalItems,
            countedItems: countedItems,
            syncedAt: syncedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable<$CachedListsTable, CachedList>(table),
                    BaseReferences<_$AppDatabase, $CachedListsTable,
                        CachedList>(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$CachedListsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $CachedListsTable,
    CachedList,
    $$CachedListsTableFilterComposer,
    $$CachedListsTableOrderingComposer,
    $$CachedListsTableAnnotationComposer,
    $$CachedListsTableCreateCompanionBuilder,
    $$CachedListsTableUpdateCompanionBuilder,
    (CachedList, BaseReferences<_$AppDatabase, $CachedListsTable, CachedList>),
    CachedList,
    PrefetchHooks Function()>;
typedef $$PendingCountsTableCreateCompanionBuilder = PendingCountsCompanion
    Function({
  required String clientUuid,
  required String itemId,
  required String listId,
  required double quantity,
  required DateTime countedAt,
  Value<String?> note,
  Value<String> state,
  Value<String?> failureReason,
  Value<int> attempts,
  Value<DateTime?> lastAttemptAt,
  Value<int> rowid,
});
typedef $$PendingCountsTableUpdateCompanionBuilder = PendingCountsCompanion
    Function({
  Value<String> clientUuid,
  Value<String> itemId,
  Value<String> listId,
  Value<double> quantity,
  Value<DateTime> countedAt,
  Value<String?> note,
  Value<String> state,
  Value<String?> failureReason,
  Value<int> attempts,
  Value<DateTime?> lastAttemptAt,
  Value<int> rowid,
});

class $$PendingCountsTableFilterComposer
    extends Composer<_$AppDatabase, $PendingCountsTable> {
  $$PendingCountsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get clientUuid => $composableBuilder(
      column: $table.clientUuid, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get itemId => $composableBuilder(
      column: $table.itemId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get listId => $composableBuilder(
      column: $table.listId, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get quantity => $composableBuilder(
      column: $table.quantity, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get countedAt => $composableBuilder(
      column: $table.countedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get note => $composableBuilder(
      column: $table.note, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get state => $composableBuilder(
      column: $table.state, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get failureReason => $composableBuilder(
      column: $table.failureReason, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get attempts => $composableBuilder(
      column: $table.attempts, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get lastAttemptAt => $composableBuilder(
      column: $table.lastAttemptAt, builder: (column) => ColumnFilters(column));
}

class $$PendingCountsTableOrderingComposer
    extends Composer<_$AppDatabase, $PendingCountsTable> {
  $$PendingCountsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get clientUuid => $composableBuilder(
      column: $table.clientUuid, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get itemId => $composableBuilder(
      column: $table.itemId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get listId => $composableBuilder(
      column: $table.listId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get quantity => $composableBuilder(
      column: $table.quantity, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get countedAt => $composableBuilder(
      column: $table.countedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get note => $composableBuilder(
      column: $table.note, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get state => $composableBuilder(
      column: $table.state, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get failureReason => $composableBuilder(
      column: $table.failureReason,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get attempts => $composableBuilder(
      column: $table.attempts, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get lastAttemptAt => $composableBuilder(
      column: $table.lastAttemptAt,
      builder: (column) => ColumnOrderings(column));
}

class $$PendingCountsTableAnnotationComposer
    extends Composer<_$AppDatabase, $PendingCountsTable> {
  $$PendingCountsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get clientUuid => $composableBuilder(
      column: $table.clientUuid, builder: (column) => column);

  GeneratedColumn<String> get itemId =>
      $composableBuilder(column: $table.itemId, builder: (column) => column);

  GeneratedColumn<String> get listId =>
      $composableBuilder(column: $table.listId, builder: (column) => column);

  GeneratedColumn<double> get quantity =>
      $composableBuilder(column: $table.quantity, builder: (column) => column);

  GeneratedColumn<DateTime> get countedAt =>
      $composableBuilder(column: $table.countedAt, builder: (column) => column);

  GeneratedColumn<String> get note =>
      $composableBuilder(column: $table.note, builder: (column) => column);

  GeneratedColumn<String> get state =>
      $composableBuilder(column: $table.state, builder: (column) => column);

  GeneratedColumn<String> get failureReason => $composableBuilder(
      column: $table.failureReason, builder: (column) => column);

  GeneratedColumn<int> get attempts =>
      $composableBuilder(column: $table.attempts, builder: (column) => column);

  GeneratedColumn<DateTime> get lastAttemptAt => $composableBuilder(
      column: $table.lastAttemptAt, builder: (column) => column);
}

class $$PendingCountsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $PendingCountsTable,
    PendingCount,
    $$PendingCountsTableFilterComposer,
    $$PendingCountsTableOrderingComposer,
    $$PendingCountsTableAnnotationComposer,
    $$PendingCountsTableCreateCompanionBuilder,
    $$PendingCountsTableUpdateCompanionBuilder,
    (
      PendingCount,
      BaseReferences<_$AppDatabase, $PendingCountsTable, PendingCount>
    ),
    PendingCount,
    PrefetchHooks Function()> {
  $$PendingCountsTableTableManager(_$AppDatabase db, $PendingCountsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PendingCountsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PendingCountsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$PendingCountsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> clientUuid = const Value.absent(),
            Value<String> itemId = const Value.absent(),
            Value<String> listId = const Value.absent(),
            Value<double> quantity = const Value.absent(),
            Value<DateTime> countedAt = const Value.absent(),
            Value<String?> note = const Value.absent(),
            Value<String> state = const Value.absent(),
            Value<String?> failureReason = const Value.absent(),
            Value<int> attempts = const Value.absent(),
            Value<DateTime?> lastAttemptAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              PendingCountsCompanion(
            clientUuid: clientUuid,
            itemId: itemId,
            listId: listId,
            quantity: quantity,
            countedAt: countedAt,
            note: note,
            state: state,
            failureReason: failureReason,
            attempts: attempts,
            lastAttemptAt: lastAttemptAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String clientUuid,
            required String itemId,
            required String listId,
            required double quantity,
            required DateTime countedAt,
            Value<String?> note = const Value.absent(),
            Value<String> state = const Value.absent(),
            Value<String?> failureReason = const Value.absent(),
            Value<int> attempts = const Value.absent(),
            Value<DateTime?> lastAttemptAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              PendingCountsCompanion.insert(
            clientUuid: clientUuid,
            itemId: itemId,
            listId: listId,
            quantity: quantity,
            countedAt: countedAt,
            note: note,
            state: state,
            failureReason: failureReason,
            attempts: attempts,
            lastAttemptAt: lastAttemptAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable<$PendingCountsTable, PendingCount>(table),
                    BaseReferences<_$AppDatabase, $PendingCountsTable,
                        PendingCount>(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$PendingCountsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $PendingCountsTable,
    PendingCount,
    $$PendingCountsTableFilterComposer,
    $$PendingCountsTableOrderingComposer,
    $$PendingCountsTableAnnotationComposer,
    $$PendingCountsTableCreateCompanionBuilder,
    $$PendingCountsTableUpdateCompanionBuilder,
    (
      PendingCount,
      BaseReferences<_$AppDatabase, $PendingCountsTable, PendingCount>
    ),
    PendingCount,
    PrefetchHooks Function()>;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$CachedItemsTableTableManager get cachedItems =>
      $$CachedItemsTableTableManager(_db, _db.cachedItems);
  $$CachedListsTableTableManager get cachedLists =>
      $$CachedListsTableTableManager(_db, _db.cachedLists);
  $$PendingCountsTableTableManager get pendingCounts =>
      $$PendingCountsTableTableManager(_db, _db.pendingCounts);
}
