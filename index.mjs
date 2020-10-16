import { createServer } from 'http';
import { promises as fsp } from 'fs';
import { networkInterfaces } from 'os';

const { readFile, writeFile, mkdir } = fsp;

function getHostIp() {
  const interfaces = networkInterfaces();
  for (const devName in interfaces) {
    const devList = interfaces[devName];
    for (const netItem of devList) {
      if (!netItem.internal && netItem.family === 'IPv4') {
        return netItem.address;
      }
    }
  }
}

function createDownloadDir() {
  mkdir('./download')
    .then(() => console.log('下载目录创建成功'))
    .catch(() => console.log('下载目录已经存在，无需创建'));
}

createDownloadDir();

const server = createServer(async function (req, res) {
  const { url } = req;
  if (url === '/') {
    res.setHeader('Content-Type', 'text/html');
    res.end(await readFile('./index.html', { encoding: 'utf-8' }));
  }
  if (url === '/favicon.ico') {
    res.setHeader('Content-Type', 'image/x-icon');
    res.end(await readFile('./favicon.ico'));
  }
  if (url === '/upload') {
    req.setEncoding('binary'); // 解析为二进制文件
    const boundary = req.headers['content-type']
      .split('; ')[1]
      .replace('boundary=', '')
      .replace(/-/g, '');
    let data = '';
    req
      .on('data', (chunk) => (data += chunk))
      .once('end', async () => {
        const dataList = data.split(new RegExp('------' + boundary + '(?:--)?' + '\r\n'));
        const fileNameReg = /.*?filename="(.*?)"[\s\S]*/;
        for (let i = 1; i < dataList.length - 1; i++) {
          const [metaInfo, content] = dataList[i].split('\r\n\r\n');
          await writeFile(`./download/${metaInfo.match(fileNameReg)[1]}`, content.slice(0, -2), {
            encoding: 'binary',
          });
          console.log('成功写入文件一个:', metaInfo.match(fileNameReg)[1]);
        }
      });
    res.statusCode = 302;
    res.setHeader('Location', '/');
    res.end();
  }
});

server.listen(3000);

console.log(`服务已启动:
http://${getHostIp()}:3000
http://127.0.0.1:3000
`);
