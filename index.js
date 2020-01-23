'use strict';
require('dotenv').config();

const line = require('@line/bot-sdk');
const express = require('express');
const request = require('request');  // 新增 img-uploader-bot

// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env['CHANNEL_ACCESS_TOKEN'],
  channelSecret: process.env['CHANNEL_SECRET'],
};

// 新增 img-uploader-bot
const imgrConfig = {
  imgurClientId: process.env['IMGUR_CLIENT_ID']
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

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});