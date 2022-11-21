const { Telegraf } = require('telegraf')
const session = require('telegraf/session')
const Stage = require('telegraf/stage')
const Scene = require('telegraf/scenes/base')
const { leave } = Stage
const stage = new Stage()
const axios = require('axios')
require('dotenv').config()

const { getWallet, createInvoice, decodeInvoice, generateQR, decodeQRFromUrl } = require('./lnbits_api')

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


/////////////////

bot.use(session())
bot.use(stage.middleware())

bot.start((ctx) => {
    ctx.reply('Welcome')
    starter(ctx)
})

bot.hears('Get Balance', async ctx => { 
  const msg = await getWallet()
  return ctx.reply(msg)
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
  console.log("generated bolt11 :", bolt11)
  if (bolt11 === "Error") {
    return ctx.reply("Error fetching data. Try again?")
  }
  const photodata = await generateQR(bolt11) 
  console.log("photo path: " , photodata)
  await ctx.replyWithPhoto({ source:  photodata})
  await ctx.reply('You can send another amount or tap "⬅️ Back"')  
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
      console.log("message from user: ", ctx.message.text)
      const path = await generateQR(ctx.message.text)
      console.log(path)
      await ctx.replyWithPhoto({source: path })
      await ctx.reply('You can send me more text or tap "⬅️ Back"')  
    } catch (err) { 
      console.log(err)
      ctx.reply("Error trying to generate QRCode.")
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
      //console.log("error statement")
      await ctx.reply('No QR Code data found on this picture.')
    } else { 
      await ctx.reply('Scanned data:')
      await ctx.reply(result)
      ctx.reply('You can send me other pictures or tap "⬅️ Back"')  
    }
  } catch (err) { 
    //console.log( "catch: error statement")
    ctx.reply('No QR Code data found on this picture.')
    // sendError()
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
//    ['👓 Decode Invoice', '✅ Check an Invoice'],
    ['🔍 Scan QR Code', '🖊 Generate QR Code']],
     resize_keyboard: true } }
  )
}

bot.on('message', async (ctx) => {
  ctx.scene.leave('decode')
  ctx.scene.leave('generate')
  ctx.scene.leave('createinvoice')
  starter(ctx)
})


function sendError (err, ctx) {
  if (err.toString().includes('message is not modified')) {
    return
  }
//  bot.telegram.sendMessage(data.dev, `Ошибка у [${ctx.from.first_name}](tg://user?id=${ctx.from.id}) \n\nОшибка: ${err}`, { parse_mode: 'markdown' })
}
  

bot.launch()
