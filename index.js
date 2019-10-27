const express = require("express");
const app = express();

app.listen(3000, () => {
	console.log("Server running on port 3000");
});

const mqtt    = require('mqtt');
const client  = mqtt.connect("mqtts://mqtt.hsl.fi:8883",{clientId:"mqttjs01"});
const vehicleDeadTimeout = 120;
let vehicles = {};

const topicMatcher = new RegExp('/([^\/]*)\/([^\/]*)\/([^\/]*)\/([^\/]*)\/([^\/]*)\/([^\/]*)\/([^\/]*)\/([^\/]*)\/([^\/]*)\/([^\/]*)\/([^\/]*)\/([^\/]*)\/([^\/]*)\/([^\/]*)\/([^\/]*)\/([^\/]*)\/');
client.on('message',function(topic, message, packet){
	let msg = JSON.parse(message);
	msg = msg.VP;
	//console.log(topic, msg);

	const matchedTopic = topicMatcher.exec(topic);

	const prefix = matchedTopic[1],
	 	  verson = matchedTopic[2],
	 	  journey_type = matchedTopic[3],
	 	  temporal_type = matchedTopic[4],
	 	  event_type = matchedTopic[5],
	 	  transport_mode = matchedTopic[6];

	const uid = msg.oper + "-" + msg.veh;

	if (msg.lat && msg.long && msg.veh) {
		vehicles[uid] = {
			id: uid,
			mode: transport_mode,
			route: msg.route,
			heading: msg.hdg,
			lat: msg.lat,
			lon: msg.long,
			speed: msg.spd,
			lastUpdate: getTs()
		};
	}
});

app.get("/get_vehicles", (req, res, next) => {
	res.json(vehicles);
});

setInterval(function() {
	const ts = getTs();
	console.log("Checking dead vehicles", ts);

	for (var i in vehicles) {
		const veh = vehicles[i];
		if (veh.lastUpdate + vehicleDeadTimeout < ts) {
			console.log("Removig vehicle " + i + ", because it stopped sending data");

			delete vehicles[i];
		}
	}
}, 10000);

function getTs() {
	return Math.round((new Date()).getTime() / 1000);
}

setInterval(function() {
	console.log("Actual vehicles are: " + Object.keys(vehicles).length);
	console.debug("Vehicle list are: ", vehicles);
}, 5000);


client.on("connect",function(){	
	console.log("connected  "+ client.connected);
});

client.on("error",function(error) {
	console.log("Can't connect" + error);
	process.exit(1)
});

const options={
	retain:true,
	qos:1
};
const topic="/hfp/v2/journey/ongoing/vp/+/+/+/+/+/+/+/+/0/#";

client.subscribe(topic,{qos:1});