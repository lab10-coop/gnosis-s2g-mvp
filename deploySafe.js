/*
- get an estimate for needed gas with safe.requiredTxGas() | can be skipped for the demo (hardcoded gas)
- get nonce with safe.nonce()
- get txHash with safe.getTransactionHash()
- get signatures
  - sort signers alphabetically (TODO: case sensitive?)
  - sign txHash
  - return sigs concatenated (r,s,v), 0x prefixed
- execute with safe.execTransaction()
*/

const ethUtil = require("ethereumjs-util");
const ethTx = require('ethereumjs-tx');
const Web3 = require('web3');
const path = require('path');
const fs = require('fs');
const Tx = require('ethereumjs-tx');

//const config = require('./config');
//const safeAbi = require('./GnosisSafe_abi');

let log_debug = true;

let web3, safe;

function logDebug(message) {
    if(log_debug) {
        console.log(message);
    }
}

async function deployNewSafe(web3, card) {
    return await deployContract(web3, 'GnosisSafe', card);
}

function toHexString(byteArray) {
    var s = '';
    byteArray.forEach(function(byte) {
      s += ('0' + (byte & 0xFF).toString(16)).slice(-2);
    });
    return s;
}

function trim0x(hexString) {
    if (hexString.startsWith('0x')) {
        hexString = hexString.substring(2, hexString.length);
    }
    return hexString;
}

function fixLengthTo32Bytes(hexString) {
    while (hexString.length > 64){
        if (hexString.startsWith('00')) {
            hexString = hexString.substring(2, hexString.length);
        } else {
            throw `unable to fix hexstring to length 32: ${hexString}`;
        }
    }

    while (hexString.length < 64) {
        hexString = hexString + '00';
    }
    return hexString;
}

function createGnosisSafeObject(web3, gnosisSafeAddress) {
    const contractName = 'GnosisSafe'
    const jsonOutputName = path.parse(contractName).name + '.json';
    const jsonFile = './contracts/build/' + jsonOutputName;

    // Read the JSON file contents
    const contractJsonContent = fs.readFileSync(jsonFile, 'utf8');    
    const jsonOutput = JSON.parse(contractJsonContent);

    //logDebug(jsonOutput);
    // Retrieve the ABI 
    const abi = jsonOutput.abi;
    return new web3.eth.Contract(abi, gnosisSafeAddress);
}

async function setupSafe(web3, gnosisSafeAddress, addresses, card) {

    const gnosisSafeContract =  createGnosisSafeObject(web3, gnosisSafeAddress);
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const setupEncodedAbi = gnosisSafeContract.methods.setup(addresses, addresses.length,  zeroAddress/* to */, '0x0' /* data */, zeroAddress /* address paymentToken */, '0x0' /*uint256 payment*/,zeroAddress /*address payable paymentReceiver*/).encodeABI();

    logDebug('got encodedAbi for setup call: ' + setupEncodedAbi)
    const sendResult = await sendTx(web3, gnosisSafeAddress, setupEncodedAbi, card);
    logDebug('got result: ');
    logDebug(sendResult);

    const ownerCall = await gnosisSafeContract.methods.getOwners().call();
    logDebug('got owners:');
    logDebug(ownerCall);

    return sendResult;

    //const setupPE =setupFunction.send({} , function(txHash) { logDebug('setupSafe TX: ' + txHash) });
}

async function createGnosisSafeTransaction(web3, gnosisSafeAddress, toAddress, value) {

    const gnosisSafe = createGnosisSafeObject(web3,gnosisSafeAddress);
    const safeNonce = await gnosisSafe.methods.nonce().call();
    console.log('gnosisSafe Nonce:' + safeNonce.toString('hex'));

    const gnosisSafeTX = {
        to: toAddress,
        value: value,
        data: "0x",
        operation: 0,
        safeTxGas: 50000,
        baseGas: 300000,
        gasPrice: '0x0',
        gasToken: "0x0000000000000000000000000000000000000000",
        refundReceiver: "0x0000000000000000000000000000000000000000",
        nonce: web3.utils.toHex( safeNonce )
    };

    // const txHash = await safe.methods.getTransactionHash.apply(null, Object.values(txObj)).call();
    // console.log(`txHash ${txHash}`);

    return gnosisSafeTX;

}

