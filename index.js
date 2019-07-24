/**
* @file Gnosis Security2G MVP
* @author Thomas Haller <thomas.haller@lab10.coop>
* @license GPLv3
* @version 0.1
*/

const Pcsc = require('pcsclite');
const Web3 = require('web3');
const express = require('express');

const app = express();
const path = require('path');
const Security2GoCard = require('./web3-s2g.js');
const gnosisSafe = require('./gnosisSafe.js');

const pcsc = Pcsc();

const cardSigner = new Security2GoCard.MinervaCardSigner();

const web3Options = {
  transactionConfirmationBlocks: 1,
  defaultGasPrice: '100000000000',
  transactionSigner: cardSigner,
};

// const web3_address = 'ws://ws.tau1.artis.network';

const localWebserverListeningPort = 3000;

const web3Address = 'https://rpc.tau1.artis.network';
// const web3Address = 'http://127.0.0.1:9545/';
// const web3Address = 'https://rpc.sigma1.artis.network';

const web3 = new Web3(web3Address, null, web3Options);

cardSigner.web3 = web3;

let currentData = {};


// it is possible to copy the "state data" out from the UI
// and use it here for further testing.
// this are only examples -
// since you need to use the same smart cards in order to continue from this states.

// const debugState_high5_multiSigSetup = {
//   currentGnosisSafeAddress: '0x79c9e5C29e22fB665Dee3F0e726ccEBA3eF07ead',
//   state: 'multiSigSetup',
//   collectedSafeAddresses: ['0x4abb023f60997bfbeeadb38e0caabd8b623bf2d3',
//     '0x1b629f37aed1576c2e979aff68d2983f0ab13479',
//     '0x0774fe042bc23d01599b5a92b97b3125a4cb20ee',
//     '0xb222330ca92307d639b0bed948fe4f3577fc500b',
//     '0xe856a0cad6368c541cf11d9d9c8554b156fa40fd'],
//   lastError: '',
//   multisigPayoutAddress: '',
//   multisigCollected: {},
//   multisigTransactionHash: '',
// };


// states:
// deploy -> deploying -> deployed (R) -> collectingMultiSigAddresses -> setupSafe -> settingUpSafe -> SafeReady (R)
// -> SafeFundingSetup -> SafeFunding -> SafeFunded (R) -> MultiSigSetup -> MultiSigCollecting -> MultiSigSending
// -> MultisigSuccess.
// (R) => Remove card to progress to next state

// deploy: waits for a card that is used to sign off the deploy transaction.
const STATE_DEPLOY = 'deploy';
// deploying: a new safe is about to be deployed.
const STATE_DEPLOYING = 'deploying';
// a new safe just got deployed, user need to continue with setup the addresses for multisig.
const STATE_DEPLOYED = 'deployed';

const STATE_COLLECTINGMULTISIGADDRESSES = 'collectingMultiSigAddresses';

// system collects now the card addresses for setting up a safe.
const STATE_SETUPSAFE = 'setupSafe';

const STATE_SETTINGUPSAFE = 'settingUpSafe';
const STATE_SAFEREADY = 'safeReady';

const STATE_SAFEFUNDINGSETUP = 'safeFundingSetup';
const STATE_SAFEFUNDING = 'safeFunding';
const STATE_SAFEFUNDED = 'safeFunded';
const STATE_MULTISIGSETUP = 'multiSigSetup';
const STATE_MULTISIGSETUPFINISHED = 'multiSigSetupFinished';
const STATE_MULTISIGCOLLECTING = 'multiSigCollecting';
const STATE_MULTISIGCOLLECTED = 'multiSigCollected';
const STATE_MULTISIGSENDING = 'multiSigSending';
const STATE_MULTISIGSUCCESS = 'multisigSuccess';

currentData.currentGnosisSafeAddress = '';
currentData.state = STATE_DEPLOY;
// array of '0xabc..890' string with the addresses that should get added to the safe.
currentData.collectedSafeAddresses = [];
currentData.lastError = '';
currentData.multisigPayoutAddress = '';
currentData.multisigCollected = {}; // map with the safeAddress as index and a signature as value.
// Transaction object that is used to send out funds to multisigPayoutAddress
currentData.multisigTransaction = undefined;
currentData.multisigTransactionHash = '';

