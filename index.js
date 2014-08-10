var Thread = require('thread');

var Recorder = function(source, cfg) {
  console.log(source);
  this.config = cfg || {};
  var bufferLen = this.config.bufferLen || 4096;
  this.context = source.context;
  this.node = (this.context.createScriptProcessor ||
               this.context.createJavaScriptNode).call(this.context,
                                                       bufferLen, 2, 2);
  this.recording = false;

  // Establish thread
  this.thread = new Thread(recorderWorker);

  // init thread
  this.thread.send('init', {
    config: {
      sampleRate: this.context.sampleRate
    }
  });

  this.node.onaudioprocess = function(e) {
    if (!this.recording) return;
    this.thread.send('record', {
      buffer: [
        e.inputBuffer.getChannelData(0),
        e.inputBuffer.getChannelData(1)
      ]
    });
  }.bind(this);

  this.thread.on('buffer', function(data) {
    this.currCallback( data );
  }.bind(this) );

  this.thread.on('log', function(message) {
    //console.log(message);
  });
  this.thread.on('blob', function(blob) {
    this.currCallback( null, blob );
  }.bind(this) );

  source.connect(this.node);
  this.node.connect(this.context.destination);    //this should not be necessary

  // OfflineAudioContext means render immediately
  if ( this.context instanceof OfflineAudioContext ) {
    this.setBuffer(source.buffer);
  }

};

Recorder.prototype.record = function() {
  this.recording = true;
};

Recorder.prototype.stop = function() {
  this.recording = false;
};

Recorder.prototype.isRecording = function() {
    return this.recording;
};

Recorder.prototype.clear = function() {
  this.thread.send('clear');
};

Recorder.prototype.setBuffer = function(buffer) {
  window.buffer = buffer;
  this.thread.send('buffer', buffer.getChannelData(0) );
};

Recorder.prototype.forceDownload = function(blob, filename){
  var url = (window.URL || window.webkitURL).createObjectURL(blob);
  var link = window.document.createElement('a');
  link.href = url;
  link.download = filename || 'output.wav';
  var click = document.createEvent("Event");
  click.initEvent("click", true, true);
  link.dispatchEvent(click);
};

Recorder.prototype.configure = function(cfg){
  for (var prop in cfg){
    if (cfg.hasOwnProperty(prop)){
      this.config[prop] = cfg[prop];
    }
  }
};

Recorder.prototype.getBuffer = function(cb) {
  this.currCallback = cb || this.config.callback;
  this.currCallback = function( arr ) {
    var buffer;
    try {
      buffer = (new AudioContext()).createBuffer( 1, arr[0].length, 44100 );
      buffer.getChannelData(0).set( arr[0] );
    } catch(e) {
      return cb( e, buffer );
    }
    return cb( null, buffer );
  };
  this.thread.send('getBuffer');
};

Recorder.prototype.getBlob = function(cb) {
  this.currCallback = cb || this.config.callback;
  this.thread.send('getBlob');
};

Recorder.prototype.exportWAV = function(cb, type) {
  this.currCallback = cb || this.config.callback;
  type = type || this.config.type || 'audio/wav';
  if ( !this.currCallback ) throw new Error( 'Callback not set' );
  this.thread.send('exportWAV', {
    type: type
  });
};
Recorder.prototype.getWAV = Recorder.prototype.exportWAV;

function recorderWorker() {
  var recLength = 0,
    recBuffersL = [],
    recBuffersR = [],
    sampleRate;

  thread.on('init', function(configArray) {
    sampleRate = configArray[0].config.sampleRate;
  });

  thread.on('record', function(message) {
    var inputBuffer = message[0].buffer;
    recBuffersL.push(inputBuffer[0]);
    recBuffersR.push(inputBuffer[1]);
    recLength += inputBuffer[0].length;
  });

  thread.on('getBuffer', function() {
    thread.send('log', 'getBuffer at worker');
    var buffers = [];
    if(this.buffer) {
      buffers = [ this.buffer, this.buffer ];
    } else {
      buffers.push( mergeBuffers( recBuffersL, recLength ) );
      buffers.push( mergeBuffers( recBuffersR, recLength ) );
    }

    this.send( 'buffer', buffers );
  });

  thread.on('buffer', function(bufferArgs) {
    this.buffer = bufferArgs[0];
  });

  thread.on('getBlob', function() {
    var type = 'audio/wav';
    var buffers = [];
    if(this.buffer) {
      buffers = [ this.buffer, this.buffer ];
    } else {
      buffers.push(mergeBuffers(recBuffersL, recLength) );
      buffers.push(mergeBuffers(recBuffersR, recLength) );
    }
    //var interleaved = interleave(buffers[0], buffers[1] );
    //var dataview = encodeWAV(interleaved);
    var dataview = encodeWAV(buffers[0]);
    var audioBlob = new Blob([dataview], { type: type });
    thread.send('blob', audioBlob);
  });

  thread.on('clear', function() {
    recLength = 0;
    recBuffersL = [];
    recBuffersR = [];
  });

  thread.on('exportWAV', function(e) {
    thread.send('log', e);
    var type = 'audio/wav';
    var bufferL = mergeBuffers(recBuffersL, recLength);
    var bufferR = mergeBuffers(recBuffersR, recLength);
    var interleaved = interleave(bufferL, bufferR);
    var dataview = encodeWAV(interleaved);
    var audioBlob = new Blob([dataview], { type: type });
    thread.send('blob', audioBlob);
  });

  function mergeBuffers(recBuffers, recLength){
    var result = new Float32Array(recLength);
    var offset = 0;
    for (var i = 0; i < recBuffers.length; i++){
      result.set(recBuffers[i], offset);
      offset += recBuffers[i].length;
    }
    return result;
  }

  function interleave(inputL, inputR){
    var length = inputL.length + inputR.length;
    var result = new Float32Array(length);

    var index = 0,
      inputIndex = 0;

    while (index < length){
      result[index++] = inputL[inputIndex];
      result[index++] = inputR[inputIndex];
      inputIndex++;
    }
    return result;
  }

  function floatTo16BitPCM(output, offset, input){
    for (var i = 0; i < input.length; i++, offset+=2){
      var s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  }

  function writeString(view, offset, string){
    for (var i = 0; i < string.length; i++){
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  function encodeWAV(samples){
    var buffer = new ArrayBuffer(44 + samples.length * 2);
    var view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 32 + samples.length * 2, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    //view.setUint16(22, 2, true); /*STEREO*/
    view.setUint16(22, 1, true); /*MONO*/
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    //view.setUint32(28, sampleRate * 4, true); /*STEREO*/
    view.setUint32(28, sampleRate * 2, true); /*MONO*/
    /* block align (channel count * bytes per sample) */
    //view.setUint16(32, 4, true); /*STEREO*/
    view.setUint16(32, 2, true); /*MONO*/
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);

    floatTo16BitPCM(view, 44, samples);

    return view;
  }

}

module.exports = Recorder;
