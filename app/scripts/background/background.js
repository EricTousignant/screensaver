/*
 *  Copyright (c) 2015-2019, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/screensaver/blob/master/LICENSE.md
 */

import '../../scripts/background/context_menus.js';
import '../../scripts/background/user.js';

import * as AppData from './data.js';

import * as MyUtils from '../../scripts/my_utils.js';

import * as ChromeUtils
  from '../../scripts/chrome-extension-utils/scripts/utils.js';
import '../../scripts/chrome-extension-utils/scripts/ex_handler.js';

/**
 * The background script for the extension.<br>
 * @namespace Background
 */

/**
 * Display the options tab
 * @private
 * @memberOf Background
 */
function _showOptionsTab() {
  // send message to the option tab to focus it.
  Chrome.Msg.send(Chrome.Msg.HIGHLIGHT).catch(() => {
    // no one listening, create it
    chrome.tabs.create({url: '/html/options.html'});
  });
}

/**
 * Event: Fired when the extension is first installed,<br />
 * when the extension is updated to a new version,<br />
 * and when Chrome is updated to a new version.
 * @see https://developer.chrome.com/extensions/runtime#event-onInstalled
 * @param {Object} details - type of event
 * @param {string} details.reason - reason for install
 * @param {string} details.previousVersion - old version if 'update' reason
 * @private
 * @memberOf Background
 */
function _onInstalled(details) {
  if (details.reason === 'install') {
    // initial install
    Chrome.GA.event(Chrome.GA.EVENT.INSTALLED, ChromeUtils.getVersion());
    AppData.initialize();
    Chrome.Storage.set('isShowing', false);
    _showOptionsTab();
  } else if (details.reason === 'update') {
    if (!MyUtils.DEBUG) {
      const oldVer = details.previousVersion;
      const version = ChromeUtils.getVersion();
      if (version === oldVer) {
        // spurious update: 
        // https://bugs.chromium.org/p/chromium/issues/detail?id=303481
        return;
      }
      // TODO clean this up
      let showThreeInfo = false;
      if (oldVer && !oldVer.startsWith('3')) {
        showThreeInfo = true;
      }
      if (showThreeInfo) {
        // show info on the update when moving from a now 3.x.x version
        chrome.tabs.create({url: '/html/update3.html'});
      }
    }
    // extension updated
    AppData.update();
    Chrome.Storage.set('isShowing', false);
  }
}

/**
 * Event: Fired when a profile that has this extension installed first
 * starts up
 * @see https://developer.chrome.com/extensions/runtime#event-onStartup
 * @private
 * @memberOf Background
 */
function _onStartup() {
  Chrome.GA.page('/background.html');
  AppData.processState();
  Chrome.Storage.set('isShowing', false);
}

/**
 * Event: Fired when a browser action icon is clicked.
 * @see https://goo.gl/abVwKu
 * @private
 * @memberOf Background
 */
function _onIconClicked() {
  _showOptionsTab();
}

/**
 * Event: Fired when item in localStorage changes
 * @see https://developer.mozilla.org/en-US/docs/Web/Events/storage
 * @param {Event} event - StorageEvent
 * @param {string} event.key - storage item that changed
 * @private
 * @memberOf Background
 */
function _onStorageChanged(event) {
  AppData.processState(event.key);
}

// noinspection JSUnusedLocalSymbols
/**
 * Event: Fired when a message is sent from either an extension process<br>
 * (by runtime.sendMessage) or a content script (by tabs.sendMessage).
 * @see https://developer.chrome.com/extensions/runtime#event-onMessage
 * @param {Chrome.Msg.Message} request - details for the message
 * @param {Object} [sender] - MessageSender object
 * @param {Function} [response] - function to call once after processing
 * @returns {boolean} true if asynchronous
 * @private
 * @memberOf Background
 */
function _onChromeMessage(request, sender, response) {
  if (request.message === Chrome.Msg.RESTORE_DEFAULTS.message) {
    AppData.restoreDefaults();
  } else if (request.message === Chrome.Msg.STORE.message) {
    Chrome.Storage.set(request.key, request.value);
  }
  return false;
}

/**
 * Event: called when document and resources are loaded
 * @private
 * @memberOf Background
 */
function _onLoad() {
  // listen for extension install or update
  chrome.runtime.onInstalled.addListener(_onInstalled);

  // listen for Chrome starting
  chrome.runtime.onStartup.addListener(_onStartup);

  // listen for click on the icon
  chrome.browserAction.onClicked.addListener(_onIconClicked);

  // listen for changes to the stored data
  addEventListener('storage', _onStorageChanged, false);

  // listen for chrome messages
  Chrome.Msg.listen(_onChromeMessage);
}

// listen for document and resources loaded
window.addEventListener('load', _onLoad);