// address of the first account that deployed the gnosis safe.
// this field is just been used as a gimmick so we only have "Laying Cards" as User Input Interface.
// without that field we have at leased to click one time a button to signal "continue and setup safe".
currentData.initialDeployerAddress = '';

// currentData = debugState;


function getNumberOfRequiredSignatures(numberOfSignatures) {
  if (numberOfSignatures > 2) {
    return numberOfSignatures - 1;
  }
  return numberOfSignatures;
}


/* eslint-disable camelcase */

async function setupSafe(card) {
  console.log('setting up safe');
  currentData.state = STATE_SETTINGUPSAFE;
  const setupSafeResult = await gnosisSafe.setupSafe(
    web3, currentData.currentGnosisSafeAddress, currentData.collectedSafeAddresses,
    getNumberOfRequiredSignatures(currentData.collectedSafeAddresses.length), card,
  );

  if (setupSafeResult) {
    console.log('setting up safe done!');
    currentData.state = STATE_SAFEREADY;
  }
}

async function state_collectingMultisigAddresses(card) {
  if (!currentData.currentGnosisSafeAddress) {
    console.error('INVALID STATE: no SafeAddress found in the state Setup');
    return;
  }
  const cardAddress = await card.getAddress(1);

  // we interpete laying the "initial deployer address" card as
  // "all multisig cards became added, now continue with gnosis safe initialisation"
  if (cardAddress === currentData.initialDeployerAddress) {
    currentData.state = STATE_SETUPSAFE;
    setupSafe(card);
    return;
  }

  if (currentData.collectedSafeAddresses.indexOf(cardAddress) === -1) {
    console.log(`Setup Safe: new multi sig enabled address: ${cardAddress}`);
    currentData.collectedSafeAddresses.push(cardAddress);
  } else {
    console.log(`Card allready known:${cardAddress}`);
  }
}


async function state_deploy(card) {
  currentData.state = STATE_DEPLOYING;
  const initialDeployerAddress = await card.getAddress(1);
  const deployedSafe = await gnosisSafe.deployNewSafe(web3, card);
  console.log('deployedSafe=>');
  console.log(deployedSafe.address);
  currentData.state = STATE_DEPLOYED;
  currentData.currentGnosisSafeAddress = deployedSafe.address;
  currentData.collectedSafeAddresses = [];
  currentData.initialDeployerAddress = initialDeployerAddress;
  return deployedSafe;
}

async function state_safeFundingSetup(card) {
  // Prepare the raw transaction information
  const tx = {
    gasPrice: web3.utils.numberToHex('100000000000'),
    gas: web3.utils.numberToHex('100000'),
    // value: web3.utils.toWei('1'),
    value: web3.utils.toHex(web3.utils.toWei('1')),
    to: currentData.currentGnosisSafeAddress,
  };

  console.log(`tx: ${JSON.stringify(tx, null, 2)}`);
  // console.log('to-transfer: ' + tx.value);

  currentData.state = STATE_SAFEFUNDING;
  await card.signAndSendTransaction(web3, tx, 1);
  currentData.state = STATE_SAFEFUNDED;
}

async function state_multisigCollecting(card) {
  const address = await card.getAddress(1);
  if (currentData.multisigCollected[address] === undefined) {
    if (currentData.collectedSafeAddresses.indexOf(address) === -1) {
      throw Error(`Card ${address} is not allowed to unlock this safe`);
    }

    console.log(`collecting multisig form ${address}`);

    const signedTx = await card.getSignatureFromHash(currentData.multisigTransactionHash, 1);
    console.log('got signed Transaction');
    // console.log(signedTx);
    currentData.multisigCollected[address] = signedTx;
  } else {
    // overwrite existing ??
    console.log('There is already a signature existing for this address.');
  }

  const numOfCollectedMultisigTxs = Object.keys(currentData.multisigCollected).length;
  console.log(`numOfCollectedMultisigTxs : ${numOfCollectedMultisigTxs}`);

  if (numOfCollectedMultisigTxs === getNumberOfRequiredSignatures(currentData.collectedSafeAddresses.length)) {
    // we now have all signatures, move forward.
    currentData.state = STATE_MULTISIGCOLLECTED;
  } else {
    console.log(
      `waiting for further transactions.${numOfCollectedMultisigTxs} / 
      ${getNumberOfRequiredSignatures(currentData.collectedSafeAddresses.length)}`,
    );
  }
}

