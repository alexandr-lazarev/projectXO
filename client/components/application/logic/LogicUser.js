LogicUser = function () {
    var self = this;

    /**
     * Id пользователя под которым мы сидим.
     */
    var authorizedUserId = null;

    /**
     * Тут мы будем хранить данные пользователей.
     * @type {Array}
     */
    var users = [];

    /** Кол-во онлайн пользователей */
    var onlineCount = null;

    /**
     * Авторизация пользователя.
     */
    this.authorize = function () {
        var socNetUserId, authParams;
        socNetUserId = SocNet.getSocNetUserId();
        authParams = SocNet.getAuthParams();
        switch (SocNet.getType()) {
            case SocNet.TYPE_VK:
                SAPIUser.authorizeByVK(socNetUserId, authParams);
                break;
            case SocNet.TYPE_STANDALONE:
                SAPIUser.authorizeByStandalone(socNetUserId, authParams);
                break;
            default:
                Logs.log("Wrong soc net type", Logs.LEVEL_FATAL_ERROR);
                break;
        }
    };

    /**
     * Метод для обработки ответа от сервера об успешной авторизации.
     * @param userId
     */
    this.authorizeSuccess = function (userId) {
        authorizedUserId = userId;
        Logs.log("Authorization success. userId:" + userId, Logs.LEVEL_NOTIFY);
        SAPIUser.sendMeOnlineCount();
        SAPIChat.sendMeLastMessages();
        SAPIUser.sendMeOnlineUserIds();
        SAPITimeServer.sendMeTime();
        SAPIRating.sendMeLastPosition();
        waitForLoadingUser = [];
        if (LogicGame.getLookingGameId()) {
            SAPIGameLooks.start(LogicGame.getLookingGameId());
        }
    };

    /**
     * Авторизован ли текущий юзер.
     * @returns {Boolean}
     */
    this.isAuthorized = function () {
        return authorizedUserId ? true : false;
    };

    /**
     * Возвращает текущего(авторизованного пользователя).
     * @returns {null|Object}
     */
    this.getCurrentUser = function () {
        return this.getById(authorizedUserId);
    };

    /**
     * Получить данные пользователя по его id.
     * @param id
     * @returns {null|Object}
     */
    this.getById = function (id) {
        if (id == 0) {
            return robotDummy();
        }
        if (users[id]) {
            /* Догрузим данные, это немного костыль... но время деньги :) */
            if (!users[id].socNetUserId) {
                self.loadUserInfoById(id);
            }
            return users[id];
        } else {
            self.loadUserInfoById(id);
            /* некоторая заглушка */
            return getDummy();
        }
    };

    var getDummy = function () {
        return {
            id: null,
            firstName: '-',
            lastName: '-',
            isBusy: false,
            onGameId: 0,
            online: false,
            score15x15vsPerson: '-',
            score3x3vsPerson: '-',
            score15x15vsRobot: '-',
            score3x3vsRobot: '-'
        };
    };

    var robotDummy = function () {
        var robot = getDummy();
        robot.id = 0;
        robot.online = true;
        return robot;
    };
    /**
     * Запомним, чьи загрузки мы уже ждём, что бы не повторять лишних запросов.
     * @type {Array}
     */
    var waitForLoadingUser = [];

    /**
     * Загрузить данные о пользователе.
     * @param userId {int}
     */
    this.loadUserInfoById = function (userId) {
        if (authorizedUserId === null) {
            return;
        }
        if (!waitForLoadingUser[userId]) {
            waitForLoadingUser[userId] = true;
            SAPIUser.sendMeUserInfo(userId);
        }
    };

    /**
     * Обновить данные о пользователе.
     * Обновит\создаст, только переданные поля!
     * При создании, создаются дефолтовые поля: firstName: '', lastName: '', isBusy: false, onGameId: 0
     * @param user {Object}
     */
    this.updateUserInfo = function (user) {
        waitForLoadingUser[user.id] = false;
        if (!users[user.id]) {
            users[user.id] = getDummy();
        }
        for (var field in user) {
            users[user.id][field] = user[field];
        }
        PageController.redraw();
    };

    /** Возвращает количество онлайн игроков. */
    this.getOnlineCount = function () {
        return onlineCount;
    };

    /**
     * Обновим данные о кол-во онлайн пользователей.
     * @param count int кол-во онлайн пользователей.
     * @param userId int
     * @param direction boolean если true - пользователь вошел, если false - то вышел.
     */
    this.updateOnlineCount = function (count, userId, direction) {
        // если онлайн повысился, издадим звук для админа! :)
        if (count > onlineCount) {
            var currentUser = LogicUser.getCurrentUser();
            if (currentUser && currentUser.id && currentUser.id == 1) {
                Sounds.play('/sounds/ICQMessage.mp3');
            }
        }
        onlineCount = count;
        /* Сбрасываем пользователя если он вошел\вышел. */
        self.updateUserInfo({id: userId, online: direction, isBusy: false, onGameId: 0});
        PageController.redraw();
    };

    /**
     * Возвращает массив внутрениих id юзееров, которые онлайн.
     */
    this.getOnlineUserIds = function () {
        var out;
        out = [];
        users.forEach(function (user) {
            if (user.online) {
                out.push(user.id);
            }
        });
        return out;
    };

    var ratingPositions = [];

    this.getRatingPosition = function (userId) {
        if (!userId) {
            userId = authorizedUserId;
        }
        if (ratingPositions[userId]) {
            if (ratingPositions[userId].needReload) {
                SAPIUser.sendMeRatingPosition(userId);
                ratingPositions[userId].needReload = false;
            }
            return ratingPositions[userId].position;
        } else {
            SAPIUser.sendMeRatingPosition(userId);
            ratingPositions[userId] = {needReload: false, position: undefined};
        }
    };

    this.updateRatingPosition = function (userId, position) {
        ratingPositions[userId] = {
            position: position,
            needReload: false
        };
        PageController.redraw();
    };

    this.setRatingPositionsNeedReload = function () {
        for (var userId in ratingPositions) {
            ratingPositions[userId].needReload = true;
        }
        PageController.redraw();
    };

    this.setBusy = function (state) {
        var user;
        user = self.getById(authorizedUserId);
        if (state == user.isBusy) {
            return;
        }
        if (state) {
            SAPIUserState.isBusy();
        } else {
            SAPIUserState.isNoBusy();
        }
    };

    this.loadNameCasesById = function (userId) {
        var user;
        if (userId == 0) {
            return;
        }
        user = self.getById(userId);
        if (!user) {
            return;
        }
        /* именительный – nom, родительный – gen, дательный – dat, винительный – acc, творительный – ins, предложный – abl. По умолчанию nom. */
        // ins - играю с роботом
        // gen - выиграл  у робота
        // dat - проиграл роботу
        if (!user.firstName_ins) {
            setTimeout(function () {
                self.loadNameCase(user, 'ins');
            }, 100);
        }
        if (!user.firstName_gen) {
            setTimeout(function () {
                self.loadNameCase(user, 'gen');
            }, 200);
        }
        if (!user.firstName_dat) {
            setTimeout(function () {
                self.loadNameCase(user, 'dat');
            }, 300);
        }
    };

    this.loadNameCase = function (user, nom) {
        VK.api('users.get', {
            user_ids: user.socNetUserId,
            name_case: nom
        }, function (result) {
            Logs.log("VK.users.get response", Logs.LEVEL_DETAIL, result);
            users[user.id]['firstName_' + nom] = result.response[0].first_name;
            users[user.id]['lastName_' + nom] = result.response[0].last_name;
        });
    };
};

/**
 * Статичный класс.
 * @type {LogicUser}
 */
LogicUser = new LogicUser();
