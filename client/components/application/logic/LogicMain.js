LogicMain = function () {

    this.main = function () {
        Logs.init(function () {
        });

        /** init some components */
        SocNet.init();

        /* WebSocket Client */
        webSocketClient = new WebSocketClient();
        webSocketClient.init(function () {
        });

        //@todo need be automate...
        /* ApiRouter */

        ApiRouter.setMap({
            CAPIUser: CAPIUser,
            CAPIGame: CAPIGame,
            CAPIChat: CAPIChat,
            CAPIInvites: CAPIInvites,
            CAPIUserState: CAPIUserState,
            CAPIRating: CAPIRating,
            CAPITimeServer: CAPITimeServer
        });

        /* Link ApiRouter and WebSocketClient */
        ApiRouter.sendData = webSocketClient.sendData;
        webSocketClient.onData = ApiRouter.onData;
        webSocketClient.onConnect = this.onConnect;
        webSocketClient.onDisconnect = ApiRouter.onDisconnect;

        PageController.showPage(PageMain);


        /* running */
        webSocketClient.run();
    };

    /**
     * After connect
     * @param connectionId
     */
    this.onConnect = function (connectionId) {
        ApiRouter.onConnect(connectionId);
        LogicUser.authorize();
    }
};
