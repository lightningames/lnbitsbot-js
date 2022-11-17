# lnbitsbot-js
This is a Basic Template Telegram Bot For LNBits that will allow you to access your LNBits wallet and create and process invoices. This template only supplies the methods for the basic wallet, however it can be extended to use other extensions. 

Written in Node.js

## How to setup your bot:

Step 1. Get a botfather token for your bot
Step 2. Get your Admin key and Invoice/read key from LNBits wallet page
Step 3. Copy `.env.example` to `.env`. Add your values from Step 1 and 2 to `.env`

Step 4. Run your bot and check that it works.

```
$ yarn
$ yarn start
```

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
    LNBITS_URL='https://your.lnbits.here.com/'
```

Note: Don't enter secret environment variables here. Fly.io offers secrets (via the fly secrets command) that are exposed as environment variables in your runtime. Example: you can run fly secrets set BOT_TOKEN=<bot_token_here>.


Then deploy changes to your app, by running:

```
$ flyctl deploy
```

Also see Fly.io Docs to Run a [Node App](https://fly.io/docs/languages-and-frameworks/node/)

