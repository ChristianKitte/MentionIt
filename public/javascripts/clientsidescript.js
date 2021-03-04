/**
 * Defines routes which allways have to be get from cach.
 *
 * @type {string[]} The routes
 */
let forceOffline = ['/about', '/imprint', '/offline'];

/**
 * Defines routes which allways have to be get from cach after login.
 *
 * @type {string[]} The routes
 */
let forceLogInOffline = ['/add'];

/**
 * Defines routes which never have to be get from cach.
 *
 * @type {string[]} The routes
 */
let forceOnline = ['/login', '/register'];

/**
 * Holds a IndexedDB.
 */
let offlineDB;

/**
 * Holds a web worker instance.
 */
let synWorker;

/**
 * Indicates wheter the user is logged in or not.
 *
 * @type {boolean} True if available
 */
let loggedIn = false;

/**
 * Stores the availability of web storrage.
 *
 * @type {boolean} True if available
 */
let storeage = true;

/**
 * Stores the availability of IndexedDB.
 *
 * @type {boolean} True if available
 */
let indexDB = true;

/**
 * Stores the availability of web worker.
 *
 * @type {boolean} True if available
 */
let worker = true;

/**
 * Checks wheter storrage is available or not.
 */
if (typeof(Storage) === "undefined") {
    storeage = false;
    alert('WebStorages sind nicht verfügbar !')
}

/**
 * Checks wheter IndexedDB is available or not.
 */
if (!window.indexedDB) {
    indexDB = false;
    window.alert('IndexedDB ist nicht verfügbar');
} else {
    recreateDB();
}

/**
 * Creates a new IndexedDB (will be called at every reload).
 */
function recreateDB() {
    // We want to use a new database each time we run the application.
    Dexie.delete('offlineDB');
    offlineDB = new Dexie("offlineDB");

    offlineDB.version(1).stores({
        actions: "key,owner,action,target,data"
    });

    offlineDB.open().catch((err) => {
        window.alert('Die vorhandene IndexedDB kann nicht geöffnet werden');
    });
}

/**
 * Checks wheter a web worker is available or not.
 */
if (typeof(Worker) === "undefined") {
    worker = false;
    alert('WebWorker sind nicht verfügbar !')
}

/**
 * Adds an event handler to "load" event of the document. The handler includes code to perfom an worker thread.
 */
window.addEventListener('load', function () {
    forceOffline.forEach((item) => {
        getCacheContentFor(item);
    });

    /**
     * A handler which runs if the online state has changed. If Offline he does some layoutwork and saves
     * the last request. If Online again he'll perfom an synchronization.
     *
     * @param event The event
     */
    function onOffLineHandler(event) {
        if (navigator.onLine) { // online
            if (worker && indexDB) {
                synWorker = new Worker('/offlineworker.js');

                synWorker.onmessage = (event) => {
                    if (event.data.substring(0, 5) === 'Fehler') {
                        synWorker.terminate();
                        synWorker = undefined;

                        alert(event.data);
                        document.title = "MentionIT";
                        openHome();
                    }
                };
            }

            document.title = 'MentionIT';
            sessionStorage.clear();
            toggleMenue();
        } else { // offline
            document.title = 'MentionIT - Offline';
            toggleMenue();

            let lastGetCall_route = sessionStorage.getItem('lastGetCall_route');
            if (lastGetCall_route && lastGetCall_route === '/add') { // no add if offline
                openHome();
            }
        }
    }

    window.addEventListener('online', onOffLineHandler);
    window.addEventListener('offline', onOffLineHandler);
});

/**
 * Adds an event handler to "beforeunload" event of the document.
 */
window.addEventListener('beforeunload', function (evt) {
    let message = 'Sie verlassen nun diese Seite';

    if (typeof evt === 'undefined') {
        evt = window.event;
    }

    if (evt) {
        evt.returnValue = message;
    }

    return message;
});

/**
 * Checks wether the first password fits the second password.
 */
