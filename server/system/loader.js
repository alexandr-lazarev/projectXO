/**
 * Loader:
 * - set constants
 * - include functions
 * - generate autocode
 * - include components
 * - include config file
 */

/* Include nodeJS modules. */
var FS = require('fs');
var PATH = require('path');
var OS = require('os');
/* Init constants */
DIR_ROOT = FS.realpathSync('./..') + PATH.sep;
DIR_SERVER = DIR_ROOT + 'server' + PATH.sep;
DIR_COMPONENTS = DIR_SERVER + 'components' + PATH.sep;
DIR_CLIENT = DIR_ROOT + 'client/' + PATH.sep;
PROJECT_FOLDER_NAME = FS.realpathSync('./..').split('/').pop();
ENGINE_IS_SERVER = true;

require('./functions.js');

generateAutoCode();

loadAllComponents(DIR_COMPONENTS);

/* Include Config file. */
var hostname = OS.hostname();

var configPath = './../Config.' + hostname + '.' + PROJECT_FOLDER_NAME + '.js';
Logs.log("Config file: " + configPath, Logs.LEVEL_NOTIFY);
require(configPath);

function generateAutoCode() {
    var list, path, groupName, methodName;

    path = DIR_CLIENT + 'components/application/capi/';
    list = FS.readdirSync(path);
    var capiList = [];
    for (var i in list) {
        groupName = getComponentNameFromPath(path + list[i]);
        require(path + list[i]);
        capiList[groupName] = [];
        for (methodName in global[groupName]) {
            if (typeof global[groupName][methodName] === 'function') {
                capiList[groupName][methodName] = true;
            }
        }
    }
    var capiCode = '';
    for (groupName in capiList) {
        capiCode = '';
        capiCode += groupName + ' = function(){\r\n\r\n';
        for (methodName in capiList[groupName]) {
            capiCode += '\tthis.' + methodName + ' = function(){\r\n\r\n';
            capiCode += '\t\tvar args, toUserId;\r\n';
            capiCode += '\t\targs = Array.prototype.slice.call(arguments);\r\n';
            capiCode += '\t\ttoUserId = args.shift();\r\n';
            capiCode += '\t\tLogicUser.sendToUser(toUserId, "' + groupName + '", "' + methodName + '", args);\r\n';
            capiCode += '\t};\r\n\r\n';
        }
        capiCode += '};\r\n';
        capiCode += groupName + ' = new ' + groupName + '();\r\n';
        FS.writeFileSync(DIR_COMPONENTS + 'generated/' + groupName + '.js', capiCode);
    }
}

/**
 * Определить имя компонента по пути к нему.
 * @param path путь к файлу компоненат.
 * @returns string имя компонента.
 */
function getComponentNameFromPath(path) {
    return PATH.basename(path).replace('.js', '');
}

/**
 * Подключение всех компонент.
 */
function loadAllComponents(path) {

    /**
     * Рекурсивное подключение всех файлов.
     * @param path
     */
    var includeRecursive = function (path) {
        var list;
        list = FS.readdirSync(path);
        for (var i in list) {
            if (FS.statSync(path + list[i]).isDirectory()) {
                includeRecursive(path + list[i] + '/');
            } else {
                includeComponent(path + list[i]);
            }
        }
    };

    /**
     * Подключение компонента по пути.
     * @param path путь к файлу компонента.
     */
    var includeComponent = function (path) {
        path = PATH.resolve(path);
        log("include component:" + getComponentNameFromPath(path));
        require(path);
        validateComponent(path);
        global[getComponentNameFromPath(path)].__path = path;
    };

    /**
     * Проверка компонента.
     * @param path {string} путь к файлу компонента.
     */
    var validateComponent = function (path) {
        var name;
        name = getComponentNameFromPath(path);
        if (!global[name]) {
            error("Файл компонента должен содержать определение компонента." +
                "\r\nфайл: " + path + "" +
                "\r\nкомпонент: " + name);
        }
        if (!(typeof global[name] == 'function' || typeof global[name] == 'object')) {
            error("Определение компонента должно иметь тип function." +
                "\r\nфайл: " + path + "" +
                "\r\nкомпонент: " + name);
        }
    };
    log("Include components");
    includeRecursive(path);
}

