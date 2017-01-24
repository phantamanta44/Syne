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
        var i, l = d.length;
        var o = new Float32Array(l);
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
        updateBars();
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
        color: "#FFF",
        circle: false,
        useCurve: false,
        outline: true,
        window: DSP.COSINE
    };

    const can = document.getElementById("vis");
    const vis = can.getContext("2d");
    const yVal = new Float32Array(Config.bars);
    const windowFunc = new WindowFunction(Config.window, 1);

    function updateBars() {
        let buf = new Uint8Array(1024);
        let fft = new FFT(buf.length, ac.sampleRate);
        aNode.getByteTimeDomainData(buf);
        buf = detrend(windowFunc.process(toFloats(buf)));
        fft.forward(buf);
        let data = fft.spectrum.subarray(1, fft.spectrum.length / 3 + 1);
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
        vis.clearRect(0, 0, can.width, can.height);
        if (!Config.circle) {
            let barWidth = can.width / Config.bars;
            let hueWidth = 360 / Config.bars;
            let barWindowDelta = 6 / Config.bars;
            for (let i = 0; i < Config.bars; i++) {
                vis.fillStyle = "hsl(" + Math.floor(hueWidth * i) + ", 100%, 32%)";
                let height = Math.max(yVal[i] * 500 * (1 + i * barWindowDelta), 2);
                vis.fillRect(i * barWidth + 0.5, can.height / 2 - height / 2 + 0.5, barWidth, height);
            }
        } else {
            // TODO Circle Config
        }
        window.setTimeout(updateBars, 0);
    }

    prepareAudioNodes();
    loadSound("test.mp3");

});