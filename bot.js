const { Telegraf } = require('telegraf')
const session = require('telegraf/session')
const Stage = require('telegraf/stage')
const Scene = require('telegraf/scenes/base')
const stage = new Stage()
const QRcode = require('qrcode')
const fs = require('fs')
require('dotenv').config()

const { getWalletInfo, getBalance, createInvoice, decodeInvoice, decodeQRFromUrl, payInvoice, checkInvoice } = require('./lnbits_api')

const token = process.env.BOT_TOKEN || ""
if (!token) {
  console.log("missing bot token")
  return
}

console.log("bot token:", token)
const bot = new Telegraf(token)

// scan QR
const scanQR = new Scene('scanQR')
stage.register(scanQR)

// generate QR Code
const generate = new Scene('generate')
stage.register(generate)

// decode an invoice
const decode = new Scene('decode')
stage.register(decode)

// create an invoice (include make QR code)
const create_invoice = new Scene('createinvoice')
stage.register(create_invoice)

// pay an invoice (include scanning QR image)
const pay_invoice = new Scene('payinvoice')
stage.register(pay_invoice)

// check invoice
const check_invoice = new Scene('checkinv')
stage.register(check_invoice)


/////////////////

bot.use(session())
bot.use(stage.middleware())

bot.start((ctx) => {
    ctx.reply('Welcome')
    starter(ctx)
})

bot.hears('Get Balance', async ctx => { 
  const msg = await getWalletInfo()
  return ctx.replyWithMarkdown(msg)
})

bot.hears('👓 Decode Invoice', async ctx => { 
  ctx.scene.enter('decode')
})

bot.hears('🖊 Generate QR Code', (ctx) => {
  ctx.scene.enter('generate')
})

bot.hears('🔍 Scan QR Code', (ctx) => {
  ctx.scene.enter('scanQR')
})

bot.hears('⚡️ Create Invoice', async ctx => {
  ctx.scene.enter('createinvoice')
})

bot.hears('/invoice', async ctx => {
  ctx.scene.enter('createinvoice')
})

bot.hears('✅ Check an Invoice', async ctx => { 
  ctx.scene.enter('checkinv')
})

bot.hears('📨 Pay Invoice', async ctx => { 
  ctx.scene.enter('payinvoice')
})

///////////////
pay_invoice.enter((ctx) => { 
  ctx.reply("Upload a QR or paste an invoice here ", 
  { reply_markup: { keyboard: [['⬅️ Back']], resize_keyboard: true }})
})

pay_invoice.leave((ctx) => starter(ctx))

// this 'back' must preceed 'text' method or it will not execute
pay_invoice.hears('⬅️ Back', (ctx) => {
  ctx.scene.leave('payinvoice')
  starter(ctx)
})

function isString(e) {
  return typeof e === "string" || e instanceof String;
}

pay_invoice.on('text', async(ctx) => { 
  try { 
    ctx.replyWithChatAction('typing')
    let invoice = ctx.message.text

    // check payment hash before trying to pay invoice, add your extra checks here. 
    const msg = await decodeInvoice(invoice)
    if (isString(msg)) {
      return ctx.reply(msg)
    } 
    let hash = msg.payment_hash
    await ctx.reply("Payment Hash: " + hash)

    let amt_paid = msg.amount_msat/1000

    let payresult = await payInvoice(invoice)
    console.log(payresult)
    if (payresult === undefined) {
        let reply = "⚡️ Payment made. " + amt_paid + " sats \n"
        let currBal = await getBalance();
        reply += "Current Balance: " + currBal + "\n"
        console.log(reply)
        return ctx.reply(reply)
    } else { 
      await ctx.reply("Payment response: " + payresult)
    }

  } catch (error) { 
    console.log(error)
    await ctx.reply("Error fetching data. Try again?")
    await ctx.reply('You can send another amount or tap "⬅️ Back"')
  }
})