async function getGnosisSafeTransactionHash(web3,gnosisSafeAddress, gnosisSafeTransaction) {

    const gnosisSafe = createGnosisSafeObject(web3,gnosisSafeAddress);
    // console.log(gnosisSafeTransaction);
    // console.log(gnosisSafeAddress);
    
    const result = await gnosisSafe.methods.getTransactionHash(gnosisSafeTransaction.to, gnosisSafeTransaction.value, gnosisSafeTransaction.data, gnosisSafeTransaction.operation, gnosisSafeTransaction.safeTxGas, gnosisSafeTransaction.baseGas, gnosisSafeTransaction.gasPrice, gnosisSafeTransaction.gasToken, gnosisSafeTransaction.refundReceiver, gnosisSafeTransaction.nonce).call(); 

    // console.log('txHash: ' + result);
    // console.log(result);
    
    return result;
}

//sendMultisigTransaction(web3, card, _currentData.multisigPayoutAddress, _currentData.multisigTransaction, _currentData.multisigTransactionHash, _currentData.multisigCollected)

async function sendMultisigTransaction(web3, card, gnosisSafeAddress, multisigTransaction, multisigTransactionHash, multisigCollected) {

    console.log('sending multisig transaction.');
    const safe = createGnosisSafeObject(web3, gnosisSafeAddress);
    //console.log('gnosis safe created');
    const signers = Object.keys( multisigCollected ); // doesn't have to be the same addr. It's just easier to manage if so.
    //const sortedSigners = signers.sort();
    //console.log(`signers (sorted): ${sortedSigners}`);
    console.log(`Signers: ${JSON.stringify(signers)}`);
    let sigString = "0x";

    Object.entries(multisigCollected).forEach(([address, sig]) => {
        if (sig == undefined) {
            return;
        }
        console.log( `appending signature from ${address}`);
        //console.log(`type: ${typeof sig.r}`);
        //console.log(sig.r);
        //console.log(`r: ${sig.r.toString("hex")}, s: ${sig.s.toString("hex")}, v: ${sig.v.toString(16)}`);

        //
        var signaturePart = fixLengthTo32Bytes(trim0x(sig.r)) + fixLengthTo32Bytes(trim0x(sig.s)) + trim0x(sig.v);
        console.log('appending: ' + signaturePart); 

        //r: 64 + s: 64 + v: 2 = 130 chars per signature.
        if (signaturePart.length != 130) {
            throw `Expected string length of signature to be 130, leading zero problem ?`
        }
        sigString += signaturePart;
        console.log(`sigString: ${sigString}`);
     });

    const execTxArgs = Object.values(multisigTransaction);
    
    console.log(`before execTxArgs: ${execTxArgs}`);
    // execTransaction doesn't need the last item (nonce), but instead needs the signatures
    execTxArgs.splice(9, 1, sigString);
    console.log(`after execTxArgs: ${execTxArgs}`);

// await safe.methods.execTransaction.apply(null, execTxArgs).send( { from: config.safe.executor.address } )

    const execTxDataOld = safe.methods.execTransaction.apply(null, execTxArgs).encodeABI();
    const execTxData = safe.methods.execTransaction( multisigTransaction.to, multisigTransaction.value, multisigTransaction.data,  multisigTransaction.operation, multisigTransaction.safeTxGas, multisigTransaction.baseGas, multisigTransaction.gasPrice, multisigTransaction.gasToken, multisigTransaction.refundReceiver, sigString ).encodeABI()

    if (execTxDataOld != execTxData) {
        console.error('Difference detected: ' );
        console.error(execTxData);
        console.error(execTxDataOld);
    }

    let outerTxObj = {
        //from: config.safe.executor.address,
        to: gnosisSafeAddress,
        data: execTxData,
        gas: web3.utils.toHex('1000000'),
        gasPrice: web3.utils.toHex('100000000000'),
        //chainId: 1 // if not set, it will fail for ganache due to eth_chainId not being supported
    };

    console.log('Exec Data:' + execTxData);
    const execCallRet = await web3.eth.call(outerTxObj);
    console.log(`execCallRet: ${execCallRet}`);

    // console.log(`outerTxObj: ${JSON.stringify(outerTxObj, null, 2)}`);
    // const execCallRet = await web3.eth.call(outerTxObj);
    // console.log(`execCallRet: ${execCallRet}`);

    //sendTransaction()

    // const signedExecTxObj = await web3.eth.accounts.signTransaction(outerTxObj, `0x${config.safe.executor.privateKey}`);
    // console.log(`signedExecTxObj: ${JSON.stringify(signedExecTxObj, null, 2)}`);

    // check
    // let execTxSigner = web3.eth.accounts.recoverTransaction(signedExecTxObj.rawTransaction);
    // console.log(`execTxSigner: ${execTxSigner}`);

    // const sentTx = await web3.eth.sendSignedTransaction(signedExecTxObj.rawTransaction);


    return await sendTx(web3, gnosisSafeAddress, execTxData, card);

    
    //card.signAndSendTransaction(web3, outerTxObj, 1);
   

}

