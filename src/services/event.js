const events = require('../../events.json');

module.exports = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      if (events.length > 0) {
        return resolve(events);
      }

      reject('erro ao carregar');
    });
  },
  getOne: async (id) => {
    return new Promise((resolve, reject) => {
      if (events.length > 0) {
        return resolve(events.filter(e => { return e.id === id })[0])
      }
      
      reject('erro ao carregar');
    });
  }
}