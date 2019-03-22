const {
  open,
  exec,
  all,
  insertRow,
  findOne,
  find,
  update,
  destroy,
  emptyTable
} = require('./lib/db-utils')

const stringify = (data) => {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`Invalid value ${data}`)
  }

  return JSON.stringify(data)
}

const validIndexTypes = ['number', 'string', 'boolean']

module.exports = (options) => {
  const {
    filepath,
    tableName,
    indexes = [],
    primaryKey = 'id',
    primaryKeyType = 'STRING'
  } = options

  let db = null

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

  const parseFilter = (filter) => {
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

      values[col] = JSON.stringify(filter[col])
    })

    return values
  }

  const self = {
    conn: db,

    connect: async () => {
      if (db) throw new Error('Cannot connect when already connected.')
      db = await open(filepath)
      self.conn = db

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
    }),

    create: async (attrs) => {
      if (!attrs[primaryKey]) {
        throw new Error(`Missing ${primaryKey} on ${attrs}`)
      }

      const row = {
        ...toRow(attrs),
        [primaryKey]: attrs[primaryKey]
      }

      await insertRow(db, tableName, row)
    },

    destroy: async (filter) => {
      await destroy(db, tableName, parseFilter(filter))
    },

    update: async (filter, changes) => {
      const documents = await self.find(filter)
      const results = []

      const updates = documents.map(async (doc) => {
        const attrs = { ...doc, ...changes }
        await update(db, tableName, parseFilter(attrs[primaryKey]), toRow(attrs))
        results.push(attrs)
      })

      return Promise.all(updates)
    },

    findOne: async (filterAttrs) => {
      const filter = parseFilter(filterAttrs)
      const result = await findOne(db, tableName, filter)

      if (result === null) return null

      try {
        return JSON.parse(result.data)
      } catch (err) {
        throw new Error(`Invalid data on the database for row ${result}`)
      }
    },

    find: (filter) =>
      find(db, tableName, parseFilter(filter), (row) => JSON.parse(row.data)),

    empty: async () => {
      await emptyTable(db, tableName)
    }
  }

  return self
}
