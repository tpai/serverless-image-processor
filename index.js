'use strict';

var async = require('async');
var util = require('util');
var path = require('path');
var _sizesArray = require('./utils/config');

var gm = require('gm').subClass({ imageMagick: true });
var AWS = require('aws-sdk');
var s3 = new AWS.S3();

module.exports.f = function(event, context) {
    // Read options from the event.
    console.log("Reading options from event:\n", util.inspect(event, {
        depth: 5
    }));
    var srcBucket = event.Records[0].s3.bucket.name;
    // Object key may have spaces or unicode non-ASCII characters.
    var srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    console.log(srcBucket + "/" + srcKey);

    // Infer the image type.
    var typeMatch = srcKey.match(/\.([^.]*)$/);
    var fileName = path.basename(srcKey);
    if (!typeMatch) {
        console.error('unable to infer image type for key ' + srcKey);
        return;
    }
    var imageType = typeMatch[1].toLowerCase();
    if (imageType != "jpg" && imageType != "jpeg" && imageType != "gif" && imageType != "png") {
        console.log('skipping non-image ' + srcKey);
        return;
    }
    var _processArray = [
        function(next) {
            console.time("downloadImage");
            // Download the image from S3 into a buffer.
            // sadly it downloads the image several times, but we couldn't place it outside
            // the variable was not recognized
            s3.getObject({
                Bucket: srcBucket,
                Key: srcKey
            }, next);
            console.timeEnd("downloadImage");
        },
        function(response, next) {
            console.log("process image");
            console.time("processImage");
            // Transform the image buffer in memory.
            gm(new Buffer(response.Body)).size(function(err, size) {
                // Infer the scaling factor to avoid stretching the image unnaturally.
                console.log("run " + key + " size array: " +_sizesArray[key].width);
                console.log("run " + key + " size : " + size);
                console.log(err);
                var scalingFactor = Math.min(
                    _sizesArray[key].width /
                    size.width,
                    _sizesArray[key].width / size.height
                );
                console.log("run " + key + " scalingFactor : " + scalingFactor);
                var width = scalingFactor * size.width;
                var height = scalingFactor * size.height;
                console.log("run " + key + " width : " + width);
                console.log("run " + key + " height : " + height);
                var index = key;
                this.resize(width, height).toBuffer('JPG', function(err, buffer) {
                    if (err) {
                        next(err);
                    } else {
                        console.timeEnd("processImage");
                        next(null, buffer, key);
                    }
                });
            });
        },
        function(data, index, next) {
            console.time("uploadImage");
            console.log("upload : " + index);
            console.log("upload to path : /" +
                _sizesArray[index].destinationPath + "/" + fileName);
            // Stream the transformed image to a different folder.
            s3.putObject({
                Bucket: srcBucket,
                Key: _sizesArray[index].destinationPath + "/" + fileName,
                Body: data,
                ACL: 'public-read',
                ContentType: 'JPG'
            }, next);
            console.timeEnd("uploadImage");
        },
    ];
    async.forEachOf(_sizesArray, function(value, key, callback) {
        async.waterfall(_processArray, function(err, result) {
            if (err) {
                console.error(err);
            }
            // result now equals 'done'
            console.log("End of step " + key);
            callback();
        });
    }, function(err) {
        if (err) {
            console.error('---->Unable to resize ' + srcBucket + '/' + srcKey + ' due to an error: ' + err);
        } else {
            console.log('---->Successfully resized ' + srcBucket + ' and uploaded to' + srcBucket );
        }
        context.done();
    });
};
