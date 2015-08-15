module.exports = function (radio) {

  // Values in HZ
  var DEVIATION = 250000;
  var BANDWIDTH = 2000000;
  var CARRIER = 2487250000;
  var SAMPLE_RATE = 20000000;

  radio.setLNAGain(30);
  radio.setVGAGain(40);
  radio.setAntennaEnable(1);
  radio.setAmpEnable(1);

  radio.setBandwidth(BANDWIDTH, function () {
    radio.setSampleRate(SAMPLE_RATE, function () {
      radio.setFrequency(CARRIER, function () {
        demod(radio);
      })
    })
  })

  // How many samples to measure
  var FFT_SIZE = 4096;

  var constants = initConstants(CARRIER - DEVIATION, CARRIER + DEVIATION, SAMPLE_RATE);

  // Goertzel
  function initConstants(freq1, freq2, samplerate)
  {
    var i = 0;

    constants = {};

    console.log("freqs: ", freq1, freq2);
    console.log("rate:  ", samplerate);

    // Normalize the frequencies over the sample rates
    constants.f1norm = freq1 / samplerate;
    constants.f2norm = freq2 / samplerate;

    console.log("norms: ", constants.f1norm, constants.f2norm);

    // Calculate the coefficients for each frequency
    constants.f1coef = 2 * Math.cos(2*Math.PI*constants.f1norm);
    constants.f2coef = 2 * Math.cos(2*Math.PI*constants.f2norm);

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

  var max = 0;
  var iter = 0;
  var errors = 0;
  var ones = 0;
  var zeros = 0;
  var thresh = 63;

  function demod (radio) {
    radio.startRx(function (data, done) {

      // Decay the maxes after each round
      max = max * 0.1;
      for (var i = 0; i < data.length; i+=FFT_SIZE) {

        var array = new Array(FFT_SIZE);
        for (var j = 0; j < FFT_SIZE; j++)
        {
          array[j] = data[i + j] / 255;
        }
        output = mags(array, constants);

        var mag1 = output.f1mag;
        var mag2 = output.f2mag;

        // track the max number
        if (mag1 > max)
          max = mag1;

        if (mag2 > max)
          max = mag2;

        // Threshold is 1/2 the max observed number
        var mag1t = mag1 > max/2 ? 1 : 0;
        var mag2t = mag2 > max/2 ? 1 : 0;

        // Take counts
        iter++;
        if (mag1t == 1 && mag2t == 1)
        {
          errors++;
        } else if (mag1t) {
          zeros++;
        } else if (mag2t) {
          ones++;
        } else {
          errors++;
        }

        // Report if over threshold
        if(iter > thresh)
        {
          var val = "";
          if (ones > zeros)
          { 
            val = "1";
          } else {
            val = "0";
          }

          console.log(val, ": Errors, Zeros, Ones: ", errors, "\t", zeros, "\t", ones, "\t\tLast Vals: ", ~~mag1, "\t", ~~mag2);
          iter = 0;
          errors = 0;
          ones = 0;
          zeros = 0;
        }

        // Detailed reporting
        var details = 0;
        if (details)
        {
          process.stdout.write("\b\b\b");
          if (mag1t == 1 && mag2t == 1)
          {
            process.stdout.write("?^?");
          } else if (mag1t) {
            process.stdout.write("000");
          } else if (mag2t) {
            process.stdout.write("111");
          } else {
            process.stdout.write("?v?");
          }
        }
      }

      done()
    })
  }
}
