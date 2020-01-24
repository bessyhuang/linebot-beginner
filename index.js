'use strict';
require('dotenv').config();

const line = require('@line/bot-sdk');

//const request = require('request');  // 新增 place-search-bot

const express = require('express');
const path = require('path');

// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env['CHANNEL_ACCESS_TOKEN'],
  channelSecret: process.env['CHANNEL_SECRET'],
};
const client = new line.Client(config); // create LINE SDK client

const app = express();

app.set('views', path.join(__dirname, 'views'));  //設定Template目錄，畫面樣板
app.set('view engine', 'pug');  //設定Template引擎，用於產生畫面
app.use(express.static(path.join(__dirname, 'public'))); //設定可以取得的檔案

//自訂的畫面路由
app.get('/', (req, res) => {    
  res.render('index'); //自訂登入的首頁
});

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

function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    const msgToUser = {
      type: 'text',
      text: '點選以下按鈕，開啟LIFF功能！',
      quickReply: {
        items: [
          {
            type: 'message',
            action: {
              type: 'message',
              label: 'LIFF',
              text: 'line://app/1653794458-dqzvz5kg'
            }
          }
        ]
      }
    }
    return client.replyMessage(event.replyToken, msgToUser);
  }
  return Promise.resolve(null);
}

// 新增 img-uploader-bot
app.get('/', (req, res) => {
  res.json("ok");
});


// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});