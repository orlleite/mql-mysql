const MySQL = require('ext-mysql');
const mqlMySQL = require('./');
const MQL = mqlMySQL.MQL;
const MQLtoMySQL = mqlMySQL.MQLtoMySQL;

test('Set environment', async () => 
{
	process.env.ENCODE = "utf8";
	process.env.MYSQL_HOSTNAME = "localhost";
	process.env.MYSQL_USER = "root";
	process.env.MYSQL_PASSWORD = "Password12!";
	process.env.MYSQL_DATABASE = "test";

	MySQL.CREATE_POOL();
	// MySQL.LOGGER = console.log;
	
	conn = new MySQL();
	await conn.init();
	
	await conn.execute( 
		"CREATE TABLE IF NOT EXISTS `t1` (\
		  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,\
		  `name` varchar(60) DEFAULT NULL,\
		  PRIMARY KEY (`id`)\
		) ENGINE=InnoDB DEFAULT CHARSET=utf8;" );
	
	await conn.execute( 
		"CREATE TABLE IF NOT EXISTS `t2` (\
		  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,\
		  `t1_id` int(11) DEFAULT NULL,\
		  `value` varchar(60) DEFAULT NULL,\
		  PRIMARY KEY (`id`)\
		) ENGINE=InnoDB DEFAULT CHARSET=utf8;" );
	
	VALUE_1 = "My Name";
	VALUE_2 = "Another value";
	VALUE_3 = "New My Name";
	VALUE_4 = "New Another val";
});

test('Create MQL Object', async function() 
{
	mql = new MQL();
	mql.setTable( 't1' );
	
	mql.t1.setColumn( 'id' );
	mql.t1.setColumn( 'name', 'name', VALUE_1, MQL.GET );
	
	mql.setTable( 't2' );
	mql.t2.setColumn( 'id' );
	mql.t2.setColumn( 't1_id', 't1_id', 't1.id', MQL.JOIN );
	mql.t2.setColumn( 'value', 'value', VALUE_2, MQL.GET );
	
	const reference = 
	{
		data:
		{ 
			t1:
			{ 
				id:{ name:null, value:null, flag:MQL.GET },
				name:{ name:"name", value:VALUE_1, flag:MQL.GET }
			},
			
			t2:
			{
				id:{ name: null, value: null, flag:MQL.GET },
				
				t1_id:{ name: "t1_id", value: "t1.id", flag:MQL.JOIN },
			   	value:{ name: "value", value: VALUE_2, flag:MQL.GET },
			}
		},
		
		tables:
		{
			t1:
			{
				id: "id",
				table: "t1",
			},
			
			t2:
			{
				id: "id",
				table: "t2",
			}
		},
		
		target: "t1",
		group:[],
		options:{},
		select:[]
	};
	
	expect( mql ).toMatchObject(reference);
	expect( mql.clone() ).toMatchObject(reference);
});


test('Selection', async () => 
{
	const [sql, binds] = await MQLtoMySQL.select( mql );
	expect( sql ).toBe( 
		"SELECT t1.id id, t1.name name, t2.id id, t2.value value FROM t1 t1 JOIN t2 AS t2 ON t2.t1_id=t1.id" );
	expect( binds ).toEqual( [] );
});

test( 'Insert', async () => 
{
	// Modify to set values
	mql.t1.setColumn( 'name', 'name', VALUE_1, MQL.SET );
	mql.t2.setColumn( 'value', 'value', VALUE_2, MQL.SET );
	
	[results, ids] = await MQLtoMySQL.insert( mql, conn );
	
	var [rows, fields] = await conn.execute( "SELECT * FROM t1 WHERE id = ?", [ids["t1"]] );
	expect( rows.length ).toBe(1);
	expect( rows ).toEqual([{ id:ids["t1"], name:VALUE_1 }]);
	
	[rows, fields] = await conn.execute( "SELECT * FROM t2 WHERE id = ?", [ids["t2"]] );
	expect( rows.length ).toBe(1);
	expect( rows ).toEqual([{ id:ids["t2"], t1_id:ids["t1"], value:VALUE_2 }]);
});

test( 'Update', async () => 
{
	mql.t1.setColumn( 'id', 'id', ids["t1"], MQL.EQUAL_TO );
	mql.t1.setColumn( 'name', 'name', VALUE_3, MQL.SET );
	mql.t2.setColumn( 'value', 'value', VALUE_4, MQL.SET );
	
	[updateResults, updateIds] = await MQLtoMySQL.update( mql, conn );
	
	[rows, fields] = await conn.execute( "SELECT * FROM t1 WHERE id = ?", [ids["t1"]] );
	expect( rows.length ).toBe(1);
	expect( rows ).toEqual([{ id:ids["t1"], name:VALUE_3 }]);
	
	[rows, fields] = await conn.execute( "SELECT * FROM t2 WHERE id = ?", [ids["t2"]] );
	expect( rows.length ).toBe(1);
	expect( rows ).toEqual([{ id:ids["t2"], t1_id:ids["t1"], value:VALUE_4 }]);
});

test( 'Delete', async () => 
{
	// MySQL.LOGGER = console.log;
	results = await MQLtoMySQL.delete( mql, conn );
	
	[rows, fields] = await conn.execute( "SELECT * FROM t1 WHERE id = ?", [ids["t1"]] );
	expect( rows.length ).toBe(0);
	
	[rows, fields] = await conn.execute( "SELECT * FROM t2 WHERE id = ?", [ids["t2"]] );
	expect( rows.length ).toBe(0);
});

test('Drop table', async () => 
{
	result = await conn.execute( "DROP TABLE t1" );
	result = await conn.execute( "DROP TABLE t2" );
});

test('Release connection', async () => 
{
	expect( await conn.release() ).not.toBeNull();
});

test('End pool', async () => 
{
	expect( await MySQL.POOL.end() ).not.toBeNull();
});