let crypto = require('crypto');

/**
 * 
 * 
 * @param {object} transactions map of input transactions
 * @param {object} outputs map of output transactions
 * @param {string} lastBlock id of the last block
 * @param {any} nonce string to give some randomness
 * @param {any} winner address to give the block reward
 * @returns an object with a new block and the corisponding header
 */
function Block(transactions, outputs, lastBlock, nonce, winner){
    let blockData = {
        txns: transactions,
        outs: outputs,
        lastBlockId: lastBlock != null ? lastBlock.Id : null,
        blockIndex: lastBlock != null ? lastBlock.blockIndex : 0,
        reward_address: winner,
        timestamp: Date.now(),
    };

    let hasher = crypto.createHash('sha256');
    let blockIder = crypto.createHash('sha256');

    let errors = validateData(blockData);
    if(errors){
        throw new Error(errors);
    }

    for(let key in blockData.txns){
        hasher.update(blockData.txns[key].toString());
    }
    for(let key in blockData.outs){
        hasher.update(blockData.outs[key].toString());
    }
    if(blockData.lastBlock){
        hasher.update(blockData.lastBlock.toString());
    }
    if(blockData.lastBlockIndex){
        hasher.update(blockData.lastBlockIndex.toString());
    }
    hasher.update(blockData.reward_address.toString());
    
    
    hasher.update(blockData.timestamp.toString());
    let contentHash = hasher.digest('base64');
    blockIder.update(contentHash);
    blockIder.update(String(nonce));

    let header = {
        contentHash: contentHash,
        nonce: nonce,
        blockId: blockIder.digest('base64'),
    };

    return {
        blockData,
        header
    };
}

function validateData(data){
    let errors = [];
    if(!Array.isArray(data.txns)){
        errors.push('Invalid Transaction Data');
    }
    if(!Array.isArray(data.outs)){
        errors.push('Invalid output Data');
    }
    if(data.blockIndex === 0 && data.lastBlock != null){
        errors.push('Invalid blockIndex Data');
    }
    if(data.lastBlock === null && data.blockIndex !== 0){
        errors.push('Invalid Last Block hash');
    }
}

module.exports = Block;
