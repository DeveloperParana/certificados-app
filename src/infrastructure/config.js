module.exports = {
  SESSION: {
  	key: 'koa:sess',
  	maxAge: 3600,
  	overwrite: true,
  	httpOnly: true,
  	signed: true,
  	rolling: false
  },
  MEETUP_OAUTH_URL: 'https://secure.meetup.com/oauth2/',
  MEETUP_API_URL: 'https://api.meetup.com/',
  DIR_VIEWS: '/src/views/'
}