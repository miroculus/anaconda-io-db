const noop = p => p

const mapObject = (obj, keyMapFn, valMapFn = noop) =>
  Object.keys(obj).reduce((copy, key) => {
    copy[keyMapFn(key, obj[key])] = valMapFn(obj[key])
    return copy
  }, {})

const isNotValue = (val) =>
  val && Object.prototype.hasOwnProperty.call(val, '$not')

const parseValue = (val) => isNotValue(val) ? val.$not : val

function parseFilter (filter, divider = ' AND ', prefix = '') {
  const cols = filter ? Object.keys(filter) : []

  if (cols.length === 0) return { assignments: '1 = 1', values: {} }

  const assignments = cols.map((c) => isNotValue(filter[c])
    ? `${c} <> $${prefix}${c}`
    : `${c} = $${prefix}${c}`).join(divider)
  const values = mapObject(filter, (c) => `$${prefix}${c}`, parseValue)

  return { assignments, values }
}

parseFilter.isNotValue = isNotValue

module.exports = parseFilter
