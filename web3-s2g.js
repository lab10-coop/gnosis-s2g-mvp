/**
* @file Web3 Security2Go
* @author Thomas Haller <thomas.haller@lab10.coop>
* @version 0.1
*/

const web3utils = require('web3-utils');
const util = require('util');
const Tx = require('ethereumjs-tx');
var utils = require('ethereumjs-util');

function toHex(nonHex, prefix = true) {
    let temp = nonHex.toString('hex');
    if (prefix) {
        temp = `0x${temp}`;
    }
    return temp;
};

function toHexString(byteArray) {
    var s = '0x';
    byteArray.forEach(function (byte) {
        s += ('0' + (byte & 0xFF).toString(16)).slice(-2);
    });
    return s;
}

function isError(code) {
    if (code[0] == 0x90 && code[1] == 0)
        return false;
    return true;
}

function getPublicKey_function(args, callback) {
    const card = args.card;
    sendCommand(card, args.command, function (response) {
        if (response.length == 2) {
            if (response[0] == 0x69) {
                if (response[1] == 82) {
                    card.logSigning('Maximal number of key import calls exceeded (Security status not satisfied)');
                } else if (response[1] == 85) {
                    card.logSigning('Not authenticated with PIN (Condition of use not satisfied)');
                }
            }
            if (response[0] == 0x6a && response[1] == 0x88) {
                card.logSigning('Key slot with given index is not available')
            }
        } else if (response.length == 75) {
            //var sec1EncodedPublicKey =  response.slice(8, 64);
            //card.logSigning('response: ' + response);
            card.logSigning('result_code: ' + response[73] + ' ' + response[74]);
            //card.logSigning('Public key:' + keyIndex + ':' + toHexString(publicKey));
            var buffer = response.slice(9, 64 + 9);
            //var bufferHex = toHexString(buffer);
            callback(null, buffer);
        }
        else {
            card.logSigning('Unknown response: length: ' + response.length + ' - ' + response);
        }
    });
}

/**
 * 
 * @param {byte[]} errorCode byte array with the error information at position 0 and zero
 * @returns {string} error message
 */
function getGenericErrorAsString(errorCode) {

    //todo: maybe thread the error codes in lookup tables ?
    //that would make it easier to distinguish between generic and specific errors.

    if (errorCode[0] == 0x90 && errorCode[1] == 0)
        return "Success"; //success is not an error. please check for success state before.
    if (errorCode[0] == 0x64)
        return "Operation failed (" + errorCode[1] + ")";
    if (errorCode[0] == 0x67 && errorCode[1] == 0)
        return "Wrong length";
    if (errorCode[0] == 0x69) {
        if (errorCode[1] == 0x82)
            return "Global or key-specific signature counter exceeded"; 
    }
    if (errorCode[0] == 0x6A) {
        if (errorCode[1] == 0x86)
            return "Incorrect parameters P1/P2";
        if (errorCode[1] == 0x88) //this is NOT documented as a "Generic Error" but for now it seems to be safe to thread it like this.
            return "Key slot with given index is not available";
    }
    


    if (errorCode[0] == 0x6D && errorCode[1] == 0)
        return "Instruction code is not supported or invalid or application has not selected with the SELECT APP command";
    if (errorCode[0] == 0x6E && errorCode[1] == 0)
        return "Class not supported";
    if (errorCode[0] == 0x6F && errorCode[1] == 0)
        return "Unknown Error";

    function InttoHex(d) {
        return ("0" + (Number(d).toString(16))).slice(-2).toUpperCase()
    }

    return "ErrorCode Unknown:" + InttoHex(errorCode[0]) + " " + InttoHex(errorCode[1]);
}