pay_invoice.on('photo', async (ctx) => {
  ctx.replyWithChatAction('typing')
  try {
    const imageData = await bot.telegram.getFile(ctx.message.photo[ctx.message.photo.length - 1].file_id)
    const path = `https://api.telegram.org/file/bot${token}/${imageData.file_path}`

    console.log("uploaded image for invoice payment: ", path)
    //await ctx.reply("uploaded image path: " + path)

    let invoice = await decodeQRFromUrl(path)
    console.log("result: " , invoice)

    if (invoice === "error"){ 
      return await ctx.reply('No QR Code data found on this picture.')
    } else { 
      await ctx.reply('Scanned data:')
      await ctx.reply(invoice)
    }

    // check payment hash before trying to pay invoice, add your extra checks here. 
    const msg = await decodeInvoice(invoice)
    if (isString(msg)) {
      return ctx.reply(msg)
    } 
    let hash = msg.payment_hash
    await ctx.reply("Payment Hash: " + hash)

    let amt_paid = msg.amount_msat/1000

    let payresult = await payInvoice(invoice)
    console.log(payresult)
    
    if (payresult === undefined) {
        let reply = "⚡️ Payment made. " + amt_paid + " sats \n"
        let currBal = await getBalance();
        reply += "Current Balance: " + currBal + "\n"
        console.log(reply)
        return ctx.reply(reply)
    } else { 
      await ctx.reply("Payment response: " + payresult)
    }

  } catch (error) { 
    console.log(error)
    await ctx.reply("Error fetching data. Try again?")
    await ctx.reply('You can send another amount or tap "⬅️ Back"')
  }
})


///////////////
check_invoice.enter((ctx) => { 
  ctx.reply("Enter a payment hash to check: ", 
  { reply_markup: { keyboard: [['⬅️ Back']], resize_keyboard: true }})
})

check_invoice.leave((ctx) => starter(ctx))

// this 'back' must preceed 'text' method or it will not execute
check_invoice.hears('⬅️ Back', (ctx) => {
  ctx.scene.leave('checkinv')
  starter(ctx)
})

check_invoice.on('text', async(ctx) => { 
  try { 
    let hash = ctx.message.text
    let response = await checkInvoice(hash)
    await ctx.reply(response)
    await ctx.reply('You can send another amount or tap "⬅️ Back"')
  } catch (error) { 
    console.log(error)
    await ctx.reply("Error fetching data. Try again?")
    await ctx.reply('You can send another amount or tap "⬅️ Back"')
  }
})

///////////////
create_invoice.enter((ctx) => { 
  ctx.reply("How many sats for your invoice? ", 
  { reply_markup: { keyboard: [['⬅️ Back']], resize_keyboard: true }})
})

create_invoice.leave((ctx) => starter(ctx))
// this 'back' must preceed 'text' method or it will not execute
create_invoice.hears('⬅️ Back', (ctx) => {
  ctx.scene.leave('createinvoice')
  starter(ctx)
})

function isNumeric(val) {
  return /^-?\d+$/.test(val);
}

create_invoice.on('text', async(ctx) => { 
  try { 
    let amt = ctx.message.text
    console.log(amt)
    if (isNumeric(amt) === false) { 
      return ctx.reply("Please send a valid amount greater than 10")
    }
    if (ctx.message.text.length > 8)  {
      return ctx.reply('Too big of an invoice, try a smaller amount?')
    }
    ctx.replyWithChatAction('typing')

    const bolt11 = await createInvoice(amt)
    //console.log("generated bolt11 :", bolt11)
    if (bolt11 === "Error") {
      return ctx.reply("Error fetching data. Try again?")
    }
    const path = '/tmp/invoice.png'
    await QRcode.toFile(path, bolt11, { 
      errorCorrectionLevel: 'H',
      margin: 5, 
      color: { 
        dark:"#010599FF",
        light:"#FFFFFFFF"
      }
    })
    await ctx.replyWithPhoto({ source:  path}, { caption: bolt11 })
    await ctx.reply('You can send another amount or tap "⬅️ Back"')

    fs.unlink(path, function (err) {
      if (err) throw err;
      console.log("\nDeleted file: ", path);
    });

  } catch(error) { 
    console.log(error)
    await ctx.reply("Error generating Invoice.")
    await ctx.reply('You can send another amount or tap "⬅️ Back"')
  }
})

