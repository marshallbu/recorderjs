# Recorder.js component

This is little more than a port of [Matt Diamond's](https://github.com/mattdiamond/Recorderjs) excellent work to a component-friendly format.

Such a port was necessary because Matt's version has the worker code in a separate file (presumably served statically), while components are meant to be built into a single file. My [thread](https://github.com/itsjoesullivan/thread) component lightly wraps workers in a way that makes writing worker code in-line palatable.

I expect this codebase to diverge from Matt's, but credit for the worker idea and the WAV algorithm should remain solely his.

##Usage

```javascript
var Recorder = require('itsjoesullivan/recorderjs');
var context = new AudioContext();
var source = context.createBufferSource();
source.buffer = buffer; // Imagine
var r = new Recorder( source );
r.record()
source.start();
setTimeout(function() {
  r.stop();
  source.stop();
  r.getBuffer(function( err, buffer ) {
    // buffer is PCM buffer of what you recorded
  });
  r.getWAV(function( err, blob ) {
    // blob is a wav!
  });
}, 500);
```


