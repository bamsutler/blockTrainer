const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const chainGen = require('./peoplecoin');
const svgCaptcha = require('svg-captcha');
const win = require('winston');

let PORT = 80;
var args = process.argv.slice(2);
if(args[0]){
    PORT = args[0];
}

let log = new (win.Logger)({
    level: 'debug',
    transports: [
        new (win.transports.Console)({colorize: true}),
        new (win.transports.File)({ filename: 'server.log' })
    ]
});
let chain = chainGen();
let port = PORT;
let users = {};
let userCount = 0;

server.listen(port);
//eslint-disable-line no-console
log.info('Listening on ', port); 

app.get('/', function(req, res, next){
    res.sendFile(__dirname + '/index.html', function(err){
        if(err){
            next(err);
        } else {
            win.debug('Sent index to ' + req.ip);
        }
    });
});

app.use(express.static('public'));

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
    socket.emit('connected', JSON.stringify({
        address: users[socket.id].address,
        userCount:  userCount,
        usersAddresses: usersAddresses,
        userBalance: chain.getBalance(users[socket.id].address),
        topBlocks: chain.getTopBlocks(),
    }));
    io.emit('peer connected', {
        address: users[socket.id].address,
        userCount:  userCount,
    });

    socket.on('get captcha', function() {
        let c = svgCaptcha.create();
        users[socket.id].captchaText = c.text;
        socket.emit('new captcha', c.data);
    });
    socket.on('captcha submit', function(data){
        if(data == users[socket.id].captchaText){
            let nextBlock = chain.buildBlock(data.cap, users[socket.id].address);
            io.emit('solved block', nextBlock);
        }
    });
    socket.on('transaction submit', function(data){
        chain.createPendingTransaction(data.to, users[socket.id].address, data.amount);
        io.emit('update transactions', chain.getPendingTxns() );
    });
    socket.on('get user data', function(){
        socket.emit('user data', {
            userBalance: chain.getBalance(users[socket.id].address)
        } );
    });

    socket.on('disconnect', function(){
        userCount -= 1;
        let usersAddresses = [];
        for(let key in users){
            if(users[key].address != users[socket.id].address){
                usersAddresses.push(users[key].address);
            }
        }
        delete users[socket.id];
        io.emit('user disconnect', {
            userCount,
            usersAddresses,
        });
    });

});