/**
* Sends raw byte commands to the card and receives the response.
* sends the always required SelectApp command in advance.
* 
* @param {Security2GoCard} card object
* @param {byte[]} bytes raw byte[] with the netto data.
* @param {receiveHandler} callback once the operation is finished.
*/
function sendCommand(card, bytes, receiveHandler = null) {
    var maxResponseLength = 128;
    card.logSigning('connecting...');
    card.reader.connect({}, function (err, protocol) {
        if (err) {
            console.error('Connecting Error:' + err);
        } else {
            protocol = card.PROTOCOL_ID;
            card.logSigning('protocol:' + protocol);
            var selectAppIncldingCommand = [0x00, 0xA4, 0x04, 0x00, 0x0D, /* start of body*/ 0xD2, 0x76, 0x00, 0x00, 0x04, 0x15, 0x02, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01 /* end of body */, 12];
            card.reader.transmit(new Buffer(selectAppIncldingCommand), maxResponseLength, protocol, function (err, data) {
                card.logSigning('select App Completed');
                if (err) {
                    console.error(err);
                } else {
                    //todo: validate result.
                    card.reader.transmit(new Buffer(bytes), maxResponseLength, protocol, function (err, data) {
                        if (err) {
                            //todo: interprate error here ?
                            card.logSigning('Error on transmitting')
                            card.logSigning(err);
                            return [];
                        } else {
                            card.logSigning('Data received', data);

                            //asume all 2 byte results are errors ?!
                            if (data.length == 2 && isError(data)) {
                                const errorMsg = getGenericErrorAsString(data);
                                console.error('Received Data is Error received: ' + errorMsg);
                                throw errorMsg;
                            }

                            card.logSigning(receiveHandler);
                            //reader.close();
                            //pcsc.close();
                            if (receiveHandler != null) {
                                receiveHandler(data);
                            }
                        }
                    });
                }
            });
        }
    });
}

async function generateSignatureRaw(card, bytes, keyIndex) {

    function generateSignatureRaw_function(args, callback) {

        const bytes = args.bytes;
        const keyIndex = args.keyIndex;
        const card = args.card;


        if (bytes.length != 32) {
            const error = 'message to sign needs to be 32 byte long. got:' + bytes.length;
            card.logSigning(error);
            throw error;
        }

        var messageBuffer = new ArrayBuffer(38);
        var messageBufferView = new Int8Array(messageBuffer);

        messageBufferView[1] = 0x18;
        messageBufferView[2] = keyIndex;
        messageBufferView[3] = 0x00;
        messageBufferView[4] = 0x20;
        messageBufferView.set(bytes, 5);

        card.logSigning('signing: ' + toHexString(messageBufferView));
        sendCommand(card, messageBuffer, function (sendCommandResponse, error) {
            if (sendCommandResponse) {
                card.logSigning("Signing: Got Response: " + toHexString(sendCommandResponse));
                if (sendCommandResponse[sendCommandResponse.length - 2] == 0x90 && sendCommandResponse[sendCommandResponse.length - 1] == 0) {
                    card.logSigning("card Signature is a success!");
                    //todo: 
                    const resultBin = sendCommandResponse.slice(9, sendCommandResponse.length - 2);
                    const result = web3utils.bytesToHex(resultBin);
                    callback(null, result)
                    return;
                } else {
                    console.error("Signing: not implmented signing response:" + toHexString(sendCommandResponse));
                }
            }
            if (error) {
                console.error("Signing Error: " + error);
                callback(error, null);
            }
        });
    }

    var func = util.promisify(generateSignatureRaw_function);
    return await func({ card: card, bytes: bytes, keyIndex: keyIndex });
}

class Security2GoCard {

    /**
     * Represents an Infinion Security2Go played on a card reader using the pcsclite framework.
     * 
     * @param {pcsclite.CardReader} reader a CardReader from pcsclite.
     */
    constructor(reader) {

        this.reader = reader;
        this.PROTOCOL_ID = 2; //todo: dont know meaning yet...
        this.log_debug_signing = false;
        this.log_debug_web3 = false;
    }

