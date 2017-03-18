'use strict';
const express = require('express');
const Diary = require('../models/diary');
const async = require('async');
const _ = require('underscore');

const router = express.Router();


/*

	일기(공개)리스트 불러오기
	일기작성
	일기좋아요(happy, sad, angry) API
	일기(나)리스트 불러오기

*/

// BaseURL: http://192.168.0.17:3000/


function checkUser(user_id, callback) {
	if (!user_id) {
		let err = new Error('InvaliduserID');
		err.status = 404;
		return callback(err);
	}
	callback(null)
}

/*
	공개된 일기 리스트를 불러온다. - get
	BaseURL/diary?page=

	Request
	- @header
		userid {String} 디바이스 ID값
	- @queryString
		page {Int} 페이지수 0,1,2,3,4,5 .... 

	Response - JSON객체

	- @성공
		status: 'ok', {String} 상태코드
		result: {
			diaryList: [{
				diary_id: , {Int} 일기고유id값
				user_id: , {Int} 사용자고유id값
				keyword_contents: , {String} 일기질문
				diary_contents: , {String} 일기내용
				diary_writeDate: , {Stirng} 일기작성시간
				diary_writerFeeling: , {String} 작성자기분상태 (soso, happy, sad, angry)
				diary_happy: , {Int} 좋아요갯수
				diary_sad: , {Int} 슬퍼요갯수
				diary_angry: , {Int} 화나요갯수
				isLiked: , {Int} 내가좋아요한(0: 좋아요없을시, 1: 좋아요, 2: 슬퍼요, 3: 화나요)내용

			}, {..}, {..}....] 
		}

	- @서버에러 - (statusCode 500)
		status: 'error'
		result: 'DatabaseError'
	
	- @잘못된사용자id (statusCode 401)
		status: 'error'
		result: 'InvaliduserID'

*/

router.get('/', function(req, res, next) {
	let Info = {
		user_id: req.headers.userid,
		page: parseInt(req.query.page, 10) * 50 || 0
	}
	async.series([
		_.partial(checkUser, Info.user_id),
		_.partial(Diary.getDiaryList, Info)
	], function(err, result) {
		if (err) {
			return next(err);
		}
		res.send({
			status: 'ok',
			result: {
				diaryList: result[1]
			}
		})
	});
});


/*
	일기를 작성한다. - post
	BaseURL/diary

	Request
	- @header
		userID {String} 디바이스 ID값
	- @body
		keyword_id {Int} 키워드(질문)고유id값 (직접입력할경우에만 존재)
		diary_contents {String} 일기내용 
		diary_writerFeeling {String} 작성자의기분상태(soso, happy, sad, angry)
		diary_secrit {Int} 공개상태 (공개:1, 비공개:0)
		keyword_contents {String} 키워드(질문)내용 (키워드(질문)가없을경우에만 존재)

	Response - JSON객체
	- @성공
		status: 'ok', {String} 상태코드
		result: insertID {Int} 저장된일기의 고유ID값

	- @서버에러 - (statusCode 500)
		status: 'error'
		result: 'DatabaseError'

	- @잘못된사용자id (statusCode 401)
		status: 'error'
		result: 'InvaliduserID'

	- @잘못된매개변수(파라미터) (statusCode 404)
		status: 'error'
		result: 'InvalidParameter'

*/


router.post('/', function(req, res, next) {
	var Info = {
		user_id: parseInt(req.headers.userid, 10),
		keyword_id: parseInt(req.body.keyword_id, 10) || null, //null 가능
		diary_contents: req.body.diary_contents,
		diary_writerFeeling: req.body.diary_writerFeeling,
		diary_secrit: parseInt(req.body.diray_secrit, 10) || 0,
		keyword_contents: req.body.keyword_contents || null
	}

	function checkParameter(callback) {
		if (!Info.diary_contents || !Info.diary_writerFeeling) {
			let err = new Error('InvalidParameter');
			err.status = 404;
			return callback(err);
		}
		callback(null, null);
	}

	function checkLengthKeywordContents(callback) {
		if (Info.keyword_contents) {
			if (Info.keyword_contents.length > 200) {
				let err = new Error('InvalidParameter');
				err.status = 404;
				return callback(err);
			}
		}
		callback(null, null);
	}

	async.series([
		_.partial(checkUser, Info.user_id),
		_.partial(checkLengthKeywordContents),
		_.partial(checkParameter),
		_.partial(Diary.insertDiary, Info)
	], function(err, result) {
		if (err) {
			return next(err);
		}
		res.send({
			status: 'ok',
			result: result[3]
		});
	});
});


