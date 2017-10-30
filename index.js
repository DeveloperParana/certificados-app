const axios = require('axios');
const bodyParser = require('koa-bodyparser');
const crypto = require('crypto')
const Koa = require('koa');
const querystring = require('querystring');
const Router = require('koa-router');
const session = require('koa-session');
const views = require('koa-views');
const yenv = require('yenv');

const config = require('./src/infrastructure/config');
const helperList = require('./src/helpers/view-list');

const app = new Koa();
const router = new Router();
const env = yenv();

app.keys = [env.APP_KEY];
app.use(session(config.SESSION, app));
app.use(bodyParser());

app.use(views(__dirname + config.DIR_VIEWS, {
  map: { hbs: 'handlebars' },
  options: {
    helpers: {
      list: helperList.list
    }
  }
}))

router.get('/', ctx => {
  ctx.state = {
    meetup: [
      { name: 'Meetup DevParana / Conectadas UEM', link: env.BASE_URL + 'event/2' }
    ],
    email: [
      { name: 'DevParaná Conference 2017', link: env.BASE_URL + 'event/1' }
    ]
  }

  return ctx.render('./index.hbs')
})

router.get('/event/:id', async ctx => {
  let event = ctx.params.id;

  if (event == 1) {
    ctx.session.event_url = 'https://github.com/DeveloperParana/certificados/blob/master/2017/conference/';
    return ctx.render('./email.hbs')
  }

  if (event == 2) {
    ctx.session.event_url = 'https://github.com/DeveloperParana/certificados/blob/master/2017/conectadas/';
    return ctx.redirect('/authorize')
  }

  return ctx.redirect('/error')
})

router.post('/event/access', async ctx => {
  let md5 = crypto.createHash('md5').update(ctx.request.body.email).digest('hex');
  const url = ctx.session.event_url + md5 + '.pdf';
  return ctx.redirect(url)
})

router.get('/authorize', async ctx => {
  let params = {
    client_id: env.MEETUP_KEY,
    response_type: 'code',
    redirect_uri: env.AUTH_REDIRECT_URI
  };

  ctx.redirect(MEETUP_OAUTH_URL + 'authorize?' + querystring.stringify(params));
})

router.get('/process', async ctx => {
  try {
    let params = {
      client_id: env.MEETUP_KEY,
      client_secret: env.MEETUP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: env.AUTH_REDIRECT_URI,
      code: ctx.query.code
    }

    const result = await axios.post(MEETUP_OAUTH_URL + 'access', querystring.stringify(params));

    axios.defaults.headers.common['Authorization'] = 'Bearer ' + result.data.access_token;
    const member = await axios.get(MEETUP_API_URL + 'members/self');

    let md5 = crypto.createHash('md5').update(member.data.id.toString()).digest('hex');
    const eventUrl = ctx.session.event_url + md5 + '.pdf';

    ctx.state = {
      name: member.data.name,
      id: member.data.id,
      url: eventUrl
    };

    return ctx.render('./temp.hbs')
  } catch (e) {
    console.log(e)
    return ctx.redirect('/error')
  }
})

router.get('/error', async ctx => {
  ctx.body = "Some error happen"
  ctx.status = 404;
})

app.use(router.routes())

app.listen(3000)
