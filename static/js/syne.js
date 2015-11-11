function preload() {
    sound = loadSound('kaleidoscope.ogg');
}

function setup() {
    cnv = createCanvas(window.windowWidth, window.windowHeight);
    sound.play();
    fft = new p5.FFT(0.64);
}

function draw() {
    background(0);
    var specData = fft.analyze();
    noStroke();
    fill(0, 255, 0);
    for (var i = 0; i < specData.length; i++) {
        var x = map(i, 0, specData.length, 0, width);
        var h = map(specData[i], 0, 255, height, 0) - height;
        rect(x, height, width / specData.length, h);
    }
}