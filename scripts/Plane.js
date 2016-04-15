function Plane(lat, lon) {
    var $this = this;
    var _pos = coordinateToNauticalMile(lat, lon);
    var _autoTurn = {
        enabled: false, // false, 1 = half standard, 2 = standard
        targetHeading: 0,
        targetBankAngle: 0,
        standardRate: 0,
        halfStandardRate: 0
    };
    var newBeaconLocation = {radial: undefined, distance: undefined, heading: undefined};


    // control
    $this.indicatedAirspeed = 180;  //kias
    $this.pitch = 0;                //degrees
    $this.bankAngle = 0;            //degrees

    // performance
    $this.trueAirspeed = 0;         //kts
    $this.fakeGroundSpeed = 0;      //kts
    $this.verticalVelocity = 0;     //feet/min
    $this.altitude = 6000;          //feet
    $this.turnRate = 0;             //deg/sec
    $this.heading = 0;              //degrees
    $this.trueTrack = 0;            //degrees
    $this.groundSpeed = 0;
    $this.posX = _pos.x;                 //nautical mile
    $this.posY = _pos.y;                 //nautical mile.

    // wind (we need that here for calculations)
    $this.windVelocity = 0;         //kts
    $this.windDirection = 0;        //where it is blowing from

    // increments used for control inputs
    $this.increments = {
        pitch: 1,
        bankAngle: 1,
        indicatedAirspeed: 5,
    };

    // certain limits for the aircraft
    $this.limits = {
        pitch: [-15, 20],
        bankAngle: [-45, 45],
        indicatedAirspeed: [60, 260],
        altitude: [0, 25000]
    };

    // position log
    $this.positions = [];

    /**
     * Roll the a/c to the right
     */
    $this.rollRight = function() {
        $this.bankAngle = $this.bankAngle + $this.increments.bankAngle;
        if ($this.bankAngle > $this.limits.bankAngle[1]) {
            $this.bankAngle = $this.limits.bankAngle[1]
        }
        controlUpdate();
    };

    /**
     * Roll the a/c to the left
     */
    $this.rollLeft = function() {
        $this.bankAngle = $this.bankAngle - $this.increments.bankAngle;
        if ($this.bankAngle < $this.limits.bankAngle[0]) {
            $this.bankAngle = $this.limits.bankAngle[0]
        }
        controlUpdate();
    };

    /**
     * Pitch the a/c up
     */
    $this.pitchUp = function() {
        $this.pitch = $this.pitch + $this.increments.pitch;
        if ($this.pitch > $this.limits.pitch[1]) {
            $this.pitch = $this.limits.pitch[1]
        }
        controlUpdate();
    };

    /**
     * Pitch the a/c down
     */
    $this.pitchDown = function() {
        $this.pitch = $this.pitch - $this.increments.pitch;
        if ($this.pitch < $this.limits.pitch[0]) {
            $this.pitch = $this.limits.pitch[0]
        }
        controlUpdate();
    };

    /**
     * Increase the a/c speed (KIAS)
     */
    $this.increaseSpeed = function() {
        $this.indicatedAirspeed = $this.indicatedAirspeed + $this.increments.indicatedAirspeed;
        if ($this.indicatedAirspeed > $this.limits.indicatedAirspeed[1]) {
            $this.indicatedAirspeed = $this.limits.indicatedAirspeed[1]
        }
        controlUpdate();
    };

    /**
     * Decrease the a/c speed (KIAS)
     */
    $this.decreaseSpeed = function() {
        $this.indicatedAirspeed = $this.indicatedAirspeed - $this.increments.indicatedAirspeed;
        if ($this.indicatedAirspeed < $this.limits.indicatedAirspeed[0]) {
            $this.indicatedAirspeed = $this.limits.indicatedAirspeed[0]
        }
        controlUpdate();
    };

    /**
     * Calculate the True Airspeed
     */
    $this.calcTrueAirspeed = function() {
        $this.trueAirspeed = $this.indicatedAirspeed + (($this.altitude / 1000) * 0.02) * $this.indicatedAirspeed;
    };

    /**
     * Calculate the Ground Speed
     */
    $this.calcFakeGroundSpeed = function() {
        $this.fakeGroundSpeed = Math.cos(toRadians($this.pitch)) * $this.trueAirspeed;
    };

    /**
     * Calculate the vertical velocity
     */
    $this.calcVerticalVelocity = function() {
        // TODO for now we are going to use this
        $this.verticalVelocity = $this.pitch * 250;
    };

    /**
     * Calculate the altitude
     */
    $this.calcAltitude = function() {
        $this.altitude += ((($this.verticalVelocity / 60) * my.simulationRate) / FRAME_RATE);
        if ($this.altitude < $this.limits.altitude[0]) {
            $this.pitch = 0;
            $this.altitude = 0;
        }
        else if ($this.altitude > $this.limits.altitude[1]) {
            $this.pitch = 0;
            $this.altitude = $this.limits.altitude[1];
        }
    };

    /**
     * Calculate the turn rate
     */
    $this.calcTurnRate = function() {
        $this.turnRate = (1091 * Math.tan(toRadians($this.bankAngle))) / $this.trueAirspeed;
        $this.turnRate = Math.round($this.turnRate * 1e2) / 1e2;
        _autoTurn.halfStandardRate = ($this.trueAirspeed / 20) + 5;
        _autoTurn.standardRate = ($this.trueAirspeed / 10) + 8;
    }

    /**
     * calculate the heading
     */
    $this.calcHeading = function() {
        $this.heading += ($this.turnRate * my.simulationRate) / FRAME_RATE;
        if ($this.heading < 0 && $this.turnRate < 0) {
            $this.heading += 360;
        }
        else if ($this.heading >= 360 && $this.turnRate > 0) {
            $this.heading -= 360;
        }
    };

    $this.calcPosition = function() {
        // convert the headings to radians for sin/cos calc
        var hdgRadians = toRadians($this.heading);
        var windRadians = toRadians($this.windDirection - 180);
        // calculate the X delta
        var planeX = Math.round((Math.sin(hdgRadians) * ($this.fakeGroundSpeed / 3600)) * 1e3) / 1e3;
        var windX = Math.round((Math.sin(windRadians) * ($this.windVelocity / 3600)) * 1e3) / 1e3;
        $this.posX += ((planeX + windX) * my.simulationRate) / FRAME_RATE;
        // calculate the Y delta
        var planeY = Math.round((Math.cos(hdgRadians) * ($this.fakeGroundSpeed / 3600)) * 1e3) / 1e3;
        var windY = Math.round((Math.cos(windRadians) * ($this.windVelocity / 3600)) * 1e3) / 1e3;
        $this.posY += ((planeY + windY) * my.simulationRate) / FRAME_RATE;
    };

    /**
     * Log one position
     */
    $this.logPosition = function() {
        $this.positions.push([$this.posX, $this.posY]);
        $this.onPositionUpdate([$this.posX, $this.posY]);
    };

    $this.clearPositions = function() {
        $this.positions = [];
        $this.logPosition();
    }

    $this.toggleAutoTurn = function(hdg) {
        switch (_autoTurn.enabled) {
            case false:
                enableAutoTurn(_autoTurn.halfStandardRate, '&frac12; standard rate');
                break;
            case _autoTurn.halfStandardRate:
                enableAutoTurn(_autoTurn.standardRate, 'standard rate');
                break;
            case _autoTurn.standardRate:
                $this.disableAutoTurn();
                break;
        }
    };

    function enableAutoTurn(n, t) {
        _autoTurn.enabled = n;
        $('.info.auto-turn .value').html(t).addClass('on');
    }

    $this.disableAutoTurn = function() {
        _autoTurn.enabled = false;
        $('.info.auto-turn .value').html('off').removeClass('on');
    }

    $this.updateAutoTurn = function(hdg) {
        $this.calcTurnRate();
        _autoTurn.targetHeading = hdg;
    }

    $this.setAttitude = function(bank, pitch) {
        $this.disableAutoTurn();
        $this.bankAngle = bank;
        $this.pitch = pitch;
        controlUpdate();
    }

    $this.setBeaconRadial = function(radial) {
        newBeaconLocation.radial = radial % 360
    }

    $this.setBeaconDistance = function(distance) {
        newBeaconLocation.distance = parseInt(distance);
    }

    $this.setBeaconHeading = function(heading) {
        newBeaconLocation.heading = heading % 360;
    }

    $this.parseBeaconLocation = function(beaconPosition) {
        $this.posX = beaconPosition.x + (Math.cos(toRadians(newBeaconLocation.radial - 90)) * newBeaconLocation.distance);
        $this.posY = beaconPosition.y - (Math.sin(toRadians(newBeaconLocation.radial - 90)) * newBeaconLocation.distance);
        $this.heading = newBeaconLocation.heading;
        newBeaconLocation = {radial: undefined, distance: undefined, heading:undefined};
    }

    function autoTurn() {
        var diff = calcHeadingDiff($this.heading, _autoTurn.targetHeading);
        if (diff < -.01) {
            _autoTurn.targetBankAngle = -Math.round(_autoTurn.enabled);
            if (diff > _autoTurn.targetBankAngle / 3) {
                _autoTurn.targetBankAngle = Math.floor(diff);
            }
        } else if (diff > .01) {
            _autoTurn.targetBankAngle = Math.round(_autoTurn.enabled);
            if (diff < _autoTurn.targetBankAngle / 3) {
                _autoTurn.targetBankAngle = Math.ceil(diff);
            }
        } else {
            _autoTurn.targetBankAngle = 0;
        }
        if ($this.bankAngle < _autoTurn.targetBankAngle) {
            $this.rollRight();
        } else if ($this.bankAngle > _autoTurn.targetBankAngle) {
            $this.rollLeft();
        }
    }

    function controlUpdate() {
        $this.calcVerticalVelocity();
        $this.calcTurnRate();
        $this.onControlUpdate();
    }

    var frame = 0;
    /**
     * This function is called from the timer, and is used to update the plane
     */
    $this.timerTick = function() {
        frame++;
        if (_autoTurn.enabled != false) {
            autoTurn();
        }

        $this.calc();

        frame = frame % Math.floor(FRAME_RATE / my.simulationRate);
        if (frame == 0) {
            $this.logPosition();
        }
    }

    $this.calc = function() {
        $this.calcAltitude();
        $this.calcTrueAirspeed();
        $this.calcFakeGroundSpeed();
        $this.calcHeading();
        $this.calcPosition();
    }

    // callbacks
    $this.onControlUpdate = function(){};
    $this.onPositionUpdate = function(position) {};

    $this.calc();
    controlUpdate();
    $this.logPosition();
}