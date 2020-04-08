const { promisify } = require('util')
const sqlite3 = require('sqlite3')

const p = (obj, fn) => promisify(obj[fn].bind(obj))

const noop = p => p

const mapObject = (obj, keyMapFn, valMapFn = noop) =>
  Object.keys(obj).reduce((copy, key) => {
    copy[keyMapFn(key, obj[key])] = valMapFn(obj[key])
    return copy
  }, {})

const isNotValue = (val) => val && Object.prototype.hasOwnProperty.call(val, '$not')

const parseValue = (val) => isNotValue(val) ? val.$not : val

const parseFilter = (filter, divider = ' AND ', prefix = '') => {
  const cols = filter ? Object.keys(filter) : []

  if (cols.length === 0) return { assignments: '1 = 1', values: {} }

  const assignments = cols.map((c) => isNotValue(filter[c])
    ? `${c} <> $${prefix}${c}`
    : `${c} = $${prefix}${c}`).join(divider)
  const values = mapObject(filter, (c) => `$${prefix}${c}`, parseValue)

  return { assignments, values }
}

exports.open = (filepath) => new Promise((resolve, reject) => {
  const db = new sqlite3.cached.Database(filepath, (err) => {
    if (err) return reject(err)
    resolve(db)
  })
})

exports.run = (db, ...args) => p(db, 'run')(...args)
exports.exec = (db, ...args) => p(db, 'exec')(...args)
exports.get = (db, ...args) => p(db, 'get')(...args)
exports.all = (db, ...args) => p(db, 'all')(...args)

exports.insertRow = (db, tableName, row) => {
  const cols = Object.keys(row).join(', ')
  const values = mapObject(row, (column) => `$${column}`)
  const valuesCols = Object.keys(values).join(', ')
  const query = `INSERT INTO "${tableName}" (${cols}) VALUES (${valuesCols})`

  return exports.run(db, query, values)
}

exports.emptyTable = async (db, tableName) => {
  await exports.exec(db, `DELETE FROM "${tableName}"`)
  await exports.exec(db, 'VACUUM')
}

exports.findOne = async (db, tableName, filter) => {
  const { assignments, values } = parseFilter(filter)
  const query = `SELECT * FROM "${tableName}" WHERE ${assignments} LIMIT 1`

  const result = await exports.get(db, query, values)

  if (result === undefined) return null

  return result
}

exports.find = async (
  db,
  tableName,
  filter,
  mapFn = (doc) => doc
) => new Promise((resolve, reject) => {
  const { assignments, values } = parseFilter(filter)
  const results = []

  db.each(`SELECT * FROM "${tableName}" WHERE ${assignments}`, values, (err, row) => {
    if (err) return reject(err)
    results.push(mapFn(row))
  }, (err) => {
    if (err) return reject(err)
    resolve(results)
  })
})

exports.destroy = async (
  db,
  tableName,
  filter
) => new Promise((resolve, reject) => {
  const { assignments, values } = parseFilter(filter)
  const results = []

  db.each(`DELETE FROM "${tableName}" WHERE ${assignments}`, values, (err, row) => {
    if (err) return reject(err)
    results.push(row)
  }, (err) => {
    if (err) return reject(err)
    resolve(results)
  })
})

exports.update = async (
  db,
  tableName,
  filter,
  values
) => new Promise((resolve, reject) => {
  const where = parseFilter(filter, ' AND ', 'where_')
  const sets = parseFilter(values, ', ', 'set_')
  const results = []

  const query = `
    UPDATE "${tableName}"
    SET ${sets.assignments}
    WHERE ${where.assignments}
  `

  const params = {
    ...sets.values,
    ...where.values
  }

  db.each(query, params, (err, row) => {
    if (err) return reject(err)
    results.push(row)
  }, (err) => {
    if (err) return reject(err)
    resolve(results)
  })
})
