
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

window.setInterval(function(){
    loadCurrentData();

    var jsonDisplay = document.getElementById("jsonDisplay");
    jsonDisplay.value = currentDataJson;
}, 500);

function deployNewGnosisSafe()  {
    getJSON("./deployNewGnosisSave.json", function(err, data) {
       console.log("deployNewGnosisSave started!", data);
    });    
}

function loadCurrentData() {

    getJSON("./currentData.json", function(err, data) {
        console.log(data);
        currentData = data;
        currentDataJson=JSON.stringify(currentData);
        //console.log(currentDataJson);
        //currentData = JSON.parse(currentDataJson); 
    });
}


