# Anaconda IO DB

This module is intended to handle the data that is saved on the local SQLite
instance inside the devices, using the [sqlite3](https://github.com/mapbox/node-sqlite3)
library. This is achieved saving the document attributes as a JSON string on the `data` column.

## Usage

### Initialization

```javascript
const createDb = require('@miroculus/anaconda-io-db')

// The DB location can be any of the values defined here:
// https://github.com/mapbox/node-sqlite3/wiki/API#new-sqlite3databasefilename-mode-callback
const location = DB_LOCATION

const db = createDb(location, [
  {
    tableName: 'protocols', // REQUIRED: Table were to save the documents
    primaryKey: 'id', // OPTIONAL, defaults to 'id'; is the column name of the documents primary key
    indexes: ['active'] // OPTIONAL, you can add additional keys to be indexed
                        // This will allow you to find documents by the indexed column
  }
])

// Be sure to let the DB successfully connect before trying to use it
db.connect().then(() => {
  console.log('Successfully connected to the Database')
})
```

### Create a document

```javascript
await db.protocols.create({
  id: 123123123,
  name: 'Some Protocol',
  active: true,
  description: 'A little more info about the protocol',
  author: {
    id: 465,
    name: 'Jack White'
  }
})
```

👆 Keep in mind that we are only validating that the given document has an `id`,
(primaryKey) and all of the other attributes will be saved as a JSON on the DB
as is.

### Find a single document

You can find a document by id following the next example. This result will be
the data that you passed to `db.protocols.create(...)`.

```javascript
const result = await db.protocols.findOne(123123123)
const result = await db.protocols.findOne({ active: true }) // Using an indexed column
```

### Delete documents

To delete a document follow the next example. Keep in mind that this function
always returns `undefined`, without taking into account if actually deleted
something.

```javascript
await db.protocols.destroy(123123123) // This will delete the document with id `123123123`
await db.protocols.destroy({ active: true }) // This will delete ALL the documents that have `active: true`
```

### Update one or multiple documents

To update a document by ID follow the next example, and this function will return the
new update document.

```javascript
await db.protocols.update(123123123, { newValue: 123 })
```

To delete an attribute on the given document, give it a value of `undefined`:

```javascript
await db.protocols.update(123123123, { newValue: undefined })
```

You can also update multiple documents in the same operation. To do that, you can
use one of the indexed columns (in our case `active`) to query multiple documents
and set them all the same value. The following example will change all the documents
that have `active: true` and set them `newValue: 1234`:

```javascript
await db.protocols.update({ active: true }, { newValue: 1234 })
```

### List Documents

The following method will return an array with all the documents saved on the
DB.

```javascript
await db.protocols.find()
await db.protocols.find({ active: true }) // only find documents with `active: true`
```

### Destroy all documents

If you want, you can delete absolutely all documents saved on the DB using
the following command:

```javascript
await db.protocols.empty()
```

### Query filters

The available filters are shown below:

```javascript
// find by id
await db.protocols.find(123)
// same as above:
await db.protocols.find({ id: 123 })
// to find all active protocols:
await db.protocols.find({ active: true }) 
// to find all not active protocols:
await db.protocols.find({ active: { $not: true } })
// same, to find all protocol except id:
await db.protocols.find({ id: { $not: 123 } })
```

### Disconnection

This module exposes the method `db.disconnect()` to close the connection to the
database file. Normally you shouldn't use it, because the library sqlite3 handles
the disconnection automatically before the process ends.
