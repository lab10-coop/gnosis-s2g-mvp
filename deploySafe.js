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

async function deployNewSafe(web3) {
    await deployContract(web3, 'GnosisSafe');
}

// // wrapping the init stuff into an async function in order to have await available
// async function start(web3) {

//     safe = new web3.eth.Contract(safeAbi, config.safe.address, { from: config.safe.executor.address });

//     // test read from contract
//     const safeName = await safe.methods.NAME().call();
//     console.log(`contract initialized at ${config.safe.address} - name: ${safeName}`);

//     nonce = await safe.methods.nonce().call()
//     txObj = { to: "0x30B125d5Fc58c1b8E3cCB2F1C71a1Cc847f024eE", value: web3.utils.toWei("1"), data: "0x", operation: 0, safeTxGas: 50000, baseGas: 300000, gasPrice: 0, gasToken: "0x0000000000000000000000000000000000000000", refundReceiver: "0x0000000000000000000000000000000000000000", nonce: nonce }
//     txHash = await safe.methods.getTransactionHash.apply(null, Object.values(txObj)).call()
//     console.log(`txHash ${txHash}`)
// // txHash: '0x155d83dee836ee08ad89daeefeb1bdbeee4807a0552f2d889ad4cd8cc3ff31c7'

//     signers = ["0x0101cc588ba64651171c024e7839706ab4e72d08"]
//     sortedSigners = signers.sort()
//     console.log(`signers (sorted): ${sortedSigners}`)

//     chainId = 246785
//     sigString = '0x'
//     signer_privateKey = config.safe.executor.privateKey

// // for every signer
//     sig = ethUtil.ecsign(Buffer.from(ethUtil.stripHexPrefix(txHash), 'hex'), Buffer.from(signer_privateKey, 'hex'), chainId)
//     sigString += sig.r.toString('hex') + sig.s.toString('hex') + sig.v.toString(16)
//     console.log(`sigString: ${sigString}`)
// // sigString: '0xc49ef50c604c98168779a5b9a1a30f760eb30b117e19a82f961107fb3976934d1370611a7d75dfd757e42739db75de41a01d88d31ddc98c5d10c803c2a9e301478825'

//     execTxArgs = Object.values(txObj)
// // execTransaction doesn't need the last item (nonce), but instead needs the signatures
//     execTxArgs.splice(9, 1, sigString)
//     console.log(`execTxArgs: ${execTxArgs}`)

// // await safe.methods.execTransaction.apply(null, execTxArgs).send( { from: config.safe.executor.address } )

//     execTxData = safe.methods.execTransaction.apply(null, execTxArgs).encodeABI()
//     outerTxObj = { from: config.safe.executor.address, to: safe.address, data: execTxData, gas: 300000, gasPrice: 1000000000 }
//     console.log(`outerTxObj: ${JSON.stringify(outerTxObj, null, 2)}`)

// //    signedExecTxObj = await web3.eth.accounts.signTransaction(outerTxObj, `0x${config.safe.executor.privateKey}`)
//     signedExecTxObj = await web3.eth.accounts.signTransaction(outerTxObj, `0x${config.safe.executor.privateKey}`)
//     console.log(`signedExecTxObj: ${JSON.stringify(signedExecTxObj, null, 2)}`)

//     // check
//     execTxSigner = web3.eth.accounts.recoverTransaction(signedExecTxObj.rawTransaction)
//     console.log(`execTxSigner: ${execTxSigner}`)

//     // WTF SIGNER DOES NOT MATCH!
//     // web3.eth.accounts.privateKeyToAccount() also returns the same wrong address if the privKey isn't prefixed with 0x
//     // however prefixing above for signing doesn't make a difference

//     // another try
//     outerTxObj = {
//         to: safe.address,
//         data: execTxData,
//         gasLimit: web3.utils.toHex(300000),
//         gasPrice: web3.utils.toHex(1000000000),
//         value: web3.utils.toHex(0),
//         chainId: web3.utils.toHex(await web3.eth.net.getId()),
//         nonce: web3.utils.toHex(await web3.eth.getTransactionCount(config.safe.executor.address))
//     };
//     privKeyBuf = Buffer.from(config.safe.executor.privateKey, 'hex');

//     outerTx = new ethTx(outerTxObj);
//     outerTx.sign(privKeyBuf);
//     console.log(`signed tx: ${JSON.stringify(outerTx, null, 2)}`);

//     serTx = outerTx.serialize();
//     serTxStr = '0x' + serTx.toString('hex');

//     console.log(`serTxStr: ${serTxStr}`);

//     execTxSigner = web3.eth.accounts.recoverTransaction(serTxStr);
//     console.log(`execTxSigner with ethTx: ${execTxSigner}`);

//     sentTx = await web3.eth.sendSignedTransaction(serTxStr);
//     console.log(`sentTx: ${JSON.stringify(sentTx, null, 2)}`);

//     // halleluja!
// }
// start();

