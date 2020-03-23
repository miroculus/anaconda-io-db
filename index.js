const dbUtils = require('./lib/db-utils')
const createSchema = require('./lib/schema')

/**
 * @typedef SchemaDefinition
 * @type {Object}
 * @property {string} tableName Name of the table were to save the documents
 * @property {string[]} indexes possible keys you will be able to find documents
 * @property {string} [primaryKey='id']
 * @property {string} [primaryKeyType='STRING']
 */

/**
 * Create a connection to a sqlite db using the given schema JSON dbs
 * @param {string} location Route to the db file, could be ':memory:', or a path
 * @param {SchemaDefinition[]} schemaDefinitions
 */
const createDB = (location, schemaDefinitions) => {
  let db = null

  const schemas = schemaDefinitions.map(createSchema)

  const self = {
    conn: db,

    connect: async () => {
      if (db) throw new Error('Cannot connect when already connected.')

      db = await dbUtils.open(location)
      self.conn = db

      await Promise.all(schemas.map((schema) => schema.init(db)))

      return self
    },

    disconnect: () => new Promise((resolve, reject) => {
      const conn = db

      db = null
      self.conn = null

      if (conn && conn.open) {
        conn.close((err) => {
          if (err) return reject(err)
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  schemas.forEach((schema) => {
    const { schemaDefinition } = schema

    // do not allow JS reserved object words like __proto__ nor current
    // self used key, this will also check for repeated tableNames
    if (schemaDefinition.tableName in self) {
      throw new Error(`The tableName "${schemaDefinition.tableName}" is not a valid name`)
    }

    self[schemaDefinition.tableName] = schema
  })

  return self
}

module.exports = createDB
