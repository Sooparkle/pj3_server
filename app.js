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
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

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
  try{
    const bookingConfirm = req.body;
    const { user :{ user_name, user_email }, bookingAccom, dates: { bookingStartDate, bookingEndDate }, status } = bookingConfirm;

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
      guest_numbers: 1,
      start_date: startDate,
      end_date: endDate,
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
        message: "Booking created successfully!",
    });
  }
  catch(error){
    console.log("Unexpected error:", error);
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
    now.setSeconds(0, 0); // Remove seconds and milliseconds

    const oneMinuteAgo = new Date(now.getTime() - (1000 * 60)); // Go back 1 minute

console.log("작동")
    const { data, error } =  supabase
      .from('bookings')
      .select('*') // Select all booking data
      .eq('accom_id', accomId) // Filter by accommodation ID
      // .eq('guest_email', userId) // Filter by user ID (assuming user ID is stored as email)
      // .gte('created_at', oneMinuteAgo.toISOString()) // Filter by created_at greater than or equal to 1 minute ago
      // .lte('created_at', new Date().toISOString()) // Filter by created_at less than or equal to current time
      // .order('start_date', { ascending: false }) // Order by start date descending
      // .limit(1) // Get only the first record (most recent)
      // .single()
      // .execute();

      console.log("작동 data",data)
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






// 네이버 Social Media 로그인 
const client_id = process.env.NODE_NAVER_API_ID;
const client_secret = process.env.NODE_NAVER_API_SECRET;
const state = "RANDOM_STATE-anyword";
const redirectURI = encodeURI("http://localhost:3000/mypage");
const api_url = "";



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
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('*') // Select all user data
        .eq('email', email)
        .eq('name', name)  // Add check for name
        .single();

        const redirectUrl = `/mypage?loggedIn=true`; // Base URL for redirect

      if (existingUser) {
        console.log("User with matching name and email already exists:", existingUser);
        redirectUrl += '&existingUser=true'; // Add existingUser param
        return;
      }

      // Insert user if unique
      const { data, error } = await supabase
      .from('users')
      .insert(naverAuth);

      if(error) {
        console.error("Error is created during insert DB", error);
        res.status(500).json({message : "Naver 로그인 실패"});
        return;
      }
      res.json({ message : "Naver 로그인에 성공하였습니다!" });
      console.log("Insert has been successful");
    }
  
});

app.listen(port, ()=>{
  console.log(`http://localhost:${port} Let get the hell` )
})


