module.exports = {
  getAll: firebase => {
    const events = firebase.database().ref('/events');

    return events.once('value');
  }
}