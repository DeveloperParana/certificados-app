const crypto = require('crypto')

module.exports = data => {
    return crypto.createHash('md5').update(data).digest('hex');
};