    /**
    * returns the publicKey of the given index of the card.
    * for retrieving the (ethereum) address call getAddress(keyIndex)
    * @param {byte} cardKeyIndex index (0..255) of the Security2Go Card.  defaults to 1 (first generated key on the card)
    * @return {string} public key
    */
    async getPublicKey(cardKeyIndex = 1) {
        var card = this;
        card.logSigning('getting key #' + cardKeyIndex);
        var command = [0x00, 0x16, cardKeyIndex, 0x00, 0x00];

        card.logSigning('response');
        //card.logSigning(responseFunction);

        var func = util.promisify(getPublicKey_function);

        return await func({ card: this, command: command });
        //card.logSigning(responseFunction);
        //return new Promise(resolve => {});
    }

    /**
    * returns the (ethereum) address of the given index of the card.
    * for retrieving the raw public key call getPublicKey(keyIndex)
    * @param {byte} keyIndex index (0..255) of the Security2Go Card. defaults to 1 (first generated key on the card)
    * @return {string} public key
    */
    async getAddress(keyCardIndex = 1) {
        const publicKey = await this.getPublicKey(keyCardIndex);
        const publicKeyHex = web3utils.bytesToHex(publicKey)
        this.logSigning('publicKeyHex:');
        this.logSigning(publicKeyHex);
        let address = '0x' + web3utils.sha3(publicKeyHex).slice(26);
        this.logSigning('address');
        this.logSigning(address);
        return address;
    }


    /**
    * Generates a signature for a given web3 style transaction
    * @param {Web3} web3 a Web3 instance.
    * @param {*} rawTransaction a Web3 style transaction.
    * @param {byte} cardKeyIndex keyIndex index (0..255) of the Security2Go Card. defaults to 1 (first generated key on the card)
    * @param {number} nonce optional nonce, if not supplied, the nonce is retrieved with a RPC call by the provided web3 object.
    */
    async signTransaction(web3, rawTransaction, cardKeyIndex = 1, nonce) {

        const tx = await this.getSignedTransactionObject(web3, rawTransaction, cardKeyIndex, nonce);
        return toHex(tx.serialize());;
    }

    /**
    * Generates a ethereum compatible secp256k1 signature for the given hash
    * @param {string} hash hex encoded hash string.
    * @param {byte} cardKeyIndex keyIndex index (0..255) of the Security2Go Card. defaults to 1 (first generated key on the card)
    */
    async getSignatureFromHash(hash, cardKeyIndex = 1) {

        let hashBytes;

        if (typeof hash === 'string') {
            if (hash.startsWith('0x')) {
                hash = hash.substring(2, hash.length);
            }
            hashBytes = Buffer.from(hash, 'hex');
        } else {
            hashBytes = hash;
        }

        this.logSigning('hash:' + hash);
        this.logSigning('buffer.length: ' + hashBytes.length);

        var cardSig = await generateSignatureRaw(this, hashBytes, cardKeyIndex);

        this.logSigning('tries to generate signature.');

        //const cardSig = await wrapper.generateSignature(1, hash.toString('hex'));

        this.logSigning('cardSig');
        this.logSigning(cardSig);

        let rStart = 6;
        let length = 2;
        const rLength = parseInt(cardSig.slice(rStart, rStart + length), 16);
        this.logSigning('rLength');
        this.logSigning(rLength);
        rStart += 2;
        const r = cardSig.slice(rStart, rStart + rLength * 2);
        this.logSigning('r');
        this.logSigning(r);
        console.assert(r.length == rLength * 2, 'r should be length ' + rLength * 2 + ' but has length ' + r.length);

        let sStart = rStart + rLength * 2 + 2;
        const sLength = parseInt(cardSig.slice(sStart, sStart + length), 16);
        this.logSigning('sLength');
        this.logSigning(sLength);

        sStart += 2;
        const s = cardSig.slice(sStart, sStart + sLength * 2);

        this.logSigning('s');
        this.logSigning(s);
        console.assert(s.length == sLength * 2, 's should be length ' + sLength * 2 + ' but has length ' + s.length);

        var result = {
            r: '0x' + r,
            s: '0x' + s
        }

        const correctPublicKey = await this.getPublicKey(cardKeyIndex);
        
        
        function isAddressMatching(testingVvalue){
            const pubKey  = utils.ecrecover(hashBytes, testingVvalue, result.r, result.s);
            
            // console.log('comparing public key');
            // console.log(pubKey);
            // console.log(correctPublicKey);
            return correctPublicKey.equals(pubKey);
        }

        if (isAddressMatching('0x1b')) {
            result.v = '0x1b';
        } else if (isAddressMatching('0x1c')){
            result.v = '0x1c';
        } else {
            throw 'unable to determine correct v value';
        }

        return result;
    }

