const WebSocket = require("ws");

class PlayerObject {
    id = "";
    letzteHand = "";
    ready = false;
    health = 100;
    lastRoundWinner = false;
    socket = null;

    constructor(_id, _socket){
        this.id = _id;
        this.socket = _socket;
    }
}

const wss = new WebSocket.Server({ port: 8080 });
let playerIndex = 1;

CLIENTS = [];
wss.on("connection", (ws) => 
{
    ws.id = "Player " + playerIndex; // Spieler bekommt eine Id (fortlaufend)
    ws.send("ID|" + ws.id);
    playerIndex++; // Spieler Index einen hochzählen
    let playerObject = new PlayerObject( ws.id, ws ); 
    CLIENTS.push(playerObject); // hier wird der neue Client dem Array hinzugefügt

    console.log(CLIENTS.length, " Clients connected");
    
    // hierdurch kann er auf Nachrichten reagieren
    ws.on('message', function(message) 
    {
        // wir suchen den Client mit der id aus unserer Liste raus
        playerObject = CLIENTS.find((item) => item.id == ws.id);

        if (message == "ready")
        {
            playerObject.ready = true;

            // sind alle ready?
            const readyPlayerCount = CLIENTS.filter((item) => item.ready === true).length;
            
            // wenn beide bereit sind
            if (readyPlayerCount == 2)
            {
                console.log("Alle Spieler sind Ready");
                // wir schicken jedem Spieler die info dass er seine Hand auswählen soll
                for(const rcClient of CLIENTS)
                    rcClient.socket.send("selecthand");
                
            }
        }
        // Wenn der Client seine Hand schickt
        if (message.toString() == "schere" || message.toString() == "stein" || message.toString() == "papier")
        {
            playerObject.letzteHand = message.toString();

            // Hand wurde empfangen, sind alle Hände da?
            const handsCount = CLIENTS.filter((item) => item.letzteHand != "").length;
            if (handsCount == CLIENTS.length)
            {
                // Wir filtern alle Hände jeweils in eine eigene Variable raus
                const schere = CLIENTS.filter((f) => f.letzteHand == "schere");
                const stein = CLIENTS.filter((f) => f.letzteHand == "stein");
                const papier = CLIENTS.filter((f) => f.letzteHand == "papier");

                // Unentschieden 
                let isDraw = schere.length == handsCount || stein.length == handsCount || papier.length == handsCount;

                if (isDraw)
                {
                    // an alle Clients schicken wir neue Runde
                    for(const rcClient of CLIENTS)
                    {
                        rcClient.letzteHand = "";
                        rcClient.socket.send("newgame");
                    }
                }
                else 
                {
                    gewinnerSind = [];
                    bestrafung = [];

                    if (schere.length > 0 && stein.length > 0)
                    {
                        // stein gewinnt
                        gewinnerSind = CLIENTS.filter((item) => item.letzteHand == "stein");
                        bestrafung = CLIENTS.filter((item) => item.letzteHand != "stein");
                    }
                    else if (schere.length > 0 && papier.length > 0)
                    {
                        // schere gewinnt
                        gewinnerSind = CLIENTS.filter((item) => item.letzteHand == "schere");
                        bestrafung = CLIENTS.filter((item) => item.letzteHand != "schere");
                    }
                    else if (stein.length > 0 && papier.length > 0)
                    {
                        // papier gewinnt
                        gewinnerSind = CLIENTS.filter((item) => item.letzteHand == "papier");
                        bestrafung = CLIENTS.filter((item) => item.letzteHand != "papier");
                    }

                    let newGameIsPossible = true;

                    // Verlierer bekommt -20 health
                    for(const bestrafungItem of bestrafung)
                    {
                        bestrafungItem.lastRoundWinner = false;
                        bestrafungItem.health -= 20;
                        if (bestrafungItem.health <= 0)
                            newGameIsPossible = false;
                    }

                    // alle Gewinner bekommen den bool lastRoundWinner
                    for(const gewinnerSindItem of gewinnerSind)
                    {
                        gewinnerSindItem.lastRoundWinner = true;
                    }

                    // wir schicken an alle Clients das Leben aller Spieler
                    for(const clientItem of CLIENTS)
                    {
                        // aktuellen health aller Spieler senden
                        for(const playerItem of CLIENTS)
                        {
                            if (playerItem.lastRoundWinner)
                                clientItem.socket.send("WIN|" + playerItem.health + "|" + playerItem.id);
                            else 
                                clientItem.socket.send("LOSE|" + playerItem.health + "|" + playerItem.id);
                        }
                    }
                    
                    // wir schicken jetzt an alle Clients ihren neuen health starten ein neues Spiel
                    for(const clientItem of CLIENTS)
                    { 
                        // die letze Hand wird zurückgesetzt
                        clientItem.letzteHand = ""; 

                        // wir gucken ob neue Runde möglich ist oder ob finish
                        if (newGameIsPossible)
                            clientItem.socket.send("newgame");
                        else
                        {
                            // bei finish wird der Spieler zurückgesetzt
                            clientItem.ready = false;
                            clientItem.health = 100;
                            clientItem.socket.send("finish");
                        }
                    }
                }
            }
        }
    });

    ws.on("close", ws => 
    { 
        let clientObject = CLIENTS.find((item) => item.id == ws.id); // wir suchen den Client in unserer Liste
        if (clientObject)
        {
            const wsIndex = CLIENTS.indexOf(clientObject); // wir finden den Index in der Liste heraus
            if (wsIndex >= 0) 
                CLIENTS.splice(wsIndex, 1); // wir löschen das Objekt an dieser Position
    
            console.log("a client disconnected");
        }
    });

   

    

    

});