async function sendTx(web3, toAddress,  encodedAbi, card) {

    // Prepare the raw transaction information
    let rawTx = {
        //nonce: nonceHex,
                  
        gasPrice: web3.utils.toHex('100000000000'),
        gasLimit: 6721975, // <- Ganache hardcoded gas limit
        data: encodedAbi,
        //from: privateKey_address,
        to: toAddress
    };

    let tx = new Tx(rawTx);

    const cardKeyIndex = 1;
    const signature = await card.signTransaction(web3, tx, cardKeyIndex);

    // Submit the smart contract deployment transaction
    txResult = await web3.eth.sendSignedTransaction(signature.toString('hex'));
    
    logDebug('ContractAddress: ' + txResult);
    logDebug(txResult);
    logDebug('ca:');
    logDebug(txResult.contractAddress);

    return txResult;
}


async function deployContract(web3, contractName, card) {

    const cardKeyIndex = 1;
    // It will read the ABI & byte code contents from the JSON file in ./build/contracts/ folder
    let jsonOutputName = path.parse(contractName).name + '.json';
    let jsonFile = './contracts/build/' + jsonOutputName;

    // Read the JSON file contents
    let contractJsonContent = fs.readFileSync(jsonFile, 'utf8');    
    let jsonOutput = JSON.parse(contractJsonContent);

    // Retrieve the ABI 
    let abi = jsonOutput.abi;
    // Retrieve the byte code
    let bytecode = jsonOutput.bytecode;
    let contract = new web3.eth.Contract(abi);
    const deployedContract = contract.deploy({data: bytecode});

    let encodedData = deployedContract.encodeABI();
  
    const address = await card.getAddress(cardKeyIndex);
    const nonceHex = web3.utils.toHex(await web3.eth.getTransactionCount(address));

    logDebug('nonceHex:' + nonceHex);

    // Prepare the raw transaction information
    let rawTx = {
        nonce: nonceHex,
        gasPrice:  web3.utils.toHex('100000000000'),
        gasLimit: 6721975, // <- Ganache hardcoded gas limit
        data: encodedData,
        from: address
    };

    let tx = new Tx(rawTx);
    const signature = await card.signTransaction(web3, tx, cardKeyIndex);


    //logDebug(signature.toString('hex'));

    txResult = await web3.eth.sendSignedTransaction(signature.toString('hex'));

    logDebug('ContractAddress: ' + txResult);
    logDebug(txResult);
    logDebug('ca:');
    logDebug(txResult.contractAddress);
    
    contract.address = txResult.contractAddress;

    return contract;
}

exports.Web3 = Web3;
//exports.config = config;
exports.web3 = web3;
exports.safe = safe;
exports.deployNewSafe = deployNewSafe;
exports.setupSafe = setupSafe;
exports.getGnosisSafeTransactionHash = getGnosisSafeTransactionHash;
exports.createGnosisSafeTransaction = createGnosisSafeTransaction;
exports.sendMultisigTransaction = sendMultisigTransaction;