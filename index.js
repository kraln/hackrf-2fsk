module.exports = function (radio) {
  // 2FSK at 2.487GHz
  // DEVIATION IS 250khz

  var DEVIATION = 250000;
  var CARRIER = 2487250000;
  var SAMPLE_RATE = 8e6;

  radio.setLNAGain(20)
  radio.setVGAGain(30)
  radio.setTxGain(40)

  radio.setBandwidth(DEVIATION * 4, function () {
    radio.setSampleRate(SAMPLE_RATE, function () {
      radio.setFrequency(CARRIER, function () {
        demod(radio);
      })
    })
  })

  // How many samples to measure 
  var FFT_SIZE = 512;

  var PI = 3.1415926535;

  var constants = initConstants(2487500000, 2487000000, SAMPLE_RATE);

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


  function demod (radio) {
    var total = 0
    var bytes = 0
    radio.startRx(function (data, done) {
      for (var i = 0; i < data.length; i+=FFT_SIZE) {

        var array = new Array(FFT_SIZE);
        for (var j = 0; j < FFT_SIZE; j++)
        {
          array[j] = data[i + j]/128;
        }
        output = mags(array, constants);
        console.log(output.f1mag.toFixed(0), " \t ", output.f2mag.toFixed(0));
      }

       done()
    })
  }
}
