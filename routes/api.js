var express = require('express');
var router = express.Router();
var {request, ghRequest} = require('./../utils');
var {client_id, client_secret, redirect_uri, access_token, repoOwner} = require('./../config/config.json');

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
var reject = (code=0, data={}, message='') => {
    let result = data;
    try{
        if(data.hasOwnProperty('code') && data.hasOwnProperty('data') && data.hasOwnProperty('message')) {
            return data;
        }else if(typeof data === 'string') {
            result = JSON.parse(data);
        }else if(data?.message && !message) {
            result = {};
            message = data.message;
        }
    }catch(e){};

    if(code === 0) {
        return {code, data: result, message: message || '成功'}
    }else{
        return {code, data: result, message: message || '服务器内部错误'}
    }
};

// 获取access_token
router.get('/gh/authorize', function (req, res, next) {
    let obj = req.query,
        code = obj.code || '',
        url = `https://github.com/login/oauth/access_token`;

    request(url, {
        method:'post',
        data: {
            client_id,
            client_secret,
            code,
            redirect_uri
        }
    }).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        res.json(resp(-1, e));
    });
});
// 获取用户信息，也可以判断用户是否登录
router.get('/gh/user', function (req, res, next) {
    let authorization = req.cookies.Authorization || access_token || '',
        owner = req.cookies.owner || repoOwner || '';

    ghRequest('/user', authorization).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        res.json(reject(-1, e));
    });
});
// 获取仓库
router.get('/gh/repo', function (req, res, next) {
    let owner = req.query.owner,
        repo = `notem_${owner}`;
    ghRequest(`/repos/${owner}/${repo}`).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        res.json(reject(-1, e));
    });
});
// 创建仓库
router.post('/gh/repo', function (req, res, next) {
    let body = req.body,
        template_owner = 'yaming042',
        template_repo = 'notem_template',
        name = `notem_${body.owner}`,
        description = body.desc || `我的笔记`;

    if(!(body?.owner || '').trim() || !(body?.desc || '').trim()) {
        return res.json({code: -1, data: {}, message: '参数异常'});
    }

    // 注意：这里的模板仓库需要设置成 允许当成模板，否则会报资源不存在的错误
    ghRequest(`/repos/${template_owner}/${template_repo}/generate`, {
        method: 'post',
        data: {
            owner: body.owner,
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
router.post('/gh/dir111', function (req, res, next) {
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

// 获取仓库文件夹列表
router.get('/gh/dirlist', function (req, res, next) {
    ghRequest(`/repos/yaming042/notem_yaming042/contents`).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        res.json(reject(-1, e));
    });
});
// 新建文件夹
router.post('/gh/dir', function (req, res, next) {
    const initContent = {},
        newDirName = '测试文件夹';
    ghRequest(`/repos/yaming042/notem_yaming042/contents/${newDirName}/config.json`, {
        method: 'put',
        data: {
            message: '新增测试文件夹',
            content: toBase64(JSON.stringify(initContent)),
        }
    }).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        res.json(resp(-1, e));
    });
});

// 获取指定文件夹下的文件列表
router.get('/gh/filelist', function (req, res, next) {
    let authorization = req.cookies.Authorization || access_token || '',
        owner = req.cookies.owner || repoOwner || '',
        type = req.query.type || '';

    ghRequest(`/repos/${owner}/notem_${owner}/contents/${type}/config.json`, authorization).then(response => {
        let list = [];
        try{
            list = toJson(response?.content);
        }catch(e){}

        res.json(resp(0, list));
    }).catch(e => {
        res.json(reject(-1, e));
    });
});
// 获取指定文件的内容
router.get('/gh/file', function (req, res, next) {
    let authorization = req.cookies.Authorization || access_token || '',
        owner = req.cookies.owner || repoOwner || '',
        path = req.query.path;

    ghRequest(`/repos/${owner}/notem_${owner}/contents/${path}`, authorization).then(response => {
        res.json(resp(0, response));
    }).catch(e => {
        res.json(reject(-1, e));
    });
});
// 更新指定文件的内容，需要更新文件的 Blob sha
router.put('/gh/file', function (req, res, next) {
    let authorization = req.cookies.Authorization || access_token || '',
        owner = req.cookies.owner || repoOwner || '',
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
            if(i.id+'' === fileName+'') {
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
    let authorization = req.cookies.Authorization || access_token || '',
        owner = req.cookies.owner || repoOwner || '',
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
    let authorization = req.cookies.Authorization || access_token || '',
        owner = req.cookies.owner || repoOwner || '',
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
        if(body.memoSha && body.memoConfig) {
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
                content: toBase64(JSON.stringify(configData.concat([{...newConfigData}]))),
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
    let authorization = req.cookies.Authorization || access_token || '',
        owner = req.cookies.owner || repoOwner || '',
        path = req.body.path,
        fileSha = req.body.fileSha;

    ghRequest(`/repos/${owner}/notem_${owner}/contents/${path}`,{
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
    let authorization = req.cookies.Authorization || access_token || '',
        owner = req.cookies.owner || repoOwner || '',
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
