
var pcsc = require('pcsclite');
var Security2GoCard = require('./submodules/security2go/index'); 
var Web3 = require('web3');
var express = require('express');
var app = express();
var path = require('path');
var deploySafe = require('./deploySafe.js');
var pcsc = pcsc();

var currentData = {};

//states:

// deploy -> deploying -> deployed -> setupSafe -> settingUpSafe -> SafeReady -> sendingOutFunds -> sentOutFunds.



const STATE_DEPLOY = 'deploy'
const STATE_DEPLOYING = 'deploying'
const STATE_DEPLOYED = 'deployed'
const STATE_SETUPSAFE = 'setupSafe'
const STATE_SETTINGUPSAFE = 'settingUpSafe' 
const STATE_SAFEREADY = 'safeready'

currentData.currentGnosisSafeAddress = '0xC59791222C5513995AAE19283af5Fc3b3B4595Ce'
currentData.state = STATE_SETUPSAFE
currentData.collectedSafeAddresses = []; //array of '0xabc..890' string with the addresses that should get added to the safe.
currentData.lastError = '';

// viewed at http://localhost:8080
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/index_client.js', function(req, res) {
    console.log('getting index_client.js')
    res.sendFile(path.join(__dirname + '/index_client.js'));
});

app.get('/currentData.json', function(req, res) {
    console.log('getting currentData')
    res.send(JSON.stringify(currentData));
});

app.get('/settingUpSafe.json', function(req, res) {
    if (currentData.state === STATE_SETUPSAFE) {
        if(currentData.collectedSafeAddresses.length == 0) {
            currentData.lastError = 'There is at minimum 1 address required to initialize a gnosis safe';   
        } else {
            setupSafe();
            currentData.lastError = 'There is at minimum 1 address required to initialize a gnosis safe';
        }
    }    
    res.send(JSON.stringify(currentData));
});

// app.get('/deployNewSafe.json',async function(req, res) {
//     console.log('deployNewSafe.json')
//     const newSafeAddress = deployNewSafe();
//     res.send(JSON.stringify(currentData));
// });


app.listen(3000);

//var web3 = new Web3('http://127.0.0.1:9545/');
var web3 = new Web3('ws://ws.tau1.artis.network');

async function setupSafe() {

    console.log('setting up safe');
    currentData.state = STATE_SETTINGUPSAFE;
    const setupSafeResult = await deploySafe.setupSafe(web3, currentData.currentGnosisSafeAddress, currentData.collectedSafeAddresses);
    console.log('setting up safe done!');
    console.log(setupSafeResult);
    return setupSafeResult;
}

async function deployNewSafe() {
    const addressOfLastSafe = await deploySafe.deployNewSafe(web3);
    //currentData.state = ''
    console.log(addressOfLastSafe);
    console.log(typeof addressOfLastSafe);
    console.log(JSON.stringify(addressOfLastSafe));

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
            } else if ((changes & this.SCARD_STATE_PRESENT) && (status.state & this.SCARD_STATE_PRESENT)) {

                const card = newCard(reader);
                if (currentData.state === STATE_SETUPSAFE){
                    card.initialize(reader);
                    const cardAddress = await card.getAddress(1);

                    //if the used address has not been added yet, than add it. it is used later to setup the safe.

                    if (currentData.collectedSafeAddresses.indexOf(cardAddress) === -1){
                        console.log('Setup Safe: new card Address: ' + cardAddress);
                        currentData.collectedSafeAddresses.push(cardAddress);
                    } else {
                        console.log('Card allready known:' + cardAddress);
                    }

                    //currentData.collectedSafeAddresses                    
                } else {
                    console.error('state not implemented yet: ' + currentData.state);
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


//header( 'refresh: 5; url=http://www.example.net' );



