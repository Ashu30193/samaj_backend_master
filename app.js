require('dotenv').config();
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const mongoose = require("mongoose");
const path = require("path");
var bodyParser = require("body-parser");
var app = express();
const fileUpload = require("express-fileupload");
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  debug: true
}));
app.use(
  bodyParser.urlencoded({
    limit: "30mb",
    parameterLimit: 100000,
    extended: false,
  }),
);
app.use(bodyParser.json({ limit: "30mb" }));

// Serve static files from uploads directory (for localhost file storage)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log('[App] Static file serving enabled for /uploads directory');

const port = 4000;
const server = app.listen(port);
const io = require("socket.io")(server);
const activity = require("./routes/activity");
const category = require("./routes/category");
const audiobooks = require("./routes/audiobooks");
const wishlist = require("./routes/wishlist");
const products = require("./routes/product");
const user = require("./routes/user");
const role = require("./routes/role");
const siteConfig = require("./routes/site-config");
const job = require("./routes/job");
const event = require("./routes/event");
const news = require("./routes/news");
const admin = require("./routes/admin");
const business = require("./routes/business");
const enableDisableUser = require("./routes/user-enable-disable");
const otp = require("./routes/otp");
const serviceUser = require("./routes/service-user");
const payment = require("./routes/payment");
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:8000", "http://15.207.87.131", "http://pareeksamaj.in", "http://www.pareeksamaj.in", "https://pareeksamaj.in", "https://www.pareeksamaj.in"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
const error = require("./middlewares/error");

// Set up mongoose connection
mongoose.Promise = global.Promise;
const dBUrl = process.env.NODE_ENV === 'production'
  ? process.env.DB_PRODUCTION_URL
  : process.env.DB_LOCAL_URL;
mongoose.connect(dBUrl)
  .then(() => {
    console.log("DB Connected Successfully");
  }).catch((err) => {
    console.log("DB Connection Error:", err.message);
    console.log("Please check your MongoDB connection string and credentials");
  });
// app.use(function (req, res, next) {

//     // Website you wish to allow to connect
//     res.setHeader('Access-Control-Allow-Origin', '*');

//     // Request methods you wish to allow
//     res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

//     // Request headers you wish to allow
//     res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

//     // Set to true if you need the website to include cookies in the requests sent
//     // to the API (e.g. in case you use sessions)
//     res.setHeader('Access-Control-Allow-Credentials', true);

//     // Pass to next layer of middleware
//     next();
// });
app.use((req, res, next) => {
  req.io = io;
  next();
});
// app.use(express.json({ limit: "50mb", extended: true }));
// app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/activity", activity);
app.use("/category", category);
app.use("/audiobooks", audiobooks);
app.use("/wishlist", wishlist);

app.use("/user", user);
app.use("/admin", admin);
app.use("/role", role);
app.use("/siteConfig", siteConfig);
app.use("/job", job);
app.use("/events", event);
app.use("/products", products);
app.use("/news", news);
app.use("/business", business);
app.use("/enableDisableUser", enableDisableUser);
app.use("/otp", otp);
app.use("/service-user", serviceUser);
app.use("/payment", payment);
// if error is not an instanceOf APIError, convert it.
app.use(error.converter);

// catch 404 and forward to error handler
app.use(error.notFound);

// error handler, send stacktrace only during development
app.use(error.handler);

app.use(passport.initialize());
app.use(passport.session());
