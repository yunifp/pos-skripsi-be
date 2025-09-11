const prisma = require("../db");
const ARIMA = require("arima");
const { calculateErrorMetrics } = require("../../utils/evaluation"); // Pastikan file ini ada

/**
 * =================================================================================
 * INTI DARI MODEL PREDIKSI (UNTUK SKRIPSI ANDA)
 * =================================================================================
 * Parameter (p, d, q) yang dipilih adalah (2, 1, 2).
 * Ini adalah pilihan yang solid untuk data yang telah kita buat dengan seeder:
 *
 * p (Auto-Regressive): 2
 * Menandakan bahwa prediksi penjualan untuk hari ini dipengaruhi oleh data penjualan dari
 * DUA hari sebelumnya. Ini membantu model menangkap momentum jangka pendek.
 *
 * d (Differencing): 1
 * Menandakan bahwa data kita memiliki TREN NAIK (dibuat di seeder). Untuk menganalisisnya,
 * kita perlu melakukan "differencing" 1 kali agar data menjadi stasioner.
 * Ini adalah parameter paling penting yang membuktikan data Anda tidak acak.
 *
 * q (Moving Average): 2
 * Menandakan bahwa prediksi juga mempertimbangkan "shock" atau "error" dari prediksi
 * DUA hari sebelumnya. Ini membantu model beradaptasi dengan fluktuasi acak.
 *
 * Kombinasi ini (2,1,2) cukup kompleks untuk menangkap tren dan pola jangka pendek
 * yang ada di data hasil seeding Anda.
 * =================================================================================
 */

const trainAndPredictARIMAService = async () => {
  try {
    // 1. Mengambil data historis 180 hari untuk training yang lebih baik
    const historyDays = 180;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - historyDays);

    const salesData = await prisma.orders.findMany({
      where: {
        status: "success",
        created_at: {
          gte: startDate,
        },
      },
      orderBy: {
        created_at: "asc",
      },
    });

    // 2. Memastikan data cukup untuk training
    if (salesData.length < 50) { // Butuh data yang cukup untuk model ARIMA
      throw new Error(`Tidak ada data penjualan yang cukup untuk prediksi (minimal 50 data ditemukan ${salesData.length}).`);
    }

    // 3. Agregasi Data menjadi penjualan harian (time series)
    const dailySales = salesData.reduce((acc, order) => {
      const date = order.created_at.toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += order.total_payment;
      return acc;
    }, {});

    const timeSeriesData = Object.values(dailySales);

    // 4. Menjalankan Model ARIMA dengan parameter yang sudah ditentukan
    const arima = new ARIMA({
      p: 2,
      d: 1,
      q: 2,
      verbose: false,
    });
    arima.train(timeSeriesData);

    // 5. Membuat Prediksi untuk 30 hari ke depan
    const [predictions] = arima.predict(30);

    // 6. Menyimpan Hasil Prediksi ke Database
    await prisma.arima_predictions.deleteMany({}); // Hapus prediksi lama
    const predictionResults = predictions.map((prediction, index) => {
      const predictionDate = new Date();
      predictionDate.setDate(predictionDate.getDate() + index + 1);
      return {
        prediction_date: predictionDate,
        // Pastikan prediksi tidak negatif, yang tidak mungkin untuk penjualan
        prediction_value: Math.max(0, prediction),
      };
    });

    await prisma.arima_predictions.createMany({
      data: predictionResults,
    });

    return { message: "Prediksi ARIMA berhasil dibuat dan disimpan." };
  } catch (error) {
    throw new Error(`Gagal melatih dan memprediksi model ARIMA: ${error.message}`);
  }
};

const getARIMAPredictionsService = async () => {
  try {
    const predictions = await prisma.arima_predictions.findMany({
      orderBy: {
        prediction_date: "asc",
      },
    });
    return predictions;
  } catch (error) {
    throw new Error("Gagal mengambil prediksi ARIMA.");
  }
};


/**
 * Fungsi ini SANGAT PENTING untuk Bab 4 Skripsi Anda (Hasil & Pembahasan).
 * Tujuannya adalah untuk MENGUKUR SEBERAPA AKURAT model Anda secara matematis.
 * Prosesnya:
 * 1. Ambil data historis.
 * 2. Bagi menjadi 80% data untuk melatih model (training).
 * 3. Sisakan 20% data terakhir untuk pengujian (testing).
 * 4. Latih model HANYA dengan data training.
 * 5. Buat prediksi sebanyak data testing.
 * 6. Bandingkan hasil prediksi dengan data testing yang asli untuk menghitung Error.
 */
const evaluateARIMAModelService = async () => {
    try {
        const historyDays = 180;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - historyDays);

        const salesData = await prisma.orders.findMany({
            where: { status: "success", created_at: { gte: startDate } },
            orderBy: { created_at: "asc" },
        });

        if (salesData.length < 50) {
            throw new Error("Data tidak cukup untuk melakukan evaluasi model.");
        }

        const dailySales = salesData.reduce((acc, order) => {
          const date = order.created_at.toISOString().split("T")[0];
          if (!acc[date]) acc[date] = 0;
          acc[date] += order.total_payment;
          return acc;
        }, {});
        const timeSeriesData = Object.values(dailySales);

        // Bagi data: 80% training, 20% testing
        const splitPoint = Math.floor(timeSeriesData.length * 0.8);
        const trainingData = timeSeriesData.slice(0, splitPoint);
        const testingData = timeSeriesData.slice(splitPoint);

        const arima = new ARIMA({ p: 2, d: 1, q: 2, verbose: false });
        arima.train(trainingData);

        const [predictions] = arima.predict(testingData.length);

        // Hitung metrik error (MAE & RMSE)
        const { mae, rmse } = calculateErrorMetrics(testingData, predictions.map(p => Math.max(0, p)));

        return {
            message: "Evaluasi model berhasil.",
            metrics: { mae, rmse },
            training_data_points: trainingData.length,
            testing_data_points: testingData.length,
        };

    } catch (error) {
        throw new Error(`Gagal mengevaluasi model ARIMA: ${error.message}`);
    }
};


module.exports = {
  trainAndPredictARIMAService,
  getARIMAPredictionsService,
  evaluateARIMAModelService,
};