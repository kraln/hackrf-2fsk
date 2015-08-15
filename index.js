module.exports = function (radio) {
  // 2FSK at 2.487GHz
  // DEVIATION IS 250khz

  var DEVIATION = 250000;
  var BANDWIDTH = 2000000;
  var CARRIER = 2487250000;
  var SAMPLE_RATE = 8000000;

  radio.setLNAGain(20)
  radio.setVGAGain(30)
  radio.setTxGain(40)

  radio.setBandwidth(BANDWIDTH, function () {
    radio.setSampleRate(SAMPLE_RATE, function () {
      radio.setFrequency(CARRIER, function () {
        demod(radio);
      })
    })
  })

  // How many samples to measure 
  var FFT_SIZE = 512;

  var PI = 3.1415926535;

  // 2 487 545 000
  // 2 487 500 000
  var constants = initConstants(CARRIER - DEVIATION, CARRIER + DEVIATION, SAMPLE_RATE);

  //  Goertzel
  function initConstants(freq1, freq2, samplerate)
  {
    var i = 0;

    constants = {};

    // Normalize the frequencies over the sample rates
    constants.f1norm = freq1 / samplerate;
    constants.f2norm = freq2 / samplerate;

    console.log("norms: ", constants.f1norm, constants.f2norm);

    // Calculate the coefficients for each frequency
    constants.f1coef = 2 * Math.cos(2*PI*constants.f1norm);
    constants.f2coef = 2 * Math.cos(2*PI*constants.f2norm);

    console.log("coefs: ", constants.f1coef, constants.f2coef);

    return constants;
  }

  function mags(samples, c)
  {
    res = {};
    var f1 = [];
    var f2 = [];
    f1[0] = 0;
    f1[1] = 0;
    f1[2] = 0;
    f2[0] = 0;
    f2[1] = 0;
    f2[2] = 0;
 
    // Mix each sample with the pre-calculated coefficients
    for(var i = 0; i < samples.length; i++)
    {
      f1[0] = samples[i] + c.f1coef*f1[1] - f1[2];
      f1[2] = f1[1];
      f1[1] = f1[0];

      f2[0] = samples[i] + c.f2coef*f2[1] - f2[2];
      f2[2] = f2[1];
      f2[1] = f2[0];
    }

    // Calculate the magnitudes of each frequency
    res.f1mag = f1[2]*f1[2] + f1[1]*f1[1] - c.f1coef*f1[1]*f1[2];
    res.f2mag = f2[2]*f2[2] + f2[1]*f2[1] - c.f2coef*f2[1]*f2[2];

    return res;
  }

  var decimate = 0;
  var max0 = 0;
  var max1 = 0;

  function demod (radio) {
    var total = 0
    var bytes = 0
    radio.startRx(function (data, done) {

      // Decay the maxes after each round
        max0 = max0 * 0.95;
        max1 = max1 * 0.95;

      for (var i = 0; i < data.length; i+=FFT_SIZE) {

        var array = new Array(FFT_SIZE);
        for (var j = 0; j < FFT_SIZE; j++)
        {
          array[j] = data[i + j]/256;
        }
        output = mags(array, constants);

        var mag1 = output.f1mag.toFixed(0);
        var mag2 = output.f2mag.toFixed(0);

        // track tha max number
        if (mag1 > max0)
          max0 = mag1;

        if (mag2 > max1)
          max1 = mag2;

        max = max0 > max1? max0 : max1;
        
        // Threshold is 1/3 the max observed number
        var mag1t = mag1 > max/3 ? 1 : 0;
        var mag2t = mag2 > max/3 ? 1 : 0;

        decimate++;

        // Print every 25th result
        if(decimate % 25) {
        if (mag1t == 1 && mag2t == 1)
        {
          console.log("?\ŧ", output.f1mag.toFixed(0), " \t ", output.f2mag.toFixed(0));
        } else if (mag1t) {
          console.log("0\ŧ", output.f1mag.toFixed(0), " \t ", output.f2mag.toFixed(0));
        } else if (mag2t) {
          console.log("1\ŧ", output.f1mag.toFixed(0), " \t ", output.f2mag.toFixed(0));
        } else {
          console.log("?\ŧ", output.f1mag.toFixed(0), " \t ", output.f2mag.toFixed(0));
        }
        }
      }

       done()
    })
  }
}
