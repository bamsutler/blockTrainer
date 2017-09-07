let Block = require('./block');
let transaction = require('./coin');
let crypto = require('crypto');

//start the chain
let chain = dll();

function startChain(){
    let seedAddressBuffer = crypto.randomBytes(256);
    let seedAddressHasher = crypto.createHash('sha256');
    seedAddressHasher.update(seedAddressBuffer);
    
    //create the genisis block
    let G = Block({}, {}, null, '0', createAddress());
    //add the genisis block to the chain
    chain.add(G);

    let unspentTransactions = {};
    let pendingTransactions = [];

    function createAddress(){
        let seedAddressBuffer = crypto.randomBytes(256);
        let seedAddressHasher = crypto.createHash('sha256');
        seedAddressHasher.update(seedAddressBuffer);
        return seedAddressHasher.digest('base64');
    }

    function buildBlock(nonce, creatorAddress){
        //tend pendnig transactions are proccessed
        var outputs = pendingTransactions.splice(0,10);
        var inputs = [];
        var finalOutputs = [];

        for(let key in outputs){
            var result = processTransaction(outputs[key]);
            if(!result){
                continue; // bad transactions get droped
            }
            inputs.splice(inputs.length > 0 ? inputs.length-1 : 0, 0, result.inputs);
            finalOutputs.push(outputs[key]);
            if(result.change !== null){
                finalOutputs.push(result.change);
            }
        }

        let creatorPayment = transaction(creatorAddress, 'Genisis', 5);
        finalOutputs.push(creatorPayment);
        unspentTransactions[creatorPayment.id] = creatorPayment;

        let newBlock = Block(inputs, 
            finalOutputs, chain.getTail().block.header.blockId, nonce, creatorAddress);
        chain.add(newBlock);

        finalOutputs.forEach(function(output){
            finalizeTransaction(output);
        });

        return newBlock;

    }
    function processTransaction(tx){
        let closed = [];
        let closedAmount = 0;
        let senderAddress = tx.fromAddress;
        let change = null;

        //tx had no amount in it 
        if(tx.amount <= 0){
            return null;
        }

        //find and close unspent transactions untill closedAmount > tx.amount
        for(let key in unspentTransactions){
            let current = unspentTransactions[key];
            if(current.toAddress == senderAddress){
                closedAmount += current.amount;
                closed.push(current);
            }
            //create an output transaction for address.from -> address.from in the amount of closedAmount - tx.amount
            if(closedAmount > tx.amount){
                change = transaction(senderAddress,senderAddress,closedAmount - tx.amount);
                break;
            }
        }
        
        //wallet address didnt have enough coin
        if(closedAmount < tx.amount){
            return null;
        }

        //close selected unspent transactions
        closed.forEach(function(tx){
            delete unspentTransactions[tx.id];
        });
        
        return { inputs: closed, change };
    }
    function createPendingTransaction(to,from,amount){
        var tx = transaction(to,from,amount);
        pendingTransactions.push(tx);
    }
    function finalizeTransaction(tx){
        unspentTransactions[tx.id] = tx;
    }
    function getPendingTxns(){
        return pendingTransactions;
    }
    function getBalance(address){
        let total = 0;
        for(let key in unspentTransactions){
            if(unspentTransactions[key].toAddress == address){
                total += Number(unspentTransactions[key].amount);
            }
        }
        return total;
    }
    function getTopBlocks(){
        let topBlocks = [];
        let it = chain.iterator();
        for (let i=0; i<4; i++){
            topBlocks.push(it.currentNode.block);
            if(it.hasNext()){
                it.next()
            }else{
                break;
            }
        }
        return topBlocks;
    }

    return {
        getIterator: chain.iterator,
        getTopBlocks,
        buildBlock,
        createPendingTransaction,
        getPendingTxns,
        createAddress,
        getBalance,
    };
}

module.exports = startChain;

// Utility Funcitons

function dll(){
    let _tail = null;
    let _head = null;
    let length = 0;
    let makeNode = function(data){
        return {
            _next: null,
            _prev: _tail,
            _index: length,
            block: data,
        };
    };
    return {
        add: function(block){
            if(length === 0){
                _head = makeNode(block);
                _tail = _head;
                length += 1;
            }else{
                let newNode = makeNode(block);
                _tail._next = newNode;
                _tail = newNode;
                length += 1;
            }
        },
        getHead: function(){
            return _head;
        },
        getTail: function(){
            return _tail;
        },
        iterator: function(){
            let currentNode = _head;
            return {
                next: function(){
                    this.currentNode = this.currentNode._next;
                },
                hasNext: function(){
                    return this.currentNode._next !== null;
                },
                prev: function(){
                    this.currentNode = this.currentNode._prev;
                },
                hasPrev: function(){
                    return this.currentNode._prev !== null;
                },
                currentNode
            };
        }
    };
}