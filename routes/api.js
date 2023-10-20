var express = require('express');
var router = express.Router();
var {request} = require('./../utils');

var access_token = "121.32bed1874d13e147194c8efe33f9f3a8.YGGBcEEzoADiDHk8hrIA437M65C4MIWfM3ZXpJQ.EKA6xA",
    apiPrefix = 'http://pan.baidu.com',
    projectDir = '/notem';

var resp = (code=0, data={}, message='') => {
    let result = data;
    try{
        result = JSON.parse(data);
    }catch(e){}
    if(code === 0) {
        return {code, data: result, message: message || 'success'}
    }else{
        return {code, data: result, message: message || 'Internal Server Error'}
    }
};

/*
    {
        "expires_in": 2592000,
        "refresh_token": "122.90e50b14bcf4a6a2ccc6dacda8766084.Y5HY-7Ai5yTVRpNzVrE6Dh-4SIa7VHlZKzyZ2kn.pvUtHg",
        "access_token": "121.32bed1874d13e147194c8efe33f9f3a8.YGGBcEEzoADiDHk8hrIA437M65C4MIWfM3ZXpJQ.EKA6xA",
        "session_secret": "",
        "session_key": "",
        "scope": "basic netdisk"
    }
*/
// 根据code获取token
router.get('/bdyp/token', function (req, res, next) {
    let appKey = 'SVbKFCPzGzDDAfEZMcciMak9DPmLu0DX',
        appSecret = 'cx8NziZjkYqF19FzKRuTGvcjfTwP3GWs',
        redirect_uri = 'oob',
        code = req.query.code,
        url = `https://openapi.baidu.com/oauth/2.0/token?grant_type=authorization_code&code=${code}&client_id=${appKey}&client_secret=${appSecret}&redirect_uri=${redirect_uri}`

    request(url, (error, response, body) => {
        if (error) {
            return res.json(resp(-1, error));
        } else {
            return res.json(resp(0, body));
        }
    });

});

// 获取用户信息，也可以判断用户是否登录
router.get('/bdyp/validate', function (req, res, next) {
    let token = req.query.access_token || access_token;
        url = `${apiPrefix}/rest/2.0/xpan/nas?method=uinfo&access_token=${token}`;

    request(url).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        res.json(resp(-1, response));
    });
});

// 查询文件列表
router.get('/bdyp/list', function (req, res, next) {
    let token = req.query.access_token || access_token;
        url = `${apiPrefix}/rest/2.0/xpan/file?method=list&access_token=${token}&dir=${projectDir}&showempty=1`;

    request(url).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        res.json(resp(-1, response));
    });
});

// 创建notem文件夹，以后就是笔记的根目录
router.post('/bdyp/newdir', function (req, res, next) {
    let token = req.query.access_token || access_token;
        url = `${apiPrefix}/rest/2.0/xpan/file?method=create&access_token=${token}`,
        options = {
            method: 'post',
            data: {
                isdir: 1, // 固定值 1
                path: express.urlencoded(projectDir), // 文件夹路径
                rtype: 0, // 重名就返回错误
            }
        }

        request(url, options).then(response => {
            res.json(resp(0, response));
        }).catch(e => {
            res.json(resp(-1, response));
        });
});

module.exports = router;
