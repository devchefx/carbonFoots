const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const axios = require("axios");
const dotenv = require("dotenv").config();
const ejs_mate = require("ejs-mate");
const methodOverride = require("method-override");
const cookieParser = require("cookie-parser");

const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.engine("ejs", ejs_mate);

app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));
app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_PARSER_SEC));

// Session requires
const session = require("express-session");
const mongoSessionStore = require("connect-mongo");

// Auth requires
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

// * CONFIGURING THE MONGODB.
mongoose
  .connect("mongodb://localhost:27017/carbonFoots")
  .then(() => {
    console.log("Calculating CO2.");
  })
  .catch(() => {
    console.log("error!!");
  });

// * CONFIGURING THE SESSION STORE AND SESSION.
// creating a collection for sessions with help of mongoSessionStore
const sessionStore = mongoSessionStore.create({
  collectionName: "sessions",
  mongoUrl: "mongodb://localhost:27017/carbonFoots",
});

// creating session configration object
// ! give expiry for session cookie
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store: sessionStore,
  cookie: {
    httpOnly: true,
  },
};

app.use(session(sessionConfig));

// using the passport
app.use(passport.initialize());
// this line should be after the middleware for sessions
app.use(passport.session());

// Adding some helper function for user model
const addGoogleUser = async ({ id, email, firstName, lastName }) => {
  const newUser = await new User({
    id,
    email,
    firstName,
    lastName,
    source: "google",
  });
  return await newUser.save();
};

const getGoogleUserByEmail = async ({ email }) => {
  return await User.findOne({
    email,
  });
};

// * CONFIGURING THE PASSPORT FOR GOOGLE AUTH.
passport.use(
  new GoogleStrategy(
    {
      callbackURL: process.env.CALLBACK_URL,
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log("###########################################");
      console.log(accessToken);
      console.log(refreshToken);
      const id = profile.id;
      const email = profile.emails[0].value;
      const firstName = profile.name.givenName;
      const lastName = profile.name.familyName;
      const source = "google";

      const currentUser = await getGoogleUserByEmail({
        email,
      });

      if (!currentUser) {
        const newUser = await addGoogleUser({
          id,
          email,
          firstName,
          lastName,
        });
        return done(null, newUser);
      }

      if (currentUser.source != "google") {
        //return error
        return done(null, false, {
          message: `You have previously signed up with a different signin method`,
        });
      }
      return done(null, currentUser);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findOne({
    id,
  });
  done(null, user);
});

// * CONFIGURING DEFALULTS FOR THE AXIOS REQUEST.
axios.defaults.baseURL = "https://beta3.api.climatiq.io";
axios.defaults.headers.common[
  "Authorization"
] = `Bearer ${process.env.CLIMATIQ_API_KEY}`;
axios.defaults.headers.post["Content-Type"] = "application/json";

// *  Requiring Models
const User = require("./models/userModel/user.js");

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/",
    successRedirect: "/done",
  })
);

// ! just for dummy use, will be removed
app.get("/done", (req, res) => {
  res.send("LOGIN IS successful" + `${req.session}`);
});

app.get("/isloged", (req, res) => {
  if (req.user) {
    return res.send("yessss");
  }
  res.send("NOOOOOOOOOOOOOOOO");
});

// ? For displaying the home page
app.get("/", async (req, res, next) => {
  // const resData = await request();

  // console.log(resData.data);
  if (req.user) {
    console.log(req.user);
    console.log("%%%%%%%%%%%%%%%%");
    console.log(req.session);
  }
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

app.get("/activity/energy_cnsmp/new", async (req, res, next) => {
  const resData = await axios({
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
  res.send(resData.data);
});
app.get("/auth/logout", (req, res) => {
  req.session.destroy(function () {
    res.clearCookie("connect.sid");
    res.clearCookie("signedIN");
    res.redirect("/");
  });
});

app.listen(port, (req, res) => {
  console.log("Listening to port 3002");
});
