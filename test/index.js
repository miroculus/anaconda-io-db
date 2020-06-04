const assert = require('assert')
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

        await db1.protocols.create(document)

        const result = await db2.protocols.findOne(document.id)

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

    const returned = await db.protocols.create(attrs)

    const [result] = await db.protocols.find()

    equal(attrs, result, 'Created document was not correctly saved')
    equal(attrs, returned, 'Created document was not correctly returned')
  }))

  it('creates a document without id', withDb(async (db) => {
    const attrs = { name: 'Some Protocol', active: true }

    await db.protocols.create(attrs)

    const [result] = await db.protocols.find()

    assert(result.id, 'Missing id')
    equal(attrs.name, result.name)
    equal(attrs.active, result.active)
  }))

  it('list created documents', withDb(async (db) => {
    const documents = [
      mockDocument(),
      mockDocument(),
      mockDocument()
    ]

    await db.protocols.create(documents[0])
    await db.protocols.create(documents[1])
    await db.protocols.create(documents[2])

    const results = await db.protocols.find()

    equal(documents, results, 'Created documents were not correctly saved')
  }))

  it('find a document by id', withDb(async (db) => {
    const document = mockDocument()

    await db.protocols.create(document)

    // Fake data
    await db.protocols.create(mockDocument())
    await db.protocols.create(mockDocument())
    await db.protocols.create(mockDocument())

    const result = await db.protocols.findOne(document.id)

    equal(document, result, `Invalid response from db.protocols.findOne(${document.id})`)
  }))

  it('find all documents except id', withDb(async (db) => {
    const document = mockDocument()

    await db.protocols.create(document)

    const docs = [mockDocument(), mockDocument(), mockDocument()]

    for (const doc of docs) {
      await db.protocols.create(doc)
    }

    const result = await db.protocols.find({ id: { $not: document.id } })

    equal(docs, result, `Invalid response from db.protocols.find({ id: { $not: ${document.id} } })`)
  }))

  it('return empty when no document is found', withDb(async (db) => {
    const result = await db.protocols.findOne(1)
    equal(null, result, 'Document key was not correctly retrieved')
  }))

  it('update a document by id', withDb(async (db) => {
    const document = mockDocument()
    await db.protocols.create(document)

    const [returned] = await db.protocols.update(document.id, { newValue: 123 })
    const result = await db.protocols.findOne(document.id)

    document.newValue = 123

    equal(document, result, 'Document was not correctly updated')
    equal(result, returned, 'Update result is not the same as returned from call')
  }))

  it('update a value in a document passing "undefined" to .update', withDb(async (db) => {
    const document = mockDocument()
    await db.protocols.create(document)

    await db.protocols.update(document.id, { name: undefined })
    const result = await db.protocols.findOne(document.id)

    delete document.name

    equal(document, result, 'Document key was not correctly deleted')
  }))

  it('update multiple documents by a prop filter', withDb(async (db) => {
    const documents = [
      mockDocument({ active: true }),
      mockDocument({ active: true })
    ]

    await db.protocols.create(documents[0])
    await db.protocols.create(documents[1])

    await db.protocols.update({ active: true }, { active: false })

    await Promise.all(documents.map(async (doc) => {
      const expected = { ...doc, active: false }
      const result = await db.protocols.findOne(doc.id)
      equal(expected, result, 'Documents were not correctly updated')
    }))
  }))

  it('delete a document by id', withDb(async (db) => {
    const document = mockDocument()
    await db.protocols.create(document)

    await db.protocols.destroy(document.id)

    const result = await db.protocols.findOne(document.id)
    equal(null, result, 'Document key was not correctly deleted')
  }))

  it('delete all documents except id', withDb(async (db) => {
    const document = mockDocument()

    await db.protocols.create(document)

    for (const doc of [mockDocument(), mockDocument(), mockDocument()]) {
      await db.protocols.create(doc)
    }

    await db.protocols.destroy({ id: { $not: document.id } })

    const result = await db.protocols.find()

    equal([document], result, `Invalid response from db.protocols.destroy({ id: { $not: ${document.id} } })`)
  }))

  it('delete all documents except a value by index', withDb(async (db) => {
    const document = mockDocument({ active: true })

    await db.protocols.create(document)

    const toDelete = [
      mockDocument({ active: false }),
      mockDocument({ active: false }),
      mockDocument({ active: false })
    ]

    for (const doc of toDelete) {
      await db.protocols.create(doc)
    }

    await db.protocols.destroy({ active: { $not: true } })

    const result = await db.protocols.find()

    equal([document], result, 'Invalid response from db.protocols.destroy({ active: { $not: true } })')
  }))

  it('delete multiple documents', withDb(async (db) => {
    const documents = [
      mockDocument({ active: true }),
      mockDocument({ active: true })
    ]

    await db.protocols.create(documents[0])
    await db.protocols.create(documents[1])

    await db.protocols.destroy({ active: true })

    const results = await db.protocols.find()

    equal([], results, 'Documents were not correctly deleted')
  }))

  it('empty the database', withDb(async (db) => {
    await db.protocols.create(mockDocument())

    await db.protocols.empty()

    const result = await db.protocols.find()

    equal(0, result.length, 'The DB shouldn\'t contain documents.')
  }))
})
