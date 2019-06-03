
var pcsc = require('pcsclite');
var Security2GoCard = require('./submodules/security2go/index'); 
var Web3 = require('web3');
var express = require('express');
var app = express();
var path = require('path');
var deploySafe = require('./deploySafe.js');
var pcsc = pcsc();

var _currentData = {};

//states:
// deploy -> deploying -> deployed -> collectingMultiSigAddresses -> setupSafe -> settingUpSafe -> SafeReady -> sendingOutFunds -> sentOutFunds.

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
const STATE_SAFEREADY = 'safeready'

//_currentData.currentGnosisSafeAddress = '0xC59791222C5513995AAE19283af5Fc3b3B4595Ce'
_currentData.currentGnosisSafeAddress = ''
_currentData.state = STATE_DEPLOY
_currentData.collectedSafeAddresses = []; //array of '0xabc..890' string with the addresses that should get added to the safe.
_currentData.lastError = '';

// viewed at http://localhost:8080
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/index_client.js', function(req, res) {
    console.log('getting index_client.js')
    res.sendFile(path.join(__dirname + '/index_client.js'));
});

app.get('/currentData.json', function(req, res) {
    //console.log('getting currentData')
    res.send(JSON.stringify(_currentData));
});

app.get('/settingUpSafe.json', function(req, res) {
    if (_currentData.state === STATE_COLLECTINGMULTISIGADDRESSES) {
        if(_currentData.collectedSafeAddresses.length == 0) {
            _currentData.lastError = 'There is at minimum 1 address required to initialize a gnosis safe';   
        } else {
            _currentData.state = STATE_SETUPSAFE;
        }
    }    
    res.send(JSON.stringify(_currentData));
});

app.get('/deployNewGnosisSave.json',async function(req, res) {
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
    defaultGasPrice: 1000000000,
    //transactionSigner:  <------- TODO: Maybe we can create an web3 provider that internally uses the smartcard ??
}

const web3_address = 'ws://ws.tau1.artis.network';
//const web3_address = 'http://127.0.0.1:9545/';

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
    let card = new Security2GoCard.Security2GoCard();
    card.log_debug_signing = true;
    card.log_debug_web3 = true;

    card.initialize(reader);
    return card;
}

//var test = new TestSigner.TestSigner();
//test.testSigning();

async function doSomeTests(reader) {

    console.log("card inserted");/* card inserted */
    let card = new Security2GoCard.Security2GoCard();
    card.log_debug_signing = true;
    card.log_debug_web3 = true;

    card.initialize(reader);
    console.log("card ready");
    //var address = card.getAddressWeb3(web3,1);


    //web3.eth.sendTransaction({from:web3.eth.getAccounts()[1], to: '0x756269Ce7e0285670ecBD234f230645EfBa049D3', value: 1000000000000000})
    
    //const address1 = await card.getAddress(1);

    //console.log('address1: ' + address1);

    // var tx = {
    //     gasPrice: 1000000000,
    //     gasLimit: '0x50000',
    //     to: '0x206733350894454c4684e8D694bf391228fCCbEE',
    //     value: 1000000000000000,
    //     data: '0x'
    // };

    //var receipt = await card.signAndSendTransaction(web3, tx, 1);
    console.log(receipt);
}

pcsc.on('reader', function(reader) {

    console.log('New reader detected', reader.name);
    //console.log(reader);
    if (reader.name.startsWith('Identive Identive CLOUD 4500 F Dual Interface Reader [CLOUD 4700 F Contact Reader]')) {
        console.log('ignoring that reader.');
        return;
    }


    reader.on('error', function(err) {
        console.log('Error(', this.name, '):', err.message);
    });

    reader.on('status', async function(status) {
        console.log('Status(', this.name, '):', status);
        /* check what has changed */
        var changes = this.state ^ status.state;
        if (changes) {
            if ((changes & this.SCARD_STATE_EMPTY) && (status.state & this.SCARD_STATE_EMPTY)) {
                console.log("card removed");/* card removed */
                reader.disconnect(reader.SCARD_LEAVE_CARD, function(err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Disconnected');
                    }
                });
                if (_currentData.state === STATE_DEPLOYED ) {
                    _currentData.state = STATE_COLLECTINGMULTISIGADDRESSES
                }
            } else if ((changes & this.SCARD_STATE_PRESENT) && (status.state & this.SCARD_STATE_PRESENT)) {

                const card = newCard(reader);
                card.initialize(reader);
                if (_currentData.state === STATE_COLLECTINGMULTISIGADDRESSES){
                    //_currentData.state = STATE_SETUPSAFE
                    state_collectingMultisigAddresses(card);
                    //_currentData.collectedSafeAddresses                    
                } else if (_currentData.state === STATE_DEPLOY){
                    //console.error('state not implemented yet: ' + _currentData.state);
                    const deploy = state_deploy(card);
                    console.log('deployed: ' + deploy);
                } else if (_currentData.state === STATE_SETUPSAFE) {
                    setupSafe(card);
                }
                else{
                    console.error('state not implemented yet: ' + _currentData.state);
                }

                //doSomeTests(reader);

            }
        }
    });

    reader.on('end', function() {
        console.log('Reader',  this.name, 'removed');
    });
});

pcsc.on('error', function(err) {
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

    if (_currentData.collectedSafeAddresses.indexOf(cardAddress) === -1){
        console.log('Setup Safe: new multi sig enabled address: ' + cardAddress);
        _currentData.collectedSafeAddresses.push(cardAddress);
    } else {
        console.log('Card allready known:' + cardAddress);
    }
}

async function state_deploy(card)
{
    _currentData.state = STATE_DEPLOYING;
    const deployedSafe = await deploySafe.deployNewSafe(web3, card);
    console.log('deployedSafe=>');
    console.log(deployedSafe.address);
    _currentData.state = STATE_DEPLOYED;
    _currentData.currentGnosisSafeAddress = deployedSafe.address;
    _currentData.collectedSafeAddresses = [];
    _currentData.lastError = '';
    
    
    
    //console.log(JSON.stringify(addressOfLastSafe));  
    //console.log(safe)
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
console.log("System Ready!")
printState();
//header( 'refresh: 5; url=http://www.example.net' );