function validatePWDConf() {
    pwd = $('#password').val();
    pwdConf = $('#passwordConf').val();

    if (pwd === pwdConf) {
        $('#passwordConf').removeClass('is-invalid');
        $('#passwordConf').addClass('is-valid');
    } else {
        $('#passwordConf').removeClass('is-valid');
        $('#passwordConf').addClass('is-invalid');
    }
}

/**
 * Performs the las request again.
 */
function runLastGetRequest() {
    let lastGetCall_route = sessionStorage.getItem('lastGetCall_route');
    let lastGetCall_contentFor = sessionStorage.getItem('lastGetCall_contentFor');
    let lastGetCall_useURL = sessionStorage.getItem('lastGetCall_useURL');
    let lastGetCall_success = sessionStorage.getItem('lastGetCall_success');
    let lastGetCall_error = sessionStorage.getItem('lastGetCall_error');

    if (lastGetCall_route)
        getContentFor(lastGetCall_route, lastGetCall_contentFor, lastGetCall_useURL, lastGetCall_success, lastGetCall_error);
}

/**
 * Responsible for set the navbar.
 */
function toggleMenue() {
    if (navigator.onLine) {
        $('.navbar-brand').text('MentionIT').removeClass('text-warning');

        // toggle upload and active view for images and voices  ==> no add for image, voice
        $('#fileImageUpload').attr('hidden', false);
        $('#fileVoiceUpload').attr('hidden', false);

        if (loggedIn) {
            $('#logout').attr('hidden', false);
            $('#openLogin').attr('hidden', true);
            $('#openRegister').attr('hidden', true);
        }
        else {
            $('#logout').attr('hidden', true);
            $('#openLogin').attr('hidden', false);
            $('#openRegister').attr('hidden', false);
        }
    }
    else {
        $('.navbar-brand').text('MentionIT - Offline').addClass('text-warning');

        // toggle upload and active view for images and voices  ==> no add for image, voice
        $('#fileImageUpload').attr('hidden', true);
        $('#fileVoiceUpload').attr('hidden', true);

        if (loggedIn) {
            $('#logout').attr('hidden', false);
            $('#openLogin').attr('hidden', true);
            $('#openRegister').attr('hidden', true);
        }
        else {
            $('#logout').attr('hidden', true);
            $('#openLogin').attr('hidden', true);
            $('#openRegister').attr('hidden', true);
        }
    }
}

/**
 * Synchronizes page and navbar.
 *
 * @param page The currently active page
 */
function setNavBar(page) {
    if (page !== '') {
        $('ul li.nav-item').removeClass('active');
        $('li.' + page).addClass('active');
    } else {
        $('ul li.nav-item').removeClass('active');
    }
}

/**
 * Insert an item into IndexedDB if in offline-Mode.
 *
 * @param key A unique key
 * @param owner The id of an mention
 * @param action The action (add, delete, update)
 * @param target The target (mention, image, voice)
 * @param data A json object with all needed date
 */
function insertIntoDB(key, owner, action, target, data) { // data as JSON
    // there's no need to clear older updates because they will be replaced each time.

    let item = {key: key, owner: owner, action: action, target: target, data: data};

    if (target === 'mention' && action === 'delete') {
        // search for posible statemant for this very mention before and remove if one exists
        let delItem = offlineDB.actions.where('owner').equals(owner);
        delItem.delete();

        // However the mention could be a previously added item. Therefore have a look at the
        // server to be sure.
        offlineDB.actions.put(item);
    }
    else {
        offlineDB.actions.put(item);
    }
}

/**
 *  Catches the add form and prevent it from being submited.
 *
 * @param evt The event.
 */
function catchAddMentionForm(evt) {
    evt.preventDefault();

    let caption = document.querySelector("#addCaption").value;
    let text = document.querySelector("#addText").value;

    let data = new FormData();
    data.append("caption", caption);
    data.append("text", text);

    if (navigator.onLine) { // Online
        postContentFor('/mention', data, function (respText) {
            let mention = JSON.parse(respText);
            let id = mention.id;
            openMention(id);
        })
    }
    else { // Offline
        //http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
        tmpID = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        UpdateData = {
            'caption': caption,
            'text': text
        };

        insertIntoDB('mentionAdd' + tmpID, tmpID, 'add', 'mention', JSON.stringify(UpdateData));
        addCacheMention(tmpID, caption, text);
    }
}

