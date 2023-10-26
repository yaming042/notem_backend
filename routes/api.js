var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var { request, ghRequest } = require('./../utils');
var { client_id, client_secret, redirect_uri, secretKey, algorithm, template_owner, template_repo } = require('./../config/config.json');

// 加密字符串
function encrypt(text) {
    const iv = crypto.randomBytes(16); // 生成随机的初始化向量
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + encrypted;
}

/*
    数据存储在config.json中，结构如下：
    [
        {id: '111', title: '标题11111', abstract: '摘要摘要', tags: '1,2,3,4', author: '作者', created_at: '', updated_at: ''},
        ...
    ]
*/

const toBase64 = (str) => {
    return new Buffer.from(str, 'utf-8').toString("base64");
}
const toJson = (str) => {
    return new Buffer.from(str, 'base64').toString('utf-8');
}
var resp = (code = 0, data = {}, message = '') => {
    let result = data;
    try {
        result = JSON.parse(data);
    } catch (e) { }
    if (code === 0) {
        return { code, data: result, message: message || '成功' }
    } else {
        return { code, data: result, message: message || '服务器内部错误' }
    }
};
var reject = (code = 0, data = {}, message = '') => {
    let result = data;
    try {
        if (data.hasOwnProperty('code') && data.hasOwnProperty('data') && data.hasOwnProperty('message')) {
            return data;
        } else if (typeof data === 'string') {
            result = JSON.parse(data);
        } else if (data?.message && !message) {
            result = {};
            message = data.message;
        }
    } catch (e) { };

    if (code === 0) {
        return { code, data: result, message: message || '成功' }
    } else {
        return { code, data: result, message: message || '服务器内部错误' }
    }
};


// 获取access_token
router.get('/gh/authorize', function (req, res, next) {
    let code = req.query.code || '',
        state = req.query.state || '',
        url = `https://github.com/login/oauth/access_token`;

    let time = parseInt((state+'').substring(6)),
        now = (new Date()).getTime();

    if(now - time > 1000*60*10) {
        return res.json({code: -1, data: {}, message: '链接失效，请重新操作'});
    }

    request(url, {
        method: 'post',
        data: {
            client_id,
            client_secret,
            code,
            redirect_uri
        }
    }).then(response => {
        // 这里应该目前是不会执行的
        console.log(`response: `, response);
    }).catch(e => {
        let key = 'access_token=';
        if (typeof e === 'string' && e.indexOf(key) === 0) {
            let token = e.substring(key.length).split('&')[0] || '';

            if(token) {
                res.cookie('Authorization', encrypt(token), { // token 加密
                    httpOnly: true, // 设置 httpOnly 为 true
                    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 设置过期时间为 7 天
                });

                res.json(resp(0, "授权成功"));
            }else{
                res.json(reject(-1, {message: '授权失败'}));
            }
        } else {
            res.json(reject(-1, e));
        }
    });
});
// 获取用户信息，也可以判断用户是否登录
router.get('/gh/user', function (req, res, next) {
    let authorization = req.cookies.Authorization || '';

    ghRequest('/user', authorization).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        res.json(reject(-1, e));
    });
});
// 退出登录
router.get('/gh/logout', function (req, res, next) {
    res.cookie('Authorization', '', {expires: -1});
    res.json({code: 0, data: {}, message: '成功退出'});
});

// 获取仓库
router.get('/gh/repo', function (req, res, next) {
    let authorization = req.cookies.Authorization || '',
        owner = req.cookies.owner || '',
        repo = `notem_${owner}`;

    ghRequest(`/repos/${owner}/${repo}`, authorization).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        res.json(reject(-1, e));
    });
});
// 创建仓库
router.post('/gh/repo', function (req, res, next) {
    let authorization = req.cookies.Authorization || '',
        owner = req.cookies.owner || '',
        description = req.body.desc || `我的笔记`,
        name = `notem_${owner}`;

    if (!owner || !description) {
        return res.json({ code: -1, data: {}, message: '参数异常' });
    }

    // 注意：这里的模板仓库需要设置成 允许当成模板，否则会报资源不存在的错误
    ghRequest(`/repos/${template_owner}/${template_repo}/generate`, authorization, {
        method: 'post',
        data: {
            owner,
            name,
            description,
            include_all_branches: false,
            private: false,
        }
    }).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        res.json(reject(-1, e));
    });
});