async function deployContract(web3, contractName) {

    let privateKey = Buffer.from("9c94b9956c6085cf2c649333200452f478b1f330dcf5e6eb26b38fb7644e2f36", "hex");
    let address = "0x9a973d7C126041a87362aD2De13d35ec9ab35341";

    
    // It will read the ABI & byte code contents from the JSON file in ./build/contracts/ folder
    let jsonOutputName = path.parse(contractName).name + '.json';
    let jsonFile = './contracts/build/' + jsonOutputName;

    // Read the JSON file contents
    let contractJsonContent = fs.readFileSync(jsonFile, 'utf8');    
    let jsonOutput = JSON.parse(contractJsonContent);

    //console.log(jsonOutput);
    // Retrieve the ABI 
    let abi = jsonOutput.abi;

    // Retrieve the byte code
    let bytecode = jsonOutput.bytecode;
    
    let contract = new web3.eth.Contract(abi);
    let contractData = null;

    const deployedContract = contract.deploy({data: bytecode});

    let encodedData = deployedContract.encodeABI();
   


    // Prepare the smart contract deployment payload
    // If the smart contract constructor has mandatory parameters, you supply the input parameters like below 
    //
    // contractData = tokenContract.new.getData( param1, param2, ..., {
    //    data: '0x' + bytecode
    // });    

    // contractData = tokenContract.new.getData({
    //     data: '0x' + bytecode
    // });

    const nonceHex = web3.utils.toHex(await web3.eth.getTransactionCount(address));

    console.log('nonceHex:' + nonceHex);

    // Prepare the raw transaction information
    let rawTx = {
        nonce: nonceHex,
        gasPrice: 1000000000,
        gasLimit: 8000000,
        data: encodedData,
        from: address
    };

    let tx = new Tx(rawTx);

    // Sign the transaction 
    tx.sign(privateKey);
    let serializedTx = tx.serialize();

    let receipt = null;

    // Submit the smart contract deployment transaction
    txResult = await web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'));
    
    //console.log('ContractAddress: ' + txResult);
    //console.log(txResult);
    //console.log('ca:');
    // console.log(txResult.contractAddress);
    return txResult.contractAddress;
}


exports.Web3 = Web3;
//exports.config = config;
exports.web3 = web3;
exports.safe = safe;
exports.deployNewSafe = deployNewSafe;

/*
exports = {
    Web3,
    config,
    web3: web3,
    safe
};
*/


/*
let { Web3, config, web3, safe } = require('./index')

nonce = await safe.methods.nonce().call()
txObj = { to: "0x30B125d5Fc58c1b8E3cCB2F1C71a1Cc847f024eE", value: web3.utils.toWei("1"), data: "0x", operation: 0, safeTxGas: 0, baseGas: 200000, gasPrice: 1000000000, gasToken: "0x0000000000000000000000000000000000000000", refundReceiver: "0x0000000000000000000000000000000000000000", nonce: nonce }
txHash = await safe.methods.getTransactionHash.apply(null, Object.values(txObj)).call()
// txHash: '0x155d83dee836ee08ad89daeefeb1bdbeee4807a0552f2d889ad4cd8cc3ff31c7'

signers = ["0x0101cc588ba64651171c024e7839706ab4e72d08"]
sortedSigners = signers.sort()

chainId = 246785
sigString = '0x'

// for every signer
sig = ethUtil.ecsign(new Buffer(ethUtil.stripHexPrefix(msgHash), 'hex'), new Buffer(signer_privateKey, 'hex'), chainId)
sigString += '0x' + sig.r.toString('hex') + sig.s.toString('hex') + sig.v.toString(16)
// sigString: '0xc49ef50c604c98168779a5b9a1a30f760eb30b117e19a82f961107fb3976934d1370611a7d75dfd757e42739db75de41a01d88d31ddc98c5d10c803c2a9e301478825'

execTxArgs = Object.values(txObj)
// execTransaction doesn't need the last item (nonce), but instead needs the signatures
execTxArgs.splice(9, 1, sigString)

// await safe.methods.execTransaction.apply(null, execTxArgs).send( { from: config.safe.executor.address } )

txData = safe.methods.execTransaction.apply(null, execTxArgs).encodeABI()
outerTxObj = { from: config.safe.executor.address, to: safe.address, data: txData, gas: 300000, gasPrice: 1000000000 }

signedOuterTxObj = await web3.eth.accounts.signTransaction(outerTxObj, config.safe.executor.privateKey)
 */


/*
execTxArgs = [ '0x30B125d5Fc58c1b8E3cCB2F1C71a1Cc847f024eE',
  '1000000000000000000',
  '0x',
  0,
  0,
  200000,
  1000000000,
  '0x0000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000000000',
  '0xc49ef50c604c98168779a5b9a1a30f760eb30b117e19a82f961107fb3976934d1370611a7d75dfd757e42739db75de41a01d88d31ddc98c5d10c803c2a9e301478825' ]
 */
