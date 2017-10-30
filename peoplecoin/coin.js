let crypto = require('crypto');
function tx(to, from, num) {
    let idHasher = crypto.createHash('sha256');
    let timestamp = Date.now();

    idHasher.update(String(to));
    idHasher.update(String(from));
    idHasher.update(String(num));
    idHasher.update(String(timestamp));

    

    function stringMe(){
        return this.toaddress + this.id + this.fromAddress + Number(this.amount) + this.timestamp;
    }

    return {
        id: idHasher.digest('base64'),
        toAddress: to,
        fromAddress: from,
        amount: num,
        toString: stringMe,
        timestamp: timestamp
    };
}

module.exports = tx;