/**
 * Exports from controler.
 *
 * @type {{error: error, getBase: getBase, getMention: getMention, getAllMention: getAllMention,
 * insertMention: insertMention, putMention: putMention, removeMention: removeMention, insertFile: insertFile,
 * removeFile: removeFile, addMention: addMention, about: about, imprint: imprint, offline: offline,
 * register: register, login: login, doRegister: doRegister, doLogin: doLogin, doLogout: doLogout}}
 */
module.exports = {
    //error: error,

    getBase: getBase,
    getMention: getMention,
    getAllMention: getAllMention,

    insertMention: insertMention,
    putMention: putMention,
    removeMention: removeMention,

    insertFile: insertFile,
    removeFile: removeFile,

    addMention: addMention,
    about: about,
    imprint: imprint,
    offline: offline,

    register: register,
    login: login,

    doRegister: doRegister,
    doLogin: doLogin,
    doLogout: doLogout
};

/**
 * Grants access to Mention.
 */
const Mention = require('../models/mention');
/**
 * Grants access to User.
 */
const User = require('../models/user');
/**
 * Grants access to the filesystem.
 */
const fs = require('fs');
/**
 * Grants access to session.
 */
const session = require('express-session');
/**
 * Grants access to escape functionality.
 */
const escapeGoat = require('escape-goat');

// CRUD mention, images and voices

/**
 * Inserts a new mention.
 *
 * @param req The Request
 * @param res The Response
 */
function insertMention(req, res) {
    let mention = new Mention();

    mention.owner = req.session.userName;
    mention.caption = req.body.caption;
    mention.text = req.body.text;

    mention.save(function (err, newMention) {
        if (err) {
            res.send(406).end('insert Mention'); // not acceptable
        }

        res.status(200).end(JSON.stringify({id: mention.id})); // ok und ID
    })
}

/**
 * Edits an before created mention.
 *
 * @param req The Request
 * @param res The Response
 */
function putMention(req, res) {
    let belongsTo = req.body.updateID;
    let newCaption = req.body.caption;
    let newText = req.body.text;

    Mention.findById(belongsTo, (err, mention) => {
        if (err) {
            res.status(500).end(); // server error
        }

        if (mention) {
            if (newCaption.trim() !== '') {
                mention.caption = newCaption;
            }

            mention.text = newText;
            mention.save(function (err, user) {
                if (err) {
                    res.send(406).end('save Mention'); // not acceptable
                }

                res.status(200).end();
            });
        } else {
            res.status(406).end(); // not acceptable
        }
    });
}

/**
 * Removes an mention.
 *
 * @param req The Request
 * @param res The Response
 */
function removeMention(req, res) {
    Mention.findById(req.body.id, (err, mention) => {
            if (err) {
                res.status(500).end(); // server error
            }

            if (mention) {
                let belongsTo = mention.id;

                mention.image.forEach(img => {
                    fs.stat('./public/uploads/' + belongsTo + '__' + img, (err) => {
                        if (err == null) {
                            fs.unlink('./public/uploads/' + belongsTo + '__' + img, (err) => {
                                if (err) {
                                    res.status(500).end(); // server error
                                }
                            });
                        } else {
                            res.status(406).end(); // not acceptable
                        }
                    });
                });

                mention.voice.forEach(voc => {
                    fs.stat('./public/uploads/' + belongsTo + '__' + voc, (err) => {
                        if (err == null) {
                            fs.unlink('./public/uploads/' + belongsTo + '__' + voc, (err) => {
                                if (err) {
                                    res.status(500).end(); // server error
                                }
                            });
                        } else {
                            res.status(406).end(); // not acceptable
                        }
                    });
                });

                mention.remove(function (err) {
                    if (err) {
                        res.status(500).end(); // server error
                    }

                    res.status(200).end(); // ok
                });
            } else {
                res.status(406).end(); // not acceptable
            }
        }
    );
}

/**
 * Links a just uploaded file to an mention.
 *
 * @param req The Request
 * @param res The Response
 */
function insertFile(req, res) {
    let fileName = req.files.file[0].originalname;
    let belongsTo = req.body.id;
    let target = req.body.target.toLowerCase();

    Mention.findById(belongsTo, (err, mention) => {
        if (err) {
            res.status(500).end(); // server error
        }

        if (mention) {
            if (target === 'image') {
                mention.image.push(fileName);
            } else if (target === 'voice') {
                mention.voice.push(fileName);
            }
            mention.save(function (err, user) {
                if (err) {
                    res.send(500).end(); // server error
                }
            });

            res.status(200).end(); // ok
        } else {
            res.status(406).end(); // not acceptable
        }
    });
}

/**
 * Removes a link to a previously uploaded file and deletes the file.
 *
 * @param req The Request
 * @param res The Response
 */
