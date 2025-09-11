// File: utils/evaluation.js

/**
 * Fungsi ini membandingkan data aktual dengan data prediksi
 * untuk menghitung seberapa besar rata-rata errornya.
 * @param {number[]} actuals - Array berisi nilai penjualan asli dari data testing.
 * @param {number[]} predicteds - Array berisi nilai penjualan hasil prediksi model.
 * @returns {{mae: number, rmse: number}} - Objek berisi nilai MAE dan RMSE.
 */
const calculateErrorMetrics = (actuals, predicteds) => {
  let sumAbsoluteError = 0;
  let sumSquaredError = 0;
  const n = actuals.length;

  for (let i = 0; i < n; i++) {
    const error = actuals[i] - predicteds[i];
    sumAbsoluteError += Math.abs(error);
    sumSquaredError += error * error;
  }

  const mae = sumAbsoluteError / n;
  const rmse = Math.sqrt(sumSquaredError / n);

  return { mae, rmse };
};

module.exports = { calculateErrorMetrics };