# Imagine-Cloudfiles

Cloudfiles storage for [Imagine](https://github.com/brewster/imagine).

## Installation

If you haven't already done so, make sure to install `imagine-cloudfiles` in
your Imagine folder:

``` bash
$ npm install imagine-cloudfiles
```

Then place something similar to the following into your `config.json` file for
Imagine:

``` javascript
"storage": "imagine-cloudfiles",

"imagine-cloudfiles": {
  "user": "USER",
  "key": "KEY",
  "containerPrefix": "imagine-assets",
  "containerHashLength": 4
}
```
Replace `USER` and `KEY` with your Cloudfiles account data.

## Container Hashing

In order to sufficiently distribute images across containers in Cloudfiles
without user input, Imagine-Cloudfiles places images into containers based on
an MD5 hash of the image name that is trimmed to the size of the
`containerHashLength` and prefixed with the `containerPrefix`. Simply reverse
this container hash operation to find which container an image file resides.

`containerPrefix` and `containerHashLength` can be changed to meet your needs.

## Other Options

You can change the default Cloudfiles host (`auth.api.rackspacecloud.com`) by 
adding the following to the `imagine-cloudfiles` section of your config:

``` javascript
"host": "lon.auth.api.rackspacecloud.com"
```

If you're using Rackspace Cloud Servers, be sure to turn on ServiceNet for
fast, unmetered access to Cloudfiles by adding this to the `imagine-cloudfiles`
section of your config:

``` javascript
"servicenet": true
```

## License

Imagine-Cloudfiles is distributed under the MIT License. See
[LICENSE](https://github.com/brewster/imagine-cloudfiles/blob/master/LICENSE) for more
details.
