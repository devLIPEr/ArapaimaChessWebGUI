var wasmReady = false;
var Module = {
    print: function(text){
        addEngineOut(text);

        if(text[0] == "b"){
            let m = text.substring(9);
            let move = game.move({
                from: m.substring(0, 2),
                to: m.substring(2, 4),
                promotion: m.substring(4)
            });
            game.move(move);
            updateStatus();
            board1.position(game.fen());
            let p = document.createElement('p');
            p.className = "move";
            p.innerText = `${game.history().length}. ${move.san}`;
            document.getElementById("move_sequence").appendChild(p);

            currPlayer ^= 1;
        }
    },

    printErr: function(text){
        addEngineOut(text, false, true);
    },

    onRuntimeInitialized: function() {
        console.log("WASM ready to accept commands.");
        wasmReady = true;

        setTimeout(() => {
            sendEngine("setoption name allpruning value true");
        }, 100);
    }
};

function sendEngine(cmd){
    if(!wasmReady){
        console.error("Attempted to call sendEngine() before WASM was initialized. Command dropped:", cmd);
        return;
    }

    addEngineOut(cmd, false);
    Module.ccall(
        'process_uci_command',
        'number',
        ['string'],
        [cmd]
    );
}

var config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: async (s, t) => await onDrop(s, t),
    onSnapEnd: onSnapEnd,
    onMouseoutSquare: onMouseoutSquare,
    onMouseoverSquare: onMouseoverSquare,
};
var board1 = undefined;
var game = new Chess();
var playerColor = 1;
var currPlayer = 1;
var boardPerspective = 1;
var boardFen = "";

var whiteSquareGrey = '#a9a9a9'
var blackSquareGrey = '#696969'

// https://chessboardjs.com/examples#5003
function removeGreySquares(){
    $('#board1 .square-55d63').css('background', '');
}

function greySquare(square){
    var $square = $('#board1 .square-' + square);

    var background = whiteSquareGrey;
    if($square.hasClass('black-3c85d')){
        background = blackSquareGrey;
    }

    $square.css('background', background);
}


function onMouseoverSquare(square, piece){
    var moves = game.moves({
        square: square,
        verbose: true
    });

    if(moves.length === 0) return;

    greySquare(square);

    for(var i = 0; i < moves.length; i++){
        greySquare(moves[i].to);
    }
}

function onMouseoutSquare(square, piece){
    removeGreySquares();
}

// https://chessboardjs.com/examples#5000
function onDragStart(source, piece, position, orientation){
    if(game.game_over()) return false;

    if((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)){
        return false;
    }
}

function moveSequence(sequence){
    let seq = "";
    for(let i = 0; i < sequence.length; i++){
        seq += `${sequence[i].from}${sequence[i].to}${(sequence[i].promotion !== undefined) ? sequence[i].promotion : ""} `;
    }
    return seq.substring(0, seq.length-1);
}

var promoResolver = undefined;
function promote(){
    return new Promise((resolve) => {
        promoResolver = resolve;
    });
}

function handlePromo(piece){
    if(promoResolver){
        promoResolver(piece);

        promoResolver = undefined;
    }
}

document.getElementById("promo_q").addEventListener("click", () => handlePromo('q'));
document.getElementById("promo_r").addEventListener("click", () => handlePromo('r'));
document.getElementById("promo_b").addEventListener("click", () => handlePromo('b'));
document.getElementById("promo_n").addEventListener("click", () => handlePromo('n'));
async function onDrop(source, target){
    let promo = '';
    let possibleMoves = game.moves({ verbose: true, square: source });
    let isPromotion = possibleMoves.some((move) => move.to == target && move.flags.includes('p'));
    
    if(isPromotion){
        let popup = document.getElementById("promotion_popup");
        popup.style.display = "flex";
        
        popup.style.top = `${document.getElementById("board1").offsetTop}px`;
        popup.style.left = `${document.getElementById("board1").offsetLeft - popup.children[0].children[0].height}px`;
        
        promo = await promote();
        
        popup.style.display = 'none';
    }
    
    var move = game.move({
        from: source,
        to: target,
        promotion: promo
    });
    
    if(move === null) return 'snapback';
    
    if(promo != ''){
        board1.position(game.fen());
    }
    updateStatus();
    let p = document.createElement('p');
    p.className = "move";
    p.innerText = `${game.history().length}. ${move.san}`;
    document.getElementById("move_sequence").appendChild(p);
    document.getElementById("move_sequence").scrollTop = document.getElementById("move_sequence").scrollHeight;
    
    currPlayer ^= 1;
    if(!game.in_draw() && !game.in_checkmate()){
        let hist = game.history({verbose: true});
        sendEngine(`position ${boardFen != '' ? ("fen " + boardFen) : "startpos"} ${hist.length > 0 ? "moves " + moveSequence(game.history({verbose:true})) : ''}`)
        sendEngine("go wtime 10000 winc 100 btime 10000 binc 100");
    }
}