/**
 *  Catches the update form and prevent it from being submited.
 *
 * @param evt The event.
 */
function catchUpdateMentionForm(evt) {
    evt.preventDefault();

    let belongsTo = document.querySelector("#updateID").innerHTML;
    let caption = document.querySelector("#updateCaption").value;
    let text = document.querySelector("#updateText").value;

    let data = new FormData();
    data.append("updateID", belongsTo);
    data.append("caption", caption);
    data.append("text", text);

    if (!navigator.onLine) { // Offline
        // 1 insert into db
        // 2 delete cache for mention in detail
        // 3 delete node for mention in all and save back
        UpdateData = {
            'id': belongsTo,
            'caption': caption,
            'text': text
        };

        insertIntoDB('mentionUpd' + belongsTo, belongsTo, 'update', 'mention', JSON.stringify(UpdateData));
        updateCachedMentionText(belongsTo, caption, text);
    }
    else { // Online
        putContentFor('/mention', data, function (respText) {
            openMention(document.querySelector("#updateID").innerHTML);
        })
        //sessionStorage.removeItem('/all');
    }
}

/**
 * Updates the showing number of files.
 *
 * @param owner The temporary id of an mention
 * @param type The typ of file (image or voice
 * @param add A number which will be added to the current number
 */
function updateCachedMentionFileCounts(owner, type, add) {
    let g = document.createElement('div');
    g.setAttribute('id', 'content');
    g.innerHTML = sessionStorage.getItem('/all');

    let doc = document.createDocumentFragment();
    doc.appendChild(g);

    if (type === 'image') {
        let currentObject = doc.getElementById('imageCount__' + owner);
        //'Bilder : ' + val.image.length
        let currentNumber = parseInt(currentObject.innerText.substring(8).trim());
        let newNumber = currentNumber + add;
        currentObject.innerText = 'Bilder : ' + newNumber.toString();
    }
    else if (type === 'voice') {
        let currentObject = doc.getElementById('voiceCount__' + owner);
        //'Sprachnachrichten : ' + val.voice.length
        let currentNumber = parseInt(currentObject.innerText.substring(20).trim());
        let newNumber = currentNumber + add;
        currentObject.innerText = 'Sprachnachrichten : ' + newNumber.toString();
    }

    sessionStorage.setItem('/all', g.innerHTML);
    sessionStorage.setItem('/mention?id=' + owner, document.getElementById('content').innerHTML);
}

/**
 * Perform an update with cached content.
 *
 * @param owner The temporary id of an mention
 * @param caption It's caption
 * @param text It's Text
 */
function updateCachedMentionText(owner, caption, text) {
    g = document.createElement('div');
    g.setAttribute('id', 'content');

    // all view
    g.innerHTML = sessionStorage.getItem('/all');

    doc = document.createDocumentFragment();
    doc.appendChild(g);

    captionText = doc.getElementById('caption__' + owner);
    bodyText = doc.getElementById('body__' + owner);

    captionText.innerText = caption;
    bodyText.innerText = text;

    sessionStorage.setItem('/all', g.innerHTML);

    // detail view (we are on a detail page...)
    g.innerHTML = sessionStorage.getItem('/mention?id=' + owner);

    doc = document.createDocumentFragment();
    doc.appendChild(g);

    doc.getElementById('updateCaption').setAttribute('placeholder', caption);
    doc.getElementById('updateCaption').setAttribute('value', caption);
    doc.getElementById('updateText').innerText = text;

    sessionStorage.setItem('/mention?id=' + owner, doc.getElementById('content').innerHTML);
}

/**
 * Removes a cached mention from the cache.
 *
 * @param owner ID of an mention
 */
