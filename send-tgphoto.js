const { Telegraf } = require('telegraf')
const session = require('telegraf/session')
require('dotenv').config()

const fetch = require("node-fetch");
const fs = require("fs");
const FormData = require("form-data");
const { PassThrough, Stream } = require('stream');
const QRcode = require('qrcode')



const token = process.env.BOT_TOKEN || ""
if (!token) {
    console.log("missing bot token")
    return
  }
  console.log("bot token:", token)
  
const bot = new Telegraf(token)

bot.use(session())

bot.start((ctx) => {
    ctx.reply('Welcome')
    starter(ctx)
})

function starter (ctx) {
    ctx.reply(
      'Hi! What do you want to do?', 
      { reply_markup: { keyboard: [['Get Balance'], 
      ['📨 Pay Invoice', '⚡️ Create Invoice'],
      ['🔍 Scan QR Code', '🖊 Generate QR Code']],
       resize_keyboard: true } }
    )
  }

bot.hears('Get Balance', async ctx => { 
    ctx.reply("chatid: ")
    ctx.reply(ctx.chat.id)
    try {

       // const { Readable } = require('stream');
        const stream = require('stream')

        var writable = new stream.Writable({
            write: function(chunk, encoding, next) {
               // console.log(chunk.toString());
              next();
            }
          });
          
//        const write = new Stream()
        const qrStream = new PassThrough();
        // invoice as text
        const text = "lnbc10u1p3h5738pp5fkanzzx7gh8thl30xgln7uw64xea5vcfp99w8hqkndx8gdn5g9fqdq6gpxxjemgw3hxjmn8235hqsn0wscqzpgxqyz5vqsp50ymwlvwzr8pddwcp9czqg8nach4vf6mgxfqnv0kxkkm7fmjy07cs9qyyssqpr3gnqt5regmf8tnxhkse0kmvjmslquftnej6u5ckj2qdnvknggja92x2mw9h7nfm3zv3n4ply2lwtkl0r7j8v0h9vs3rxly0hv28kqqztvkl3"
        const result = await QRcode.toFileStream(qrStream, text, 
            {
                type: 'png',
                errorCorrectionLevel: 'H'
            });
        //console.log(qrStream)
        
         const readable = new Readable() 
         readable._read = () => {}
         readable.push(writable)
         readable.push(null)

        // console.log(writable)

        const chatid = ctx.chat.id
        let form = new FormData();
        //    form.append("photo", readStream);
        const path = '/tmp/qr.png' 
        let readStream = await fs.createReadStream(path);
        //console.log("READSTREAM")
         console.log(readStream)
        // qrStream.pipe(readStream)
        
        // var bytes = Object.keys(writable).length;
        // var myArr = new Uint8Array(bytes)
        
        // for(var i = 0; i < bytes; i++){
        //     myArr[i] = stream[i].charCodeAt(0);
        // }
        
        const buffers = []
        for await (const data of readStream) {
            buffers.push(data);
          }
        const data = Buffer.concat(buffers);
          

        form.append("photo", readStream);
        fetch(
        `https://api.telegram.org/bot${token}/sendPhoto?chat_id=${chatid}`,
        {
            method: "POST",
            body: form,
        }
        )
        .then((res) => res.json())
        .then((response) => {
            console.log(response);
        })
        .catch((error) => {
            console.log(error);
        });

    } catch (err) { 
        console.log(err)
    }

})

bot.launch()



   // let readStream = fs.createReadStream();
   // qrStream.pipe(readStream)
        
    // const path = '/tmp/qr.png' // make this dynamic
    // await QRcode.toFile(path, text, { 
    //     errorCorrectionLevel: 'H'
    // })
    // let readStream = fs.createReadStream("/tmp/qr.png");
    //console.log(readStream)
