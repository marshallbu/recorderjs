# Recorder.js component

This is little more than a port of [Matt Diamond's](https://github.com/mattdiamond/Recorderjs) excellent work to a component-friendly format.

Such a port was necessary because Matt's version has the worker code in a separate file (presumably served statically), while components are meant to be built into a single file. My [thread](https://github.com/itsjoesullivan/thread) component lightly wraps workers in a way that makes writing worker code in-line palatable.

I expect this codebase to diverge from Matt's, but credit for the worker idea and the WAV algorithm should remain solely his.

##Usage

```javascript
var Recorder = require('itsjoesullivan/recorderjs');
this.recorder = new Recorder( mediaStreamSource, audioContext );
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


