var Thread = require('thread');
var Recorder = require('recorderjs');

window.AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();

var request = new XMLHttpRequest();
request.open('GET', 'sample.mp3', true);
request.responseType = 'arraybuffer';

request.onload = function() {
  context.decodeAudioData(request.response, function(buffer) {
    var source = 'asdf';
    var cfg = {};
    var source = context.createBufferSource();
    source.buffer = buffer;
    var recorder = new Recorder(source, cfg);
    recorder.record();
    source.connect(context.destination);
    source.start();
    setTimeout(function() {
      source.stop();
      recorder.stop();
      recorder.getBuffer();
      
    }, 1000);

  }, function() {});
}
request.send();

