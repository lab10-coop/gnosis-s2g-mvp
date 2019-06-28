
var pcsc = require('pcsclite');
var Security2GoCard = require('./submodules/web3-s2g');
var Web3 = require('web3');
var express = require('express');
var app = express();
var path = require('path');
var deploySafe = require('./deploySafe.js');
var pcsc = pcsc();

var _currentData = {};

//const debugState_safeReady = { "currentGnosisSafeAddress": "0xf81d752a2E7617C70267aaD8d3Ff927312a369E3", "state": "safeReady", "collectedSafeAddresses": ["0x4abb023f60997bfbeeadb38e0caabd8b623bf2d3", "0xe856a0cad6368c541cf11d9d9c8554b156fa40fd"], "lastError": "", "multisigPayoutAddress": "", "multisigCollected": {}, "multisigTransactionHash": "" };

const debugState_setupSafe = {
    "currentGnosisSafeAddress": "0xf81d752a2E7617C70267aaD8d3Ff927312a369E3",
    "state": "setupSafe",
    "collectedSafeAddresses": ["0x4abb023f60997bfbeeadb38e0caabd8b623bf2d3", "0xe856a0cad6368c541cf11d9d9c8554b156fa40fd"],
    "lastError": "",
    "multisigPayoutAddress": "",
    "multisigCollected": {},
    "multisigTransactionHash": ""
}

const debugState_multiSigSetup = { "currentGnosisSafeAddress": "0xf81d752a2E7617C70267aaD8d3Ff927312a369E3", "state": "multiSigSetup", "collectedSafeAddresses": ["0x4abb023f60997bfbeeadb38e0caabd8b623bf2d3", "0xe856a0cad6368c541cf11d9d9c8554b156fa40fd"], "lastError": "", "multisigPayoutAddress": "", "multisigCollected": {}, "multisigTransactionHash": "" };


const debugState_saveFundingSetup = { "currentGnosisSafeAddress": "0xf81d752a2E7617C70267aaD8d3Ff927312a369E3", "state": "safeFundingSetup", "collectedSafeAddresses": ["0x4abb023f60997bfbeeadb38e0caabd8b623bf2d3", "0xe856a0cad6368c541cf11d9d9c8554b156fa40fd"], "lastError": "", "multisigPayoutAddress": "", "multisigCollected": {}, "multisigTransactionHash": "" };

const debugState_multiSigCollecting = {"currentGnosisSafeAddress":"0xf81d752a2E7617C70267aaD8d3Ff927312a369E3","state":"multiSigCollecting","collectedSafeAddresses":["0x4abb023f60997bfbeeadb38e0caabd8b623bf2d3","0xe856a0cad6368c541cf11d9d9c8554b156fa40fd"],"lastError":"","multisigPayoutAddress":"0x0774fe042bc23d01599b5a92b97b3125a4cb20ee","multisigCollected":{},"multisigTransactionHash":"0x5b6b6cf67e762a011fb98500907e81b035f17dfd7c9c7abbc7969c7574c0e19a","multisigTransaction":{"to":"0x0774fe042bc23d01599b5a92b97b3125a4cb20ee","value":"0x16345785d8a0000","data":"0x","operation":0,"safeTxGas":50000,"baseGas":300000,"gasPrice":"0x0","gasToken":"0x0000000000000000000000000000000000000000","refundReceiver":"0x0000000000000000000000000000000000000000","nonce":"0x0"}}

//states:
// deploy -> deploying -> deployed (R) -> collectingMultiSigAddresses -> setupSafe -> settingUpSafe -> SafeReady (R) -> SafeFundingSetup -> SafeFunding -> SafeFunded (R) -> MultiSigSetup -> MultiSigCollecting -> MultiSigSending -> MultisigSuccess.


//                                                                                                     ^                                  ^                                    -
//                                                                                                     -------------------------------------------------------------------------
// (R) => Remove card to progress to next state