// 获取指定文件夹下的文件列表
router.get('/gh/filelist', function (req, res, next) {
    let authorization = req.cookies.Authorization || '',
        owner = req.cookies.owner || '',
        type = req.query.type || '';

    ghRequest(`/repos/${owner}/notem_${owner}/contents/${type}/config.json`, authorization).then(response => {
        let list = [];
        try {
            list = toJson(response?.content);
        } catch (e) { }

        res.json(resp(0, list));
    }).catch(e => {
        res.json(reject(-1, e));
    });
});
// 获取指定文件的内容
router.get('/gh/file', function (req, res, next) {
    let authorization = req.cookies.Authorization || '',
        owner = req.cookies.owner || '',
        path = req.query.path;

    ghRequest(`/repos/${owner}/notem_${owner}/contents/${path}`, authorization).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        res.json(reject(-1, e));
    });
});
// 更新指定文件的内容，需要更新文件的 Blob sha
router.put('/gh/file', function (req, res, next) {
    let authorization = req.cookies.Authorization || '',
        owner = req.cookies.owner || '',
        body = req.body,
        type = body.type,
        fileName = body.id,
        fileSha = body.fileSha,
        configSha = body.configSha || '',
        configData = body.configData || [],
        oneConfigData = {
            id: fileName,
            title: body.title,
            abstract: body.abstract,
            tags: body.tags,
            author: body.author,
            created_at: body.created_at || '',
            updated_at: body.updated_at || '',
        },
        newConfigData = configData.map(i => {
            if (i.id + '' === fileName + '') {
                return oneConfigData;
            }

            return i;
        }),
        content = body.content || [];

    ghRequest(`/repos/${owner}/notem_${owner}/contents/${type}/${fileName}.json`, authorization, {
        method: 'put',
        data: {
            message: `${fileName}-更新稿件`,
            content: toBase64(JSON.stringify(content)),
            sha: fileSha,
        }
    }).then(response => {
        // 更新config文件
        ghRequest(`/repos/${owner}/notem_${owner}/contents/${type}/config.json`, authorization, {
            method: 'put',
            data: {
                message: `${fileName}-更新config.json`,
                content: toBase64(JSON.stringify(newConfigData)),
                sha: configSha,
            }
        }).then(r => {
            res.json(resp(0, r));
        }).catch(e => {
            res.json(reject(-1, e));
        });
    }).catch(e => {
        res.json(reject(-1, e));
    });
});
// 更新便签配置文件
router.put('/gh/memofile', function (req, res, next) {
    let authorization = req.cookies.Authorization || '',
        owner = req.cookies.owner || '',
        body = req.body,
        fileName = body.id || '',
        content = body.content || [],
        memoSha = body.memoSha;

    ghRequest(`/repos/${owner}/notem_${owner}/contents/memo.json`, authorization, {
        method: 'put',
        data: {
            message: `${fileName}-更新便签`,
            content: toBase64(JSON.stringify(content)),
            sha: memoSha,
        }
    }).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        res.json(reject(-1, e));
    });
});
// 新增文件
router.post('/gh/file', function (req, res, next) {
    let authorization = req.cookies.Authorization || '',
        owner = req.cookies.owner || '',
        body = req.body,
        type = body.type,
        fileName = body.id,
        configSha = body.configSha || '',
        configData = body.configData || [],
        newConfigData = {
            id: fileName,
            title: body.title,
            abstract: body.abstract,
            tags: body.tags,
            author: body.author,
            created_at: body.created_at || '',
            updated_at: body.created_at || '',
        },
        content = body.content || '';

    ghRequest(`/repos/${owner}/notem_${owner}/contents/${type}/${fileName}.json`, authorization, {
        method: 'put',
        data: {
            message: `${fileName}-新增稿件`,
            content: toBase64(JSON.stringify(content)),
        }
    }).then(async (response) => {
        // 更新 便签 的memo.json文件
        if (body.memoSha && body.memoConfig) {
            await ghRequest(`/repos/${owner}/notem_${owner}/contents/memo.json`, authorization, {
                method: 'put',
                data: {
                    message: `${fileName}-delete-config.json`,
                    content: toBase64(JSON.stringify(body.memoConfig)),
                    sha: body.memoSha,
                }
            });
        }
        // 更新 对应分类 下的config文件
        ghRequest(`/repos/${owner}/notem_${owner}/contents/${type}/config.json`, authorization, {
            method: 'put',
            data: {
                message: `${fileName}-更新config.json`,
                content: toBase64(JSON.stringify(configData.concat([{ ...newConfigData }]))),
                sha: configSha,
            }
        }).then(r => {
            res.json(resp(0, r));
        }).catch(e => {
            res.json(reject(-1, e));
        });
    }).catch(e => {
        res.json(reject(-1, e));
    });
});
// 删除指定文件
router.delete('/gh/file', function (req, res, next) {
    let authorization = req.cookies.Authorization || '',
        owner = req.cookies.owner || '',
        path = req.body.path,
        fileSha = req.body.fileSha;

    ghRequest(`/repos/${owner}/notem_${owner}/contents/${path}`, {
        method: 'delete',
        data: {
            message: '删除稿件',
            sha: fileSha,
        }
    }).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        res.json(reject(-1, e));
    });
});

// 更新 memo.json
router.put('/gh/memo', function (req, res, next) {
    let authorization = req.cookies.Authorization || '',
        owner = req.cookies.owner || '',
        memoConfig = req.body.memoConfig || [],
        memoSha = req.body.memoSha,
        fileName = req.body.id;

    ghRequest(`/repos/${owner}/notem_${owner}/contents/memo.json`, authorization, {
        method: 'put',
        data: {
            message: `${fileName}-update-config.json`,
            content: toBase64(JSON.stringify(memoConfig)),
            sha: memoSha,
        }
    }).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        res.json(reject(-1, e));
    });
});

module.exports = router;