function removeCachedMention(owner) {
    g = document.createElement('div');
    g.setAttribute('id', 'content');
    g.innerHTML = sessionStorage.getItem('/all');

    doc = document.createDocumentFragment();
    doc.appendChild(g);

    mentionContainer = doc.getElementById(owner).parentElement;
    mentionContainer.remove();

    sessionStorage.setItem('/all', g.innerHTML);
    sessionStorage.removeItem("/mention?id=" + owner);
}

/**
 * Adds an offline created mention to the app.
 *
 * @param owner The temporary id of an mention
 * @param caption It's caption
 * @param text It's Text
 */
function addCacheMention(owner, caption, text) {
    if (caption === undefined || caption.trim().length === 0) {
        alert('Es wurde keine Überschrift vergeben!');
        return;
    }

    addCacheMentionToALL(owner, caption, text);
    addCacheMentionToDetail(owner, caption, text);
}

/**
 * Adds an offline created mention to the app. Here: Adds it to the Basepage.
 *
 * @param owner The temporary id of an mention
 * @param caption It's caption
 * @param text It's Text
 */
function addCacheMentionToALL(owner, caption, text) {
    let template = document.querySelector('#cardTemplate');
    let clone = document.importNode(template.content, true);

    clone.querySelector('#ID').setAttribute('id', owner);

    let item1 = clone.querySelector('#caption__ID');
    item1.setAttribute('id', 'caption__' + owner);
    item1.innerText = caption;

    let item2 = clone.querySelector('#body__ID');
    item2.setAttribute('id', 'body__' + owner);
    item2.innerText = text;

    clone.querySelector('#imageCount__ID').setAttribute('id', 'imageCount__' + owner);
    clone.querySelector('#voiceCount__ID').setAttribute('id', 'voiceCount__' + owner);

    clone.querySelector('#deleteMentionLink__ID').setAttribute("onClick", "deleteMention('" + owner + "');");
    clone.querySelector('#deleteMentionLink__ID').setAttribute('id', 'deleteMentionLink__' + owner);

    clone.querySelector('#openMentionLink__ID').setAttribute("onClick", "openMention('" + owner + "');");
    clone.querySelector('#openMentionLink__ID').setAttribute('id', 'openMentionLink__' + owner);

    g = document.createElement('div');
    g.setAttribute('id', 'content');

    // all view
    g.innerHTML = sessionStorage.getItem('/all');

    doc = document.createDocumentFragment();
    doc.appendChild(g);
    doc.querySelector('div.card-columns').appendChild(clone);

    sessionStorage.setItem('/all', doc.getElementById('content').innerHTML);
}

/**
 * Adds an offline created mention to the app. Here: Adds a detail page.
 *
 * @param owner The temporary id of an mention
 * @param caption It's caption
 * @param text It's Text
 */
function addCacheMentionToDetail(owner, caption, text) {
    let template = document.querySelector('#detailTemplate');
    let clone = document.importNode(template.content, true);

    clone.querySelector('#updateID').innerText = owner;
    clone.querySelector('#updateCaption').setAttribute('placeholder', caption);
    clone.querySelector('#updateCaption').setAttribute('value', caption);
    clone.querySelector('#updateText').innerText = text;

    clone.querySelector('#deleteDetailMention').setAttribute("onClick", "deleteMention('" + owner + "');");

    g = document.createElement('div');
    g.setAttribute('id', 'content');

    doc = document.createDocumentFragment();
    doc.appendChild(g);
    doc.querySelector('#content').appendChild(clone);

    sessionStorage.setItem('/mention?id=' + owner, doc.getElementById('content').innerHTML);
}

/**
 *  Catches the register form and prevent it from being submited.
 *
 * @param evt The event.
 */
function catchRegisterForm(evt) {
    evt.preventDefault();

    let data = new FormData();
    data.append("email", document.querySelector("#email").value);
    data.append("username", document.querySelector("#username").value);
    data.append("password", document.querySelector("#password").value);
    data.append("passwordConf", document.querySelector("#passwordConf").value);

    postContentFor('/register', data, function (respText) {
        toggleMenue(true);
        openHome();
    })
}

