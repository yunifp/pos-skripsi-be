const express = require("express");
const {
  handleTrainAndPredict,
  handleGetPredictions,
  handleEvaluateModel
} = require("../controllers/predictionController");
const { auth, admin } = require("../middlewares/auth");

const router = express.Router();

router.post("/predictions/arima/train", auth, admin, handleTrainAndPredict);
router.get("/predictions/arima", auth, handleGetPredictions);
router.get("/predictions/arima/evaluate", auth, admin, handleEvaluateModel);

module.exports = router;