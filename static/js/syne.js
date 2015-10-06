$(document).ready(function() {
    
    if (!window.AudioContext) {
        if (!window.webkitAudioContext) {
            alert('Your browser does not support the HTML5 AudioContext!')
            return;
        }
        window.AudioContext = window.webkitAudioContext;
    }
    
    var doc = $(document);
    var w = doc.width();
    var h = doc.height();
    var svg = Raphael(document.getElementById('player'), w, h);
    
    var ac, srcNode, aa, sNode;
    
    var prepareAudioNodes = function() {
        ac = new AudioContext();
        srcNode = ac.createBufferSource();
        srcNode.connect(ac.destination);
        
        aa = ac.createAnalyser();
        aa.smoothingTimeConstant = 0.6;
        aa.fftSize = 512;
        
        sNode = ac.createScriptProcessor(2048, 1, 1);
        sNode.connect(ac.destination);
        sNode.onaudioprocess = function(e) {
            yVal = [];
            var data = new Uint8Array(aa.frequencyBinCount);
            aa.getByteFrequencyData(data);
            
            var secL = Math.floor(data.length / Config.bars);
            for (var i = 0; i < Config.bars; i++) {
                var avg = 0;
                for (var j = secL * i; j < secL * (i + 1); j++)
                    avg += data[j];
                avg /= secL;
                yVal[i] = avg;
            }
            updateBars();
        }
        
        srcNode.connect(aa);
        aa.connect(sNode);
    };
    
    var playSound = function(buffer) {
        srcNode.buffer = buffer;
        srcNode.start(0);
    }
    
    var loadSound = function(url) {
        var req = new XMLHttpRequest();
        req.open('GET', url, true);
        req.responseType = 'arraybuffer';
        req.onload = function() {
            ac.decodeAudioData(req.response, function(buffer) {
                playSound(buffer);
            });
        };
        req.send();
    }
    
    var Config = {
        bars: 80,
        color: '#FFF',
        circle: false,
        useCurve: false,
        outline: true
    };
    
    var yVal = [];
    var rects = [];
    
    var heavyUpdateBars = function() {
        rects = [];
        svg.clear();
        if (!Config.circle) {
            var barL = w / (Config.bars * 2 + 1);
            for (var i = 0; i < Config.bars; i++) {
                rects[i] = svg.rect((i + 0.5) * (barL * 2), h / 2, barL, 0.1)
                rects[i].attr({fill: Config.color, stroke: 'none'});
            }
        }
        else {
            // TODO Circle Config
        }
    };
    
    var updateBars = function() {
        if (!Config.circle) {
            for (var i = 0; i < rects.length; i++) {
                var barH = Math.max(yVal[i] * 0.75, 0.1);
                rects[i].transform('t0,-' + (barH * 0.5));
                rects[i].attr('height', barH);
            }
        }
        else {
            // TODO Circle Config
        }
    }
    
    doc.resize(function() {
       w = doc.width();
       h = doc.height();
       heavyUpdateBars();
    });
    
    prepareAudioNodes();
    heavyUpdateBars();
    loadSound('kaleidoscope.ogg');
    
});