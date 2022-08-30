// import all the neccessary modules
const express = require("express");
const path = require("path");
const fileUpload = require("express-fileupload");
const mongoose = require("mongoose");
const session = require("express-session");

// set up expess validator
const { check, validationResult } = require("express-validator");

// connect to DB
mongoose.connect("mongodb://localhost:27017/tgnProperty", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// define the model of work order request
const Request = mongoose.model("Request", {
  cname: String,
  cemail: String,
  cphone: String,
  cunit: String,
  cdescription: String,
  cphotoName: String,
});

// define model for admin users
const User = mongoose.model("User", {
  uName: String,
  uPass: String,
});

// define model for listing
const Listing = mongoose.model("Listing", {
  address: String,
  fee: Number,
  description: String,
  photoName: String,
});

// set up the app
var myApp = express();

myApp.use(
  session({
    secret: "nosecretatall",
    resave: false,
    saveUninitialized: true,
  })
);

myApp.use(express.urlencoded({ extended: false }));
myApp.use(fileUpload()); // set up the express file upload middleware

// set path to public folders and view folders
myApp.set("views", path.join(__dirname, "views"));
//use public folder
myApp.use(express.static(__dirname + "/public"));
myApp.set("view engine", "ejs");

// render views/index.html
myApp.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "/views/index.html"));
});

myApp.get("/index.html", function (req, res) {
  res.sendFile(path.join(__dirname, "/views/index.html"));
});

myApp.get("/contact.html", function (req, res) {
  res.sendFile(path.join(__dirname, "/views/contact.html"));
});

// render views/listing-entry
myApp.get("/listing-entry", function (req, res) {
  res.render("listing-entry");
});

// render views/request-form.ejs
myApp.get("/request-form", function (req, res) {
  res.render("request-form");
});

// render views/login.ejs
myApp.get("/login", function (req, res) {
  res.render("login");
});

myApp.post("/login", function (req, res) {
  // fetch username and password from client
  var uName = req.body.uname;
  var uPass = req.body.upass;

  // find matching record in DB
  User.findOne({ uName: uName, uPass: uPass }).exec(function (err, user) {
    // set up the session variables for logged in users
    console.log("Errors: " + err);
    if (user) {
      req.session.uName = user.uName;
      req.session.loggedIn = true;
      // redirect to home
      res.redirect("/admin-dashboard");
    } else {
      // render login form with errors
      res.render("login", {
        error: "Please input a valid username/password to log in",
      });
    }
  });
});

myApp.get("/logout", function (req, res) {
  // Reset the variables
  req.session.uName = "";
  req.session.loggedIn = false;
  res.redirect("/login");
});

// When user Create a work order and submit
myApp.post(
  "/process",
  [
    check("cname", "Please enter your name").not().isEmpty(),
    check("cemail", "Please enter a valid email").isEmail(),
    check("cphone", "Please enter a valid phone number").isMobilePhone(),
    check("cunit", "Please enter your unit number").not().isEmpty(),
    check("cdescription", "Please enter the description of your request")
      .not()
      .isEmpty(),
  ],
  function (req, res) {
    // check for errors
    const errors = validationResult(req);
    console.log(errors);
    if (!errors.isEmpty()) {
      res.render("request-form", { er: errors.array(), userData: req.body });
    } else {
      //fetch all the form fields
      var cname = req.body.cname;
      var cemail = req.body.cemail;
      var cphone = req.body.cphone;
      var cunit = req.body.cunit;
      var cdescription = req.body.cdescription;
      if (req.files != null) {
        // fetch the photo
        // get the name of the file and add time prefix to make it unique
        var cphotoName = new Date().getTime() + "_" + req.files.cphoto.name;
        // get the actual file
        var cphotoFile = req.files.cphoto; // this is a temporary file in buffer.
        // save the file
        var cphotoPath = "public/uploads/" + cphotoName;
        // move the temp file to a permanent location
        cphotoFile.mv(cphotoPath, function (err) {
          console.log(err);
        });
      } else cphotoName = null;
      // create an object with the fetched data to save to DB
      var pageData = {
        cname: cname,
        cemail: cemail,
        cphone: cphone,
        cunit: cunit,
        cdescription: cdescription,
        cphotoName: cphotoName,
      };

      // create an object from the model to save to DB
      var myRequest = new Request(pageData);
      // save it to DB
      myRequest.save();

      // send the data to the view and render it
      var message = "submitted";
      res.render("thank-you", { message: message });
    }
  }
);

