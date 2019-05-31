
var pcsc = require('pcsclite');
var Security2GoCard = require('./submodules/security2go/index'); 
var Web3 = require('web3');
var express = require('express');
var app = express();
var path = require('path');

var pcsc = pcsc();


// viewed at http://localhost:8080
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.listen(8080);

//var test = new TestSigner.TestSigner();
//test.testSigning();

async function doSomeTests(reader) {

    console.log("card inserted");/* card inserted */
    let card = new Security2GoCard.Security2GoCard();
    card.log_debug_signing = true;
    card.log_debug_web3 = true;
    //var web3 = new Web3('ws://ws.tau1.artis.network');

    var web3 = new Web3('http://127.0.0.1:9545/');

    card.initialize(reader);
    console.log("card ready");
    //var address = card.getAddressWeb3(web3,1);


    //web3.eth.sendTransaction({from:web3.eth.getAccounts()[1], to: '0x756269Ce7e0285670ecBD234f230645EfBa049D3', value: 1000000000000000})
    
    const address1 = await card.getAddress(1);

    console.log('address1: ' + address1);

    var tx = {
        gasPrice: 1000000000,
        gasLimit: '0x50000',
        to: '0x206733350894454c4684e8D694bf391228fCCbEE',
        value: 1000000000000000,
        data: '0x'
    };

    var receipt = await card.signAndSendTransaction(web3, tx, 1);
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

    reader.on('status', function(status) {
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

                doSomeTests(reader);

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



