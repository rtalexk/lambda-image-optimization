const AWS = require('aws-sdk');
const s3 = new AWS.S3();

/**
 * Download an object from S3
 * @param { string } Bucket
 * @param { string } Key
 */
exports.download = function download(Bucket, Key) {
  return s3.getObject({ Bucket, Key }).promise();
}

/**
 * Upload an object to S3
 * @param { string } Bucket
 * @param { string } Key
 * @param { Buffer } Body
 */
exports.upload = function upload(Bucket, Key, Body) {
  return s3.putObject({ Bucket: Bucket, Key: Key, Body: Body })
    .promise().then(_ => `s3://${Bucket}/${Key}`);
}
