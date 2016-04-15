function HSI() {
    var $this = this;

    var canvas = $('#canvas-hsi'),
        $courseBox = $('.control-group.hsi-course .value'),
        $bugBox = $('.control-group.hsi-bug .value');
    var size = canvas.width();

    canvas.attr({
        width: size,
        height: size
    });
    var ctx = canvas.get(0).getContext('2d');

    var heading = 0, course = 0, bug = 0, ready = false;
    var beacon, plane;
    var beaconToPlane = {distance: 0, speed: 0, bearing: 90};
    var deviation = 0;

    function scale(x) {
        return (x / 400) * size;
    }

    $this.updateHeading = function(x) {
        heading = x;
    }

    $this.updatePlane = function(p) {
        plane = p;
    }

    $this.updateBeacon = function(b) {
        beacon = b;
    }

    $this.timerTick = function() {
        calcBeaconToPlane(FRAME_RATE);
        calcDeviation();
    }

    var images = {
        outer: new Image(),
        bearing: new Image(),
        compass: new Image(),
        plane: new Image(),
        to: new Image(),
        from: new Image(),
        course: new Image(),
        cdi: new Image(),
        bug: new Image(),
    };

    images.outer.onload = function() {
        images.bearing.src = 'images/hsi-bearingpointer.svg';
    }
    images.bearing.onload = function() {
        images.compass.src = 'images/hsi-compass.svg';
    }
    images.compass.onload = function() {
        images.plane.src = 'images/hsi-plane.svg';
    }
    images.plane.onload = function() {
        images.to.src = 'images/hsi-to.svg';
    }
    images.to.onload = function() {
        images.from.src = 'images/hsi-from.svg';
    }
    images.from.onload = function() {
        images.course.src = 'images/hsi-course.svg';
    }
    images.course.onload = function() {
        images.cdi.src = 'images/hsi-cdi.svg';
    }
    images.cdi.onload = function() {
        images.bug.src = 'images/hsi-headingbug.svg';
    }
    images.bug.onload = function() {
        ready = true;
        $this.draw();
    }
    images.outer.src = 'images/hsi-outer.svg';

    $this.draw = function() {
        if (ready) {
            drawRotatedImage(images.outer, 200, 200, 0);
            drawRotatedImage(images.bearing, 200, 200, -heading + beaconToPlane.bearing + 180);
            drawRotatedImage(images.compass, 200, 200, -heading);
            drawRotatedImage(images.plane, 200, 200, 0);
            if (beaconToPlane.bearing > 90 && beaconToPlane.bearing < 270) {
                drawRotatedImage(images.to, 200, 200, -heading + course);
            } else if(beaconToPlane.bearing < 90 || beaconToPlane.bearing > 270) {
                drawRotatedImage(images.from, 200, 200, -heading + course);
            }
            drawRotatedImage(images.course, 200, 200, -heading + course);
            drawRotatedImage(images.cdi, 200 - (deviation * 9), 200, -heading + course);
            drawRotatedImage(images.bug, 200, 200, -heading + bug);
        }
    }

    function drawRotatedImage(img, x, y, angle) {
        ctx.save();
        ctx.translate(size/2, size/2);
        ctx.rotate(toRadians(angle));
        ctx.drawImage(img, -scale(x), -scale(y), scale(img.width), scale(img.height));
        ctx.restore();
    }

    function calcBeaconToPlane() {
        if (plane != undefined && beacon != undefined) {
            var x = plane.posX - beacon.pos.x,
                y = plane.posY - beacon.pos.y,
                d = beacon.pos.x <= plane.posX ? 90 : 270;
            beaconToPlane.bearing = -toDegrees(Math.atan(y / x)) + d;
            var distance = Math.sqrt(Math.pow(x,2) + Math.pow(y,2) + Math.pow(plane.altitude * 0.0001645,2));
            beaconToPlane.speed = Math.abs(beaconToPlane.distance - distance) * 3600 * FRAME_RATE;
            beaconToPlane.distance = distance;
        }
    }

    $this.getBeaconToPlaneDistance = function() {
        return beaconToPlane.distance;
    }

    $this.getBeaconToPlaneSpeed = function() {
        return beaconToPlane.speed;
    }

    function calcDeviation() {
        deviation = calcHeadingDiff(beaconToPlane.bearing, course);
        if (deviation > 90) {
            deviation = 180 - deviation;
        } else if (deviation < -90) {
            deviation = -(180 + deviation);
        }
        deviation = Math.min(Math.max(deviation, -12), 12);
    }

    $this.adjustCourse = function(c) {
        if (c === true) {
            course++;
        } else if (c === false) {
            course--;
        } else {
            course = c;
        }
        if (course >= 360) {
            course = 0;
        }
        else if (course < 0) {
            course = 359;
        }
        $courseBox.val(pad(3, course));
    }

    $this.onFocusCourse = function() {
        $courseBox.val('');
        $courseBox.on('keyup', function() {
            if (!isNumber($courseBox.val())) {
                $courseBox.blur();
            } else if ($courseBox.val().length == 3) {
                if (isNumber($courseBox.val())) {
                    $this.adjustCourse($courseBox.val() % 360);
                }
                $courseBox.blur();
            }
        });
    }

    $this.onBlurCourse = function() {
        $courseBox.off('keyup');
        $courseBox.val(pad(3, course));
    }

    $this.adjustHeadingBug = function(h) {
        if (h === true) {
            bug++;
        } else if (h === false) {
            bug--;
        } else {
            bug = h;
        }
        if (bug >= 360) {
            bug = 0;
        }
        else if (bug < 0) {
            bug = 359;
        }
        $bugBox.val(pad(3, bug));
        $this.onHeadingBugAdjust(bug);
    }

    $this.onFocusHeadingBug = function() {
        $bugBox.val('');
        $bugBox.on('keyup', function() {
            if (!isNumber($bugBox.val())) {
                $bugBox.blur();
            } else if ($bugBox.val().length == 3) {
                if (isNumber($bugBox.val())) {
                    $this.adjustHeadingBug($bugBox.val() % 360);
                }
                $bugBox.blur();
            }
        });
    }

    $this.getHeadingBug = function() {
        return bug;
    }

    $this.onBlurHeadingBug = function() {
        $bugBox.off('keyup');
        $bugBox.val(pad(3, bug));
    }

    // callback
    $this.onHeadingBugAdjust = function(hdg) {}

    $this.draw();
    $this.adjustCourse(0);
    $this.adjustHeadingBug(0);
}