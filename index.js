'use strict';
require('dotenv').config();

const line = require('@line/bot-sdk');
const express = require('express');
const gPlaceSearch = require('./gPlaceSearch');

// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env['CHANNEL_ACCESS_TOKEN'],
  channelSecret: process.env['CHANNEL_SECRET'],
};

// create LINE SDK client
const client = new line.Client(config);

const gSearchMgr = new gPlaceSearch();

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/callback', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(`Event ${err}`);
      res.status(500).end();
    });
});

// 新增 place-search-bot
app.get('/', (req, res) => {
  res.json("ok");
});

// 新增 place-search-bot
let conversation = {};
function handleEvent(event) {
  if (event.replyToken === "00000000000000000000000000000000" ||
    event.replyToken === "ffffffffffffffffffffffffffffffff") {
    return Promise.resolve(null);
  }
  if (event.type === 'message' && event.message.type === 'location') {
    conversation[event.source.userId] = event.message;
    const catReply = {
      type: 'text',
      text: '輸入要查詢的地點類型與半徑範例:\r\n300restaruant\r\ncafe100\r\natm 300\r\n'
    };
    return client.replyMessage(event.replyToken, catReply);
  }
  else if (event.type === 'message' &&
    event.message.type === 'text' &&
    conversation[event.source.userId] !== undefined) {
    const lat = conversation[event.source.userId].latitude;
    const lng = conversation[event.source.userId].longitude;
    let radius = event.message.text.match(/\d/g);
    if (radius === null) {
      radius = 1500
    } else {
      radius = radius.join('');
      radius = radius < 5 ? 100 : radius;
    }
    let searchType = event.message.text.match(/[a-zA-z]+/g);
    searchType = searchType === null ? 'restaruant' : searchType.join("").toLowerCase();
    const searchParams = {
      location: `${lat},${lng}`,
      radius: radius,
      type: searchType,
      language: 'zh-TW'
    }
    delete conversation[event.source.userId];  //刪除使用者的地點暫存內容
    gSearchMgr.SearchResultImageTmp(searchParams)  //搜尋地點並產生樣板訊息
      .then((msgToUser) => {
        return client.replyMessage(event.replyToken, msgToUser);
      })      
  } else {
    const searchReply = { type: 'text', text: '傳送地址給我，我會幫你找附近的地點喔!' };
    return client.replyMessage(event.replyToken, searchReply);
  }
  return Promise.resolve(null);
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});