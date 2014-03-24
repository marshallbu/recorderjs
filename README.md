# Recorder.js component

This is little more than a port of [Matt Diamond's](https://github.com/mattdiamond/Recorderjs) excellent web worker-solution to the challenge of processing audio data in the browser.

##Usage

```javascript
var recorder = new Recorder( mediaStreamSource, audioContext );
this.recorder.record();

// Now play sound into the mediaStreamSource
this.on('finished', function() {
  this.recorder.stop();
  this.recorder.getBuffer( function( buffer ) {
    // buffer is an audioBuffer
    var source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect( audioContext.destination );
    // Listen to your recording
    source.start();
  });
}, this);
```


