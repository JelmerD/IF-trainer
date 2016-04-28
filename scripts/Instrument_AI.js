function AI() {
    var $this = this;

    var canvas = $('#canvas-ai');
    var size = canvas.width();
    canvas.attr({
        width: size,
        height: size
    });
    var ctx = canvas.get(0).getContext('2d');

    var pitch = 0, bank = 0, ready = false;

    function scale(x) {
        return (x / 200) * size;
    }

    $this.updatePitch = function(x) {
        pitch = x;
    }

    $this.updateBank = function(x) {
        bank = x;
    }

    var gimbal = new Image(),
        inner = new Image(),
        outer = new Image();
    gimbal.onload = function() {
        inner.src = 'images/ai-inner.svg?v=1';
    }
    inner.onload = function() {
        outer.src = 'images/ai-outer.svg?v=1';
    }
    outer.onload = function() {
        ready = true;
        $this.draw();
    }
    gimbal.src = 'images/ai-gimbal.svg';

    $this.draw = function() {
        if (ready) {
            drawRotatedImage(gimbal, 100, 200 - pitch * 2, -bank);
            drawRotatedImage(inner, 100, 100, -bank);
            drawRotatedImage(outer, 100, 100, 0);
        }
    }

    function drawRotatedImage(img, x, y, angle) {
        ctx.save();
        ctx.translate(size/2, size/2);
        ctx.rotate(toRadians(angle));
        ctx.drawImage(img, -scale(x), -scale(y), scale(img.width), scale(img.height));
        ctx.restore();
    }

    $this.draw();
}