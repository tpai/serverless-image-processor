var async = require('async');
var images = require('images');
var AWS = require('aws-sdk');
var s3 = new AWS.S3();

module.exports.f = (event, context) => {
    var srcBucket = event.Records[0].s3.bucket.name;
    var srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));

    console.log('process start');
    async.waterfall([
        next => {
            console.log('get watermark');
            s3.getObject({
                Bucket: srcBucket,
                Key: 'watermark.png'
            }, next);
        },
        (response, next) => {
            console.log('got watermark');
            console.log('paste watermark');
            s3.getObject({
                Bucket: srcBucket,
                Key: srcKey
            }, (err, data) => {
                next(null,
                    images(new Buffer(data.Body))
                        .draw(images(new Buffer(response.Body)), 10, 10)
                        .encode('png')
                );
            });
        },
        (buffer, next) => {
            console.log('watermark pasted');
            console.log('upload image with watermark');
            s3.putObject({
                Bucket: srcBucket,
                Key: `watermarked/${srcKey}`,
                Body: new Buffer(buffer),
                ACL: 'public-read',
                ContentType: 'JPG'
            }, next);
        }
    ], function(err, result) {
        if (err) {
            console.error(err);
        }
        console.log('process complete');
    });
};
