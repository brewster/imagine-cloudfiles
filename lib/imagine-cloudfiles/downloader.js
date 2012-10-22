"use strict";

var events = require('events');
var extend = require('obj-extend');
var https = require('https');
var winston = require('winston');

var Downloader = function (host, token, path) {
  this.host = host;
  this.token = token;
  this.path = path;
};

Downloader.prototype = extend({}, events.EventEmitter.prototype, {

  handleResponse: function () {
    // Create request
    this.request = https.request({
      method: 'get',
      host: this.host,
      path: this.path,
      headers: {
        'x-auth-token': this.token
      }
    });

    // Setup binds
    this.request.on('response', this.onResponse.bind(this));
    this.request.on('error', this.onError.bind(this));

    // Start download
    this.startTime = new Date().getTime();
    this.request.end();
  },

  handleAbort: function () {
    if (this.request) {
      this.request.abort();
      this.request.removeAllListeners();
    }
  },

  onError: function (error) {
    winston.error('cloudfiles download error', error);
    this.emit('error', {
      statusCode: 404,
      message: 'cloudfiles download error'
    });
  },

  onResponse: function (response) {
    if (response.statusCode === 200) {
      // Emit out the data, if successful
      this.emitData(response);
    } else {
      // Emit the error upwards
      this.emit('error', {
        statusCode: response.statusCode,
        message: 'error reading file from cloudfiles'
      });

      // Log the error
      winston.error('error reading file from cloudfiles', {
        statusCode: response.statusCode
      });
    }
  },

  emitData: function (response) {
    var that = this;

    // Create proxy emitter
    var proxy = new events.EventEmitter();
    proxy.headers = response.headers;

    // Emit the proxy
    this.emit('response', proxy);

    // Emit data/end events to proxy
    response.on('data', function (chunk) {
      proxy.emit('data', chunk);

      // Logging
      winston.debug('downloaded bytes from cloudfiles', { n: chunk.length });
    });
    response.on('end', function () {
      proxy.emit('end');
      response.removeAllListeners();

      // Logging
      var elapsed = new Date().getTime() - that.startTime;
      winston.debug('finished downloading from cloudfiles', { e: elapsed });
    });
  }

});

module.exports = Downloader;
