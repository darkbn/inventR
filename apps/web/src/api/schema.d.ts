/**
 * Fichier généré — ne pas modifier à la main.
 * Source : http://localhost:3000/api/v1/docs-json
 * Régénérer avec : pnpm --filter @inventair/web gen:api
 */
export interface paths {
    "/api/v1/activity-logs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consulter le journal d’activité
         * @description Réservé aux administrateurs. Trace les actions sensibles : création et modification de comptes, imports, comptages, clôtures, fusions d’emplacements. Trié du plus récent au plus ancien.
         */
        get: operations["ActivityLogsController_findAll"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Connexion
         * @description L'identifiant accepté est indifféremment l'adresse e-mail ou le nom d'utilisateur. En cas d'échec, la réponse est volontairement identique quelle que soit la cause (compte inconnu, mot de passe erroné, compte désactivé) afin de ne pas permettre d'énumérer les comptes.
         */
        post: operations["AuthController_login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Renouvellement des jetons
         * @description Échange un jeton de rafraîchissement valide contre un nouveau couple de jetons. L'ancien jeton est immédiatement révoqué (rotation). Présenter un jeton déjà révoqué est interprété comme un vol de session : toutes les sessions de l'utilisateur sont alors invalidées.
         */
        post: operations["AuthController_refresh"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Déconnexion de la session courante
         * @description Révoque le jeton de rafraîchissement fourni. Opération idempotente : rejouer la déconnexion ne provoque pas d'erreur.
         */
        post: operations["AuthController_logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout-all": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Déconnexion de toutes les sessions
         * @description Révoque l'ensemble des jetons de rafraîchissement du compte, tous appareils confondus. À utiliser en cas de perte ou de vol de terminal.
         */
        post: operations["AuthController_logoutAll"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Profil de l’utilisateur connecté
         * @description Renvoie le profil à jour, rechargé depuis la base. Utilisé par le web et le mobile au démarrage pour vérifier la validité de la session.
         */
        get: operations["AuthController_me"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * État de santé de l'API
         * @description Vérifie la connectivité à PostgreSQL. Utilisé par le healthcheck Docker et par le reverse proxy. Renvoie 503 si la base est injoignable.
         */
        get: operations["HealthController_check"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Lister les comptes
         * @description La liste est filtrée selon le rôle de l’appelant : un superviseur ne voit jamais les comptes administrateurs, même en filtrant explicitement dessus.
         */
        get: operations["UsersController_findAll"];
        put?: never;
        /**
         * Créer un compte
         * @description Un superviseur ne peut créer que des comptes de rôle USER.
         */
        post: operations["UsersController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/users/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consulter un compte */
        get: operations["UsersController_findOne"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Modifier un profil */
        patch: operations["UsersController_update"];
        trace?: never;
    };
    "/api/v1/users/me/password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Changer son propre mot de passe
         * @description Exige le mot de passe actuel. Toutes les sessions sont révoquées : il faut se reconnecter sur chaque appareil.
         */
        patch: operations["UsersController_changeOwnPassword"];
        trace?: never;
    };
    "/api/v1/users/{id}/role": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Modifier le rôle d’un compte
         * @description Révoque les sessions du compte pour que le nouveau périmètre prenne effet immédiatement. Le dernier administrateur actif ne peut pas être rétrogradé.
         */
        patch: operations["UsersController_updateRole"];
        trace?: never;
    };
    "/api/v1/users/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Activer ou désactiver un compte
         * @description Les comptes ne sont jamais supprimés — leurs comptages doivent rester imputables — mais désactivés. La désactivation révoque les sessions ouvertes.
         */
        patch: operations["UsersController_updateStatus"];
        trace?: never;
    };
    "/api/v1/users/{id}/password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Réinitialiser le mot de passe d’un compte
         * @description Révoque toutes les sessions du compte concerné.
         */
        patch: operations["UsersController_resetPassword"];
        trace?: never;
    };
    "/api/v1/warehouses": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lister les magasins */
        get: operations["WarehousesController_findAll"];
        put?: never;
        /**
         * Créer un magasin
         * @description Crée également l’emplacement virtuel NON-LOCALISE du magasin, indispensable pour rattacher les lignes importées sans emplacement.
         */
        post: operations["WarehousesController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/warehouses/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consulter un magasin */
        get: operations["WarehousesController_findOne"];
        put?: never;
        post?: never;
        /**
         * Désactiver un magasin
         * @description Refusé tant que le magasin porte des campagnes non clôturées.
         */
        delete: operations["WarehousesController_deactivate"];
        options?: never;
        head?: never;
        /** Modifier un magasin */
        patch: operations["WarehousesController_update"];
        trace?: never;
    };
    "/api/v1/locations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Lister les emplacements
         * @description Triés dans l’ordre physique du parcours en entrepôt : allée, travée, niveau, case — en ordre numérique, donc « 2- » avant « 10- ».
         */
        get: operations["LocationsController_findAll"];
        put?: never;
        /** Créer un emplacement */
        post: operations["LocationsController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/locations/variants/{warehouseId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Détecter les variantes orthographiques
         * @description Repère les emplacements dont le libellé est probablement une variante d’un autre (par exemple « ARMOIR CONSM » et « ARMOIRE CONSM »), afin de les fusionner. Les codes structurés sont exclus : « 1-1-A-7 » et « 1-1-B-7 » sont proches mais bien distincts.
         */
        get: operations["LocationsController_findVariants"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/locations/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consulter un emplacement */
        get: operations["LocationsController_findOne"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Modifier un emplacement */
        patch: operations["LocationsController_update"];
        trace?: never;
    };
    "/api/v1/locations/{id}/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Fusionner un emplacement dans un autre
         * @description Réaffecte toutes les lignes d’inventaire de l’emplacement courant vers l’emplacement cible, puis désactive le premier. Opération transactionnelle, refusée si un article se retrouverait en double dans une même liste.
         */
        post: operations["LocationsController_merge"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Lister les catégories
         * @description Accessible à tout compte authentifié : le mobile en a besoin pour filtrer.
         */
        get: operations["CategoriesController_findAll"];
        put?: never;
        /** Créer une catégorie */
        post: operations["CategoriesController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/categories/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consulter une catégorie */
        get: operations["CategoriesController_findOne"];
        put?: never;
        post?: never;
        /**
         * Désactiver une catégorie
         * @description Aucune suppression physique : des articles et des comptages historiques référencent la catégorie. Elle est simplement rendue inactive.
         */
        delete: operations["CategoriesController_deactivate"];
        options?: never;
        head?: never;
        /** Modifier une catégorie */
        patch: operations["CategoriesController_update"];
        trace?: never;
    };
    "/api/v1/articles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Lister et rechercher des articles
         * @description La recherche porte sur le code, la désignation, la marque et la référence fabricant. Le prix moyen pondéré n’est renvoyé qu’aux rôles ADMIN et SUPERVISOR.
         */
        get: operations["ArticlesController_findAll"];
        put?: never;
        /** Créer un article */
        post: operations["ArticlesController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/articles/by-code/{code}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Retrouver un article par son code exact
         * @description Chemin emprunté par l’application mobile après la lecture d’un QR code.
         */
        get: operations["ArticlesController_findByCode"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/articles/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consulter un article */
        get: operations["ArticlesController_findOne"];
        put?: never;
        post?: never;
        /**
         * Désactiver un article
         * @description Aucune suppression physique : des campagnes clôturées référencent l’article et doivent rester consultables.
         */
        delete: operations["ArticlesController_deactivate"];
        options?: never;
        head?: never;
        /**
         * Modifier un article
         * @description Le code article est immuable : il identifie la pièce dans le système source.
         */
        patch: operations["ArticlesController_update"];
        trace?: never;
    };
    "/api/v1/campaign-types": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Lister les types de campagne
         * @description Matière première, pièces de rechange, produits finis — et tout type ajouté ensuite : il s’agit d’une table, pas d’une énumération figée.
         */
        get: operations["CampaignTypesController_findAll"];
        put?: never;
        /** Créer un type de campagne */
        post: operations["CampaignTypesController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaign-types/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consulter un type de campagne */
        get: operations["CampaignTypesController_findOne"];
        put?: never;
        post?: never;
        /** Désactiver un type de campagne */
        delete: operations["CampaignTypesController_deactivate"];
        options?: never;
        head?: never;
        /** Modifier un type de campagne */
        patch: operations["CampaignTypesController_update"];
        trace?: never;
    };
    "/api/v1/inventory-methods": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Lister les méthodes de calcul
         * @description Méthode 1 (somme cumulative) et Méthode 2 (double comptage contradictoire). La structure est extensible : ajouter une méthode consiste à insérer une ligne ici et à enregistrer la stratégie correspondante côté service.
         */
        get: operations["InventoryMethodsController_findAll"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/inventory-methods/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consulter une méthode */
        get: operations["InventoryMethodsController_findOne"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Modifier le libellé ou la description d’une méthode
         * @description Ni le code ni la configuration de calcul ne sont modifiables : ils détermineraient rétroactivement le résultat de campagnes en cours.
         */
        patch: operations["InventoryMethodsController_update"];
        trace?: never;
    };
    "/api/v1/campaigns": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Lister les campagnes
         * @description Un opérateur ne voit que les campagnes dans lesquelles une liste lui est attribuée.
         */
        get: operations["CampaignsController_findAll"];
        put?: never;
        /**
         * Créer une campagne
         * @description La campagne est créée en préparation (DRAFT) : aucun comptage n’est possible.
         */
        post: operations["CampaignsController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consulter une campagne */
        get: operations["CampaignsController_findOne"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Modifier une campagne
         * @description Possible tant que la campagne est en préparation ou ouverte. La méthode de calcul ne peut plus changer dès le premier comptage enregistré : elle réinterpréterait des saisies déjà faites.
         */
        patch: operations["CampaignsController_update"];
        trace?: never;
    };
    "/api/v1/campaigns/{id}/open": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Ouvrir la campagne au comptage
         * @description Active les listes, qui deviennent visibles des opérateurs affectés. Refusé si la campagne ne comporte aucune ligne.
         */
        post: operations["CampaignsController_open"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{id}/closure-readiness": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Bilan avant clôture
         * @description Indique combien de lignes passeront à 0 et ce qui bloque encore la clôture. Fournit aussi le texte d’avertissement à afficher, afin que le web et le mobile présentent exactement le même message.
         */
        get: operations["CampaignsController_closureReadiness"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{id}/close": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Clôturer la campagne
         * @description Opération irréversible. Exige `confirmZeroMissing: true` : les articles non trouvés sont alors mis à quantité 0. Refusée tant qu’une ligne attend un second comptage ou qu’un litige n’est pas tranché. Tout se fait dans une seule transaction.
         */
        post: operations["CampaignsController_close"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{id}/reopen": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Rouvrir une campagne clôturée
         * @description Action administrative exceptionnelle, réservée au rôle ADMIN et exigeant un motif écrit. Refusée si un passage suivant a déjà été créé.
         */
        post: operations["CampaignsController_reopen"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{id}/next-round": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Créer le passage suivant
         * @description Crée une nouvelle campagne à partir des résultats de celle-ci, en ne reprenant que les lignes en écart, non trouvées ou litigieuses. La quantité théorique du nouveau passage est, par défaut, la quantité finale du précédent. Les affectations sont reconduites.
         */
        post: operations["CampaignsController_nextRound"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{id}/assignments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Affecter une personne à la campagne
         * @description Toute modification d’affectation est historisée.
         */
        post: operations["CampaignsController_assignUser"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{id}/assignments/{userId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Retirer une personne de la campagne
         * @description Le retrait est historisé au même titre que l’affectation.
         */
        delete: operations["CampaignsController_unassignUser"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/my/lists": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Mes listes attribuées
         * @description Écran d’accueil de l’application mobile. Ne renvoie que les listes attribuées à l’utilisateur connecté, sur des campagnes effectivement ouvertes au comptage, avec leur avancement.
         */
        get: operations["InventoryListsController_findMine"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/lists": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Lister les listes d’inventaire
         * @description Un opérateur ne voit que les listes qui lui sont attribuées.
         */
        get: operations["InventoryListsController_findAll"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/lists/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consulter une liste */
        get: operations["InventoryListsController_findOne"];
        put?: never;
        post?: never;
        /**
         * Supprimer une liste
         * @description Possible uniquement tant qu’aucun comptage n’a été enregistré : supprimer des comptages effacerait le travail réalisé sur le terrain.
         */
        delete: operations["InventoryListsController_remove"];
        options?: never;
        head?: never;
        /** Modifier une liste */
        patch: operations["InventoryListsController_update"];
        trace?: never;
    };
    "/api/v1/lists/{id}/assignment-history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Historique des affectations d’une liste
         * @description Retrace les affectations et les retraits, avec leur auteur et leur date — toute modification d’affectation est historisée.
         */
        get: operations["InventoryListsController_assignmentHistory"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{campaignId}/lists": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Créer une liste dans une campagne */
        post: operations["InventoryListsController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/lists/{id}/assignments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Attribuer la liste à un opérateur
         * @description L’opérateur est également rattaché à la campagne, sans quoi il ne la verrait pas. L’opération est historisée.
         */
        post: operations["InventoryListsController_assignUser"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/lists/{id}/assignments/{userId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Retirer un opérateur de la liste */
        delete: operations["InventoryListsController_unassignUser"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/lists/{listId}/items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Lignes d’une liste
         * @description Écran de comptage. Tri par défaut : emplacement dans l’ordre physique de parcours, puis désignation. Les filtres `remaining` et `counted` sont relatifs à l’utilisateur connecté — en double comptage, une ligne traitée par un collègue reste à compter pour moi.
         */
        get: operations["InventoryItemsController_findByList"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/items/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Consulter une ligne */
        get: operations["InventoryItemsController_findOne"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/items/{id}/not-found": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Annuler une déclaration « introuvable » */
        delete: operations["InventoryItemsController_clearNotFound"];
        options?: never;
        head?: never;
        /**
         * Déclarer un article introuvable
         * @description La quantité n’est pas mise à 0 pour autant : cela n’arrive qu’à la clôture, après confirmation explicite du superviseur. Un comptage ultérieur annule la déclaration, l’observation positive l’emportant.
         */
        patch: operations["InventoryItemsController_markNotFound"];
        trace?: never;
    };
    "/api/v1/items/{id}/arbitrate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Arbitrer un litige
         * @description Réservé au superviseur. La quantité saisie prime sur tous les comptages et débloque la clôture. Le motif est obligatoire : la décision engage le résultat de l’inventaire.
         */
        patch: operations["InventoryItemsController_arbitrate"];
        trace?: never;
    };
    "/api/v1/items/{itemId}/counts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Historique des comptages d’une ligne
         * @description Qui a compté quoi, et quand — comptages annulés compris.
         */
        get: operations["CountsController_findByItem"];
        put?: never;
        /**
         * Enregistrer un comptage
         * @description Idempotent sur `clientUuid` : si la réponse se perd et que le terminal réémet, le comptage existant est renvoyé plutôt que dupliqué. C’est ce qui rend la saisie sûre en réseau instable.
         */
        post: operations["CountsController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/counts/sync": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Synchroniser la file d’attente hors ligne
         * @description Envoi groupé des comptages accumulés hors réseau. Chaque entrée est traitée indépendamment : une ligne rejetée ne fait pas échouer le lot, sinon le terminal resterait bloqué avec une file inexploitable. Le résultat est détaillé comptage par comptage pour que le client purge sa file en connaissance de cause.
         */
        post: operations["CountsController_sync"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/my/counts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Mes derniers comptages
         * @description Écran « historique » de l’application mobile.
         */
        get: operations["CountsController_findMine"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/counts/{id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Annuler un comptage
         * @description Le comptage n’est jamais supprimé : il reste au dossier avec son auteur, sa date et le motif d’annulation. Seule son exclusion du calcul change. Un opérateur ne peut annuler que ses propres saisies.
         */
        patch: operations["CountsController_cancel"];
        trace?: never;
    };
    "/api/v1/imports/template.xlsx": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Télécharger le modèle d’import
         * @description Modèle officiel au format Excel : feuille de données avec exemples, notice détaillant chaque colonne, et liste des unités. Les en-têtes reprennent exactement ceux de l’export ERP, afin qu’un fichier extrait du système puisse être déposé sans retouche. Librement accessible pour pouvoir être récupéré depuis un poste non connecté.
         */
        get: operations["ImportsController_downloadTemplate"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/lists/{listId}/imports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Historique des imports d’une liste */
        get: operations["ImportsController_findByList"];
        put?: never;
        /**
         * Déposer et analyser un fichier d’inventaire
         * @description Analyse seule : **aucune donnée métier n’est modifiée**. Produit un rapport ligne par ligne — erreurs bloquantes et avertissements — que le superviseur examine avant d’appliquer l’import.
         */
        post: operations["ImportsController_analyze"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/imports/{id}/apply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Appliquer un import validé
         * @description Écrit les lignes d’inventaire en une seule transaction : articles et emplacements inconnus sont créés au passage, les lignes déjà présentes voient leur quantité théorique actualisée. Le fichier est réanalysé depuis le disque pour garantir que ce qui est écrit correspond bien à ce qui a été examiné.
         */
        post: operations["ImportsController_apply"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/imports/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Consulter un import
         * @description Rapport complet, erreurs et avertissements compris.
         */
        get: operations["ImportsController_findOne"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/imports/{id}/reject": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Abandonner un import non appliqué
         * @description Supprime le fichier déposé. Impossible une fois l’import appliqué.
         */
        post: operations["ImportsController_reject"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/campaigns/{id}/dashboard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Tableau de bord d’une campagne
         * @description Avancement, écarts, répartition par liste et activité par opérateur. Les lignes à quantité théorique nulle sont exclues par défaut : elles représentent 47 % du fichier de référence et noieraient les indicateurs.
         */
        get: operations["ReportsController_dashboard"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/campaigns/{id}/by-user": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Activité de comptage par opérateur
         * @description Qui a compté quoi, combien de lignes, et sur quelle plage horaire.
         */
        get: operations["ReportsController_byUser"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/campaigns/{id}.xlsx": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Rapport de campagne au format Excel
         * @description Quatre feuilles : synthèse, détail exhaustif des lignes (écarts surlignés), journal des comptages, et activité par opérateur. C’est la pièce destinée au rapprochement avec l’ERP et à l’archivage.
         */
        get: operations["ReportsController_excel"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports/campaigns/{id}.pdf": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Rapport de campagne au format PDF
         * @description Synthèse destinée à être signée et archivée : avancement, écarts, litiges et activité des opérateurs. Le détail des lignes en écart est limité pour rester lisible — l’exhaustivité relève de l’export Excel.
         */
        get: operations["ReportsController_pdf"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/qr/articles/{code}.png": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * QR code d’un article
         * @description Encode `{"t":"ART","c":"<code>"}`. Le scanner mobile accepte aussi un QR ne contenant que le code nu, afin de rester compatible avec les étiquettes fournisseur déjà posées.
         */
        get: operations["QrController_articleQr"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/qr/locations/{id}.png": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * QR code d’un emplacement
         * @description Encode `{"t":"LOC","c":"<code>"}`.
         */
        get: operations["QrController_locationQr"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/qr/lists/{listId}/labels.pdf": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Planche d’étiquettes QR d’une liste
         * @description Grille de 3 étiquettes par rangée, dans l’ordre physique de parcours de l’entrepôt. Chaque étiquette porte le QR code, le code article, la désignation abrégée et l’emplacement : elle reste exploitable à l’œil si le scanner échoue.
         */
        get: operations["QrController_listLabels"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        PaginationMetaDto: {
            /** @example 1 */
            page: number;
            /** @example 25 */
            limit: number;
            /**
             * @description Nombre total d'éléments correspondant au filtre.
             * @example 7961
             */
            total: number;
            /** @example 319 */
            totalPages: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
        PaginatedDto: {
            meta: components["schemas"]["PaginationMetaDto"];
        };
        ActivityLogActorDto: {
            /** Format: uuid */
            id: string;
            username: string;
            fullName: string;
        };
        ActivityLogDto: {
            /** Format: uuid */
            id: string;
            /** @description Auteur de l’action. Nul si le compte a été supprimé. */
            actor?: components["schemas"]["ActivityLogActorDto"] | null;
            /** @example USER_CHANGE_ROLE */
            action: string;
            /** @example User */
            entityType: string;
            entityId?: string | null;
            /** @description Contexte de l’action, sans aucune donnée sensible. */
            metadata: Record<string, never>;
            ip?: string | null;
            userAgent?: string | null;
            /** Format: date-time */
            createdAt: string;
        };
        LoginDto: {
            /**
             * @description Adresse e-mail ou nom d'utilisateur.
             * @example admin@inventair.local
             */
            login: string;
            /**
             * @description Mot de passe du compte.
             * @example MotDePasseRobuste123
             */
            password: string;
        };
        /** @enum {string} */
        Role: "ADMIN" | "SUPERVISOR" | "USER";
        UserProfileDto: {
            /** Format: uuid */
            id: string;
            /** @example admin@inventair.local */
            email: string;
            /** @example admin */
            username: string;
            /** @example Administrateur InventAir */
            fullName: string;
            role: components["schemas"]["Role"];
            /** @description Un compte désactivé ne peut plus se connecter. */
            isActive: boolean;
            /**
             * Format: date-time
             * @description Dernière connexion réussie.
             */
            lastLoginAt?: string | null;
        };
        AuthTokensDto: {
            /** @description Jeton d'accès à placer dans l'en-tête Authorization. */
            accessToken: string;
            /** @description Jeton de rafraîchissement, à conserver de manière sécurisée. */
            refreshToken: string;
            /** @example Bearer */
            tokenType: string;
            /**
             * @description Durée de validité restante du jeton d'accès, en secondes.
             * @example 900
             */
            expiresIn: number;
            user: components["schemas"]["UserProfileDto"];
        };
        RefreshTokenDto: {
            /**
             * @description Jeton de rafraîchissement obtenu lors de la connexion.
             * @example eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…
             */
            refreshToken: string;
        };
        LogoutResponseDto: {
            /** @example Déconnexion effectuée. */
            message: string;
        };
        DependencyHealthDto: {
            /**
             * @description État de la dépendance
             * @enum {string}
             */
            status: "up" | "down";
            /**
             * @description Temps de réponse en millisecondes
             * @example 3
             */
            latencyMs: number;
            /** @description Motif de l'indisponibilité */
            error?: string;
        };
        HealthChecksDto: {
            database: components["schemas"]["DependencyHealthDto"];
        };
        HealthCheckDto: {
            /** @enum {string} */
            status: "ok" | "error";
            /** @description Horodatage ISO 8601 de la vérification */
            timestamp: string;
            /** @description Durée de fonctionnement du processus, en secondes */
            uptimeSeconds: number;
            /** @description Version de l'API */
            version: string;
            checks: components["schemas"]["HealthChecksDto"];
        };
        UserDto: {
            /** Format: uuid */
            id: string;
            /** @example k.benali@inventair.local */
            email: string;
            /** @example k.benali */
            username: string;
            /** @example Karim Benali */
            fullName: string;
            role: components["schemas"]["Role"];
            isActive: boolean;
            /** Format: date-time */
            lastLoginAt?: string | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        CreateUserDto: {
            /**
             * Format: email
             * @example k.benali@inventair.local
             */
            email: string;
            /**
             * @description Identifiant court, pratique à saisir sur un terminal d'entrepôt. Lettres, chiffres, point, tiret et tiret bas.
             * @example k.benali
             */
            username: string;
            /** @example Karim Benali */
            fullName: string;
            /** @description Au moins 12 caractères, dont une lettre et un chiffre. */
            password: string;
            /** @description Un superviseur ne peut créer que des comptes de rôle USER ; seul un administrateur peut attribuer les rôles ADMIN et SUPERVISOR. */
            role: components["schemas"]["Role"];
            /** @default true */
            isActive: boolean;
        };
        ChangePasswordDto: {
            newPassword: string;
            /** @description Mot de passe actuel, exigé pour confirmer l’identité. */
            currentPassword: string;
        };
        UpdateUserDto: {
            /**
             * Format: email
             * @example k.benali@inventair.local
             */
            email?: string;
            /**
             * @description Identifiant court, pratique à saisir sur un terminal d'entrepôt. Lettres, chiffres, point, tiret et tiret bas.
             * @example k.benali
             */
            username?: string;
            /** @example Karim Benali */
            fullName?: string;
        };
        UpdateUserRoleDto: {
            role: components["schemas"]["Role"];
        };
        UpdateUserStatusDto: {
            /** @description false désactive le compte : connexion impossible et sessions révoquées. */
            isActive: boolean;
            /** @description Motif, conservé au journal. */
            reason?: string;
        };
        ResetPasswordDto: {
            newPassword: string;
        };
        WarehouseDto: {
            /** Format: uuid */
            id: string;
            /** @example 19R01 */
            code: string;
            /** @example MAGASIN PDR BOUFARIK */
            label: string;
            isActive: boolean;
            /** @description Nombre d'emplacements rattachés. */
            locationCount?: number;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        CreateWarehouseDto: {
            /**
             * @description Code magasin tel qu’il figure dans le système source.
             * @example 19R01
             */
            code: string;
            /** @example MAGASIN PDR BOUFARIK */
            label: string;
            /** @default true */
            isActive: boolean;
        };
        UpdateWarehouseDto: {
            /**
             * @description Code magasin tel qu’il figure dans le système source.
             * @example 19R01
             */
            code?: string;
            /** @example MAGASIN PDR BOUFARIK */
            label?: string;
            /** @default true */
            isActive: boolean;
        };
        LocationDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            warehouseId: string;
            /** @example 1-1-C-7 */
            code: string;
            label?: string | null;
            /**
             * @description Forme canonique : majuscules, sans accents, espaces compressés.
             * @example 1-1-C-7
             */
            normalizedCode: string;
            /** @description Allée, pour le tri physique. */
            aisle?: number | null;
            /** @description Travée. */
            bay?: number | null;
            /** @description Niveau. */
            level?: string | null;
            /** @description Case. */
            slot?: number | null;
            /** @description Emplacement fictif (NON-LOCALISE) rattachant les lignes sans emplacement renseigné. */
            isVirtual: boolean;
            isActive: boolean;
            /** @description Nombre de lignes d'inventaire à cet emplacement. */
            itemCount?: number;
        };
        Object: Record<string, never>;
        LocationVariantDto: {
            location: components["schemas"]["LocationDto"];
            /** @description Variantes orthographiques probables. */
            candidates: components["schemas"]["LocationDto"][];
        };
        CreateLocationDto: {
            /**
             * Format: uuid
             * @description Magasin de rattachement.
             */
            warehouseId: string;
            /**
             * @description Code tel qu’il figure sur l’étiquette. Les formats « allée-travée-niveau[-case] » sont automatiquement décomposés pour permettre un tri physique.
             * @example 1-1-C-7
             */
            code: string;
            label?: string;
            /** @default true */
            isActive: boolean;
        };
        UpdateLocationDto: {
            /**
             * @description Code tel qu’il figure sur l’étiquette. Les formats « allée-travée-niveau[-case] » sont automatiquement décomposés pour permettre un tri physique.
             * @example 1-1-C-7
             */
            code?: string;
            label?: string;
            /** @default true */
            isActive: boolean;
        };
        MergeLocationsDto: {
            /**
             * Format: uuid
             * @description Emplacement à conserver. Toutes les lignes d’inventaire de l’emplacement courant y seront rattachées, puis l’emplacement courant sera désactivé.
             */
            targetLocationId: string;
        };
        CategoryDto: {
            /** Format: uuid */
            id: string;
            /** @example ROULEMENTS */
            code: string;
            /** @example Roulements et paliers */
            label: string;
            isActive: boolean;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        CreateCategoryDto: {
            /**
             * @description Code technique, normalisé en majuscules. Lettres, chiffres, tirets.
             * @example ROULEMENTS
             */
            code: string;
            /** @example Roulements et paliers */
            label: string;
            /** @default true */
            isActive: boolean;
        };
        UpdateCategoryDto: {
            /**
             * @description Code technique, normalisé en majuscules. Lettres, chiffres, tirets.
             * @example ROULEMENTS
             */
            code?: string;
            /** @example Roulements et paliers */
            label?: string;
            /** @default true */
            isActive: boolean;
        };
        ArticleDto: {
            /** Format: uuid */
            id: string;
            /** @example ACCEL-0016 */
            code: string;
            /** @example PALIER REF: 0901323439 */
            designation: string;
            /**
             * @description Unité de gestion.
             * @example Unité
             */
            unit: string;
            /** @example KRONES */
            brand?: string | null;
            /** @example 0901323439 */
            manufacturerRef?: string | null;
            /** Format: uuid */
            categoryId?: string | null;
            /** Format: uuid */
            defaultLocationId?: string | null;
            /**
             * @description Dernier prix moyen pondéré connu. Réservé aux rôles ADMIN et SUPERVISOR : ce champ est absent des réponses faites à un opérateur.
             * @example 5689.2846
             */
            lastPmp?: number;
            isActive: boolean;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        CreateArticleDto: {
            /** @example ACCEL-0016 */
            code: string;
            /** @example PALIER REF: 0901323439 */
            designation: string;
            /** @default Unité */
            unit: string;
            /** @example KRONES */
            brand?: string;
            /** @example 0901323439 */
            manufacturerRef?: string;
            /** Format: uuid */
            categoryId?: string;
            /** Format: uuid */
            defaultLocationId?: string;
            /** @description Prix moyen pondéré. */
            lastPmp?: number;
            /** @default true */
            isActive: boolean;
        };
        UpdateArticleDto: {
            /** @example PALIER REF: 0901323439 */
            designation?: string;
            /** @default Unité */
            unit: string;
            /** @example KRONES */
            brand?: string;
            /** @example 0901323439 */
            manufacturerRef?: string;
            /** Format: uuid */
            categoryId?: string;
            /** Format: uuid */
            defaultLocationId?: string;
            /** @description Prix moyen pondéré. */
            lastPmp?: number;
            /** @default true */
            isActive: boolean;
        };
        CampaignTypeDto: {
            /** Format: uuid */
            id: string;
            /** @example SPARE_PARTS */
            code: string;
            /** @example Pièces de rechange (PDR) */
            label: string;
            isActive: boolean;
            /** @description Nombre de campagnes de ce type. */
            campaignCount?: number;
        };
        CreateCampaignTypeDto: {
            /**
             * @description Code technique. Les types sont une table et non une énumération figée : de nouveaux types peuvent être ajoutés sans migration de schéma.
             * @example CONSUMABLES
             */
            code: string;
            /** @example Consommables */
            label: string;
            /** @default true */
            isActive: boolean;
        };
        UpdateCampaignTypeDto: {
            /**
             * @description Code technique. Les types sont une table et non une énumération figée : de nouveaux types peuvent être ajoutés sans migration de schéma.
             * @example CONSUMABLES
             */
            code?: string;
            /** @example Consommables */
            label?: string;
            /** @default true */
            isActive: boolean;
        };
        InventoryMethodDto: {
            /** Format: uuid */
            id: string;
            /**
             * @description Code technique résolu par InventoryCalculationService. Il est immuable : le modifier détacherait la méthode de sa stratégie de calcul.
             * @example METHOD_2
             */
            code: string;
            /** @example Méthode 2 — Double comptage contradictoire */
            label: string;
            /** @description Règle de calcul, en clair. */
            description?: string | null;
            /**
             * @description Paramètres propres à la méthode (nombre de comptages requis, etc.).
             * @example {
             *       "minCounts": 2,
             *       "aggregation": "AGREEMENT",
             *       "requireDistinctCounters": true
             *     }
             */
            config: Record<string, never>;
            isActive: boolean;
            /** @description Nombre de campagnes utilisant cette méthode. */
            campaignCount?: number;
        };
        UpdateInventoryMethodDto: {
            label?: string;
            description?: string;
            isActive?: boolean;
        };
        /** @enum {string} */
        CampaignStatus: "DRAFT" | "OPEN" | "COUNTING" | "PENDING_CLOSURE" | "CLOSED";
        CampaignDto: {
            /** Format: uuid */
            id: string;
            /** @example INV-2026-PDR-01 */
            code: string;
            /** @example Inventaire annuel PDR Boufarik */
            name: string;
            /** Format: uuid */
            campaignTypeId: string;
            /** Format: uuid */
            inventoryMethodId: string;
            /** Format: uuid */
            warehouseId: string;
            status: components["schemas"]["CampaignStatus"];
            /**
             * @description Numéro de passage : 1 = campagne initiale, 2 = recomptage des écarts.
             * @example 1
             */
            round: number;
            /**
             * Format: uuid
             * @description Passage précédent.
             */
            parentCampaignId?: string | null;
            /** Format: date-time */
            startedAt?: string | null;
            /** Format: date-time */
            closedAt?: string | null;
            /** Format: uuid */
            closedById?: string | null;
            /**
             * Format: date-time
             * @description Horodatage de la mise à 0 des articles non trouvés, lors de la clôture.
             */
            missingZeroedAt?: string | null;
            /** Format: date-time */
            reopenedAt?: string | null;
            reopenReason?: string | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        CreateCampaignDto: {
            /** @example INV-2026-PDR-01 */
            code: string;
            /** @example Inventaire annuel PDR Boufarik */
            name: string;
            /**
             * Format: uuid
             * @description Matière première, PDR, produits finis…
             */
            campaignTypeId: string;
            /**
             * Format: uuid
             * @description Méthode de calcul appliquée à toutes les lignes de la campagne.
             */
            inventoryMethodId: string;
            /** Format: uuid */
            warehouseId: string;
        };
        UpdateCampaignDto: {
            /** @example Inventaire annuel PDR Boufarik */
            name?: string;
            /**
             * Format: uuid
             * @description Matière première, PDR, produits finis…
             */
            campaignTypeId?: string;
            /**
             * Format: uuid
             * @description Méthode de calcul appliquée à toutes les lignes de la campagne.
             */
            inventoryMethodId?: string;
        };
        ClosureReadinessDto: {
            canClose: boolean;
            /** @description Nombre total de lignes de la campagne. */
            totalItems: number;
            /** @description Lignes jamais comptées, qui passeront à 0. */
            pendingItems: number;
            /** @description Lignes déclarées introuvables, qui passeront à 0. */
            notFoundItems: number;
            /** @description Lignes en attente d’un second comptage (Méthode 2). */
            awaitingSecondCount: number;
            /** @description Litiges non tranchés (Méthode 2). */
            discrepancies: number;
            /** @description Lignes résolues. */
            resolvedItems: number;
            /** @description Raisons qui empêchent la clôture. Vide si la campagne est clôturable. */
            blockingReasons: string[];
            /**
             * @description Avertissement à présenter à l’utilisateur avant confirmation.
             * @example Les articles non trouvés seront mis à quantité 0. Voulez-vous continuer ?
             */
            warning: string;
        };
        CloseCampaignDto: {
            /**
             * @description Confirmation explicite de la mise à zéro des articles non trouvés. La clôture est refusée sans cette confirmation : c’est la contrepartie de l’avertissement affiché à l’utilisateur.
             * @example true
             */
            confirmZeroMissing: boolean;
            /** @description Commentaire de clôture, journalisé. */
            note?: string;
        };
        ReopenCampaignDto: {
            /** @description Motif de la réouverture. Obligatoire : la clôture est en principe définitive, toute exception doit être justifiée et tracée. */
            reason: string;
        };
        NextRoundDto: {
            /** @description Code de la nouvelle campagne. */
            code?: string;
            /**
             * Format: uuid
             * @description Méthode du nouveau passage. Par défaut, celle du passage précédent. Il est courant de basculer en Méthode 2 pour fiabiliser les écarts détectés.
             */
            inventoryMethodId?: string;
            /**
             * @description true conserve la quantité théorique d’origine. Par défaut, la quantité théorique du nouveau passage est la quantité finale du précédent : on recompte ce que l’on croit désormais détenir.
             * @default false
             */
            keepOriginalTheoretical: boolean;
        };
        AssignCampaignUserDto: {
            /** Format: uuid */
            userId: string;
        };
        /** @enum {string} */
        ListStatus: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
        MyListDto: {
            /** Format: uuid */
            id: string;
            /** @example ZONE-A */
            code: string;
            /** @example Zone A — allées 1 à 10 */
            name: string;
            status: components["schemas"]["ListStatus"];
            /** Format: uuid */
            campaignId: string;
            /** @example INV-2026-PDR-01 */
            campaignCode: string;
            /** @example Inventaire annuel PDR Boufarik */
            campaignName: string;
            campaignStatus: components["schemas"]["CampaignStatus"];
            /**
             * @description Méthode de calcul de la campagne.
             * @example METHOD_2
             */
            methodCode: string;
            /** @description Nombre total de lignes. */
            totalItems: number;
            /** @description Lignes déjà comptées par au moins un opérateur. */
            countedItems: number;
            /** @description Lignes restant à traiter. */
            remainingItems: number;
        };
        ListAssigneeDto: {
            /** Format: uuid */
            id: string;
            username: string;
            fullName: string;
        };
        InventoryListDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            campaignId: string;
            /** @example ZONE-A */
            code: string;
            /** @example Zone A — allées 1 à 10 */
            name: string;
            description?: string | null;
            status: components["schemas"]["ListStatus"];
            /** @description Nombre de lignes de la liste. */
            itemCount?: number;
            /** @description Opérateurs affectés. */
            assignees?: components["schemas"]["ListAssigneeDto"][];
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        AssignmentHistoryEntryDto: {
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            entityType: "CAMPAIGN" | "LIST";
            /** Format: uuid */
            entityId: string;
            /** @enum {string} */
            action: "ASSIGN" | "UNASSIGN";
            /** @description Personne concernée. */
            user: components["schemas"]["ListAssigneeDto"];
            /** @description Auteur de la modification. */
            performedBy?: components["schemas"]["ListAssigneeDto"] | null;
            /** Format: date-time */
            performedAt: string;
        };
        CreateInventoryListDto: {
            /** @example ZONE-A */
            code: string;
            /** @example Zone A — allées 1 à 10 */
            name: string;
            description?: string;
        };
        UpdateInventoryListDto: {
            /** @example Zone A — allées 1 à 10 */
            name?: string;
            description?: string;
            status?: components["schemas"]["ListStatus"];
        };
        AssignListUserDto: {
            /** Format: uuid */
            userId: string;
        };
        ItemArticleDto: {
            /** Format: uuid */
            id: string;
            /** @example ACCEL-0016 */
            code: string;
            /** @example PALIER REF: 0901323439 */
            designation: string;
            /** @example Unité */
            unit: string;
            /** @example KRONES */
            brand?: string | null;
            /** @example 0901323439 */
            manufacturerRef?: string | null;
        };
        ItemLocationDto: {
            /** Format: uuid */
            id: string;
            /** @example 1-1-C-7 */
            code: string;
            label?: string | null;
            /** @description Emplacement fictif regroupant les articles sans emplacement renseigné. */
            isVirtual: boolean;
        };
        /** @enum {string} */
        ItemStatus: "PENDING" | "COUNTED" | "AWAITING_SECOND_COUNT" | "DISCREPANCY" | "CONFIRMED" | "NOT_FOUND";
        InventoryItemDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            listId: string;
            article: components["schemas"]["ItemArticleDto"];
            location: components["schemas"]["ItemLocationDto"];
            /**
             * @description Quantité attendue, issue du fichier importé.
             * @example 2
             */
            theoreticalQty: number;
            /** @description Quantité retenue. Nulle tant que la ligne n’est pas résolue. */
            finalQty?: number | null;
            /** @description Valeur tranchée par le superviseur. */
            arbitratedQty?: number | null;
            status: components["schemas"]["ItemStatus"];
            /** @description Écart = quantité finale − quantité théorique. Positif = surplus. */
            variance?: number | null;
            /** @description Valeur de l’écart, au Pmp figé à l’import. Réservé aux rôles ADMIN et SUPERVISOR : absent des réponses faites à un opérateur. */
            varianceValue?: number | null;
            /** @description Prix unitaire figé à l’import. Réservé à ADMIN et SUPERVISOR. */
            unitPrice?: number;
            /** @description Nombre de comptages valides, tous opérateurs confondus. */
            countCount: number;
            /** @description L’utilisateur connecté a-t-il déjà compté cette ligne ? */
            countedByMe: boolean;
            /** @description Dernière quantité saisie par moi. */
            myLastQuantity?: number | null;
            /**
             * @description Numéro de ligne du fichier source.
             * @example 1
             */
            lineNo: number;
        };
        MarkNotFoundDto: {
            note?: string;
        };
        ArbitrateItemDto: {
            /** @description Quantité retenue par le superviseur. Prime sur tous les comptages et dénoue le litige. */
            quantity: number;
            /** @description Motif de l’arbitrage. Obligatoire : il engage le résultat de l’inventaire. */
            note: string;
        };
        /** @enum {string} */
        CountSource: "MOBILE" | "WEB";
        CreateCountDto: {
            /**
             * @description Quantité comptée. Trois décimales.
             * @example 12.5
             */
            quantity: number;
            /**
             * Format: uuid
             * @description UUID v4 généré par le client **avant** l’envoi. C’est la clé d’idempotence : un comptage rejoué après une coupure réseau n’est jamais enregistré deux fois.
             */
            clientUuid: string;
            /** @description Horodatage de la saisie sur le terrain, au format ISO 8601. En mode hors ligne, il peut précéder de plusieurs heures la réception par le serveur. */
            countedAt?: string;
            /** @default MOBILE */
            source: components["schemas"]["CountSource"];
            /** @description Identifiant du terminal. */
            deviceId?: string;
            note?: string;
        };
        /** @enum {string} */
        CountStatus: "VALID" | "CANCELLED";
        CountDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            itemId: string;
            /** Format: uuid */
            userId: string;
            /** @example k.benali */
            username: string;
            /** @example 12.5 */
            quantity: number;
            /**
             * Format: date-time
             * @description Date et heure du comptage, telles que saisies sur le terrain.
             */
            countedAt: string;
            source: components["schemas"]["CountSource"];
            /**
             * Format: uuid
             * @description Identifiant généré par le client, garant de l’idempotence.
             */
            clientUuid: string;
            deviceId?: string | null;
            note?: string | null;
            status: components["schemas"]["CountStatus"];
            /** Format: date-time */
            cancelledAt?: string | null;
        };
        SyncCountItemDto: {
            /**
             * @description Quantité comptée. Trois décimales.
             * @example 12.5
             */
            quantity: number;
            /**
             * Format: uuid
             * @description UUID v4 généré par le client **avant** l’envoi. C’est la clé d’idempotence : un comptage rejoué après une coupure réseau n’est jamais enregistré deux fois.
             */
            clientUuid: string;
            /** @description Horodatage de la saisie sur le terrain, au format ISO 8601. En mode hors ligne, il peut précéder de plusieurs heures la réception par le serveur. */
            countedAt?: string;
            /** @default MOBILE */
            source: components["schemas"]["CountSource"];
            /** @description Identifiant du terminal. */
            deviceId?: string;
            note?: string;
            /**
             * Format: uuid
             * @description Ligne d’inventaire concernée.
             */
            itemId: string;
        };
        SyncCountsDto: {
            /** @description File d’attente locale du terminal, envoyée dès le retour du réseau. */
            counts: components["schemas"]["SyncCountItemDto"][];
        };
        SyncResultEntryDto: {
            /** Format: uuid */
            clientUuid: string;
            /**
             * @description `duplicate` : comptage déjà enregistré, rejoué sans effet. Le terminal peut purger la ligne de sa file d’attente dans les deux premiers cas.
             * @enum {string}
             */
            outcome: "created" | "duplicate" | "rejected";
            /** @description Motif du rejet. */
            reason?: string | null;
        };
        SyncCountsResultDto: {
            received: number;
            created: number;
            /** @description Comptages déjà connus du serveur. */
            duplicates: number;
            rejected: number;
            /** @description Résultat par comptage, dans l’ordre d’envoi. */
            results: components["schemas"]["SyncResultEntryDto"][];
        };
        CancelCountDto: {
            /** @description Motif de l’annulation. */
            reason: string;
        };
        /** @enum {string} */
        ImportStatus: "PENDING" | "VALIDATED" | "APPLIED" | "REJECTED";
        ImportErrorDto: {
            /**
             * @description Numéro de ligne dans le fichier déposé.
             * @example 42
             */
            line: number;
            /** @example Quantite */
            column: string;
            /** @example QUANTITY_NEGATIVE */
            code: string;
            /** @example La quantité théorique ne peut pas être négative. */
            message: string;
            /** @description Valeur fautive, telle que lue. */
            value?: string | null;
        };
        ImportWarningDto: {
            /** @description Nul si l’avertissement porte sur le fichier entier. */
            line?: number | null;
            /** @example UNLOCATED_ROWS */
            code: string;
            message: string;
        };
        ImportBatchDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            listId: string;
            /** @example Stocks_14-06-2026.xlsx */
            filename: string;
            status: components["schemas"]["ImportStatus"];
            /**
             * @description Lignes de données lues dans le fichier.
             * @example 7961
             */
            rowsTotal: number;
            /**
             * @description Lignes valides, prêtes à être importées.
             * @example 7961
             */
            rowsOk: number;
            /**
             * @description Lignes rejetées.
             * @example 0
             */
            rowsError: number;
            /** @description Erreurs bloquantes, ligne par ligne. */
            errors: components["schemas"]["ImportErrorDto"][];
            /** @description Avertissements non bloquants. */
            warnings: components["schemas"]["ImportWarningDto"][];
            /** Format: date-time */
            appliedAt?: string | null;
            /** Format: date-time */
            createdAt: string;
        };
        ApplyImportResultDto: {
            /** Format: uuid */
            batchId: string;
            /** @description Lignes d’inventaire créées. */
            itemsCreated: number;
            /** @description Lignes d’inventaire mises à jour. */
            itemsUpdated: number;
            /** @description Articles créés au passage dans le référentiel. */
            articlesCreated: number;
            /** @description Emplacements créés au passage dans le référentiel. */
            locationsCreated: number;
            /** @description Durée de l’opération, en millisecondes. */
            durationMs: number;
        };
        CampaignProgressDto: {
            /** @description Lignes de la campagne, après application du filtre. */
            totalItems: number;
            /** @description Lignes jamais comptées. */
            pending: number;
            /** @description Lignes comptées (Méthode 1). */
            counted: number;
            /** @description Lignes confirmées (Méthode 2). */
            confirmed: number;
            /** @description Lignes en attente d’un second comptage. */
            awaitingSecondCount: number;
            /** @description Litiges non tranchés. */
            discrepancies: number;
            /** @description Lignes déclarées introuvables. */
            notFound: number;
            /**
             * @description Avancement, de 0 à 100.
             * @example 62.4
             */
            completionPercent: number;
        };
        VarianceSummaryDto: {
            /** @description Lignes en surplus (écart positif). */
            surplusCount: number;
            /** @description Lignes en manque (écart négatif). */
            shortageCount: number;
            /** @description Lignes conformes. */
            matchingCount: number;
            /** @description Total des quantités en surplus. */
            surplusQuantity: number;
            /** @description Total des quantités manquantes, en valeur absolue. */
            shortageQuantity: number;
            /** @description Valeur des surplus. Réservé aux rôles ADMIN et SUPERVISOR. */
            surplusValue?: number;
            /** @description Valeur des manques, en valeur absolue. */
            shortageValue?: number;
            /** @description Valeur nette de l’écart : surplus moins manques. */
            netValue?: number;
        };
        TopVarianceDto: {
            /** Format: uuid */
            itemId: string;
            /** @example ACCEL-0016 */
            articleCode: string;
            designation: string;
            /** @example 9-2-C-6 */
            locationCode: string;
            theoreticalQty: number;
            finalQty: number;
            /** @description Écart = quantité finale − quantité théorique. */
            variance: number;
            /** @description Valeur de l’écart. */
            varianceValue?: number;
        };
        ListProgressDto: {
            /** Format: uuid */
            listId: string;
            code: string;
            name: string;
            totalItems: number;
            handledItems: number;
            /** @example 48.3 */
            completionPercent: number;
            /** @description Opérateurs affectés. */
            assignees: string[];
        };
        CounterActivityDto: {
            /** Format: uuid */
            userId: string;
            username: string;
            fullName: string;
            /** @description Nombre de comptages valides enregistrés. */
            countEntries: number;
            /** @description Nombre de lignes distinctes couvertes. */
            itemsCovered: number;
            /** @description Somme des quantités saisies. */
            totalQuantity: number;
            /**
             * Format: date-time
             * @description Premier comptage.
             */
            firstCountAt?: string | null;
            /**
             * Format: date-time
             * @description Dernier comptage.
             */
            lastCountAt?: string | null;
        };
        CampaignDashboardDto: {
            /** Format: uuid */
            campaignId: string;
            /** @example INV-2026-PDR-01 */
            code: string;
            name: string;
            status: components["schemas"]["CampaignStatus"];
            /** @example 1 */
            round: number;
            /** @example METHOD_2 */
            methodCode: string;
            methodLabel: string;
            /** @example Pièces de rechange (PDR) */
            campaignTypeLabel: string;
            /** @example 19R01 */
            warehouseCode: string;
            /** @description Les lignes à quantité théorique nulle sont-elles exclues des indicateurs ? */
            zeroTheoreticalHidden: boolean;
            progress: components["schemas"]["CampaignProgressDto"];
            variance: components["schemas"]["VarianceSummaryDto"];
            /** @description Écarts les plus importants. */
            topVariances: components["schemas"]["TopVarianceDto"][];
            /** @description Avancement par liste. */
            lists: components["schemas"]["ListProgressDto"][];
            /** @description Activité par opérateur. */
            counters: components["schemas"]["CounterActivityDto"][];
            /** Format: date-time */
            startedAt?: string | null;
            /** Format: date-time */
            closedAt?: string | null;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    ActivityLogsController_findAll: {
        parameters: {
            query?: {
                /** @description Numéro de page, à partir de 1. */
                page?: number;
                /** @description Nombre d'éléments par page. */
                limit?: number;
                /** @description Recherche plein texte, insensible à la casse et aux accents. */
                q?: string;
                /** @description Sens de tri. */
                sortOrder?: "asc" | "desc";
                /** @description Filtre sur l'état d'activation. Non renseigné, les éléments actifs et inactifs sont renvoyés. */
                isActive?: boolean;
                /** @description Filtrer sur un auteur. */
                actorId?: string;
                action?: string;
                entityType?: string;
                /** @description Filtrer sur une ressource précise. */
                entityId?: string;
                /** @description Borne inférieure, au format ISO 8601. */
                from?: string;
                /** @description Borne supérieure, au format ISO 8601. */
                to?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedDto"] & {
                        data?: components["schemas"]["ActivityLogDto"][];
                    };
                };
            };
        };
    };
    AuthController_login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginDto"];
            };
        };
        responses: {
            /** @description Authentification réussie */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthTokensDto"];
                };
            };
            /** @description Identifiants invalides */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Trop de tentatives de connexion */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    AuthController_refresh: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefreshTokenDto"];
            };
        };
        responses: {
            /** @description Nouveaux jetons émis */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthTokensDto"];
                };
            };
            /** @description Jeton invalide, expiré ou révoqué */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    AuthController_logout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefreshTokenDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LogoutResponseDto"];
                };
            };
        };
    };
    AuthController_logoutAll: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LogoutResponseDto"];
                };
            };
        };
    };
    AuthController_me: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserProfileDto"];
                };
            };
            /** @description Jeton absent, expiré ou compte désactivé */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    HealthController_check: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description API et base de données opérationnelles */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthCheckDto"];
                };
            };
            /** @description Au moins une dépendance est indisponible */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    UsersController_findAll: {
        parameters: {
            query?: {
                /** @description Numéro de page, à partir de 1. */
                page?: number;
                /** @description Nombre d'éléments par page. */
                limit?: number;
                /** @description Recherche plein texte, insensible à la casse et aux accents. */
                q?: string;
                /** @description Sens de tri. */
                sortOrder?: "asc" | "desc";
                /** @description Filtre sur l'état d'activation. Non renseigné, les éléments actifs et inactifs sont renvoyés. */
                isActive?: boolean;
                /** @description Filtre sur le rôle. Un superviseur ne peut pas filtrer sur ADMIN. */
                role?: components["schemas"]["Role"];
                sortBy?: "fullName" | "username" | "email" | "role" | "createdAt" | "lastLoginAt";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Page de comptes */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedDto"] & {
                        data?: components["schemas"]["UserDto"][];
                    };
                };
            };
        };
    };
    UsersController_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateUserDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"];
                };
            };
            /** @description Rôle demandé hors du périmètre de l’appelant */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description E-mail ou nom d’utilisateur déjà pris */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    UsersController_findOne: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"];
                };
            };
            /** @description Compte inexistant ou hors du périmètre de l’appelant */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    UsersController_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateUserDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"];
                };
            };
        };
    };
    UsersController_changeOwnPassword: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChangePasswordDto"];
            };
        };
        responses: {
            /** @description Mot de passe modifié */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    UsersController_updateRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateUserRoleDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"];
                };
            };
            /** @description Dernier administrateur actif */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    UsersController_updateStatus: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateUserStatusDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserDto"];
                };
            };
            /** @description Dernier administrateur actif */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    UsersController_resetPassword: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ResetPasswordDto"];
            };
        };
        responses: {
            /** @description Mot de passe réinitialisé */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    WarehousesController_findAll: {
        parameters: {
            query?: {
                /** @description Numéro de page, à partir de 1. */
                page?: number;
                /** @description Nombre d'éléments par page. */
                limit?: number;
                /** @description Recherche plein texte, insensible à la casse et aux accents. */
                q?: string;
                /** @description Sens de tri. */
                sortOrder?: "asc" | "desc";
                /** @description Filtre sur l'état d'activation. Non renseigné, les éléments actifs et inactifs sont renvoyés. */
                isActive?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedDto"] & {
                        data?: components["schemas"]["WarehouseDto"][];
                    };
                };
            };
        };
    };
    WarehousesController_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateWarehouseDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WarehouseDto"];
                };
            };
        };
    };
    WarehousesController_findOne: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WarehouseDto"];
                };
            };
        };
    };
    WarehousesController_deactivate: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WarehouseDto"];
                };
            };
            /** @description Campagnes non clôturées rattachées au magasin */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    WarehousesController_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateWarehouseDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WarehouseDto"];
                };
            };
        };
    };
    LocationsController_findAll: {
        parameters: {
            query?: {
                /** @description Numéro de page, à partir de 1. */
                page?: number;
                /** @description Nombre d'éléments par page. */
                limit?: number;
                /** @description Recherche plein texte, insensible à la casse et aux accents. */
                q?: string;
                /** @description Sens de tri. */
                sortOrder?: "asc" | "desc";
                /** @description Filtre sur l'état d'activation. Non renseigné, les éléments actifs et inactifs sont renvoyés. */
                isActive?: boolean;
                /** @description Restreint à un magasin. */
                warehouseId?: string;
                /** @description Inclure les emplacements virtuels (NON-LOCALISE). */
                includeVirtual?: components["schemas"]["Object"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedDto"] & {
                        data?: components["schemas"]["LocationDto"][];
                    };
                };
            };
        };
    };
    LocationsController_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateLocationDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LocationDto"];
                };
            };
        };
    };
    LocationsController_findVariants: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                warehouseId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LocationVariantDto"][];
                };
            };
        };
    };
    LocationsController_findOne: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LocationDto"];
                };
            };
        };
    };
    LocationsController_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateLocationDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LocationDto"];
                };
            };
        };
    };
    LocationsController_merge: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MergeLocationsDto"];
            };
        };
        responses: {
            /** @description Emplacement cible après fusion */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LocationDto"];
                };
            };
            /** @description Emplacements de magasins différents, ou emplacement virtuel */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Articles en doublon à l’emplacement cible */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    CategoriesController_findAll: {
        parameters: {
            query?: {
                /** @description Numéro de page, à partir de 1. */
                page?: number;
                /** @description Nombre d'éléments par page. */
                limit?: number;
                /** @description Recherche plein texte, insensible à la casse et aux accents. */
                q?: string;
                /** @description Sens de tri. */
                sortOrder?: "asc" | "desc";
                /** @description Filtre sur l'état d'activation. Non renseigné, les éléments actifs et inactifs sont renvoyés. */
                isActive?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedDto"] & {
                        data?: components["schemas"]["CategoryDto"][];
                    };
                };
            };
        };
    };
    CategoriesController_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateCategoryDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CategoryDto"];
                };
            };
        };
    };
    CategoriesController_findOne: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CategoryDto"];
                };
            };
        };
    };
    CategoriesController_deactivate: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CategoryDto"];
                };
            };
        };
    };
    CategoriesController_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateCategoryDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CategoryDto"];
                };
            };
        };
    };
    ArticlesController_findAll: {
        parameters: {
            query?: {
                /** @description Numéro de page, à partir de 1. */
                page?: number;
                /** @description Nombre d'éléments par page. */
                limit?: number;
                /** @description Recherche sur le code, la désignation, la marque et la référence fabricant — les quatre critères utilisés sur le terrain. */
                q?: string;
                /** @description Sens de tri. */
                sortOrder?: "asc" | "desc";
                /** @description Filtre sur l'état d'activation. Non renseigné, les éléments actifs et inactifs sont renvoyés. */
                isActive?: boolean;
                categoryId?: string;
                brand?: string;
                sortBy?: "code" | "designation" | "brand" | "createdAt";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedDto"] & {
                        data?: components["schemas"]["ArticleDto"][];
                    };
                };
            };
        };
    };
    ArticlesController_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateArticleDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ArticleDto"];
                };
            };
        };
    };
    ArticlesController_findByCode: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                code: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ArticleDto"];
                };
            };
        };
    };
    ArticlesController_findOne: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ArticleDto"];
                };
            };
        };
    };
    ArticlesController_deactivate: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ArticleDto"];
                };
            };
        };
    };
    ArticlesController_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateArticleDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ArticleDto"];
                };
            };
        };
    };
    CampaignTypesController_findAll: {
        parameters: {
            query?: {
                includeInactive?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CampaignTypeDto"][];
                };
            };
        };
    };
    CampaignTypesController_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateCampaignTypeDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CampaignTypeDto"];
                };
            };
        };
    };
    CampaignTypesController_findOne: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CampaignTypeDto"];
                };
            };
        };
    };
    CampaignTypesController_deactivate: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CampaignTypeDto"];
                };
            };
        };
    };
    CampaignTypesController_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateCampaignTypeDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CampaignTypeDto"];
                };
            };
        };
    };
    InventoryMethodsController_findAll: {
        parameters: {
            query?: {
                includeInactive?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InventoryMethodDto"][];
                };
            };
        };
    };
    InventoryMethodsController_findOne: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InventoryMethodDto"];
                };
            };
        };
    };
    InventoryMethodsController_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateInventoryMethodDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InventoryMethodDto"];
                };
            };
        };
    };
    CampaignsController_findAll: {
        parameters: {
            query?: {
                /** @description Numéro de page, à partir de 1. */
                page?: number;
                /** @description Nombre d'éléments par page. */
                limit?: number;
                /** @description Recherche plein texte, insensible à la casse et aux accents. */
                q?: string;
                /** @description Sens de tri. */
                sortOrder?: "asc" | "desc";
                /** @description Filtre sur l'état d'activation. Non renseigné, les éléments actifs et inactifs sont renvoyés. */
                isActive?: boolean;
                status?: components["schemas"]["CampaignStatus"];
                warehouseId?: string;
                campaignTypeId?: string;
                sortBy?: "code" | "name" | "createdAt" | "status" | "round";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedDto"] & {
                        data?: components["schemas"]["CampaignDto"][];
                    };
                };
            };
        };
    };
    CampaignsController_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateCampaignDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CampaignDto"];
                };
            };
        };
    };
    CampaignsController_findOne: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CampaignDto"];
                };
            };
        };
    };
    CampaignsController_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateCampaignDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CampaignDto"];
                };
            };
            /** @description Campagne non modifiable, ou comptages déjà enregistrés */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    CampaignsController_open: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CampaignDto"];
                };
            };
            /** @description Statut incompatible, ou campagne vide */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    CampaignsController_closureReadiness: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClosureReadinessDto"];
                };
            };
        };
    };
    CampaignsController_close: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CloseCampaignDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CampaignDto"];
                };
            };
            /** @description Confirmation de mise à zéro absente */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Campagne déjà clôturée, ou lignes bloquantes */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    CampaignsController_reopen: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReopenCampaignDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CampaignDto"];
                };
            };
            /** @description Réservé aux administrateurs */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Campagne non clôturée, ou passage suivant existant */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    CampaignsController_nextRound: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NextRoundDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CampaignDto"];
                };
            };
            /** @description Campagne non clôturée, passage suivant déjà créé, ou aucun écart à recompter */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    CampaignsController_assignUser: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AssignCampaignUserDto"];
            };
        };
        responses: {
            /** @description Personne affectée */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    CampaignsController_unassignUser: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                userId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Personne retirée */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    InventoryListsController_findMine: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MyListDto"][];
                };
            };
        };
    };
    InventoryListsController_findAll: {
        parameters: {
            query?: {
                /** @description Numéro de page, à partir de 1. */
                page?: number;
                /** @description Nombre d'éléments par page. */
                limit?: number;
                /** @description Recherche plein texte, insensible à la casse et aux accents. */
                q?: string;
                /** @description Sens de tri. */
                sortOrder?: "asc" | "desc";
                /** @description Filtre sur l'état d'activation. Non renseigné, les éléments actifs et inactifs sont renvoyés. */
                isActive?: boolean;
                campaignId?: string;
                status?: components["schemas"]["ListStatus"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedDto"] & {
                        data?: components["schemas"]["InventoryListDto"][];
                    };
                };
            };
        };
    };
    InventoryListsController_findOne: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InventoryListDto"];
                };
            };
        };
    };
    InventoryListsController_remove: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Liste supprimée */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Des comptages existent sur cette liste */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    InventoryListsController_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateInventoryListDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InventoryListDto"];
                };
            };
        };
    };
    InventoryListsController_assignmentHistory: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AssignmentHistoryEntryDto"][];
                };
            };
        };
    };
    InventoryListsController_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                campaignId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateInventoryListDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InventoryListDto"];
                };
            };
            /** @description Code déjà utilisé dans la campagne, ou campagne clôturée */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    InventoryListsController_assignUser: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AssignListUserDto"];
            };
        };
        responses: {
            /** @description Liste attribuée */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    InventoryListsController_unassignUser: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                userId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Opérateur retiré */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    InventoryItemsController_findByList: {
        parameters: {
            query?: {
                /** @description Numéro de page, à partir de 1. */
                page?: number;
                /** @description Nombre d'éléments par page. */
                limit?: number;
                /** @description Recherche sur le code article, la désignation, l’emplacement, la marque et la référence fabricant. */
                q?: string;
                /** @description Sens de tri. */
                sortOrder?: "asc" | "desc";
                /** @description Filtre sur l'état d'activation. Non renseigné, les éléments actifs et inactifs sont renvoyés. */
                isActive?: boolean;
                /** @description `remaining` : aucune saisie de ma part et ligne non déclarée introuvable. `counted` : au moins une saisie de ma part. `not_found` : déclarée introuvable. `discrepancy` : litiges à arbitrer. */
                filter?: "all" | "remaining" | "counted" | "not_found" | "discrepancy";
                /** @description Restreint à un emplacement (code exact). */
                location?: string;
                /** @description Masque les lignes dont la quantité théorique est nulle. Sur le fichier de référence, elles représentent 47 % des lignes. */
                hideZeroTheoretical?: components["schemas"]["Object"];
                /** @description Par défaut : emplacement (ordre physique de parcours), puis désignation. */
                sortBy?: "location" | "designation" | "code" | "lineNo";
            };
            header?: never;
            path: {
                listId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedDto"] & {
                        data?: components["schemas"]["InventoryItemDto"][];
                    };
                };
            };
        };
    };
    InventoryItemsController_findOne: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InventoryItemDto"];
                };
            };
        };
    };
    InventoryItemsController_clearNotFound: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InventoryItemDto"];
                };
            };
        };
    };
    InventoryItemsController_markNotFound: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MarkNotFoundDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InventoryItemDto"];
                };
            };
            /** @description Campagne clôturée ou non ouverte */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    InventoryItemsController_arbitrate: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ArbitrateItemDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InventoryItemDto"];
                };
            };
        };
    };
    CountsController_findByItem: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                itemId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CountDto"][];
                };
            };
        };
    };
    CountsController_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                itemId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateCountDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CountDto"];
                };
            };
            /** @description Campagne clôturée, ou identifiant déjà utilisé ailleurs */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    CountsController_sync: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SyncCountsDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SyncCountsResultDto"];
                };
            };
        };
    };
    CountsController_findMine: {
        parameters: {
            query: {
                limit: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CountDto"][];
                };
            };
        };
    };
    CountsController_cancel: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CancelCountDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CountDto"];
                };
            };
        };
    };
    ImportsController_downloadTemplate: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Classeur Excel */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ImportsController_findByList: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                listId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImportBatchDto"][];
                };
            };
        };
    };
    ImportsController_analyze: {
        parameters: {
            query?: {
                /** @description Exclure les lignes dont la quantité théorique est nulle. Sur le fichier de référence, elles représentent 47 % des lignes. Les conserver permet de détecter un surplus sur un article théoriquement absent — c’est l’intérêt même d’un inventaire. */
                excludeZeroQuantity?: components["schemas"]["Object"];
                /** @description Mettre à jour la quantité théorique des lignes déjà présentes dans la liste. Sinon, seules les lignes nouvelles sont ajoutées. */
                updateExisting?: components["schemas"]["Object"];
            };
            header?: never;
            path: {
                listId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description Fichier .xlsx ou .csv
                     */
                    file: string;
                    /** @default false */
                    excludeZeroQuantity?: boolean;
                    /** @default true */
                    updateExisting?: boolean;
                };
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImportBatchDto"];
                };
            };
            /** @description Format non pris en charge, ou en-têtes introuvables */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Campagne au statut incompatible avec un import */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ImportsController_apply: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApplyImportResultDto"];
                };
            };
            /** @description Import déjà appliqué, rejeté, ou campagne incompatible */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ImportsController_findOne: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImportBatchDto"];
                };
            };
        };
    };
    ImportsController_reject: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImportBatchDto"];
                };
            };
        };
    };
    ReportsController_dashboard: {
        parameters: {
            query?: {
                /** @description Exclure les lignes dont la quantité théorique est nulle. Activé par défaut : sur le fichier de référence elles représentent 47 % des lignes et noieraient les indicateurs. */
                hideZeroTheoretical?: components["schemas"]["Object"];
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CampaignDashboardDto"];
                };
            };
        };
    };
    ReportsController_byUser: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CounterActivityDto"][];
                };
            };
        };
    };
    ReportsController_excel: {
        parameters: {
            query?: {
                /** @description Exclure les lignes dont la quantité théorique est nulle. Activé par défaut : sur le fichier de référence elles représentent 47 % des lignes et noieraient les indicateurs. */
                hideZeroTheoretical?: components["schemas"]["Object"];
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Classeur Excel */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ReportsController_pdf: {
        parameters: {
            query?: {
                /** @description Exclure les lignes dont la quantité théorique est nulle. Activé par défaut : sur le fichier de référence elles représentent 47 % des lignes et noieraient les indicateurs. */
                hideZeroTheoretical?: components["schemas"]["Object"];
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Document PDF */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    QrController_articleQr: {
        parameters: {
            query?: {
                /** @description Côté de l’image en pixels (64 à 1024). */
                size?: number;
            };
            header?: never;
            path: {
                code: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Image PNG */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    QrController_locationQr: {
        parameters: {
            query: {
                size: number;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Image PNG */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    QrController_listLabels: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                listId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Document PDF */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
}
