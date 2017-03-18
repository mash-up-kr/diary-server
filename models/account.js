'use strict';
const mysql = require('mysql');
const dbPoolConfig = require('../config/database');
const dbPool = mysql.createPool(dbPoolConfig);
const async = require('async');

function signupAndLogin(Info, callback) {
	dbPool.getConnection(function(err, dbConn) {
		if (err) {
			return callback(new Error('DatabaseError'));
		}

		async.waterfall([
			checkDeviceID,
			insertDeviceID
		], function(err, result) {
			dbConn.release();
			if (err) {
				return callback(new Error('DatabaseError'));
			}
			callback(null, result);
		});

		function checkDeviceID(callback) {
			let sql = 'SELECT user_id FROM user WHERE user_deviceid = ?';
			dbConn.query(sql, [Info.user_deviceid], function(err, result) {
				if (err) {
					console.error(err);
					return callback('DatabaseError');
				}
				if (result.length === 0) {
					callback(null, null);
				} else {
					callback(null, result[0].user_id);
				}
			});
		}

		function insertDeviceID(type, callback) {
			let sql = 'INSERT INTO user SET ?';
			if (type) {
				return callback(null, type);
			}
			dbConn.query(sql, Info, function(err, result) {
				if (err) {
					console.error(err);
					return callback(new Error('DatabaseError'));
				}
				callback(null, result.insertId);
			});
		}
	});
}

module.exports.signupAndLogin = signupAndLogin;