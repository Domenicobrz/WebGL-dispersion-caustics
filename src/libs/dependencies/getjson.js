function getjson(file, callback) {
    var rawFile = new XMLHttpRequest();
    rawFile.overrideMimeType("application/json");
    rawFile.open("GET", file, true);
    rawFile.onreadystatechange = function() {
        if (rawFile.readyState === 4 && rawFile.status == "200") {
            var jsonData = JSON.parse(rawFile.responseText);
            callback(jsonData);
        }
    };
    rawFile.send(null);
}


export { getjson };