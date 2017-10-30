module.exports = {
  list: (items, options) => {
    let out = "<ul>";

    for(let i=0, l=items.length; i<l; i++) {
      out = out + "<li>" + options.fn(items[i]) + "</li>";
    }

    return out + "</ul>";
  }
}