//Process when admin register new Listing
myApp.post(
  "/processListing",
  [
    check("address", "Please enter address").not().isEmpty(),
    check("fee", "Please enter fee").not().isEmpty(),
    check("description", "Please enter description").not().isEmpty(),
  ],
  function (req, res) {
    if (req.session.loggedIn) {
      // check for errors
      const errors = validationResult(req);
      console.log(errors);
      if (!errors.isEmpty()) {
        res.render("listing-entry", { er: errors.array(), userData: req.body });
      } else {
        //fetch all the form fields
        var address = req.body.address;
        var fee = req.body.fee;
        var description = req.body.description;
        if (req.files != null) {
          // fetch the photo
          // get the name of the file and add time prefix to make it unique
          var photoName = new Date().getTime() + "_" + req.files.photo.name;
          // get the actual file
          var photoFile = req.files.photo;
          // save the file
          var photoPath = "public/uploads/" + photoName;
          // move the temp file to a permanent location
          photoFile.mv(photoPath, function (err) {
            console.log(err);
          });
        } else photoName = null;
        // create an object with the fetched data to save to DB
        var pageData = {
          address: address,
          fee: fee,
          description: description,
          photoName: photoName,
        };

        // create an object from the model to save to DB
        var myListing = new Listing(pageData);
        // save it to DB
        myListing.save();

        // send the data to the view and render it
        var message = "submitted";
        res.render("thank-you", { message: message });
      }
    } else {
      res.redirect("/login");
    }
  }
);

// show all requests in admin dashboard
myApp.get("/listings", function (req, res) {
  // fetch all the listings from db and send to the view admin dashboard
  Listing.find({}).exec(function (err, listings) {
    console.log(err);
    console.log(listings);
    res.render("listings", { listings: listings });
  });
});

// show all requests in admin dashboard
myApp.get("/admin-dashboard", function (req, res) {
  if (req.session.loggedIn) {
    // fetch all the requests from db and send to the view admin dashboard
    Request.find({}).exec(function (err, requests) {
      console.log(err);
      console.log(requests);
      res.render("admin-dashboard", { requests: requests });
    });
  } else {
    res.redirect("/login");
  }
});

// View a request
myApp.get("/view/:requestid", function (req, res) {
  if (req.session.loggedIn) {
    // fetch details of the request and create pageData
    var requestid = req.params.requestid;
    Request.findOne({ _id: requestid }).exec(function (err, request) {
      res.render("admin-request-view", request);
    });
  } else {
    res.redirect("/login");
  }
});

// Delete a Request
myApp.get("/delete/:requestid", function (req, res) {
  if (req.session.loggedIn) {
    // fetch details of the request and create pageData
    var requestid = req.params.requestid;
    Request.findOneAndDelete({ _id: requestid }).exec(function (err, request) {
      var message = "deleted";
      res.render("thank-you", { message: message });
    });
  } else {
    res.redirect("/login");
  }
});

// Render Edit page
myApp.get("/edit/:requestid", function (req, res) {
  if (req.session.loggedIn) {
    // fetch details of the request and create pageData
    var requestid = req.params.requestid;
    console.log("RequestID: " + requestid);
    Request.findOne({ _id: requestid }).exec(function (err, request) {
      console.log(request);
      res.render("request-form-edit", request);
    });
  } else {
    res.redirect("/login");
  }
});

// Save the edited request
myApp.post(
  "/editprocess/:requestid",
  [
    check("cname", "Please enter your name").not().isEmpty(),
    check("cemail", "Please enter a valid email").isEmail(),
    check("cphone", "Please enter a valid phone number").isMobilePhone(),
    check("cunit", "Please enter your unit number").not().isEmpty(),
    check("cdescription", "Please enter the description of your request")
      .not()
      .isEmpty(),
  ],
  function (req, res) {
    const errors = validationResult(req);
    console.log(errors);
    if (!req.session.loggedIn) {
      res.redirect("/login");
    } else if (!errors.isEmpty()) {
      res.render("request-form-edit", {
        er: errors.array(),
        userData: req.body,
        _id: req.params.requestid,
      });
    } else {
      //fetch all the form fields
      var cname = req.body.cname;
      var cemail = req.body.cemail;
      var cphone = req.body.cphone;
      var cunit = req.body.cunit;
      var cdescription = req.body.cdescription;
      if (req.files != null) {
        var cphotoName = new Date().getTime() + "_" + req.files.cphoto.name;
        var cphotoFile = req.files.cphoto;
        var cphotoPath = "public/uploads/" + cphotoName;
        cphotoFile.mv(cphotoPath, function (err) {
          console.log(err);
        });
      } else {
        cphotoName = null;
      }
      // find the card in database and update it
      var requestid = req.params.requestid;
      Request.findOne({ _id: requestid }).exec(function (err, request) {
        // update this request to DBrequest.
        request.cname = cname;
        request.cemail = cemail;
        request.cphone = cphone;
        request.cunit = cunit;
        request.cdescription = cdescription;
        request.cphotoName = cphotoName;
        request.save();
        // thankYouType = "edited";
        // var thankYouMessage = { message: thankYouType };
        var message = "edited";
        res.render("thank-you", { message: message });
        //console.log(thankYouMessage);
      });
    }
  }
);

// setup admin
myApp.get("/setup", function (req, res) {
  let userData = [
    {
      uName: "admin",
      uPass: "admin",
    },
  ];
  User.collection.insertMany(userData);
  res.send("data added");
});

// start the server (listen at a port)
myApp.listen(8090);
console.log("Everything executed, open http://localhost:8090/ in the browser.");
