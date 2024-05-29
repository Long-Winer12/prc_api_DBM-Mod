const fetch = require('node-fetch');

module.exports = {
    name: 'Use the PRC API',
    section: 'JSON Things',
    meta: {
        version: '2.1.7',
        preciseCheck: false,
        author: 'Long_Winer12',
        authorUrl: 'https://github.com/Long-Winer12/',
        downloadURL: 'https://github.com/Long-Winer12/prc_api_DBM-Mod/blob/main/prc_api_MOD.js',
    },

    subtitle(data) {
        return `${data.varName}`;
    },

    variableStorage(data, varType) {
        if (parseInt(data.storage, 10) !== varType) return;
        return [data.varName, 'JSON Object'];
    },

    fields: ['token', 'user', 'pass', 'url', 'path', 'storage', 'varName', 'debugMode', 'headers', 'reUse'],

    html() {
        return `
<div class="form-container">
  <div class="form-field">
    <p style="margin-left: 4px;">Please note: You need to use the "Wait" action and add a 3 second if you are using this action more than once in the same command.</p>
  </div>
  <div class="form-field">
    <label for="url"><span class="dbminputlabel">PRC API URL</span></label>
    <select id="url" class="round" onchange="glob.updatePathOptions(this)">
      <option value="server">https://api.policeroleplay.community/v1/server</option>
    </select>
  </div>

  <div class="form-field">
    <label for="headers"><span class="dbminputlabel">API KEY - This should be put in as <b>Server-Key:(Server-Key)</b></span></label>
    <textarea id="headers" class="round" placeholder="User-Agent: Other" style="resize: none;" rows="4" cols="20"></textarea>
  </div>

  <div class="form-field">
    <details>
      <label text="Click here for more info about the <b>PRC API."</b></label>
      Path: (Leave blank to store everything)<br>
      • The path is better defined in the PRC API Docs (You can see what stuff does).<br>
      • You can use the empty option in Paths for all the information in the response.<br>
      • If you get the error code '4001', you are being rate limited.<br>
      • We will make a command send plugin soon™.<br>
      <a href="https://apidocs.policeroleplay.community">PRC API Documentation</a>
    </details>
  </div>

  <div class="form-field">
    <label for="path"><span class="dbminputlabel">Path</span></label>
    <select id="path" class="round"></select>
  </div>

  <div class="form-field">
    <label for="debugMode"><span class="dbminputlabel">Debug Mode</span></label>
    <select id="debugMode" class="round">
      <option value="1">Enabled</option>
      <option value="0" selected>Disabled</option>
    </select>
  </div>

  <div class="form-field">
    <store-in-variable dropdownLabel="Store In" selectId="storage" variableContainerId="varNameContainer" variableInputId="varName"></store-in-variable>
  </div>
  <br>
</div>

<style>
  .form-container {
    max-height: 400px;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 20px;
  }

  .form-field {
    margin-bottom: 16px;
  }

  .form-field label {
    display: block;
    margin-bottom: 8px;
  }

  .form-field select,
  .form-field textarea {
    width: calc(100% - 10px);
    margin-bottom: 8px;
  }
</style>`;
    },

    init() {
        const { glob, document } = this;

        glob.updatePathOptions = function updatePathOptions(select) {
            const pathSelect = document.getElementById('path');
            const options = {
                'server': ['$.Name', '$.OwnerId', 'CoOwnerIds', '$.CurrentPlayers', '$.MaxPlayers', '$.JoinKey', '$.AccVerifiedReq', '$.TeamBalance'],
                'server/players': ['$.Player', '$.Permission', 'Callsign', '$.Team'],
                'server/joinlogs': ['$.Join', '$.Timestamp', '$.Player'],
                'server/queue': ['$.Items'],
                'server/killlogs': ['$.Killed', '$.Timestamp', '$.Killer'],
                'server/commandlogs': ['$.Player', '$.Timestamp', '$.Command'],
                'server/modcalls': ['$.Caller', '$.Moderator', '$.Timestamp'],
                'server/bans': ['$.PlayerId'],
                'server/vehicles': ['$.Texture', '$.Name', '$.Owner'],
            };
            pathSelect.innerHTML = '';
            const paths = options[select.value];
            for (const path of paths) {
                const option = document.createElement('option');
                option.value = path;
                option.text = path;
                pathSelect.add(option);
            }
        };

        glob.disallowAlert = function disallowAlert(element) {
            if (element.value === '0') {
                alert('Disabling this could lead to you being banned or rate limited by Police Roleplay Community, please be careful.');
            }
        };

        glob.updatePathOptions(document.getElementById('url'));
    },

    action(cache) {
        const data = cache.actions[cache.index];
        const { Actions } = this.getDBM();
        const Mods = this.getMods();
        const fetch = Mods.require('node-fetch');
        const debugMode = parseInt(data.debugMode, 10);
        const storage = parseInt(data.storage, 10);
        const varName = this.evalMessage(data.varName, cache);
        let endpoint = this.evalMessage(data.url, cache);
        const path = this.evalMessage(data.path, cache);
        const token = this.evalMessage(data.token, cache);
        const headers = this.evalMessage(data.headers, cache);

        const baseURL = 'https://api.policeroleplay.community/v1/';
        let url = baseURL + endpoint;

        if (!Mods.checkURL(url)) {
            url = encodeURI(url);
        }

        if (Mods.checkURL(url)) {
            fetchData(url, headers, token, debugMode, storage, varName, path, cache, Actions, Mods);
        } else {
            storeData(new Error(`URL [${url}] Is Not Valid`), null, null, debugMode, storage, varName, cache, Actions, Mods, url);
        }
    },

    mod() {},
};