//deploy: waits for a card that is used to sign off the deploy transaction.
const STATE_DEPLOY = 'deploy'
//deploying: a new safe is about to be deployed.
const STATE_DEPLOYING = 'deploying'
//a new safe just got deployed, user need to continue with setup the addresses for multisig.
const STATE_DEPLOYED = 'deployed'

const STATE_COLLECTINGMULTISIGADDRESSES = 'collectingMultiSigAddresses'

//system collects now the card addresses for setting up a safe.
const STATE_SETUPSAFE = 'setupSafe'

const STATE_SETTINGUPSAFE = 'settingUpSafe'
const STATE_SAFEREADY = 'safeReady'

const STATE_SAFEFUNDINGSETUP = 'safeFundingSetup'
const STATE_SAFEFUNDING = "safeFunding"
const STATE_SAFEFUNDED = "safeFunded"
const STATE_MULTISIGSETUP = 'multiSigSetup'
const STATE_MULTISIGCOLLECTING = 'multiSigCollecting'
const STATE_MULTISIGSENDING = 'multiSigSending'
const STATE_MULTISIGSUCCESS = 'multisigSuccess'


//const state_collectingMultisigAddresses

//_currentData.currentGnosisSafeAddress = '0xC59791222C5513995AAE19283af5Fc3b3B4595Ce'
_currentData.currentGnosisSafeAddress = ''
_currentData.state = STATE_DEPLOY;
_currentData.collectedSafeAddresses = []; //array of '0xabc..890' string with the addresses that should get added to the safe.
_currentData.lastError = '';
_currentData.multisigPayoutAddress = '';
_currentData.multisigCollected = {}; // map with the safeAddress as index and a signature as value.
_currentData.multisigTransaction = undefined; // Transaction object that is used to send out funds to multisigPayoutAddress
_currentData.multisigTransactionHash = '';


//_currentData = debugState_multiSigSetup;
//_currentData = debugState_setupSafe;
_currentData = debugState_multiSigCollecting;

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/index_client.js', function (req, res) {
    console.log('getting index_client.js')
    res.sendFile(path.join(__dirname + '/index_client.js'));
});

app.get('/currentData.json', function (req, res) {
    //console.log('getting currentData')
    res.send(JSON.stringify(_currentData));
});

app.get('/settingUpSafe.json', function (req, res) {
    if (_currentData.state === STATE_COLLECTINGMULTISIGADDRESSES) {
        if (_currentData.collectedSafeAddresses.length == 0) {
            _currentData.lastError = 'There is at minimum 1 address required to initialize a gnosis safe';
        } else {
            _currentData.state = STATE_SETUPSAFE;
        }
    }
    res.send(JSON.stringify(_currentData));
});

app.get('/deployNewGnosisSave.json', async function (req, res) {
    console.log('deployNewGnosisSave.json')
    //const newSafeAddress = deployNewSafe();
    _currentData.currentGnosisSafeAddress = undefined
    _currentData.state = STATE_DEPLOY
    _currentData.collectedSafeAddresses = [] //array of '0xabc..890' string with the addresses that should get added to the safe.
    _currentData.lastError = ''

    res.send(JSON.stringify(_currentData));
})


app.listen(3000);


const web3_options = {
    transactionConfirmationBlocks: 1,
    defaultGasPrice: '1000000000',
    //transactionSigner:  <------- TODO: Maybe we can create an web3 provider that internally uses the smartcard ??
}

const web3_address = 'ws://ws.tau1.artis.network';
//const web3_address = 'https://rpc.tau1.artis.network';
//const web3_address = 'http://127.0.0.1:9545/';
//const web3_address = 'https://rpc.sigma1.artis.network';


const web3 = new Web3(web3_address, null, web3_options);
//var web3 = new Web3('http://127.0.0.1:9545/');

async function setupSafe(card) {

    console.log('setting up safe');
    _currentData.state = STATE_SETTINGUPSAFE;
    const setupSafeResult = await deploySafe.setupSafe(web3, _currentData.currentGnosisSafeAddress, _currentData.collectedSafeAddresses, card);

    if (setupSafeResult) {
        console.log('setting up safe done!');
        _currentData.state = STATE_SAFEREADY;
        return setupSafeResult;
    }

}



