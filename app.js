/**
 * Grants access to the express Router object.
 */
const express = require('express');
/**
 * Grants access to the path lib.
 */
const path = require('path');
/**
 * Grants access to the cookie parser lib.
 */
const cookieParser = require('cookie-parser');
/**
 * Grants access to the body parser lib.
 */
const bodyParser = require('body-parser');
/**
 * Grants access to express's session lib.
 */
const session = require('express-session');
/**
 * Grants access to Mongoose.
 */
const mongoose = require('mongoose');
/**
 * Grants access to the former jade template lib (by now pug).
 */
const pug = require('pug');

/**
 * Grands access to helmet (recommended lib to prevent vulnerability).
 */
const helmet = require('helmet');

// Creates an express server and grants access.
const app = express(); // encapsulate server
app.use(helmet());

// Sets the view engine which to use with express.
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Sets public pathes which to use with express.
app.use(express.static(__dirname + '/public/images'));
app.use(express.static(__dirname + '/public/javascripts'));
app.use(express.static(__dirname + '/public/bootstrap'));
app.use(express.static(__dirname + '/public/dexie'));
app.use(express.static(__dirname + '/public/manifest'));
app.use(express.static(__dirname + '/public/uploads'));

// Tells mongoose which database should be used.
mongoose.connect('mongodb://127.0.0.1/mentiondb');

// Sets body parser to simplify access to parameters.
app.use(bodyParser.urlencoded({extended: false}));

// Middleware. Sets cookie and session.
app.use(cookieParser());
app.use(session({
    secret: 'geheimer Schlüssel',
    resave: true,
    saveUninitialized: false
}));

// Middleware. Grants access to the route object defined in router.js and pasre the incomming calls tio it.
const router = require(path.join(__dirname, 'routers/router'));
app.use('/', router);

// Starts the Server.
app.listen(8080, function () {
    console.log("Server verarbeitet Port 8080")
});