/**
 * Catches the login form and prevent it from being submited.
 *
 * @param evt The event.
 */
function catchLoginForm(evt) {
    evt.preventDefault();

    let data = new FormData();
    data.append("username", document.querySelector("#username").value);
    data.append("password", document.querySelector("#password").value);

    postContentFor('/login', data, function (respText) {
        loggedIn = true;

        forceLogInOffline.forEach((item) => {
            getCacheContentFor(item);
        });

        openHome();
        toggleMenue();
    })
}

/**
 * Performs a delete request for a mention.
 *
 * @param id The ID of an mention
 */
function deleteMention(id) {
    let data = new FormData();
    data.append("id", id);

    if (!navigator.onLine) { // Offline
        // 1 insert into db
        // 2 delete cache for mention in detail
        // 3 delete node for mention in all and save back

        UpdateData = {
            'id': id
        };
        insertIntoDB('mentionDel' + id, id, 'delete', 'mention', JSON.stringify(UpdateData));

        sessionStorage.removeItem("/mention?id=" + id);
        removeCachedMention(id);

        openHome();
    }
    else { // Online
        deleteContentFor('/mention', data, function (respText) {
            sessionStorage.removeItem("/mention?id=" + id); // to be uptodate
            openHome();
        })
    }
}

/**
 * Opens the main page with all mentions.
 */
function openHome(success, error) {
    setNavBar('openHome');
    getContentFor('/all', 'content', true, success, error);
}

/**
 * Opens a page where you can add a new mention.
 */
function openAddMention() {
    setNavBar('openAddMention');
    getContentFor('/add', 'content', true, function () {
        let addMentionForm = document.getElementById('addMentionForm');
        if (addMentionForm) {
            addMentionForm.addEventListener("submit", catchAddMentionForm);
        }
    });
}

/**
 * Opens the datailpage of a mention.
 *
 * @param id ID of a mention
 */
function openMention(id) {
    setNavBar('');
    getContentFor("/mention?id=" + id, 'content', true, function () {
        let updateMentionForm = document.getElementById('updateMentionForm');
        if (updateMentionForm) {
            updateMentionForm.addEventListener("submit", catchUpdateMentionForm);
        }

        if (!navigator.onLine) { // offline
            $('#fileImageUpload').attr('hidden', true); // toggle visibility
            $('#fileVoiceUpload').attr('hidden', true); // toggle visibility
        }
    });
}

/**
 * Opens the about page.
 */
function openAbout() {
    setNavBar('openAbout');
    getContentFor('/about', 'content', true);
}

/**
 * Opens the Imprint.
 */
function openImprint() {
    setNavBar('openImprint');
    getContentFor('/imprint', 'content', true);
}

/**
 * Opens a login page.
 */
function openLogin() {
    getContentFor('/login', 'content', true, function () {
            let loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.addEventListener("submit", catchLoginForm);
            }
        }, function () {
            openLogin();
        }
    )
}

/**
 * Opens an register site.
 */
function openRegister() {
    getContentFor('/register', 'content', true, function () {
            let registerForm = document.getElementById('registerForm');
            if (registerForm) {
                registerForm.addEventListener("submit", catchRegisterForm);
            }
        }, function () {
            openRegister();
        }
    )
}

/**
 * Performs a logout.
 */
function logout() {
    postContentFor('/logout', null, function (respText) {
        // to prevent spying
        loggedIn = false;
        sessionStorage.clear();

        toggleMenue();
    });

    if (navigator.onLine) {
        openLogin();
    }
    else {
        //easy say goodbye :)
        let contentBlock = document.getElementById('content');
        contentBlock.innerHTML = "<p>Goodbye...</p>";

        toggleMenue();
    }
}

/**
 * Uploads an file.
 *
 * @param source Defines wether its an image or a voice
 */
