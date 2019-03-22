const assert = require('assert')
const faker = require('faker')
const createDb = require('..')

exports.createProtocolsDb = (filepath = ':memory:') => createDb({
  filepath,
  tableName: 'protocols',
  indexes: ['active']
})

/**
 * Wrap a function to receive
 */
exports.withDb = (fn) => {
  return async function (...args) {
    const db = exports.createProtocolsDb()

    await db.connect()

    try {
      await fn.bind(this)(db, ...args)
    } finally {
      await db.disconnect()
    }
  }
}

/**
 * Mock a protocol
 */
exports.mockDocument = (attrs = {}) => ({
  id: faker.random.number({ min: 1000, max: 999999999 }),
  name: faker.random.words(),
  description: faker.lorem.sentence(),
  active: false,
  protocol: JSON.stringify({
    actions: [],
    edges: { starts: [] }
  }),
  time: 1,
  ...attrs
})

const toArray = (any) => Array.isArray(any) ? any : [any]

exports.equal = (expected, actual, ...args) => {
  try {
    assert.deepStrictEqual(actual, expected, ...args)
  } catch (err) {
    // Add Mocha props for a better error printing
    Object.assign(err, {
      expected: toArray(expected),
      actual: toArray(actual)
    })

    throw err
  }
}

exports.throws = async (fn, expectedErr) => {
  let throws = false

  try {
    await fn()
  } catch (err) {
    throws = true

    if (expectedErr) {
      assert.deepStrictEqual(err.message, expectedErr.message)

      Object.keys(expectedErr).forEach((key) => {
        assert.deepStrictEqual(err[key], expectedErr[key], `The expected error has a different value for "${key}"`)
      })
    }
  }

  if (throws === false) {
    const err = new Error(`The function didn't throw the expected error`)
    if (expectedErr) {
      err.actual = []
      err.expected = [expectedErr]
    }
    throw err
  }
}