function onSnapEnd(){
    board1.position(game.fen());
}

function updateStatus(){
    var moveColor = 'White';
    if(game.turn() === 'b'){
        moveColor = 'Black';
    }

    removeGreySquares();
}

function resizeBoard(){
    let board_size = Math.min(document.getElementById("board").clientWidth, document.getElementById("board").clientHeight) * 0.9;
    document.getElementById("board1").style.height = `${board_size}px`;
    document.getElementById("board1").style.width = `${board_size}px`;
    if(board1) board1.resize();
 
    let width = document.getElementById("white_player").clientWidth;
    let clippeds = document.getElementsByClassName("clipped_img");
    for(let i = 0; i < clippeds.length; i++){
        clippeds[i].style.width = `${width}px`;
    }

    if(document.getElementsByClassName("square-a8")[0] !== undefined){
        width = document.getElementsByClassName("square-a8")[0].clientWidth;
        let promos = document.getElementsByClassName("piece_promo");
        for(let i = 0; i < promos.length; i++){
            promos[i].style.width = `${width}px`;
            promos[i].style.height = `${width}px`;
        }
    }
}

function setOrientation(orientation, set){
    if(orientation === undefined){
        orientation = (Math.random() >= 0.5) ? "white" : "black";
    }
    board1.orientation(orientation);
    if(set){
        playerColor = (orientation == "white") ? 1 : 0;
        document.getElementById("promo_q").children[0].src = `img/chesspieces/wikipedia/${playerColor == 1 ? 'w' : 'b'}Q.png`;
        document.getElementById("promo_r").children[0].src = `img/chesspieces/wikipedia/${playerColor == 1 ? 'w' : 'b'}R.png`;
        document.getElementById("promo_b").children[0].src = `img/chesspieces/wikipedia/${playerColor == 1 ? 'w' : 'b'}B.png`;
        document.getElementById("promo_n").children[0].src = `img/chesspieces/wikipedia/${playerColor == 1 ? 'w' : 'b'}N.png`;
        if(playerColor != currPlayer){
            setTimeout(() => {
                let hist = game.history({verbose: true});
                sendEngine(`position ${boardFen != '' ? ("fen " + boardFen) : "startpos"} ${hist.length > 0 ? "moves " + moveSequence(game.history({verbose:true})) : ''}`)
                sendEngine("go wtime 10000 winc 100 btime 10000 binc 100");
            }, 1000);
        }
    }
}

function undoMove(){
    let lastMove = game.undo();

    if(lastMove){
        currPlayer ^= 1;
        board1.position(game.fen());
        updateStatus();

        let children = document.getElementById("move_sequence").children;
        children[children.length - 1].remove();
        if(currPlayer != playerColor){
            setTimeout(() => {
                let hist = game.history({verbose: true});
                sendEngine(`position ${boardFen != '' ? ("fen " + boardFen) : "startpos"} ${hist.length > 0 ? "moves " + moveSequence(game.history({verbose:true})) : ''}`)
                sendEngine("go wtime 10000 winc 100 btime 10000 binc 100");
            }, 1000);
        }
    }
}

function resign(resetBoard=true){
    playerColor = 1;
    currPlayer = 1;
    moves = [];
    game.reset();
    if(resetBoard){
        board1.orientation("white");
        board1.start(false);
        document.getElementById("move_sequence").innerHTML = "";
    }
    sendEngine("ucinewgame")
}

function addEngineOut(out, fromEngine=true, isError=false){
    let p = document.createElement('p');
    p.className = "move";
    p.innerText = out;
    if(!fromEngine){
        p.classList.add("reverse");
    }
    if(isError){
        p.classList.add("error");
    }
    document.getElementById("engine_out").appendChild(p);
    document.getElementById("engine_out").scrollTop = document.getElementById("engine_out").scrollHeight;
}

addEventListener("resize", (event) => {
    resizeBoard();
});

addEventListener("load", (event) => {
    resizeBoard();
    board1 = Chessboard('board1', config);
    updateStatus();
});

document.getElementById("fen").addEventListener("focusout", (event) => {
    if(event.target.value != boardFen){
        let parts = event.target.value.split(" ");
        boardFen = event.target.value;
        resign(false);
        currPlayer = (parts[1] == "w") ? 1 : 0;
        playerColor = currPlayer;
        boardPerspective = currPlayer;
        board1.orientation((parts[1] == "w") ? "white" : "black");
        board1.position(event.target.value, false);
        game.load(event.target.value);
        event.target.value = "";

        sendEngine(`position fen ${boardFen}`)
    }
});

addEventListener("mousedown", (event) => {
    if(promoResolver !== undefined){
        promoResolver("");
    }
})