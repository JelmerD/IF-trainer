function HSI() {
    var $this = this;

    var size = 400;

    var canvas = $('#hsi'),
        $courseBox = $('#controls .hsi-course .value'),
        $bugBox = $('#controls .hsi-bug .value');

    canvas.attr({
        width: size,
        height: size
    });
    var ctx = canvas.get(0).getContext('2d');

    var heading = 0, course = 0, bug = 0, ready = false;
    var beacon, plane;
    var beaconToPlaneBearing = 90;
    var deviation = 0;

    function scale(x) {
        return (x / 400) * size;
    }

    $this.updateHeading = function(x) {
        heading = x;
    }

    $this.updatePlane = function(p) {
        plane = p;
        calcBeaconToPlaneBearing();
        calcDeviation();
    }

    $this.updateBeacon = function(b) {
        beacon = b;
        calcBeaconToPlaneBearing();
        calcDeviation();
    }

    var images = {
        outer: new Image(),
        bearing: new Image(),
        compass: new Image(),
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
            drawRotatedImage(images.bearing, 200, 200, -heading + beaconToPlaneBearing + 180);
            drawRotatedImage(images.compass, 200, 200, -heading);
            drawRotatedImage(images.course, 200, 200, -heading + course);
            drawRotatedImage(images.cdi, 200 + (deviation * 9), 200, -heading + course);
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

    function calcBeaconToPlaneBearing() {
        if (plane != undefined && beacon != undefined) {
            var x = plane.posX - beacon.pos.x,
                y = plane.posY - beacon.pos.y,
                d = beacon.pos.x <= plane.posX ? 90 : 270;
            beaconToPlaneBearing = -toDegrees(Math.atan(y / x)) + d;
        }
    }

    function calcDeviation() {
        deviation = beaconToPlaneBearing - course;
        if (deviation <= -180) {
            deviation += 360;
        }
        if (deviation > 90) {
            deviation = 180 - deviation;
        } else if (deviation < -90) {
            deviation = -(180 + deviation);
        }
        if (deviation < -12) {
            deviation = -12;
        }
        else if (deviation > 12) {
            deviation = 12;
        }
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
            if ($courseBox.val().length == 3) {
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
    }

    $this.onFocusHeadingBug = function() {
        $bugBox.val('');
        $bugBox.on('keyup', function() {
            if ($bugBox.val().length == 3) {
                if (isNumber($bugBox.val())) {
                    $this.adjustHeadingBug($bugBox.val() % 360);
                }
                $bugBox.blur();
            }
        });
    }

    $this.onBlurHeadingBug = function() {
        $bugBox.off('keyup');
        $bugBox.val(pad(3, bug));
    }

    $this.draw();
    $this.adjustCourse(0);
    $this.adjustHeadingBug(0);
}