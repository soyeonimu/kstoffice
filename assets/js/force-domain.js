(function () {
  var host = location.hostname;
  if (host === "www.kstoffice6885.com") {
    location.replace(
      "https://kstoffice6885.com" +
      location.pathname +
      location.search +
      location.hash
    );
  }
})();
