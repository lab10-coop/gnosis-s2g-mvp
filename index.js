/**
* @file Gnosis Security2G MVP
* @author Thomas Haller <thomas.haller@lab10.coop>
* @license GPLv3
* @version 0.1
*/

var pcsc = require('pcsclite');
var Security2GoCard = require('./submodules/web3-s2g');
var Web3 = require('web3');
var express = require('express');
var app = express();
var path = require('path');
var gnosisSafe = require('./gnosisSafe.js');
var pcsc = pcsc();



const web3_options = {
    transactionConfirmationBlocks: 1,
    defaultGasPrice: '100000000000',
    //transactionSigner:  <------- TODO: Maybe we can create an web3 provider that internally uses the smartcard ??
}

const web3_address = 'ws://ws.tau1.artis.network';

const localWebserverListeningPort = 3000;

//const web3_address = 'https://rpc.tau1.artis.network';
//const web3_address = 'http://127.0.0.1:9545/';
//const web3_address = 'https://rpc.sigma1.artis.network';




var _currentData = {};


//it is possible to copy the "state data" out from the UI
//and use it here for further testing.
//this are only examples - 
//since you need to use the same smart cards in order to continue from this states.

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
const debugState_single_funding = {"currentGnosisSafeAddress":"0xc60E8ceD9c78a0DF295951521A31e707AC96c935","state":"safeFundingSetup","collectedSafeAddresses":["0xe856a0cad6368c541cf11d9d9c8554b156fa40fd"],"lastError":"","multisigPayoutAddress":"","multisigCollected":{},"multisigTransactionHash":""}
const debugState_single_multiSigSetup = {"currentGnosisSafeAddress":"0xc60E8ceD9c78a0DF295951521A31e707AC96c935","state":"multiSigSetup","collectedSafeAddresses":["0xe856a0cad6368c541cf11d9d9c8554b156fa40fd"],"lastError":"","multisigPayoutAddress":"","multisigCollected":{},"multisigTransactionHash":""}
const debugState_multisigSetupFinished = {"currentGnosisSafeAddress":"0x0d7283ca1ca73239a7d11a02Dd8d4a1BC3B3750c","state":"multiSigSetupFinished","collectedSafeAddresses":["0xb222330ca92307d639b0bed948fe4f3577fc500b","0x1b629f37aed1576c2e979aff68d2983f0ab13479"],"lastError":"","multisigPayoutAddress":"0x756269ce7e0285670ecbd234f230645efba049d3","multisigCollected":{},"multisigTransaction":{"to":"0x756269ce7e0285670ecbd234f230645efba049d3","value":"0x16345785d8a0000","data":"0x","operation":0,"safeTxGas":50000,"baseGas":300000,"gasPrice":"0x0","gasToken":"0x0000000000000000000000000000000000000000","refundReceiver":"0x0000000000000000000000000000000000000000","nonce":"0x0"},"multisigTransactionHash":"0xc27b1129cb032f7076350aa49cb2f74781952b95cf155aa9f651b3f7562fdc81"}
const debugState_multiSigCollecting_New = {"currentGnosisSafeAddress":"0xf832ac85da49eD332B07ced539D06B0e6C3A50b3","state":"multiSigCollecting","collectedSafeAddresses":["0xb222330ca92307d639b0bed948fe4f3577fc500b"],"lastError":"","multisigPayoutAddress":"0x756269ce7e0285670ecbd234f230645efba049d3","multisigCollected":{"0xb222330ca92307d639b0bed948fe4f3577fc500b":{"r":"0x00ff11a3944175d503b96280d1005db99cd940424481ed5e8495c9556bdfe5a20f","s":"0x07cab04b375dd0a492f6f2b72d4abd4147aa1cadcbf5336461166541c83cce25","v":"0x1b"}},"multisigTransaction":{"to":"0x756269ce7e0285670ecbd234f230645efba049d3","value":"0x16345785d8a0000","data":"0x","operation":0,"safeTxGas":50000,"baseGas":300000,"gasPrice":"0x0","gasToken":"0x0000000000000000000000000000000000000000","refundReceiver":"0x0000000000000000000000000000000000000000","nonce":"0x0"},"multisigTransactionHash":"0xd25874707ad18958028a8d7eb80336e14d36d05b4516f0aa6de1a742dddc4e11"}
const debugState_high5_multiSigSetup = {"currentGnosisSafeAddress":"0x79c9e5C29e22fB665Dee3F0e726ccEBA3eF07ead","state":"multiSigSetup","collectedSafeAddresses":["0x4abb023f60997bfbeeadb38e0caabd8b623bf2d3","0x1b629f37aed1576c2e979aff68d2983f0ab13479","0x0774fe042bc23d01599b5a92b97b3125a4cb20ee","0xb222330ca92307d639b0bed948fe4f3577fc500b","0xe856a0cad6368c541cf11d9d9c8554b156fa40fd"],"lastError":"","multisigPayoutAddress":"","multisigCollected":{},"multisigTransactionHash":""}

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
const STATE_MULTISIGSETUPFINISHED = 'multiSigSetupFinished'
const STATE_MULTISIGCOLLECTING = 'multiSigCollecting'
const STATE_MULTISIGSENDING = 'multiSigSending'
const STATE_MULTISIGSUCCESS = 'multisigSuccess'


