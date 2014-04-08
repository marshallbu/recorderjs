mocha.setup('bdd');
var expect = chai.expect;
var Thread = require('thread');
var Recorder = require('recorderjs');

var buffer;
describe('Recorder', function() {
  before(function(done) {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    var context = new AudioContext();
    var request = new XMLHttpRequest();
    request.open('GET', 'sample.mp3', true);
    request.responseType = 'arraybuffer';
    request.onload = function() {
      context.decodeAudioData(request.response, function(buffer) {
        window.buffer = buffer;
        done();
      })
    };
    request.send();
  });

  it('exists', function() {
    expect(Recorder).to.not.equal(undefined);
  });

  it('can listen', function(done) {
    var context = new AudioContext();
    var source = context.createBufferSource();
    source.buffer = window.buffer;
    var r = new Recorder( source );
    source.connect(context.destination);
    r.record();
    source.start(0);
    setTimeout(function() {
      r.stop();
      source.stop();
      r.getBuffer(function( err, buffer ) {
        expect(buffer.length).to.be.above(6000);
        expect(buffer.length).to.be.below(10000);
        done();
      });
    }, 200);
  });

  it('can return wav', function(done) {
    var context = new AudioContext();
    var source = context.createBufferSource();
    source.buffer = window.buffer;
    var r = new Recorder( source );
    source.connect(context.destination);
    r.record();
    source.start(0);
    setTimeout(function() {
      r.stop();
      source.stop();
      r.getWAV(function( err, wavBlob ) {
        console.log(wavBlob);
        expect( wavBlob instanceof Blob ).to.equal(true);
        expect( wavBlob.size ).to.be.above(1000);
        done();
      });
    }, 200);
  });


});

mocha.run();

