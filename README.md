# mql-mysql
Build sql dynamically

[![npm][npm]][npm-url]
[![appveyor][appveyor]][appveyor-url]


## Install
```bash
npm i --save mql-mysql
```
This package depends on `ext-mysql` which is used to make requests to the database.

## Why should you use a SQL builder?
Just to be clear, IMO, you should avoid that. Whenever is possible, write down your raw sqls. But, maybe you're are building a custom report or forms and lists based in custom values, flags and your SQL starts to look something similar to:
```javascript
var sql = "SELECT ";
for( var i in columns )
  sql += columns[i];
// ...
if( hasJoins )
  sql += joins.join( " " );

if( where )
//...
```
You may find this useful.

## Matrix Query Language
It's not exactly a language, but a matrix object. It explains how the data you want to retrieve or set should be found. It could a json file, but there is MQL class to help you do that. Let's set up an example.
```javascript
const { MQL, MQLtoMySQL } = require('mql-mysql');
const MySQL = require('ext-mysql');

// Set your MySQL db
process.env.ENCODE = "utf8";
process.env.MYSQL_HOSTNAME = "localhost";
process.env.MYSQL_USER = "root";
process.env.MYSQL_PASSWORD = "";
process.env.MYSQL_DATABASE = "test";
MySQL.CREATE_POOL();

// Create a MySQL connection
const conn = new MySQL();
await conn.init();
```
### Our first MQL
```javascript
const mql = new MQL();

// Set a table called persons and add two columns, id and name.
mql.setTable( 'persons' );
mql.persons.setColumn( 'id' );
mql.persons.setColumn( 'name' );

// Now you use this mql object to select from database.
var [sql, binds] = await MQLtoMySQL.select( mql );
console.log( sql );
// SELECT persons.id id, persons.name name FROM persons persons

// Or you can run to database
var [rows, fields] = await MQLtoMySQL.select( mql );
```

### MQL.setTable( key, name = key, primary = 'id' )
The key works as an alias, but if you don't provide a (table) name, it's going to be that too. Primary is the column name of the primary key of the table.

### MQL.setColumn( table, key, name = key, value = null, flag = MQL.GET )
The table is the alias you gave before (you have to set the table before the column), key works as an alias for the column, name of the column same rule of `setTable`. Value is used for set, where, join. And flag sets what you want to do about the column. You can access the table and set a column like `mmql.myTableAlias.setColumn( 'colName' )`.

## Examples
This mql below create a row for person table with name and age. After it gets the insert id, it will replace the `person.id` with the correct value and add the address.
```javascript
mql = new MQL();

const mql = new MQL();

mql.setTable( 'person' );
mql.person.setColumn( 'id' );
mql.person.setColumn( 'name', 'name', "John", MQL.SET );
mql.person.setColumn( 'age', 'age', 27, MQL.SET );

mql.setTable( 'address' );
mql.address.setColumn( 'id' );
mql.address.setColumn( 'person_id', 'person_id', 'person.id', MQL.JOIN );
mql.address.setColumn( 'line1', 'line1', "Street Sol VI, 123", MQL.SET );

var [ids, results] = MQLtoMySQL.insert( mql );
```

### Update
This example does the same as before, but updating value. Now we have to set a column with `MQL.EQUAL_TO` in order to create a where rule. The address will be found because of the `MQL.JOIN`. It updates and get the person row, look for a address that fits the `MQL.JOIN` if found, updates, when not, inserts a new row.
```javascript
mql = new MQL();

const mql = new MQL();

mql.setTable( 'person' );
mql.person.setColumn( 'id', 'id', 15, MQL.EQUAL_TO );
mql.person.setColumn( 'name', 'name', "John", MQL.SET );
mql.person.setColumn( 'age', 'age', 27, MQL.SET );

mql.setTable( 'address' );
mql.address.setColumn( 'id' );
mql.address.setColumn( 'person_id', 'person_id', 'person.id', MQL.JOIN );
mql.address.setColumn( 'line1', 'line1', "Street Sol VI, 123", MQL.SET );

var [ids, results] = MQLtoMySQL.update( mql );
```

### Delete
This is the same than before, I just remove the `MQL.SET` columns. You could keep those there, they are ignored.
```javascript
mql = new MQL();

const mql = new MQL();

mql.setTable( 'person' );
mql.person.setColumn( 'id', 'id', 15, MQL.EQUAL_TO );

mql.setTable( 'address' );
mql.address.setColumn( 'person_id', 'person_id', 'person.id', MQL.JOIN );

var [ids, results] = MQLtoMySQL.update( mql );
```
// TODO: More examples.


[npm]: https://badge.fury.io/js/ext-mysql.svg
[npm-url]: https://npmjs.com/package/ext-mysql

[npm]: https://img.shields.io/npm/v/ext-mysql.svg
[npm-url]: https://npmjs.com/package/ext-mysql

[appveyor]: https://ci.appveyor.com/api/projects/status/h5icr44gfb0pd4sm/branch/master?svg=true
[appveyor-url]: https://ci.appveyor.com/project/orlleite/mql-mysql/branch/master
