var socket = io();
var context = {
    chain: []
};

socket.on('connected', function (dataString) {
    socket.emit('get captcha');
    let data = JSON.parse(dataString);
    context.addresses = data.usersAddresses;
    context.userCount = data.userCount;
    context.userAddress = data.address;
    context.userBalance = Number(data.userBalance);

    populateAddessBox(context.addresses);
    data.topBlocks.forEach(updateChain);

    document.getElementById('userCount').textContent = context.userCount;
    document.getElementById('userAddress').textContent = context.userAddress;
    document.getElementById('userBalance').textContent = context.userBalance;
});

socket.on('new captcha', function(data){
    var el = document.getElementById('captchaBox');
    el.innerHTML = data;
});

socket.on( 'solved block', function(data) {
    updateChain(data);
    socket.emit('get user data');
});

socket.on('user data', function(data){
    console.log('update user data', data);
    context.userBalance = Number(data.userBalance);
    document.getElementById('userBalance').textContent = Number(data.userBalance);
});

socket.on( 'update transactions', function(data) { 
    updateTransactions(data);
});

socket.on( 'user disconnect', function(data) {
    updateUserData(data);
});

socket.on('peer connected', function(data){
    addAddressOption(data.address);
    context.addresses.push(data.address);
    context.userCount = data.userCount;
    document.getElementById('userCount').textContent = context.userCount;
});


function sendCap(){
    var el = document.getElementById('capresponse');
    var data = el.value;
    socket.emit('captcha submit', data);
    socket.emit('get captcha');
    el.value = ''; // reset the text feild
}

function updateChain(block){
    context.chain.push(block);
    if (context.chain.length > 3){
        context.chain.splice(0,1);
    }
    updatePanels();
}

function updateTransactions(data){
    console.log('update trans');
    console.log(data);
    updateTransactionTable(data);
}

function updateAddress(){
    console.log('update address');
}

function updateUserData(data){
    console.log('update users', data);
    updateTransactionTable();
}

function updatePanels(){
    context.chain.forEach(function(element,index){
        var mod = -1 * (context.chain.length - 3);
        var titleSelector = 'blockID' + String(index + mod);
        var timeSelector = 'timestamp' + String(index + mod);
        //set the display things for the block
        var idEl = document.getElementById(titleSelector);
        var timeEl = document.getElementById(timeSelector);
        idEl.textContent = element.header.blockId.substring(0,20) + '...';
        timeEl.textContent = new Date(element.blockData.timestamp).toISOString();


    });
}

function sendPC(){
    let amountContainer = document.getElementById('sendAmount');
    let toAccountContainer = document.getElementById('toAccount');
    let amount = amountContainer.value;
    let toKey = toAccountContainer.value;
    if(isSendable(amount) && toKey !== null){
        //send transactions here
        socket.emit('transaction submit', {
            to: context.addresses[toKey],
            amount,
        });
    }
    amountContainer.value = ''; // reset the text field
    toAccountContainer.selectedIndex = 0;
}

function isSendable(amount){
    if(amount > context.userBalance){
        showError('Your Balance is to low to submit this transaction');
        return false;
    }
    if(isNaN(Number(amount))){
        showError('Invalid entry for amount');
        return false;
    }
    if(amount == 0){
        showError('Cannot submit transactions for zero coins');
        return false;
    }
    // catch special NaN cases here
    // see examples https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isNaN

    return true;
}

function showError(msg){
    // this should be an error toast
    console.error(msg);
}

function populateAddessBox(addresses){
    var opt = document.createElement('option');
    opt.value = null;
    opt.text = 'Select an Account';
    document.getElementById('toAccount').appendChild(opt);
    addresses.forEach(function(el){
        addAddressOption(el);
    });
}

function addAddressOption(address){
    var opt = document.createElement('option');
    var toAccountSelectBox = document.getElementById('toAccount');
    opt.value = toAccountSelectBox.childNodes.length - 2; // 2 because we have a null 0 1 2... value list
    opt.text = address;
    toAccountSelectBox.appendChild(opt);
}

function updateTransactionTable(transactionList){
    let store = {};
    let nextList = [];
    let filteredList = [];

    if(!context.transactionList){
        context.transactionList = [];
    }

    context.transactionList.forEach(function(el){
        store[el.transaction.id] = 0; //red, only in the old list
    });

    if(transactionList){
        transactionList.forEach(function(el){
            if(store[el.id] === 0){
                store[el.id] += 1; //white, didnt move
            }else if(store[el.id] === undefined){
                store[el.id] = 2; // green, new item
            }
        });
    }

    context.transactionList.forEach(function(el){
        if(store[el.transaction.id] === 0){
            filteredList.push(Object.assign({},el,{style:'danger', sortOrder: 0}));
            delete(store[el.transaction.id]);
        }else if(store[el.transaction.id] === 1){
            let whiteElement = Object.assign({},el,{style:'white', sortOrder: 1});
            filteredList.push(whiteElement);
            nextList.push(whiteElement);
            delete(store[el.transaction.id]);
        }else if(store[el.transaction.id] === 2){
            filteredList.push(Object.assign({},el,{style:'success', sortOrder: 2}));
            nextList.push(Object.assign({},el,{style:'white', sortOrder: 1}));
            delete(store[el.transaction.id]);
        }
    });

    transactionList.forEach(function(el){
        if(store[el.id] === 0){
            filteredList.push(Object.assign({},{ transaction: el },{style:'danger', sortOrder: 0}));
            delete(store[el.id]);
        }else if(store[el.id] === 1){
            let whiteElement = Object.assign({},{ transaction: el},{style:'white', sortOrder: 1});
            filteredList.push(whiteElement);
            nextList.push(whiteElement);
            delete(store[el.id]);
        }else if(store[el.id] === 2){
            filteredList.push(Object.assign({},{ transaction: el},{style:'success', sortOrder: 2}));
            nextList.push(Object.assign({},{ transaction: el},{style:'white', sortOrder: 1}));
            delete(store[el.id]);
        }
    });

    //update the way the table looks 
    runTransactionTableUpdate(filteredList,nextList);
}

function runTransactionTableUpdate(filteredList, nextList){
    buildTransacionTable(filteredList);
    setTimeout(function(nextSet){
        buildTransacionTable(nextSet);
    }, 2000, nextList);
}

function buildTransacionTable(transactions){
    context.transactionList = transactions;
    let table = document.getElementById('transactionTable');
    let newTableBody = document.createElement('tbody');
    table.removeChild(document.getElementById('transactionTableBody'));
    newTableBody.id = 'transactionTableBody';
    transactions.forEach(function(el){
        newTableBody.appendChild(buildRow(el));
    });
    table.appendChild(newTableBody);
}

function buildRow(data){
    let newRow = document.createElement('tr');
    let id = document.createElement('td');
    let to = document.createElement('td');
    let from = document.createElement('td');
    let amount = document.createElement('td');
    newRow.classList.add(data.style);
    id.textContent = data.transaction.id;
    to.textContent = data.transaction.toAddress;
    from.textContent = data.transaction.fromAddress;
    amount.textContent = data.transaction.amount;

    newRow.appendChild(id);
    newRow.appendChild(to);
    newRow.appendChild(from);
    newRow.appendChild(amount);

    return newRow;
}