# lnbitsbot-js
This is a Basic Template Telegram Bot For LNBits written in Common js. It will allow you to access your LNBits wallet and create and process invoices. This template only supplies the methods for the basic wallet, however it can be extended to use other extensions. Checks and balances are minimal, and developers who use this template should implement their own.

Written in Node.js

## What does it do? 

The template contains basic functions to: 

- Get Balance
- Create Invoice
- Check Invoice
- Decode Invoice
- Pay Invoice 

![Telegram Bot](./images/demo_bot.png)

## How to setup your bot:

- Step 1. Get a [botfather](https://t.me/botfather) token for your bot
- Step 2. Get your Admin key and Invoice/read key from LNBits Wallet Page. 

    ![LNBits wallet page](./images/lnbits_demo.png)
    
- Step 3. Copy `.env.example` to `.env`. Add your values from Step 1 and 2 to `.env`

- Step 4. Run your bot and check that it works.

```
$ yarn
$ yarn start
```

CAVEAT: This is a demo and proof of concept bot, if the bot is deployed there is a balance, anyone who accesses your bot will be able to spend the balance by the 'pay invoice' button.

## Deploy your bot to fly.io as a Node App

First, sign up for an account at [Fly.io](https://fly.io/) (no credit card required).

Then, install the Fly.io CLI onto your device [here](https://fly.io/docs/getting-started/installing-flyctl/).

```
git clone https://github.com/lightningames/lnbitsbot-js.git
cd lnbitsbot-js
$ fly auth login
$ fly launch
```

Next,
- give it an app name
- postgres - select no
- deploy now - select no

You should now have a fly.toml file

Edit the fly.toml

```
[env]
    LNBITS_URL='https://your.lnbits.here.com'
```

NOTE: Don't enter secret environment variables here (admin and invoice key). Fly.io offers secrets (via the fly secrets command) that are exposed as environment variables in your runtime. Example: you can run 

```

$ fly secrets set BOT_TOKEN=<bot_token_here>.
$ fly secrets set ADMIN_KEY=<admin key here>
$ fly secrets set INVOICE_KEY=<invoice key here>

```

Also see: https://fly.io/docs/reference/secrets/#setting-secrets

See the .env.example for other variables that need to be set as secrets.

Then deploy changes to your app, by running:

```
$ flyctl deploy
```

Also see Fly.io Docs to Run a [Node App](https://fly.io/docs/languages-and-frameworks/node/)

