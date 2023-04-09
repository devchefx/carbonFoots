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

// Model requires
const User = require("./models/userModel/user");
const Electricity = require("./models/electricityModel/electricity");
const Travel = require("./models/travelModel/travel");
const Waste = require("./models/wasteModel/waste");
const Fuel = require("./models/fuelModel/fuel");

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

  if (!req.user) {
    return res.send("login IN First");
  }
  // console.log(req.user);
  const currUser = await User.findById(req.user._id)
    .populate("elec_activities")
    .populate("waste_activities")
    .populate("travel_activities")
    .populate("fuel_activities");
  // console.log(currUser);
  let allAct = [
    ...currUser.elec_activities,
    ...currUser.fuel_activities,
    ...currUser.waste_activities,
    ...currUser.travel_activities,
  ];
  allAct.sort(function (a, b) {
    // Turn your strings into dates, and then subtract them
    // to get a value that is either negative, positive, or zero.
    return b.date_of_log.getTime() - a.date_of_log.getTime();
  });
  console.log(allAct);

  res.render("home.ejs", { allAct });
});

// ? For registering new electricity entry
app.post("/activity/electricity/new", async (req, res, next) => {
  console.log(req.body);
  const { activity_id, energy, description } = req.body;
  const resData = await axios({
    url: "/estimate",
    method: "post",
    data: {
      emission_factor: {
        activity_id,
      },
      parameters: {
        // TODO : take param entries from user.
        energy: Number(energy),
        energy_unit: "kWh",
      },
    },
  });

  const newAct = new Electricity({
    energy: Number(energy),
    description,
    energy_unit: "kWh",
    date_of_log: new Date(),
    category: resData.data.emission_factor.category,
    constituent_gases: resData.data.constituent_gases,
    co2_equi: resData.data.co2e,
    author: req.user,
  });
  await newAct.save();

  await User.findOneAndUpdate(
    { _id: req.user._id },
    {
      $push: { elec_activities: newAct._id },
    }
  );

  console.log(resData.data);
  console.log(req.user);
  res.redirect("/");
});

// ? For Registerning new plastic waste entry
app.post("/activity/waste/new", async (req, res, next) => {
  console.log(req.body);
  const { activity_id, description, weight, weight_unit } = req.body;
  const resData = await axios({
    url: "/estimate",
    method: "post",
    data: {
      emission_factor: {
        activity_id,
      },
      parameters: {
        //  TODO : take param entries from user.
        weight: Number(weight),
        weight_unit,
      },
    },
  });

  const newAct = new Waste({
    weight: Number(weight),
    description,
    weight_unit,
    date_of_log: new Date(),
    category: resData.data.emission_factor.category,
    constituent_gases: resData.data.constituent_gases,
    co2_equi: resData.data.co2e,
    author: req.user,
  });

  await newAct.save();

  await User.findOneAndUpdate(
    { _id: req.user._id },
    {
      $push: { waste_activities: newAct._id },
    }
  );

  // res.send(resData.data);
  console.log(resData.data);
  res.redirect("/");
});

// ? For Registerning new travel entry
app.post("/activity/travel/new", async (req, res, next) => {
  console.log(req.body);

  const { activity_id, distance, distance_unit, passengers, description } =
    req.body;

  const resData = await axios({
    url: "/estimate",
    method: "post",
    data: {
      emission_factor: {
        activity_id,
      },
      parameters: {
        //  TODO : take param entries from user.
        passengers: Number(passengers),
        distance: Number(distance),
        distance_unit,
      },
    },
  });

  const newAct = new Travel({
    distance: Number(distance),
    distance_unit,
    description,
    date_of_log: new Date(),
    category: resData.data.emission_factor.category,
    constituent_gases: resData.data.constituent_gases,
    author: req.user,
    co2_equi: resData.data.co2e,
  });

  await newAct.save();

  await User.findOneAndUpdate(
    { _id: req.user._id },
    {
      $push: { travel_activities: newAct._id },
    }
  );

  console.log(resData.data);
  res.redirect("/");
});

app.post("/activity/fuel/new", async (req, res, next) => {
  console.log(req.body);

  const { activity_id, volume, volume_unit, description } = req.body;

  const resData = await axios({
    url: "/estimate",
    method: "post",
    data: {
      emission_factor: {
        activity_id,
      },
      parameters: {
        volume: Number(volume),
        volume_unit,
      },
    },
  });

  const newAct = new Fuel({
    volume: Number(volume),
    volume_unit,
    description,
    date_of_log: new Date(),
    category: resData.data.emission_factor.name,
    constituent_gases: resData.data.constituent_gases,
    author: req.user,
    co2_equi: resData.data.co2e,
  });

  await newAct.save();

  await User.findOneAndUpdate(
    { _id: req.user._id },
    {
      $push: { fuel_activities: newAct._id },
    }
  );
  console.log(newAct.date_of_log.toString());
  console.log(resData.data);
  res.redirect("/");
});

app.get("/aqi", async (req, res, next) => {
  const { cityName } = req.query;
  const url = `https://api.waqi.info/feed/${cityName}/?token=${e475c164b3fcf8a8b99113458426ec0eec0d73e7}`;

  // const resData = await axios({
  //   baseURL:"https://api.waqi.info/feed",
  //   url,
  //   method: "get",
  // });

  axios
    .get(url)
    .then((response) => {
      const aqiData = response.data.data.aqi;
      console.log(aqiData);
      res.send(`The current AQI for ${cityName} is ${aqiData}`);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("Error retrieving AQI data");
    });

  res.render("/");
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
