const { Telegraf } = require('telegraf')
const session = require('telegraf/session')
const Stage = require('telegraf/stage')
const Scene = require('telegraf/scenes/base')
const { leave } = Stage
const stage = new Stage()
const axios = require('axios')
require('dotenv').config()

const { getWallet, createInvoice, decodeInvoice, generateQR } = require('./lnbits_api')

const token = process.env.BOT_TOKEN || ""
if (!token) {
  console.log("missing bot token")
  return
}
console.log("bot token:", token)


const bot = new Telegraf(token)

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

// test method
// bot.hears('test', async ctx => {
//   const res = await getInfo('123')
//   console.log(res)
//   return ctx.reply(res)
// })

bot.hears('Get Balance', async ctx => { 
  const msg = await getWallet()
  return ctx.reply(msg)
})

///////////////

bot.hears('⚡️ Invoice', async ctx => {
  ctx.scene.enter('createinvoice')
})

bot.hears('/invoice', async ctx => {
  ctx.scene.enter('createinvoice')
})

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

create_invoice.on('text', async(ctx) => { 
  if (ctx.message.text.length > 7)  {
    return ctx.reply('Too big of an invoice, try a smaller amount?')
  }
  ctx.replyWithChatAction('typing')
  const bolt11 = await createInvoice("1000")
  if (bolt11 != "Error") {
    await ctx.replyWithPhoto(`http://api.qrserver.com/v1/create-qr-code/?data=${encodeURI(bolt11)}&size=250x250`,
    { caption: bolt11 })  
  } else { 
    ctx.reply("Error fetching data. Try again?")
  }
})

////////////

bot.hears('Decode Invoice', async ctx => { 
  ctx.scene.enter('decode')
})

decode.enter((ctx) => { 
  ctx.reply("Send me a LNURL to decode! ", 
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
  // "lnbc10u1p3ht7j7pp5hyu25fceuwvc2u5f82vn29wtv69rykxhf9w5efp3nhjmugl66j5qdq6gpxxjemgw3hxjmn8235hqsn0wscqzpgxqyz5vqsp5g53ts94jyzezms69a934tzmpxgajp85qhp0l7qc4tr80qzunstus9qyyssqe4wrz03d7hcr9u9j7zsnhwy7wuhqaxf3y75m879kyglnw77nt3sq2lj7vrskfmx73xqqjvkn7cd0rvvd5ckeje48ldnq6732znvy3rspfasj77"
  const msg = await decodeInvoice(invoice)
  //console.log(msg)
  return ctx.reply(msg)
})


///////// starter /////////
function starter (ctx) {
    ctx.reply(
      'Hi! What do you want to do?', 
      { reply_markup: { keyboard: [['Get Balance'], 
      ['Decode Invoice', '⚡️ Invoice'], ['🔍 Scan QR Code', '🖊 Generate QR Code']],
       resize_keyboard: true } }
    )
  }

bot.hears('🖊 Generate QR Code', (ctx) => {
    ctx.scene.enter('generate')
})

bot.on('message', async (ctx) => {
    ctx.scene.leave('decode')
    ctx.scene.leave('generate')
    ctx.scene.leave('createinvoice')
    starter(ctx)
  })

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
  
    axios.get(`http://api.qrserver.com/v1/create-qr-code/?data=${encodeURI(ctx.message.text)}&size=300x300`)
      .then(async (response) => {
        await ctx.replyWithPhoto(`http://api.qrserver.com/v1/create-qr-code/?data=${encodeURI(ctx.message.text)}&size=300x300`,
        { caption: 'Generated via @OneQRBot' })
        ctx.reply('You can send me another text or tap "⬅️ Back"')
      
      })
      .catch(async (err) => {
        console.log(err)
        await ctx.reply('Data you sent isn`t valid. Please check that and try again.')
        ctx.reply('You can send me another text or tap "⬅️ Back"')
  
        sendError(`Generating error by message ${ctx.message.text}: \n\n ${err.toString()}`, ctx)
      })  
  })


function sendError (err, ctx) {
  if (err.toString().includes('message is not modified')) {
    return
  }
//  bot.telegram.sendMessage(data.dev, `Ошибка у [${ctx.from.first_name}](tg://user?id=${ctx.from.id}) \n\nОшибка: ${err}`, { parse_mode: 'markdown' })
}
  

bot.launch()
