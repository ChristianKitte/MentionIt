/**
 * Simple routine to walk through the awaiting actions and to store them into an  array. On this way we 'save' all
 * actions an will be independent from the IndexedDB.
 *
 * delete ==> mention, image, voice
 * update ==> mention
 * add ==> mention
 *
 */
function synchronise() {
    postMessage('synchronisiere.... !');
    mentionDB = indexedDB.open('offlineDB', 10);

    /**
     * Will be called after sucessfully opening the database.
     *
     * @param event An IDBDatabase
     */
    mentionDB.onsuccess = (event) => {
        let db = event.target.result;
        let tx = db.transaction("actions", "readwrite");
        let store = tx.objectStore("actions");
        let request = store.openCursor();

        /**
         * Will be called after sucessfully opening the cursor.
         *
         * @param event An IDBCursor
         */
        request.onsuccess = function (event) {
            let cursor = event.target.result;
            let todos = [];

            if (cursor) {
                todos.push({
                    id: cursor.value.key,
                    target: cursor.value.target,
                    action: cursor.value.action,
                    rawData: JSON.parse(cursor.value.data)
                });

                postMessage("Remove item " + cursor.value.key);
                cursor.continue();
            }

            doUpdate(todos);
        };
    }
}

/**
 * Performs all actions which being defined withing the array
 *
 * delete ==> mention, image, voice
 * update ==> mention
 * add ==> mention
 *
 * @param arg An array of actions
 */
function doUpdate(arg) {
    arg.forEach((item) => {
        let key = item.key; // the database key
        let target = item.target; // the target (mention, image, voice)
        let rawData = item.rawData; // the data
        let action = item.action; // the action to perform (delete, updated, add)

        if (target === 'mention' && action === 'delete') {
            postMessage('Erstelle Daten...');
            let data = new FormData();

            data.append('id', rawData.id);

            postMessage('Sende Löschanforderung für Mention...' + key);
            deleteContentFor('/mention', data, () => {
                postMessage('Löschung ausgeführt...');
            }, () => {
                postMessage('Löschung fehlgeschlagen...');
            });
        } else if ((target === 'image' || target === 'voice') && action === 'delete') {
            postMessage('Erstelle Daten...');
            let data = new FormData();

            data.append('id', rawData.id);
            data.append('file', rawData.file);
            data.append('target', rawData.target);

            postMessage('Sende Löschanforderung für Datei...' + key);
            deleteContentFor('/' + target, data, () => {
                postMessage('Löschung ausgeführt...');
            }, () => {
                postMessage('Löschung fehlgeschlagen...');
            });
        } else if (target === 'mention' && action === 'update') {
            postMessage('Erstelle Daten...');
            let data = new FormData();

            data.append('updateID', rawData.id);
            data.append('caption', rawData.caption);
            data.append('text', rawData.text);

            postMessage('Sende Updateanforderung für Mention...' + key);
            putContentFor('/mention', data, () => {
                postMessage('Update ausgeführt...');
            }, () => {
                postMessage('Update fehlgeschlagen...');
            });
        } else if (target === 'mention' && action === 'add') {
            postMessage('Erstelle Daten...');
            let data = new FormData();

            data.append('caption', rawData.caption);
            data.append('text', rawData.text);

            postMessage('Sende Addanforderung für Mention...' + key);
            postContentFor('/mention', data, () => {
                postMessage('Add ausgeführt...');
            }, () => {
                postMessage('Add fehlgeschlagen...');
            });
        }
    });
}

/**
 * Helper function to execute simple delete requests
 *
 * @param route The route for the GET-Request
 * @param data The data to update
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
                        success();
                    }
                } else {
                    if (err) {
                        err();
                    }
                }
            }
        ).catch(err => {
            if (err) {
                err();
            }
        });
    }
}

/**
 * Helper function to execute simple updates requests
 *
 * @param route The route for the GET-Request
 * @param data The data to update
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
                    success();
                }
            } else {
                if (err) {
                    err();
                }
            }
        }).catch(err => {
            if (err) {
                err();
            }
        });
    }
}

/**
 * Helper function to execute simple post requests
 *
 * @param route The route for the GET-Request
 * @param data The data to update
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
                    success();
                }
            } else {
                if (err) {
                    err();
                }
            }
        }).catch(err => {
            if (err) {
                err();
            }
        });
    }
}

/**
 * The entrypoint for the asynchrone worker
 */
synchronise();