const firebase = require('firebase-admin');
const bodyParser = require('koa-bodyparser');
const Koa = require('koa');
const Router = require('koa-router');
const session = require('koa-session');
const views = require('koa-views');
const winston = require('winston');

const config = require('./src/infrastructure/config');
const helperList = require('./src/helpers/view-list');
const md5 = require('./src/helpers/md5');

const app = new Koa();
const router = new Router();

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
}

//Adicionando suporte a sessão
winston.log('info', 'INICIALIZANDO SESSION', { key: 'initilize'});
app.keys = [process.env.APP_KEY];
app.use(session(config.SESSION, app));

//Adicionando suporte ao body-parser
app.use(bodyParser());

//Adicionando suporte a views com o handlebars
winston.log('info', 'INICIALIZANDO SUPORTE A VIEWS', { key: 'initilize'});
app.use(views(__dirname + config.DIR_VIEWS, {
  map: { hbs: 'handlebars' },
  options: {
    helpers: {
      list: helperList.list
    }
  }
}))

//Inicializando firebase
winston.log('info', 'INICIALIZANDO CONEXÃO COM FIREBASE', { key: 'initilize'});
firebase.initializeApp({
  credential: firebase.credential.cert({
    "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    "client_email": process.env.FIREBASE_CLIENT_EMAIL
  }),
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

router.get('/event/:id', ctx => {
  return new Promise((resolve, reject) => {
    const eventService = require('./src/services/event');
    eventService.getOne(firebase, parseInt(ctx.params.id)).then(event => {
      let eventVal = event.val()[0];
      winston.log('info', 'Evento selecionado', { key: 'event_selected', event: eventVal});

      if (eventVal.type == 'email') {
        ctx.state = {
          eventId: ctx.params.id
        };

        return resolve(ctx.render('./email.hbs'));
      }

      if (eventVal.type == 'meetup') {
        return resolve(ctx.redirect('/authorize'));
      }

      winston.log('error', 'Nenhuma ação para o evento', { key: 'event_selected', event: eventVal });

      return reject(ctx.redirect('/error'));
    }).catch(error => {
      winston.log('error', 'Erro ao acessar evento', { key: 'event_selected', id: ctx.params.id, error: error });
      return reject(ctx.redirect('/error'));
    });
  });
});

router.post('/event/access', async ctx => {
  try {
    const eventService = require('./src/services/event');
    const event = await eventService.getOne(firebase, parseInt(ctx.request.body.event));
    const url = event.val()[0].url + md5(ctx.request.body.email) + '.pdf';
    winston.log('info', 'Event access', { key: 'event_access', url: url, event_url: ctx.session.event_url });

    return ctx.redirect(url)
  } catch (e) {
    winston.log('error', 'Erro ao acessar evento', { key: 'event_selected', error: e })
    return ctx.redirect('/error')
  }
})

router.get('/authorize', async ctx => {
  const meetupService = require('./src/services/meetup');

  winston.log('info', 'Redirect realizado', { key: 'event_authorize', event_url: ctx.session.event_url });

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

    winston.log('info', 'Requisição de dados para o Meetup', { key: 'event_process', code: ctx.query.code });

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
    winston.log('info', 'URL de certificado criada', {
      key: 'event_process',
      urlCertificado: eventUrl,
      memberId: member.data.id.toString()
    });

    return ctx.redirect(eventUrl);
  } catch (e) {
    winston.log('error', 'Erro ao processar acesso', {
      key: 'event_process',
      error: e
    });
    return ctx.redirect('/error')
  }
})

router.get('/error', async ctx => {
  ctx.body = "Some error happen"
  ctx.status = 500;
})

app.use(router.routes())
winston.log('info', 'APLICAÇÃO AGUARDANDO REQUISIÇÕES', { key: 'initilize'});
app.listen(process.env.PORT || 3000)
