'use strict';
const mysql = require('mysql');
const dbPoolConfig = require('../config/database');
const dbPool = mysql.createPool(dbPoolConfig);
const async = require('async');
const _ = require('underscore');

function getDiaryList(Info, callback) {
	let sql = ''+
	'SELECT '+
	'd.diary_id, '+ //일기고유id
	'd.user_id, '+ //작성자id
	'k.keyword_contents, '+ //질문내용
	'diary_contents, '+ //일기내용
	'DATE_FORMAT(diary_writeDate, "%Y, %c, %e, %W, %p %h:%i ") AS diary_writeDate, '+ //일기작성시간
	'diary_writerFeeling, '+ //일기기분상태
	'(SELECT COUNT(*) '+
	' FROM diary_status AS ds '+
	' WHERE ds.diary_id = d.diary_id '+
	' AND ds.diary_statusCode = 1) '+
	'AS diary_happy, '+ // 좋아요갯수
	'(SELECT COUNT(*) '+
	' FROM diary_status AS ds '+
	' WHERE ds.diary_id = d.diary_id '+
	' AND ds.diary_statusCode = 2) '+
	'AS diary_sad, '+ // 슬퍼요 갯수
	'(SELECT COUNT(*) '+
	' FROM diary_status AS ds '+
	' WHERE ds.diary_id = d.diary_id '+
	' AND ds.diary_statusCode = 3) '+
	'AS diary_angry, '+ // 화나요 갯수
	'CASE ds.diary_statusCode '+
	'WHEN 0 THEN 1 '+
	'WHEN 1 THEN 2 '+
	'WHEN 2 THEN 3 '+
	'ELSE 0 END  AS isLike '+
	'FROM diary AS d '+ 
	'JOIN keyword AS k ON (k.keyword_id = d.keyword_id) '+
	'LEFT JOIN '+
	'(SELECT user_id, diary_id, diary_statusCode FROM diary_status WHERE user_id = ?) AS ds ON (ds.diary_id = d.diary_id) '+
	'WHERE diary_secrit = 1 '+
	'AND d.user_id != ? '+
	'ORDER BY diary_id DESC '+
	'LIMIT ?, 50';

	// console.log(Info);
	dbPool.getConnection(function(err, dbConn) {
		if (err) {
			console.error(err);
			return callback(new Error('DatabaseError'));
		}
		dbConn.query(sql, [Info.user_id, Info.user_id, Info.page], function(err, result) {
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

function insertDiary(Info, callback) {
	// console.log(Info);
	dbPool.getConnection(function(err, dbConn) {
		if (err) {
			console.error(err);
			return callback(new Error('DatabaseError'));
		}
		async.waterfall([
			insertKeyword,
			insertContent
		], function(err, result) {
			dbConn.release();
			if (err) {
				return callback(err);
			}
			// console.log(result);
			callback(null, result);
		});

		function insertKeyword(callback) {
			let sql = 'INSERT INTO keyword(keyword_contents, keyword_type) VALUES(?, 1)';
			if (!Info.keyword_contents) {
				return callback(null, null);
			} 
			dbConn.query(sql, [Info.keyword_contents], function(err, result) {
				if (err) {
					console.error(err);
					return callback(new Error('DatabaseError'));
				}
				delete Info.keyword_contents;
				// Info.keyword_id = result.insertId;
				callback(null, result.insertId);
			});
		}

		function insertContent(InsertID, callback) {
			let sql = 'INSERT INTO diary SET ?';

			if (InsertID) {
				Info.keyword_id = InsertID;
			} else {
				delete Info.keyword_contents;
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

function updateStatus(Info, callback) {
	// console.log(Info);
	dbPool.getConnection(function(err, dbConn) {
		if (err) {
			console.error(err);
			return callback(new Error('DatabaseError'));
		}
		async.auto({
		    checkLike: function (callback) {
		    	let sql = ''+
				'SELECT '+
				'user_id, '+
				'diary_id, '+
				'diary_statusCode '+
				'FROM diary_status '+
				'WHERE user_id = ? '+
				'AND diary_id = ?;';
				dbConn.query(sql, [Info.user_id, Info.diary_id], function(err, result) {
					if (err) {
						console.error(err);
						return callback(new Error('DatabaseError'));
					}
					if (result.length === 1) {
						if(Info.diary_statusCode === result[0].diary_statusCode) {
							return callback(null, 'delete');
						}
					}
					callback(null, 'updateOrInsert');
				});
			},
		    updateOrInsert: ['checkLike', function(type, callback) {
				let sql = ''+
				'INSERT INTO '+
				'diary_status(user_id, diary_id, diary_statusCode) '+
				'VALUES(?, ?, ?) '+
				'ON DUPLICATE KEY '+
				'UPDATE user_id = ?, diary_id = ?, diary_statusCode = ?; ';
		    	if (type.checkLike !== 'updateOrInsert') {
		    		return callback(null, null);
		    	}
				dbConn.query(sql, [Info.user_id, Info.diary_id, Info.diary_statusCode, 
								Info.user_id, Info.diary_id, Info.diary_statusCode], function(err, result) {
					if (err) {
						console.error(err);
						return callback(new Error('DatabaseError'));
					}
					callback(null, Info.diary_id);
				});
		    }],
		    deleteLike: ['checkLike', function(type, callback) {
				let sql = 'DELETE FROM diary_status WHERE user_id= ? AND diary_id = ?';
		    	if (type.checkLike !== 'delete') {
		    		return callback(null, null);
		    	}
				dbConn.query(sql, [Info.user_id, Info.diary_id], function(err, result) {
					if (err) {
						console.error(err);
						return callback(new Error('DatabaseError'));
					}
					callback(null, 'deleteSuccess');
				});
		    }]
		}, function(err, results) {
			dbConn.release();
			if (err) {
				return callback(err);
			}
			// console.log(result);
			callback(null, results);
		});
	});
}

function getMyDiaryList(Info, callback) {
	let sql = ''+
	'SELECT '+
	'd.diary_id, '+ //일기고유id
	'd.user_id, '+ //작성자id
	'k.keyword_contents, '+ //질문내용
	'diary_contents, '+ //일기내용
	'DATE_FORMAT(diary_writeDate, "%Y, %c, %e, %W, %p %h:%i ") AS diary_writeDate, '+ //일기작성시간
	'diary_writerFeeling, '+ //일기기분상태
	'diary_secrit, '+ //추가된부분 (0: 비공개, 1:공개)
	'(SELECT COUNT(*) '+
	' FROM diary_status AS ds '+
	' WHERE ds.diary_id = d.diary_id '+
	' AND ds.diary_statusCode = 1) '+
	'AS diary_happy, '+ // 좋아요갯수
	'(SELECT COUNT(*) '+
	' FROM diary_status AS ds '+
	' WHERE ds.diary_id = d.diary_id '+
	' AND ds.diary_statusCode = 2) '+
	'AS diary_sad, '+ // 슬퍼요 갯수
	'(SELECT COUNT(*) '+
	' FROM diary_status AS ds '+
	' WHERE ds.diary_id = d.diary_id '+
	' AND ds.diary_statusCode = 3) '+
	'AS diary_angry '+ // 화나요 갯수
	'FROM diary AS d '+ 
	'JOIN keyword AS k ON (k.keyword_id = d.keyword_id) '+
	'WHERE d.user_id = ? '+
	'ORDER BY diary_id DESC '+
	'LIMIT ?, 50';

	// console.log(Info);
	dbPool.getConnection(function(err, dbConn) {
		if (err) {
			console.error(err);
			return callback(new Error('DatabaseError'));
		}
		dbConn.query(sql, [Info.user_id, Info.page], function(err, result) {
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

function secrit(Info, callback) {
	let sql = 'UPDATE diary SET diary_secrit = ? WHERE diary_id = ? AND user_id = ?;';
	dbPool.getConnection(function(err, dbConn) {
		if (err) {
			console.error(err);
			return callback(new Error('DatabaseError'));
		}
		dbConn.query(sql, [Info.diary_secrit, Info.diary_id, Info.user_id], function(err, result) {
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

module.exports.getDiaryList = getDiaryList;
module.exports.insertDiary = insertDiary;
module.exports.updateStatus = updateStatus;
module.exports.getMyDiaryList = getMyDiaryList;
module.exports.secrit = secrit;
