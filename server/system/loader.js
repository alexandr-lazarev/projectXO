/**
 * Loader:
 * 1 - declare core constants
 * 2 - declare core functions
 * 3 - include config file
 * 4 - execute code-generators
 * 5 - include components
 * - - call .preInit()
 * - - call .init()
 * 6 - call main();
 */

/* Include nodeJS modules. */
var FS = require('fs');
var PATH = require('path');
var OS = require('os');

/* 1 - declare core constants */
require('./constants.js');

/* 2 - declare code functions */
require('./functions.js');

/* 3 - include config file */
includeConfig();

/* 4 - execute code-generators */
var code = loaderGenerateCode();

var componentsMap = loaderGetComponentsMap();

loaderIncludeComponents(componentsMap);

//loaderPreInitComponents(componentsMap);

//loaderInitComponents(componentsMap);

loaderExecuteGeneratedCode(code);

/* 6 - call main */
loaderCallMainFunction();

/**
 * Include Config file.
 */
function includeConfig() {
    var hostname = OS.hostname();
    var configPath = './../config.' + hostname + '.' + CONST_PROJECT_FOLDER_NAME + '.js';
    log("Config file: " + configPath);
    require(configPath);
}

function loaderCallMainFunction() {

    /* Execute main function. */
    logicMain = new LogicMain();
    logicMain.main();
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
function loaderGetComponentsMap() {
    var map;
    map = [];
    /**
     * Рекурсивное подключение всех файлов.
     * @param path
     */
    var scanRecursive = function (path) {
        var list;
        list = FS.readdirSync(path);
        for (var i in list) {
            if (list[i] == '.gitkeep')continue;
            if (FS.statSync(path + list[i]).isDirectory()) {
                scanRecursive(path + list[i] + '/');
            } else {
                map[getComponentNameFromPath(path + list[i])] = path + list[i];
            }
        }
    };
    scanRecursive(CONST_DIR_COMPONENTS);
    return map;
}

function loaderIncludeComponents(map) {
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
    for (var name in map) {
        includeComponent(map[name]);
    }
}

function loaderPreInitComponents(map) {
    for (var name in map) {
        if (global[name].preInit) {
            global[name].preInit();
        }
    }
}

function loaderInitComponents(map) {
    for (var name in map) {
        if (global[name].init()) {
            global[name].init();
        }
    }
}

/**
 * Code generator.
 */
function loaderGenerateCode() {

    /**
     * 1 - взять все файлы /generators/
     * 2 - подключить все
     * 3 - выполнить метод generate() в любом порядке
     * 4 - вынести отдельные части в отдельные генераторы
     */

    var list, path, name, map, i, code, result;
    path = CONST_DIR_SERVER + 'generators' + PATH.sep;
    list = FS.readdirSync(path);
    map = {};
    for (i in list) {
        name = getComponentNameFromPath(path + list[i]);
        map[name] = path + list[i];
    }
    for (name in map) {
        require(map[name]);
    }
    //@todo test generate method must be
    code = '';
    for (name in map) {
        log("Execute generator: " + name);
        result = global[name].generate();
        if (result) code += result;
    }
    return code;
}

/**
 * Execute auto-generate code.
 */
function loaderExecuteGeneratedCode(code) {

    FS.writeFileSync(CONST_DIR_SERVER + '/generated.js', code);
    require(CONST_DIR_SERVER + '/generated.js');
}