# mql-mysql
Build sql dynamically

[![npm][npm]][npm-url]
[![appveyor][appveyor]][appveyor-url]
[![stability][stability]][stability-url]


## Install
```bash
npm i --save mql-mysql
```

This package has three classes. MySQL, MQL and MQLtoMySQL.

## MySQL
This is a helper, a wrapper for mysql2 connection.
```javascript
const mql = require('mql-mysql');
const mysql = require('mysql2');

// create the connection to database mysql2
mql.MySQL.POOL = mysql.createPool({
  host: 'localhost',
  user: 'root',
  database: 'test',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

var conn = new mql.MySQL();

// Set ENCODE from process.env.ENCODE
await conn.init();

// You can set a logger for your connections
MySQL.LOGGER = console.info;

// Just like you'd do without it, plus, you have log
await conn.execute( 'select * from table where id = ?', [10] );
```

### Insert
You should (but not required) begin, set success and end a transaction. This is the following way of doing that.
```javascript
try
{
  // Start a transaction.
  await conn.beginTransaction();

  // Insert using array, plus, log
  var [rawResults, ids] = await conn.insert( 'table', [{ name:"John", age:27 }, { name:"Mary", age:25 }] );
  console.log( ids );// [1, 2]

  // All good
  await conn.setTransactionSuccessful();
}
catch( err )
{
  // In case of error, show it.
  console.error( err );
}
finally
{
  // In success or error, we end it making commit or rollback.
  await conn.endTransaction();
}
```
### Transaction 
Based on the idea of [SQLiteDatabase][SQLiteDatabase]. You can nest your transaction. Calling `beginTransaction` many times you want, but you have to call the same amount `setTransactionSuccessful` and `endTransaction` in order to commit or rollback.
```javascript
conn.beginTransaction();// addPerson();
// ...
  conn.beginTransaction();// setGoods();
  // ...
    conn.beginTransaction();// setGoodsAddresses();
    conn.setTransactionSuccessful();
    conn.endTransaction();
  // ...
  conn.setTransactionSuccessful();
  conn.endTransaction();
//...
conn.setTransactionSuccessful();
conn.endTransaction();
```
**A transaction ended without calling `setTransactionSuccessful` will trigger and error and rollout all your changes.**

### Update
```javascript
// UPDATE table SET father_id = 123 WHERE name = "John" AND age = 27
var rawResult = await conn.update( 'table', { father_id:123 }, { name:"John", age:27 } );
console.log( rawResult.affectedRows );
```
### Delete
```javascript
// This will run two delete queries, first matching John and second, Mary
conn.delete( 'table', [{name:John}, {name:Mary}] );
```
### Custom values
You may need custom set of value for an insert or an update, even delete.
```javascript
// UPDATE table SET balance = 0 WHERE cost >= 100
conn.update( 'table', [{balance:0}, {cost:["cost >= ?", 100]] );
```
The `cost:` (the attribute's name) is ignored, only array part is used to build the query `["cost >= ?", 100]`.

[SQLiteDatabase]: https://github.com/aosp-mirror/platform_frameworks_base/blob/master/core/java/android/database/sqlite/SQLiteDatabase.java

[npm]: https://badge.fury.io/js/ext-mysql.svg
[npm-url]: https://npmjs.com/package/ext-mysql

[npm]: https://img.shields.io/npm/v/ext-mysql.svg
[npm-url]: https://npmjs.com/package/ext-mysql

[appveyor]: https://ci.appveyor.com/api/projects/status/hucvow1n0t3q3le3/branch/master?svg=true
[appveyor-url]: https://ci.appveyor.com/project/adriancmiranda/ext-mysql/branch/master

[stability]: http://badges.github.io/stability-badges/dist/experimental.svg
[stability-url]: https://cdn.meme.am/cache/instances/folder481/500x/9689481.jpg
