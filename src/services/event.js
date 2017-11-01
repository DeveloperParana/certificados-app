module.exports = {
  getAll: firebase => {
    const events = firebase.database().ref('/events');

    return events.once('value');
  },
  getOne: async (firebase, id) => {
    const event = firebase.database().ref('/events/' + id);

    return event.once('value');
  }
}