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

async function getGnosisSafeTransaction(web3, gnosisSafeAddress, toAddress, value) {
    const gnosisSafe = createGnosisSafeObject(web3,gnosisSafeAddress);
    const safeNonce = await gnosisSafe.methods.nonce().call();
    console.log('gnosisSafe Nonce:' + safeNonce);

    const data = '0x';
    const operation = 0; 
    const gasToken = '0x0000000000000000000000000000000000000000';
    const refundReceiver = '0x0000000000000000000000000000000000000000';

    console.log(`toAddress ${toAddress}`);

    //const encodedTransactionData =  await gnosisSafe.methods.encodeTransactionData(toAddress, value, data, operation, 0, 0, 0, gasToken, refundReceiver, safeNonce).call();
    //console.log(encodedTransactionData);




    const txHash = await safe.methods.getTransactionHash.apply(null, Object.values(txObj)).call();
    console.log(`txHash ${txHash}`);


}

async function sendTx(web3, toAddress,  encodedAbi, card) {

    // Prepare the raw transaction information
    let rawTx = {
        //nonce: nonceHex,
        gasPrice: 1000000000,
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
        gasPrice: 1000000000,
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
exports.getGnosisSafeTransaction = getGnosisSafeTransaction;