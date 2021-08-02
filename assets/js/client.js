// POST method implementation:
async function postData(url = "", data = {}) {
  // Default options are marked with *
  const response = await fetch(url, {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, *cors, same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json",
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: "follow", // manual, *follow, error
    referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(data), // body data type must match "Content-Type" header
  });
  return response; // parses JSON response into native JavaScript objects
}

function reloadElement(id) {
  var container = document.getElementById(id);
  var content = container.innerHTML;
  container.innerHTML = content;
  console.log(id + " reloaded");
}

function enchant(id) {
  console.log("enchanting " + id);

  postData("/enchant", { id: id }).then(function (response) {
    response.text().then(function (text) {
      element = document.getElementById(`status-message?${id}`);
      if (text == "success") {
        element.innerHTML = "Item enchanted!";
        element.style.color = "green";
      } else {
        element.innerHTML = text;
        element.style.color = "red";
      }
    });
  });
  reloadElement("btn_enchant?" + id);
}

function curse(id) {
  console.log("curse " + id);

  postData("/curse", { id: id }).then(function (response) {
    response.text().then(function (text) {
      const element = document.getElementById(`status-message?${id}`);
      if (text == "success") {
        element.innerHTML = "Item cursed!";
        element.style.color = "green";
      } else {
        element.innerHTML = text;
        element.style.color = "red";
      }
    });
  });
  reloadElement("btn_curse?" + id);
}

function updateQueryStringParameter(uri, key, value) {
  var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
  var separator = uri.indexOf("?") !== -1 ? "&" : "?";
  if (uri.match(re)) {
    return uri.replace(re, "$1" + key + "=" + value + "$2");
  } else {
    return uri + separator + key + "=" + value;
  }
}

// increments the page number in the query string
function nextPage(maxPage) {
  var uri = window.location.href;
  var page = parseInt(uri.match(/page=(\d+)/)[1]);
  if (page + 1 <= maxPage) {
    page++;
    var newUri = updateQueryStringParameter(uri, "page", page);
    window.location.href = newUri;
  }
}

// decrements the page number in the query string
function prevPage() {
  var uri = window.location.href;
  var page = parseInt(uri.match(/page=(\d+)/)[1]);
  if (page - 1 > 0) {
    page--;
    var newUri = updateQueryStringParameter(uri, "page", page);
    window.location.href = newUri;
  }
}
