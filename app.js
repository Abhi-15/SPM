require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const md5 = require("md5");

const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
	secret: "nothingsosecrethere",
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

const user_database = process.env.usr;
const courses_database = process.env.crs;
const courseuser_database = process.env.cus;

const users_connection = mongoose.createConnection(user_database, {useNewUrlParser: true});
const courses_connection = mongoose.createConnection(courses_database, {useNewUrlParser: true});
const courseuser_connection = mongoose.createConnection(courseuser_database, {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
	username: String,
	password: String
});

const courseSchema = {
	title: String,
	instructor: String,
	price: String,
	link: String
}

const courseuserSchema = {
	title: String,
	instructor: String,
	price: String,
	total_user: [String]
}

userSchema.plugin(passportLocalMongoose);

const User = users_connection.model("User", userSchema);
const Course = courses_connection.model("Course", courseSchema);
const CourseUser = courseuser_connection.model("CourseUser", courseuserSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

var isLoggedIn = "false";
var registered = "false";

app.get("/", function (req, res) {

	Course.find({}, function(err, foundItems){
		res.render("home", {isLoggedIn: isLoggedIn, courses: foundItems});
	});
});

app.get("/login", function(req, res){
	res.render("login");
});

app.get("/register", function(req, res){
	res.render("signup");
});

app.get("/add", function(req, res){

	if(req.isAuthenticated() && req.user.username === "admin"){
		res.render("compose", {isLoggedIn: isLoggedIn});
	}
	else{
		console.log("Please login as an admin");			
		res.redirect("/");
	}
});

app.get("/delete", function(req, res){

	if(req.isAuthenticated() && req.user.username === "admin"){

		Course.find({}, function(err, foundItems){
			res.render("remove", {isLoggedIn: isLoggedIn, courses: foundItems});
		});
	}
	else{
		console.log("Please login as an admin");
		res.redirect("/");
	}

});

app.get("/logout", function(req, res){
	req.logout();
	isLoggedIn = "false";
	res.redirect("/");
});

app.post("/titlen", function(req, res){
	const title = req.body.titleName;
	registered = "false";

	var username = ";a;,a;kasc''[{[.,>";
	
	if(isLoggedIn === "true"){
		username = req.user.username;
	}

	CourseUser.findOne({title: title}, function(err, foundItem){
		if(err){
			console.log(err);
		}
		else{
			var len = foundItem.total_user.length;
			// console.log(foundItem);

			for(var i=0; i<len; i++){
				if(username === foundItem.total_user[i]){
					registered = "true";
					break;
				}
			}

			Course.findOne({title: title}, function(err, foundItems){
				if(err){
					console.log(err);
				}
				else{
					res.render("course", {isLoggedIn: isLoggedIn, course: foundItems, registered: registered});
				}
			});
		}
	});
			
});

app.post("/search", function(req, res){

	const item = req.body.search_item;

	Course.find({title: item}, function(err, foundItems){
		if(!err){
			if(foundItems.length === 0){
				Course.find({instructor: item}, function(err, foundItemss){
					if(!err){
						if(foundItemss.length === 0){
							console.log("No results found");

							res.redirect("/");
						}
						else{
							res.render("home", {isLoggedIn: isLoggedIn, courses: foundItemss});
						}
					}
				});
			}
			else{
				res.render("home", {isLoggedIn: isLoggedIn, courses: foundItems});
			}
		}
	});
});

app.post("/login", function(req, res){
	const user = new User({
		username: req.body.username,
		password: req.body.password
	});

	req.login(user, function(err){
		if(err){
			console.log(err);
		}	
		else{	
			passport.authenticate("local")(req, res, function(){
				isLoggedIn = "true";
				res.redirect("/");
			});
		}
	});
});

app.post("/register", function(req, res){
	const username = req.body.username;
	const password = req.body.password;
	const repeat_password = req.body.repeat_password;
	
	if(password === repeat_password){
	
		User.register({username: username}, password, function(err, user){
			if(err){
				console.log(err);
				res.redirect("/register");
			}
			else{
				passport.authenticate("local")(req, res, function(){
					res.redirect("/login");
				});
			}
		});

	}
	else{
		res.redirect("/register");
	}	
		
});

app.post("/add", function(req, res){

	if(req.isAuthenticated() === "false"){
		console.log("Please login as an admin");		
	}

	else if(req.user.username === "admin"){

		const course_title = req.body.title;
		const course_instructor = req.body.instructor;
		const course_price = req.body.price;
		const link = req.body.link;

		const course = new Course({
			title: course_title,
			instructor: course_instructor,
			price: course_price,
			link: link
		});

		const courseuser = new CourseUser({
			title: course_title,
			instructor: course_instructor,
			price: course_price,
			total_user: []
		});

		course.save();
		courseuser.save();
	}

	res.redirect("/");
});

app.post("/delete", function(req, res){
	var checkedCourseId = req.body.id;
	let title;

	if(!req.isAuthenticated()){
		console.log("Please login as an admin");	
	}

	else if(req.user.username === "admin"){

		Course.findById(checkedCourseId, function(err, foundCourse){
			if(err){
				console.log(err);
			}
			else{
				
				CourseUser.findOne({title: foundCourse.title}, function(err, foundCoursee){
					if(err){
						console.log(err);
					}
					else{

						CourseUser.findByIdAndRemove(foundCoursee._id, function(err){
							if(err){
								console.log(err);
							}
						});
					}
				});				
			}
		});

		Course.findByIdAndRemove(req.body.id, function(err){
			if(err){
				console.log(err);
			}
		});
			
	}

	res.redirect("/");

});

app.post("/payment", function(req, res){
	
	if(isLoggedIn === "false"){
		console.log("Please LogIn");
		res.redirect("/login");
	}

	else{
		const title = req.body.title;
		const username = req.user.username;

		CourseUser.findOne({title: title}, function(err, foundItem){
			if(err){
				console.log(err);
			}
			else{
				foundItem.total_user.push(username);
				foundItem.save();

				console.log("Okay, So you (" + username + ") have signedUp for " + title);
			}
		});

		res.redirect("/");		
	}
	
});

let port = process.env.PORT ;

if(port == null || port == " "){
	port = 3000;
}

app.listen(port, function(){
	console.log("Server is running on port 3000");
});