function newCard(reader) {
    let card = new Security2GoCard.Security2GoCard(reader);
    card.log_debug_signing = false;
    card.log_debug_web3 = false;

    return card;
}

pcsc.on('reader', function (reader) {

    console.log('New reader detected', reader.name);
    //console.log(reader);
    if (reader.name.startsWith('Identive Identive CLOUD 4500 F Dual Interface Reader [CLOUD 4700 F Contact Reader]')) {
        console.log('ignoring that reader.');
        return;
    }


    reader.on('error', function (err) {
        console.log('Error(', this.name, '):', err.message);
    });

    reader.on('status', async function (status) {
        console.log('Status(', this.name, '):', status);
        /* check what has changed */
        var changes = this.state ^ status.state;
        if (changes) {
            if ((changes & this.SCARD_STATE_EMPTY) && (status.state & this.SCARD_STATE_EMPTY)) {
                console.log("card removed");/* card removed */
                _currentData.lastError = '';
                reader.disconnect(reader.SCARD_LEAVE_CARD, function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Disconnected');
                    }
                });
                if (_currentData.state === STATE_DEPLOYED) {
                    _currentData.state = STATE_COLLECTINGMULTISIGADDRESSES
                } else if (_currentData.state === STATE_SAFEREADY) {
                    _currentData.state = STATE_SAFEFUNDINGSETUP
                } else if (_currentData.state === STATE_SAFEFUNDED) {
                    _currentData.state = STATE_MULTISIGSETUP
                    //SafeFunded (R) -> MultiSigSetup
                }

            } else if ((changes & this.SCARD_STATE_PRESENT) && (status.state & this.SCARD_STATE_PRESENT)) {

                const stateBackup = Object.assign({}, _currentData);
                _currentData.lastError = '';
                try {

                    const card = newCard(reader);
                    if (_currentData.state === STATE_COLLECTINGMULTISIGADDRESSES) {
                        //_currentData.state = STATE_SETUPSAFE
                        await state_collectingMultisigAddresses(card);
                        //_currentData.collectedSafeAddresses                    
                    } else if (_currentData.state === STATE_DEPLOY) {
                        //console.error('state not implemented yet: ' + _currentData.state);
                        const deploy = await state_deploy(card);
                        console.log('deployed: ' + deploy);
                    } else if (_currentData.state === STATE_SETUPSAFE) {
                        await setupSafe(card);
                    } else if (_currentData.state === STATE_SAFEFUNDINGSETUP) {
                        await state_safeFundingSetup(card);
                    } else if (_currentData.state === STATE_MULTISIGSETUP) {
                        console.log('MULTISIG Setup');
                        await state_multisigSetup(card);
                    } else if (_currentData.state === STATE_MULTISIGCOLLECTING) {
                        await state_multisigCollecting(card);
                    }
                    else {
                        console.error('state not implemented yet: ' + _currentData.state);
                    }

                } catch (err) {
                    console.error('CAUGHT ERROR:');
                    _currentData = Object.assign({}, stateBackup);
                    _currentData.lastError = 'error:' + err;
                    //_currentData.state = 'error';
                    console.error(_currentData.lastError);
                }

                //doSomeTests(reader);

            }
        }
    });

    reader.on('end', function () {
        console.log('Reader', this.name, 'removed');
    });
});

pcsc.on('error', function (err) {
    console.log('PCSC error', err.message);
});

//STATE_COLLECTINGMULTISIGADDRESSES
async function state_collectingMultisigAddresses(card) {

    if (!_currentData.currentGnosisSafeAddress) {
        console.error('INVALID STATE: no SafeAddress found in the state Setup');
        return;
    }
    const cardAddress = await card.getAddress(1);

    //const currentCreator = await deploySafe.getSafeCreator(web3, _currentData.currentGnosisSafeAddress);

    //if the used address has not been added yet, than add it. it is used later to setup the safe.

    if (_currentData.collectedSafeAddresses.indexOf(cardAddress) === -1) {
        console.log('Setup Safe: new multi sig enabled address: ' + cardAddress);
        _currentData.collectedSafeAddresses.push(cardAddress);
    } else {
        console.log('Card allready known:' + cardAddress);
    }
}

