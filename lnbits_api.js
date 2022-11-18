require('dotenv').config()
const axios = require('axios')
const sharp = require('sharp');
const QRcode = require('qrcode')

const admin_key = process.env.ADMIN_KEY || ""
const invoice_key = process.env.INVOICE_KEY || ""
const url = process.env.LNBITS_URL || ""

let invoice_headers = {"X-Api-Key": invoice_key }
let admin_headers =  {"X-Api-Key": admin_key }
let json_content = {"Content-type" : "application/json"}
const base_url = url + "/api/v1/"
console.log("BASE URL", base_url)


async function getWallet() { 
    let msg = ''
    try { 
        let response = await axios.get(base_url + "wallet", { headers: invoice_headers})
        if (response.status == 200) { 
            console.log(response.data)
            msg = "Sats Balance: " + response.data.balance + "\n\n"
            msg += "Wallet Name: " + response.data.name
            return msg
        }
    } catch (err) { 
        console.log(err.response.status)
        console.log(err.response.data)
        msg = "Error fetching data. Try again later."
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
            "amount": amount, 
             "memo": '', 
             "webhook": '', 
             "unit": ""}

        let response = await axios(
            { 
            method: 'post',
            url: base_url + "payments",
            data: payload,
            headers: full_header
        })
        //console.log(response)
        if (response.status == 201) {  // status created
            console.log(response.data) 
            // response.data contains payment_hash, payment_request, checking_id, lnurl_response
            // return payment_request values as it is the bolt11
            return response.data.payment_request
        }
    } catch (err) { 
       // console.log(err)
        console.log(err.response.status)
        console.log(err.response.data)
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
            //console.log(response)
        if (response.status == 200) {
            console.log("inside response 200")
            console.log(response.data)
            return response.data
        }
    } catch (err) { 
       // console.log(err)
        console.log(err.response.status)
        console.log(err.response.data)
        msg = "Error fetching data. Try again later."
        return msg
    }
}


async function checkInvoice(payment_hash) { 
    //todo
}

// NOTE: this enables anyone who visits the bot to pay w/your account
// so this is for demo purposes only. 
async function payInvoice(invoice) { 
    //todo.
}

const generateQR = async text => {
    // toDataURL generates a "data:xxx" string only image/png
    try {
        // use this toDataURL to inject image into SVG for merging
        // const img = await QRcode.toDataURL(text, {
        //     errorCorrectionLevel: 'H'
        // })
        const path = '/tmp/qr.png'
        await QRcode.toFile(path, text, { 
            errorCorrectionLevel: 'H'
        })
        return path
    } catch (err) {
        console.error(err)
        return "error"
    }
  }

const scanQRcode = async image => { 
    // todo, need to test this

}


module.exports = { 
    getWallet,
    createInvoice, 
    decodeInvoice,
    payInvoice, 
    checkInvoice, 
    generateQR, 
    scanQRcode
}