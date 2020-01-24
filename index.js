'use strict';
//require('dotenv').config();
//const line = require('@line/bot-sdk');
//const request = require('request');  // 新增 place-search-bot

const express = require('express');
const path = require('path');

/*
// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env['CHANNEL_ACCESS_TOKEN'],
  channelSecret: process.env['CHANNEL_SECRET'],
};
*/

const app = express();

app.set('views', path.join(__dirname, 'views'));  //設定Template目錄，畫面樣板
app.set('view engine', 'pug');  //設定Template引擎，用於產生畫面
app.use(express.static(path.join(__dirname, 'public'))); //設定可以取得的檔案

//自訂的畫面路由
app.get('/', (req, res) => {    
  res.render('index'); //自訂登入的首頁
});


// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});