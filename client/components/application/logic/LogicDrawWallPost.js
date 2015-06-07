/**
 * @todo блокировать кнопку "расказать", ато много постов будет, плохо это.
 */
/**
 *
 * @constructor
 */
LogicDrawWallPost = function () {
    var self = this;

    var fieldStartX = 55;
    var fieldStartY = 55;
    var canvasHeight = 520;
    var canvasWidth = 520;

    var canvasDom;

    var debugShow = false;

    var images = [];

    var postText = '';

    this.blocked = false;

    this.drawingWallPost = false;
    this.drawingCameraPhoto = false;

    this.postReady = false;

    this.drawWallPost = function (game, user, opponent) {
        if (self.blocked) return;
        self.blocked = true;
        self.postReady = false;
        self.drawingWallPost = true;
        init(function () {
            drawPost(game, user, opponent);
        });
    };

    this.drawCameraPhoto = function (game, user, opponent) {
        if (self.blocked) return;
        self.blocked = true;
        self.postReady = false;
        self.drawingCameraPhoto = true;
        init(function () {
            drawPost(game, user, opponent, true);
        });
    };


    var drawPost = function (game, user, opponent, notText) {
        var context, srcField, srcSignX, srcSignO, cfg, imageX, imageY, src;
        context = getContext();
        cfg = ElementField.getConfigure(game.fieldTypeId);
        /* Стираем всё. */
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        /* 1 - рисуем стол */
        drawImage(context, '/xo/images/wallPost.png', 0, 0);
        /* 2 - рисуем поле */
        drawImage(context, '/xo' + cfg.srcField, fieldStartX, fieldStartY);
        /* 3 - рисуем знаки */
        for (var y = 0; y < cfg.fieldSize; y++) {
            for (var x = 0; x < cfg.fieldSize; x++) {
                imageX = fieldStartX + cfg.signOffsetX + x * (cfg.signWidth + cfg.padding);
                imageY = fieldStartY + cfg.signOffsetY + y * (cfg.signHeight + cfg.padding);
                src = '/xo/images/notFound.png';
                switch (game.field[y][x]) {
                    case LogicXO.SIGN_ID_X:
                        src = cfg.srcSignX;
                        break;
                    case LogicXO.SIGN_ID_O:
                        src = cfg.srcSignO;
                        break;
                    case LogicXO.SIGN_ID_Empty:
                        src = cfg.srcSignClear;
                        break;
                }
                drawImage(context, '/xo' + src, imageX, imageY);
            }
        }
        /* 4 - рисуем линю победы, если есть */
        if (game && game.outcomeResults) {
            if (game.outcomeResults.someBodyWin) {
                src = '/xo/images/notFound.png';
                imageX = fieldStartX + cfg.lineOffset + game.outcomeResults.x * (cfg.signWidth + cfg.padding);
                imageY = fieldStartY + cfg.lineOffset + game.outcomeResults.y * (cfg.signHeight + cfg.padding);
                src = cfg.lines[game.outcomeResults.lineId];
                drawImage(context, '/xo' + src, imageX, imageY);
            }
        }
        if (!notText) {
            /* - рисуем побед: */
            drawText(context, 'побед: ' + LogicXO.getScoreByGame(game, user), fieldStartX + 35, fieldStartY + 397);
            /* - рисуем рейтинг текст вверху */
            drawText(context, 'мой рейтинг: ' + LogicUser.getRatingPosition(), fieldStartX + 215, fieldStartY + 397);
            /* - оппонент*/
            postText = '';
            var opponentNameTextNom = '';
            var opponentNameTextIns = '';
            var opponentNameTextGen = '';
            var opponentNameTextDat = '';
            var text = '';
            // ins - играю с роботом, ничья с роботом
            // gen - выиграл у робота
            // dat - проиграл роботу
            if (game.vsRobot) {
                opponentNameTextNom = 'робот';
                opponentNameTextIns = 'роботом';
                opponentNameTextGen = 'робота';
                opponentNameTextDat = 'роботу';
            } else {
                opponentNameTextNom = opponent.firstName + " " + opponent.lastName;
                opponentNameTextIns = opponent.firstName_ins + " " + opponent.lastName_ins;
                opponentNameTextGen = opponent.firstName_gen + " " + opponent.lastName_gen;
                opponentNameTextDat = opponent.firstName_dat + " " + opponent.lastName_dat;
            }
            postText = 'http://vk.com/app' + Config.SocNet.appId;
            switch (game.status) {
                case LogicXO.STATUS_WAIT:
                    text = '';
                    break;
                case LogicXO.STATUS_RUN:
                    text = 'Я играю с ' + opponentNameTextIns + '.';
                    break;
                case LogicXO.STATUS_SOMEBODY_WIN:
                    if (game.winnerId == user.id) {
                        text = 'Я выиграл у ' + opponentNameTextGen + '!';
                    } else {
                        text = 'Я проиграл ' + opponentNameTextDat + '.';
                    }
                    break;
                case LogicXO.STATUS_NOBODY_WIN:
                    text = 'Ничья с ' + opponentNameTextIns;
                    break;
                case LogicXO.STATUS_CLOSE:
                    text = 'Игра закончена с ' + opponentNameTextIns;
                    break;
            }
            text = text.substr(0, 100);
            drawText(context, text, fieldStartX + 21, fieldStartY - 24, 357);
        }
        if (debugShow) {
            canvasDom.show();
            setTimeout(canvasDom.hide, 3500);
        }
        afterDraw();
    };

    var afterDraw = function () {
        Logs.log('photos.getWallUploadServer');
        VK.api('photos.getWallUploadServer', {}, function (data) {
            /* .response.album_id=, .response.upload_url='', .response.user_id=*/
            Logs.log('photos.getWallUploadServer answered', Logs.LEVEL_DETAIL, data);
            afterGetUploadServer(data.response.upload_url);
        });
    };

    var afterGetUploadServer = function (uploadUrl) {
        var png, fileId;
        Logs.log('uploading... to xoServer:' + uploadUrl);
        // to xo server
        png = getBase64PNG();
        png = png.replace('data:image/png;base64,', '');
        png = png.match(/.{1,60000}/g);
        fileId = LogicUser.getCurrentUser().id.toString() + "_" + mtime().toString();
        png.forEach(function (chunk) {
            SAPIUser.sendWallPost(chunk, fileId, false);
        });
        SAPIUser.sendWallPost(uploadUrl, fileId, true);
    };

    this.onUploadComplete = function (vkResponse) {
        //@todo id for every requests...
        vkResponse = JSON.parse(vkResponse);
        VK.api('photos.saveWallPhoto', {
            user_id: LogicUser.getCurrentUser().socNetUserId,
            photo: vkResponse.photo,
            server: vkResponse.server,
            hash: vkResponse.hash
        }, function (answer) {
            createPostOnWall(answer);
        });

    };

    var createPostOnWall = function (answer) {
        self.postReady = true;
        VK.api('wall.post', {
            owner_id: LogicUser.getCurrentUser().socNetUserId,
            message: postText,// +' \nhttp://vk.com/krestik.nolik',
            attachments: 'photo' + LogicUser.getCurrentUser().socNetUserId + '_' + answer.response[0].id + ',http://vk.com/app' + Config.SocNet.appId
        }, function (answer) {
            self.blocked = false;
            self.postReady = false;
            self.drawingWallPost = false;
            self.drawingCameraPhoto = false;
            PageController.redraw();
        });
    };

    var init = function (callback) {
        loadImages([
            '/xo/images/fields/15x15Field.png',
            '/xo/images/fields/15x15SignX.png',
            '/xo/images/fields/15x15SignO.png',
            '/xo/images/fields/15x15SignClear.png',
            '/xo/images/fields/3x3Field.png',
            '/xo/images/fields/3x3SignX.png',
            '/xo/images/fields/3x3SignO.png',
            '/xo/images/fields/3x3SignClear.png',
            '/xo/images/wallPost.png',
            '/xo/images/fields/15x15LineHorizontal.png',
            '/xo/images/fields/15x15LineVertical.png',
            '/xo/images/fields/15x15LineLeftToDown.png',
            '/xo/images/fields/15x15LineLeftToUp.png',
            '/xo/images/fields/3x3LineVertical.png',
            '/xo/images/fields/3x3LineHorizontal.png',
            '/xo/images/fields/3x3LineLeftToUp.png',
            '/xo/images/fields/3x3LineLeftToDown.png',
            '/xo/images/font/1025.png',
            '/xo/images/font/1040.png',
            '/xo/images/font/1041.png',
            '/xo/images/font/1042.png',
            '/xo/images/font/1043.png',
            '/xo/images/font/1044.png',
            '/xo/images/font/1045.png',
            '/xo/images/font/1046.png',
            '/xo/images/font/1047.png',
            '/xo/images/font/1048.png',
            '/xo/images/font/1049.png',
            '/xo/images/font/1050.png',
            '/xo/images/font/1051.png',
            '/xo/images/font/1052.png',
            '/xo/images/font/1053.png',
            '/xo/images/font/1054.png',
            '/xo/images/font/1055.png',
            '/xo/images/font/1056.png',
            '/xo/images/font/1057.png',
            '/xo/images/font/1058.png',
            '/xo/images/font/1059.png',
            '/xo/images/font/1060.png',
            '/xo/images/font/1061.png',
            '/xo/images/font/1062.png',
            '/xo/images/font/1063.png',
            '/xo/images/font/1064.png',
            '/xo/images/font/1065.png',
            '/xo/images/font/1066.png',
            '/xo/images/font/1067.png',
            '/xo/images/font/1068.png',
            '/xo/images/font/1069.png',
            '/xo/images/font/1070.png',
            '/xo/images/font/1071.png',
            '/xo/images/font/1072.png',
            '/xo/images/font/1073.png',
            '/xo/images/font/1074.png',
            '/xo/images/font/1075.png',
            '/xo/images/font/1076.png',
            '/xo/images/font/1077.png',
            '/xo/images/font/1078.png',
            '/xo/images/font/1079.png',
            '/xo/images/font/1080.png',
            '/xo/images/font/1081.png',
            '/xo/images/font/1082.png',
            '/xo/images/font/1083.png',
            '/xo/images/font/1084.png',
            '/xo/images/font/1085.png',
            '/xo/images/font/1086.png',
            '/xo/images/font/1087.png',
            '/xo/images/font/1088.png',
            '/xo/images/font/1089.png',
            '/xo/images/font/1090.png',
            '/xo/images/font/1091.png',
            '/xo/images/font/1092.png',
            '/xo/images/font/1093.png',
            '/xo/images/font/1094.png',
            '/xo/images/font/1095.png',
            '/xo/images/font/1096.png',
            '/xo/images/font/1097.png',
            '/xo/images/font/1098.png',
            '/xo/images/font/1099.png',
            '/xo/images/font/1100.png',
            '/xo/images/font/1101.png',
            '/xo/images/font/1102.png',
            '/xo/images/font/1103.png',
            '/xo/images/font/1105.png',
            '/xo/images/font/32.png',
            '/xo/images/font/33.png',
            '/xo/images/font/45.png',
            '/xo/images/font/46.png',
            '/xo/images/font/48.png',
            '/xo/images/font/49.png',
            '/xo/images/font/50.png',
            '/xo/images/font/51.png',
            '/xo/images/font/52.png',
            '/xo/images/font/53.png',
            '/xo/images/font/54.png',
            '/xo/images/font/55.png',
            '/xo/images/font/56.png',
            '/xo/images/font/57.png',
            '/xo/images/font/58.png'
        ], callback);
    };

    var drawText = function (context, text, offsetX, offsetY, width, scale) {
        var textHTML, symbol_url, charCode, existsSymbols, symbol, x, y, resultWidth;
        if (!scale) {
            scale = 0.85;
        }
        existsSymbols = '1234567890абвгдеёжзийклмнопрстуфхцчшщьыъэюя.!:- АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
        x = offsetX;
        y = offsetY;
        resultWidth = 0;
        for (var i in text) {
            symbol = text[i];
            charCode = text.charCodeAt(i);
            /* feed line symbol: 0xAh, 10d, \n */
            if (existsSymbols.indexOf(symbol) == -1) {
                //fuck off! @fuckOff @todo
                Logs.log("LogicDrawWallPost. symbol does not found!", Logs.LEVEL_WARNING);
            } else {
                symbol_url = "/xo/images/font/" + charCode + ".png";
                resultWidth += images[symbol_url].width * scale;
            }
        }
        if (width) {
            x += (width - resultWidth) / 2;
        }
        for (var i in text) {
            symbol = text[i];
            charCode = text.charCodeAt(i);
            /* feed line symbol: 0xAh, 10d, \n */
            if (charCode == 10) {
                y += 28;
                continue;
            }
            if (existsSymbols.indexOf(symbol) == -1) {
                //fuck off! @fuckOff @todo
                Logs.log("LogicDrawWallPost. symbol does not found!", Logs.LEVEL_WARNING);
            } else {
                symbol_url = "/xo/images/font/" + charCode + ".png";
                drawImage(context, symbol_url, x, y, images[symbol_url].width * scale, images[symbol_url].height * scale);
                x += images[symbol_url].width * scale;
            }
        }
    };

    var getCanvas = function () {
        if (!canvasDom) {
            canvasDom = GUI.createCanvas(undefined, {
                x: 0,
                y: 0
            });
            //@todo size to 500x500 or somethink like this.
            canvasDom.__dom.setAttribute('height', canvasHeight);
            canvasDom.__dom.setAttribute('width', canvasWidth);
            canvasDom.__dom.style.display = 'none';
        }
        return canvasDom;
    };

    var getContext = function () {
        return getCanvas().__dom.getContext('2d');
    };

    var loadImages = function (pathList, callback) {
        var loaded;
        loaded = 0;
        pathList.forEach(function (path) {
            if (!images[path]) {
                loadImage(path, function () {
                    loaded++;
                    if (loaded == pathList.length) {
                        callback();
                    }
                });
            } else {
                loaded++;
                if (loaded == pathList.length) {
                    callback();
                }
            }
        });
    };

    var loadImage = function (path, callback) {
        images[path] = new Image;
        images[path].onload = function () {
            callback();
        };
        images[path].src = path;
    };

    var drawImage = function (context, path, x, y, width, height) {
        if (!images[path]) {
            Logs.log("LogicDrawWallPost. Image not found " + path, Logs.LEVEL_WARNING);
        }
        if (!x) x = 0;
        if (!y) y = 0;
        if (!width) width = images[path].width;
        if (!height)height = images[path].height;
        context.drawImage(images[path], x, y, width, height);
    };

    var getBase64PNG = function () {
        return getCanvas().__dom.toDataURL('image/png');
    }
};

/**
 * константный класс.
 * @type {LogicDrawWallPost}
 */
LogicDrawWallPost = new LogicDrawWallPost();