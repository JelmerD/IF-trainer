/**
 * Contains some global variables
 * In a grouping variable for easy access
 *
 * @type {{instrument: {}, beacon: {}}}
 */
var my = {
    scene: undefined,
    instrument: {ai: undefined, hsi: undefined},
    beacon: {},
    map: undefined,
    plane: undefined
};

/**
 * The main object
 *
 * @constructor
 */
function Scene() {
    /**
     * Copy of the object (used for ref.)
     */
    var $this = this;

    /**
     * Contains the timer object
     *
     * @type {Timer}
     */
    var timer = new Timer();

    /**
     * Keep track of the beacon indexes
     *
     * @type {Array}
     */
    var beaconIndexes = [];

    /**
     * When the document is ready
     */
    $(document).ready(function(){
        initObjects();
        bindKeys();
        timer.toggle();
    });

    /**
     * Initialize all the objects
     */
    function initObjects() {
        my.instrument.ai = new AI();
        my.instrument.hsi = new HSI();
        my.map = new Map();
        my.map.show();
        addBeacon('WDT');
        addBeacon('GZR');
        addBeacon('LWD');
        my.plane = new Plane(my.beacon.WDT.lat, my.beacon.WDT.lon);
        my.map.moveToLatLon(my.beacon.WDT.lat, my.beacon.WDT.lon);
        $this.selectBeacon(1);

        my.plane.onPositionUpdate = function(position) {
            my.map.appendTrackPoint(position);
        }

        my.plane.onControlUpdate = function() {
            my.instrument.ai.updatePitch(my.plane.pitch);
            my.instrument.ai.updateBank(my.plane.bankAngle);
            my.instrument.ai.draw();
        }

        my.instrument.hsi.onHeadingBugAdjust = function(hdg) {
            my.plane.updateAutoTurn(hdg);
        }
    }

    /**
     * Bind keys to the document
     */
    function bindKeys() {
        // keys that can be hold down
        $(document).on('keydown', function(e){
            //debug('keyDown: ' + e.keyCode);
            // insert keyDown objects here
            my.plane.keyDown(e.keyCode);
        });

        // keys that only work 'once'
        $(document).on('keyup', function(e){
            //debug('keyUp: ' + e.keyCode);
            // insert keyUp objects here
            keyUp(e.keyCode);
        });
    }

    /**
     * keyUp events for the main trainer
     *
     * @param keyCode
     */
    function keyUp(keyCode) {
        switch(keyCode) {
            case 27: //esc
                $this.closeBeaconSelect();
                $(':focus').blur(); break;
            case 80: //p
                $this.togglePause(); break;
            case 66: //b
                $('.control-group.hsi-bug .value').focus(); break;
            case 67: //c
                $('.control-group.hsi-course .value').focus(); break;
            case 83: //s
                $this.openBeaconSelect(); break;
            case 84: //t
                my.plane.toggleAutoTurn(my.instrument.hsi.getHeadingBug()); break;
            case 87: //w
                $this.openWindSelect(); break;
        }
    }

    /**
     * Add a beacon to the beacon list
     *
     * @param id
     */
    function addBeacon(id) {
        beaconIndexes.push(id);
        my.beacon[id] = new Beacon(id);
        my.map.appendBeacon(my.beacon[id]);
    }

    $this.togglePause = function() {
        timer.toggle();
        if (timer.isRunning()) {
            $('.info.pause .value').removeClass('on');
        } else {
            $('.info.pause .value').addClass('on');
        }
    }

    $this.openBeaconSelect = function() {
        if ($('#beacon-select ul').html() == '') {
            var n = beaconIndexes.length, i = -1;
            while (++i, i < n) {
                var h = $('<li></li>').html((i + 1) + '. ' + my.beacon[beaconIndexes[i]].name).attr({
                    'data-id': i + 1
                });
                h.on('click', function() {
                    $this.selectBeacon($(this).attr('data-id'));
                });
                $('#beacon-select ul').append(h);
            }
        }
        $('#beacon-select').show();
        $('#beacon-select input').val('').focus();
    }

    $this.closeBeaconSelect = function() {
        $('#beacon-select').hide();
    }

    $this.selectBeacon = function(value) {
        $this.closeBeaconSelect();
        if (isNumber(value) && beaconIndexes[value - 1] != undefined) {
            my.instrument.hsi.updateBeacon(my.beacon[beaconIndexes[value - 1]]);
            $('.info.station .value').val(my.beacon[beaconIndexes[value - 1]].name);
        }
    }

    $this.openWindSelect = function() {
        $('#wind-select').show();
        $('#wind-select input.velocity').val('');
        $('#wind-select input.direction').val('').focus();
    }

    $this.closeWindSelect = function() {
        $('#wind-select').hide();
    }

    $this.selectWindDirection = function(value) {
        if (isNumber(value)) {
            if (value.length == 3) {
                my.plane.windDirection = value % 360;
                updateWindControl();
                $('#wind-select input.velocity').focus();
            }
        } else {
            $this.closeWindSelect();
        }
    }

    $this.selectWindVelocity = function(value) {
        if (isNumber(value)) {
            if (value.length == 2) {
                my.plane.windVelocity = parseInt(value);
                updateWindControl();
                $this.closeWindSelect();
            }
        } else {
            $this.closeWindSelect();
        }
    }

    function updateWindControl() {
        if (my.plane.windVelocity == 0) {
            $('.control-group.wind .value').removeClass('on');
        } else {
            $('.control-group.wind .value').addClass('on');
        }
        $('.control-group.wind .value').text(pad(3, my.plane.windDirection) + ' / ' + pad(2, my.plane.windVelocity));
        my.map.setWind(my.plane.windDirection, my.plane.windVelocity);
    }

    /**
     * On a timer tick, do the following
     *
     * This method is called by the Timer object itself
     */
    timer.onTick = function() {
        my.plane.timerTick();
        my.instrument.hsi.updateHeading(my.plane.heading);
        my.instrument.hsi.updatePlane(my.plane);
        my.instrument.hsi.timerTick();

        $('#debug tr.stopwatch td.value').text(timer.getElapsedTime());
        $('#debug tr.kias td.value').text(my.plane.indicatedAirspeed);
        $('#debug tr.vtas td.value').text(Math.round(my.plane.trueAirspeed));
        $('#debug tr.vv td.value').text(my.plane.verticalVelocity);
        $('#debug tr.alt td.value').text(Math.round(my.plane.altitude));
        $('#debug tr.turn-rate td.value').text(my.plane.turnRate);
        $('.info.dme .value').text(my.instrument.hsi.getBeaconToPlaneDistance().toFixed(1));
        $('.info.relative-speed .value').text(Math.round(my.instrument.hsi.getBeaconToPlaneSpeed()));

        my.instrument.hsi.draw();
    }
}

