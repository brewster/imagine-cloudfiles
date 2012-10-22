"use strict";

var crypto = require('crypto');
var extend = require('obj-extend');
var https = require('https');
var url = require('url');
var winston = require('winston');
var Uploader = require('./imagine-cloudfiles/uploader');
var Downloader = require('./imagine-cloudfiles/downloader');

var ImagineCloudfiles = function (config) {
  this.config = extend({
    host: 'auth.api.rackspacecloud.com'
  }, config);
  this.authenticate();
};

ImagineCloudfiles.prototype = {

  ready: function () {
    return !!this.authToken;
  },

  uploader: function (key) {
    return this.instantiate(Uploader, key);
  },

  downloader: function (key) {
    return this.instantiate(Downloader, key);
  },

  instantiate: function (Cls, key) {
    // Instantiate class
    var path = this.generatePath(key);
    var obj = new Cls(this.storageHost, this.authToken, path);

    // Reauth on authentication error
    var that = this;
    obj.on('error', function (e) {
      if (e.statusCode && (e.statusCode === 401 || e.statusCode === 403)) {
        that.authenticate.bind(that);
      }
    });

    return obj;
  },

  generatePath: function (key) {
    var hashKey = crypto.createHash('md5').update(key).digest('hex');
    var containerHash = hashKey.substr(0, this.config.containerHashLength);
    var container = this.config.containerPrefix + '-' + containerHash;
    return this.storagePath + '/' + container + '/' + key;
  },

  authenticate: function () {
    // Create request
    var request = https.request({
      method: 'get',
      path: '/v1.0',
      host: this.config.host,
      headers: {
        'host': this.config.host,
        'x-auth-user': this.config.user,
        'x-auth-key': this.config.key
      }
    });

    // On response
    var that = this;
    request.on('response', function (response) {
      if (response.statusCode === 204) {
        // Parse the storage url
        var parsed = url.parse(response.headers['x-storage-url']);

        // Store the token and storage host/path
        that.authToken = response.headers['x-auth-token'];
        that.storageHost = parsed.host;
        that.storagePath = parsed.path;

        // Change to correct storage host if servicenet is on
        if (that.config.servicenet === true) {
          that.storageHost = 'snet-' + that.storageHost;
          winston.info('cloudfiles servicenet on');
        }

        // Logging
        winston.info('cloudfiles auth token received');
      } else {
        // Log the error
        winston.error('cloudfiles token retrieval failure', {
          statusCode: response.statusCode
        });
        process.exit(1);
      }
    });

    // Log errors
    request.on('error', function (error) {
      winston.error('cloudfiles authentication error', error);
    });

    // Start the request
    request.end();
  }

};

module.exports = ImagineCloudfiles;
