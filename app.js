const express = require('express');
const fetch = require("node-fetch");
const bodyParaser = require("body-parser");
const app = express();
const port = 3000;

app.use(bodyParaser.json());


//사용자 테스트 페이지
app.get('/', async(req, res)=>{
  if(res.status(200)){
    res.send('<h1>데이터 통신 성공</h>');
  } else {
    res.status(404).send('서버 오류')
  }
})



// 네이버 Social Media 로그인 
var client_id = 'jZqFNn5osrqKbmxXtvZw';
var client_secret = 'n5VpdIgn1r';
var state = "RANDOM_STATE-anyword";
var redirectURI = encodeURI("http://localhost:3000/callback");
var api_url = "";




app.get("/callback", async function (req, res) {
  const code = req.query.code;
  const state = req.query.state;
  const api_url =
    "https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=" +
    client_id +
    "&client_secret=" +
    client_secret +
    "&redirect_uri=" +
    redirectURI +
    "&code=" +
    code +
    "&state=" +
    state;

    const response = await fetch(api_url, {
      headers: {
        "X-Naver-Client-Id": client_id,
        "X-Naver-Client-Secret": client_secret,
      },
    });
  
    const tokenRequest = await response.json();
    
    if ("access_token" in tokenRequest) {
      const { access_token } = tokenRequest;
      const apiUrl = "https://openapi.naver.com/v1/nid/me";
  
      const data = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
  
      const userData = await data.json();
  
      //사용자 정보 콘솔로 받아오기 -> DB에 저장해야 합니다.
      console.log("userData:", userData);
    }
  
    return res.send("DB에 저장하고 랜드페이지로 redirect ");
  });


app.listen(port, ()=>{
  console.log(`http://localhost:${port} Let get the hell` )
})