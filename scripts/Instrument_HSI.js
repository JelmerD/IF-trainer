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
    var toFrom = 0;

    function scale(x) {
        return (x / 400) * size;
    }

    $this.updateHeading = function (x) {
        heading = x;
    }

    $this.updatePlane = function (p) {
        plane = p;
    }

    $this.updateBeacon = function (b) {
        beacon = b;
    }

    $this.timerTick = function () {
        calcBeaconToPlane(FRAME_RATE);
        calcDeviation();
        calcToFrom();
    }

    var images = {
        outer: {
            src: 'images/hsi-outer.svg?v=1',
        },
        bearing: {
            src: 'images/hsi-bearingpointer.svg?v=1',
        },
        compass: {
            src: 'images/hsi-compass.svg?v=1',
        },
        plane: {
            src: 'images/hsi-plane.svg?v=1',
        },
        to: {
            src: 'images/hsi-to.svg?v=1',
        },
        from: {
            src: 'images/hsi-from.svg?v=1',
        },
        course: {
            src: 'images/hsi-course.svg?v=1',
        },
        cdi: {
            src: 'images/hsi-cdi.svg?v=1',
        },
        bug: {
            src: 'images/hsi-headingbug.svg?v=1',
        },
    };

    var _imageKeys = Object.keys(images);
    for (var i = 0; i < _imageKeys.length; i++) {
        (function (j) {
            images[_imageKeys[j]].img = new Image();
            images[_imageKeys[j]].img.onload = function () {
                if (j + 1 < _imageKeys.length) {
                    images[_imageKeys[j + 1]].img.src = images[_imageKeys[j + 1]].src;
                } else {
                    ready = true;
                    $this.draw();
                }
            }
        })(i);
    }
    images[_imageKeys[0]].img.src = images[_imageKeys[0]].src;

    $this.draw = function () {
        if (ready) {
            drawRotatedImage(images.outer.img, 200, 200, 0);
            drawRotatedImage(images.bearing.img, 200, 200, -heading + beaconToPlane.bearing + 180);
            drawRotatedImage(images.compass.img, 200, 200, -heading);
            drawRotatedImage(images.plane.img, 200, 200, 0);
            if (toFrom < 90 || toFrom > 270) {
                drawRotatedImage(images.from.img, 200, 200, -heading + course);
            } else {
                drawRotatedImage(images.to.img, 200, 200, -heading + course);
            }
            drawRotatedImage(images.course.img, 200, 200, -heading + course);
            drawRotatedImage(images.cdi.img, 200 - (deviation * 9), 200, -heading + course);
            drawRotatedImage(images.bug.img, 200, 200, -heading + bug);
        }
    }

    function drawRotatedImage(img, x, y, angle) {
        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.rotate(toRadians(angle));
        ctx.drawImage(img, -scale(x), -scale(y), scale(img.width), scale(img.height));
        ctx.restore();
    }

    function calcBeaconToPlane() {
        if (plane != undefined && beacon != undefined) {
            var x = plane.pos.x - beacon.pos.x,
                y = plane.pos.y - beacon.pos.y,
                d = beacon.pos.x <= plane.pos.x ? 90 : 270;
            beaconToPlane.bearing = -toDegrees(Math.atan(y / x)) + d;
            var distance = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(plane.param('altitude') * 0.0001645, 2));
            beaconToPlane.speed = (Math.abs(beaconToPlane.distance - distance) * 3600 * FRAME_RATE) / my.simulationRate;
            beaconToPlane.distance = distance;
        }
    }

    $this.getBeaconToPlaneDistance = function () {
        return beaconToPlane.distance;
    }

    $this.getBeaconToPlaneSpeed = function () {
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

    function calcToFrom() {
        toFrom = Math.abs(course - beaconToPlane.bearing)
    }

    $this.adjustCourse = function (c) {
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
        if (my.map) {
            my.map.redraw();
        }
    }

    $this.onFocusCourse = function () {
        $courseBox.val('');
        $courseBox.on('keyup', function () {
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

    $this.onBlurCourse = function () {
        $courseBox.off('keyup');
        $courseBox.val(pad(3, course));
    }

    $this.getCourse = function() {
        return course;
    }

    $this.adjustHeadingBug = function (h) {
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

    $this.onFocusHeadingBug = function () {
        $bugBox.val('');
        $bugBox.on('keyup', function () {
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

    $this.getHeadingBug = function () {
        return bug;
    }

    $this.onBlurHeadingBug = function () {
        $bugBox.off('keyup');
        $bugBox.val(pad(3, bug));
    }

    // callback
    $this.onHeadingBugAdjust = function (hdg) {
    }

    $this.draw();
    $this.adjustCourse(0);
    $this.adjustHeadingBug(0);
}