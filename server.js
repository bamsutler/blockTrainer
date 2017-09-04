var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var fs = require('fs');
var chain = require('./peoplecoin');
var svgCaptcha = require('svg-captcha');
var win = require('winston');

var log = new (win.Logger)({
    level: 'debug',
    transports: [
        new (win.transports.Console)({colorize: true}),
        //new (win.transports.File)({ filename: 'somefile.log' })
    ]
});
chain = chain();

var port = 80;

app.listen(port);
//eslint-disable-line no-console
log.info('Listening on ', port); 

function handler (req, res) {
    if(req.url === '/') {
        fs.readFile(__dirname + '/index.html',
            function (err, data) {
                if (err) {
                    res.writeHead(500);
                    return res.end('Error loading index.html');
                }

                res.writeHead(200);
                res.end(data);
            });
    }
    if(req.url === '/index.js') {
        fs.readFile(__dirname + '/index.js',
            function (err, data) {
                if (err) {
                    res.writeHead(500);
                    return res.end('Error loading index.js');
                }

                res.writeHead(200);
                res.end(data);
            });
    }   
        
    if(req.url === '/yeti.css') {
        fs.readFile(__dirname + '/yeti.css',
            function (err, data) {
                if (err) {
                    res.writeHead(500);
                    return res.end('Error loading yeti');
                }

                res.writeHead(200);
                res.end(data);
            });
    }   
}

var users = {};
var userCount = 0;

io.on('connection', function (socket) {
    users[socket.id] = {
        address: chain.createAddress()
    };
    userCount += 1;
    let usersAddresses = [];
    for(let key in users){
        if(users[key].address != users[socket.id].address){
            usersAddresses.push(users[key].address);
        }
    }
    socket.emit('connected', {
        address: users[socket.id].address,
        userCount:  userCount,
        usersAddresses: usersAddresses,
        userBalance: chain.getBalance(users[socket.id].address)
    });
    socket.on('get captcha', function() {
        var c = svgCaptcha.create();
        users[socket.id].captchaText = c.text;
        socket.emit('new captcha', c.data);
    });
    socket.on('captcha submit', function(data){
        if(data == users[socket.id].captchaText){
            var nextBlock = chain.buildBlock(data.cap, users[socket.id].address);
            io.emit('solved block', nextBlock);
        }
    });
    socket.on('transaction submit', function(data){
        chain.createPendingTransaction(data.to, data.from, data.amount);
        io.emit('update transactions', chain.getPendingTxns() );
    });

    socket.on('get user data', function(){
        socket.emit('user data', {
            userBalance: chain.getBalance(users[socket.id].address)
        } );
    });

    socket.on('disconnect', function(){
        delete users[socket.id];
        io.emit('user disconnect', {});
    });

});

