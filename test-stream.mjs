import QRCode from 'qrcode';
import { PassThrough, Duplex } from 'stream';
import stream from 'stream';
import fs from 'fs';

async function test() { 
    try {

        var writeable = new stream.Writable({
            objectMode: true,
            write: function(chunk, encoding, next) {
             // encoding = 'utf8'
             // console.log(chunk);              
              next();
            }
          });

          let datum = []

          var qrStream = new PassThrough({
            objectMode: true,
            write: function(chunk, encoding, next) { 
                //console.log(chunk)
                datum.push(chunk)
                next()
            },
          })


        const data = [];

        const myDuplex = new Duplex({

            write(chunk, enc, next) {
                data.push(chunk);
                next();
            },
            
            read () {
                if(data.length === 0) { 
                    this.push(null);
                } else {
                    this.push(data.shift());
                }
            }
        })

        //const content = "lnbc10u1p3h5738pp5fkanzzx7gh8thl30xgln7uw64xea5vcfp99w8hqkndx8gdn5g9fqdq6gpxxjemgw3hxjmn8235hqsn0wscqzpgxqyz5vqsp50ymwlvwzr8pddwcp9czqg8nach4vf6mgxfqnv0kxkkm7fmjy07cs9qyyssqpr3gnqt5regmf8tnxhkse0kmvjmslquftnej6u5ckj2qdnvknggja92x2mw9h7nfm3zv3n4ply2lwtkl0r7j8v0h9vs3rxly0hv28kqqztvkl3"
        const content = "hello world"
       // const qrStream = new PassThrough();
        const result = await QRCode.toFileStream(myDuplex, content,
                    {
                        type: 'png',
                        width: 200,
                        errorCorrectionLevel: 'H'
                    })
        

        // myDuplex.on('data', (data) => {
        //     console.log('Received Data ', data.toString());
        // });

        console.log("duplex to std out")
        myDuplex.pipe(process.stdout)

       // console.log("result: ", result)
       // console.log(qrStream)
    //    await qrStream.pause()

    //    await qrStream.resume()
    //    console.log("get data qrstream ")
    //     qrStream.pipe(process.stdout)
       // await qrStream.on('data', (chunk) => {            
        //     console.log(chunk)
        // })

//        console.log(datum)

    //    console.log("writeable :" )
    //    console.log(writeable.write())

    //       const arr = new Uint8Array(writeable.writableLength)
    //       console.log(arr)

//        qrStream.pipe(res);
      //  console.log("qrstream: " , qrStream)
    } catch(err){
        console.error('Failed to return content', err);
    }

}


test()