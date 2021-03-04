/**
 * Grants access to Mongoose.
 */
const mongoose = require('mongoose');
/**
 * Grants acces to decrytion and encryption functionality.
 */
const bcrypt = require('bcrypt');
/**
 * Grants access to specialized mogoose sanitize functionalities.
 */
const sanitize = require('mongo-sanitize');
/**
 * Grants access to escape functionality.
 */
const escapeGoat = require('escape-goat');

/**
 * Defines a mongoose schema of an user object.
 */
const userSchema = new mongoose.Schema({ // also applicates some tests and sanitizes
    email: {
        type: String,
        unique: true,
        required: true,
        maxlength: 20,
        trim: true
    },
    username: {
        type: String,
        unique: true,
        required: true,
        maxlength: 20,
        trim: true
    },
    password: {
        type: String,
        unique: true,
        required: true,
        maxlength: 20
    }
});

/**
 * Handles authentication.
 *
 * @param username The username
 * @param password The given password
 * @param callback A callback function. Returns the user if authentication was succesful otherwise an error.
 */
userSchema.statics.authenticate = function (username, password, callback) { //authenticate input against database
    user.findOne({username: username})
        .exec(function (err, user) {
            if (err) {
                return callback(err)
            } else if (!user) {
                let err = new Error('User not found.');
                err.status = 401;

                return callback(err);
            }

            bcrypt.compare(password, user.password, function (err, result) {
                if (result === true) {
                    return callback(null, user);
                } else {
                    return callback();
                }
            })
        });
};

/**
 * Defines a pre-save handler for the monggos schema of a user. In it, some sanitizing will be done.
 */
userSchema.pre('save', function (next) { // applicate some tests
    try {
        let user = this;

        // https://stackoverflow.com/questions/46155/how-to-validate-an-email-address-in-javascript
        let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        valid_email = re.test(user.email);
        if (!valid_email) {
            return next('email')
        } else {
            tmp_email = String(sanitize(escapeGoat.escape(user.email))).toLowerCase().trim();
            user.email = tmp_email;
        }

        let tmp_username = String(sanitize(escapeGoat.escape(user.username))).toLowerCase().trim();
        if (tmp_username === '') {
            return next('name')
        } else {
            user.username = tmp_username;
        }

        let tmp_password = String(sanitize(escapeGoat.escape(user.password))).toLowerCase().trim();
        bcrypt.hash(user.password, 10, function (err, hash) {
            if (err) {
                return next(err);
            }

            user.password = hash;
            next();
        });
    }
    catch (e) {
        next('pwd')
    }
});

/**
 * Exports from user.
 *
 * @type {Model}
 */
let user = mongoose.model('User', userSchema);
module.exports = user;