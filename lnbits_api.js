require('dotenv').config()
const axios = require('axios')
const QRcode = require('qrcode')
const Jimp = require("jimp");
const jsQR = require("jsqr");

const admin_key = process.env.ADMIN_KEY || ""
const invoice_key = process.env.INVOICE_KEY || ""
const url = process.env.LNBITS_URL || ""

let invoice_headers = {"X-Api-Key": invoice_key }
let admin_headers =  {"X-Api-Key": admin_key }
let json_content = {"Content-type" : "application/json"}
const base_url = url + "/api/v1/"
console.log("BASE URL", base_url)


async function getWalletInfo() { 
    let msg = ''
    try { 
        let response = await axios.get(base_url + "wallet", { headers: invoice_headers})
        if (response.status == 200) { 
            console.log(response.data)
            msg = "*Your Balance:* " + response.data.balance/1000 + " sats \n\n"
            msg += "*Wallet Name:* " + response.data.name
            return msg
        }
    } catch (err) { 
        console.log(err.response.status)
        console.log(err.response.data)
        msg = "Error fetching data. Try again later."
        return msg
    }
}

async function getBalance() { 
    let msg = ''
    try { 
        let response = await axios.get(base_url + "wallet", { headers: invoice_headers})
        if (response.status == 200) { 
            console.log(response.data)
            msg = response.data.balance/1000
            return msg
        }
    } catch (err) { 
        console.log(err.response.status)
        console.log(err.response.data)
        msg = "error"
        return msg
    }
}


async function createInvoice(amount) { 
    let msg = ''
    let full_header = Object.assign(invoice_headers, json_content)
    console.log("\n" + base_url + "payments")
    console.log(full_header)

    try { 
        let payload = { 
            "out": false,
            "amount": amount*100, 
            "memo": '', 
            "webhook": '', 
            "unit": ""}

        let response = await axios({ 
            method: 'post',
            url: base_url + "payments",
            data: payload,
            headers: full_header
        })
        if (response.status == 201) {  // status created
            //console.log(response.data) 
            // response.data contains payment_hash, payment_request, checking_id, lnurl_response
            // return payment_request values as it is the bolt11
            return response.data.payment_request
        }
    } catch (err) { 
        console.log(err.response.status)
        msg = "Error"
        return msg
    }
}

async function decodeInvoice(invoice) { 
    let msg = ''
    let full_header = Object.assign(invoice_headers, json_content)
    console.log("\n" + base_url + "payments/decode")
    console.log(full_header)

    try { 
        let payload = {
             "data": invoice
            }
        console.log(payload)
        let response = await axios(
            { 
            method: 'post',
            url: base_url + "payments/decode",
            data: payload,
            headers: full_header
        })
        if (response.status == 200) {
            console.log("inside response 200")
            console.log(response.data)
            return response.data
        } else { 
            return response.message
        }
    } catch (err) { 
        console.log(err.response.status)
        console.log(err.response.data)
        msg = "Error fetching data. Try again later."
        return msg
    }
}


async function checkInvoice(payment_hash) { 
    let msg = ''
    try { 
        let response = await axios.get(base_url + "payments/" + payment_hash, { headers: invoice_headers})
        if (response.status == 200) { 
            //console.log(response.data)
            return response.data
        }
    } catch (err) { 
        //console.log(err.response.status)
        //console.log(err.response.data)
        msg = "Error fetching data. Try again later."
        return msg
    }
}

// NOTE: this enables anyone who visits the bot to pay w/your account
// so this is for demo purposes only. 
async function payInvoice(invoice) { 
    let msg = ''
    let payload = { 
         "out": true, 
         "bolt11": invoice }
    let full_header = Object.assign(admin_headers, json_content)

    try { 
        let response = await axios({ 
            method: 'post',
            url: base_url + "payments",
            data: payload,
            headers: full_header
        })
        if (response.status == 200) { 
            console.log(response.data)
            msg += response.data
            return msg
        }
    } catch (err) { 
        console.log(err.response.status)
        console.log(err.response.data)
        msg = "Error fetching data. Try again later."
        return msg
    }
}

const generateQR = async text => {
    // NOTE: sending as form data as data url in a stream does not seem to work with TG api
    try {
        const path = '/tmp/qr.png' // make this dynamic
        await QRcode.toFile(path, text, { 
            errorCorrectionLevel: 'H'
        })
        return path
    } catch (err) {
        console.error(err)
        return "error"
    }
  }

async function decodeQRFromUrl(url) { 
    try { 
        const response = await axios.get(url, { responseType: 'arraybuffer'})
        const buffer = Buffer.from(response.data, "utf-8")
        const img2 = await Jimp.read(buffer)
        const value = await jsQR(img2.bitmap.data, img2.bitmap.width, img2.bitmap.height)
        return value.data
    } catch (error) { 
        return "error"
    }
}


module.exports = { 
    getWalletInfo,
    getBalance,
    createInvoice, 
    decodeInvoice,
    payInvoice, 
    checkInvoice, 
    generateQR, 
    decodeQRFromUrl
}