function addFile(source) {
    let target = "";
    let validExts;

    if (source === 0) {
        target = "Image";
        validExts = ['.jpg', '.jpeg', '.bmp', '.txt', '.png'];
    } else if (source === 1) {
        target = "Voice";
        validExts = ['.mp3', '.mpg', '.mpeg', '.wav'];
    }

    let myFile = document.querySelector('#new' + target).files; //sames as here
    let name = document.querySelector('#new' + target).name;

    let data = new FormData();
    for (let i = 0; i < myFile.length; i++) {
        if (validFile(myFile[i].name, validExts)) {
            data.append('id', name);
            data.append('file', myFile[i]);
            data.append('target', target);

            postContentFor('/' + target, data, function (respText) {
                openMention(document.querySelector("#updateID").innerHTML);
            })
        }
        else {
            alert("Gültige Dateiendungen sind " + validExts.toString() + ".");
            openMention(document.querySelector("#updateID").innerHTML);
        }
    }
}

/**
 * Removes a file. If there is no connection, the action will be stored within an indexedDB for later execution.
 *
 * @param owner The owner of the file (its ID)
 * @param file The name of file the to be deleted
 * @param source Defines, wether its a voice or an image
 */
function removeFile(owner, file, source) {
    let target = "";
    if (source === 0) {
        target = "image";
    } else if (source === 1) {
        target = "voice";
    }

    let data = new FormData();
    data.append('id', owner);
    data.append('file', file);
    data.append('target', target);

    if (!navigator.onLine) { // Offline
        UpdateData = {
            'id': owner,
            'file': file,
            'target': target
        };

        insertIntoDB(target + "__" + owner + '__' + file, owner, 'delete', target, JSON.stringify(UpdateData));

        ele = document.getElementById(target + '__' + owner + '__' + file);
        ele.remove(); // we are in detail view...
        sessionStorage.setItem("/mention?id=" + owner, document.getElementById('content').innerHTML);

        if (source === 0) {
            updateCachedMentionFileCounts(owner, 'image', -1);
        } else if (source === 1) {
            updateCachedMentionFileCounts(owner, 'voice', -1);
        }
    } else { // Online
        deleteContentFor('/' + target, data, function (respText) {
            openMention(document.querySelector("#updateID").innerHTML);
        })
    }
}

/**
 * Validates the extension of an file.
 *
 * @param fileName The filename to validate
 * @param validExts The valid extensions
 * @returns {boolean} True, if the efilename has an valid extensions
 */
function validFile(fileName, validExts) {
    let fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

    return validExts.indexOf(fileExt) >= 0;
}

/**
 * Helper function to execute simple get routines. If possible it will use online data and saves
 * the result afterwards. If there is no connection the function tries to get the result from the
 * storrage.
 *
 * Via the forceOffline array some stuff can be forced to be loaded only from the storrage.
 *
 * @param route The route for the GET-Request
 * @param contentFor The target for the content
 * @param useURL True, if "Content-type", "application/x-www-form-urlencoded" should be used
 * @param success A function to execute if succeded
 * @param error A function to execute if failed
 */
function getContentFor(route, contentFor, useURL, success, error) {
    sessionStorage.setItem('lastGetCall_route', route);
    sessionStorage.setItem('lastGetCall_contentFor', contentFor);
    sessionStorage.setItem('lastGetCall_useURL', useURL);
    sessionStorage.setItem('lastGetCall_success', success);
    sessionStorage.setItem('lastGetCall_error', error);

    if (!navigator.onLine && forceOnline.indexOf(route) !== -1) {
        route = '/offline';
    }

    if (!navigator.onLine || forceOffline.includes(route)) {
        resp = sessionStorage.getItem(route);
        if (!resp) {
            resp = localStorage.getItem(route);
        }

        let contentBlock = document.getElementById(contentFor);

        if (resp) {
            if (contentBlock) {
                contentBlock.innerHTML = resp;
                toggleMenue();

                if (success !== undefined) {
                    success();
                }
            }
        } else {
            if (contentBlock) {
                resp = localStorage.getItem('/offline');

                if (resp) {
                    contentBlock.innerHTML = resp;
                    toggleMenue();
                }

                if (success !== undefined) {
                    success();
                }
            }
        }
    } else {
        fetch(route, {
            method: 'GET',
            credentials: 'same-origin',
        }).then(function (resp) {
                if (resp.ok) {
                    if (contentFor) {

                        resp.clone().text().then(function (text) {
                            sessionStorage.setItem(route, text);
                        });

                        resp.text().then(function (text) {
                                let contentBlock = document.getElementById(contentFor);
                                toggleMenue();

                                if (contentBlock) {
                                    contentBlock.innerHTML = text;

                                    if (success !== undefined) {
                                        success();
                                    }
                                }
                            }
                        );
                    }
                } else {
                    if (resp.status === 401) {
                        toggleMenue(false);
                        openLogin();
                    } else {
                        let contentBlock = document.getElementById(contentFor);

                        if (contentBlock) {
                            contentBlock.innerHTML = text
                        }
                    }
                }
            }
        ).catch(function (err) {
                if (!error) {
                    contentBlock.innerHTML = err.toString();
                } else if (error) {
                    error(err.toString());
                }
            }
        );
    }
}

