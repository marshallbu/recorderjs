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
      recorder.getBuffer(function( buffer ) {
        var source = context.createBufferSource();
        source.buffer = buffer;
        var offlineContext = new OfflineAudioContext(1, buffer.length, 44100);
        var newSource = offlineContext.createBufferSource();
        newSource.buffer = buffer;
        var newRecorder = new Recorder( newSource, {
          context: offlineContext
        });
        offlineContext.oncomplete = function() {
          newRecorder.getBlob(function( blob ) {
            console.log(blob);
            /*
            console.log('starting post');
            var fd = new FormData();
            fd.append('fname', 'asdf.wav');
            fd.append('data', blob);
            $.ajax({
              type: "POST",
              url: "upload",
              data: fd,
              processData: false,
              contentType: false
            }).done(function(data) {
              console.log(data);
            });
            */
          });
          /*
          newRecorder.getBuffer(function( buffer ) {
            var context = new AudioContext();
            var source = context.createBufferSource();
            source.buffer = buffer;
            source.connect(context.destination);
            source.start();
          });
          */
        };
        newRecorder.record();
        newSource.start(0);
        offlineContext.startRendering();

        /*
        recorder.getBlob(function(blob) {
          console.log('got blob', blob);
        });
        */
        /*
        source.connect(context.destination);
        source.start();
        */

      });
    }, 1000);

  }, function() {});
}
request.send();

