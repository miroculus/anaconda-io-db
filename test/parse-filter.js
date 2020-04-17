const { describe, it } = require('mocha')
const parseFilter = require('../lib/parse-filter')
const { equal } = require('./util')

describe('parseFilter', () => {
  ;[
    [
      {},
      { assignments: '1 = 1', values: {} }
    ],
    [
      { active: true },
      { assignments: 'active = $active', values: { $active: true } }
    ],
    [
      { id: 1, email: 'a@b.com' },
      { assignments: 'id = $id AND email = $email', values: { $id: 1, $email: 'a@b.com' } }
    ],
    [
      { active: { $not: true } },
      { assignments: 'active <> $active', values: { $active: true } }
    ]
  ].forEach(([given, expected]) => {
    it(`parses ${JSON.stringify(given)}`, () => {
      equal(expected, parseFilter(given))
    })
  })
})
