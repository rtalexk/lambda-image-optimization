const S3 = require('./libs/s3');
const Optimizer = require('./libs/optimize');
const Utils = require('./libs/utils');

// Quality from 0 to 100
const QUALITY = 60;

// Where images are uploaded
const ORIGIN = 'original/';

// Where optimized images will be saved
const DESTINATION = 'thumbs/';

exports.handler = async (event, ctx, cb) => {
  const validExtensions = ['jpg', 'jpeg', 'png'];

  const { bucket, object } = event.Records[0].s3;

  const fullFileName = Utils.getFileName(object.key);

  const [fileName, fileExt] = fullFileName.split('.');

  if (!validExtensions.includes(fileExt)) {
    return cb(null, `Image not processed due to .${fileExt} file extension`);
  }

  // Download image from S3
  const s3Image = await S3.download(bucket.name, `${ORIGIN}${fullFileName}`);

  // use null to optimize image without resizing
  const sizes = [null, 1200, 640, 420];

  // Uploades optimized images to S3
  const uploadPromises = sizes.map(async size => {
    const optimizedImage = await Optimizer.optimize(s3Image.Body, s3Image.ContentType, size, QUALITY);
    const objectKey = Utils.genKey(DESTINATION, fileName, size, fileExt);
    return S3.upload(bucket.name, objectKey, optimizedImage);
  });

  await Promise.all(uploadPromises);

  cb(null, 'finished');
};

// Execute function if running in local
if (process.env.LOCAL === 'true') {
  exports.handler(require('./dev/event.json'), null, (err, res) => {
    console.log(res);
  });
}
