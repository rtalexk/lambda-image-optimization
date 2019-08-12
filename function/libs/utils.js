/**
 * Generate an object key based on {size}
 * @param { string } dest Prefix of where images will be stored
 * @param { string } fileName
 * @param { number } size
 * @param { string } fileExt ex. png, jpg, jpeg (without dot)
 */
exports.genKey = function genKey(dest, fileName, size, fileExt) {
  return size
    ? `${dest}${fileName}_thumb_${size}.${fileExt}`
    : `${dest}${fileName}_original.${fileExt}`;
}

/**
 * Extract fileName from Object key by removing prefixes and cleaning non-ASCII characters
 * @param { string } key
 */
exports.getFileName = function getFileName(key) {
  // Object key may have spaces or unicode non-ASCII characters. Remove prefix
  return decodeURIComponent(key.replace(/\+/g, ' '))
    .split('/').pop();
}
