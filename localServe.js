"use strict";
//加载所需要的模块
var http = require('http');
var url = require('url');
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
const express = require('express')
const app = express()
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({extended: false}))
//设置跨域访问
app.all("*",function(req,res,next){
    //设置允许跨域的域名，*代表允许任意域名跨域
    res.header("Access-Control-Allow-Origin","*");
    //允许的header类型
    res.header("Access-Control-Allow-Headers","content-type");
    //跨域允许的请求方式 
    res.header("Access-Control-Allow-Methods","DELETE,PUT,POST,GET,OPTIONS");
    if (req.method.toLowerCase() == 'options')
        res.send(200);  //让options尝试请求快速结束
    else
        next();
})

app.use(function(req, res, next) {

        let filePath = path.join(__dirname, url.parse(req.url).pathname);
        let pathTmep = path.extname(filePath)
        // 瓦片以.terrain作为文件名后缀
        if (pathTmep === '.terrain' && !filePath.includes('c-Lab')) {
            res.set({
                'Content-Type': 'application/octet-stream',
                'Content-Encoding': 'gzip',
            });
            // Content-Disposition: attachment;filename=2948.terrain
            res.set('Content-Disposition', 'attachment;filename='+path.basename(filePath))
        }
        next();
})
//创建服务
app.use(processRequest)
 
var port = 8080;
 
var server = http.createServer(app);

server.listen(port,  () => {
    console.log(`App listening at port ${port}`)
})
 
//响应请求的函数
function processRequest (request, response) {
    //mime类型
    var mime = {
        "css": "text/css",
        "gif": "image/gif",
        "html": "text/html",
        "ico": "image/x-icon",
        "jpeg": "image/jpeg",
        "jpg": "image/jpeg",
        "js": "text/javascript",
        "json": "application/json",
        "pdf": "application/pdf",
        "png": "image/png",
        "svg": "image/svg+xml",
        "swf": "application/x-shockwave-flash",
        "tiff": "image/tiff",
        "txt": "text/plain",
        "wav": "audio/x-wav",
        "wma": "audio/x-ms-wma",
        "wmv": "video/x-ms-wmv",
        "xml": "text/xml"
    };
    
    //request里面切出标识符字符串
    var requestUrl = request.url;
    //url模块的parse方法 接受一个字符串，返回一个url对象,切出来路径
    var pathName = url.parse(requestUrl).pathname;
 
    //对路径解码，防止中文乱码
    var pathName = decodeURI(pathName);
 
    //解决301重定向问题，如果pathname没以/结尾，并且没有扩展名
    if (!pathName.endsWith('/') && path.extname(pathName) === '') {
        pathName += '/';
        var redirect = "http://" + request.headers.host + pathName;
        response.writeHead(301, {
            location: redirect
        });
        //response.end方法用来回应完成后关闭本次对话，也可以写入HTTP回应的具体内容。
        response.end();
    }
 
    //获取资源文件的绝对路径
    var filePath = path.resolve(__dirname + pathName);
    console.log(filePath);
    //获取对应文件的文档类型
    //我们通过path.extname来获取文件的后缀名。由于extname返回值包含”.”，所以通过slice方法来剔除掉”.”，
    //对于没有后缀名的文件，我们一律认为是unknown。
    var ext = path.extname(pathName);
    ext = ext ? ext.slice(1) : 'unknown';
 
    //未知的类型一律用"text/plain"类型
    var contentType = mime[ext] || "text/plain";
 
    fs.stat(filePath, (err, stats) => {
        if (err) {
            response.writeHead(404, { "content-type": "text/html" });
            response.end("<h1>404 Not Found</h1>");
        }
        //没出错 并且文件存在
        if (!err && stats.isFile()) {
            readFile(filePath, contentType);
        }
        //如果路径是目录
        if (!err && stats.isDirectory()) {
            var html = "<head><meta charset = 'utf-8'/></head><body><ul>";
            //读取该路径下文件
            fs.readdir(filePath, (err, files) => {
                if (err) {
                    console.log("读取路径失败！");
                } else {
                    //做成一个链接表，方便用户访问
                    var flag = false;
                    for (var file of files) {
                        //如果在目录下找到index.html，直接读取这个文件
                        if (file === "index.html") {
                            readFile(filePath + (filePath[filePath.length-1]=='/' ? '' : '/') + 'index.html', "text/html");
                            flag = true;
                            break;
                        };
                        html += `<li><a href='${file}'>${file}</a></li>`;
                    }
                    if(!flag) {
                        html += '</ul></body>';
                        response.writeHead(200, { "content-type": "text/html" });
                        response.end(html);
                    }
                }
            });
        }
 
        //读取文件的函数
        function readFile(filePath, contentType){
            response.writeHead(200, { "content-type": contentType });
            //建立流对象，读文件
            var stream = fs.createReadStream(filePath);
            //错误处理
            stream.on('error', function() {
                response.writeHead(500, { "content-type": contentType });
                response.end("<h1>500 Server Error</h1>");
            });
            //读取文件
            stream.pipe(response);
        }
    });
}