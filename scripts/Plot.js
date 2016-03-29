function Plot() {
    var $this = this;
    var canvas = $('#plot');
    var zoomIndicator = $('#controls .zoom .value');
    var isDragging = false, previousX, previousY;

    var colors = {
        track: '#f00',
        grid: '#333',
        beacon: '#777',
    }

    var width = window.innerWidth,
        height = window.innerHeight;

    var mapCoordinates = [
        {lat: [50,30], lon: [2,0]},
        {lat: [54,0], lon: [8,0]}
    ]

    // now we will calculate the map corners
    var bottomLeft = coordinateToNauticalMile(mapCoordinates[0].lat, mapCoordinates[0].lon),
        topRight = coordinateToNauticalMile(mapCoordinates[1].lat, mapCoordinates[1].lon),
        mapBorder = {
            top: topRight.y,
            right: topRight.x,
            bottom: bottomLeft.y,
            left: bottomLeft.x,
    };

    var dimensions = {
        x: mapBorder.right - mapBorder.left,
        y: mapBorder.top - mapBorder.bottom,
    }

    var zoom = 40; // Zoom level
    var zoomLimit = [1, 60];
    var viewCenter = {x: mapBorder.left + dimensions.x / 2, y: mapBorder.bottom + dimensions.y / 2}; // The center of the viewport (in nautical miles)

    // plot all of this
    var track = [];
    var beacons = {};

    canvas.attr({width: width, height: height});
    canvas.on('mousedown', onMouseDown)
        .on('mouseup', onMouseUp)
        .on('mousemove', onMouseMove)
        .on('mouseout', onMouseOut);
    var ctx = canvas.get(0).getContext('2d');
    //ctx.transform(1, 0, 0, -1, 0, height);
    ctx.translate((width/2) - x(viewCenter.x), -y(viewCenter.y) + (height / 2));
    updateZoomIndicator();

    function x(x) {
        return zoom * x;
    }

    function y(y) {
        return -zoom * y;
    }

    function scale(z) {
        return zoom * z;
    }

    $this.update = function() {

    }

    $this.redraw = function() {
        ctx.fillStyle = '#600';
        ctx.clearRect(x(viewCenter.x) - (width/2) - 1, y(viewCenter.y) - (height/2) - 1, width + 2, height + 2);
        //ctx.fillRect(x(viewCenter.x) - (width/2) + 10, y(viewCenter.y) - (height/2) + 10, width - 20, height - 20);
        drawAreaBorder();
        redrawBeacons();
        redrawTrack();
    }

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

    function drawVerticalGrid() {
        ctx.beginPath();
        var n = dimensions.x / gridLine, i = -1;
        while (++i, i < n + 1) {
            ctx.moveTo(x(mapBorder.left + (i * gridLine)), y(mapBorder.bottom));
            ctx.lineTo(x(mapBorder.left + (i * gridLine)), y(mapBorder.top));
        }
        ctx.stroke();
    }

    function drawHorizontalGrid() {
        ctx.beginPath();
        var n = dimensions.y / gridLine, i = -1;
        while (++i, i < n + 1) {
            ctx.moveTo(x(mapBorder.left), y(mapBorder.bottom + (i * gridLine)));
            ctx.lineTo(x(mapBorder.right), y(mapBorder.bottom + (i * gridLine)));
        }
        ctx.stroke();
    }

    function onMouseDown(e) {
        isDragging = true;
        previousX = e.clientX;
        previousY = e.clientY;
    }

    function onMouseUp(e) {
        isDragging = false;
    }

    function onMouseOut() {
        isDragging = false;
    }

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
     * Zoom in or out
     * First we want to reposition the view to 0,0, so that we can translate to the correct position after the zoom
     *
     * @param i
     */
    $this.zoom = function(i) {
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

    function moveToOrigin() {
        ctx.translate(-((width/2) - x(viewCenter.x)), -(-y(viewCenter.y) + (height / 2)));
    }

    /**
     * Translate to the viewCenter
     * Note: the current view must be 0,0 in order for it to work
     */
    function moveToViewCenter () {
        ctx.translate((width/2) - x(viewCenter.x), -y(viewCenter.y) + (height / 2));
    }

    $this.moveToLatLon = function(lat, lon) {
        moveToOrigin();
        viewCenter = coordinateToNauticalMile(lat, lon);
        moveToViewCenter();
        $this.redraw();
    }

    function updateZoomIndicator() {
        zoomIndicator.val(zoom);
    }

    $this.setTrack = function(positions) {
        track = positions;
    }

    $this.appendTrackPoint = function(position) {
        track.push(position);
        if (track.length > 1) {
            drawTrackPart(track[track.length - 2], track[track.length - 1]);
        }
    }

    function drawTrackPart(a, b) {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = colors.track;
        ctx.moveTo(x(a[0]), y(a[1]));
        ctx.lineTo(x(b[0]), y(b[1]));
        ctx.stroke();
    }

    function redrawTrack() {
        var n = track.length, i = 0;
        while (++i, i < n) {
            drawTrackPart(track[i-1], track[i]);
        }
    }

    $this.appendBeacon = function(beacon) {
        beacons[beacon.id] = beacon;
        redrawBeacons();
    }

    function redrawBeacons() {
        for (var i in beacons) {
            drawBeacon(beacons[i]);
        }
    }

    function drawBeacon(beacon) {
        // draw n circles, every d nM apart
        var n = 4, d = 5, i = 0;
        ctx.strokeStyle = colors.beacon;
        ctx.fillStyle = colors.beacon;
        ctx.strokeWidth = 1;
        while (++i, i <= n) {
            ctx.beginPath();
            ctx.arc(x(beacon.pos.x), y(beacon.pos.y), scale(i * d), 0, 2 * Math.PI);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(x(beacon.pos.x - (n * d)), y(beacon.pos.y));
        ctx.lineTo(x(beacon.pos.x + (n * d)), y(beacon.pos.y));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x(beacon.pos.x), y(beacon.pos.y - (n * d)));
        ctx.lineTo(x(beacon.pos.x), y(beacon.pos.y + (n * d)));
        ctx.stroke();
        ctx.font = '14px sans-serif';
        ctx.fillText(beacon.name, x(beacon.pos.x) + 5, y(beacon.pos.y) - 5);
    }
}