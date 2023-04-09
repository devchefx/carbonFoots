const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const fuelSchema = new Schema({
  co2_equi: {
    type: Number,
    required: true,
  },

  volume: {
    type: Number,
    min: 0,
    requied: [true, "Specify the amount."],
  },

  description: {
    type: String,
    required: [true, " You need to add a comment "],
  },

  volume_unit: {
    type: String,
    default: "kWh",
  },

  date_of_log: {
    type: Date,
    required: true,
  },

  constituent_gases: {
    type: Schema.Types.Mixed,
  },

  category: {
    type: String,
    requied: true,
  },

  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
});

module.exports = new model("f_ActivityLog", fuelSchema);
