/*
 *  Copyright (c) 2015-2019, Michael A. Updike All rights reserved.
 *  Licensed under the BSD-3-Clause
 *  https://opensource.org/licenses/BSD-3-Clause
 *  https://github.com/opus1269/screensaver/blob/master/LICENSE.md
 */
window.app = window.app || {};

/**
 * A screensaver
 * @namespace
 */
app.Screensaver = (function() {
  'use strict';

  /**
   * Main auto-binding template
   * @typedef {Element} app.Screensaver.Template
   * @property {Array<app.SSView>} _views - array of views
   * @property {?string} sizingType - the way an image is rendered
   * @property {int} aniType - the animation type for photo transitions
   * @property {int} screenWidth - screen width in pixels
   * @property {int} screenHeight - screen height in pixels
   * @property {boolean} paused - true if slideshow paused
   * @property {boolean} noPhotos - true if there are no usable photos
   * @property {string} noPhotosLabel - label when no photos are usable
   * @property {string} timeLabel - current time label
   * @property {Function} set - Polymer setter
   * @property {Function} push - Polymer pusher
   * @memberOf app.Screensaver
   */

  /**
   * Main auto-binding template
   * @type {app.Screensaver.Template}
   * @const
   * @private
   * @memberOf app.Screensaver
   */
  const t = document.querySelector('#t');
  t.sizingType = null;
  t.screenWidth = screen.width;
  t.screenHeight = screen.height;
  t.aniType = 0;
  t.paused = false;
  t.noPhotos = false;
  t.noPhotosLabel = '';
  t.timeLabel = '';

  /**
   * Max number of calls to updatePhotos during a session
   * @type {int}
   * @const
   * @private
   * @memberOf app.Screensaver
   */
  const _MAX_GPHOTO_UPDATES = 168; // up to one week

  /**
   * Number of calls to getMediaItem made
   * @type {int}
   * @private
   * @memberOf app.Screensaver
   */
  let _gPhotoCt = 0;

  /**
   * Is the screensaver updating the google photos
   * @type {boolean}
   * @private
   * @memberOf app.Screensaver
   */
  let _isUpdating = false;

  /**
   * Process settings related to between photo transitions
   * @private
   * @memberOf app.Screensaver
   */
  function _setupPhotoTransitions() {
    let type = Chrome.Storage.getInt('photoTransition', 0);
    if (type === 8) {
      // pick random transition
      type = Chrome.Utils.getRandomInt(0, 7);
    }
    t.set('aniType', type);

    app.SSTime.initialize();
  }

  /**
   * Set the window zoom factor to 1.0
   * @private
   * @memberOf app.Screensaver
   */
  function _setZoom() {
    if (Chrome.Utils.getChromeVersion() >= 42) {
      // override zoom factor to 1.0 - chrome 42 and later
      const chromep = new ChromePromise();
      chromep.tabs.getZoom().then((zoomFactor) => {
        if ((zoomFactor <= 0.99) || (zoomFactor >= 1.01)) {
          chrome.tabs.setZoom(1.0);
        }
        return null;
      }).catch((err) => {
        Chrome.Log.error(err.message, 'chromep.tabs.getZoom');
      });
    }
  }

  /**
   * Launch the slide show
   * @param {int} [delay=2000] - delay before start
   * @private
   * @memberOf app.Screensaver
   */
  function _launch(delay = 2000) {
    const hasPhotos = app.SSBuilder.build();
    if (hasPhotos) {
      // kick off the slide show if there are photos selected
      app.SSRunner.start(1000);
    }
  }

  /**
   * Event: Error state changed for a photo view
   * @param {Event} ev - the event object
   * @param {Object} ev.model - template model
   * @memberOf app.Screensaver
   */
  t._onErrorChanged = async function(ev) {
    const isError = ev.detail.value;
    
    if (_isUpdating) {
      // another error event is already handling this
      return;
    }
    
    if (isError) {
      _isUpdating = true;
      
      // url failed to load
      const model = ev.model;
      const index = model.index;
      const view = t._views[index];
      const photo = view.photo;
      const type = photo.getType();
      if ('Google User' === type) {
        // Google baseUrl may have expired, try to update all photos

        // limit number of calls to updatePhotos
        _gPhotoCt++;
        if (_gPhotoCt >= _MAX_GPHOTO_UPDATES) {
          _isUpdating = false;
          return;
        }

        // create new source
        const source =
            app.PhotoSource.createSource(app.PhotoSources.UseKey.ALBUMS_GOOGLE);

        // try to update the photos
        const updated = await app.GoogleSource.updatePhotos(true);
        if (!updated) {
          Chrome.Log.error('Failed to update urls.',
              'Screensaver._onErrorChanged');
          // major problem, give up for this session
          _gPhotoCt = _MAX_GPHOTO_UPDATES + 1;
          _isUpdating = true;
          return;
        }

        // get the new photos
        const newPhotos = source.getPhotos();
        
        // update all Google Photos urls
        app.SSPhotos.updateGooglePhotoUrls(newPhotos);
        
        // update any views with google photos
        for (let i = 0; i < t._views.length; i++) {
          const view = t._views[i];
          const photo = view.photo;
          const type = photo.getType();
          if (type === 'Google User') {
            const index = newPhotos.photos.findIndex((e) => {
              return e.ex.id === photo.getEx().id;
            });
            if (index >= 0) {
              view.setUrl(newPhotos.photos[index].url);
            } else {
              // didn't get this id on update mark photo bad
              view.markPhotoBad();
            }
          }
        }

        _isUpdating = false;

      }
    }
  };

  /**
   * Event: Document and resources loaded
   * @memberOf app.Screensaver
   */
  function _onLoad() {
    // set selected background image
    document.body.style.background =
        Chrome.Storage.get('background').substring(11);

    Chrome.GA.page('/screensaver.html');

     _setZoom();
    _setupPhotoTransitions();

    // start screensaver
    _launch();
  }

  // listen for documents and resources loaded
  window.addEventListener('load', _onLoad);

  return {
    /**
     * Create the {@link app.SSViews} that will be animated
     * @memberOf app.Screensaver
     */
    createPages: function() {
      app.SSViews.create(t);
    },

    /**
     * Set the sizing type for the paper-image elements
     * @param {string} type The sizing type
     * @memberOf app.Screensaver
     */
    setSizingType: function(type) {
      t.set('sizingType', type);
    },

    /**
     * Do we have usable photos
     * @returns {boolean} true if all photos are bad
     * @memberOf app.Screensaver
     */
    noPhotos: function() {
      return t.noPhotos;
    },

    /**
     * Set the state when no photos are available
     * @memberOf app.Screensaver
     */
    setNoPhotos: function() {
      t.set('noPhotos', true);
      t.noPhotosLabel = Chrome.Locale.localize('no_photos');
    },

    /**
     * Set the time label
     * @param {string} label - current time
     * @memberOf app.Screensaver
     */
    setTimeLabel: function(label) {
      t.timeLabel = label;
    },

    /**
     * Set the state when slideshow is paused
     * @param {boolean} paused - paused state
     * @memberOf app.Screensaver
     */
    setPaused: function(paused) {
      t.paused = paused;
      if (paused) {
        t.$.pauseImage.classList.add('fadeOut');
        t.$.playImage.classList.remove('fadeOut');
      } else {
        t.$.playImage.classList.add('fadeOut');
        t.$.pauseImage.classList.remove('fadeOut');
      }
    },
  };
})();
