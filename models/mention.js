/**
 * Grants access to Mongoose.
 */
const mongoose = require('mongoose');
/**
 * Grants access to specialized mogoose sanitize functionalities.
 */
const sanitize = require('mongo-sanitize');
/**
 * Grants access to escape functionality.
 */
const escapeGoat = require('escape-goat');

/**
 * Defines a mongoose schema of an mention object.
 */
const mentionSchema = mongoose.Schema({ // also applicates some tests and sanitizes
    owner: {
        type: String,
        required: true,
        maxlength: 20,
        trim: true
    },
    caption: {
        type: String,
        required: true,
        maxlength: 250,
        trim: true
    },
    text: {
        type: String,
        required: false,
        maxlength: 1000,
        trim: true
    },
    image: [{
        type: String,
        required: false,
        maxlength: 250,
        trim: true
    }],
    voice: [{
        type: String,
        required: false,
        maxlength: 250,
        trim: true
    }]
});

/**
 * Defines a pre-save handler for the monggos schema of an mention. In it, some sanitizing will be done.
 */
mentionSchema.pre('save', function (next) { // applicate some tests
    try {
        let mention = this;

        let tmp_owner = sanitize(escapeGoat.escape(mention.owner.trim()));
        if (tmp_owner === '') {
            next('owner');
        }

        let tmp_caption = sanitize(escapeGoat.escape(mention.caption.trim()));
        if (tmp_caption === '') {
            next('caption');
        }

        let tmp_text = sanitize(escapeGoat.escape(mention.text.trim()));

        validImages = ['.jpg', '.jpeg', '.bmp', '.txt', '.png'];
        validVoices = ['.mp3', '.mpg', '.mpeg', '.wav'];

        let tmp_image = [];
        mention.image.forEach((item) => {
            item = escapeGoat.escape(item);

            let fileExt = item.substring(item.lastIndexOf('.')).toLowerCase();
            if (validImages.indexOf(fileExt) < 0) {
                next('file');
            } else {
                tmp_image.push(sanitize(item));
            }
        });


        let tmp_voice = [];
        mention.voice.forEach((item) => {
            item = escapeGoat.escape(item);

            let fileExt = item.substring(item.lastIndexOf('.')).toLowerCase();
            if (validVoices.indexOf(fileExt) < 0) {
                next('file');
            } else {
                tmp_voice.push(sanitize(item));
            }
        });

        mention.owner = tmp_owner;
        mention.caption = tmp_caption;
        mention.text = tmp_text;
        mention.image = tmp_image;
        mention.voice = tmp_voice;

        next();
    }
    catch (e) {
        next(mention)
    }
});

/**
 * Exports from mention.
 *
 * @type {Model}
 */
let mention = mongoose.model('Mention', mentionSchema);
module.exports = mention;
