module.exports = 

class MQL
{
	static FLAG( value )
	{
		switch( value )
		{
			case MQL.IGNORE: return "IGNORE";
			case MQL.GET: return "GET";
			case MQL.SET: return "SET";
			case MQL.SMART_SET: return "SMART_SET";
			case MQL.SET_RULE: return "SET_RULE";
			case MQL.WHERE_RULE: return "WHERE_RULE";
			case MQL.EQUAL_TO: return "EQUAL_TO";

			case MQL.LIKE: return "LIKE";
			case MQL.NOT_LIKE: return "NOT_LIKE";

			case MQL.LEFT_JOIN: return "LEFT_JOIN";
			case MQL.RIGHT_JOIN: return "RIGHT_JOIN";
			case MQL.INNER_JOIN: return "INNER_JOIN";
			case MQL.OUTER_JOIN: return "OUTER_JOIN";
			case MQL.JOIN: return "JOIN";
			
			default: return "GET";
		}
	}
	
	constructor()
	{
		MQL.IGNORE			= 0;
		MQL.GET				= 1;
		MQL.SET				= 2;
		MQL.SMART_SET		= 3;
		MQL.SET_RULE		= 4;
		MQL.WHERE_RULE		= 5;
		MQL.EQUAL_TO		= 6;
		
		MQL.LIKE			= 7;
		MQL.NOT_LIKE		= 8;
		
		MQL.LEFT_JOIN		= 9;
		MQL.RIGHT_JOIN		= 10;
		MQL.INNER_JOIN	 	= 11;
		MQL.OUTER_JOIN 		= 12;
		MQL.JOIN			= 13;
		
		this.data = {};
		this.tables = {},
		this.select = [];
		this.group = [];
		this.order = [];
		this.options = {};
	}

	setTarget( key )
	{
		this.target = key;
	}

	setTable( key, name = key, primary = 'id' )
	{
		this[key] =this.tables[key] = { 'table':name, 'id':primary };
		this.data[key] = {};

		var self = this;
		this[key].setColumn = function( ckey, name = ckey, value = null, flag = MQL.GET )
		{
			self.setColumn( key, ckey, name, value, flag );
		}
		
		this[key].column = function( ckey )
		{
			return self.data[key][ckey];
		}
		
		if( !this.target )
		{
			this.target = key;
		}
	}
	
	setColumn( table, key, name = key, value = null, flag = MQL.GET )
	{
		var temp = {
			name:name,
			value:value,
			flag:flag ? flag : MQL.GET
		};
		
		this.data[table][key] = temp;
	}
	
	setCustomSelect( item )
	{
		this.select.push( item );
	}

	setSlice( offset, limit )
	{
		this.slice = { offset:offset, limit:limit };
	}
	
	addGroupBy( value )
	{
		this.group.push( value );
	}
	
	removeGroupBy( value )
	{
		var index = this.group.indexOf( value );
		
		if( index == -1 )
		{
			return false;
		}
		else
		{
			this.group.splice( index, 1 );
		}
	}
	
	groupBy()
	{
		return this.group;
	}
	
	addOrderBy( column, direction = "ASC" )
	{
		var index = this.order.findIndex( x => x[0] == column );
		
		if( index == -1 )
			this.order.push( [column, direction] );
		else
			this.order[index][0] = direction;
	}
	
	removeOrderBy( column )
	{
		var index = this.order.findIndex( x => x[0] == column );
		
		if( index == -1 )
		{
			return false;
		}
		else
		{
			this.order.splice( index, 1 );
		}
	}
	
	orderBy()
	{
		return this.order;
	}
	
	/*
	 * https://stackoverflow.com/a/728694/539623
	 */
	clone( obj = this )
	{
		var copy;

		// Handle the 3 simple types, and null or undefined
		if (null == obj || "object" != typeof obj) return obj;

		// Handle Date
		if (obj instanceof Date) {
			copy = new Date();
			copy.setTime(obj.getTime());
			return copy;
		}

		// Handle Array
		if (obj instanceof Array) {
			copy = [];
			for (var i = 0, len = obj.length; i < len; i++) {
				copy[i] = this.clone(obj[i]);
			}
			return copy;
		}

		// Handle Object
		if (obj instanceof Object) {
			copy = {};
			for (var attr in obj) {
				if (obj.hasOwnProperty(attr)) copy[attr] = this.clone(obj[attr]);
			}
			return copy;
		}

		throw new Error("Unable to copy obj! Its type isn't supported.");
	}
	
	static toHtml()
	{
		var mql = this;
		
		var result = '<table cellpadding="5" border="1">';
		
		if( mql.select.length )
		{
			result += '<tr><td><strong>CUSTOM</strong></td>';
			
			for( var i in mql.select )
			{
				var item = mql.select[i];
				result += '<td>' + item + '</td>';
			}
			
			result += '</tr>';
		}
		
		for( var tkey in mql['data'] )
		{
			var table = mql['data'][tkey];
			result += '<tr><td valign="top"><strong>' + tkey + '</strong><br />';
			if( mql['tables'][tkey]['union'] )
			{
				result += 'union:';
				var glue = '';
				for( var i in mql['tables'][tkey]['union'] )
				{
					var select = mql['tables'][tkey]['union'][i];
					result += glue + this.toHtml( select, true );
					glue = '+';
				}
				
				result += '</td>';
			}
			else
			{
				result += 'table: ' + 
					mql['tables'][tkey]['table'] + '<br />id: ' + 
					mql['tables'][tkey]['id'] + '</td>';
			}
			
			for( var ckey in table )
			{
				var column = table[ckey];
				result += '<td valign="top">' + ckey + '<br />\
					name: ' + column.name + ',<br />\
					value: ' + column.value + ',<br />\
					flag: ' + MQL.FLAG( column.flag ) + '</td>';
			}
			
			result += '</tr>';
		}
		
		return result + '</table>';
	}
}