// Call the Scene and append it to the my variable
my.scene = new Scene();

/**
 * Class Timer
 *
 * @constructor
 */
function Timer() {
    /**
     * Declare some variables
     */
    var $this = this,
        elapsed = 0,
        timer,
        running = false;

    /**
     * Toggle the timer
     * Starts when off, stops when running
     */
    $this.toggle = function() {
        if (!running) {
            start();
        } else {
            stop();
        }
    }

    /**
     * Get the elapsed time in a readable format
     *
     * @returns {string}
     */
    $this.getElapsedTime = function() {
        var h = Math.floor(elapsed / (60 * 60 * 1000)),
            m = Math.floor(elapsed / (60 * 1000)) % 60,
            s = Math.floor(elapsed / 1000) % 60,
            ms = parseInt(elapsed % 1000);

        return pad(2, h) + ':' + pad(2, m) + ':' + pad(2, s) + ':' + pad(3, ms);
    }

    /**
     * get the current status of the timer
     *
     * @returns {boolean}
     */
    $this.isRunning = function() {
        return running;
    }

    /**
     * Start the timer
     */
    function start() {
        running = true;
        timer = setInterval(tick, 1000 / FRAME_RATE);
    }

    /**
     * Stop the timer
     */
    function stop() {
        running = false;
        clearInterval(timer);
        timer = undefined;
    }

    /**
     * On a timer tick
     */
    function tick () {
        elapsed += 1000 / FRAME_RATE;
        $this.onTick();
    }

    // callback
    $this.onTick = function(){};
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////// Global constants //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Math.PI / 180, better than constantly calculating this value
 *
 * @type {number}
 */
var PI_RATIO = 0.0174532925;

/**
 * The fps to run the program on
 *
 * @type {number}
 */
var FRAME_RATE = 24;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////// Global methods //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Convert degrees to radians
 *
 * @param angle
 * @returns {number}
 */
function toRadians (angle) {
    return angle * PI_RATIO;
}

/**
 * Convert radians to degrees
 *
 * @param angle
 * @returns {number}
 */
function toDegrees (angle) {
    return angle / PI_RATIO;
}

/**
 * Pad a number with leading zeros
 *
 * @param size
 * @param value
 * @returns {string}
 */
function pad(size, value) {
    return ('0000' + value).substr(-size);
}

/**
 * Convert a lat and long to a x and y in Nautical Miles
 *
 * @param lat
 * @param lon
 * @returns {{x: number, y: *}}
 */
function coordinateToNauticalMile(lat, lon) {
    return {x: Math.cos(toRadians(lat[0])) * ((lon[0] * 60) + lon[1]), y:(lat[0] * 60) + lat[1]};
}

/**
 * Check if a value is a number
 *
 * @param n
 * @returns {boolean}
 */
function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * Calculate a difference between two headings/courses
 *
 * @param a
 * @param b
 * @returns {number}
 */
function calcHeadingDiff(a, b) {
    var d = b - a;
    d += (d <= -180 ? 360 : (d >= 180 ? -360 : 0));
    return d;
}

/**
 * Easier function for debugging
 *
 * @param data
 */
function debug(data) {
    console.log(data);
}