async function fetchData(url, headers, token, debugMode, storage, varName, path, cache, Actions, Mods) {
    try {
        const response = await fetch(url, { headers: { 'Authorization': token, ...parseHeaders(headers) } });
        const rawText = await response.text();

        if (debugMode) {
            console.log(`Raw Response: ${rawText}`);
        }

        let json;
        try {
            json = JSON.parse(rawText);
        } catch (e) {
            throw new Error('Invalid JSON response');
        }

        if (!json) {
            throw new Error('No JSON Data Returned');
        }

        storeData(null, response, json, debugMode, storage, varName, cache, Actions, Mods, path, url);
    } catch (err) {
        storeData(err, null, null, debugMode, storage, varName, cache, Actions, Mods, url);
    }
}

function storeData(error, res, jsonData, debugMode, storage, varName, cache, Actions, Mods, path, url) {
    const statusCode = res ? res.status : 200;
    let errorJson;

    if (error) {
        errorJson = JSON.stringify({ error: error.message, statusCode });
        Actions.storeValue(errorJson, storage, varName, cache);

        if (debugMode) {
            console.error(`WebAPI: Error: ${errorJson} stored to: [${varName}]`);
        }
    } else if (path) {
        const outData = Mods.jsonPath(jsonData, path);

        if (debugMode) console.dir(outData);

        try {
            JSON.parse(JSON.stringify(outData));
        } catch (error) {
            errorJson = JSON.stringify({ error: error.message, statusCode, success: false });
            Actions.storeValue(errorJson, storage, varName, cache);
            if (debugMode) console.error(error.stack ? error.stack : error);
        }

        const outValue = eval(JSON.stringify(outData), cache);

        if (!outData) {
            errorJson = JSON.stringify({
                error: 'No JSON Data Returned',
                statusCode: 0,
            });
            Actions.storeValue(errorJson, storage, varName, cache);
            if (debugMode) {
                console.error(`WebAPI: Error: ${errorJson} NO JSON data returned. Check the URL: ${url}`);
            }
        } else if (outData.success != null) {
            errorJson = JSON.stringify({ error: error.message, statusCode, success: false });
            Actions.storeValue(errorJson, storage, varName, cache);
            if (debugMode) {
                console.log(`WebAPI: Error Invalid JSON, is the Path and/or URL set correctly? [${path}]`);
            }
        } else if (outValue.success != null || !outValue) {
            errorJson = JSON.stringify({ error: error.message, statusCode, success: false });
            Actions.storeValue(errorJson, storage, varName, cache);
            if (debugMode) {
                console.log(`WebAPI: Error Invalid JSON, is the Path and/or URL set correctly? [${path}]`);
            }
        } else {
            Actions.storeValue(outValue, storage, varName, cache);
            Actions.storeValue(jsonData, 1, url, cache);
            Actions.storeValue(url, 1, `${url}_URL`, cache);
            if (debugMode) {
                console.log(`WebAPI: JSON Data values starting from [${path}] stored to: [${varName}]`);
            }
        }
    } else {
        if (debugMode) console.dir(jsonData);
        Actions.storeValue(jsonData, storage, varName, cache);
        Actions.storeValue(jsonData, 1, url, cache);
        Actions.storeValue(url, 1, `${url}_URL`, cache);
        if (debugMode) {
            console.log(`WebAPI: JSON Data Object stored to: [${varName}]`);
        }
    }
    Actions.callNextAction(cache);
}

function parseHeaders(headersString) {
    const headers = {};
    if (headersString) {
        const lines = headersString.split('\n');
        lines.forEach(line => {
            const [key, value] = line.split(':').map(s => s.trim());
            if (key && value) {
                headers[key] = value;
            }
        });
    }
    return headers;
}