    /**
    * Generates an EthereumTx transaction object that includes the signature as R,S,V components.
    * @param {Web3} web3 a Web3 instance.
    * @param {*} rawTransaction a Web3 style transaction.
    * @param {byte} cardKeyIndex keyIndex index (0..255) of the Security2Go Card. defaults to 1 (first generated key on the card)
    * @param {number} nonce optional nonce, if not supplied, the nonce is retrieved with a RPC call by the provided web3 object.
    */
    async getSignedTransactionObject(web3, rawTransaction, cardKeyIndex = 1, nonce) {

        const address = await this.getAddress(cardKeyIndex);
        this.logSigning('address');
        this.logSigning(address);

        if (!nonce) {
            nonce = await web3.eth.getTransactionCount(address);
        }

        rawTransaction.nonce = nonce;

        const tx = new Tx(rawTransaction);

        const hashBytes = tx.hash(false)
        const hash = toHex(hashBytes, false);
        this.logSigning('hash');
        this.logSigning(hash);


        let serializedTx = '';
        let i = 0;

        const rsSig = await this.getSignatureFromHash(hash, cardKeyIndex);
        tx.r = rsSig.r;
        tx.s = rsSig.s;
        tx.v = rsSig.v;

        //console.log('v: ' + tx2.v);
        serializedTx = toHex(tx.serialize());
        this.logSigning('serializedTx');
        this.logSigning(serializedTx);
        //card.logSigning('tx2.v', toHex(tx2.v));
        //this.logSigning(web3.eth.accounts.recoverTransaction(toHex(serializedTx)));


        this.logSigning(`tx: ${JSON.stringify(tx, null, 2)}`);


        // if (rLength  != tx.r.length) {
        //     console.error(`wrong R length - expecting this to fail rLength ${rLength} tx.r.length ${tx.r.length}`);
        // }

        // if (sLength != tx.s.length) {
        //     console.error(`wrong S length - expecting this to fail ${sLength} tx.s.length ${tx.s.length}`);
        // }

        this.logSigning('serialized transaction:' + serializedTx);
        return tx;

    }


    /**
     * @param {Web3} web3 a Web3 instance
     * @param {object} web3 transaction tx 
     * @param {number} cardKeyIndex keyIndex index (0..255) of the Security2Go Card
     * @throws {*} error from sendSignedTransaction
     * @return {receipt} the web3 receipt
     */
    async signAndSendTransaction(web3, tx, cardKeyIndex = 1) {

        const signature = await this.signTransaction(web3, tx, cardKeyIndex);

        this.logWeb3(`tx: ${JSON.stringify(tx, null, 2)}`);

        try {
            this.logWeb3('sending transaction');
            const txReceipt = await web3.eth.sendSignedTransaction(signature);
            this.logWeb3('receipt: ' + txReceipt);
            return txReceipt;
        }
        catch (error) {
            //the following error occurs all the time.
            //Error: Transaction has been reverted by the EVM:
            //no idea why yet....
            console.error('Error:', error);
            throw error;
        }
    }

    /**
     * console.log() if log_debug_web3
     * @param {*} message 
     */
    logWeb3(message) {
        if (this.log_debug_web3) {
            console.log(message)
        }
    }

    /**
     * console.log() if log_debug_signing
     * @param {*} message 
     */
    logSigning(message) {
        if (this.log_debug_signing) {
            console.log(message)
        }
    };
}

module.exports = {
    Security2GoCard
}