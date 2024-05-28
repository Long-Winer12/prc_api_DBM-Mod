module.exports = {
    name: 'Use the PRC API',
    section: 'JSON Things',
    meta: {
        version: '1.0.0',
        preciseCheck: false,
        author: 'Long_Winer12',
        authorUrl: 'https://github.com/Long-Winer12/',
        downloadURL: 'https://github.com/dbm-network/mods/blob/master/actions/store_json_from_webapi_MOD.js',
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
    <label for="url"><span class="dbminputlabel">PRC API URL</span></label>
    <select id="url" class="round" onchange="glob.updatePathOptions(this)">
      <option value="server">https://api.policeroleplay.community/v1/server</option>
      <option value="server/players">https://api.policeroleplay.community/v1/server/players</option>
      <option value="server/joinlogs">https://api.policeroleplay.community/v1/server/joinlogs</option>
      <option value="server/queue">https://api.policeroleplay.community/v1/server/queue</option>
      <option value="server/killlogs">https://api.policeroleplay.community/v1/server/killlogs</option>
      <option value="server/commandlogs">https://api.policeroleplay.community/v1/server/commandlogs</option>
      <option value="server/modcalls">https://api.policeroleplay.community/v1/server/modcalls</option>
      <option value="server/bans">https://api.policeroleplay.community/v1/server/bans</option>
      <option value="server/vehicles">https://api.policeroleplay.community/v1/server/vehicles</option>
    </select>
  </div>

  <div class="form-field">
    <label for="headers"><span class="dbminputlabel">API KEY - This should be put in as <b>Server-Key:(Server-Key)</b></span></label>
    <textarea id="headers" class="round" placeholder="User-Agent: Other" style="resize: none;" rows="4" cols="20"></textarea>
  </div>

  <div class="form-field">
    <details>
      <summary>Click here for more info about the <b>PRC API.</b></summary>
      JSON Path: (Leave blank to store everything)<br>
      • The path is better defined in the "More info here" link (PRC API Docs)<br>
      <a href="https://apidocs.policeroleplay.community">More info here</a>
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

  <div class="form-field">
    <label for="reUse"><span class="dbminputlabel">Re-Use Previously Stored</span></label>
    <select id="reUse" class="round" onchange="glob.disallowAlert(this)">
      <option value="1" selected>Allow</option>
      <option value="0">Disallow</option>
    </select>
    <p style="margin-left: 4px;">Toggles re-use of previously stored JSON from same URL.</p>
  </div>
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
                'server/queue': [''],
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

    async action(cache) {
        const data = cache.actions[cache.index];
        const { Actions } = this.getDBM();
        const Mods = this.getMods();
        const fetch = Mods.require('node-fetch');
        const debugMode = parseInt(data.debugMode, 10);
        const storage = parseInt(data.storage, 10);
        const varName = this.evalMessage(data.varName, cache);
        let url = this.evalMessage(data.url, cache);
        const path = this.evalMessage(data.path, cache);
        const token = this.evalMessage(data.token, cache);
        const user = this.evalMessage(data.user, cache);
        const reUse = parseInt(data.reUse, 10);
        const pass = this.evalMessage(data.pass, cache);
        const headers = this.evalMessage(data.headers, cache);

        if (!Mods.checkURL(url)) {
            url = encodeURI(url);
        }

        if (Mods.checkURL(url)) {
            try {
                const storeData = (error, res, jsonData) => {
                    const statusCode = res ? res.status : 200;
                    let errorJson;

                    if (error) {
                        errorJson = JSON.stringify({ error, statusCode });
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
                            errorJson = JSON.stringify({ error, statusCode, success: false });
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
                            errorJson = JSON.stringify({ error, statusCode, success: false });
                            Actions.storeValue(errorJson, storage, varName, cache);
                            if (debugMode) {
                                console.log(`WebAPI: Error Invalid JSON, is the Path and/or URL set correctly? [${path}]`);
                            }
                        } else if (outValue.success != null || !outValue) {
                            errorJson = JSON.stringify({ error, statusCode, success: false });
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
                };

                const oldUrl = this.getVariable(1, `${url}_URL`, cache);

                if (url === oldUrl && reUse === 1) {
                    let jsonData;
                    let error;
                    const res = { status: 200 };

                    try {
                        jsonData = this.getVariable(1, url, cache);
                    } catch (err) {
                        error = err;
                    }

                    if (debugMode) {
                        console.log(
                            'WebAPI: Using previously stored json data from the initial store json action within this command.',
                        );
                    }

                    storeData(error, res, jsonData);
                } else {
                    const setHeaders = {};

                    setHeaders['User-Agent'] = 'Other';

                    if (headers) {
                        const lines = String(headers).split('\n');
                        for (let i = 0; i < lines.length; i++) {
                            const header = lines[i].split(':');

                            if (lines[i].includes(':') && header.length > 0) {
                                const key = header[0].trim();
                                const value = header[1].trim();
                                setHeaders[key] = value;

                                if (debugMode) console.log(`Applied Header: ${lines[i]}`);
                            } else if (debugMode) {
                                console.error(
                                    `PRC API Error: Error: Custom Header line ${lines[i]} is wrongly formatted. You must split the key from the value with a colon (:)`,
                                );
                            }
                        }
                    }
                    if (token) setHeaders.Authorization = `Bearer ${token}`;
                    if (user && pass) {
                        setHeaders.Authorization = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
                    }

                    try {
                        const response = await fetch(url, { headers: setHeaders });
                        const json = await response.json();
                        storeData('', response, json);
                    } catch (err) {
                        if (debugMode) console.error(err.stack || err);
                    }
                }
            } catch (err) {
                if (debugMode) console.error(err.stack || err);
            }
        } else if (debugMode) console.error(`URL [${url}] Is Not Valid`);
    },

    mod() {},
};
