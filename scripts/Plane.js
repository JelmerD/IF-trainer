function Plane(lat, lon) {
    var $this = this;
    var _autoTurn = {
        enabled: false, // false, 1 = half standard, 2 = standard
        targetHeading: 0,
        targetBankAngle: 0,
        standardRate: 0,
        halfStandardRate: 0
    };
    var newBeaconLocation = {radial: undefined, distance: undefined, heading: undefined};

    var _param = {
        indicatedAirspeed: 180,
        pitch: 0,
        bankAngle: 0,
        trueAirspeed: 0,
        fakeGroundSpeed: 0,
        verticalVelocity: 0,
        altitude: 6000,
        turnRate: 0,
        heading: 0,
        trueTrack: 0,
        groundSpeed: 0,
    };

    var _increments = {
        pitch: 1,
        bankAngle: 1,
        indicatedAirspeed: 5,
    };

    var _limits = {
        pitch: [-15, 20],
        bankAngle: [-45, 45],
        indicatedAirspeed: [60, 260],
        altitude: [0, 25000]
    };

    $this.pos = coordinateToNauticalMile(lat, lon);

    // position log
    $this.positions = [];

    $this.param = function(v) {
        return _param[v];
    };

    /**
     * Roll the a/c to the right
     */
    $this.rollRight = function() {
        _param.bankAngle = _param.bankAngle + _increments.bankAngle;
        if (_param.bankAngle > _limits.bankAngle[1]) {
            _param.bankAngle = _limits.bankAngle[1]
        }
        controlUpdate();
    };

    /**
     * Roll the a/c to the left
     */
    $this.rollLeft = function() {
        _param.bankAngle = _param.bankAngle - _increments.bankAngle;
        if (_param.bankAngle < _limits.bankAngle[0]) {
            _param.bankAngle = _limits.bankAngle[0]
        }
        controlUpdate();
    };

    /**
     * Pitch the a/c up
     */
    $this.pitchUp = function() {
        _param.pitch = _param.pitch + _increments.pitch;
        if (_param.pitch > _limits.pitch[1]) {
            _param.pitch = _limits.pitch[1]
        }
        controlUpdate();
    };

    /**
     * Pitch the a/c down
     */
    $this.pitchDown = function() {
        _param.pitch = _param.pitch - _increments.pitch;
        if (_param.pitch < _limits.pitch[0]) {
            _param.pitch = _limits.pitch[0]
        }
        controlUpdate();
    };

    /**
     * Increase the a/c speed (KIAS)
     */
    $this.increaseSpeed = function() {
        _param.indicatedAirspeed = _param.indicatedAirspeed + _increments.indicatedAirspeed;
        if (_param.indicatedAirspeed > _limits.indicatedAirspeed[1]) {
            _param.indicatedAirspeed = _limits.indicatedAirspeed[1]
        }
        controlUpdate();
    };

    /**
     * Decrease the a/c speed (KIAS)
     */
    $this.decreaseSpeed = function() {
        _param.indicatedAirspeed = _param.indicatedAirspeed - _increments.indicatedAirspeed;
        if (_param.indicatedAirspeed < _limits.indicatedAirspeed[0]) {
            _param.indicatedAirspeed = _limits.indicatedAirspeed[0]
        }
        controlUpdate();
    };

    /**
     * Calculate the True Airspeed
     */
    $this.calcTrueAirspeed = function() {
        _param.trueAirspeed = _param.indicatedAirspeed + ((_param.altitude / 1000) * 0.02) * _param.indicatedAirspeed;
    };

    /**
     * Calculate the Ground Speed
     */
    $this.calcFakeGroundSpeed = function() {
        _param.fakeGroundSpeed = Math.cos(toRadians(_param.pitch)) * _param.trueAirspeed;
    };

    /**
     * Calculate the vertical velocity
     */
    $this.calcVerticalVelocity = function() {
        // TODO for now we are going to use this
        _param.verticalVelocity = _param.pitch * 250;
    };

    /**
     * Calculate the altitude
     */
    $this.calcAltitude = function() {
        _param.altitude += (((_param.verticalVelocity / 60) * my.simulationRate) / FRAME_RATE);
        if (_param.altitude < _limits.altitude[0]) {
            _param.pitch = 0;
            _param.altitude = 0;
        }
        else if (_param.altitude > _limits.altitude[1]) {
            _param.pitch = 0;
            _param.altitude = _limits.altitude[1];
        }
    };

    /**
     * Calculate the turn rate
     */
    $this.calcTurnRate = function() {
        _param.turnRate = (1091 * Math.tan(toRadians(_param.bankAngle))) / _param.trueAirspeed;
        _param.turnRate = Math.round(_param.turnRate * 1e2) / 1e2;
        _autoTurn.halfStandardRate = (_param.trueAirspeed / 20) + 5;
        _autoTurn.standardRate = (_param.trueAirspeed / 10) + 8;
    }

    /**
     * calculate the heading
     */
    $this.calcHeading = function() {
        _param.heading += (_param.turnRate * my.simulationRate) / FRAME_RATE;
        if (_param.heading < 0 && _param.turnRate < 0) {
            _param.heading += 360;
        }
        else if (_param.heading >= 360 && _param.turnRate > 0) {
            _param.heading -= 360;
        }
    };

    $this.calcPosition = function() {
        // convert the headings to radians for sin/cos calc
        var hdgRadians = toRadians(_param.heading);
        var windRadians = toRadians(my.scene.wind.direction - 180);
        // calculate the X delta
        var planeX = Math.round((Math.sin(hdgRadians) * (_param.fakeGroundSpeed / 3600)) * 1e3) / 1e3;
        var windX = Math.round((Math.sin(windRadians) * (my.scene.wind.velocity / 3600)) * 1e3) / 1e3;
        $this.pos.x += ((planeX + windX) * my.simulationRate) / FRAME_RATE;
        // calculate the Y delta
        var planeY = Math.round((Math.cos(hdgRadians) * (_param.fakeGroundSpeed / 3600)) * 1e3) / 1e3;
        var windY = Math.round((Math.cos(windRadians) * (my.scene.wind.velocity / 3600)) * 1e3) / 1e3;
        $this.pos.y += ((planeY + windY) * my.simulationRate) / FRAME_RATE;
    };

    /**
     * Log one position
     */
    $this.logPosition = function() {
        $this.positions.push([$this.pos.x, $this.pos.y]);
        $this.onPositionUpdate([$this.pos.x, $this.pos.y]);
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
        _param.bankAngle = bank;
        _param.pitch = pitch;
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
        $this.pos.x = beaconPosition.x + (Math.cos(toRadians(newBeaconLocation.radial - 90)) * newBeaconLocation.distance);
        $this.pos.y = beaconPosition.y - (Math.sin(toRadians(newBeaconLocation.radial - 90)) * newBeaconLocation.distance);
        _param.heading = newBeaconLocation.heading;
        newBeaconLocation = {radial: undefined, distance: undefined, heading:undefined};
    }

    function autoTurn() {
        var diff = calcHeadingDiff(_param.heading, _autoTurn.targetHeading);
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
        if (_param.bankAngle < _autoTurn.targetBankAngle) {
            $this.rollRight();
        } else if (_param.bankAngle > _autoTurn.targetBankAngle) {
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