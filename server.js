// Dependencies

var express = require("express");
var method = require("method-override");
var body = require("body-parser");
var exphbs = require("express-handlebars");
var mongoose = require("mongoose");
var logger = require("morgan");
var cheerio = require("cheerio");
var request = require("request");

// Mongoose
var Note = require("./models/Note");
var Article = require("./models/Article");

// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI);


// var databaseUrl = 'mongodb://localhost/mongoHeadlines';
// if (process.env.MONGODB_URI) {
// 	mongoose.connect(process.env.MONGODB_URI);
// }
// else {
// 	mongoose.connect(databaseUrl);
// }

// mongoose.Promise = Promise;
// var db = mongoose.connection;

// db.on("error", function(error) {
// 	console.log("Mongoose Error: ", error);
// });

// db.once("open", function() {
// 	console.log("Mongoose connection successful.");
// });


var app = express();
var port = process.env.PORT || 3000;


var app = express();
var port = process.env.PORT || 3000;

// app set-ups
app.use(logger("dev"));
app.use(express.static("public"));
app.use(body.urlencoded({extended: false}));
app.use(method("_method"));
app.engine("handlebars", exphbs({defaultLayout: "main"}));
app.set("view engine", "handlebars");

app.listen(port, function() {
	console.log("Listening on port " + port);
});


// Creating Routes
// Home page
app.get("/", function(req, res) {
	Article.find({}, null, {sort: {created: -1}}, function(err, data) {
		if(data.length === 0) {
			res.render("placeholder", {message: "There's nothing scraped yet!! \n Please click \"Scrape For Newest Articles\" for fresh and delicious news."});
		}
		else{
			res.render("index", {articles: data});
		}
	});
});


// scrape route
app.get("/scrape", function(req, res) {
	request("https://www.nytimes.com/section/technology", function(error, response, html) {
	var $ = cheerio.load(html);

	$("div.story-body").each(function(i, element) {
		var link = $(element).find("a").attr("href");
		var title = $(element).find("h2.headline").text().trim();
		var summary = $(element).find("p.summary").text().trim();
		var img = $(element).find(".wide-thumb").find("img").attr("src");
			

      var result = {
        link: link,
        title: title,
        summary: summary,
        img: img
      };
      
      var entry = new Article(result);
      console.log(result);
			Article.find({title: result.title}, function(err, data) {
				if (data.length === 0) {
          //save is used instead of create
					entry.save(function(err, data) {
						if (err) throw err;
					});
				}
			});
		});
		console.log("Scrape finished.");
		res.redirect("/");
	});
});

// saved route
app.get("/saved", function(req, res) {
	Article.find({issaved: true}, null, {sort: {created: -1}}, function(err, data) {
		if(data.length === 0) {
			res.render("placeholder", {message: "You have not saved any articles yet. Click \"Save Article\" to add some!"});
		}
		else {
			res.render("saved", {saved: data});
		}
	});
});


app.get("/:id", function(req, res) {
	Article.findById(req.params.id, function(err, data) {
		res.json(data);
	});
});



app.post("/save/:id", function(req, res) {
	Article.findById(req.params.id, function(err, data) {
		if (data.issaved) {
			Article.findByIdAndUpdate(req.params.id, {$set: {issaved: false, status: "Save Article"}}, {new: true}, function(err, data) {
				res.redirect("/");
			});
		}
		else {
			Article.findByIdAndUpdate(req.params.id, {$set: {issaved: true, status: "Saved"}}, {new: true}, function(err, data) {
				res.redirect("/saved");
			});
		}
	});
});


app.post("/note/:id", function (req, res) {
  var note = new Note(req.body);
  console.log(note);
  console.log(req.body);
  note.save(function (err, doc) {
    if (err) throw err;
    Article.findByIdAndUpdate(req.params.id, { $set: { "note": doc._id } }, { new: true }, function (err, newdoc) {
      if (err) throw err;
      else {
        res.send(newdoc);
      }
    });
  });
});

app.get("/note/:id", function(req, res) {
	var id = req.params.id;
	Article.findById(id).populate("note").exec(function(err, data) {
		res.send(data.note);
	});
});