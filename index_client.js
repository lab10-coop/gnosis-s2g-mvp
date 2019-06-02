
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
    
    if (currentData.state === 'deploy') {
        mainHeadline.innerText = 'Lay a card to create a new Gnosis Safe';
    } else if (currentData.state === 'deploying') {
        mainHeadline.innerText = 'A new Gnosis Safe is about to get deployed';
    } else if (currentData.state === 'deployed') {
        mainHeadline.innerText = 'The Gnosis Safe was born. Remove the card';
    } else if (currentData.state === 'collectingMultiSigAddresses') {
        mainHeadline.innerText = 'Lay a card to add it up as multisignature address';
    } else if (currentData.state === 'setupSafe') {
        mainHeadline.innerText = 'Lay a card to setup the gnosis safe';
    } else if (currentData.state === 'settingUpSafe') {
        mainHeadline.innerText = 'The Gnosis Safe is about to get setup on the blockchain';
    } else if (currentData.state === 'safeready') {
        mainHeadline.innerText = 'The Gnosis Safe is setup and ready';
    } else {
        mainHeadline.innerText = 'state: ' + currentData.state;
    }

    var setupThisGnosisSafe = document.getElementById('setupThisGnosisSafe');
    var showSetupButton = (currentData.state === 'collectingMultiSigAddresses' && currentData.collectedSafeAddresses.length > 0);
    setupThisGnosisSafe.style.visibility = showSetupButton ? 'visible' : 'hidden'
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
        currentData = data;
        currentDataJson=JSON.stringify(currentData);
        //console.log(currentDataJson);
        //currentData = JSON.parse(currentDataJson); 


        
        //ulCollectedSafeAddresses
    });
}

loadCurrentData();
//updateUI();
window.setInterval(function(){
    loadCurrentData();
    updateUI();
}, 500);
