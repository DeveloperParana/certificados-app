const axios = require('axios');
const qs = require('querystring');

const getRedirectURL = (oAuthURL, key, redirectURI) => {
  let params = {
    client_id: key,
    response_type: 'code',
    redirect_uri: redirectURI
  };

  return oAuthURL + 'authorize?' + qs.stringify(params);
}

const getAccessToken = async (key, secret, redirectURI, code, oAuthURL) => {
  let params = {
    client_id: key,
    client_secret: secret,
    grant_type: 'authorization_code',
    redirect_uri: redirectURI,
    code: code
  }

  const result = await axios.post(oAuthURL + 'access', qs.stringify(params));

  return result.data.access_token;
};


const getMember = async (apiURL, accessToken) => {
  axios.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;
  return await axios.get(apiURL + 'members/self');
};

module.exports = {
  getAccessToken: getAccessToken,
  getMember: getMember,
  getRedirectURL: getRedirectURL
};