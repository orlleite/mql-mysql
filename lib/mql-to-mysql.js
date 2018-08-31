const MQL = require('./mql');

String.isString = function (v) { return v && v.constructor === String };

module.exports = class MQLtoMySQL
{
    static columnSelection(cglue, lend, column, ckey, tkey)
    {
        var asset = '',
            cckey;
        if(column.name != null)
        {
            asset = ' ' + ckey;
            cckey = column.name;
        }
        else
        {
            cckey = ckey;
        }

        var temp = cglue + lend + tkey + '.' + cckey + asset;
        cglue = ', ';

        return [temp, cglue];
    }

    static getRealPath(data, val, link)
    {
        link.v = false;
        var path = val.split('.');

        if(data[path[0]] && data[path[0]][path[1]])
        {
            var column = data[path[0]][path[1]];

            if(column.length > 1 && column.name)
            {
                link.v = true;
                return path[0] + '.' + column.name;
            }
            else
            {
                return val;
            }
        }
        else
        {
            if(path.length > 1) link.v = true;
            // Problem related to join orders found here and fixed by adding link.v = true;
            // Need to check if all situations are this way solved.
            // link.v = true;
            return val;
        }
    }

    static async select(mql, db)
    {
        var lend = '',
            ltab = '';
        if(process.env.ENV == 'development')
        {
            this.debug = [];
            lend = "\n";
            ltab = '	';
        }
        // this.printQuery( mql );exit; echo '<br />';
        // print_r( mql );exit;


        var binds = [];
        var sql = 'SELECT ';
        if(mql.options && mql.options.count == true)
        {
            sql += 'SQL_CALC_FOUND_ROWS ';
        }

        var join = [];

        var from, where, order, fglue, cglue, jglue, wglue, oglue = '';
        from = where = order = fglue = cglue = jglue = wglue = oglue = '';

        var link = { v: false };
        var loadedTables = {};
        var appliedTables = [];

        var target = mql.tables[mql.target];
        if(target == null)
        { //assert
            console.log('mql.target \'' + mql['target'] + '\' cannot be null');
        }

        if(target.union)
        {
            from = '(';
            glue = '';
            for(var i in target.union)
            {
                var select = target.union[i];
                var temp = this.select(select);

                if(Array.isArray(temp))
                {
                    // TODO: Change to some default PHP function
                    // to join arrays.
                    for(var i in temp[1]) binds.push(temp[1][i]);

                    from += glue + lend + temp[0];
                }
                else
                {
                    from += glue + lend + temp;
                }

                glue = ' UNION ';
            }
            from += ') ' + mql.target;
            loadedTables[mql.target] = [];
            appliedTables.push(mql.target);
            fglue = ', ';
        }
        else
        {
            // print_r( target )."\n";
            if(String.isString(target.table))
            {
                from = target.table + ' ' + mql.target;
                fglue = ', ';
            }
            else
            {
                var temp = this.select(target.table);

                if(Array.isArray(temp))
                {
                    // TODO: Change to some default PHP function
                    // to join arrays.
                    for(var i in temp[1]) binds.push(temp[1][i]);

                    tsql = temp[0];
                }
                else
                {
                    tsql = temp;
                }

                from = '(' + tsql + ') ' + mql.target;
                fglue = ', ';
            }

            loadedTables[mql.target] = [];
            appliedTables.push(mql.target);
        }

        for(var tkey in mql['data'])
        {
            var table = mql['data'][tkey];
            var opts = mql['tables'][tkey];
            if(opts && opts['order'])
            {
                // print_r( opts['order'] );
                for(var k in opts['order'])
                {
                    var o = opts['order'][k];
                    order += oglue + tkey + '.' + k + ' ' + o;
                    // print_r( order );
                    oglue = ', ';
                }
            }

            for(var ckey in table)
            {
                var column = table[ckey];
                // console.log( ckey, column );
                // echo tkey.".".ckey." ";

                if(column.name == null) column.name = ckey;

                switch(column.flag)
                {
                case MQL.GET:
                    [t, cglue] = this.columnSelection(cglue, lend, column, ckey, tkey);
                    sql += t;
                    break;

                case MQL.SET:
                    sql += lend + cglue + lend + '(' + 
                        ( isNaN( column.value ) ? ('"' + column.value + '"') : column.value )
                        + ') AS ' + ckey;
                    cglue = ', ';
                    break;

                case MQL.SET_RULE:
                    if(column.value[1]) binds.push(column.value[1]);
                    sql += lend + cglue + lend + '(' + column.value[0] + ') AS ' + ckey;
                    cglue = ', ';
                    break;

                case MQL.WHERE_RULE:
                    binds.push(column.value[1]);
                    where += wglue + '(' + column.value[0] + ')';
                    wglue = ' AND ';
                    break;

                case MQL.EQUAL_TO:
                    [t, cglue] = this.columnSelection(cglue, lend, column, ckey, tkey);
                    sql += t;

                    where += wglue + tkey + '.' + column.name + '=?';

                    binds.push(column.value);
                    wglue = ' AND ';
                    break;

                case MQL.LIKE:
                    [t, cglue] = this.columnSelection(cglue, lend, column, ckey, tkey);
                    sql += t;
                    where += wglue + tkey + '.' + column.name + ' LIKE ?';
                    binds.push(val);
                    wglue = ' AND ';
                    break;

                case MQL.LEFT_JOIN:
                case MQL.RIGHT_JOIN:
                case MQL.INNER_JOIN:
                case MQL.OUTER_JOIN:
                case MQL.JOIN:
                    var tableJoin;
                    if(String.isString(opts['table']))
                    {
                        tableJoin = opts['table'];
                    }
                    else
                    {
                        temp = this.select(target['table']);

                        if(Array.isArray(temp))
                        {
                            // TODO: Change to some default PHP function
                            // to join arrays.
                            for(var i in temp[1]) binds.push(temp[1][i]);
                            tsql = temp[0];
                        }
                        else
                        {
                            tsql = temp;
                        }

                        tableJoin = '(' + tsql + ')';
                    }

                    var jtype = this.joinType(column.flag);
                    var rule = tkey + '.' + column.name +
                        '=' + this.getRealPath(mql['data'], column.value, link);
                    // echo rule."\n";
                    var on = column.value.split('.');

                    if(join[tkey] == null)
                    {
                        loadedTables[tkey] = [];

                        join[tkey] = lend + jtype + tableJoin + ' AS ' + tkey + ' ON ' + rule;
                    }
                    else
                    {
                        join[tkey] += ' AND ' + rule;
                    }

                    if(link.v)
                    {
                        loadedTables[tkey].push(on[0]);
                    }

                    break;
                }
            }
        }

        var keys = Object.keys(loadedTables);
        // print_r( keys );
        for(var key in mql['tables'])
        {
            var table = mql['tables'][key];
            //echo "loading: ".in_array( key, loadedTables )." && ";
            // print_r( table['force-load'] == true );

            // TODO: Need to check why force-load is/was needed.
            // if( !in_array( key, loadedTables ) && table['force-load'] == true )
            if(!keys.includes(key))
            {
                // echo "mql 344: ".key."\n";
                from += fglue + lend + table['table'] + ' AS ' + key;
                loadedTables[key] = [];
                appliedTables.push(key);

            }
        }

        // Custom select, workaround for today.
        if(mql['select'].length)
        {
            for(var i in mql['select'])
            {
                var item = mql['select'][i]
                sql += cglue + lend + item;
            }
        }

        // Custom where, workaround for today.
        if(mql['where'] && mql['where'].length)
        {
            for(var i in mql['where'])
            {
                var item = mql['where'][i];

                if(wglue != '') wglue = ' ' + item[0] + ' ';
                where += wglue + item[1];
                wglue = ' ';
            }
        }

        if(mql['custom-where'])
        {
            where += wglue + '(' + mql['custom-where'] + ')';
        }

        // sort joins
        var sortedJoins = "";
        keys = Object.keys(join);
        var i = 0;
        var d = 0;

        var loadedTablesKeys = Object.keys(loadedTables);
        while(appliedTables.length < loadedTablesKeys.length)
        {
            // No more creativity for vars names. target, table
            var t = keys[i];
            // 	console.log( appliedTables );
            // echo t."\n";
            if(!appliedTables.includes(t))
            {
                var load = loadedTables[t];
                var canload = true;
                for(var i in load)
                {
                    var l = load[i];
                    // console.log('for: ' + l);
                    if(!appliedTables.includes(l))
                    {
                        // echo t." ".l."\n";
                        canload = false;
                        break;
                    }
                }

                if(canload)
                {
                    sortedJoins += ' ' + join[t];
                    appliedTables.push(t);
                }
            }

            d++;
            i++;

            if(d > 25)
            {
                // debug_print_backtrace();
                throw new Error("MQLtoMySQL: Sorting join tables could not load: " +
                    keys.diff(appliedTables).join(', ') +
                    "\nLoaded: " + appliedTables.join(', '));
                break;
            }

            if(i == keys.length) i = 0;
        }

        sql += ' ' + lend + 'FROM ' + from + sortedJoins;
        if(where != '') sql += ' ' + lend + 'WHERE ' + where;

        if(mql.group && mql.group.length > 0)
            sql += ' ' + lend + 'GROUP BY ' + mql.group.join(',');

        if(mql.order)
        {
            order = oglue = '';
            for(var k in mql.order)
            {
                var o = mql.order[k];
                order += oglue + o[0] + ' ' + o[1];
                oglue = ', ';
            }
        }

        if(order != '') sql += lend + ' ORDER BY ' + order;

        if(mql.slice != null)
        {
            if(typeof mql.slice.limit != "undefined") sql += ' ' + lend + 'LIMIT ' + mql.slice.limit;
            if(typeof mql.slice.offset != "undefined") sql += ' OFFSET ' + mql.slice.offset;
        }

        if(db == null)
        {
            return await [sql, binds];
        }
        else
        {
            return await db.execute(sql, binds);
        }
    }

    static joinType(type)
    {
        switch(type)
        {
        case MQL.LEFT_JOIN:
            return 'LEFT JOIN ';

        case MQL.RIGHT_JOIN:
            return 'RIGHT JOIN ';

        case MQL.INNER_JOIN:
            return 'INNER JOIN ';

        case MQL.OUTER_JOIN:
            return 'OUTER JOIN ';

        case MQL.JOIN:
            return 'JOIN ';
        }
    }

    static findColumnValue(column, data, linkage = { v: false })
    {
        switch(column.flag)
        {
        case MQL.SET:
        case MQL.LIKE:
        case MQL.SET_RULE:
        case MQL.WHERE_RULE:
            return column.value;

        case MQL.EQUAL_TO:
            return column.value;

        case MQL.SMART_SET:
        case MQL.LEFT_JOIN:
        case MQL.RIGHT_JOIN:
        case MQL.INNER_JOIN:
        case MQL.OUTER_JOIN:
        case MQL.JOIN:
            var fchar = column.value.substr(0, 1);

            if(fchar == '"')
            {
                return column.value.substr(1, column.value.length - 2);
            }
            else if(/[\d\+\-]/.test(fchar)) // digit, pos or neg sign.
            {
                return column.value;
            }
            else if(!/[A-Za-z]/.test(fchar))
            {
                throw new Error("MQLtoMySQL: Not supported '" + column.value + "'. Please, add a issue about how you got this situation.");
                //equal = explode( column )
            }
            else
            {
                linkage.v = true;
                var path = column.value.split('.');
                var ncol = data[path[0]] ? data[path[0]][path[1]] : null;

                //echo "ncol: "; print_r( path ); echo "\n";
                //echo "res: ".ncol."\n";

                if(ncol != null)
                {
                    return this.findColumnValue(ncol, data);
                }

                return null;
            }
            break;

            /*
                linkage = true;
                path = explode( '.', column.value );
                ncol = data[path[0]] ? data[path[0]][path[1]] : null;
                
                //echo "ncol: "; print_r( path ); echo "\n";
                //echo "res: ".ncol."\n";

                if( ncol != null )
                {
                    return mql::findColumnValue( ncol, data );
                }

                return null;
            */
        }
    }

    static async insert(mql, db)
    {
        mql = mql.clone();
        for(var key in mql['tables'])
        {
            var table = mql['tables'][key];
            table['insert'] = true;
        }

        return await this.update(mql, db);
    }

    static async update(mql, db)
    {
        try
        {
            db.beginTransaction();

            var debug;
            if(process.env.ENV == 'development')
            {
                debug = [];
            }
            // print_r( mql );exit;

            var ids = {};
            var results = [];
            var data = mql['data'];
            var tables = Object.keys(data);
            var queue = Object.keys(tables);

            var t = 0;
            var i = 0;
            while(queue.length > 0 && t < queue.length)
            {
                var targetName = tables[queue[i]];
                var target = data[targetName];
                var columns = {};
                var where = {};
                var cancreate = true;
                var link = { v: false };

                // echo targetName."\n";
                // print_r( target );echo "\n";
                for(var ckey in target)
                {
                    var column = target[ckey];

                    link.v = false;
                    var name = column.name && column.name != "" ? column.name : ckey;
                    var value = this.findColumnValue(column, data, link);

                    // echo ckey." ";print_r( column )."\n";
                    if(value === null && column.value !== null)
                    {
                        console.log("can't created: " + column.value);
                        // echo ckey." can't created ".column.value."\n";
                        cancreate = false;
                        break;
                    }
                    else
                    {
                        switch(column.flag)
                        {
                        case MQL.SET:
                        case MQL.SMART_SET:
                            // case MQL.SMART_SET:
                            // if( name == 'using_person_data' ) var_dump( value );
                            columns[name] = value;
                            break;

                        case MQL.SET_RULE:
                            columns[name] = value;
                            break;

                        case MQL.EQUAL_TO:
                        case MQL.LEFT_JOIN:
                        case MQL.RIGHT_JOIN:
                        case MQL.INNER_JOIN:
                        case MQL.OUTER_JOIN:
                        case MQL.JOIN:

                        case MQL.WHERE_RULE:
                            if(mql['tables'][targetName]['insert'])
                                columns[name] = value;
                            else
                                where[name] = value;
                            break;

                        case MQL.IGNORE:
                            console.log('MQLtoMySQL: ' + name + ' was ignored');
                            break;

                            /*
                            Not supported
                            
                            case MQL.LIKE:
                                sql   .= this.columnSelection( cglue, lend, column, ckey, tkey );
                                where .= wglue.tkey.'.'.column.name.' LIKE ?';
                                binds[] = val;
                                wglue  = ' AND ';
                                break;*/
                        }
                    }

                    //if( count( column ) > 3 )
                    // value = array( column.flag, mql::findColumnValue( column[3], data, link ) );
                    //else
                    //{
                    //	value = mql::findColumnValue( column.value, data, link );
                    //}

                }

                //echo "Can create? : ".cancreate."\n";
                // print_r( array( 'table' => targetName, 'cols' => columns, 'where' => where ) );//exit;
                var id;
                if(cancreate && Object.keys(columns).length > 0)
                {
                    if(debug != null)
                    {
                        debug.push(
                        {
                            table: targetName,
                            cols: columns,
                            where: where
                        });
                    }

                    // print_r( array( 'table' => targetName, 'cols' => columns, 'where' => where ) );//exit;
                    if(!mql.tables[targetName].insert && Object.keys(where).length > 0)
                    {
                        /*
                        echo mql['tables'][ targetName ]['table']."\n\n";
                        print_r( columns );
                        echo "\n\n";
                        print_r( where );
                        echo "\n\n\n\n";
                        // */

                        var sql = 'SELECT * FROM ' +
                            mql.tables[targetName].table +
                            ' WHERE ';
                        var binds = [];
                        var glue = '';

                        for(var k in where)
                        {
                            var v = where[k];

                            sql += glue + k + (Array.isArray(v) ? v[0] : ' = ? ');

                            if(Array.isArray(v))
                            {
                                if(v.length > 1)
                                {
                                    binds.push(v[1]);
                                }
                            }
                            else
                            {
                                binds.push(v);
                            }

                            glue = ' AND ';
                        }

                        var [rows, fields] = await db.execute(sql, binds);
                        if(rows.length > 0)
                        {
                            var result = await db.update(mql['tables'][targetName]['table'], columns, where);
                            results.push(result);
                        }
                        else if(result !== false)
                        {
                            for(var k in where)
                            {
                                var v = where[v];
                                columns[k] = v;
                            }

                            var [result, tids] = await db.insert(
                                mql['tables'][targetName]['table'], [columns]);
                            id = tids[0];
                            ids[targetName] = id;
                            results.push(result);

                        }
                    }
                    else
                    {
                        // print_r( columns );
                        var [result, tids] = await db.insert(mql['tables'][targetName]['table'], [columns]);
                        id = tids[0];

                        data[targetName]['id'] = { name: 'id', value: id, flag: MQL.EQUAL_TO };
                        ids[targetName] = id;
                        results.push(result);
                    }

                    queue.splice(i, 1);
                    t = 0;
                }
                else
                {
                    t++;
                }

                i++;
                if(i >= queue.length) i = 0;
            }

            db.setTransactionSuccessful();
        }
        catch(err)
        {
            console.error(err);
            throw err;
        }
        finally
        {
            db.endTransaction();

            return [ids, results];
        }
    }

    static async delete(mql, db)
    {
        try
        {
            db.beginTransaction();
            var results = [];
            var debug;
            if(process.env.ENV == 'development')
            {
                debug = [];
            }

            for(var tkey in mql.data)
            {
                var table = mql.data[tkey];
                var where = {};
                var candelete = true;
                var link = { v: false };

                for(var ckey in table)
                {
                    var column = table[ckey];
                    var name = column.name && column.name != "" ? column.name : ckey;
                    var value = this.findColumnValue(column, mql.data, link);

                    if(value === null)
                    {
                        // echo ckey." can't created ".column.value."\n";
                        candelete = false;
                        break;
                    }
                    else
                    {
                        switch(column.flag)
                        {
                        case MQL.EQUAL_TO:
                        case MQL.LEFT_JOIN:
                        case MQL.RIGHT_JOIN:
                        case MQL.INNER_JOIN:
                        case MQL.OUTER_JOIN:
                        case MQL.JOIN:
                            where[name] = value;
                            /*
                            Not supported yet.
                            case MQL.LIKE:
                                sql   .= this.columnSelection( cglue, lend, column, ckey, tkey );
                                where .= wglue.tkey.'.'.column.name.' LIKE ?';
                                binds[] = val;
                                wglue  = ' AND ';
                                break;*/
                        }
                    }
                }
                
                if(candelete)
                {
                    if(debug)
                    {
                        debug.push({ table: tkey, where: where, deleted: true });
                    }

                    results.push(await db.delete(mql.tables[tkey].table, [where]));
                }
                else
                {
                    if(debug)
                    {
                        debug.push({ table: tkey, where: where, deleted: false });
                    }
                }
            }

            db.setTransactionSuccessful();
        }
        catch(err)
        {
            console.error(err);
        }
        finally
        {
            db.endTransaction();

            return results;
        }
    }
}
