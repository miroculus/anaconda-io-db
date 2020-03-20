const fs = require('fs')
const path = require('path')
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

  // If `location` is relative, take it from the root
  const filepath = location === ':memory:'
    ? ':memory:'
    : path.resolve(__dirname, '..', location)

  const self = {
    conn: db,

    connect: async () => {
      if (db) throw new Error('Cannot connect when already connected.')

      db = await dbUtils.open(filepath)
      self.conn = db

      const schemas = schemaDefinitions.map((schemaDefinition) => {
        // do not allow JS reserved object words like __proto__ nor current
        // self used key, this will also check for repeated tableNames
        if (schemaDefinition.tableName in self) {
          throw new Error(`The tableName "${schemaDefinition.tableName}" is not a valid name`)
        }

        const schema = createSchema(db, schemaDefinition)

        self[schemaDefinition.tableName] = schema

        return schema
      })

      await Promise.all(schemas.map((schema) => schema.init()))

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

  return self
}

createDB.exists = (location) => {
  if (location === ':memory:') return false
  const filepath = path.resolve(__dirname, '..', location)
  return fs.existsSync(filepath)
}

module.exports = createDB
