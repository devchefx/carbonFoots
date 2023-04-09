const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const travel_Schema = new Schema({
  co2_equi: {
    type: Number,
    required: true,
  },

  distance: {
    type: Number,
    min: 0,
    requied: [true, "Specify the weight."],
  },

  description: {
    type: String,
    required: [true, " You need to add a comment "],
  },

  distance_unit: {
    type: String,
    default: "m",
  },

  date_of_log: {
    type: Date,
    required: true,
  },

  constituent_gases: {
    co2: Number,
    ch4: Number,
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

module.exports = new model("t_ActivityLog", travel_Schema);
