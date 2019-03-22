const path = require('path')
const fs = require('fs')
const { describe, it } = require('mocha')
const { createProtocolsDb, withDb, mockDocument, equal } = require('./util')

describe('json db', () => {
  it('should be able to create multiple connections to the same DB', async () => {
    const filepath = path.resolve(__dirname, 'test.sqlite')
    const db1 = createProtocolsDb(filepath)
    const db2 = createProtocolsDb(filepath)

    try {
      try {
        await db1.connect()
        await db2.connect()

        const document = mockDocument()
        await db1.create(document)

        const result = await db2.findOne(document.id)

        equal(document, result)
      } finally {
        await db1.disconnect()
        await db2.disconnect()
      }
    } finally {
      fs.unlinkSync(filepath)
    }
  })

  it('create a document', withDb(async (db) => {
    const attrs = mockDocument()

    await db.create(attrs)

    const [result] = await db.find()

    equal(attrs, result, 'Created document was not correctly saved')
  }))

  it('list created documents', withDb(async (db) => {
    const documents = [
      mockDocument(),
      mockDocument(),
      mockDocument()
    ]

    await db.create(documents[0])
    await db.create(documents[1])
    await db.create(documents[2])

    const results = await db.find()

    equal(documents, results, 'Created documents were not correctly saved')
  }))

  it('find a document by id', withDb(async (db) => {
    const document = mockDocument()

    await db.create(document)

    // Fake data
    await db.create(mockDocument())
    await db.create(mockDocument())
    await db.create(mockDocument())

    const result = await db.findOne(document.id)

    equal(document, result, `Invalid response from db.findOne(${document.id})`)
  }))

  it('return empty when no document is found', withDb(async (db) => {
    const result = await db.findOne(1)
    equal(null, result, `Document key was not correctly retrieved`)
  }))

  it('update a document by id', withDb(async (db) => {
    const document = mockDocument()
    await db.create(document)

    await db.update(document.id, { newValue: 123 })
    const result = await db.findOne(document.id)

    document.newValue = 123

    equal(document, result, `Document was not correctly updated`)
  }))

  it('update a value in a document passing "undefined" to .update', withDb(async (db) => {
    const document = mockDocument()
    await db.create(document)

    await db.update(document.id, { name: undefined })
    const result = await db.findOne(document.id)

    delete document.name

    equal(document, result, `Document key was not correctly deleted`)
  }))

  it('update multiple documents by a prop filter', withDb(async (db) => {
    const documents = [
      mockDocument({ active: true }),
      mockDocument({ active: true })
    ]

    await db.create(documents[0])
    await db.create(documents[1])

    await db.update({ active: true }, { active: false })

    await Promise.all(documents.map(async (doc) => {
      const expected = { ...doc, active: false }
      const result = await db.findOne(doc.id)
      equal(expected, result, 'Documents were not correctly updated')
    }))
  }))

  it('delete a document by id', withDb(async (db) => {
    const document = mockDocument()
    await db.create(document)

    await db.destroy(document.id)

    const result = await db.findOne(document.id)
    equal(null, result, `Document key was not correctly deleted`)
  }))

  it('delete multiple documents', withDb(async (db) => {
    const documents = [
      mockDocument({ active: true }),
      mockDocument({ active: true })
    ]

    await db.create(documents[0])
    await db.create(documents[1])

    await db.destroy({ active: true })

    const results = await db.find()

    equal([], results, 'Documents were not correctly deleted')
  }))

  it('empty the database', withDb(async (db) => {
    await db.create(mockDocument())

    await db.empty()

    const result = await db.find()

    equal(0, result.length, 'The DB shouldn\'t contain documents.')
  }))
})
