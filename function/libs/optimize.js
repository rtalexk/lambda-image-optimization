const Halpert = require('jimp');

/**
 * Get an image as {buffer} and optimize with {size} and {quality}
 * @param { Buffer } buffer
 * @param { string } mime Mimetype of image (ex. image/jpeg)
 * @param { number } size Width of new image. null to keep original size
 * @param { number } quality 0-100 quality
 * @returns { Promise<Buffer> } Optimized image
 */
exports.optimize = async function optimize(buffer, mime, size, quality) {
  const data = await Halpert.read(buffer)
  if (size !== null) {
    data.resize(size, Halpert.AUTO);
  }
  data.quality(quality);

  return data.getBufferAsync(mime);
}
