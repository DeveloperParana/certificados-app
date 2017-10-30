module.exports = {
  load: (events, id) => {
    let eventId = parseInt(id);
    if (events && events.length > 0 && eventId > 0) {
      let filteredEvents = events.filter(e => e.id == eventId)
      if (filteredEvents.length == 1) {
        return filteredEvents[0];
      }
    }

    return null;
  }
}