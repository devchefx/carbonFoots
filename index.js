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
  const resData = await request();

  console.log(resData.data);

  //   res.send("WELCOME HERE ~ !!!!");
  // res.send(resData.data);
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

app.listen(port, (req, res) => {
  console.log("Listening to port 3002");
});