async function state_multisigCollected(card) {
  // we now have all signatures, move forward.
  currentData.state = STATE_MULTISIGSENDING;

  await gnosisSafe.sendMultisigTransaction(web3,
    card, currentData.currentGnosisSafeAddress, currentData.multisigTransaction, currentData.multisigTransactionHash,
    currentData.multisigCollected);

  currentData.state = STATE_MULTISIGSUCCESS;
}

async function state_multisigSetup(card) {
  const address = await card.getAddress(1);
  console.log(`Multisig Setup target:${address}`);
  currentData.multisigPayoutAddress = address;

  const gnosisSafeTX = await gnosisSafe.createGnosisSafeTransaction(
    web3, currentData.currentGnosisSafeAddress, currentData.multisigPayoutAddress,
    web3.utils.toHex(web3.utils.toWei('1')),
  );
  console.log('gnosis safe TX:', gnosisSafeTX);
  const txHash = await gnosisSafe.getGnosisSafeTransactionHash(
    web3, currentData.currentGnosisSafeAddress, gnosisSafeTX,
  );
  console.log('txHash:', txHash);

  currentData.multisigTransactionHash = txHash;
  currentData.multisigTransaction = gnosisSafeTX;
  currentData.multisigCollected = {};

  currentData.state = STATE_MULTISIGSETUPFINISHED;
}

/* eslint-enable camelcase */

app.get('/', (req, res) => {
  res.sendFile(path.join(`${__dirname}/index.html`));
});

app.get('/index_client.js', (req, res) => {
  console.log('getting index_client.js');
  res.sendFile(path.join(`${__dirname}/index_client.js`));
});

app.get('/currentData.json', (req, res) => {
  // console.log('getting currentData')
  res.send(JSON.stringify(currentData));
});

app.get('/settingUpSafe', (req, res) => {
  if (currentData.state === STATE_COLLECTINGMULTISIGADDRESSES) {
    if (currentData.collectedSafeAddresses.length === 0) {
      currentData.lastError = 'There is at minimum 1 address required to initialize a gnosis safe';
    } else {
      currentData.state = STATE_SETUPSAFE;
    }
  }
  res.send(JSON.stringify(currentData));
});

app.get('/deployNewGnosisSafe', async (req, res) => {
  console.log('deployNewGnosisSafe');
  // const newSafeAddress = deployNewSafe();
  currentData.currentGnosisSafeAddress = undefined;
  currentData.state = STATE_DEPLOY;
  // array of '0xabc..890' string with the addresses that should get added to the safe.
  currentData.collectedSafeAddresses = [];
  currentData.lastError = '';

  res.send(JSON.stringify(currentData));
});

app.get('/logo_*.png', async (req, res) => {
  res.sendFile(path.join(__dirname, req.path));
});

app.listen(localWebserverListeningPort);


// var web3 = new Web3('http://127.0.0.1:9545/');


function newCard(reader) {
  const card = new Security2GoCard.Security2GoCard(reader);
  card.log_debug_signing = true;
  card.log_debug_web3 = true;
  cardSigner.card = card;

  return card;
}