_currentData.currentGnosisSafeAddress = ''
_currentData.state = STATE_DEPLOY;
_currentData.collectedSafeAddresses = []; //array of '0xabc..890' string with the addresses that should get added to the safe.
_currentData.lastError = '';
_currentData.multisigPayoutAddress = '';
_currentData.multisigCollected = {}; // map with the safeAddress as index and a signature as value.
_currentData.multisigTransaction = undefined; // Transaction object that is used to send out funds to multisigPayoutAddress
_currentData.multisigTransactionHash = '';

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

app.listen(localWebserverListeningPort);

const web3 = new Web3(web3_address, null, web3_options);
//var web3 = new Web3('http://127.0.0.1:9545/');

async function setupSafe(card) {

    console.log('setting up safe');
    _currentData.state = STATE_SETTINGUPSAFE;
    const setupSafeResult = await gnosisSafe.setupSafe(web3, _currentData.currentGnosisSafeAddress, _currentData.collectedSafeAddresses, card);

    if (setupSafeResult) {
        console.log('setting up safe done!');
        _currentData.state = STATE_SAFEREADY;
        return setupSafeResult;
    }

}

function newCard(reader) {
    let card = new Security2GoCard.Security2GoCard(reader);
    card.log_debug_signing = true;
    card.log_debug_web3 = true;

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
                } else if (_currentData.state === STATE_MULTISIGSETUPFINISHED) {
                    _currentData.state = STATE_MULTISIGCOLLECTING;
                } else if (_currentData.state == STATE_MULTISIGSUCCESS) {
                    //after a success we can initiate a new payout.
                    _currentData.multisigPayoutAddress = '';
                    _currentData.multisigTransaction = undefined;
                    _currentData.multisigTransactionHash = undefined;
                    _currentData.multisigCollected = {};
                    _currentData.state = STATE_MULTISIGSETUP;
                }

            } else if ((changes & this.SCARD_STATE_PRESENT) && (status.state & this.SCARD_STATE_PRESENT)) {

                const stateBackup = Object.assign({}, _currentData);
                _currentData.lastError = '';
                try {
                    const card = newCard(reader);
                    
                    if (_currentData.state === STATE_COLLECTINGMULTISIGADDRESSES) {
                        await state_collectingMultisigAddresses(card);
                    } else if (_currentData.state === STATE_DEPLOY) {
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
                        try {
                            await state_multisigCollecting(card);
                        } catch (error) {
                            _currentData.multisigCollected = {};
                            _currentData.lastError = 'error:' + error;
                            _currentData.state = STATE_MULTISIGCOLLECTING;
                        }
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

async function state_collectingMultisigAddresses(card) {

    if (!_currentData.currentGnosisSafeAddress) {
        console.error('INVALID STATE: no SafeAddress found in the state Setup');
        return;
    }
    const cardAddress = await card.getAddress(1);

    if (_currentData.collectedSafeAddresses.indexOf(cardAddress) === -1) {
        console.log('Setup Safe: new multi sig enabled address: ' + cardAddress);
        _currentData.collectedSafeAddresses.push(cardAddress);
    } else {
        console.log('Card allready known:' + cardAddress);
    }
}

async function state_deploy(card) {

    _currentData.state = STATE_DEPLOYING;
    const deployedSafe = await gnosisSafe.deployNewSafe(web3, card);
    console.log('deployedSafe=>');
    console.log(deployedSafe.address);
    _currentData.state = STATE_DEPLOYED;
    _currentData.currentGnosisSafeAddress = deployedSafe.address;
    _currentData.collectedSafeAddresses = [];

}

async function state_safeFundingSetup(card) {

    // Prepare the raw transaction information
    let tx = {
        gasPrice: web3.utils.numberToHex('100000000000'),
        gasLimit: web3.utils.numberToHex('100000'),
        //value: web3.utils.toWei('1'),
        value: web3.utils.toHex(web3.utils.toWei('1')),
        to: _currentData.currentGnosisSafeAddress
    };

    console.log(`tx: ${JSON.stringify(tx, null, 2)}`);

    //console.log('to-transfer: ' + tx.value);

    _currentData.state = STATE_SAFEFUNDING;
    const txReceipt = await card.signAndSendTransaction(web3, tx, 1);
    //todo : check Balance or something ?
    _currentData.state = STATE_SAFEFUNDED;

}

async function state_multisigCollecting(card) {
    const address = await card.getAddress(1);
    if (_currentData.multisigCollected[address] == undefined) {

        if (_currentData.collectedSafeAddresses.indexOf(address) == -1) {
            throw `Card ${address} is not allowed to unlock this safe`;
        }

        console.log(`collecting multisig form ${address}`);

        //const signedTx = await card.getSignedTransactionObject(web3, _currentData.multisigTransaction, 1);
        const signedTx = await card.getSignatureFromHash(_currentData.multisigTransactionHash, 1);
        console.log('got signed Transaction');
        //console.log(signedTx);
        _currentData.multisigCollected[address] = signedTx;

   

    } else {
        //overwrite existing ??
        console.log('There is already a signature existing for this address.');
    }

    const numOfCollectedMultisigTxs = Object.keys(_currentData.multisigCollected).length;
    console.log(`numOfCollectedMultisigTxs : ${numOfCollectedMultisigTxs}`);

    if ( numOfCollectedMultisigTxs  == _currentData.collectedSafeAddresses.length) {
        // we now have all signatures, move forward.
        _currentData.state = STATE_MULTISIGSENDING;
        
        const safeTransferTransaction = await gnosisSafe.sendMultisigTransaction(web3, card, _currentData.currentGnosisSafeAddress, _currentData.multisigTransaction, _currentData.multisigTransactionHash, _currentData.multisigCollected);
        
        _currentData.state = STATE_MULTISIGSUCCESS;

    } else{
        console.log('waiting for further transactions.' + numOfCollectedMultisigTxs + ' / ' + _currentData.collectedSafeAddresses.length);
    }
}

async function state_multisigSetup(card) {

    const address = await card.getAddress(1);
    console.log('Multisig Setup target:' + address);
    _currentData.multisigPayoutAddress = address;

    const gnosisSafeTX = await gnosisSafe.createGnosisSafeTransaction(web3, _currentData.currentGnosisSafeAddress, _currentData.multisigPayoutAddress,web3.utils.toHex(web3.utils.toWei('0.1')));
    console.log('gnosis safe TX:', gnosisSafeTX);
    var txHash = await gnosisSafe.getGnosisSafeTransactionHash(web3, _currentData.currentGnosisSafeAddress, gnosisSafeTX);
    console.log('txHash:', txHash);

    _currentData.multisigTransactionHash = txHash;
    _currentData.multisigTransaction = gnosisSafeTX;
    _currentData.multisigCollected = {};

    _currentData.state = STATE_MULTISIGSETUPFINISHED;
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
console.log("connected to " + web3_address);
console.log("System Ready, waiting for reader. if no reader shows up - sudo systemctl restart pcscd - and restart this project might help !");