/*
 *  Copyright (c) 2015-2019, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/screensaver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * Wrapper for chrome messages
 * @see https://developer.chrome.com/extensions/messaging
 * @namespace
 */
app.Msg = (function() {
  'use strict';

  new ExceptionHandler();

  /**
   * Chrome Messages
   * @type {{}}
   * @property {Chrome.Msg.Message} SS_SHOW - show screensaver
   * @property {Chrome.Msg.Message} SS_CLOSE - close screensaver
   * @property {Chrome.Msg.Message} SS_IS_SHOWING - is a screensaver showing
   * @property {Chrome.Msg.Message} PHOTO_SOURCE_FAILED - failed to web load
   * @property {Chrome.Msg.Message} SIGN_IN - {@link app.User} sign in
   * @property {Chrome.Msg.Message} SIGN_OUT - {@link app.User} sign out
   * @const
   * @memberOf app.Msg
   */
  const _MSG = {
    SS_SHOW: {
      message: 'showScreensaver',
    },
    SS_CLOSE: {
      message: 'closeScreensaver',
    },
    SS_IS_SHOWING: {
      message: 'isScreensaverShowing',
    },
    PHOTO_SOURCE_FAILED: {
      message: 'photoSourceFailed',
      key: '',
      error: '',
    },
    SIGN_IN: {
      message: 'signIn',
    },
    SIGN_OUT: {
      message: 'signOut',
    },
  };

  return {
    SS_SHOW: _MSG.SS_SHOW,
    SS_CLOSE: _MSG.SS_CLOSE,
    SS_IS_SHOWING: _MSG.SS_IS_SHOWING,
    PHOTO_SOURCE_FAILED: _MSG.PHOTO_SOURCE_FAILED,
    SIGN_IN: _MSG.SIGN_IN,
    SIGN_OUT: _MSG.SIGN_OUT,
  };
})();
