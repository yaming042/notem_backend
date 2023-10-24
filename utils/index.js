const axios = require('axios');

const resp = (code=0, data={}, message='') => {
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

// 封装发送网络请求的方法
const request = async (url, options = {}) => {
    let isUrlEncoded = options.contentType === 'application/x-www-form-urlencoded',
        isFormData = options.contentType === 'multipart/form-data',
        requestUrl = url;

    if((!options.method || options.method?.toUpperCase === 'GET') && options.data && Object.keys(options.data).length) {
        requestUrl += `?${qs.stringify(options.data || {})}`;
    }

    let ajaxOption = {
        url: requestUrl,
        method: options.method || 'GET', // 默认 get
        baseURL: ``, // baseURL 将自动加在 `url` 前面，除非 `url` 是一个绝对 URL。
        headers: {
            'Content-Type': options.contentType || 'application/json'
        },
        data: isUrlEncoded ? qs.stringify(options.data || {}) : (isFormData ? options.data : JSON.stringify(options.data || {})), // 'PUT', 'POST', 和 'PATCH'时body的参数
        timeout: 600000, // 超时时间 60秒
        responseType: options.responseType || 'json', // 表示服务器响应的数据类型
    };

    return new Promise((resolve, reject) => {
        let defaultError = {code: 101, data: null, message: '请求异常'},
            responseError = {code: 102, data: null, message: '响应异常'};

        axios(ajaxOption)
            .then((response) => {
                // data就是后端接口返回的整体
                let {data={}, status: responseStatus} = response || {},
                    {errno} = data;

                if(200 === responseStatus) {
                    if(errno !== 0) {
                        return reject(data);
                    }

                    resolve(data);
                }else{
                    reject(responseError);
                }
            }).catch(error => {
                reject(defaultError);
            });
    });
};
const ghRequest = async (url, authorization='', options = {}) => {
    let isUrlEncoded = options.contentType === 'application/x-www-form-urlencoded',
        isFormData = options.contentType === 'multipart/form-data',
        requestUrl = url;

    if((!options.method || options.method?.toUpperCase === 'GET') && options.data && Object.keys(options.data).length) {
        requestUrl += `?${qs.stringify(options.data || {})}`;
    }

    let ajaxOption = {
        url: requestUrl,
        method: options.method || 'GET', // 默认 get
        baseURL: `https://api.github.com`, // baseURL 将自动加在 `url` 前面，除非 `url` 是一个绝对 URL。
        headers: {
            'Content-Type': options.contentType || 'application/json',
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${authorization}`,
            'X-GitHub-Api-Version': '2022-11-28',
        },
        data: isUrlEncoded ? qs.stringify(options.data || {}) : (isFormData ? options.data : JSON.stringify(options.data || {})), // 'PUT', 'POST', 和 'PATCH'时body的参数
        timeout: 60000, // 超时时间 60秒
        responseType: options.responseType || 'json', // 表示服务器响应的数据类型
    };

    return new Promise((resolve, reject) => {
        let defaultError = {code: 101, data: null, message: '请求异常'},
            responseError = {code: 102, data: null, message: '响应异常'};

        axios(ajaxOption)
            .then((response) => {
                // data就是后端接口返回的整体
                let {data={}, status} = response || {};

                if([200, 201].includes(status)) {
                    resolve(data);
                }else{
                    reject(data);
                }
            }).catch(error => {
                let errorCode = error?.response?.status;
                if(errorCode === 404) {
                    reject({code: -1, data: {}, message: '资源不存在'})
                }else if(errorCode === 301) {
                    reject({code: -1, data: {}, message: '资源永久移除'})
                }else if(errorCode === 403) {
                    reject({code: -1, data: {}, message: '资源权限不足'})
                }else{
                    console.log(1, error)
                    reject(defaultError);
                }
            });
    });
};

module.exports = {
    request,
    ghRequest,
};