const {
  trainAndPredictARIMAService,
  getARIMAPredictionsService,
  evaluateARIMAModelService,
} = require("../services/predictionServices");

const handleTrainAndPredict = async (req, res) => {
  try {
    const result = await trainAndPredictARIMAService();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const handleGetPredictions = async (req, res) => {
  try {
    const predictions = await getARIMAPredictionsService();
    res.status(200).json({
      message: "Data prediksi ditemukan",
      data: predictions,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const handleEvaluateModel = async (req, res) => {
  try {
    const result = await evaluateARIMAModelService();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  handleTrainAndPredict,
  handleGetPredictions,
  handleEvaluateModel
};