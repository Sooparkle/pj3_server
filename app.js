const express = require('express');
const fetch = require("node-fetch");
const bodyParaser = require("body-parser");
const cors = require('cors');
const app = express();
const port = 4000;
require('dotenv').config();
const { createClient, SupabaseClient } = require('@supabase/supabase-js');


// const corsOptions = {
//   origin : 'https://port-0-pj3-server-dc9c2nlt7zv05q.sel5.cloudtype.app',
//   credentials : true
// }

app.use(cors());
app.use(bodyParaser.json());


//사용자 테스트 페이지
app.get('/', async(req, res)=>{
  if(res.status(200)){
    res.send('<h1>데이터 통신 성공</h>');
  } else {
    res.status(404).send('서버 오류')
  }
})



// Supabase

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);




// accomudation data fetch from Supabase
app.get('/accommodation', async (req, res) =>{
  try{
    const { data, error } = await supabase
    .from('accoms')
    .select('*');
    if (error) {
      throw error;
    }
    
    // console.log("작동중", data);
    res.json(data);

  } catch(error) {
    res.status(500).json({ error : error.message });
  }
});


app.post('/bookings', async(req, res)=>{
// to convert month string to index
  function monthStringToIndex(monthString) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.indexOf(monthString);
  }
  // console.log("Booking ", bookingConfirm)
  try{
    const bookingConfirm = req.body;

    const { 
      user :{ 
        user_name, 
        user_email 
      }, 
      bookingAccom,
      dates: { 
        bookingStartDate, 
        bookingEndDate
      },
      extraNumber:{
        bookingAdult,
        bookingChild,
      },
      totalNumbers,
      status,
      totalPrice,
    } = bookingConfirm;

    const startDate = new Date(bookingStartDate[3], monthStringToIndex(bookingStartDate[1]), bookingStartDate[2]);
    const endDate = new Date(bookingEndDate[3], monthStringToIndex(bookingEndDate[1]), bookingEndDate[2]);
    
    // 기간 동안 숙박료
    const timeDifference = endDate.getTime() - startDate.getTime();
    const stayingNights = Math.ceil(timeDifference / (1000 * 60 * 60 * 24)) - 1;

    const bookingData = {
      guest_name: user_name, 
      guest_email: user_email, 
      accom_id : bookingAccom.id,
      accom_name: bookingAccom.accom_name,
      accom_type: bookingAccom.accom_type,
      total_price: stayingNights,
      order_status: status,
      extra_adult : bookingAdult,
      extra_child : bookingChild,
      guest_numbers: totalNumbers,
      start_date: startDate,
      end_date: endDate,
      total_price : totalPrice,

    }

    const { data, error } = await supabase
    .from('bookings') //table name
    .insert(bookingData);

    if (error) {
      console.error("Error is created during insert DB", error);
      res.status(500).json({message : "Booking failed"});
      return;
    }

    res.json({
        message: "Booking created successfully!"
    });
  }
  catch(error){
    console.log("Unexpected error:", error.message);
    res.status(500).json({message : "Booking failed."})
  }

});




app.post('/bookings/result', (req, res) => {
  const delayCall =() => {
  try {
    const contents = req.body;
    const accomId = contents.accomId;
    const userId = contents.user_email;


    // Get current time with milliseconds removed
    const now = new Date();
    now.setSeconds(0, 0); 

    const oneMinuteAgo = new Date(now.getTime() - (1000 * 60)); 

    const { data, error } =  supabase
      .from('bookings')
      .select('*') // Select all booking data
      .eq('accom_id', accomId) // Filter by accommodation ID

      // .execute();

    if (error) {
      console.error("Error retrieving booking data:", error);
      res.status(500).json({ message: "Failed to retrieve booking" });
      return;
    }

    if (!data) {
      // Handle case where no booking is found
      res.status(404).json({ message: "No booking found for this accommodation and user within the last minute" });
      return;
    }

    res.json(data); // Return the retrieved booking data
    console.log("완료", data);
  
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ message: "Failed to retrieve booking" });
  }
}
  setTimeout(delayCall, 10000)

});






