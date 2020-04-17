const {
  exec,
  all,
  insertRow,
  findOne,
  find,
  update,
  destroy,
  emptyTable
} = require('./db-utils')
const { isNotValue } = require('./parse-filter')
const generateId = require('./generate-id')

const stringify = (data) => {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`Invalid value ${data}`)
  }

  return JSON.stringify(data)
}

const validIndexTypes = ['number', 'string', 'boolean']

/**
 * @typedef SchemaDefinition
 * @type {Object}
 * @property {string} tableName Name of the table were to save the documents
 * @property {string[]} indexes possible keys you will be able to find documents
 * @property {string} [primaryKey='id']
 * @property {string} [primaryKeyType='STRING']
 */

/**
 * Create a schema interface using the given connection
 * @param {SchemaDefinition} schemaDefinition
 */
module.exports = (schemaDefinition = {}) => {
  const {
    tableName,
    indexes = [],
    primaryKey = 'id',
    primaryKeyType = 'STRING'
  } = schemaDefinition

  if (!tableName) {
    throw new Error('Missing "tableName" configuration')
  }

  if (indexes.includes(primaryKey)) {
    throw new Error(`The column "${primaryKey}" cannot be indexed`)
  }

  if (indexes.includes('data')) {
    throw new Error('The column "data" is reserved and cannot be indexed')
  }

  const toRow = (attrs) => {
    const data = stringify(attrs)

    const row = { data }

    indexes.forEach((index) => {
      if (attrs[index] === null || attrs[index] === undefined) {
        row[index] = null
        return
      }

      if (!validIndexTypes.includes(typeof attrs[index])) {
        throw new Error(`Invalid value to be stored on index for column ${index}`)
      }

      row[index] = JSON.stringify(attrs[index])
    })

    return row
  }

  const parseQuery = (filter) => {
    if (!filter) return {}

    if (['number', 'string'].includes(typeof filter)) {
      return { [primaryKey]: filter }
    }

    const values = {}
    Object.keys(filter).forEach((col) => {
      if (col === primaryKey) {
        values[col] = filter[col]
        return
      }

      if (!indexes.includes(col)) {
        throw new Error('A document cannot be queried by a value that is not indexed')
      }

      values[col] = isNotValue(filter[col])
        ? { $not: JSON.stringify(filter[col].$not) }
        : JSON.stringify(filter[col])
    })

    return values
  }

  let db = null
  let inited = false

  const self = {
    schemaDefinition,

    /**
     * Initialize and Update the table on the given database, including indexes
     */
    init: async (newDB) => {
      if (inited) throw new Error(`Schema "${tableName}" already inited`)

      inited = true
      db = newDB

      await exec(db, `
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          "${primaryKey}" ${primaryKeyType} PRIMARY KEY NOT NULL,
          "data" TEXT NOT NULL
        )
      `)

      const columns = await all(db, `PRAGMA table_info("${tableName}")`)
        .then((cols) => cols.map((col) => col.name))

      // Create missing columns that are needed for indexes
      await Promise.all(indexes.map(async (index) => {
        if (columns.includes(index)) return null
        return exec(db, `ALTER TABLE "${tableName}" ADD COLUMN "${index}" TEXT`)
      }))
    },

    /**
     * Create a document, a primaryKey must be given
     * @param {object} attrs
     */
    create: async (attrs) => {
      if (!inited) throw new Error('Schema not initialized')

      // Add a custom UUID
      if (!attrs[primaryKey] && primaryKeyType === 'STRING') {
        attrs[primaryKey] = generateId()
      }

      const row = {
        ...toRow(attrs),
        [primaryKey]: attrs[primaryKey]
      }

      await insertRow(db, tableName, row)
    },

    /**
     * Destroy one or more documents on the table
     * @param {object} query
     */
    destroy: async (query) => {
      if (!inited) throw new Error('Schema not initialized')
      await destroy(db, tableName, parseQuery(query))
    },

    /**
     * Destroy one or more documents on the table
     * @param {object} query query to filter docs to be updated
     * @param {object} changes attributes to update
     */
    update: async (query, changes) => {
      if (!inited) throw new Error('Schema not initialized')

      const documents = await self.find(query)
      const results = []

      const updates = documents.map(async (doc) => {
        const attrs = { ...doc, ...changes }
        await update(db, tableName, parseQuery(attrs[primaryKey]), toRow(attrs))
        results.push(attrs)
      })

      return Promise.all(updates)
    },

    /**
     * Find one document by the given query
     * @param {object} query
     * @returns {object|null}
     */
    findOne: async (query) => {
      if (!inited) throw new Error('Schema not initialized')

      const result = await findOne(db, tableName, parseQuery(query))

      if (result === null) return null

      try {
        return JSON.parse(result.data)
      } catch (err) {
        throw new Error(`Invalid data on the database for row ${result}`)
      }
    },

    /**
     * Find multiple documents by the given query
     * @param {object} query
     * @returns {object[]}
     */
    find: async (query) => {
      if (!inited) throw new Error('Schema not initialized')
      return find(db, tableName, parseQuery(query), (row) => JSON.parse(row.data))
    },

    /**
     * Erase all the documents on the table
     */
    empty: async () => {
      if (!inited) throw new Error('Schema not initialized')
      await emptyTable(db, tableName)
    }
  }

  return self
}