function removeFile(req, res) {
    let fileName = req.body.file;
    let belongsTo = req.body.id;
    let target = req.body.target.toLowerCase();

    Mention.findById(belongsTo, (err, mention) => {
        if (err) {
            res.status(500).end(); // serverfehler
        }

        if (mention) {
            // We definitly want to remove the reference. Even in case of not finding the file.

            if (target === 'image') {
                mention.image.pull(fileName);
            } else if (target === 'voice') {
                mention.voice.pull(fileName);
            }

            mention.save(function (err, user) {
                if (err) {
                    res.send(500).end(); // server error
                }
            });

            fs.stat('./public/uploads/' + belongsTo + '__' + fileName, (err) => {
                if (err == null) {
                    fs.unlink('./public/uploads/' + belongsTo + '__' + fileName, (err) => {
                        if (err) {
                            res.status(500).end(); // server error
                        }
                    });
                } else {
                    res.status(406).end(); // not acceptable
                }
            });

            res.status(200).end(); // ok
        } else {
            res.status(406).end(); // not acceptable
        }
    });
}

// Methods to render something

/**
 * Renders the base page.
 *
 * @param req The Request
 * @param res The Response
 */
function getBase(req, res) {
    res.render('base');
}

/**
 * Renders an detail page of an mention.
 *
 * @param req The Request
 * @param res The Response
 */
function getMention(req, res) {
    Mention.findById(req.query.id, (err, mention) => {
        if (err) {
            res.status(500).end(); // server error
        }

        /*
        mention.owner = escapeGoat.unescape(mention.owner);
        mention.caption = escapeGoat.unescape(mention.caption);
        mention.text = escapeGoat.unescape(mention.text);
        */ // it works  but could be dangerous code

        res.render('view', {mention: mention});
    });
}

/**
 * Renders a page showing all mention.
 *
 * @param req The Request
 * @param res The Response
 */
function getAllMention(req, res) {
    Mention.find({}, function (err, mentions) {
        if (err) {
            res.status(500).end(); // server error
        }

        /*
        mentions.forEach((mention) => {
            mention.owner = escapeGoat.unescape(mention.owner);
            mention.caption = escapeGoat.unescape(mention.caption);
            mention.text = escapeGoat.unescape(mention.text);
        });
        */ // it works  but could be dangerous code

        res.render('view_all', {mentions: mentions});
        //res.status(200).end();
    })
}

/**
 * Renders a page to create a new mention.
 *
 * @param req The Request
 * @param res The Response
 */
function addMention(req, res) {
    res.render('add');
}

/**
 * Renders the about page.
 *
 * @param req The Request
 * @param res The Response
 */
function about(req, res) {
    res.render('about');
}

/**
 * Renders the imprint page.
 *
 * @param req The Request
 * @param res The Response
 */
function imprint(req, res) {
    res.render('imprint');
}

/**
 * Renders a offline page.
 *
 * @param req The Request
 * @param res The Response
 */
function offline(req, res) {
    res.render('offline');
}

/**
 * Renders a page for register a new User.
 *
 * @param req The Request
 * @param res The Response
 */
function register(req, res) {
    res.render('register');
}

/**
 * Renders a login page.
 *
 * @param req
 * @param res
 */
function login(req, res) {
    res.render('login');
}

// Actions to do something something

/**
 * Registers a concrete user.
 *
 * @param req The Request
 * @param res The Response
 */
function doRegister(req, res) {
    if (req.body.password !== req.body.passwordConf) {
        res.status(406).end('password'); // not acceptable
    }

    if (req.body.email && req.body.username && req.body.password) {
        let userData = {
            email: req.body.email,
            username: req.body.username,
            password: req.body.password
        };

        User.create(userData, function (err, user) {
            if (err) {
                res.status(406).end('duplicate'); // not acceptable
            } else {
                req.session.userId = user._id;
                res.status(200).end(); // ok
            }
        });
    }
    else {
        res.status(406).end('parameters'); // not acceptable
    }
}

/**
 * Executes the login process.
 *
 * @param req The Request
 * @param res The Response
 */
function doLogin(req, res) {
    if (req.body.username && req.body.password) {
        let userData = {
            username: req.body.username,
            password: req.body.password
        };

        User.authenticate(req.body.username, req.body.password, function (error, user) {
            if (error || !user) {
                res.status(401).end(); // no details :)
            } else {
                req.session.userId = user._id.id;
                req.session.userName = user.username;
                res.status(200).end(); // ok
            }
        });
    }
    else {
        res.status(401).end(); // no details :)
    }
}

/**
 * Executes the logout process.
 *
 * @param req The Request
 * @param res The Response
 */
function doLogout(req, res) {
    if (req.session) {
        req.session.destroy(function (err) {
            if (err) {
                res.status(500).end(); // server error
            } else {
                res.status(200).end(); // ok

            }
        });
    }
}