/*

	좋아요(좋아요, 슬퍼요, 화나요)
	BaseURL/diary/:diaryID

	Request
	- @header
		userID {String} 디바이스 ID값
	- @body
		diary_statusCode {Int} 좋아요정보(1: 좋아요, 2: 슬퍼요, 3: 화나요)
	- @params
		dirayID {Int} 일기고유id값

	Response - JSON객체
	- @성공
		status: 'ok', {String} 상태코드
		result: insertID {Int} 저장된일기의 고유ID값

	- @서버에러 - (statusCode 500)
		status: 'error'
		result: 'DatabaseError'

	- @잘못된사용자id (statusCode 401)
		status: 'error'
		result: 'InvaliduserID'

	- @잘못된매개변수(파라미터) (statusCode 404)
		status: 'error'
		result: 'InvalidParameter'
*/

router.post('/:diaryID', function(req, res, next) {
	// console.log(req.body);
	// console.log(req.headers);
	// console.log(req);
	let Info = {
		user_id: parseInt(req.headers.userid, 10),
		diary_id: parseInt(req.params.diaryID, 10),
		diary_statusCode: parseInt(req.body.diary_statusCode, 10)
	};
	console.log(Info);
	async.series([
		_.partial(checkUser, Info.user_id),
		_.partial(Diary.updateStatus, Info)
	], function(err, result) {
		if (err) {
			return next(err);
		}
		res.send({
			status: 'ok',
			result: Info.diary_id
		});
	});
});


/*
	나의 일기 리스트를 불러온다. - get
	BaseURL/diary/me?page=

	Request
	- @header
		userID {String} 디바이스 ID값
	- @queryString
		page {Int} 페이지수 0,1,2,3,4,5 .... 

	Response - JSON객체

	- @성공
		status: 'ok', {String} 상태코드
		result: {
			diaryList: [{
				diary_id: , {Int} 일기고유id값
				user_id: , {Int} 사용자고유id값
				keyword_contents: , {String} 일기질문
				diary_contents: , {String} 일기내용
				diary_writeDate: , {Stirng} 일기작성시간
				diary_writerFeeling: , {String} 작성자기분상태 (soso, happy, sad, angry)
				diary_happy: , {Int} 좋아요갯수
				diary_sad: , {Int} 슬퍼요갯수
				diary_angry: , {Int} 화나요갯수
			}, {..}, {..}....] 
		}

	- @서버에러 - (statusCode 500)
		status: 'error'
		result: 'DatabaseError'
	
	- @잘못된사용자id (statusCode 401)
		status: 'error'
		result: 'InvaliduserID'

*/

router.get('/me', function(req, res, next) {
	let Info = {
		user_id: req.headers.userid,
		page: parseInt(req.query.page, 10) * 50 || 0
	}
	async.series([
		_.partial(checkUser, Info.user_id),
		_.partial(Diary.getMyDiaryList, Info)
	], function(err, result) {
		if (err) {
			return next(err);
		}
		res.send({
			status: 'ok',
			result: {
				diaryList: result[1]
			}
		})
	});
});


router.post('/:diaryID/secrit', function(req, res, next) {
	let Info = {
		user_id: parseInt(req.headers.userid, 10),
		diary_id: parseInt(req.params.diaryID, 10),
		diary_secrit: parseInt(req.body.diary_secrit, 10)
	};
	async.series([
		_.partial(checkUser, Info.user_id),
		_.partial(Diary.secrit, Info)
	], function(err, result) {
		if (err) {
			return next(err);
		}
		res.send({
			status: 'ok',
			result: Info.diary_id
		});
	});
});


module.exports = router;
