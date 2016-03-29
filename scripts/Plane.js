function Plane(lat, lon) {
    var $this = this;
    var _pos = coordinateToNauticalMile(lat, lon);

    // control
    $this.indicatedAirspeed = 180;  //kias
    $this.pitch = 0;                //degrees
    $this.bankAngle = 0;            //degrees

    // performance
    $this.trueAirspeed = 0;         //kts
    $this.fakeGroundSpeed = 0;      //kts
    $this.verticalVelocity = 0;     //feet/min
    $this.altitude = 1000;          //feet
    $this.turnRate = 0;             //deg/sec
    $this.heading = 0;              //degrees
    $this.trueTrack = 0;            //degrees
    $this.groundSpeed = 0;
    $this.posX = _pos.x;                 //nautical mile
    $this.posY = _pos.y;                 //nautical mile

    // wind (we need that here for calculations)
    $this.windVelocity = 0;         //kts
    $this.windDirection = 0;        //where it is blowing TO

    // increments used for control inputs
    $this.increments = {
        pitch: 1,
        bankAngle: 1,
        indicatedAirspeed: 5,
    }

    // certain limits for the aircraft
    $this.limits = {
        pitch: [-15, 20],
        bankAngle: [-45, 45],
        indicatedAirspeed: [60, 260],
        altitude: [0, 25000]
    }

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
    }

    /**
     * Roll the a/c to the left
     */
    $this.rollLeft = function() {
        $this.bankAngle = $this.bankAngle - $this.increments.bankAngle;
        if ($this.bankAngle < $this.limits.bankAngle[0]) {
            $this.bankAngle = $this.limits.bankAngle[0]
        }
    }

    /**
     * Pitch the a/c up
     */
    $this.pitchUp = function() {
        $this.pitch = $this.pitch + $this.increments.pitch;
        if ($this.pitch > $this.limits.pitch[1]) {
            $this.pitch = $this.limits.pitch[1]
        }
    }

    /**
     * Pitch the a/c down
     */
    $this.pitchDown = function() {
        $this.pitch = $this.pitch - $this.increments.pitch;
        if ($this.pitch < $this.limits.pitch[0]) {
            $this.pitch = $this.limits.pitch[0]
        }
    }

    /**
     * Increase the a/c speed (KIAS)
     */
    $this.increaseSpeed = function() {
        $this.indicatedAirspeed = $this.indicatedAirspeed + $this.increments.indicatedAirspeed;
        if ($this.indicatedAirspeed > $this.limits.indicatedAirspeed[1]) {
            $this.indicatedAirspeed = $this.limits.indicatedAirspeed[1]
        }
    }

    /**
     * Decrease the a/c speed (KIAS)
     */
    $this.decreaseSpeed = function() {
        $this.indicatedAirspeed = $this.indicatedAirspeed - $this.increments.indicatedAirspeed;
        if ($this.indicatedAirspeed < $this.limits.indicatedAirspeed[0]) {
            $this.indicatedAirspeed = $this.limits.indicatedAirspeed[0]
        }
    }

    /**
     * Calculate the True Airspeed
     */
    $this.calcTrueAirspeed = function() {
        $this.trueAirspeed = $this.indicatedAirspeed + (($this.altitude / 1000) * 0.02) * $this.indicatedAirspeed;
    }

    /**
     * Calculate the Ground Speed
     */
    $this.calcFakeGroundSpeed = function() {
        $this.fakeGroundSpeed = Math.cos(toRadians($this.pitch)) * $this.trueAirspeed;
    }

    /**
     * Calculate the vertical velocity
     */
    $this.calcVerticalVelocity = function() {
        // TODO for now we are going to use this
        $this.verticalVelocity = $this.pitch * 250;
    }

    /**
     * Calculate the altitude
     *
     * @param fps
     */
    $this.calcAltitude = function(fps) {
        $this.altitude = $this.altitude + (($this.verticalVelocity / 60) / fps);
        if ($this.altitude < $this.limits.altitude[0]) {
            $this.pitch = 0;
            $this.altitude = 0;
        }
        else if ($this.altitude > $this.limits.altitude[1]) {
            $this.pitch = 0;
            $this.altitude = $this.limits.altitude[1];
        }
    }

    /**
     * Calculate the turn rate
     */
    $this.calcTurnRate = function() {
        $this.turnRate = (1091 * Math.tan(toRadians($this.bankAngle))) / $this.trueAirspeed;
        $this.turnRate = Math.round($this.turnRate * 1e2) / 1e2
    }

    /**
     * calculate the heading
     *
     * @param fps
     */
    $this.calcHeading = function(fps) {
        $this.heading += $this.turnRate / fps;
        if ($this.heading < 0 && $this.turnRate < 0) {
            $this.heading += 360;
        }
        else if ($this.heading >= 360 && $this.turnRate > 0) {
            $this.heading -= 360;
        }
        //$this.hdg = Math.round($this.hdg * 1e2) / 1e2;
    }

    $this.calcPosition = function(fps) {
        // convert the headings to radians for sin/cos calc
        var hdgRadians = toRadians($this.heading);
        var windRadians = toRadians($this.windDirection);
        // calculate the X delta
        var planeX = Math.round((Math.sin(hdgRadians) * ($this.fakeGroundSpeed / 3600)) * 1e3) / 1e3;
        var windX = Math.round((Math.sin(windRadians) * ($this.windVelocity / 3600)) * 1e3) / 1e3;
        $this.posX += (planeX + windX) / fps;
        // calculate the Y delta
        var planeY = Math.round((Math.cos(hdgRadians) * ($this.fakeGroundSpeed / 3600)) * 1e3) / 1e3;
        var windY = Math.round((Math.cos(windRadians) * ($this.windVelocity / 3600)) * 1e3) / 1e3;
        $this.posY += (planeY + windY) / fps;
    }

    /**
     * Log one position
     */
    $this.logPosition = function() {
        $this.positions.push([$this.posX, $this.posY]);
        $this.onPositionUpdate([$this.posX, $this.posY]);
    }

    var frame = 0;
    /**
     * This function is called from the timer, and is used to update the plane
     *
     * @param timer
     */
    $this.timerTick = function(timer) {
        frame++;
        $this.calcAltitude(timer.fps);
        $this.calcTrueAirspeed();
        $this.calcFakeGroundSpeed();
        $this.calcHeading(timer.fps);
        $this.calcPosition(timer.fps);

        frame = frame % timer.fps;
        if (frame == 0) {
            $this.logPosition();
        }
    }

    // callbacks
    $this.onKeyPressed = function(keyCode) {};
    $this.onPositionUpdate = function(position) {};

    /**
     * Set all the event listeners
     */
    $this.setKeys = function() {
        $(document).on('keydown', function(e) {
            switch(e.keyCode) {
                case 37:
                    $this.rollLeft(); break;
                case 38:
                    $this.pitchDown(); break;
                case 39:
                    $this.rollRight(); break;
                case 40:
                    $this.pitchUp(); break;
                case 107:
                case 187:
                    $this.increaseSpeed(); break;
                case 109:
                case 189:
                    $this.decreaseSpeed(); break;
            }

            $this.calcVerticalVelocity();
            $this.calcTurnRate();
            $this.onKeyPressed(e.keyCode);
        });
    }

    // the plane is initiated, call the setKeys method
    $this.setKeys();
    $this.logPosition();
}