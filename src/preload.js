var fs = require('fs');
const WebSocket = require('ws');

window.addEventListener('DOMContentLoaded', () => {
	const replaceText = (selector, text) => {
		const element = document.getElementById(selector)
		if (element) { element.innerText = text }
	}
	for (const dependency of ['chrome', 'node', 'electron']) {
		replaceText(`${dependency}-version`, process.versions[dependency])
	}
	console.log("Preload.js");
})

loadConfig = () => {
	fs.readFile('config.json', (err, data) => {
		if (err) { console.error(err); return }
		var config = JSON.parse(data);
		$scope.incoming.name = config.incoming.name;
		$scope.outgoing.name = config.outgoing.name;
		$scope.outgoing.url = config.outgoing.url;
		$scope.safeApply();
	});
}

saveConfig = () => {
	var config = fs.writeFileSync('config.json', JSON.stringify({
		incoming: {
			name: $scope.incoming.name
		},
		outgoing: {
			name: $scope.outgoing.name,
			url: $scope.outgoing.url
		}
	}));
}

incomingPort = 7000;

wss = new WebSocket.Server({ port: incomingPort });
wss.on('connection', function connection(incomingWS) {
	$scope.incoming.ws = incomingWS;

	//  Create WS connection to outgoing
	const outgoingWS = new WebSocket($scope.outgoing.url);
	$scope.outgoing.ws = outgoingWS;
	incomingWS.on('error', error => { console.error(`${$scope.incoming.name} connection error\n`, error) });
	outgoingWS.on('error', error => { console.error(`${$scope.outgoing.name} connection error\n`, error) });
	outgoingWS.on('open', data => {
		$scope.systemMessage(`${$scope.outgoing.name} outgoing connection open`);
		//  Forwards messages from Cache
		for (msg of $scope.outgoing.cache) {
			$scope.message("outgoing", { name: "Cache" }, $scope.outgoing, false, msg, true);
		}
		$scope.outgoing.cache = [];
	});

	$scope.systemMessage(` ${$scope.incoming.name} incoming connection open`);
	//  Forwards messages from Cache
	for (msg of $scope.incoming.cache) {
		$scope.message("incoming", { name: "Cache" }, $scope.incoming, false, msg, true);
	}
	$scope.incoming.cache = [];

	//  Forwards messages from incoming to outgoing
	incomingWS.on('message', data => {
		if ($scope.incoming.ws.readyState == 1 && $scope.outgoing.ws.readyState == 1) {

			if ($scope.incoming.rule.enabled) {
				var message = JSON.parse(data);
				if (message[$scope.incoming.rule.key] == $scope.incoming.rule.value) {
					switch ($scope.incoming.rule.action) {
						case 'block':
							$scope.message("system", $scope.incoming, { name: "PROXY" }, false, data, false);
							break;
						case 'modify':
							$scope.message("system", $scope.incoming, { name: "PROXY" }, false, data, false);
							var newValue;
							switch ($scope.incoming.rule.modifyType) {
								case 'string':
									newValue = $scope.incoming.rule.modifyValue;
									break;
								case 'number':
									newValue = Number($scope.incoming.rule.modifyValue);
									break;
								case 'json':
									newValue = JSON.parse($scope.incoming.rule.modifyValue);
									break;
							}
							message[$scope.incoming.rule.modifyKey] = newValue;
							var newData = JSON.stringify(message);
							$scope.message("system", { name: "PROXY" }, $scope.outgoing, false, newData, true);
							break;
						case 'replace':
							$scope.message("system", $scope.incoming, { name: "PROXY" }, false, data, false);
							var newData = $scope.incoming.rule.replaceValue;
							$scope.message("system", { name: "PROXY" }, $scope.outgoing, false, newData, true);
							break;
					}
					return;
				}
			}
			$scope.message("outgoing", $scope.incoming, $scope.outgoing, false, data, true);

		} else {
			$scope.message("outgoing", $scope.incoming, $scope.outgoing, true, data, true);
		}
	});

	//  Forwards messages from outgoing to incoming
	outgoingWS.on('message', data => {
		if ($scope.incoming.ws.readyState == 1 && $scope.outgoing.ws.readyState == 1) {

			if ($scope.outgoing.rule.enabled) {
				var message = JSON.parse(data);
				if (message[$scope.outgoing.rule.key] == $scope.outgoing.rule.value) {
					switch ($scope.outgoing.rule.action) {
						case 'block':
							$scope.message("system", $scope.outgoing, { name: "PROXY" }, false, data, false);
							break;
						case 'modify':
							$scope.message("system", $scope.outgoing, { name: "PROXY" }, false, data, false);
							var newValue;
							switch ($scope.outgoing.rule.modifyType) {
								case 'string':
									newValue = $scope.outgoing.rule.modifyValue;
									break;
								case 'number':
									newValue = Number($scope.outgoing.rule.modifyValue);
									break;
								case 'json':
									newValue = JSON.parse($scope.outgoing.rule.modifyValue);
									break;
							}
							message[$scope.outgoing.rule.modifyKey] = newValue;
							var newData = JSON.stringify(message);
							console.log("newData", newData)
							$scope.message("system", { name: "PROXY" }, $scope.incoming, false, newData, true);
							break;
						case 'replace':
							$scope.message("system", $scope.outgoing, { name: "PROXY" }, false, data, false);
							var newData = $scope.outgoing.rule.replaceValue;
							$scope.message("system", { name: "PROXY" }, $scope.incoming, false, newData, true);
							break;
					}
					return;
				}
			}
			$scope.message("incoming", $scope.outgoing, $scope.incoming, false, data, true);

		} else {
			$scope.message("incoming", $scope.outgoing, $scope.incoming, true, data, true);
		}
	});

	//  Detects outgoing connection close and closes incoming connection too
	outgoingWS.on('close', () => {
		incomingWS.close();
		$scope.systemMessage(`${$scope.outgoing.name} connection closed`)

	});

	//  Detects incoming connection close and closes outgoing connection too
	incomingWS.on('close', () => {
		outgoingWS.close();
		$scope.systemMessage(`${$scope.incoming.name} connection closed`)
	});

});