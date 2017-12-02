const axios = require('axios');

module.exports = {
    redirect: (ctx, url) => {
        const redirectUrl = '/certificate-not-found';
        return axios.head(url)
            .then((result) => {
                if (result.status === 200) {
                    return ctx.redirect(url);
                }
                return ctx.redirect(redirectUrl);
            })
            .catch((error) => {
                return ctx.redirect(redirectUrl);
            });
    }
}