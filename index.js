/*
var WORKER_PATH = 'recorderWorker.js';

var asdf = function(source, cfg){
  var config = cfg || {};
  var bufferLen = config.bufferLen || 4096;
  this.context = source.context;
  this.node = (this.context.createScriptProcessor ||
               this.context.createJavaScriptNode).call(this.context,
                                                       bufferLen, 2, 2);
  var worker = new Worker(config.workerPath || WORKER_PATH);
  worker.postMessage({
    command: 'init',
    config: {
      sampleRate: this.context.sampleRate
    }
  });
  var recording = false,
    currCallback;

  this.node.onaudioprocess = function(e){
    if (!recording) return;
    worker.postMessage({
      command: 'record',
      buffer: [
        e.inputBuffer.getChannelData(0),
        e.inputBuffer.getChannelData(1)
      ]
    });
  }

  this.configure = function(cfg){
    for (var prop in cfg){
      if (cfg.hasOwnProperty(prop)){
        config[prop] = cfg[prop];
      }
    }
  }

  this.record = function(){
    recording = true;
  }

  this.stop = function(){
    recording = false;
  }

  this.clear = function(){
    worker.postMessage({ command: 'clear' });
  }

  this.getBuffer = function(cb) {
    currCallback = cb || config.callback;
    worker.postMessage({ command: 'getBuffer' })
  }

  this.exportWAV = function(cb, type){
    currCallback = cb || config.callback;
    type = type || config.type || 'audio/wav';
    if (!currCallback) throw new Error('Callback not set');
    worker.postMessage({
      command: 'exportWAV',
      type: type
    });
  }

  worker.onmessage = function(e){
    var blob = e.data;
    currCallback(blob);
  }

  source.connect(this.node);
  this.node.connect(this.context.destination);    //this should not be necessary
};
*/


var Thread = require('thread');

var Recorder = function(source, cfg) {
  this.config = cfg || {};
  var bufferLen = this.config.bufferLen || 4096;
  this.context = source.context;
  this.node = (this.context.createScriptProcessor ||
               this.context.createJavaScriptNode).call(this.context,
                                                       bufferLen, 2, 2);
  this.recording = false;

  // Establish thread
  this.thread = new Thread(recorderWorker);
  console.log(this.context, this.context.sampleRate);

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

/*
  worker.onmessage = function(e){
    var blob = e.data;
    currCallback(blob);
  }
*/

  this.thread.on('hello', function( obj ) {
    console.log('got hello', obj);
  });

  this.thread.on('buffer', function(data) {
    console.log('buffer');
    console.log(data);
  });
  this.thread.on('log', function(message) {
    console.log(message);

  });


  source.connect(this.node);
  this.node.connect(this.context.destination);    //this should not be necessary

};

Recorder.prototype.record = function() {
  this.recording = true;
};

Recorder.prototype.stop = function() {
  recording = false;
};

Recorder.prototype.clear = function() {
  this.thread.send('clear');
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
  this.thread.send('getBuffer');
};

Recorder.prototype.exportWAV = function(cb, type) {
  this.currCallback = cb || this.config.callback;
  type = type || config.type || 'audio/wav';
  if ( !this.currCallback ) throw new Error( 'Callback not set' );
  this.thread.send('exportWAV', {
    type: type
  });
};

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
    var buffers = [];
    buffers.push( mergeBuffers( recBuffersL, recLength ) );
    buffers.push( mergeBuffers( recBuffersR, recLength ) );
    this.send( 'buffer', buffers );
  });

  thread.on('clear', function() {
    recLength = 0;
    recBuffersL = [];
    recBuffersR = [];
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
}


module.exports = Recorder;
