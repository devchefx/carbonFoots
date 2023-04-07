const mongoose = require("mongoose");
const { Schema, model } = mongoose;

// ! Later i will gonna add a few more things, and, gonna plugin passport-local-mongoose,
// ! for passport-local. Also gonna add the ObjectIDs array for the activites logged.

const userScheme = new Schema({
  // * to store the id sent by the google
  id: {
    type: String,
    default: null,
  },
  email: {
    type: String,
    required: [true, "email required"],
    unique: [true, "email already registered"],
  },
  firstName: String,
  lastName: String,

  // * this is just to specify that from which source is it authorized
  source: {
    type: String,
    required: [true, "source not specified"],
  },
});

module.exports = new model("User", userScheme);
