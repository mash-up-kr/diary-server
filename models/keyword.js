'use strict';
const mysql = require('mysql');
const dbPoolConfig = require('../config/database');
const dbPool = mysql.createPool(dbPoolConfig);

function getKeyword(callback) {
	let sql = ''+
	'SELECT '+
	'keyword_id, '+
	'keyword_contents '+
	'FROM keyword '+
	'WHERE keyword_type = 0;';
	dbPool.getConnection(function(err, dbConn) {
		if (err) {
			console.error(err);
			return callback(new Error('DatabaseError'));
		}
		dbConn.query(sql, function(err, result) {
			dbConn.release();
			if (err) {
				console.error(err);
				return callback(new Error('DatabaseError'));
			}
			// console.log(result);
			callback(null, result);
		});
	});
}

module.exports.getKeyword = getKeyword;