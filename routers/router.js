/**
 * Grants access to methods defiened by the controller.js.
 */
const controller = require("../controllers/controller");
/**
 * Grants access to express.
 */
const express = require('express');
/**
 * Grants access to the express Router object.
 */
const router = express.Router();
/**
 * Grants access to multer lib.
 */
const multer = require('multer');

/**
 * Defines a multer storage used for uploading files.
 */
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, req.body.id + "__" + file.originalname)
    }
});

/**
 * Grants access to the multer storage.
 */
const upload = multer({storage: storage});
/**
 * Middleware. Grants access via the multer lib. Uses a multer storage to uplead a file.
 */
const cpUploadFiles = upload.fields([{name: 'file', maxCount: 10}, {name: 'voice', maxCount: 10}]);
/**
 * Middleware. Grants access via the multer lib. Allows easy access to values of a form data objects.
 */
const cpUploadTextOnly = upload.none();

/**
 *  A small middleware to check wether a user is loged in or not.
 *
 * @param req The Request
 * @param res The Response
 * @param next The next-object
 * @returns {*}
 */
function requiresLogin(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    } else {
        res.status(401).end(); // unauthorized
    }
}

router.route('/').get(controller.getBase); // request for the base page (the outer frame of the app)
router.route('/all').get(requiresLogin, controller.getAllMention); // request for the home page (the ones with all mentions)
router.route('/mention').get(requiresLogin, controller.getMention); // request for the detail page (one mention)

router.route('/add').get(requiresLogin, controller.addMention); // request for the add page
router.route('/about').get(controller.about); // request for the about page
router.route('/imprint').get(controller.imprint); // request for the imprint page
router.route('/offline').get(controller.offline); // request for the imprint page

router.route('/login').get(controller.login); // request for the login page
router.route('/register').get(controller.register); // request for the register page

router.route('/mention').post(requiresLogin, cpUploadTextOnly, controller.insertMention); // create a new mention
router.route('/mention').put(requiresLogin, cpUploadTextOnly, controller.putMention); // update a certain mention
router.route('/mention').delete(requiresLogin, cpUploadTextOnly, controller.removeMention); // delete a certain mention

router.route('/voice').post(requiresLogin, cpUploadFiles, controller.insertFile); // insert a voice file
router.route('/voice').delete(requiresLogin, cpUploadTextOnly, controller.removeFile); // delete a voice file

router.route('/image').post(requiresLogin, cpUploadFiles, controller.insertFile); // insert a voice file
router.route('/image').delete(requiresLogin, cpUploadTextOnly, controller.removeFile); // delete a voice file

router.route('/register').post(cpUploadTextOnly, controller.doRegister); // execute register
router.route('/login').post(cpUploadTextOnly, controller.doLogin); // execute login
router.route('/logout').post(requiresLogin, controller.doLogout); // execute logout

/**
 * Export from router.
 *
 * @type {Router}
 */
module.exports = router;
