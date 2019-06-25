




class GnosisSafe {

}


let executeTransaction = async function(lw, safe, subject, accounts, to, value, data, operation, executor, opts) {
    let signer = async function(to, value, data, operation, txGasEstimate, baseGasEstimate, gasPrice, txGasToken, refundReceiver, nonce) {
        let transactionHash = await safe.getTransactionHash(to, value, data, operation, txGasEstimate, baseGasEstimate, gasPrice, txGasToken, refundReceiver, nonce)
        // Confirm transaction with signed messages
        return utils.signTransaction(lw, accounts, transactionHash)
    }
    return executeTransactionWithSigner(signer, safe, subject, accounts, to, value, data, operation, executor, opts)
}


let executeTransactionWithSigner = async function(signer, safe, subject, accounts, to, value, data, operation, executor, opts) {
    let options = opts || {}
    let txFailed = options.fails || false
    let txGasToken = options.gasToken || 0
    let refundReceiver = options.refundReceiver || 0

    // Estimate safe transaction (need to be called with from set to the safe address)
    let txGasEstimate = 0
    try {
        let estimateData = safe.contract.requiredTxGas.getData(to, value, data, operation)
        let estimateResponse = await web3.eth.call({to: safe.address, from: safe.address, data: estimateData, gasPrice: 0})
        txGasEstimate = new BigNumber(estimateResponse.substring(138), 16)
        // Add 10k else we will fail in case of nested calls
        txGasEstimate = txGasEstimate.toNumber() + 10000
        console.log("    Tx Gas estimate: " + txGasEstimate)
    } catch(e) {
        console.log("    Could not estimate " + subject + "; cause: " + e)
    }
    let nonce = await safe.nonce()

    let baseGasEstimate = estimateBaseGas(safe, to, value, data, operation, txGasEstimate, txGasToken, refundReceiver, accounts.length, nonce)
    console.log("    Base Gas estimate: " + baseGasEstimate)

    let gasPrice = GAS_PRICE
    if (txGasToken != 0) {
        gasPrice = 1
    }
    gasPrice = options.gasPrice || gasPrice

    let sigs = await signer(to, value, data, operation, txGasEstimate, baseGasEstimate, gasPrice, txGasToken, refundReceiver, nonce)
    
    let payload = safe.contract.execTransaction.getData(
        to, value, data, operation, txGasEstimate, baseGasEstimate, gasPrice, txGasToken, refundReceiver, sigs
    )
    console.log("    Data costs: " + estimatebaseGasCosts(payload))

    // Estimate gas of paying transaction
    let estimate = null
    try {
        estimate = await safe.execTransaction.estimateGas(
            to, value, data, operation, txGasEstimate, baseGasEstimate, gasPrice, txGasToken, refundReceiver, sigs
        )
    } catch (e) {
        if (options.revertMessage == undefined ||options.revertMessage == null) {
            throw e
        }
        assert.equal(("VM Exception while processing transaction: revert " + opts.revertMessage).trim(), e.message)
        return null
    }

    // Execute paying transaction
    // We add the txGasEstimate and an additional 10k to the estimate to ensure that there is enough gas for the safe transaction
    let tx = await safe.execTransaction(
        to, value, data, operation, txGasEstimate, baseGasEstimate, gasPrice, txGasToken, refundReceiver, sigs, {from: executor, gas: estimate + txGasEstimate + 10000, gasPrice: gasPrice}
    )
    let events = utils.checkTxEvent(tx, 'ExecutionFailed', safe.address, txFailed, subject)
    if (txFailed) {
        let transactionHash = await safe.getTransactionHash(to, value, data, operation, txGasEstimate, baseGasEstimate, gasPrice, txGasToken, refundReceiver, nonce)
        assert.equal(transactionHash, events.args.txHash)
    }
    return tx
}

let baseGasValue = function(hexValue) {
    switch(hexValue) {
     case "0x": return 0
     case "00": return 4
     default: return 68
   };
 }
 
 let estimatebaseGasCosts = function(dataString) {
   const reducer = (accumulator, currentValue) => accumulator += baseGasValue(currentValue)
 
   return dataString.match(/.{2}/g).reduce(reducer, 0)
 }

 