pcsc.on('reader', (reader) => {
  console.log('New reader detected', reader.name);
  // console.log(reader);
  if (reader.name.startsWith('Identive Identive CLOUD 4500 F Dual Interface Reader [CLOUD 4700 F Contact Reader]')) {
    console.log('ignoring that reader.');
    return;
  }


  reader.on('error', function onReaderError(err) {
    console.log('Error(', this.name, '):', err.message);
  });

  reader.on('status', async function onReaderStatus(status) {
    console.log('Status(', this.name, '):', status);
    /* check what has changed */
    const changes = this.state ^ status.state;
    if (changes) {
      if ((changes & this.SCARD_STATE_EMPTY) && (status.state & this.SCARD_STATE_EMPTY)) {
        console.log('card removed');/* card removed */
        currentData.lastError = '';
        reader.disconnect(reader.SCARD_LEAVE_CARD, (err) => {
          if (err) {
            console.log(err);
          } else {
            console.log('disconnected');
          }
        });
        if (currentData.state === STATE_DEPLOYING) {
          // it can happen that a deploying does not become a success
          // in that case wwe switch back to Deploy.
          // example reason: Connecting Error:Error: SCardConnect error: Card is unpowered.(0x80100067)
          currentData.state = STATE_DEPLOY;
        } else if (currentData.state === STATE_DEPLOYED) {
          currentData.state = STATE_COLLECTINGMULTISIGADDRESSES;
        } else if (currentData.state === STATE_SAFEREADY) {
          currentData.state = STATE_SAFEFUNDINGSETUP;
        } else if (currentData.state === STATE_SETTINGUPSAFE) {
          currentData.state = STATE_SETUPSAFE;
        } else if (currentData.state === STATE_SAFEFUNDED) {
          currentData.state = STATE_MULTISIGSETUP;
          // SafeFunded (R) -> MultiSigSetup
        } else if (currentData.state === STATE_MULTISIGSETUPFINISHED) {
          currentData.state = STATE_MULTISIGCOLLECTING;
        } else if (currentData.state === STATE_MULTISIGSUCCESS) {
          // after a success we can initiate a new payout.
          currentData.multisigPayoutAddress = '';
          currentData.multisigTransaction = undefined;
          currentData.multisigTransactionHash = undefined;
          currentData.multisigCollected = {};
          currentData.state = STATE_SAFEFUNDINGSETUP;
        }
      } else if ((changes & this.SCARD_STATE_PRESENT) && (status.state & this.SCARD_STATE_PRESENT)) {
        const stateBackup = Object.assign({}, currentData);
        currentData.lastError = '';
        try {
          const card = newCard(reader);

          if (currentData.state === STATE_COLLECTINGMULTISIGADDRESSES) {
            await state_collectingMultisigAddresses(card);
          } else if (currentData.state === STATE_DEPLOY) {
            await state_deploy(card);
          } else if (currentData.state === STATE_SETUPSAFE) {
            await setupSafe(card);
          } else if (currentData.state === STATE_SAFEFUNDINGSETUP) {
            await state_safeFundingSetup(card);
          } else if (currentData.state === STATE_MULTISIGSETUP) {
            console.log('MULTISIG Setup');
            await state_multisigSetup(card);
          } else if (currentData.state === STATE_MULTISIGCOLLECTING) {
            try {
              await state_multisigCollecting(card);
            } catch (error) {
              currentData.multisigCollected = {};
              currentData.lastError = `error:${error}`;
              currentData.state = STATE_MULTISIGCOLLECTING;
            }
          } else if (currentData.state === STATE_MULTISIGCOLLECTED) {
            await state_multisigCollected(card);
          } else {
            console.error(`state not implemented yet: ${currentData.state}`);
          }
        } catch (err) {
          console.error('CAUGHT ERROR:');
          currentData = Object.assign({}, stateBackup);
          currentData.lastError = `error:${err}`;
          // _currentData.state = 'error';
          console.error(JSON.stringify(err));
          console.error(currentData.lastError);
          console.error(err.stack);
        }
        // doSomeTests(reader);
      }
    }
  });

  reader.on('end', function onReaderEnd() {
    console.log('Reader', this.name, 'removed');
  });
});

pcsc.on('error', (err) => {
  console.log('PCSC error', err.message);
});

function printCurrentData() {
  console.log('currentState:');
  console.log(currentData);
}

function printState() {
  console.log('printState:');
  console.log(currentData.state);
}

printCurrentData();
printState();
console.log(`connected to ${web3Address}`);
console.log(
  'System Ready, waiting for reader. if no reader shows up - '
  + 'sudo systemctl restart pcscd - and restart this project might help !',
);
