var REST = require('restler');
var FS = require('fs');

SAPIUser = function () {

    var someUploadFunction = function (url, fileName, content) {
        console.log('uploading');
        console.log(url, fileName);
        //@todo upload-image HARD-WORK
    };

    var auhthorizeValidateParams = function (cntx, socNetUserId, authParams) {
        if (!socNetUserId) {
            Logs.log("SAPIUser.auhthorizeValidateParams: must have socNetUserId", Logs.LEVEL_WARNING);
            return false;
        }
        if (!authParams || typeof authParams !== 'object') {
            Logs.log("SAPIUser.auhthorizeValidateParams: must have authParams", Logs.LEVEL_WARNING);
            return false;
        }
        if (cntx.isAuthorized) {
            Logs.log("SAPIUser.auhthorizeValidateParams: user already authorized", Logs.LEVEL_WARNING, {
                userId: cntx.userId,
                socNetUserId: socNetUserId
            });
            return false;
        }
        return true;
    };

    /**
     * Авторизация через вКонтакте.
     * @param cntx контекст соединения
     * @param socNetUserId id юзера в соц сети
     * @param authParams параметры аутентифиакации.
     */
    this.authorizeByVK = function (cntx, socNetUserId, authParams) {
        if (!auhthorizeValidateParams(cntx, socNetUserId, authParams)) {
            return false;
        }
        LogicUser.authorizeByVK(socNetUserId, authParams, cntx);
    };

    /**
     * Авторизация через Сайт.
     * @param cntx контекст соединения
     * @param socNetUserId id юзера в соц сети
     * @param authParams параметры аутентифиакации.
     */
    this.authorizeByStandalone = function (cntx, socNetUserId, authParams) {
        if (!auhthorizeValidateParams(cntx, socNetUserId, authParams)) {
            return false;
        }
        LogicUser.authorizeByStandalone(socNetUserId, authParams, cntx);
    };

    /**
     * Отправяел информацию о пользователи в текущие соединение.
     * @param cntx object
     * @param userId number
     */
    this.sendMeUserInfo = function (cntx, userId) {
        if (!cntx.isAuthorized) {
            Logs.log("SAPIUser.sendMeUserInfo: must be authorized", Logs.LEVEL_WARNING);
            return;
        }
        if (!userId || typeof userId !== 'number') {
            Logs.log("SAPIUser.sendMeUserInfo: must have userId", Logs.LEVEL_WARNING, userId);
            return;
        }
        LogicUser.sendUserInfo(userId, cntx.userId);
    };

    /**
     * Запрос на отправку списка друзей.
     * @param cntx
     * @param userId
     */
    this.sendMeFriends = function (cntx, userId) {
        if (!cntx.isAuthorized) {
            Logs.log("SAPIUser.sendMeFriends: must be authorized", Logs.LEVEL_WARNING);
            return;
        }
        if (!userId || typeof userId != 'number') {
            Logs.log("SAPIUser.sendMeFriends: must have userId", Logs.LEVEL_WARNING, {cntx: cntx, userId: userId});
            return;
        }
        LogicUser.sendFriends(userId, cntx);
    };

    /**
     * Запрос на отправку онлайн пользователей.
     * @param cntx
     */
    this.sendMeOnlineCount = function (cntx) {
        if (!cntx.isAuthorized) {
            Logs.log("SAPIUser.sendMeOnlineCount: must be authorized", Logs.LEVEL_WARNING);
            return;
        }
        LogicUser.sendOnlineCount(cntx);
    };

    this.sendMeOnlineUserIds = function (cntx) {
        var userIds;
        if (!cntx.isAuthorized) {
            Logs.log("SAPIUser.sendMeOnlineUserIds: must be authorized", Logs.LEVEL_WARNING);
            return;
        }
        userIds = LogicUser.getOnlineUserIds();
        for (var i in userIds) {
            CAPIUser.updateOnlineCount(cntx.userId, LogicUser.getOnlineCount(), parseInt(userIds[i]), true);
        }
    };

    /**
     * Отсылает рейтинговую позитцитю запрашиваемого игрока.
     * @param cntx {Object}
     * @param userId {Int}
     */
    this.sendMeRatingPosition = function (cntx, userId) {
        if (!cntx.isAuthorized) {
            Logs.log("SAPIUser.sendMeRatingPosition: must be authorized", Logs.LEVEL_WARNING);
            return;
        }
        if (!userId || typeof userId != 'number') {
            Logs.log("SAPIUser.sendMeRatingPosition: userId must be", Logs.LEVEL_WARNING, userId);
            return;
        }
        DB.query("SELECT * FROM rating WHERE userId = " + userId, function (rows) {
            if (!rows || !rows[0]) {
                Logs.log("no ratinmg for user:" + userId, Logs.LEVEL_WARNING);
                return;
            }
            CAPIUser.updateRatingPosition(cntx.userId, userId, rows[0].position);
        });
    };

    var files = [];

    /**
     * if(finish) data is upload_url esel data is chunk of image data
     * @param cntx
     * @param uploadServerUrl
     * @param fileId
     * @param finish
     */
    this.sendWallPost = function (cntx, uploadServerUrl, fileId, finish) {
        var content, fileName;
        var prid1 = Profiler.start(Profiler.ID_WALLPOST_SUM);
        if (!cntx.isAuthorized) {
            Logs.log("SAPIUser.sendWallPost: must be authorized", Logs.LEVEL_WARNING);
            return;
        }
        if (!finish) {
            var prid2 = Profiler.start(Profiler.ID_WALLPOST_RECEIVE_DATA);
            if (!files[fileId]) {
                files[fileId] = '';
            }
            files[fileId] += uploadServerUrl;
            Profiler.stop(Profiler.ID_WALLPOST_RECEIVE_DATA, prid2);
        } else {
            var prid3 = Profiler.start(Profiler.ID_WALLPOST_WRITE_FILE);
            fileName = Config.SAPUUser.postsPath + 'image_' + fileId + '.png';
            content = new Buffer(files[fileId], 'base64');
            delete files[fileId];

            var fs2 = require('fs');
            var FormData = require('form-data');

            FS.writeFile(fileName, content, null, function (a, b, c) {
                someUploadFunction(uploadServerUrl, fileName, content);
            });


            /*FS.writeFile(fileName, content, null, function (a, b, c) {
             Profiler.stop(Profiler.ID_WALLPOST_WRITE_FILE, prid3);
             var prid4 = Profiler.start(Profiler.ID_WALLPOST_SEND_TO_VK_SERVER);
             REST.post(data, {
             multipart: true,
             data: {
             'photo': REST.file(fileName, null, FS.statSync(fileName).size, null, 'image/png')
             }
             }).on('complete', function (response) {
             CAPIUser.wallPostSended(cntx.userId, response);
             Profiler.stop(Profiler.ID_WALLPOST_SEND_TO_VK_SERVER, prid4);
             Profiler.stop(Profiler.ID_WALLPOST_SUM, prid1);
             });
             });*/
        }
    }
};
/**
 * Статичный класс.
 * @type {SAPIUser}
 */
SAPIUser = new SAPIUser();
