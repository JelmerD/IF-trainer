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
    currentBeacon: undefined,
    map: undefined,
    plane: undefined,
    simulationRate: 1
};

var elem = {};

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
     * Custom keyMap, used for correct usage of methods inside the keyDown and keyUp object
     *
     * @type Object
     */
    var keyMap = {
        27: 'esc',
        37: 'arrow_left',
        38: 'arrow_up',
        39: 'arrow_right',
        40: 'arrow_down',
        66: 'b',
        67: 'c',
        76: 'l',
        77: 'm',
        80: 'p',
        82: 'r',
        83: 's',
        84: 't',
        87: 'w',
        107: 'num_plus',
        109: 'num_minus',
        187: 'pad_plus',
        189: 'pad_minus',
    }

    /**
     * All keyDown events
     *
     * @type Object
     */
    var keyDown = {
        arrow_left: function () {
            my.plane.disableAutoTurn();
            my.plane.rollLeft();
            updateInstrumentAI();
        },
        arrow_up: function () {
            my.plane.pitchDown();
            updateInstrumentAI();
        },
        arrow_right: function () {
            my.plane.disableAutoTurn();
            my.plane.rollRight();
            updateInstrumentAI();
        },
        arrow_down: function () {
            my.plane.pitchUp();
            updateInstrumentAI();
        },
    };

    /**
     * All keyUp events
     *
     * @type Object
     */
    var keyUp = {
        esc: function () {
            $this.closeBeaconSelect();
            $this.closeWindSelect();
            $this.closeLocationSelect();
            $(':focus').blur();
        },
        b: function () {
            $('.control-group.hsi-bug .value').focus();
        },
        c: function () {
            $('.control-group.hsi-course .value').focus();
        },
        l: function () {
            $this.openLocationSelect();
        },
        m: function () {
            my.map.toggleVisibility();
        },
        p: function () {
            $this.togglePause();
        },
        r: function () {
            my.scene.toggleSimulationRate();
        },
        s: function () {
            $this.openBeaconSelect();
        },
        t: function () {
            my.plane.toggleAutoTurn(my.instrument.hsi.getHeadingBug());
        },
        w: function () {
            $this.openWindSelect();
        },
        num_plus: function () {
            my.plane.increaseSpeed();
        },
        num_minus: function () {
            my.plane.decreaseSpeed();
        },
        pad_plus: function () {
            my.plane.increaseSpeed();
        },
        pad_minus: function () {
            my.plane.decreaseSpeed();
        },
    };

    /**
     * Wind parameters
     *
     * @type {{direction: number, velocity: number}}
     */
    $this.wind = {
        direction: 0,
        velocity: 0
    }

    /**
     * When the document is ready
     */
    $(document).ready(function () {
        initElements();
        initObjects();
        bindKeys();
        timer.toggle();
    });

    function initElements() {
        elem = {
            wind: {
                control: $('.control-group.wind .value')
            }
        };
    }

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

        my.plane.onPositionUpdate = function (position) {
            my.map.appendTrackPoint(position);
        }

        my.plane.onControlUpdate = function() {
            updateInstrumentAI();
        }

        my.instrument.hsi.onHeadingBugAdjust = function (hdg) {
            my.plane.updateAutoTurn(hdg);
        }
    }

    /**
     * Bind keys to the document
     */
    function bindKeys() {
        // keys that can be hold down
        $(document).on('keydown', function (e) {
            //debug('keyDown: ' + e.keyCode);
            if (keyDown[keyMap[e.keyCode]] != undefined) {
                keyDown[keyMap[e.keyCode]]();
            }
        });

        // keys that only work 'once'
        $(document).on('keyup', function (e) {
            //debug('keyUp: ' + e.keyCode);
            if (keyUp[keyMap[e.keyCode]] != undefined) {
                keyUp[keyMap[e.keyCode]]();
            }
        });
    }

    function updateInstrumentAI() {
        my.instrument.ai.updatePitch(my.plane.param('pitch'));
        my.instrument.ai.updateBank(my.plane.param('bankAngle'));
        my.instrument.ai.draw();
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

    $this.togglePause = function () {
        timer.toggle();
        if (timer.isRunning()) {
            my.scene.toggleSimulationRate(1);
        } else {
            $('.control-group.simulation-rate .value').text('paused');
        }
    }

    $this.toggleSimulationRate = function (value) {
        var max = 8; // must be a power of 2
        if (!timer.isRunning()) {
            timer.toggle();
            value = 1;
        }
        if (value === undefined) {
            if (my.simulationRate == max) {
                my.simulationRate = 1;
            } else {
                my.simulationRate *= 2;
            }
        } else {
            my.simulationRate = value;
        }
        $('.control-group.simulation-rate .value').text(my.simulationRate + 'x');
    }

    $this.openBeaconSelect = function () {
        if ($('#beacon-select ul').html() == '') {
            var n = beaconIndexes.length, i = -1;
            while (++i, i < n) {
                var h = $('<li></li>').html((i + 1) + '. ' + my.beacon[beaconIndexes[i]].name).attr({
                    'data-id': i + 1
                });
                h.on('click', function () {
                    $this.selectBeacon($(this).attr('data-id'));
                });
                $('#beacon-select ul').append(h);
            }
        }
        $('#beacon-select').show();
        $('#beacon-select input').val('').focus();
    }

    $this.closeBeaconSelect = function () {
        $('#beacon-select').hide();
    }

    $this.selectBeacon = function (value) {
        $this.closeBeaconSelect();
        if (isNumber(value) && beaconIndexes[value - 1] != undefined) {
            my.currentBeacon = value;
            my.instrument.hsi.updateBeacon(my.beacon[beaconIndexes[value - 1]]);
            $('.info.station .value').val(my.beacon[beaconIndexes[value - 1]].name);
        }
    }

    $this.openLocationSelect = function () {
        $('#location-select').show();
        $('#location-select input.distance').val('');
        $('#location-select input.heading').val('');
        $('#location-select input.radial').val('').focus();
    }

    $this.closeLocationSelect = function () {
        $('#location-select').hide();
    }

    $this.selectLocationRadial = function (value) {
        if (isNumber(value)) {
            if (value.length == 3) {
                my.plane.setBeaconRadial(value);
                $('#location-select input.distance').focus();
            }
        } else {
            $this.closeLocationSelect();
        }
    }

    $this.selectLocationDistance = function (value) {
        if (isNumber(value)) {
            if (value.length == 2) {
                my.plane.setBeaconDistance(value);
                $('#location-select input.heading').focus();
            }
        } else {
            $this.closeLocationSelect();
        }
    }

    $this.selectLocationHeading = function (value) {
        if (isNumber(value)) {
            if (value.length == 3) {
                my.plane.setBeaconHeading(value);
                my.plane.parseBeaconLocation(my.beacon[beaconIndexes[my.currentBeacon - 1]].pos)
                my.map.clearTrack();
                my.plane.clearPositions();
                $this.closeLocationSelect();
            }
        } else {
            $this.closeLocationSelect();
        }
    }

    $this.openWindSelect = function () {
        $('#wind-select').show();
        $('#wind-select input.velocity').val('');
        $('#wind-select input.direction').val('').focus();
    }

    $this.closeWindSelect = function () {
        $('#wind-select').hide();
    }

    $this.selectWindDirection = function (value) {
        if (isNumber(value)) {
            if (value.length == 3) {
                $this.wind.direction = parseInt(value) % 360;
                updateWindControl();
                $('#wind-select input.velocity').focus();
            }
        } else {
            $this.closeWindSelect();
        }
    }

    $this.selectWindVelocity = function (value) {
        if (isNumber(value)) {
            if (value.length == 2) {
                $this.wind.velocity = parseInt(value);
                updateWindControl();
                $this.closeWindSelect();
            }
        } else {
            $this.closeWindSelect();
        }
    }

    function updateWindControl() {
        if ($this.wind.velocity == 0) {
            elem.wind.control.removeClass('on');
        } else {
            elem.wind.control.addClass('on');
        }
        elem.wind.control.text(pad(3, $this.wind.direction) + ' / ' + pad(2, $this.wind.velocity));
        my.map.setWind($this.wind.direction, $this.wind.velocity);
    }

    /**
     * On a timer tick, do the following
     *
     * This method is called by the Timer object itself
     */
    timer.onTick = function () {
        my.plane.timerTick();
        my.instrument.hsi.updateHeading(my.plane.param('heading'));
        my.instrument.hsi.updatePlane(my.plane);
        my.instrument.hsi.timerTick();

        // directy debug stuff
        $('#debug tr.stopwatch td.value').text(timer.getElapsedTime());
        $('#debug tr.kias td.value').text(my.plane.param('indicatedAirspeed'));
        $('#debug tr.vtas td.value').text(Math.round(my.plane.param('trueAirspeed')));
        $('#debug tr.vv td.value').text(my.plane.param('verticalVelocity'));
        $('#debug tr.alt td.value').text(Math.round(my.plane.param('altitude')));
        $('#debug tr.turn-rate td.value').text(my.plane.param('turnRate'));
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
    $this.toggle = function () {
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
    $this.getElapsedTime = function () {
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
    $this.isRunning = function () {
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
    function tick() {
        elapsed += (1000 * my.simulationRate) / FRAME_RATE;
        $this.onTick();
    }

    // callback
    $this.onTick = function () {
    };
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
function toRadians(angle) {
    return angle * PI_RATIO;
}

/**
 * Convert radians to degrees
 *
 * @param angle
 * @returns {number}
 */
function toDegrees(angle) {
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
    return {x: Math.cos(toRadians(lat[0])) * ((lon[0] * 60) + lon[1]), y: (lat[0] * 60) + lat[1]};
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