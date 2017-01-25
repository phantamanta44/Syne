"use strict";
$(document).ready(function() {

    if (!window.AudioContext) {
        if (!window.webkitAudioContext) {
            alert("Your browser does not support the HTML5 AudioContext!");
            return;
        }
        window.AudioContext = window.webkitAudioContext;
    }

    function toFloats(d) {
        let i, l = d.length;
        let o = new Float32Array(l);
        for (i = 0; i < l; i++)
            o[i] = (d[i] - 128) / 128.0;
        return o;
    }

    function detrend(bins) {
        let avg = 0;
        for (let i = 0; i < bins.length; i++)
            avg += bins[i];
        avg = avg / bins.length;
        for (let i = 0; i < bins.length; i++)
            bins[i] = bins[i] - avg;
        return bins;
    }

    let ac, srcNode, aNode;

    function prepareAudioNodes() {
        ac = new AudioContext();
        srcNode = ac.createBufferSource();
        aNode = ac.createAnalyser();
        aNode.fftSize = 1024;
        //sNode = ac.createScriptProcessor(2048, 1, 1);
        /*sNode.onaudioprocess = function(e) {

        };*/
        srcNode.connect(aNode);
        aNode.connect(ac.destination);
    }

    function playSound(buffer) {
        srcNode.buffer = buffer;
        srcNode.start(0);
        initVisualizer();
    }

    function loadSound(url) {
        let req = new XMLHttpRequest();
        req.open("GET", url, true);
        req.responseType = "arraybuffer";
        req.onload = function() {
            ac.decodeAudioData(req.response, function(buffer) {
                playSound(buffer);
            });
        };
        req.send();
    }

    const Config = {
        bars: 80,
        barMin: 2,
        color: "#FFF",
        rainbow: true,
        circle: false,
        radius: 100,
        curve: false,
        lineWidth: 2,
        window: DSP.COSINE
    };

    let q = {};
    if (!!document.location.search) {
        let parts = document.location.search.substring(1).split("&");
        for (let i = 0; i < parts.length; i++) {
            let eq = parts[i].indexOf("=");
            q[parts[i].substring(0, eq).toLowerCase()] = parts[i].substring(eq + 1);
        }
    }
    Config.bars = "bars" in q ? parseInt(q["bars"], 10) : Config.bars;
    Config.barMin = "barmin" in q ? parseInt(q["barmin"], 10) : Config.barMin;
    Config.color = "color" in q ? "#" + q["color"] : Config.color;
    Config.rainbow = "rainbow" in q ? q["rainbow"] == "true" : Config.rainbow;
    Config.circle = "circle" in q ? q["circle"] == "true" : Config.circle;
    Config.radius = "radius" in q ? parseInt(q["radius"], 10) : Config.radius;
    Config.curve = "curve" in q ? q["curve"] == "true" : Config.curve;
    Config.lineWidth = "lineWidth" in q ? parseInt(q["lineWidth"], 10) : Config.lineWidth;

    const can = document.getElementById("vis");
    const vis = can.getContext("2d");
    const yVal = new Float32Array(Config.bars);
    const windowFunc = new WindowFunction(Config.window, 1);
    const twoPi = Math.PI * 2;
    const circ = Config.radius * twoPi;
    let barWidth, hueWidth, barWindowDelta, hBarWidth, deltaAngle, points;

    function initVisualizer() {
        if (Config.rainbow)
            hueWidth = 360 / Config.bars;
        if (!Config.circle) {
            barWindowDelta = 6 / Config.bars;
        } else {
            barWidth = circ / Config.bars;
            hBarWidth = barWidth / 2;
            barWindowDelta = 12 / Config.bars;
            deltaAngle = twoPi / Config.bars;
        }
        if (Config.curve)
            points = new Array(Config.bars);
        updateBars();
    }

    function updateBars() {
        let buf = new Uint8Array(1024);
        let fft = new FFT(buf.length, ac.sampleRate);
        aNode.getByteTimeDomainData(buf);
        buf = detrend(windowFunc.process(toFloats(buf)));
        fft.forward(buf);
        let data = fft.spectrum.subarray(1, Math.floor(fft.spectrum.length / 3 + 1));
        let secL = Math.floor(data.length / Config.bars);
        for (let i = 0; i < Config.bars; i++) {
            let avg = 0;
            for (let j = secL * i; j < secL * (i + 1); j++)
                avg += data[j];
            avg /= secL;
            if (avg > yVal[i])
                yVal[i] = avg;
            else
                yVal[i] *= 0.94;
        }
        can.width = window.innerWidth;
        can.height = window.innerHeight;
        let hcw = can.width / 2;
        let hch = can.height / 2;
        if (!Config.circle) {
            vis.clearRect(0, 0, can.width, can.height);
            barWidth = can.width / (Config.bars - 2);
            if (Config.curve) {
                vis.beginPath();
                vis.moveTo(0.5, hch - yVal[0] * 500 + 0.5);
                vis.lineWidth = Config.lineWidth;
                let i;
                for (let i = 0; i < Config.bars; i++) {
                    let height = yVal[i] * 500 * (1 + i * barWindowDelta);
                    points[i] = {
                        x: i * barWidth + 0.5,
                        y: hch - height + 0.5
                    };
                }
                for (i = 1; i < points.length - 2; i++) {
                    let xC = (points[i].x + points[i + 1].x) / 2;
                    let yC = (points[i].y + points[i + 1].y) / 2;
                    vis.quadraticCurveTo(points[i].x, points[i].y, xC, yC);
                }
                vis.quadraticCurveTo(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
                vis.strokeStyle = Config.color;
                vis.stroke();
            } else {
                vis.fillStyle = Config.color;
                for (let i = 0; i < Config.bars; i++) {
                    if (Config.rainbow)
                        vis.fillStyle = "hsl(" + Math.floor(hueWidth * i) + ", 100%, 32%)";
                    let height = Math.max(yVal[i] * 500 * (1 + i * barWindowDelta), Config.barMin);
                    vis.fillRect(i * barWidth + 0.5, hch - height / 2 + 0.5, barWidth, height);
                }
            }
        } else {
            vis.clearRect(-hcw, -hch, can.width, can.height);
            vis.translate(hcw, hch);
            if (Config.curve) {
                let i;
                for (i = 0; i < Config.bars; i++) {
                    let height = yVal[i] * 150 * (1 + i * barWindowDelta);
                    let newRad = Config.radius + height;
                    points[i] = {
                        x: newRad * Math.sin(deltaAngle * i),
                        y: newRad * -Math.cos(deltaAngle * i)
                    };
                }
                vis.beginPath();
                vis.moveTo(points[0].x, points[0].y);
                vis.lineWidth = Config.lineWidth;
                for (i = 1; i < points.length - 1; i++) {
                    let xC = (points[i].x + points[i + 1].x) / 2;
                    let yC = (points[i].y + points[i + 1].y) / 2;
                    vis.quadraticCurveTo(points[i].x, points[i].y, xC, yC);
                }
                vis.quadraticCurveTo(points[i].x, points[i].y, points[0].x, points[0].y);
                vis.strokeStyle = Config.color;
                vis.stroke();
            } else {
                vis.fillStyle = Config.color;
                for (let i = 0; i < Config.bars; i++) {
                    if (Config.rainbow)
                        vis.fillStyle = "hsl(" + Math.floor(hueWidth * i) + ", 100%, 32%)";
                    let height = Math.max(yVal[i] * 150 * (1 + i * barWindowDelta), Config.barMin);
                    vis.fillRect(-hBarWidth + 0.5, -Config.radius - height + 0.5, barWidth, height);
                    vis.rotate(deltaAngle);
                }
            }
        }
        window.setTimeout(updateBars, 0);
    }

    prepareAudioNodes();
    loadSound(q.url || "test.mp3");

});