// Naver Social Media Login 
const client_id = process.env.NODE_NAVER_API_ID;
const client_secret = process.env.NODE_NAVER_API_SECRET;
const state = "RANDOM_STATE-anyword";
// const redirectURI = encodeURI("https://port-0-pj3-server-dc9c2nlt7zv05q.sel5.cloudtype.app/callback");
const redirectURI = encodeURI("https://localhost:3000/callback");
const api_url = "";



app.get("/callback", async function (req, res) {

  // console.log("Nave API login req originalURL", req.originalUrl);
  // console.log("Nave API login req route", req.route);

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
  
      const naverdata = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
  
      const userData = await naverdata.json();

      const { response :{ name , email }} = userData;
      const naverAuth = {
        name,
        email
      }

      // Check for existing user with the same name and email
      // const { data: existingUser, error: userError } = await supabase
      //   .from('users')
      //   .select('*') 
      //   .eq('email', email)
      //   .eq('name', name)
      //   .single();

      //   const redirectUrl = `/mypage?loggedIn=true`; // Base URL for redirect

      // if (existingUser) {
      //   console.log("User with matching name and email already exists:", existingUser);
      //   redirectUrl += '&existingUser=true'; // Add existingUser param
      //   return;
      // }

      // Insert user if unique
      const { data, error } = await supabase
      .from('users')
      .insert(naverAuth);

      if(error) {
        console.error("Error is created during insert DB", error);
        res.status(500).json({message : "Naver 로그인 실패"});
        return;
      }
      // redirectURI(`http://localhost:3000/${originalRul}`)
      res.json({ message : "Naver 로그인에 성공하였습니다!" });
      console.log("Insert has been successful");

    }
  
});



app.get("/initial", async(req, res)=>{

  const { data, error } = await supabase
  .from('accoms')
  .select('*')

  if(error){
    console.error(`Failed to get Accommodation Data ${error}`)
    res.status(500).json({error : "숙박정볼를 가져올 수 없는 상태 입니다."})
    return
  }
  
  res.json(data)
  console.log("initial", data)
  

})



app.get('/search', async(req, res) =>{

  const { keyword } = req.query;
  try{
  if(!keyword){
    throw ('Missing search keyword');
    
  }

  const { data, error } = await supabase
  .from('accoms')
  .select('*')

  const filteredData = data.filter(accom =>
    Object.values(accom).some(value =>
      String(value).toLowerCase().includes(keyword.toLowerCase())
    )
  );

  if (error) {
    console.error('Failed to get accoms data:', error.message);
    res.status(500).json({ error: 'Failed to get accoms data' });
    return;  // Exit the function if there's an error
  }

  res.json({ message: 'Accom data retrieved successfully', data: filteredData });
  console.log("working", filteredData)
  }
  catch(error) {
    console.error("sever has got an issue", error);
    res.json({message : "검색 내용이 없습니다."});
  }


})



