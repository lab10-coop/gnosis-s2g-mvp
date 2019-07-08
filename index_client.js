
var currentData;
var currentDataJson;


var getJSON = function(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
      var status = xhr.status;
      if (status === 200) {
        callback(null, xhr.response);
      } else {
        callback(status, xhr.response);
      }
    };
    xhr.send();
};


function updateUI() {

    var jsonDisplay = document.getElementById("jsonDisplay");
    jsonDisplay.value = currentDataJson;

    ulCollectedSafeAddresses = document.getElementById('ulCollectedSafeAddresses');
    if (ulCollectedSafeAddresses) {
        ulCollectedSafeAddresses.innerHTML = '';
        if (currentData.collectedSafeAddresses) {
            currentData.collectedSafeAddresses.forEach(collectedSafeAddress => {
                var li = document.createElement('li');
                li.innerText = collectedSafeAddress;
                ulCollectedSafeAddresses.appendChild(li);
            });
        }
    }

    var mainHeadline = document.getElementById('mainMessageHeadline');
    var errorLine = document.getElementById('mainMessageErrorLine');
    
    if (currentData.state === 'deploy') {
        mainHeadline.innerText = 'Lay a card to sign creation of a new Gnosis Safe';
    } else if (currentData.state === 'deploying') {
        mainHeadline.innerText = 'A new Gnosis Safe is about to get deployed';
    } else if (currentData.state === 'deployed') {
        mainHeadline.innerText = 'A new Gnosis Safe was born! Remove the card';
    } else if (currentData.state === 'collectingMultiSigAddresses') {
        mainHeadline.innerText = 'Lay a card to add it up as multisignature address';
    } else if (currentData.state === 'setupSafe') {
        mainHeadline.innerText = 'Lay a card to sign the setup of the gnosis safe';
    } else if (currentData.state === 'settingUpSafe') {
        mainHeadline.innerText = 'The Gnosis Safe is about to get setup on the blockchain';
    } else if (currentData.state === 'safeReady') {
        mainHeadline.innerText = 'The Gnosis Safe is setup and ready, remove card to proced';
    } else if (currentData.state === 'safeFundingSetup') {
        mainHeadline.innerText = 'Lay a card to fund the safe with 1 ATS.';
    } else if (currentData.state === 'safeFunding') {
        mainHeadline.innerText = 'Currency Transfer ongoing, waiting for blockchain confirmation...';
    } else if (currentData.state === 'safeFunded') {
        mainHeadline.innerText = 'Safe is now funded, remove card to proceed';
    } else if (currentData.state === 'multiSigSetup') {
        mainHeadline.innerText = 'Choose a card as target for paying out 1 ATS from the safe';
    } else if (currentData.state === 'multiSigSetupFinished') {
        mainHeadline.innerText = `Paying out 1 ATS to ${currentData.multisigPayoutAddress}. please remove card`;
    } else if (currentData.state === 'multiSigCollecting') {
        mainHeadline.innerText = `Collected ${Object.keys(currentData.multisigCollected).length} / ${currentData.collectedSafeAddresses.length} signatures. Lay missing cards to sign`;
    } else if (currentData.state === 'multiSigSending') {
        mainHeadline.innerText = 'Multisig transfer is processed by the blockchain, please standby';
    } else if (currentData.state === 'multisigSuccess') {
        mainHeadline.innerText = 'Multisig transfer was successful! Remove card to go back to fund the safe again.';
    } else {
        mainHeadline.innerText = 'state: ' + currentData.state;
    }

    var setupThisGnosisSafe = document.getElementById('setupThisGnosisSafe');
    var showSetupButton = (currentData.state === 'collectingMultiSigAddresses' && currentData.collectedSafeAddresses.length > 0);
    setupThisGnosisSafe.style.visibility = showSetupButton ? 'visible' : 'hidden'

    function setStateMachineStyle(stateName) {
        const divElement = document.getElementById('status_' + stateName);
        divElement.style.textDecoration = (currentData.state == stateName) ? 'underline' : 'none'; 
    }

    errorLine.innerText = currentData.lastError;

    setStateMachineStyle('deploy');
    setStateMachineStyle('deploying');
    setStateMachineStyle('deployed');
    setStateMachineStyle('collectingMultiSigAddresses');
    setStateMachineStyle('setupSafe');
    setStateMachineStyle('settingUpSafe');
    setStateMachineStyle('safeReady');

    setStateMachineStyle('safeFundingSetup');
    setStateMachineStyle('safeFunding');
    setStateMachineStyle('safeFunded');
    setStateMachineStyle('multiSigSetup');
    setStateMachineStyle('multiSigSetupFinished');
    setStateMachineStyle('multiSigCollecting');
    setStateMachineStyle('multiSigSending');
    setStateMachineStyle('multisigSuccess');

    //setupThisGnosisSafe.
}

function deployNewGnosisSafe()  {
    getJSON("./deployNewGnosisSave.json", function(err, data) {
       console.log("deployNewGnosisSave started!", data);
    });
}

function settingUpSafeGnosisSafe()  {
    getJSON("./settingUpSafe.json", function(err, data) {
       console.log("settingUpSafeGnosisSafe started!", data);
    });
}

function loadCurrentData() {

    getJSON("./currentData.json", function(err, data) {
        console.log(data);

        const oldDataJSON = JSON.stringify(currentData);
        const newDataJSON = JSON.stringify(data);

        if (oldDataJSON != newDataJSON) {
            currentData = data;
            currentDataJson=newDataJSON;
            updateUI();
        }
    });
}

loadCurrentData();
//updateUI();
window.setInterval(function(){
    loadCurrentData();
    
}, 200);
