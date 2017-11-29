module.exports = {
  getAll: axios => {
    return new Promise((resolve, reject) => {
      axios
        .get('https://devparana-certificates.firebaseio.com/events.json')
        .then(response => {
          resolve(response.data);
        })
        .catch(error => {
          console.log(error);
          reject();
        })
    });
  },
  getOne: async (axios, id) => {
    return new Promise((resolve, reject) => {
      axios
        .get('https://devparana-certificates.firebaseio.com/events.json')
        .then(result => {
          resolve(result.data.filter(e => { return e.id === id })[0])
        })
        .catch(error => {
          console.log(error);
          reject();
        })
    });
  }
}