// accommodation login area
app.post("/login", async (req, res)=>{

  try{
    const { email, password } = req.body;

    const { data,  error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

    if(error){
      throw error;
    }

    if( !data || data.password !== password)
    throw new Error('invailed credentials');

    const { data : bookingsData, error : bookingError } = await supabase
    .from('bookings')
    .select('*')
    .eq('guest_email', email)

    if(bookingError) {throw bookingError}

    res.json({
      message : 'Login Seccessful',
      email : data.email,
      name : data.name,
      image : data.image,
      bookings : bookingsData
  });

  }
  catch(error){
    console.error('Login Failed', error.message) 
    res.status(401).json({ error : 'Loging failed'})

  }
})




//Local Soeul Library Best loan book List

app.post('/library', async (req, res)=>{
  const library =[
    {id : 1, value : 11010 , libName : "종로구" },
    {id : 2, value : 11020, libName : "중구" },
    {id : 3, value : 11030, libName : "용산구" },
    {id : 4, value : 11040, libName : "성동구" },
    {id : 5, value : 11050, libName : "광진구" },
    {id : 6, value : 11060, libName : "동대문구" },
    {id : 7, value : 11070, libName : "중랑구" },
    {id : 8, value : 11080, libName : "성북구" },
    {id : 9, value : 11090, libName : "강북구" },
    {id : 10, value : 11100, libName : "도봉구" },
    {id : 11, value : 11110, libName : "노원구" },
    {id : 12, value : 11120, libName : "은평구" },
    {id : 13, value : 11130, libName : "서대문구" },
    {id : 14, value : 11140, libName : "마포구" },
    {id : 15, value : 11150, libName : "양천구" },
    {id : 16, value : 11160, libName : "강서구" },
    {id : 17, value : 11170, libName : "구로구" },
    {id : 18, value : 11180, libName : "금천구" },
    {id : 19, value : 11190, libName : "영등포구" },
    {id : 20, value : 11200, libName : "동작구" },
    {id : 21, value : 11210, libName : "관악구" },
    {id : 22, value : 11220, libName : "서초구" },
    {id : 23, value : 11230, libName : "강남구" },
    {id : 24, value : 11240, libName : "송파구" },
    {id : 25, value : 11250, libName : "강동구" },
  ];
  
    try{
      const word = req.body.keyword
      const start = req.body.sendEndDate
      const end = req.body.sendStartDate

      for(let i = 0; i < library.length; i++){
        if(word ==library[i].libName){
          const selectedCode = library[i].value;
          const libraryApi = new URL('https://data4library.kr/api/loanItemSrchByLib?');
          libraryApi.searchParams.set("authKey", '43d7efdc5d7f99a3be907ecac62d3212026fb810e793f19e56fb0b5a390c93f8')
          libraryApi.searchParams.set("dtl_region", selectedCode);
          libraryApi.searchParams.set("startDt", start);//2023-12-31  
          libraryApi.searchParams.set("endDt", end) //2023-01-01
          libraryApi.searchParams.set("pageSize", "10");
          libraryApi.searchParams.set("format", 'json');
  
          const options= {
            method : "GET",
            headers : {
              "Content-Type" : "application/json",
            }
          };
  
          const response = await fetch(libraryApi.toString(), options);
          console.log("response 지남")
          if(!response.ok){
            // throw new Error(`Library Fetch failed at SearchForm ${response.status}`);
            throw (`Library Fetch failed at SearchForm`);
          }
  
          const data = await response.json();
          

          if(!data){
            res.json("데이터가 없습니다.")
          }
          const jsonData = data.response.docs;
  
          res.json(jsonData);
        }
        // else{
        //   console.log("검색할 수 없는 서울시 입니다.")
        // };
      };
  
    }
    catch(error){
      console.error("에러가 발생했습니다.", error.message)
    }
  
  })


app.post('/detail', async(req, res)=>{
console.log("detail date working")
console.log("req. body",req.body.isbn13)

try{
  const isbn = req.body.isbn13
  const detailLibrary = new URL('http://data4library.kr/api/usageAnalysisList?');
  detailLibrary.searchParams.set("authKey", '43d7efdc5d7f99a3be907ecac62d3212026fb810e793f19e56fb0b5a390c93f8');
  detailLibrary.searchParams.set("isbn13", isbn)
  detailLibrary.searchParams.set("format", 'json');


  const options= {
    method : "GET",
    headers : {
      "Content-Type" : "application/json",
    }
  };

  const response = await fetch(detailLibrary.toString(), options);
  
  if(!response.ok){
    throw new Error("fetch failed", response.status);
  }
  
  const data = await response.json();
  console.log("date", data)
  const jsonData = data.response;
  res.json(jsonData);
  console.log("data fetch completed", jsonData);
}
catch(error){
  console.error(`Detail Featch failed ${error.message}`);
  res.json({message : '데이터 정보를 가져오는데 실패 하였습니다.'})
}
})



app.listen(port, ()=>{
  console.log(`http://localhost:${port} Let get the hell` )
})