/**
 *  A simple get request for caches data. Here we do not need some intelligence.
 *
 * @param route The route for the GET-Request
 */
function getCacheContentFor(route) {
    if (navigator.onLine) {
        fetch(route, {
            method: 'GET',
            credentials: 'same-origin',
        }).then(function (resp) {
                if (resp.ok) {
                    resp.clone().text().then(function (text) {
                        localStorage.setItem(route, text)
                    });
                }
            }
        )
    }
}

/**
 * A simple routine to do a post request.
 *
 * @param route The route for the GET-Request
 * @param data The data to post
 * @param success A function to execute if succeded
 * @param err A function to execute if failed
 */
function postContentFor(route, data, success, err) {
    if (navigator.onLine) {
        fetch(route, {
            method: 'POST',
            credentials: 'same-origin',
            body: data
        }).then(function (resp) {
            if (resp.status === 200) {
                if (success) {
                    resp.clone().text().then(text => {
                        success(text);
                    });
                }
            } else if (resp.status === 401) {
                openLogin();
            } else {
                contentBlock = document.getElementById('content');
                if (contentBlock) {
                    resp.clone().text().then(text => {
                        contentBlock.innerHTML = text;
                    });
                }
            }
        }).catch(err => {
            contentBlock.innerHTML = err.message;
        });
    }
}

/**
 * A simple routine to do a put request.
 *
 * @param route The route for the GET-Request
 * @param data The data to put
 * @param success A function to execute if succeded
 * @param err A function to execute if failed
 */
function putContentFor(route, data, success, err) {
    if (navigator.onLine) {
        fetch(route, {
            method: 'PUT',
            credentials: 'same-origin',
            body: data
        }).then(function (resp) {
            if (resp.status === 200) {
                if (success) {
                    resp.clone().text().then(text => {
                        success(text);
                    });
                }
            } else if (resp.status === 401) {
                openLogin();
            } else {
                runLastGetRequest();
            }
        }).catch(err => {
            contentBlock.innerHTML = err.message;
        });
    }
}

/**
 * A simple routine to do a delete request.
 *
 * @param route The route for the GET-Request
 * @param data The data to delete
 * @param success A function to execute if succeded
 * @param err A function to execute if failed
 */
function deleteContentFor(route, data, success, err) {
    if (navigator.onLine) {
        fetch(route, {
            method: 'DELETE',
            credentials: 'same-origin',
            body: data
        }).then(function (resp) {
                if (resp.status === 200) {
                    if (success) {
                        resp.clone().text().then(text => {
                            success(text);
                        });
                    }
                }
                else if (resp.status === 401) {
                    openLogin();
                } else {
                    contentBlock = document.getElementById('content');
                    if (contentBlock) {
                        resp.clone().text().then(text => {
                            contentBlock.innerHTML = text;
                        });
                    }
                }
            }
        ).catch(err => {
            contentBlock.innerHTML = err.message;
        });
    }
}
