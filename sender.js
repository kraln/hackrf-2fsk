var radio = require('hackrf')()

var DEVIATION = 250000;
var BANDWIDTH = 2000000;
var CARRIER = 2487250000;
var SAMPLE_RATE = 8000000;

console.log('found radio: ' + radio.getVersion())
radio.setTxGain(30)
radio.setSampleRate(SAMPLE_RATE, function () {
  radio.setFrequency(CARRIER, function () {
    console.log('freq set')
    radio.startTx(function (data, done) {
      data.fill(127)//Math.floor(Math.random() * 127))
      done()
    })
    start()
  })
})

function start () {
  var i = 0
  setInterval(function () {
    i++
    var f = i % 2 ? CARRIER - DEVIATION : CARRIER + DEVIATION
    radio.setFrequency(f, function () {
      console.log('freq set to ' + f)
    })
  }, 250)
}
