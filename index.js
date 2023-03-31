const express = require("express");
const app = express();

const axios = require("axios");
const dotenv = require("dotenv").config();
const ejs_mate = require("ejs-mate");

const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.engine("ejs", ejs_mate);

// * CONFIGURING DEFALULTS FOR THE AXIOS REQUEST.
axios.defaults.baseURL = "https://beta3.api.climatiq.io";
axios.defaults.headers.common[
  "Authorization"
] = `Bearer ${process.env.CLIMATIQ_API_KEY}`;
axios.defaults.headers.post["Content-Type"] = "application/json";

const request = async () => {
  return await axios({
    url: "/estimate",
    method: "post",
    data: {
      emission_factor: {
        activity_id: "heat-and-steam-type_purchased",
      },
      parameters: {
        energy: 100,
        energy_unit: "kWh",
      },
    },
  });
};

// ? For displaying the home page
app.get("/", async (req, res, next) => {
  // const resData = await request();

  // console.log(resData.data);
  res.render("home.ejs");
});

// ? For registering new electricity entry
// ! Make it post.
app.get("/activity/electricity/new", async (req, res, next) => {
  const resData = await axios({
    url: "/estimate",
    method: "post",
    data: {
      emission_factor: {
        activity_id: "electricity-energy_source_grid_mix",
      },
      parameters: {
        // TODO : take param entries from user.
        energy: 4200,
        energy_unit: "kWh",
      },
    },
  });

  res.send(resData.data);
});

// ? For Registerning new plastic waste entry
// ! Make it post.
app.get("/activity/waste/new", async (req, res, next) => {
  const resData = await axios({
    url: "/estimate",
    method: "post",
    data: {
      emission_factor: {
        activity_id: "waste_type_hdpe-disposal_method_combusted",
      },
      parameters: {
        //  TODO : take param entries from user.
        weight: 80,
        weight_unit: "kg",
      },
    },
  });
  res.send(resData.data);
});

// ? For Registerning new travel entry
// ! Make it post.
app.get("/activity/travel/new", async (req, res, next) => {
  const rActivity =
    "passenger_vehicle-vehicle_type_taxi-fuel_source_na-distance_na-engine_size_na";
  const aActivity =
    "passenger_flight-route_type_domestic-aircraft_type_na-distance_na-class_na-rf_included";
  const sActivity = "passenger_ferry-route_type_na-fuel_source_na";

  let activity_id;

  switch (req.query.mode) {
    case "road":
      activity_id = rActivity;
      break;
    case "air":
      activity_id = aActivity;
      break;
    case "sea":
      activity_id = sActivity;
      break;
    default:
      activity_id = rActivity;
      break;
  }

  const resData = await axios({
    url: "/estimate",
    method: "post",
    data: {
      emission_factor: {
        activity_id,
      },
      parameters: {
        //  TODO : take param entries from user.
        passengers: 4,
        distance: 100,
        distance_unit: "km",
      },
    },
  });

  res.send(resData.data);
});

// ? For Registerning new Flight Travel entry
// ! Make it post.
app.get("/activity/flight/new", async (req, res, next) => {
  const resData = await axios({
    url: "/travel/flights",
    method: "post",
    data: {
      // TODO: take these entries from the user.
      legs: [
        {
          from: "BER",
          to: "HAM",
          passengers: 2,
          class: "first",
        },
        {
          from: "HAM",
          to: "JFK",
          passengers: 2,
          class: "economy",
        },
      ],
    },
  });

  res.send(resData.data);
});

app.listen(port, (req, res) => {
  console.log("Listening to port 3002");
});
