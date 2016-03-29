var plane, plot, hsi, ai;
var activeBeacons = {};
var startTime = new Date();

// when the document is ready
$(document).ready(function(){
    ai = new AI();
    hsi = new HSI();
    plot = new Plot();
    addBeacon('WDT');
    addBeacon('GZR');
    addBeacon('LWD');
    plane = new Plane(activeBeacons.WDT.lat, activeBeacons.WDT.lon);
    plot.moveToLatLon(activeBeacons.WDT.lat, activeBeacons.WDT.lon);

    hsi.updateBeacon(activeBeacons.WDT);

    var t = new Timer();
    t.onTimerTick = function () {
        plane.timerTick(t);
        $('#debug tr.stopwatch td.value').text(readableTime(new Date() - startTime));
        $('#debug tr.kias td.value').text(plane.indicatedAirspeed);
        $('#debug tr.vtas td.value').text(Math.round(plane.trueAirspeed));
        $('#debug tr.pitch td.value').text(plane.pitch);
        $('#debug tr.aob td.value').text(plane.bankAngle);
        $('#debug tr.vv td.value').text(plane.verticalVelocity);
        $('#debug tr.alt td.value').text(Math.round(plane.altitude));
        $('#debug tr.turn-rate td.value').text(plane.turnRate);
        $('#debug tr.hdg td.value').text(Math.round(plane.heading * 10) / 10);
        $('#debug tr.tt td.value').text(plane.trueTrack);
        $('#debug tr.gs td.value').text(plane.groundSpeed);
        $('#debug tr.pos-x td.value').text(plane.posX);
        $('#debug tr.pos-y td.value').text(plane.posY);

        plane.onPositionUpdate = function(position) {
            plot.appendTrackPoint(position);
        }

        plane.onKeyPressed = function(key) {
            ai.updatePitch(plane.pitch);
            ai.updateBank(plane.bankAngle);
            ai.draw();
        }

        hsi.updateHeading(plane.heading);
        hsi.updatePlane(plane);
        hsi.draw();
    }

    t.startTimer();
});

function Timer() {

    var $this = this;

    this.fps = 24;
    var timer;

    this.startTimer = function(fps) {
        timer = setInterval(this.timerTick, 1000 / this.fps);
    }

    this.stopTimer = function() {
        clearInterval(timer);
    }

    this.timerTick = function() {
        $this.onTimerTick();
    }

    // callback
    $this.onTimerTick = function(){};
}

function addBeacon(id) {
    activeBeacons[id] = new Beacon(id);
    plot.appendBeacon(activeBeacons[id]);
}

function toRadians (angle) {
    return angle * piRatio;
}

function toDegrees (angle) {
    return angle / piRatio;
}

function readableTime(date) {
    var h = Math.floor(date / (60 * 60 * 1000)),
        m = Math.floor(date / (60 * 1000)) % 60,
        s = Math.floor(date / 1000) % 60,
        ms = date % 1000;

    return pad(2, h) + ':' + pad(2, m) + ':' + pad(2, s) + ':' + pad(3, ms);
}

function pad(size, value) {
    return ('0000' + value).substr(-size);
}

function coordinateToNauticalMile(lat, lon) {
    return {x: Math.cos(toRadians(lat[0])) * ((lon[0] * 60) + lon[1]), y:(lat[0] * 60) + lat[1]};
}

function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

// set some global functions
function debug(data) {
    console.log(data);
}

var piRatio = 0.0174532925;