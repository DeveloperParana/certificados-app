const firebase = require('firebase-admin');
const bodyParser = require('koa-bodyparser');
const Koa = require('koa');
const Router = require('koa-router');
const session = require('koa-session');
const views = require('koa-views');

const config = require('./src/infrastructure/config');
const helperList = require('./src/helpers/view-list');
const md5 = require('./src/helpers/md5');
const serviceAccount = require('./credential.json');

const app = new Koa();
const router = new Router();

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
}

//Adicionando suporte a sessão
console.log('INICIALIZANDO SESSION');
app.keys = [process.env.APP_KEY];
app.use(session(config.SESSION, app));

//Adicionando suporte ao body-parser
app.use(bodyParser());

//Adicionando suporte a views com o handlebars
console.log('INICIALIZANDO SUPORTE A VIEWS');
app.use(views(__dirname + config.DIR_VIEWS, {
  map: { hbs: 'handlebars' },
  options: {
    helpers: {
      list: helperList.list
    }
  }
}))

//Inicializando firebase
console.log('INICIALIZANDO CONEXÃO COM FIREBASE');
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

router.get('/', ctx => {
  const eventService = require('./src/services/event');

  return new Promise((resolve, reject) => {
    eventService
        .getAll(firebase)
        .then(result => {
            let data = result.val();
            ctx.session.events = data;

            ctx.state = {
                events: data.map(e => {
                  return {
                    name: e.name,
                    url: process.env.BASE_URL + 'event/' + e.id.toString()
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
  const url = ctx.session.event_url + md5(ctx.request.body.email) + '.pdf';

  return ctx.redirect(url)
})

router.get('/authorize', async ctx => {
  const meetupService = require('./src/services/meetup');

  return ctx.redirect(
    meetupService.getRedirectURL(
      config.MEETUP_OAUTH_URL,
      process.env.MEETUP_KEY,
      process.env.AUTH_REDIRECT_URI
    )
  );
})

router.get('/process', async ctx => {
  try {
    const meetupService = require('./src/services/meetup');

    const accessToken = await meetupService.getAccessToken(
      process.env.MEETUP_KEY,
      process.env.MEETUP_SECRET,
      process.env.AUTH_REDIRECT_URI,
      ctx.query.code,
      config.MEETUP_OAUTH_URL
    );

    const member = await meetupService.getMember(
      config.MEETUP_API_URL,
      accessToken
    );

    const eventUrl = ctx.session.event_url + md5(member.data.id.toString()) + '.pdf';

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

console.log('APLICAÇÃO AGUARDANDO REQUISIÇÕES NA PORTA 3000');
app.listen(3000)
