const { customAlphabet } = require('nanoid')

const generate = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 18)

/**
 * Generate a secure random id with length 18
 *
 * Acording to https://zelark.github.io/nano-id-cc/, generating 1000 ids per sec,
 * we need ~456 years years in order to have a 1% probability of one collision.
 *
 * @returns {string} random id
 */
module.exports = function generateId () {
  return generate()
}
