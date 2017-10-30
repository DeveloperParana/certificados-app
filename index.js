const admin = require('firebase-admin');
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
const serviceAccount = require('./credential.json');

const app = new Koa();
const router = new Router();
const env = yenv();

//Adicionando suporte a sessão
app.keys = [env.APP_KEY];
app.use(session(config.SESSION, app));

//Adicionando suporte ao body-parser
app.use(bodyParser());

//Adicionando suporte a views com o handlebars
app.use(views(__dirname + config.DIR_VIEWS, {
  map: { hbs: 'handlebars' },
  options: {
    helpers: {
      list: helperList.list
    }
  }
}))

//Inicializando firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://devparana-certificates.firebaseio.com'
});

router.get('/', ctx => {
  const eventService = require('./src/services/event');

  return new Promise((resolve, reject) => {
    eventService
        .getAll(admin)
        .then(result => {
            let data = result.val();
            ctx.session.events = data;

            ctx.state = {
                events: data.map(e => {
                  return {
                    name: e.name,
                    url: env.BASE_URL + 'event/' + e.id.toString()
                  }
                })
            };
            resolve(ctx.render('./index.hbs'));
        })
        .catch(error => {
            console.log(error);
            reject(error)
        });
  });
})

router.get('/event/:id', async ctx => {
  const filterEvents = require('./src/helpers/load-events');
  const event = filterEvents.load(ctx.session.events, ctx.params.id);

  if (event) {
    ctx.session.event_url = event.url;

    if (event.type == 'email') {
      return ctx.render('./email.hbs');
    }

    if (event.type == 'meetup') {
      return ctx.redirect('/authorize');
    }
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