////////////

decode.enter((ctx) => { 
  ctx.reply("Send me a Invoice to Decode! ", 
  { reply_markup: { keyboard: [['⬅️ Back']], resize_keyboard: true }})
})

decode.leave((ctx) => starter(ctx))

// this 'back' must preceed 'text' method or it will not execute
decode.hears('⬅️ Back', (ctx) => {
  ctx.scene.leave('decode')
  starter(ctx)
})

decode.on('text', async(ctx) => { 
  if (ctx.message.text.length > 900)  {
    return ctx.reply('Text too long, please send shorter text')
  }
  ctx.replyWithChatAction('typing')
  let invoice = ctx.message.text
  const msg = await decodeInvoice(invoice)
  return ctx.reply(msg)
})


///// Generate QR Code /////
generate.enter((ctx) => {
  ctx.reply(
    'I`m ready. Send me text!', 
    { reply_markup: { keyboard: [['⬅️ Back']], resize_keyboard: true } }
  )
})

generate.hears('⬅️ Back', (ctx) => {
  starter(ctx)
  ctx.scene.leave('generate')
})

generate.on('text', async (ctx) => {
    if (ctx.message.text.length > 900) {
      return ctx.reply('Your text is too long. Please send text that contains not more than 900 symbols.')
    }
    ctx.replyWithChatAction('upload_photo')
    try { 
      const path = '/tmp/qr_image.png'
      await QRcode.toFile(path, ctx.message.text, { 
         errorCorrectionLevel: 'H'
      })
      await ctx.replyWithPhoto({source: path })
      await ctx.reply('You can send me more text or tap "⬅️ Back"')

      fs.unlink(path, function (err) {
        if (err) throw err;
        console.log("\nDeleted file: ", path);
      });
  
    } catch (err) { 
      console.log(err)
      await ctx.reply("Error trying to generate QRCode.")
      await ctx.reply('You can send me more text or tap "⬅️ Back"')
    }
  })

///////// Scan QR Code //////////

scanQR.enter((ctx) => {
  ctx.reply(
    'I`m ready. Send a picture!', 
    { reply_markup: { keyboard: [['⬅️ Back']], resize_keyboard: true } }
  )
})

scanQR.on('photo', async (ctx) => {
  ctx.replyWithChatAction('typing')

  try {
    const imageData = await bot.telegram.getFile(ctx.message.photo[ctx.message.photo.length - 1].file_id)
    const path = `https://api.telegram.org/file/bot${token}/${imageData.file_path}`
    const result = await decodeQRFromUrl(path)
    console.log("result: " , result)
    if (result === "error"){ 
      await ctx.reply('No QR Code data found on this picture.')
    } else { 
      await ctx.reply('Scanned data:')
      await ctx.reply(result)
      ctx.reply('You can send me other pictures or tap "⬅️ Back"')  
    }
  } catch (err) { 
    ctx.reply('No QR Code data found on this picture.')
  }
})

scanQR.hears('⬅️ Back', (ctx) => {
  starter(ctx)
  ctx.scene.leave('scanQR')
})


///////// starter /////////
function starter (ctx) {
  ctx.reply(
    'Hi! What do you want to do?', 
    { reply_markup: { keyboard: [['Get Balance'], 
    ['📨 Pay Invoice', '⚡️ Create Invoice'],
    ['👓 Decode Invoice', '✅ Check an Invoice'],
   // ['🔍 Scan QR Code', '🖊 Generate QR Code']
   ],
     resize_keyboard: true } }
  )
}

bot.on('message', async (ctx) => {
  ctx.scene.leave('decode')
  ctx.scene.leave('generate')
  ctx.scene.leave('createinvoice')
  ctx.scene.leave('checkinv')
  ctx.scene.leave('payinvoice')
  starter(ctx)
})  

bot.launch()
