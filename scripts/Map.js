function Map() {
    /**
     * Copy of the object for later ref.
     */
    var $this = this;

    // elements
    ///////////
    var $zoomIndicator = $('.control-group.zoom .value'),
        $canvas,
        ctx;

    // trackers
    ///////////
    var isDragging = false,
        previousX,
        previousY,
        visible = false;


    // plot
    ///////
    var track = [];
    var beacons = {};
    var wind = {direction: 0, velocity: 0};

    // settings
    ////////////
    var colors = {
            track: '#f00',
            grid: '#333',
            beacon: '#999',
        },
        width = window.innerWidth - $('.container.instruments').outerWidth() - $('.container.controls').outerWidth(),
        height = window.innerHeight,
        mapCoordinates = [
            {lat: [50, 30], lon: [2, 0]},
            {lat: [54, 0], lon: [8, 0]}
        ],
        zoom = 40, // Zoom level
        zoomLimit = [1, 60];

    // now we will calculate the map corners
    var bottomLeft = coordinateToNauticalMile(mapCoordinates[0].lat, mapCoordinates[0].lon),
        topRight = coordinateToNauticalMile(mapCoordinates[1].lat, mapCoordinates[1].lon),
        mapBorder = {
            top: topRight.y,
            right: topRight.x,
            bottom: bottomLeft.y,
            left: bottomLeft.x,
        },
        dimensions = {
            x: mapBorder.right - mapBorder.left,
            y: mapBorder.top - mapBorder.bottom,
        },
        viewCenter = {x: mapBorder.left + dimensions.x / 2, y: mapBorder.bottom + dimensions.y / 2}; // The center of the viewport (in nautical miles)

    updateZoomIndicator();

    /**
     * Convert an x coordinate (nm) to a pixel with the zoom level
     *
     * @param x
     * @returns {number}
     */
    function x(x) {
        return zoom * x;
    }

    /**
     * Convert a y coordinate (nm) to a pixel with the zoom level
     *
     * @param y
     * @returns {number}
     */
    function y(y) {
        return -zoom * y;
    }

    /**
     * Scale a distance to pixels
     *
     * @param z
     * @returns {number}
     */
    function scale(z) {
        return zoom * z;
    }

    /**
     * Draw the area borders on the canvas
     */
    function drawAreaBorder() {
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = colors.grid;
        ctx.moveTo(x(mapBorder.left), y(mapBorder.bottom));
        ctx.lineTo(x(mapBorder.left), y(mapBorder.top));
        ctx.lineTo(x(mapBorder.right), y(mapBorder.top));
        ctx.lineTo(x(mapBorder.right), y(mapBorder.bottom));
        ctx.lineTo(x(mapBorder.left), y(mapBorder.bottom));
        ctx.stroke();
    }

    /**
     * Draw all the beacons
     */
    function redrawBeacons() {
        for (var i in beacons) {
            drawBeacon(beacons[i]);
        }
    }

    /**
     * Draw a border
     *
     * @param beacon
     */
    function drawBeacon(beacon) {
        // draw n circles, every d nM apart
        var n = 4, d = 5, i = 0;
        ctx.strokeStyle = colors.beacon;
        ctx.fillStyle = colors.beacon;
        ctx.font = '12px sans-serif';
        ctx.strokeWidth = 1;
        while (++i, i <= n) {
            ctx.beginPath();
            ctx.arc(x(beacon.pos.x), y(beacon.pos.y), scale(i * d), 0, 2 * Math.PI);
            ctx.stroke();
            ctx.fillText((i * 5).toString(), x(beacon.pos.x) + 2, y(beacon.pos.y + (i * 5)) - 5);
        }
        ctx.beginPath();
        ctx.moveTo(x(beacon.pos.x - (n * d)), y(beacon.pos.y));
        ctx.lineTo(x(beacon.pos.x + (n * d)), y(beacon.pos.y));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x(beacon.pos.x), y(beacon.pos.y - (n * d)));
        ctx.lineTo(x(beacon.pos.x), y(beacon.pos.y + (n * d)));
        ctx.stroke();
        ctx.fillText(beacon.name, x(beacon.pos.x) + 5, y(beacon.pos.y) - 5);
    }

    /**
     * Draw the whole track
     */
    function redrawTrack() {
        var n = track.length, i = 0;
        while (++i, i < n) {
            drawTrackPart(track[i - 1], track[i]);
        }
    }

    /**
     * Draw a track part
     *
     * @param a point a
     * @param b point b
     */
    function drawTrackPart(a, b) {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = colors.track;
        ctx.moveTo(x(a[0]), y(a[1]));
        ctx.lineTo(x(b[0]), y(b[1]));
        ctx.stroke();
    }

    function drawWind() {
        if (wind.velocity != 0) {
            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#ff0';
            ctx.fillStyle = '#fff';
            var ox = x(viewCenter.x) - (width/2) + 70,
                wx = Math.sin(toRadians(-wind.direction)) * ((wind.velocity / 4) + 20),
                oy = y(viewCenter.y) - (height/2) + 70,
                wy = Math.cos(toRadians(wind.direction)) * ((wind.velocity / 4) + 20);
            ctx.moveTo(ox - wx, oy - wy);
            ctx.lineTo(ox + wx, oy + wy);
            ctx.lineTo(ox + wx + (Math.sin(toRadians(-wind.direction - 130)) * 20), oy + wy + (Math.cos(toRadians(wind.direction + 130)) * 20));
            ctx.moveTo(ox + wx, oy + wy);
            ctx.lineTo(ox + wx - (Math.sin(toRadians(wind.direction - 130)) * 20), oy + wy + (Math.cos(toRadians(-wind.direction + 130)) * 20));
            ctx.stroke();
            ctx.beginPath();
            ctx.fillText(wind.velocity + 'kts', ox - 10, oy - 50);
        }
    }

    /**
     * Event
     *
     * @param e
     */
    function onMouseDown(e) {
        isDragging = true;
        previousX = e.clientX;
        previousY = e.clientY;
    }

    /**
     * Event
     *
     * @param e
     */
    function onMouseUp(e) {
        isDragging = false;
    }

    /**
     * Event
     */
    function onMouseOut() {
        isDragging = false;
    }

    /**
     * Event
     *
     * @param e
     */
    function onMouseMove(e) {
        if (isDragging) {
            var newViewCenter = {
                x: viewCenter.x - ((e.clientX - previousX) / zoom),
                y: viewCenter.y + ((e.clientY - previousY) / zoom)
            }
            if (newViewCenter.x >= mapBorder.left && newViewCenter.x <= mapBorder.right) {
                ctx.translate(e.clientX - previousX, 0);
                viewCenter.x = newViewCenter.x;
                previousX = e.clientX;
            }
            if (newViewCenter.y >= mapBorder.bottom && newViewCenter.y <= mapBorder.top) {
                ctx.translate(0, e.clientY - previousY);
                viewCenter.y = newViewCenter.y;
                previousY = e.clientY;
            }
            $this.redraw();
        }
    }

    /**
     * Move the map to the 0,0 position, depending on the current viewCenter
     */
    function moveToOrigin() {
        ctx.translate(-((width / 2) - x(viewCenter.x)), -(-y(viewCenter.y) + (height / 2)));
    }

    /**
     * Translate to the viewCenter
     * Note: the current view must be 0,0 in order for it to work
     */
    function moveToViewCenter() {
        ctx.translate((width / 2) - x(viewCenter.x), -y(viewCenter.y) + (height / 2));
    }

    /**
     * Update the zoom indicator
     */
    function updateZoomIndicator() {
        $zoomIndicator.val(zoom);
    }

    /**
     * Show the map (initialise)
     */
    $this.show = function () {
        $canvas = $('<canvas></canvas>').attr({
            id: 'canvas-map',
            width: width,
            height: height
        });
        $('.container.map').width(width).append($canvas);
        $canvas.on('mousedown', onMouseDown)
            .on('mouseup', onMouseUp)
            .on('mousemove', onMouseMove)
            .on('mouseout', onMouseOut);
        ctx = $canvas.get(0).getContext('2d');
        //ctx.transform(1, 0, 0, -1, 0, height);
        ctx.translate((width / 2) - x(viewCenter.x), -y(viewCenter.y) + (height / 2));
        $('.control-group.zoom').show();
        visible = true;
    }

    /**
     * Redraw the whole map
     */
    $this.redraw = function () {
        ctx.fillStyle = '#600';
        ctx.clearRect(x(viewCenter.x) - (width / 2) - 1, y(viewCenter.y) - (height / 2) - 1, width + 2, height + 2);
        //ctx.fillRect(x(viewCenter.x) - (width/2) + 10, y(viewCenter.y) - (height/2) + 10, width - 20, height - 20);
        drawAreaBorder();
        redrawBeacons();
        redrawTrack();
        drawWind();
    }

    /**
     * Zoom in or out
     * First we want to reposition the view to 0,0, so that we can translate to the correct position after the zoom
     *
     * @param i
     */
    $this.zoom = function (i) {
        moveToOrigin();
        if (zoom > 10) i *= 2;
        if (zoom > 30) i *= 2;
        zoom += i;
        if (zoom < zoomLimit[0]) {
            zoom = zoomLimit[0];
        }
        else if (zoom > zoomLimit[1]) {
            zoom = zoomLimit[1];
        }
        moveToViewCenter();
        updateZoomIndicator();
        $this.redraw();
    }

    /**
     * Move the map to a certain lat/lon location
     *
     * @param lat
     * @param lon
     */
    $this.moveToLatLon = function (lat, lon) {
        moveToOrigin();
        viewCenter = coordinateToNauticalMile(lat, lon);
        moveToViewCenter();
        $this.redraw();
    }

    /**
     * Append a beacon to the beacons array
     *
     * @param beacon
     */
    $this.appendBeacon = function (beacon) {
        beacons[beacon.id] = beacon;
        redrawBeacons();
    }

    /**
     * Set the track
     *
     * @param positions
     */
    $this.setTrack = function (positions) {
        track = positions;
    }

    /**
     * Append a track coordinate
     *
     * @param position
     */
    $this.appendTrackPoint = function (position) {
        track.push(position);
        if (track.length > 1) {
            drawTrackPart(track[track.length - 2], track[track.length - 1]);
        }
    }

    /**
     * Set the wind
     *
     * @param direciton
     * @param velocity
     */
    $this.setWind = function(direction, velocity) {
        wind.direction = direction;
        wind.velocity = velocity;
        $this.redraw();
    }
}