async function state_deploy(card) {

    _currentData.state = STATE_DEPLOYING;
    const deployedSafe = await deploySafe.deployNewSafe(web3, card);
    console.log('deployedSafe=>');
    console.log(deployedSafe.address);
    _currentData.state = STATE_DEPLOYED;
    _currentData.currentGnosisSafeAddress = deployedSafe.address;
    _currentData.collectedSafeAddresses = [];
    //_currentData.lastError = '';



    //console.log(JSON.stringify(addressOfLastSafe));  
    //console.log(safe)
}

async function state_safeFundingSetup(card) {

    // Prepare the raw transaction information
    let tx = {
        gasPrice: web3.utils.numberToHex('1000000000'),
        gasLimit: web3.utils.numberToHex('100000'),
        //value: web3.utils.toWei('1'),
        value: web3.utils.toHex(web3.utils.toWei('1')),
        to: _currentData.currentGnosisSafeAddress
    };

    console.log(`tx: ${JSON.stringify(tx, null, 2)}`);
            

    //console.log('to-transfer: ' + tx.value);

    //try {
        _currentData.state = STATE_SAFEFUNDING;
        const txReceipt = await card.signAndSendTransaction(web3, tx, 1);
        //todo : check Balance or something ?

        _currentData.state = STATE_SAFEFUNDED;
    // } catch (err) {
    //     _currentData.lastError = '';
    // }
}

async function state_multisigCollecting(card) {
    const address = await card.getAddress(1);
    if (_currentData.multisigCollected[address] == undefined) {

        console.log(`collecting multisig form ${address}`);

        const signedTx = await card.getSignedTransactionObject(web3, _currentData.multisigTransaction, 1);
        console.log('got signed Transaction');
        //console.log(signedTx);
        _currentData.multisigCollected[address] = signedTx;

        const numOfCollectedMultisigTxs = Object.keys(_currentData.multisigCollected).length;
        console.log(`numOfCollectedMultisigTxs : ${numOfCollectedMultisigTxs}`);

        if ( numOfCollectedMultisigTxs  == _currentData.collectedSafeAddresses.length) {
            // we now have all signatures, move forward.
            _currentData.state = STATE_MULTISIGSENDING;
            
            const safeTransferTransaction = await deploySafe.sendMultisigTransaction(web3, card, _currentData.currentGnosisSafeAddress, _currentData.multisigTransaction, _currentData.multisigTransactionHash, _currentData.multisigCollected);
        
        } else{
            console.log('waiting for further transactions.' + numOfCollectedMultisigTxs + ' / ' + _currentData.collectedSafeAddresses.length);
        }

    } else {
        //overwrite existing ??
        console.log('There is already a signature existing for this address.');
    }
}

async function state_multisigSetup(card) {

    const address = await card.getAddress(1);
    console.log('Multisig Setup target:' + address);
    _currentData.multisigPayoutAddress = address;

    const gnosisSafeTX = await deploySafe.createGnosisSafeTransaction(web3, _currentData.currentGnosisSafeAddress, _currentData.multisigPayoutAddress,web3.utils.toHex(web3.utils.toWei('0.1')));
    console.log('gnosis safe TX:', gnosisSafeTX);
    var txHash = await deploySafe.getGnosisSafeTransactionHash(web3, _currentData.currentGnosisSafeAddress, gnosisSafeTX);
    console.log('txHash:', txHash);

    _currentData.multisigTransactionHash = txHash;
    _currentData.multisigTransaction = gnosisSafeTX;
    _currentData.multisigCollected = {};

    _currentData.state = STATE_MULTISIGCOLLECTING;
}

function printCurrentData() {
    console.log('currentState:')
    console.log(_currentData)
}

function printState() {
    console.log('printState:')
    console.log(_currentData.state)
}

printCurrentData();
printState();
console.log("System Ready!");
//header( 'refresh: 5; url=http://www.example.net' );