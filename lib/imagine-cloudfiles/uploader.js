"use strict";

var events = require('events');
var extend = require('obj-extend');
var https = require('https');
var winston = require('winston');

var Uploader = function (host, token, path) {
  this.host = host;
  this.token = token;
  this.path = path;
};

Uploader.prototype = extend({}, events.EventEmitter.prototype, {

  handleResponse: function (response) {
    this.response = response;
    this.request = this.createRequest();

    // Set binds/timeout on request object
    this.request.setTimeout(5000, this.onTimeout.bind(this));
    this.request.on('response', this.onResponse.bind(this));
    this.request.on('error', this.onError.bind(this));

    // Setup and emit proxy emitter
    this.proxy = new events.EventEmitter();
    this.proxy.headers = this.response.headers;
    this.emit('response', this.proxy);

    // Emit response data to request and proxy
    this.emitData();
  },

  handleAbort: function () {
    // Abort request and remove all response listeners
    if (this.response) {
      this.response.removeAllListeners();
      this.request.abort();
    }
  },

  createRequest: function () {
    // Build headers
    var headers = extend({
      'connection': 'keep-alive',
      'x-auth-token': this.token
    }, this.response.headers);

    // Use chunked if there's no content-length
    if (!headers['content-length']) {
      headers['transfer-encoding'] = 'chunked';
    }

    // Create request
    return https.request({
      method: 'put',
      host: this.host,
      path: this.path,
      headers: headers
    });
  },

  onError: function (error) {
    this.emit('error', { message: 'error uploading to storage' });
    winston.error('error uploading to storage', error);
    this.request.removeAllListeners();
  },

  onTimeout: function () {
    this.emit('error', { message: 'timeout uploading to storage' });
    this.handleAbort();
    winston.error('timeout uploading to storage');
    this.request.removeAllListeners();
  },

  onResponse: function (response) {
    if (response.statusCode === 201) {
      this.proxy.emit('end');
    } else {
      this.emit('error', {
        statusCode: response.statusCode,
        message: 'error uploading to cloudfiles'
      });
      winston.error('error uploading to cloudfiles', {
        code: response.statusCode
      });
    }
    this.request.removeAllListeners();
  },

  emitData: function () {
    // Emit data/end events to request and proxy
    var that = this;
    this.response.on('data', function (chunk) {
      that.request.write(chunk);
      winston.debug('uploaded bytes to storage', { n: chunk.length });
      that.proxy.emit('data', chunk);
    });
    this.response.on('end', function () {
      that.request.end();
      winston.debug('finished uploading to storage');
    });
  }

});

module.exports = Uploader;
