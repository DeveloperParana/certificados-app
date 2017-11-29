const axios = require('axios');
const bodyParser = require('koa-bodyparser');
const KeyGrip = require('keygrip');
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
winston.log('info', 'INICIALIZANDO SESSION', {
  key: 'initilize'
});
app.keys = new KeyGrip([process.env.APP_KEY1, process.env.APP_KEY2], 'sha256');
app.use(session(config.SESSION, app));

//Adicionando suporte ao body-parser
app.use(bodyParser());

//Adicionando suporte a views com o handlebars
winston.log('info', 'INICIALIZANDO SUPORTE A VIEWS', {
  key: 'initilize'
});
app.use(views(__dirname + config.DIR_VIEWS, {
  map: {
    hbs: 'handlebars'
  },
  options: {
    helpers: {
      list: helperList.list
    }
  }
}));

router.get('/', ctx => {
  const eventService = require('./src/services/event');

  return new Promise((resolve, reject) => {
    eventService
      .getAll(axios)
      .then(result => {
        ctx.state = {
          events: result.map(e => {
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
    eventService
      .getOne(axios, parseInt(ctx.params.id))
      .then(event => {
        winston.log('info', 'Evento selecionado', {
          key: 'event_selected',
          event: event
        });

        ctx.cookies.set('event', JSON.stringify(event), { signed: true });

        if (event.type === 'email') {
          return resolve(ctx.render('./email.hbs', {
            eventId: event.id
          }));
        }

        if (eventVal.type === 'meetup') {
          return resolve(ctx.redirect('/authorize'));
        }
      })
      .catch(error => {
        winston.log('error', 'Evento selecionado', {
          key: 'event_selected',
          error: error
        });
        reject(ctx.redirect('/error'));
      });
  });
});

router.post('/event/access', async ctx => {
  try {
    winston.log('info', 'Evento selecionado', {
      key: 'event_access'
    });
    const event = JSON.parse(ctx.cookies.get('event'));
    const url = event.url + md5(ctx.request.body.email) + '.pdf';
    winston.log('info', 'Event access', {
      key: 'event_access',
      url: url,
      event_url: ctx.session.event_url
    });

    return ctx.redirect(url)
  } catch (e) {
    winston.log('error', 'Erro ao acessar evento', {
      key: 'event_selected',
      error: e
    })
    return ctx.redirect('/error')
  }
})

router.get('/authorize', async ctx => {
  const meetupService = require('./src/services/meetup');

  winston.log('info', 'Redirect realizado', {
    key: 'event_authorize',
    event_url: ctx.session.event_url
  });

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

    winston.log('info', 'Requisição de dados para o Meetup', {
      key: 'event_process',
      code: ctx.query.code
    });

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

    const event = JSON.parse(ctx.cookies.get('event'));

    const eventUrl = event.url + md5(member.data.id.toString()) + '.pdf';
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
winston.log('info', 'APLICAÇÃO AGUARDANDO REQUISIÇÕES', {
  key: 'initilize'
});
app.listen(process.env.PORT || 3000)