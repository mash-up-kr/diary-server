'use strict';
const express = require('express');
const Account = require('../models/account');

const router = express.Router();

// BaseURL: http://192.168.0.17:3000/

/*
	회원가입or로그인 - post
	BaseURL/account
	
	Request
	- @body
		deviceID {String} 디바이스 ID값

	Response - JSON객체
	- @성공
		status: 'ok', {String} 상태코드
		result: insertID {Int} 사용자고유ID값
	- @서버에러 - (statusCode 500)
		status: 'error'
		result: 'DatabaseError'
*/

router.post('/', function(req, res, next) {
	let Info = {
		user_deviceid: req.body.deviceID,
	}

	Account.signupAndLogin(Info, function(err, result) {
		if (err) {
			return next(err);
		}
		res.send({
			status: 'ok',
			result: result
		});
	});
});


module.exports = router;
