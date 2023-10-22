var express = require('express');
var router = express.Router();
var crypto=require('crypto');
var {request, ghRequest} = require('./../utils');

/*
    access_token: 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
    scope: repo,user
    token_type: bearer
*/
const toBase64 = (str) => {
    return new Buffer.from(str).toString("base64");
}
const sha = (str='') => {
    var obj = crypto.createHash('sha256');
    obj.update(str);
    return obj.digest('hex');
};

router.get('/gh/authorize', function (req, res, next) {
    let obj = req.query,
        code = obj.code || '',
        state = obj.state || '',
        client_id = '18c2c94ee9c6ceb11646',
        client_secret = 'f3714a4cb1c017a2e37218442213a4dd506cf2e2',
        redirect_uri = 'http://localhost:5713/login',
        query = (`client_id=${client_id}&client_secret=${client_secret}&code=${code}&redirect_uri=${redirect_uri}`),
        url = `https://github.com/login/oauth/access_token`;
    
    request(url, {method:'post', data: {client_id, client_secret, code, redirect_uri}}).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        res.json(resp(-1, e));
    });
});
// 获取用户信息，也可以判断用户是否登录
router.get('/gh/user', function (req, res, next) {
    ghRequest('/user').then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        res.json(e);
    });
});
// 获取仓库
router.get('/gh/repo', function (req, res, next) {
    let owner = req.query.owner,
        repo = `notem_${owner}`;
    ghRequest(`/repos/${owner}/${repo}`).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        reject(repo(-1, e));
    });
});
// 创建仓库
router.post('/gh/repo', function (req, res, next) {
    let body = req.body,
        name = `notem_${body.owner}`,
        description = body.desc || `我的笔记`;

    if(!(body?.owner || '').trim() || !(body?.desc || '').trim()) {
        return res.json({code: -1, data: {}, message: '参数异常'});
    }

    ghRequest(`/user/repos`, {
        method: 'post',
        data: {
            name,
            description,
            homepage: '',
            private: false,
            is_template: true,
        }
    }).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        reject(repo(-1, e));
    });
});
// 初始化仓库，新增 README.md 文件
router.put('/gh/init', function (req, res, next) {
    ghRequest(`/repos/yaming042/notem_yaming042/contents/README.md`, {
        method: 'put',
        data: {
            message: '首次提交',
            content: toBase64('你好，世界！'),
        }
    }).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        res.json(resp(-1, e));
    });
});

// f329913e8eedd90d0295ff62e50e64a0131318f5
router.get('/gh/test', function (req, res, next) {
    // ghRequest(`/repos/yaming042/notem_yaming042/git/ref/heads/main`).then(response => {
    //     res.json(resp(0, response));
    // }).catch(e => {
    //     res.json(resp(-1, e));
    // });

    ghRequest(`/repos/yaming042/notem_yaming042/git/trees/f329913e8eedd90d0295ff62e50e64a0131318f5`).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        res.json(resp(-1, e));
    });
});
router.post('/gh/dir', function (req, res, next) {
    ghRequest(`/repos/yaming042/notem_yaming042/contents/note/test.json`, {
        method: 'put',
        data: {
            message: '测试文件夹',
            content: toBase64('{name:123}'),
        }
    }).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        res.json(resp(-1, e));
    });
    

    // let body = req.body;

    // ghRequest(`/repos/yaming042/notem_yaming042/git/trees`, {
    //     method: 'post',
    //     data: {
    //         base_tree: 'f329913e8eedd90d0295ff62e50e64a0131318f5',
    //         tree: [
    //             {path: 'scratch', mode: '040000', type: 'tree', content: sha('123')},
    //         ],
    //     }
    // }).then(response => {
    //     res.json(resp(0, response));
    // }).catch(e => {
    //     res.json(resp(-1, e));
    // });
});




var access_token = "121.32bed1874d13e147194c8efe33f9f3a8.YGGBcEEzoADiDHk8hrIA437M65C4MIWfM3ZXpJQ.EKA6xA",
    apiPrefix = 'http://pan.baidu.com',
    projectDir = '/notem';

var resp = (code=0, data={}, message='') => {
    let result = data;
    try{
        result = JSON.parse(data);
    }catch(e){}
    if(code === 0) {
        return {code, data: result, message: message || '成功'}
    }else{
        return {code, data: result, message: message || '服务器内部错误'}
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
        res.json(resp(-1, e));
    });
});

// 查询文件列表
router.get('/bdyp/list', function (req, res, next) {
    let token = req.query.access_token || access_token;
        url = `${apiPrefix}/rest/2.0/xpan/file?method=list&access_token=${token}&dir=${projectDir}&showempty=1`;

    request(url).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        res.json(resp(-1, e));
    });
});
// 获取文档列表
router.get('/bdyp/doclist', function (req, res, next) {
    let token = req.query.access_token || access_token;
        url = `${apiPrefix}/rest/2.0/xpan/file?method=doclist&access_token=${token}&parent_path=${projectDir}&web=1`;

    request(url).then(response => {
        let baseUrl = ((response.info || [])[0] || {}).lodocpreview,
            u = baseUrl + '&part_index=0&method=newinfo';

        res.json(resp(0, response));
    }).catch(e => {
        res.json(resp(-1, e));
    });
});
router.get('/bdyp/docinfo', function (req, res, next) {
    let url = req.query.url;
    url += '&part_index=0&method=newinfo';
    console.log(333, url)
    request(url).then(response => {
        console.log(222, response)
        res.json(resp(0, response));
    }).catch(e => {
        console.log(111, e.message)
        res.json(resp(-1, e));
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
            res.json(resp(-1, e));
        });
});

module.exports = router;
