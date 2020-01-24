'use strict';
require('dotenv').config();

const line = require('@line/bot-sdk');
const express = require('express');

// 新增 img-uploader-bot v1
const querystring = require('querystring');
const imgur = require('./imgur');

// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env['CHANNEL_ACCESS_TOKEN'],
  channelSecret: process.env['CHANNEL_SECRET'],
};

// create LINE SDK client
const client = new line.Client(config);

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

const imgurMgr = new imgur(); // 新增 img-uploader-bot v1

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/callback', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// 新增 img-uploader-bot
app.get('/', (req, res) => {
  res.json("ok");
});

/*
// event handler
function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    // ignore non-text-message event
    return Promise.resolve(null);
  }

  // create a echoing text message
  const echo = { type: 'text', text: event.message.text };

  // use reply API
  return client.replyMessage(event.replyToken, echo);
}
*/

// 新增 img-uploader-bot
function handleEvent(event) {
  if (event.replyToken === "00000000000000000000000000000000" || event.replyToken === "ffffffffffffffffffffffffffffffff") {
    return Promise.resolve(null);
  }
  if (event.type === 'message' && event.message.type === 'image') {
    if (event.message.contentProvider.type === "line") {
      client.getMessageContent(event.message.id)
        .then((stream) => {
          let data = [];
          stream.on('data', (chunk) => {
            data.push(chunk)
          })
      stream.on('end', () => {
        const image = `${Buffer.concat(data).toString('base64')}`
        imgurMgr.uploadImg(image)  //透過imgurMgr的自訂方法上傳圖片
          .then((body) => {  //取得上傳的結果
            const resBody = JSON.parse(body);  //取出將上傳結果資料轉為JSON
            const templateMsg = imgurMgr.ShareAndDeleteTmp(event.source.userId, resBody); //產生樣板訊息
            return client.replyMessage(event.replyToken, templateMsg); //發送樣板訊息給使用者
          });
        })
      })
    }
  } else if (event.type === 'postback') {
    const data = querystring.parse(event.postback.data); //抓取查詢的參數
    switch (data.action) {
      case 'img-delete': //刪除照片
        imgurMgr.deleteImg(data.hash) //
          .then(() => {
            return client.replyMessage(event.replyToken, { type: 'text', text: 'Deleted' });
          })
        break;
    }
  }
  return Promise.resolve(null);
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});