'use strict';
const express = require('express');
const Keyword = require('../models/keyword');

const router = express.Router();

// BaseURL: http://192.168.0.17:3000/

/*
	keyword가지고오기 - get
	BaseURL/keyowrd

	Request

	Response - JSON객체
	- @성공
		status: 'ok', {String} 상태코드
		result: [{
			keyword_id: 1, {Int} 질문 고유id값
			keyword_contents: "" {String} 질문내용
		}]
	- @서버에러 - (statusCode 500)
		status: 'error'
		result: 'DatabaseError'
*/

router.get('/', function(req, res, next) {
	Keyword.getKeyword(function(err, result) {
		if (err) {
			return next(err);
		}
		res.send({
			status: 'ok',
			result: {keyword: result}
		});
	});
});


module.exports = router;