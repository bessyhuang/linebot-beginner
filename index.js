'use strict';
require('dotenv').config();

const line = require('@line/bot-sdk');
const express = require('express');
const request = require('request');  // 新增 place-search-bot

// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env['CHANNEL_ACCESS_TOKEN'],
  channelSecret: process.env['CHANNEL_SECRET'],
};

/*
// 新增 img-uploader-bot
const imgrConfig = {
  imgurClientId: process.env['IMGUR_CLIENT_ID']
}
*/

// 新增 place-search-bot
const gMapAPI = {
  key: process.env['GOOGLE_MAP_API_KEY']
}

// create LINE SDK client
const client = new line.Client(config);

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
      console.error(err);
      res.status(500).end();
    });
});

// 新增 place-search-bot
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

/*
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
            const uploadImg = {
              url: "https://api.imgur.com/3/image",
              headers: {
                'Authorization': `Client-ID ${imgrConfig.imgurClientId}`,
              },
              form: {
                'image': image
              }
            };
            request.post(uploadImg, (err, httpResponse, body) => {
              if (httpResponse.statusCode === 200) {
                const resBody = JSON.parse(body);
                const picLink = { type: 'text', text: resBody.data.link };
                return client.replyMessage(event.replyToken, picLink);
              } else {
                const uploadFail = { type: 'text', text: 'Send to Imgur Fail' };
                return client.replyMessage(event.replyToken, uploadFail);
              }
            })
          })
        })
    }
  }
  return Promise.resolve(null);
}
*/

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
    const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?
            location=${lat},${lng}&
            radius=${radius}&
            type=${searchType}&
            language=zh-TW&
            key=${gMapAPI.key}`.replace(/\n/g, '').replace(/\s/g, '');
    request.get(searchUrl, (err, httpResponse, body) => {
      let msgToUser = { type: 'text', text: 'Searching' };
      if (httpResponse.statusCode === 200) {
        const resBody = JSON.parse(body);
        let places = resBody.results.map((p) => {
          return `${p.name}\r\nhttps://www.google.com/maps/place/?q=place_id:${p.place_id}`
        });
        places.unshift(`${radius}公尺內的${searchType}：`);
        msgToUser.text = places.join('\r\n');
      } else {
        msgToUser.text = `沒有找到${radius}公尺內的${searchType}地點。`;
      }
      return client.replyMessage(event.replyToken, msgToUser);
    })
    delete conversation[event.source.userId];
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